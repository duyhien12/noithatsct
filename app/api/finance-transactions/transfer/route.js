import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withCodeRetry } from '@/lib/generateCode';
import { CREATE_ROLES, DEPARTMENTS } from '@/lib/financeJournal';
import { randomUUID } from 'crypto';

const TRANSFER_CATEGORY_NAME = 'Chuyển quỹ nội bộ';
const BANK_GL_CODE = '112'; // Tiền gửi ngân hàng — dùng chung cho mọi TK NH vì chưa có TK con riêng từng ngân hàng

const INCLUDE = {
    category: { select: { id: true, name: true, group: true } },
    debitAccount: { select: { id: true, code: true, name: true } },
    creditAccount: { select: { id: true, code: true, name: true } },
    cashFund: { select: { id: true, name: true } },
    bankAccount: { select: { id: true, bankName: true, accountNumber: true } },
};

const schema = z.object({
    kind: z.enum(['fund_to_fund', 'fund_to_bank', 'bank_to_fund', 'bank_to_bank']),
    date: z.string().min(1, 'Ngày bắt buộc').transform(v => new Date(v)),
    department: z.enum(DEPARTMENTS, { error: 'Phòng ban bắt buộc' }),
    fromFundId: z.string().optional().nullable().default(null),
    toFundId: z.string().optional().nullable().default(null),
    fromBankAccountId: z.string().optional().nullable().default(null),
    toBankAccountId: z.string().optional().nullable().default(null),
    amount: z.number({ error: 'Số tiền không hợp lệ' }).positive('Số tiền phải lớn hơn 0'),
    content: z.string().trim().optional().default(''),
    notes: z.string().trim().optional().default(''),
}).strict()
    .refine(d => d.kind !== 'fund_to_fund' || (d.fromFundId && d.toFundId && d.fromFundId !== d.toFundId), {
        message: 'Vui lòng chọn quỹ nguồn và quỹ đích khác nhau', path: ['toFundId'],
    })
    .refine(d => d.kind !== 'fund_to_bank' || (d.fromFundId && d.toBankAccountId), {
        message: 'Vui lòng chọn quỹ nguồn và tài khoản ngân hàng đích', path: ['toBankAccountId'],
    })
    .refine(d => d.kind !== 'bank_to_fund' || (d.fromBankAccountId && d.toFundId), {
        message: 'Vui lòng chọn tài khoản ngân hàng nguồn và quỹ đích', path: ['toFundId'],
    })
    .refine(d => d.kind !== 'bank_to_bank' || (d.fromBankAccountId && d.toBankAccountId && d.fromBankAccountId !== d.toBankAccountId), {
        message: 'Vui lòng chọn tài khoản ngân hàng nguồn và đích khác nhau', path: ['toBankAccountId'],
    });

async function getOrCreateTransferCategory(group) {
    let cat = await prisma.financeCategory.findFirst({ where: { name: TRANSFER_CATEGORY_NAME, group } });
    if (!cat) cat = await prisma.financeCategory.create({ data: { name: TRANSFER_CATEGORY_NAME, group, level: 1 } });
    return cat;
}

async function getBankGlAccount() {
    const acc = await prisma.accountingAccount.findUnique({ where: { code: BANK_GL_CODE } });
    if (!acc) throw new Error(`Chưa có tài khoản kế toán mã ${BANK_GL_CODE} (Tiền gửi ngân hàng)`);
    return acc;
}

// Chuyển tiền nội bộ — 4 loại:
//  - fund_to_fund: Quỹ tiền mặt A → Quỹ tiền mặt B
//  - fund_to_bank: Nộp tiền mặt từ 1 Quỹ vào 1 TK ngân hàng
//  - bank_to_fund: Rút tiền từ 1 TK ngân hàng về 1 Quỹ tiền mặt
//  - bank_to_bank: Chuyển khoản từ 1 TK ngân hàng sang 1 TK ngân hàng khác
// Luôn tạo 1 cặp phiếu Chi (nguồn) + Thu (đích) liên kết bằng transferGroupId,
// dùng chung 1 bút toán Nợ/Có (Nợ = TK của bên nhận, Có = TK của bên gửi).
export const POST = withAuth(async (request, _ctx, session) => {
    const data = schema.parse(await request.json());
    const { kind, date, department, amount, notes } = data;

    let fromFund = null, toFund = null, fromBank = null, toBank = null;
    let debitAccountId, creditAccountId;
    let fromLabel, toLabel;

    if (kind === 'fund_to_fund') {
        [fromFund, toFund] = await Promise.all([
            prisma.cashFund.findUnique({ where: { id: data.fromFundId } }),
            prisma.cashFund.findUnique({ where: { id: data.toFundId } }),
        ]);
        if (!fromFund) return NextResponse.json({ error: 'Không tìm thấy quỹ nguồn' }, { status: 404 });
        if (!toFund) return NextResponse.json({ error: 'Không tìm thấy quỹ đích' }, { status: 404 });
        if (!fromFund.accountingAccountId || !toFund.accountingAccountId) {
            return NextResponse.json({ error: 'Quỹ nguồn/đích chưa được gắn Tài khoản kế toán — vào ⚙️ Cài đặt → Quỹ tiền mặt để gắn TK trước' }, { status: 400 });
        }
        debitAccountId = toFund.accountingAccountId;
        creditAccountId = fromFund.accountingAccountId;
        fromLabel = `Quỹ ${fromFund.name}`;
        toLabel = `Quỹ ${toFund.name}`;
    } else if (kind === 'fund_to_bank') {
        [fromFund, toBank] = await Promise.all([
            prisma.cashFund.findUnique({ where: { id: data.fromFundId } }),
            prisma.bankAccount.findUnique({ where: { id: data.toBankAccountId } }),
        ]);
        if (!fromFund) return NextResponse.json({ error: 'Không tìm thấy quỹ nguồn' }, { status: 404 });
        if (!toBank) return NextResponse.json({ error: 'Không tìm thấy tài khoản ngân hàng đích' }, { status: 404 });
        if (!fromFund.accountingAccountId) {
            return NextResponse.json({ error: 'Quỹ nguồn chưa được gắn Tài khoản kế toán — vào ⚙️ Cài đặt → Quỹ tiền mặt để gắn TK trước' }, { status: 400 });
        }
        const bankGl = await getBankGlAccount();
        debitAccountId = bankGl.id;
        creditAccountId = fromFund.accountingAccountId;
        fromLabel = `Quỹ ${fromFund.name}`;
        toLabel = `${toBank.bankName}${toBank.accountNumber ? ` — ${toBank.accountNumber}` : ''}`;
    } else if (kind === 'bank_to_fund') {
        [fromBank, toFund] = await Promise.all([
            prisma.bankAccount.findUnique({ where: { id: data.fromBankAccountId } }),
            prisma.cashFund.findUnique({ where: { id: data.toFundId } }),
        ]);
        if (!fromBank) return NextResponse.json({ error: 'Không tìm thấy tài khoản ngân hàng nguồn' }, { status: 404 });
        if (!toFund) return NextResponse.json({ error: 'Không tìm thấy quỹ đích' }, { status: 404 });
        if (!toFund.accountingAccountId) {
            return NextResponse.json({ error: 'Quỹ đích chưa được gắn Tài khoản kế toán — vào ⚙️ Cài đặt → Quỹ tiền mặt để gắn TK trước' }, { status: 400 });
        }
        const bankGl = await getBankGlAccount();
        debitAccountId = toFund.accountingAccountId;
        creditAccountId = bankGl.id;
        fromLabel = `${fromBank.bankName}${fromBank.accountNumber ? ` — ${fromBank.accountNumber}` : ''}`;
        toLabel = `Quỹ ${toFund.name}`;
    } else {
        [fromBank, toBank] = await Promise.all([
            prisma.bankAccount.findUnique({ where: { id: data.fromBankAccountId } }),
            prisma.bankAccount.findUnique({ where: { id: data.toBankAccountId } }),
        ]);
        if (!fromBank) return NextResponse.json({ error: 'Không tìm thấy tài khoản ngân hàng nguồn' }, { status: 404 });
        if (!toBank) return NextResponse.json({ error: 'Không tìm thấy tài khoản ngân hàng đích' }, { status: 404 });
        const bankGl = await getBankGlAccount();
        debitAccountId = bankGl.id;
        creditAccountId = bankGl.id;
        fromLabel = `${fromBank.bankName}${fromBank.accountNumber ? ` — ${fromBank.accountNumber}` : ''}`;
        toLabel = `${toBank.bankName}${toBank.accountNumber ? ` — ${toBank.accountNumber}` : ''}`;
    }

    const [chiCategory, thuCategory] = await Promise.all([
        getOrCreateTransferCategory('Chi'),
        getOrCreateTransferCategory('Thu'),
    ]);

    const transferGroupId = randomUUID();
    const content = `Chuyển tiền: ${fromLabel} → ${toLabel}${data.content ? ` — ${data.content}` : ''}`;

    const chiIsCash = kind === 'fund_to_fund' || kind === 'fund_to_bank';
    const thuIsCash = kind === 'fund_to_fund' || kind === 'bank_to_fund';

    const chi = await withCodeRetry('financeTransaction', 'PC', (code) =>
        prisma.financeTransaction.create({
            data: {
                code, date, type: 'Chi', amount, department, content, transferGroupId,
                method: chiIsCash ? 'Tiền mặt' : 'Chuyển khoản',
                cashIn: 0, cashOut: chiIsCash ? amount : 0,
                bankIn: 0, bankOut: chiIsCash ? 0 : amount,
                cashFundId: chiIsCash ? fromFund.id : null,
                bankAccountId: chiIsCash ? null : fromBank.id,
                debitAccountId, creditAccountId,
                categoryId: chiCategory.id,
                notes,
                status: 'Đã hạch toán',
                createdBy: session.user.name, createdById: session.user.id, createdByRole: session.user.role,
            },
            include: INCLUDE,
        }), 5
    );
    const thu = await withCodeRetry('financeTransaction', 'PT', (code) =>
        prisma.financeTransaction.create({
            data: {
                code, date, type: 'Thu', amount, department, content, transferGroupId,
                method: thuIsCash ? 'Tiền mặt' : 'Chuyển khoản',
                cashIn: thuIsCash ? amount : 0, cashOut: 0,
                bankIn: thuIsCash ? 0 : amount, bankOut: 0,
                cashFundId: thuIsCash ? toFund.id : null,
                bankAccountId: thuIsCash ? null : toBank.id,
                debitAccountId, creditAccountId,
                categoryId: thuCategory.id,
                notes,
                status: 'Đã hạch toán',
                createdBy: session.user.name, createdById: session.user.id, createdByRole: session.user.role,
            },
            include: INCLUDE,
        }), 5
    );

    await prisma.financeTransactionAudit.createMany({
        data: [
            { transactionId: chi.id, action: 'create', actorName: session.user.name, actorId: session.user.id, actorRole: session.user.role, reason: `Chuyển tiền sang ${toLabel}`, afterData: chi },
            { transactionId: thu.id, action: 'create', actorName: session.user.name, actorId: session.user.id, actorRole: session.user.role, reason: `Chuyển tiền từ ${fromLabel}`, afterData: thu },
        ],
    });

    return NextResponse.json({ chi, thu }, { status: 201 });
}, { roles: CREATE_ROLES });
