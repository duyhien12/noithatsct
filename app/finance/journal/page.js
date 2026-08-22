'use client';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useSession } from 'next-auth/react';
import {
    DEPARTMENTS, TRANSACTION_TYPES, PAYMENT_METHODS, OBJECT_TYPES, STATUSES, STATUS_COLORS,
    ALLOWED_TRANSITIONS, getFinancePermissions, canEditTransaction, canDeleteTransaction, canTransitionStatus,
    buildCategoryTree, getCategoryPath,
} from '@/lib/financeJournal';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(n || 0));
const fmtOrBlank = (n) => (!n ? '' : fmt(n));
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
const toInputDate = (d) => d ? new Date(d).toISOString().slice(0, 10) : '';
const today = () => new Date().toISOString().slice(0, 10);

const OBJECT_ENDPOINT = {
    'Khách hàng': '/api/customers',
    'NCC': '/api/suppliers',
    'Thầu phụ': '/api/contractors',
    'Nhân viên': '/api/employees',
    'Mã vay': '/api/loan-contacts',
};

const EMPTY_FORM = {
    date: today(), type: 'Thu', method: 'Tiền mặt', amount: '',
    department: '', projectId: '', content: '', detail: '',
    debitAccountId: '', creditAccountId: '', bankAccountId: '', cashFundId: '', categoryId: '',
    objectType: '', objectId: '', objectName: '', payerReceiver: '',
    itemName: '', itemUnit: '', itemQty: '', itemUnitPrice: '',
    documentNo: '', documentDate: '', attachments: [], notes: '', status: 'Nháp',
};

export default function FinanceJournalPage() {
    const { data: session } = useSession();
    const user = session?.user;
    const perms = getFinancePermissions(user || {});

    const [rows, setRows] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 1 });
    const [summary, setSummary] = useState({ totalCashIn: 0, totalCashOut: 0, totalBankIn: 0, totalBankOut: 0, netCashFlow: 0, byCashFund: [], byBankAccount: [] });
    const [loading, setLoading] = useState(true);

    const [categories, setCategories] = useState([]);
    const [bankAccounts, setBankAccounts] = useState([]);
    const [cashFunds, setCashFunds] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [projects, setProjects] = useState([]);
    const [customerStubs, setCustomerStubs] = useState([]); // Khách "Khách hợp đồng" chưa có Dự án — vẫn chọn được, không gắn projectId
    const [cashBalance, setCashBalance] = useState({ openingBalance: 0, balance: 0 });

    const [filters, setFilters] = useState({ from: '', to: '', department: '', type: '', method: '', categoryId: '', projectId: '', status: '', search: '' });
    const [searchInput, setSearchInput] = useState('');

    const [modal, setModal] = useState(null); // { mode: 'add'|'edit'|'view', tx }
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [importOpen, setImportOpen] = useState(false);
    const [openMenuId, setOpenMenuId] = useState(null);
    const [showDeleted, setShowDeleted] = useState(false);
    const [printOpen, setPrintOpen] = useState(false);
    const [transferOpen, setTransferOpen] = useState(false);

    const fetchLookups = useCallback(async () => {
        // Dự án/Công trình cho phiếu Thu-Chi: chỉ lấy dự án của khách hàng đang ở cột
        // "Khách hợp đồng" (pipelineStage = "Thi công") trên bảng Khách hàng, thuộc
        // Phòng Kinh doanh hoặc Phòng Xây dựng (bỏ khách còn ở Lead/tiềm năng/chăm sóc,
        // và bỏ khách bên Phòng Thiết kế).
        const stageParam = `customerStage=${encodeURIComponent('Thi công')}`;
        const [cats, banks, funds, accs, projsKD, projsXD, custKD, custXD, cash] = await Promise.all([
            fetch('/api/finance-categories').then(r => r.json()).catch(() => []),
            fetch('/api/bank-accounts').then(r => r.json()).catch(() => []),
            fetch('/api/cash-funds').then(r => r.json()).catch(() => []),
            fetch('/api/accounting-accounts').then(r => r.json()).catch(() => []),
            fetch(`/api/projects?limit=500&customerDept=kinh_doanh&${stageParam}`).then(r => r.json()).then(d => d.data || d || []).catch(() => []),
            fetch(`/api/projects?limit=500&customerDept=xay_dung&${stageParam}`).then(r => r.json()).then(d => d.data || d || []).catch(() => []),
            fetch('/api/customers?dept=kinh_doanh&limit=1000').then(r => r.json()).then(d => d.data || d || []).catch(() => []),
            fetch('/api/customers?dept=xay_dung&limit=1000').then(r => r.json()).then(d => d.data || d || []).catch(() => []),
            fetch('/api/finance-cash-balance').then(r => r.json()).catch(() => null),
        ]);
        setCategories(Array.isArray(cats) ? cats : []);
        setBankAccounts(Array.isArray(banks) ? banks : []);
        setCashFunds(Array.isArray(funds) ? funds : []);
        setAccounts(Array.isArray(accs) ? accs : []);
        const projs = [...(Array.isArray(projsKD) ? projsKD : []), ...(Array.isArray(projsXD) ? projsXD : [])]
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setProjects(projs);
        // Khách "Khách hợp đồng" (pipelineStage = Thi công, chưa xóa) mà chưa có Dự án nào —
        // vẫn cho chọn trong ô Dự án/Công trình, chỉ là không gắn projectId (dùng Đối tượng thay thế).
        const projectCustomerIds = new Set(projs.map(p => p.customerId));
        const stubs = [...(Array.isArray(custKD) ? custKD : []), ...(Array.isArray(custXD) ? custXD : [])]
            .filter(c => c.pipelineStage === 'Thi công' && !c.deletedAt && !projectCustomerIds.has(c.id))
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setCustomerStubs(stubs);
        if (cash) setCashBalance(cash);
    }, []);

    const fetchTransactions = useCallback(async (page = 1) => {
        setLoading(true);
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
        params.set('page', String(page));
        params.set('limit', String(pagination.limit));
        if (showDeleted) params.set('deleted', '1');
        const res = await fetch(`/api/finance-transactions?${params}`).then(r => r.json()).catch(() => null);
        if (res) {
            setRows(res.data || []);
            setPagination(res.pagination || { page: 1, limit: 50, total: 0, totalPages: 1 });
            setSummary(res.summary || {});
        }
        setLoading(false);
    }, [filters, pagination.limit, showDeleted]);

    useEffect(() => { fetchLookups(); }, [fetchLookups]);
    useEffect(() => { fetchTransactions(1); }, [filters, showDeleted]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        const t = setTimeout(() => setFilters(f => ({ ...f, search: searchInput })), 400);
        return () => clearTimeout(t);
    }, [searchInput]);

    const clearFilters = () => {
        setFilters({ from: '', to: '', department: '', type: '', method: '', categoryId: '', projectId: '', status: '', search: '' });
        setSearchInput('');
    };

    // ── Actions ──────────────────────────────────────────────────────────
    const saveTransaction = async (form) => {
        const payload = {
            ...form,
            amount: Number(form.amount) || 0,
            itemQty: Number(form.itemQty) || 0,
            itemUnitPrice: Number(form.itemUnitPrice) || 0,
            projectId: form.projectId || null,
            bankAccountId: form.method === 'Chuyển khoản' ? (form.bankAccountId || null) : null,
            cashFundId: form.method === 'Tiền mặt' ? (form.cashFundId || null) : null,
            categoryId: form.categoryId || null,
            documentDate: form.documentDate || null,
        };
        const isEdit = modal?.mode === 'edit';
        const res = await fetch(isEdit ? `/api/finance-transactions/${modal.tx.id}` : '/api/finance-transactions', {
            method: isEdit ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok) { alert(json.error || 'Lỗi lưu giao dịch'); return false; }
        setModal(null);
        fetchTransactions(pagination.page);
        return true;
    };

    const saveSplitTransaction = async (form) => {
        const payload = {
            ...form,
            itemQty: Number(form.itemQty) || 0,
            itemUnitPrice: Number(form.itemUnitPrice) || 0,
            bankAccountId: form.method === 'Chuyển khoản' ? (form.bankAccountId || null) : null,
            cashFundId: form.method === 'Tiền mặt' ? (form.cashFundId || null) : null,
            categoryId: form.categoryId || null,
            documentDate: form.documentDate || null,
            allocations: form.allocations.map(a => ({ projectId: a.projectId, amount: Number(a.amount) || 0 })),
        };
        delete payload.projectId;
        delete payload.amount;
        const res = await fetch('/api/finance-transactions/split', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok) { alert(json.error || 'Lỗi tách giao dịch'); return false; }
        setModal(null);
        fetchTransactions(1);
        return true;
    };

    const changeStatus = async (tx, status, cancelReason = '') => {
        const res = await fetch(`/api/finance-transactions/${tx.id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, cancelReason }),
        });
        const json = await res.json();
        if (!res.ok) { alert(json.error || 'Lỗi chuyển trạng thái'); return; }
        fetchTransactions(pagination.page);
    };

    const cancelTx = async (tx) => {
        if (!confirm(`Hủy giao dịch "${tx.displayCode || tx.code}"?`)) return;
        await changeStatus(tx, 'Hủy');
    };

    const duplicateTx = async (tx) => {
        const res = await fetch(`/api/finance-transactions/${tx.id}/duplicate`, { method: 'POST' });
        const json = await res.json();
        if (!res.ok) { alert(json.error || 'Lỗi nhân bản'); return; }
        fetchTransactions(1);
    };

    const deleteTx = async (tx) => {
        if (!confirm(`Xóa phiếu "${tx.displayCode || tx.code}"? Bạn có thể khôi phục lại sau trong mục "Đã xóa".`)) return;
        const res = await fetch(`/api/finance-transactions/${tx.id}`, { method: 'DELETE' });
        const json = await res.json();
        if (!res.ok) { alert(json.error || 'Lỗi xóa'); return; }
        fetchTransactions(pagination.page);
    };

    const restoreTx = async (tx) => {
        if (!confirm(`Khôi phục lại phiếu "${tx.code}"?`)) return;
        const res = await fetch(`/api/finance-transactions/${tx.id}/restore`, { method: 'POST' });
        const json = await res.json();
        if (!res.ok) { alert(json.error || 'Lỗi khôi phục'); return; }
        fetchTransactions(pagination.page);
    };

    const exportExcel = async () => {
        const XLSX = await import('xlsx');
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
        params.set('limit', '500');
        const res = await fetch(`/api/finance-transactions?${params}`).then(r => r.json());
        const data = res.data || [];
        const s = res.summary || {};
        const sheetRows = data.map(t => ({
            'Ngày': fmtDate(t.date), 'Số phiếu': t.displayCode || t.code, 'Nội dung': t.content, 'Chi tiết': t.detail,
            'Phòng ban': t.department, 'Dự án': t.project?.code || '',
            'Thu TM': t.cashIn || 0, 'Chi TM': t.cashOut || 0, 'Thu TGNH': t.bankIn || 0, 'Chi TGNH': t.bankOut || 0,
            'TK Nợ': t.debitAccount?.code || '', 'TK Có': t.creditAccount?.code || '',
            'TK ngân hàng': t.bankAccount?.accountNumber || '', 'Phân loại': t.category?.name || '',
            'Đối tượng': t.objectName || '', 'Người nhận/nộp': t.payerReceiver || '',
            'Trạng thái': t.status,
        }));
        sheetRows.push({});
        sheetRows.push({
            'Ngày': 'TỔNG', 'Thu TM': s.totalCashIn || 0, 'Chi TM': s.totalCashOut || 0,
            'Thu TGNH': s.totalBankIn || 0, 'Chi TGNH': s.totalBankOut || 0,
            'TK ngân hàng': `Dòng tiền ròng: ${fmt(s.netCashFlow || 0)}`,
        });
        const ws = XLSX.utils.json_to_sheet(sheetRows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Nhật ký Thu Chi');
        XLSX.writeFile(wb, `nhat-ky-thu-chi-${today()}.xlsx`);
    };

    const downloadTemplate = async () => {
        const XLSX = await import('xlsx');
        const sample = [{
            'Ngày': today(), 'Loại GD': 'Thu', 'Phương thức': 'Tiền mặt', 'Số tiền': 1000000,
            'Phòng ban': 'Kinh doanh', 'Dự án': '', 'Nội dung': 'VD: Thu tạm ứng khách hàng', 'Chi tiết': '',
            'TK Nợ': '111', 'TK Có': '511', 'TK ngân hàng': '', 'Phân loại': 'Thu khách hàng',
            'Loại đối tượng': 'Khách hàng', 'Tên đối tượng': '', 'Người nhận/nộp': '',
            'Chủng loại': '', 'ĐVT': '', 'Số lượng': '', 'Đơn giá': '',
            'Số chứng từ': '', 'Ngày chứng từ': '', 'Ghi chú': '',
        }];
        const ws = XLSX.utils.json_to_sheet(sample);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Mẫu import');
        XLSX.writeFile(wb, 'mau-import-nhat-ky-thu-chi.xlsx');
    };

    const printTransactions = (txs) => {
        if (!txs.length) return;
        const printedAt = new Date().toLocaleDateString('vi-VN');
        const voucher = (t) => {
            const isThu = t.type === 'Thu';
            const accent = isThu ? '#1a3a5c' : '#F47920';
            const amountText = new Intl.NumberFormat('vi-VN').format(t.amount || 0);
            return `
<div class="page" style="--accent:${accent}">
  <div class="top-bar"></div>
  <div class="header">
    <div class="logo-area">
      <svg width="42" height="42" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g transform="translate(80,80) rotate(45) translate(-54,-54)"><rect width="108" height="108" rx="6" fill="${accent}"/></g>
        <text x="80" y="100" text-anchor="middle" fill="#fff" font-size="86" font-weight="900" font-family="Arial Black,Arial,sans-serif" letter-spacing="-4">K</text>
      </svg>
      <div>
        <div class="co-name">Kiến Trúc Đô Thị SCT</div>
        <div class="co-tagline">Cùng bạn xây dựng ước mơ</div>
        <div class="co-info"><span>📍 149 Nguyễn Tất Thành, Tp. Yên Bái, Tỉnh Yên Bái</span><br><span>📞 0914 998 822</span><span>🌐 kientrucsct.com</span></div>
      </div>
    </div>
    <div class="header-right">
      <div><strong>Ngày lập:</strong> ${fmtDate(t.date)}</div>
      <div><strong>Phòng ban:</strong> ${t.department || '—'}</div>
      <div><strong>Trạng thái:</strong> ${t.status}</div>
    </div>
  </div>
  <div class="title-banner">
    <div><h1>Phiếu ${isThu ? 'Thu' : 'Chi'} Tiền</h1><div class="sub">${isThu ? 'Receipt' : 'Payment'} Voucher</div></div>
    <div class="code-badge">Số: ${t.displayCode || t.code}</div>
  </div>
  <div class="body">
    <div class="info-grid">
      <div class="info-row"><div class="lbl">${isThu ? 'Người nộp tiền' : 'Người nhận tiền'}</div><div class="val">${t.payerReceiver || t.objectName || '...'}</div></div>
      ${t.objectName ? `<div class="info-row"><div class="lbl">Đối tượng</div><div class="val">${t.objectName}</div></div>` : ''}
      ${t.project ? `<div class="info-row"><div class="lbl">Công trình / Dự án</div><div class="val">${t.project.code} — ${t.project.name || ''}</div></div>` : ''}
      <div class="info-row"><div class="lbl">Nội dung</div><div class="val">${t.content}${t.detail ? ` — ${t.detail}` : ''}</div></div>
      <div class="info-row"><div class="lbl">Phương thức</div><div class="val">${t.method}</div></div>
      ${t.category?.name ? `<div class="info-row"><div class="lbl">Phân loại</div><div class="val">${t.category.name}</div></div>` : ''}
      <div class="info-row"><div class="lbl">Tài khoản Nợ / Có</div><div class="val">${t.debitAccount?.code || ''} / ${t.creditAccount?.code || ''}</div></div>
      ${t.notes ? `<div class="info-row"><div class="lbl">Ghi chú</div><div class="val">${t.notes}</div></div>` : ''}
    </div>
    <div class="amount-wrap">
      <div class="amount-head">Số tiền ${isThu ? 'thu' : 'chi'}</div>
      <div class="amount-body">
        <div class="amount-val">${amountText} <em>đ</em></div>
        <div class="amount-words">Bằng chữ: <span></span></div>
      </div>
    </div>
    <div class="sign-section">
      <div class="sign-col"><div class="role">Người lập phiếu</div><div class="role-sub">Ngày ${printedAt}</div><div class="sign-line">(Ký, ghi rõ họ tên)</div></div>
      <div class="sign-col"><div class="role">Giám đốc</div><div class="role-sub">Ngày &nbsp;&nbsp;&nbsp; tháng &nbsp;&nbsp;&nbsp; năm 2026</div><div class="sign-line">(Ký, ghi rõ họ tên)</div></div>
      <div class="sign-col"><div class="role">${isThu ? 'Người nộp tiền' : 'Người nhận tiền'}</div><div class="role-sub">Ngày ${fmtDate(t.date)}</div><div class="sign-line">(Ký, ghi rõ họ tên)</div></div>
    </div>
  </div>
  <div class="bottom-bar">
    <div><div class="bottom-brand">Kiến Trúc Đô Thị SCT</div><div class="bottom-tagline">Cùng bạn xây dựng ước mơ</div></div>
    <div class="bottom-code">Mã: ${t.displayCode || t.code} &nbsp;|&nbsp; ${fmtDate(t.date)}</div>
  </div>
</div>`;
        };

        const w = window.open('', '_blank', 'width=860,height=900');
        w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>In phiếu - ${txs.map(t => t.displayCode || t.code).join(', ')}</title>
<style>
@page{size:A5;margin:6mm}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,sans-serif;font-size:10px;color:#1a1a1a;background:#f5f5f5;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{width:148mm;min-height:198mm;margin:10mm auto;background:#fff;box-shadow:0 4px 24px rgba(0,0,0,.12);page-break-after:always}
.page:last-child{page-break-after:auto}
.top-bar{height:5px;background:var(--accent)}
.header{display:flex;align-items:center;justify-content:space-between;padding:10px 14px 8px;border-bottom:1px solid #f0ebe5}
.logo-area{display:flex;align-items:center;gap:8px}
.co-name{font-size:11px;font-weight:900;color:#1a1a1a;text-transform:uppercase;letter-spacing:.6px;line-height:1.2}
.co-tagline{font-size:7px;color:var(--accent);font-style:italic;margin-top:1px;letter-spacing:.2px}
.co-info{font-size:6.5px;color:#666;margin-top:3px;line-height:1.6}
.co-info span{margin-right:6px}
.header-right{text-align:right;font-size:7px;color:#888;line-height:1.6}
.header-right strong{color:#1a1a1a;font-size:8px}
.title-banner{background:var(--accent);padding:10px 14px;display:flex;align-items:center;justify-content:space-between}
.title-banner h1{font-size:18px;font-weight:900;color:#fff;text-transform:uppercase;letter-spacing:3px}
.title-banner .sub{font-size:7.5px;color:rgba(255,255,255,.75);letter-spacing:1.5px;text-transform:uppercase;margin-top:2px}
.code-badge{background:rgba(255,255,255,.2);border:1.2px solid rgba(255,255,255,.6);border-radius:18px;padding:4px 12px;color:#fff;font-weight:900;font-size:10px;letter-spacing:1px;white-space:nowrap}
.body{padding:12px 14px}
.info-grid{display:grid;grid-template-columns:100px 1fr;gap:0;margin-bottom:10px;border:1px solid #f0ebe5;border-radius:6px;overflow:hidden}
.info-row{display:contents}
.info-row .lbl{background:#fdf6f0;padding:6px 8px;font-size:8.5px;color:#888;border-bottom:1px solid #f0ebe5;font-style:italic}
.info-row .val{background:#fff;padding:6px 8px;font-size:9px;font-weight:700;color:#1a1a1a;border-bottom:1px solid #f0ebe5}
.info-row:last-child .lbl,.info-row:last-child .val{border-bottom:none}
.amount-wrap{margin:0 0 10px;border-radius:8px;overflow:hidden;border:1.5px solid var(--accent)}
.amount-head{background:var(--accent);padding:5px 10px;font-size:7px;text-transform:uppercase;letter-spacing:1.5px;color:#fff;font-weight:800;text-align:center}
.amount-body{padding:10px;text-align:center;background:linear-gradient(135deg,#fff9f5,#fff)}
.amount-val{font-size:22px;font-weight:900;color:#1a1a1a;letter-spacing:.5px}
.amount-val em{color:var(--accent);font-style:normal;font-size:16px}
.amount-words{margin-top:6px;font-size:8px;color:#999;font-style:italic;border-top:1px dashed #f0ebe5;padding-top:6px}
.amount-words span{display:inline-block;min-width:180px;border-bottom:1px dotted #ccc;height:12px}
.sign-section{display:flex;justify-content:space-between;margin:6px 0 12px;gap:6px}
.sign-col{flex:1;text-align:center;border:1px solid #f0ebe5;border-radius:6px;padding:8px 6px}
.sign-col .role{font-weight:900;font-size:8px;color:#1a1a1a;text-transform:uppercase;letter-spacing:.4px;margin-bottom:1px}
.sign-col .role-sub{font-size:6.5px;color:#aaa;margin-bottom:26px}
.sign-col .sign-line{border-top:1px solid #ddd;padding-top:4px;font-size:6.5px;font-style:italic;color:#bbb}
.bottom-bar{background:var(--accent);padding:6px 14px;display:flex;justify-content:space-between;align-items:center}
.bottom-brand{font-size:7.5px;font-weight:900;color:#fff;letter-spacing:.4px;text-transform:uppercase}
.bottom-tagline{font-size:6.5px;color:rgba(255,255,255,.8);font-style:italic}
.bottom-code{font-size:6.5px;color:rgba(255,255,255,.8)}
.no-print{position:fixed;top:16px;right:16px;z-index:9999}
.no-print button{padding:10px 22px;font-size:13px;cursor:pointer;background:#333;color:#fff;border:none;border-radius:6px;font-weight:700;letter-spacing:.3px;box-shadow:0 3px 12px rgba(0,0,0,.3)}
@media print{.no-print{display:none!important}body{background:#fff}.page{box-shadow:none;margin:0;width:auto;min-height:auto}}
</style></head><body>
<div class="no-print"><button onclick="window.print()">🖨️ In ${txs.length} phiếu</button></div>
${txs.map(voucher).join('')}
</body></html>`);
        w.document.close();
    };

    return (
        <div>
            <div style={{
                position: 'sticky', top: 'var(--header-height)', zIndex: 50,
                background: 'var(--bg-primary)', padding: '12px 0', margin: '-12px 0 4px',
                borderBottom: '1px solid var(--border-light)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8,
            }}>
                <h1 style={{ fontSize: 20, fontWeight: 700 }}>📒 Nhật ký Thu – Chi</h1>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {perms.canImportExport && <button className="btn btn-ghost btn-sm" onClick={downloadTemplate}>📄 File mẫu</button>}
                    {perms.canImportExport && <button className="btn btn-ghost btn-sm" onClick={() => setImportOpen(true)}>⬆️ Nhập Excel</button>}
                    {perms.canImportExport && <button className="btn btn-ghost btn-sm" onClick={exportExcel}>⬇️ Xuất Excel</button>}
                    {perms.canManageSettings && <button className="btn btn-ghost btn-sm" onClick={() => setSettingsOpen(true)}>⚙️ Danh mục</button>}
                    {perms.canRestore && (
                        <button className={`btn btn-sm ${showDeleted ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setShowDeleted(v => !v)}>
                            🗑️ {showDeleted ? 'Đang xem: Đã xóa' : 'Đã xóa'}
                        </button>
                    )}
                    {perms.canCreate && !showDeleted && (cashFunds.length >= 1 || bankAccounts.length >= 1) && (
                        <button className="btn btn-ghost btn-sm" onClick={() => setTransferOpen(true)}>↔️ Chuyển tiền</button>
                    )}
                    {perms.canCreate && !showDeleted && <button className="btn btn-primary btn-sm" onClick={() => setModal({ mode: 'add', tx: null })}>+ Thêm giao dịch</button>}
                </div>
            </div>

            <SummaryCards summary={summary} cashFunds={cashFunds} bankAccounts={bankAccounts} cashBalance={cashBalance} />

            <ReconcilePanel bankAccounts={bankAccounts} cashFunds={cashFunds} canSave={perms.canCreate}
                cashBalance={cashBalance} canEditCashBalance={perms.canManageSettings}
                onCashBalanceSaved={setCashBalance} />

            <FilterBar filters={filters} setFilters={setFilters} searchInput={searchInput} setSearchInput={setSearchInput}
                categories={categories} projects={projects} onClear={clearFilters} count={pagination.total}
                onPrint={() => setPrintOpen(true)} />

            <TransactionTable
                rows={rows} loading={loading} user={user} showDeleted={showDeleted}
                openMenuId={openMenuId} setOpenMenuId={setOpenMenuId}
                onView={(tx) => setModal({ mode: 'view', tx })}
                onEdit={(tx) => setModal({ mode: 'edit', tx })}
                onDuplicate={duplicateTx}
                onCancel={cancelTx}
                onDelete={deleteTx}
                onRestore={restoreTx}
                onChangeStatus={changeStatus}
            />

            {pagination.totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
                    <button className="btn btn-ghost btn-sm" disabled={pagination.page <= 1} onClick={() => fetchTransactions(pagination.page - 1)}>← Trước</button>
                    <span style={{ fontSize: 13, alignSelf: 'center' }}>Trang {pagination.page}/{pagination.totalPages}</span>
                    <button className="btn btn-ghost btn-sm" disabled={pagination.page >= pagination.totalPages} onClick={() => fetchTransactions(pagination.page + 1)}>Sau →</button>
                </div>
            )}

            {modal && (
                <TransactionModal
                    mode={modal.mode} tx={modal.tx} user={user}
                    categories={categories} bankAccounts={bankAccounts} cashFunds={cashFunds} accounts={accounts} projects={projects} customerStubs={customerStubs}
                    onClose={() => setModal(null)} onSave={saveTransaction} onSaveSplit={saveSplitTransaction}
                    onEdit={() => setModal({ mode: 'edit', tx: modal.tx })}
                    onViewSibling={(sibling) => setModal({ mode: 'view', tx: sibling })}
                />
            )}

            {settingsOpen && (
                <SettingsModal categories={categories} bankAccounts={bankAccounts} cashFunds={cashFunds} accounts={accounts}
                    onClose={() => setSettingsOpen(false)} onRefresh={fetchLookups} />
            )}

            {printOpen && (
                <PrintModal rows={rows} onClose={() => setPrintOpen(false)}
                    onConfirm={(txs) => { printTransactions(txs); setPrintOpen(false); }} />
            )}

            {importOpen && (
                <ImportModal onClose={() => setImportOpen(false)} onDone={() => { setImportOpen(false); fetchTransactions(1); }} />
            )}

            {transferOpen && (
                <TransferModal cashFunds={cashFunds} bankAccounts={bankAccounts} onClose={() => setTransferOpen(false)}
                    onDone={() => { setTransferOpen(false); fetchLookups(); fetchTransactions(1); }} />
            )}
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════
function SummaryCards({ summary, cashFunds, bankAccounts, cashBalance }) {
    const cards = [
        { label: 'Thu trong kỳ · tiền mặt', value: summary.totalCashIn, color: 'var(--status-success)', bg: 'rgba(52, 211, 153, 0.12)', icon: '💵' },
        { label: 'Thu trong kỳ · ngân hàng', value: summary.totalBankIn, color: 'var(--status-success)', bg: 'rgba(52, 211, 153, 0.12)', icon: '🏦' },
        { label: 'Chi trong kỳ · tiền mặt', value: summary.totalCashOut, color: 'var(--status-danger)', bg: 'rgba(239, 68, 68, 0.12)', icon: '💸' },
        { label: 'Chi trong kỳ · ngân hàng', value: summary.totalBankOut, color: 'var(--status-danger)', bg: 'rgba(239, 68, 68, 0.12)', icon: '🏧' },
    ];

    const cashFundSums = new Map((summary.byCashFund || []).map(g => [g.cashFundId, g]));
    const bankAccountSums = new Map((summary.byBankAccount || []).map(g => [g.bankAccountId, g]));

    const fundReports = (cashFunds || []).map(f => {
        const s = cashFundSums.get(f.id);
        return {
            id: f.id, icon: '👛', title: f.name,
            openingBalance: f.openingBalance || 0, periodIn: s?.cashIn || 0, periodOut: s?.cashOut || 0,
            currentBalance: f.balance ?? f.openingBalance ?? 0,
        };
    });
    const bankReports = (bankAccounts || []).map(b => {
        const s = bankAccountSums.get(b.id);
        return {
            id: b.id, icon: '🏛️', title: `${b.bankName}${b.accountNumber ? ` — ${b.accountNumber}` : ''}`,
            openingBalance: b.openingBalance || 0, periodIn: s?.bankIn || 0, periodOut: s?.bankOut || 0,
            currentBalance: b.balance ?? b.openingBalance ?? 0,
        };
    });
    if (fundReports.length === 0) {
        fundReports.push({
            id: 'cash-total', icon: '💰', title: 'Tiền mặt (chưa phân quỹ)',
            openingBalance: cashBalance?.openingBalance || 0, periodIn: summary.totalCashIn, periodOut: summary.totalCashOut,
            currentBalance: cashBalance?.balance ?? 0,
        });
    }

    return (
        <div>
            <div className="stats-grid" style={{ marginBottom: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                {cards.map(c => {
                    const valueText = fmt(c.value);
                    return (
                        <div className="stat-card" key={c.label} style={{ overflow: 'visible' }}>
                            <div className="stat-icon" style={{
                                fontSize: 22, width: 44, height: 44, minWidth: 44, borderRadius: 12,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', background: c.bg,
                            }}>{c.icon}</div>
                            <div style={{ minWidth: 0, flex: 1 }}>
                                <div className="stat-value" title={valueText}
                                    style={{ color: c.color, whiteSpace: 'nowrap', overflow: 'visible', textOverflow: 'clip', lineHeight: 1.2, fontSize: statValueFontSize(valueText) }}>
                                    {valueText}
                                </div>
                                <div className="stat-label" title={c.label}
                                    style={{ whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.3, marginTop: 3 }}>
                                    {c.label}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <details className="card" style={{ marginBottom: 16, padding: 16 }}>
                <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>📊 Báo cáo Quỹ tiền mặt &amp; Ngân hàng</summary>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginTop: 14 }}>
                    {fundReports.map(r => <BalanceReportCard key={r.id} {...r} />)}
                    {bankReports.map(r => <BalanceReportCard key={r.id} {...r} />)}
                </div>
            </details>
        </div>
    );
}

function BalanceReportCard({ icon, title, openingBalance, periodIn, periodOut, currentBalance }) {
    const total = periodIn + periodOut;
    const inPct = total > 0 ? Math.round((periodIn / total) * 100) : 50;
    return (
        <div className="card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 14, marginBottom: 14 }}>
                <span style={{ fontSize: 18 }}>{icon}</span>
                <span title={title} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
            </div>
            <ReportRow label="Số dư đầu kỳ" value={openingBalance} />
            <ReportRow label="Thu trong kỳ" value={periodIn} color="var(--status-success)" />
            <div style={{ height: 6, borderRadius: 3, background: 'var(--bg-secondary)', margin: '10px 0', overflow: 'hidden', display: 'flex' }}>
                <div style={{ width: `${inPct}%`, background: 'var(--status-success)' }} />
                <div style={{ width: `${100 - inPct}%`, background: 'var(--status-danger)' }} />
            </div>
            <ReportRow label="Chi trong kỳ" value={periodOut} color="var(--status-danger)" />
            <div style={{ borderTop: '1px dashed var(--border-color)', margin: '12px 0 10px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontWeight: 700, fontSize: 13 }}>Tồn hiện tại</span>
                <span style={{ fontWeight: 800, fontSize: 17, color: 'var(--accent-primary-hover)' }}>{fmt(currentBalance)} đ</span>
            </div>
        </div>
    );
}

function ReportRow({ label, value, color }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
            <span style={{ color: 'var(--text-muted)' }}>{label}</span>
            <span style={{ fontWeight: 700, color: color || 'var(--text-primary)' }}>{fmt(value)} đ</span>
        </div>
    );
}

function statValueFontSize(text) {
    const len = text.length;
    if (len <= 8) return 22;
    if (len <= 10) return 19;
    if (len <= 12) return 17;
    if (len <= 14) return 15;
    return 13;
}

function FilterBar({ filters, setFilters, searchInput, setSearchInput, categories, projects, onClear, count, onPrint }) {
    const set = (k, v) => setFilters(f => ({ ...f, [k]: v }));
    return (
        <div className="card" style={{ marginBottom: 16 }}>
            <div className="filter-bar" style={{ flexWrap: 'wrap' }}>
                <input className="form-input search-input" placeholder="🔍 Tìm nội dung, số phiếu, chứng từ, đối tượng..."
                    value={searchInput} onChange={e => setSearchInput(e.target.value)} style={{ flex: 1, minWidth: 220 }} />
                <input className="form-input" type="date" value={filters.from} onChange={e => set('from', e.target.value)} title="Từ ngày" />
                <input className="form-input" type="date" value={filters.to} onChange={e => set('to', e.target.value)} title="Đến ngày" />
                <select className="form-select" value={filters.department} onChange={e => set('department', e.target.value)}>
                    <option value="">Tất cả phòng ban</option>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <select className="form-select" value={filters.type}
                    onChange={e => setFilters(f => ({ ...f, type: e.target.value, categoryId: '' }))}>
                    <option value="">Thu &amp; Chi</option>
                    {TRANSACTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <select className="form-select" value={filters.method} onChange={e => set('method', e.target.value)}>
                    <option value="">Mọi phương thức</option>
                    {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <CategoryTreePicker categories={categories} value={filters.categoryId} onChange={id => set('categoryId', id)} rootEmptyLabel="Mọi phân loại" group={filters.type || undefined} />
                <select className="form-select" value={filters.projectId} onChange={e => set('projectId', e.target.value)}>
                    <option value="">Mọi dự án</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                </select>
                <select className="form-select" value={filters.status} onChange={e => set('status', e.target.value)}>
                    <option value="">Mọi trạng thái</option>
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <button className="btn btn-ghost btn-sm" onClick={onClear}>✕ Xóa lọc</button>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap', alignSelf: 'center' }}>{count} giao dịch</div>
                <button className="btn btn-ghost btn-sm" onClick={onPrint}>🖨️ In phiếu</button>
            </div>
        </div>
    );
}

function StatusBadge({ status }) {
    const c = STATUS_COLORS[status] || {};
    return <span className="badge" style={{ background: c.bg, color: c.text }}>{status}</span>;
}

function TransactionTable({ rows, loading, user, showDeleted, openMenuId, setOpenMenuId, onView, onEdit, onDuplicate, onCancel, onDelete, onRestore, onChangeStatus }) {
    const perms = getFinancePermissions(user || {});

    const nextStatuses = (tx) => (ALLOWED_TRANSITIONS[tx.status] || []).filter(s => canTransitionStatus(user, tx.status, s) && s !== 'Hủy');

    const RowMenu = ({ tx }) => {
        const btnRef = useRef(null);
        const menuRef = useRef(null);
        const [pos, setPos] = useState(null);
        const isOpen = openMenuId === tx.id;

        useEffect(() => {
            if (!isOpen) { setPos(null); return; }
            const update = () => {
                const r = btnRef.current?.getBoundingClientRect();
                if (r) setPos({ top: r.bottom + 4, left: r.left });
            };
            update();
            window.addEventListener('scroll', update, true);
            window.addEventListener('resize', update);
            return () => {
                window.removeEventListener('scroll', update, true);
                window.removeEventListener('resize', update);
            };
        }, [isOpen]);

        useEffect(() => {
            if (!isOpen) return;
            const onDocMouseDown = (e) => {
                if (btnRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
                setOpenMenuId(null);
            };
            document.addEventListener('mousedown', onDocMouseDown);
            return () => document.removeEventListener('mousedown', onDocMouseDown);
        }, [isOpen]);

        return (
            <>
                <button ref={btnRef} className="btn btn-icon" onClick={() => setOpenMenuId(isOpen ? null : tx.id)}>⋯</button>
                {isOpen && pos && createPortal(
                    <div ref={menuRef}
                        style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 1000, background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 8, boxShadow: 'var(--shadow-md)', minWidth: 170, padding: 4 }}>
                        <MenuItem onClick={() => { onView(tx); setOpenMenuId(null); }}>👁️ Xem chi tiết</MenuItem>
                        {showDeleted ? (
                            perms.canRestore && <MenuItem onClick={() => { onRestore(tx); setOpenMenuId(null); }}>↩️ Khôi phục</MenuItem>
                        ) : (
                            <>
                                {canEditTransaction(user, tx) && <MenuItem onClick={() => { onEdit(tx); setOpenMenuId(null); }}>✏️ Sửa</MenuItem>}
                                {perms.canCreate && <MenuItem onClick={() => { onDuplicate(tx); setOpenMenuId(null); }}>📄 Nhân bản</MenuItem>}
                                {nextStatuses(tx).map(s => (
                                    <MenuItem key={s} onClick={() => { onChangeStatus(tx, s); setOpenMenuId(null); }}>
                                        {s === 'Đã duyệt' ? '✅ Duyệt' : s === 'Đã hạch toán' ? '📘 Hạch toán' : `→ ${s}`}
                                    </MenuItem>
                                ))}
                                {canTransitionStatus(user, tx.status, 'Hủy') && <MenuItem danger onClick={() => { onCancel(tx); setOpenMenuId(null); }}>🚫 Hủy giao dịch</MenuItem>}
                                {canDeleteTransaction(user, tx) && <MenuItem danger onClick={() => { onDelete(tx); setOpenMenuId(null); }}>🗑️ Xóa</MenuItem>}
                            </>
                        )}
                    </div>,
                    document.body
                )}
            </>
        );
    };

    if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Đang tải...</div>;
    if (rows.length === 0) return <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Không có giao dịch nào</div>;

    return (
        <div className="card">
            <div className="desktop-table-view">
                <div className="table-container" style={{ overflowX: 'auto' }}>
                    <table className="data-table" style={{ margin: 0, fontSize: 12 }}>
                        <thead>
                            <tr>
                                <th>#</th><th>Thao tác</th><th>Ngày</th><th>Số phiếu</th><th>Nội dung</th><th>Phòng ban</th><th>Dự án</th>
                                <th style={{ textAlign: 'right' }}>Thu TM</th><th style={{ textAlign: 'right' }}>Chi TM</th>
                                <th style={{ textAlign: 'right' }}>Thu TGNH</th><th style={{ textAlign: 'right' }}>Chi TGNH</th>
                                <th>TK Nợ</th><th>TK Có</th><th>TK ngân hàng</th><th>Quỹ TM</th><th>Phân loại</th>
                                <th>Đối tượng</th><th>Người nhận/nộp</th><th>Chủng loại</th><th>ĐVT</th>
                                <th>Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((t, i) => (
                                <tr key={t.id} style={{ opacity: t.status === 'Hủy' ? 0.5 : 1 }}>
                                    <td>{i + 1}</td>
                                    <td><RowMenu tx={t} /></td>
                                    <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(t.date)}</td>
                                    <td className="accent" style={{ whiteSpace: 'nowrap', cursor: 'pointer' }} onClick={() => onView(t)}>{t.displayCode || t.code}</td>
                                    <td className="primary" title={t.content} style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {t.content}{t.transferGroupId && <span title="Chuyển quỹ — có 1 phiếu liên kết" style={{ marginLeft: 4 }}>↔️</span>}
                                    </td>
                                    <td style={{ whiteSpace: 'nowrap' }}>{t.department}</td>
                                    <td>{t.project?.code || '—'}{t.splitGroupId && <span title="Đã tách từ 1 lần nhập chung cho nhiều công trình" style={{ marginLeft: 4 }}>🔗</span>}</td>
                                    <td className="amount" style={{ color: 'var(--status-success)' }}>{fmtOrBlank(t.cashIn)}</td>
                                    <td className="amount" style={{ color: 'var(--status-danger)' }}>{fmtOrBlank(t.cashOut)}</td>
                                    <td className="amount" style={{ color: 'var(--status-success)' }}>{fmtOrBlank(t.bankIn)}</td>
                                    <td className="amount" style={{ color: 'var(--status-danger)' }}>{fmtOrBlank(t.bankOut)}</td>
                                    <td>{t.debitAccount?.code}</td>
                                    <td>{t.creditAccount?.code}</td>
                                    <td style={{ fontSize: 11 }}>{t.bankAccount?.accountNumber || '—'}</td>
                                    <td style={{ fontSize: 11 }}>{t.cashFund?.name || '—'}</td>
                                    <td style={{ fontSize: 11 }}>{t.category?.name || '—'}</td>
                                    <td title={t.objectName} style={{ fontSize: 11, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.objectName || '—'}</td>
                                    <td style={{ fontSize: 11 }}>{t.payerReceiver || '—'}</td>
                                    <td style={{ fontSize: 11 }}>{t.itemName || '—'}</td>
                                    <td style={{ fontSize: 11 }}>{t.itemUnit || '—'}</td>
                                    <td><StatusBadge status={t.status} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="mobile-card-list">
                {rows.map(t => (
                    <div key={t.id} className="mobile-card-item" style={{ opacity: t.status === 'Hủy' ? 0.5 : 1 }} onClick={() => onView(t)}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <div><div className="card-title">{t.content}</div><div className="card-subtitle">{t.displayCode || t.code} · {fmtDate(t.date)} · {t.department}</div></div>
                            <StatusBadge status={t.status} />
                        </div>
                        <div className="card-row">
                            <div><span className="card-label">Thu</span><div className="card-value" style={{ color: 'var(--status-success)' }}>{fmt((t.cashIn || 0) + (t.bankIn || 0))}</div></div>
                            <div><span className="card-label">Chi</span><div className="card-value" style={{ color: 'var(--status-danger)' }}>{fmt((t.cashOut || 0) + (t.bankOut || 0))}</div></div>
                            <div><span className="card-label">PT</span><div className="card-value">{t.method}</div></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function MenuItem({ children, onClick, danger }) {
    return (
        <button onClick={onClick} style={{
            display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: 13, border: 'none',
            background: 'transparent', cursor: 'pointer', borderRadius: 6, color: danger ? 'var(--status-danger)' : 'var(--text-primary)',
        }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            {children}
        </button>
    );
}

// ════════════════════════════════════════════════════════════════════════
// Chọn danh mục theo cây tối đa 3 cấp — mỗi cấp một dropdown, chọn xong cấp nào thì
// dropdown cấp kế tiếp mới hiện ra (nếu mục vừa chọn có danh mục con). Có thể dừng lại
// ở bất kỳ cấp nào — không bắt buộc phải chọn tới lá.
function CategoryTreePicker({ categories, value, onChange, disabled, rootEmptyLabel = '-- chọn --', group }) {
    const scoped = useMemo(() => (group ? categories.filter(c => c.group === group) : categories), [categories, group]);
    const tree = useMemo(() => buildCategoryTree(scoped), [scoped]);
    const path = useMemo(() => (value ? getCategoryPath(value, scoped) : []), [value, scoped]);

    const levels = [];
    let options = tree;
    let i = 0;
    while (options.length > 0) {
        const selectedId = path[i]?.id || '';
        levels.push({ options, selectedId });
        if (!selectedId) break;
        const chosen = options.find(c => c.id === selectedId);
        options = chosen?.children || [];
        i++;
    }

    const handleChange = (levelIdx, id) => {
        if (!id) { onChange(levelIdx === 0 ? '' : path[levelIdx - 1].id); return; }
        onChange(id);
    };

    return (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {levels.map((lvl, i) => (
                <select key={i} className="form-select" disabled={disabled} value={lvl.selectedId}
                    onChange={e => handleChange(i, e.target.value)} style={{ minWidth: 150 }}>
                    <option value="">{i === 0 ? rootEmptyLabel : '— (dừng ở đây) —'}</option>
                    {lvl.options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
            ))}
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════
function ObjectSelect({ objectType, objectId, objectName, onChange }) {
    const [options, setOptions] = useState([]);
    const [q, setQ] = useState('');
    useEffect(() => {
        if (!objectType || objectType === 'Khác' || !OBJECT_ENDPOINT[objectType]) { setOptions([]); return; }
        const t = setTimeout(() => {
            fetch(`${OBJECT_ENDPOINT[objectType]}?search=${encodeURIComponent(q)}&limit=50`)
                .then(r => r.json()).then(d => setOptions(d.data || d || [])).catch(() => setOptions([]));
        }, 300);
        return () => clearTimeout(t);
    }, [objectType, q]);

    if (!objectType || objectType === 'Khác') {
        return <input className="form-input" placeholder="Tên đối tượng" value={objectName} onChange={e => onChange({ objectId: '', objectName: e.target.value })} />;
    }
    return (
        <div>
            <input className="form-input" placeholder={`Tìm ${objectType.toLowerCase()}...`} value={objectId ? objectName : q}
                onChange={e => { setQ(e.target.value); onChange({ objectId: '', objectName: e.target.value }); }} />
            {options.length > 0 && !objectId && (
                <div style={{ border: '1px solid var(--border-color)', borderRadius: 6, marginTop: 4, maxHeight: 160, overflowY: 'auto' }}>
                    {options.map(o => (
                        <div key={o.id} style={{ padding: '6px 10px', fontSize: 13, cursor: 'pointer' }}
                            onClick={() => { onChange({ objectId: o.id, objectName: o.name }); setOptions([]); setQ(''); }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                            onMouseLeave={e => e.currentTarget.style.background = ''}>
                            {o.name} {o.code ? `(${o.code})` : ''}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function TransactionModal({ mode, tx, user, categories, bankAccounts, cashFunds, accounts, projects, customerStubs, onClose, onSave, onSaveSplit, onEdit, onViewSibling }) {
    const isView = mode === 'view';
    const isAdd = mode === 'add';
    const [form, setForm] = useState(() => tx ? {
        date: toInputDate(tx.date), type: tx.type, method: tx.method, amount: tx.amount,
        department: tx.department, projectId: tx.projectId || '', content: tx.content, detail: tx.detail || '',
        debitAccountId: tx.debitAccountId, creditAccountId: tx.creditAccountId, bankAccountId: tx.bankAccountId || '',
        cashFundId: tx.cashFundId || '',
        categoryId: tx.categoryId || '', objectType: tx.objectType || '', objectId: tx.objectId || '', objectName: tx.objectName || '',
        payerReceiver: tx.payerReceiver || '', itemName: tx.itemName || '', itemUnit: tx.itemUnit || '',
        itemQty: tx.itemQty || '', itemUnitPrice: tx.itemUnitPrice || '',
        documentNo: tx.documentNo || '', documentDate: toInputDate(tx.documentDate), attachments: tx.attachments || [],
        notes: tx.notes || '', status: tx.status,
    } : EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef();
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    // Ô "Dự án/Công trình" gộp cả Dự án thật (projectId) và Khách "Khách hợp đồng" chưa
    // có Dự án (dùng lại cơ chế Đối tượng sẵn có: objectType='Khách hàng').
    const projectPickValue = form.projectId ? `p_${form.projectId}`
        : (form.objectType === 'Khách hàng' && form.objectId && (customerStubs || []).some(c => c.id === form.objectId)) ? `c_${form.objectId}`
            : '';
    const handleProjectPick = (val) => {
        if (val.startsWith('p_')) {
            setForm(f => ({ ...f, projectId: val.slice(2) }));
        } else if (val.startsWith('c_')) {
            const cust = (customerStubs || []).find(c => c.id === val.slice(2));
            setForm(f => ({ ...f, projectId: '', objectType: 'Khách hàng', objectId: cust?.id || '', objectName: cust?.name || '' }));
        } else {
            setForm(f => ({ ...f, projectId: '' }));
        }
    };

    const [splitMode, setSplitMode] = useState(false);
    const [allocations, setAllocations] = useState([{ projectId: '', amount: '' }, { projectId: '', amount: '' }]);
    const splitTotal = allocations.reduce((s, a) => s + (Number(a.amount) || 0), 0);
    const setAllocation = (i, k, v) => setAllocations(list => list.map((a, idx) => idx === i ? { ...a, [k]: v } : a));
    const addAllocation = () => setAllocations(list => [...list, { projectId: '', amount: '' }]);
    const removeAllocation = (i) => setAllocations(list => list.length > 2 ? list.filter((_, idx) => idx !== i) : list);

    const [siblings, setSiblings] = useState([]);
    useEffect(() => {
        if (!isView || !tx?.splitGroupId) { setSiblings([]); return; }
        fetch(`/api/finance-transactions?splitGroupId=${tx.splitGroupId}&limit=50`)
            .then(r => r.json()).then(d => setSiblings((d.data || []).filter(s => s.id !== tx.id))).catch(() => setSiblings([]));
    }, [isView, tx?.splitGroupId, tx?.id]);

    const [transferPair, setTransferPair] = useState([]);
    useEffect(() => {
        if (!isView || !tx?.transferGroupId) { setTransferPair([]); return; }
        fetch(`/api/finance-transactions?transferGroupId=${tx.transferGroupId}&limit=5`)
            .then(r => r.json()).then(d => setTransferPair((d.data || []).filter(s => s.id !== tx.id))).catch(() => setTransferPair([]));
    }, [isView, tx?.transferGroupId, tx?.id]);

    const itemAmount = (Number(form.itemQty) || 0) * (Number(form.itemUnitPrice) || 0);

    const upload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        const fd = new FormData();
        fd.append('file', file);
        fd.append('type', 'documents');
        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        const json = await res.json();
        if (json.url) set('attachments', [...form.attachments, { url: json.url, name: file.name }]);
        setUploading(false);
        if (fileRef.current) fileRef.current.value = '';
    };

    const submit = async (statusOverride) => {
        if (form.method === 'Chuyển khoản' && !form.bankAccountId) return alert('Giao dịch chuyển khoản bắt buộc chọn TK ngân hàng');
        if (!form.department) return alert('Vui lòng chọn phòng ban');
        if (!form.content?.trim()) return alert('Vui lòng nhập nội dung');
        if (!form.debitAccountId || !form.creditAccountId) return alert('Vui lòng chọn TK Nợ và TK Có');
        if (form.debitAccountId === form.creditAccountId) return alert('TK Nợ và TK Có không được trùng nhau');

        if (splitMode) {
            if (allocations.some(a => !a.projectId)) return alert('Vui lòng chọn công trình cho tất cả các dòng phân bổ');
            if (allocations.some(a => !(Number(a.amount) > 0))) return alert('Số tiền mỗi dòng phân bổ phải lớn hơn 0');
            const projectIds = allocations.map(a => a.projectId);
            if (new Set(projectIds).size !== projectIds.length) return alert('Mỗi công trình chỉ được xuất hiện một lần');
            setSaving(true);
            await onSaveSplit({ ...form, status: statusOverride || form.status, allocations });
            setSaving(false);
            return;
        }

        if (!(Number(form.amount) > 0)) return alert('Số tiền phải lớn hơn 0');
        setSaving(true);
        await onSave({ ...form, status: statusOverride || form.status });
        setSaving(false);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 1100, width: '92vw', maxHeight: '90vh', overflowY: 'auto' }}>
                <div className="modal-header">
                    <h3>{isView ? `Giao dịch ${tx.displayCode || tx.code}` : mode === 'edit' ? `Sửa giao dịch ${tx.displayCode || tx.code}` : '+ Thêm giao dịch'}</h3>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>
                <div className="modal-body">
                    {isView && (
                        <div style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
                            <StatusBadge status={tx.status} />
                            {tx.deletedAt && <span className="badge" style={{ background: '#FEE2E2', color: '#DC2626' }}>🗑️ Đã xóa</span>}
                            {!tx.deletedAt && canEditTransaction(user, tx) && <button className="btn btn-ghost btn-sm" onClick={onEdit}>✏️ Sửa</button>}
                        </div>
                    )}

                    <FieldsetGroup title="A · Thông tin chung">
                        <Row>
                            <Field label="Ngày *"><input className="form-input" type="date" disabled={isView} value={form.date} onChange={e => set('date', e.target.value)} /></Field>
                            <Field label="Phòng ban *">
                                <select className="form-select" disabled={isView} value={form.department} onChange={e => set('department', e.target.value)}>
                                    <option value="">-- chọn --</option>{DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                                </select>
                            </Field>
                            <Field label="Dự án / Công trình">
                                {splitMode ? (
                                    <input className="form-input" disabled value="— xem bên dưới —" />
                                ) : (
                                    <select className="form-select" disabled={isView} value={projectPickValue} onChange={e => handleProjectPick(e.target.value)}>
                                        <option value="">-- không có --</option>
                                        {projects.length > 0 && (
                                            <optgroup label="Dự án">
                                                {projects.map(p => <option key={'p_' + p.id} value={'p_' + p.id}>{p.code} — {p.name}</option>)}
                                            </optgroup>
                                        )}
                                        {customerStubs?.length > 0 && (
                                            <optgroup label="Khách hợp đồng (chưa có dự án)">
                                                {customerStubs.map(c => <option key={'c_' + c.id} value={'c_' + c.id}>{c.name}</option>)}
                                            </optgroup>
                                        )}
                                    </select>
                                )}
                            </Field>
                        </Row>
                        {isAdd && (
                            <Row>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                                    <input type="checkbox" checked={splitMode} onChange={e => setSplitMode(e.target.checked)} />
                                    Tách chi phí này cho nhiều công trình (VD: 1 hóa đơn NCC dùng chung cho 2 công trình)
                                </label>
                            </Row>
                        )}
                        <Row>
                            <Field label="Chi tiết">
                                <CategoryTreePicker categories={categories} value={form.categoryId} onChange={id => set('categoryId', id)} disabled={isView} group={form.type} rootEmptyLabel={`-- chọn (${form.type}) --`} />
                            </Field>
                        </Row>
                        <Field label="Nội dung *"><input className="form-input" disabled={isView} value={form.content} onChange={e => set('content', e.target.value)} /></Field>
                    </FieldsetGroup>

                    {splitMode && (
                        <FieldsetGroup title="A2 · Phân bổ theo công trình">
                            {allocations.map((a, i) => (
                                <Row key={i}>
                                    <Field label={`Công trình ${i + 1} *`}>
                                        <select className="form-select" value={a.projectId} onChange={e => setAllocation(i, 'projectId', e.target.value)}>
                                            <option value="">-- chọn --</option>{projects.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                                        </select>
                                    </Field>
                                    <Field label="Số tiền *">
                                        <MoneyInput value={a.amount} onChange={v => setAllocation(i, 'amount', v)} />
                                    </Field>
                                    <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 4 }}>
                                        <button type="button" className="btn btn-icon" disabled={allocations.length <= 2} onClick={() => removeAllocation(i)} title="Bỏ dòng này">🗑️</button>
                                    </div>
                                </Row>
                            ))}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                                <button type="button" className="btn btn-ghost btn-sm" onClick={addAllocation}>+ Thêm công trình</button>
                                <div style={{ fontSize: 13, fontWeight: 600 }}>Tổng: {fmt(splitTotal)}</div>
                            </div>
                        </FieldsetGroup>
                    )}

                    <FieldsetGroup title="B · Thông tin tiền">
                        <Row>
                            <Field label="Loại giao dịch *">
                                <select className="form-select" disabled={isView} value={form.type}
                                    onChange={e => setForm(f => ({ ...f, type: e.target.value, categoryId: '' }))}>
                                    {TRANSACTION_TYPES.map(t => <option key={t}>{t}</option>)}
                                </select>
                            </Field>
                            <Field label="Phương thức *">
                                <select className="form-select" disabled={isView} value={form.method} onChange={e => set('method', e.target.value)}>
                                    {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
                                </select>
                            </Field>
                            <Field label="Số tiền *">
                                {splitMode ? (
                                    <input className="form-input" disabled value={fmt(splitTotal)} title="Tự động tính từ tổng phân bổ bên trên" />
                                ) : (
                                    <MoneyInput disabled={isView} value={form.amount} onChange={v => set('amount', v)} />
                                )}
                            </Field>
                        </Row>
                        {form.method === 'Chuyển khoản' && (
                            <Field label="Tài khoản ngân hàng *">
                                <select className="form-select" disabled={isView} value={form.bankAccountId} onChange={e => set('bankAccountId', e.target.value)}>
                                    <option value="">-- chọn --</option>
                                    {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.bankName} — {b.accountNumber}</option>)}
                                </select>
                            </Field>
                        )}
                        {form.method === 'Tiền mặt' && (
                            <Field label="Quỹ tiền mặt">
                                <select className="form-select" disabled={isView} value={form.cashFundId} onChange={e => set('cashFundId', e.target.value)}>
                                    <option value="">-- không phân quỹ --</option>
                                    {cashFunds.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                </select>
                            </Field>
                        )}
                    </FieldsetGroup>

                    <FieldsetGroup title="C · Hạch toán">
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                            <div style={{ flex: 1, minWidth: 160 }}>
                                <Field label="TK Nợ *">
                                    <select className="form-select" disabled={isView} value={form.debitAccountId} onChange={e => set('debitAccountId', e.target.value)}>
                                        <option value="">-- chọn --</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                                    </select>
                                </Field>
                            </div>
                            <div style={{ flex: 1, minWidth: 160 }}>
                                <Field label="TK Có *">
                                    <select className="form-select" disabled={isView} value={form.creditAccountId} onChange={e => set('creditAccountId', e.target.value)}>
                                        <option value="">-- chọn --</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                                    </select>
                                </Field>
                            </div>
                            <div style={{ flex: 1, minWidth: 140 }}>
                                <Field label="Loại đối tượng">
                                    <select className="form-select" disabled={isView} value={form.objectType} onChange={e => set('objectType', e.target.value)}>
                                        <option value="">-- không có --</option>{OBJECT_TYPES.map(o => <option key={o}>{o}</option>)}
                                    </select>
                                </Field>
                            </div>
                            <div style={{ flex: 1, minWidth: 160 }}>
                                <Field label="Khách hàng / Đối tượng">
                                    {isView ? <input className="form-input" disabled value={form.objectName} /> :
                                        <ObjectSelect objectType={form.objectType} objectId={form.objectId} objectName={form.objectName}
                                            onChange={({ objectId, objectName }) => setForm(f => ({ ...f, objectId, objectName }))} />}
                                </Field>
                            </div>
                            <div style={{ flex: 1, minWidth: 160 }}>
                                <Field label="Người nhận / nộp tiền"><input className="form-input" disabled={isView} value={form.payerReceiver} onChange={e => set('payerReceiver', e.target.value)} /></Field>
                            </div>
                        </div>
                    </FieldsetGroup>

                    <FieldsetGroup title="D · Hàng hóa / vật tư (không bắt buộc)">
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                            <div style={{ flex: 2, minWidth: 180 }}><Field label="Chủng loại"><input className="form-input" disabled={isView} value={form.itemName} onChange={e => set('itemName', e.target.value)} /></Field></div>
                            <div style={{ flex: 1, minWidth: 90 }}><Field label="ĐVT"><input className="form-input" disabled={isView} value={form.itemUnit} onChange={e => set('itemUnit', e.target.value)} /></Field></div>
                            <div style={{ flex: 1, minWidth: 110 }}><Field label="Số lượng"><input className="form-input" disabled={isView} type="number" value={form.itemQty} onChange={e => set('itemQty', e.target.value)} /></Field></div>
                            <div style={{ flex: 1, minWidth: 130 }}><Field label="Đơn giá"><MoneyInput disabled={isView} value={form.itemUnitPrice} onChange={v => set('itemUnitPrice', v)} /></Field></div>
                            <div style={{ flex: 1, minWidth: 130 }}><Field label="Thành tiền"><input className="form-input" disabled value={fmt(itemAmount)} /></Field></div>
                        </div>
                    </FieldsetGroup>

                    <FieldsetGroup title="E · Chứng từ">
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                            <div style={{ flex: 1, minWidth: 150 }}>
                                <Field label="Số chứng từ"><input className="form-input" disabled={isView} value={form.documentNo} onChange={e => set('documentNo', e.target.value)} /></Field>
                            </div>
                            <div style={{ flex: 1, minWidth: 150 }}>
                                <Field label="Ngày chứng từ"><input className="form-input" disabled={isView} type="date" value={form.documentDate} onChange={e => set('documentDate', e.target.value)} /></Field>
                            </div>
                            {!isView && (
                                <div style={{ flex: 1, minWidth: 200 }}>
                                    <Field label="Upload file">
                                        <input ref={fileRef} className="form-file" type="file" onChange={upload} disabled={uploading} />
                                        {uploading && <span style={{ fontSize: 12 }}> Đang tải lên...</span>}
                                    </Field>
                                </div>
                            )}
                            <div style={{ flex: 2, minWidth: 220 }}>
                                <Field label="Ghi chú"><textarea className="form-input" disabled={isView} rows={1} value={form.notes} onChange={e => set('notes', e.target.value)} /></Field>
                            </div>
                        </div>
                        {form.attachments?.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                                {form.attachments.map((a, i) => (
                                    <a key={i} href={a.url} target="_blank" rel="noreferrer" className="badge info" style={{ textDecoration: 'none' }}>📎 {a.name}</a>
                                ))}
                            </div>
                        )}
                    </FieldsetGroup>

                    {isView && tx.splitGroupId && (
                        <FieldsetGroup title="🔗 Các dòng cùng nhóm tách chi phí">
                            {siblings.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Đang tải...</div>}
                            {siblings.map(s => (
                                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, padding: '4px 0', borderBottom: '1px dotted var(--border-color)' }}>
                                    <span>{s.project?.code || '—'} — {s.content}</span>
                                    <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <strong>{fmt(s.amount)}</strong>
                                        <button className="btn btn-ghost btn-sm" onClick={() => onViewSibling(s)}>Xem</button>
                                    </span>
                                </div>
                            ))}
                        </FieldsetGroup>
                    )}

                    {isView && tx.transferGroupId && (
                        <FieldsetGroup title="↔️ Phiếu liên kết (chuyển quỹ)">
                            {transferPair.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Đang tải...</div>}
                            {transferPair.map(s => (
                                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, padding: '4px 0', borderBottom: '1px dotted var(--border-color)' }}>
                                    <span>{s.displayCode || s.code} — {s.type} {s.cashFund?.name ? `· Quỹ ${s.cashFund.name}` : ''}</span>
                                    <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <strong>{fmt(s.amount)}</strong>
                                        <button className="btn btn-ghost btn-sm" onClick={() => onViewSibling(s)}>Xem</button>
                                    </span>
                                </div>
                            ))}
                        </FieldsetGroup>
                    )}

                    {isView && tx.audits?.length > 0 && (
                        <FieldsetGroup title="Lịch sử">
                            {tx.audits.map(a => (
                                <div key={a.id} style={{ fontSize: 12, color: 'var(--text-muted)', padding: '4px 0', borderBottom: '1px dotted var(--border-color)' }}>
                                    {a.action === 'create' ? '🆕 Tạo' : a.action === 'update' ? '✏️ Cập nhật' : a.action === 'cancel' ? '🚫 Hủy' : a.action}
                                    {' bởi '}{a.actorName} — {new Date(a.createdAt).toLocaleString('vi-VN')}
                                    {a.reason && ` — Lý do: ${a.reason}`}
                                </div>
                            ))}
                        </FieldsetGroup>
                    )}
                </div>
                {!isView && (
                    <div className="modal-footer">
                        <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Hủy bỏ</button>
                        <button className="btn btn-secondary" onClick={() => submit('Nháp')} disabled={saving}>💾 Lưu nháp</button>
                        <button className="btn btn-primary" onClick={() => submit('Đã hạch toán')} disabled={saving}>✅ Lưu &amp; Hạch toán</button>
                    </div>
                )}
            </div>
        </div>
    );
}

function FieldsetGroup({ title, children }) {
    return (
        <fieldset style={{ border: '1px solid var(--border-color)', borderRadius: 8, padding: 12, marginBottom: 12 }}>
            <legend style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-accent)', padding: '0 6px' }}>{title}</legend>
            {children}
        </fieldset>
    );
}
function Row({ children }) { return <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>{Array.isArray(children) ? children.map((c, i) => <div key={i} style={{ flex: 1, minWidth: 160 }}>{c}</div>) : children}</div>; }
function Field({ label, children }) { return <div className="form-group"><label className="form-label">{label}</label>{children}</div>; }

// Ô nhập số tiền có dấu chấm ngăn cách hàng nghìn khi gõ (VD: 1.000.000), giá trị
// thực chất vẫn là chuỗi số thuần (không dấu chấm) lưu trong state như input number.
function MoneyInput({ value, onChange, disabled, style, placeholder, className, autoFocus }) {
    const display = value === '' || value === null || value === undefined ? '' : fmt(value);
    const handleChange = (e) => {
        const raw = e.target.value.replace(/\D/g, '');
        onChange(raw === '' ? '' : String(Number(raw)));
    };
    return (
        <input className={className || 'form-input'} inputMode="numeric" disabled={disabled} style={style} placeholder={placeholder}
            autoFocus={autoFocus} value={display} onChange={handleChange} />
    );
}

// ════════════════════════════════════════════════════════════════════════
function ReconcilePanel({ bankAccounts, cashFunds, canSave, cashBalance, canEditCashBalance, onCashBalanceSaved }) {
    const [targetType, setTargetType] = useState('cash');
    const [bankAccountId, setBankAccountId] = useState('');
    const [cashFundId, setCashFundId] = useState('');
    const [systemBalance, setSystemBalance] = useState(null);
    const [openingBalance, setOpeningBalance] = useState(null);
    const [rawTarget, setRawTarget] = useState(null); // full bank/fund record — cần để PUT lại đủ trường bắt buộc
    const [actualBalance, setActualBalance] = useState('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editingOpening, setEditingOpening] = useState(false);
    const [openingInput, setOpeningInput] = useState('');
    const [savingOpening, setSavingOpening] = useState(false);

    const fetchBalance = useCallback(async () => {
        if (targetType === 'bank' && !bankAccountId) { setSystemBalance(null); setOpeningBalance(null); setRawTarget(null); return; }
        setLoading(true);
        if (targetType === 'cash') {
            if (cashFundId) {
                const funds = await fetch('/api/cash-funds').then(r => r.json()).catch(() => []);
                const f = (funds || []).find(x => x.id === cashFundId);
                setSystemBalance(f?.balance ?? 0);
                setOpeningBalance(f?.openingBalance ?? 0);
                setRawTarget(f || null);
            } else {
                const cash = await fetch('/api/finance-cash-balance').then(r => r.json()).catch(() => null);
                if (cash) { setSystemBalance(cash.balance); setOpeningBalance(cash.openingBalance); onCashBalanceSaved?.(cash); }
                setRawTarget(null);
            }
        } else {
            const banks = await fetch('/api/bank-accounts').then(r => r.json()).catch(() => []);
            const b = (banks || []).find(x => x.id === bankAccountId);
            setSystemBalance(b?.balance ?? 0);
            setOpeningBalance(b?.openingBalance ?? 0);
            setRawTarget(b || null);
        }
        setLoading(false);
    }, [targetType, bankAccountId, cashFundId, onCashBalanceSaved]);

    useEffect(() => { fetchBalance(); }, [fetchBalance]);
    useEffect(() => { setEditingOpening(false); }, [targetType, bankAccountId, cashFundId]);

    const diff = actualBalance !== '' && systemBalance !== null ? Number(actualBalance) - systemBalance : null;
    const canEditOpening = canEditCashBalance && (targetType === 'cash' || (targetType === 'bank' && !!bankAccountId));

    const save = async () => {
        if (targetType === 'bank' && !bankAccountId) return alert('Vui lòng chọn tài khoản ngân hàng');
        if (actualBalance === '') return alert('Vui lòng nhập số dư thực tế');
        setSaving(true);
        const res = await fetch('/api/cash-reconciliation', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                targetType,
                bankAccountId: targetType === 'bank' ? bankAccountId : null,
                cashFundId: targetType === 'cash' ? (cashFundId || null) : null,
                actualBalance: Number(actualBalance),
            }),
        });
        setSaving(false);
        if (res.ok) { alert('Đã lưu đối chiếu'); setActualBalance(''); }
        else alert((await res.json()).error || 'Lỗi lưu đối chiếu');
    };

    const startEditOpening = () => {
        setOpeningInput(String(openingBalance ?? 0));
        setEditingOpening(true);
    };

    const saveOpening = async () => {
        setSavingOpening(true);
        const newOpening = Number(openingInput) || 0;
        let res;
        if (targetType === 'cash' && !cashFundId) {
            res = await fetch('/api/finance-cash-balance', {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ openingBalance: newOpening }),
            });
        } else if (targetType === 'cash' && cashFundId) {
            res = await fetch(`/api/cash-funds/${cashFundId}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: rawTarget?.name || '', status: rawTarget?.status ?? true, notes: rawTarget?.notes || '', openingBalance: newOpening }),
            });
        } else {
            res = await fetch(`/api/bank-accounts/${bankAccountId}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bankName: rawTarget?.bankName || '', accountNumber: rawTarget?.accountNumber || '',
                    accountHolder: rawTarget?.accountHolder || '', branch: rawTarget?.branch || '',
                    status: rawTarget?.status ?? true, notes: rawTarget?.notes || '', openingBalance: newOpening,
                }),
            });
        }
        setSavingOpening(false);
        if (res.ok) { setEditingOpening(false); fetchBalance(); }
        else alert((await res.json().catch(() => ({}))).error || 'Lỗi lưu số dư đầu kỳ');
    };

    return (
        <details className="card" style={{ marginBottom: 16, padding: 16 }}>
            <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>🔍 Đối chiếu số dư</summary>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12, alignItems: 'flex-end' }}>
                <Field label="Đối tượng">
                    <select className="form-select" value={targetType} onChange={e => { setTargetType(e.target.value); setBankAccountId(''); setCashFundId(''); }}>
                        <option value="cash">Tiền mặt</option><option value="bank">Tài khoản ngân hàng</option>
                    </select>
                </Field>
                {targetType === 'bank' && (
                    <Field label="Tài khoản">
                        <select className="form-select" value={bankAccountId} onChange={e => setBankAccountId(e.target.value)}>
                            <option value="">-- chọn --</option>
                            {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.bankName} — {b.accountNumber}</option>)}
                        </select>
                    </Field>
                )}
                {targetType === 'cash' && (
                    <Field label="Quỹ">
                        <select className="form-select" value={cashFundId} onChange={e => setCashFundId(e.target.value)}>
                            <option value="">-- Tổng (chưa phân quỹ) --</option>
                            {cashFunds.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </select>
                    </Field>
                )}
                <Field label="Số dư đầu kỳ">
                    {editingOpening ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                            <MoneyInput value={openingInput} onChange={setOpeningInput} style={{ width: 140 }} autoFocus />
                            <button className="btn btn-primary btn-sm" onClick={saveOpening} disabled={savingOpening}>Lưu</button>
                            <button className="btn btn-ghost btn-sm" onClick={() => setEditingOpening(false)}>Hủy</button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <input className="form-input" disabled value={loading ? '...' : fmt(openingBalance)} />
                            {canEditOpening && (
                                <button className="btn btn-icon" title="Sửa số dư đầu kỳ" onClick={startEditOpening}>✏️</button>
                            )}
                        </div>
                    )}
                </Field>
                <Field label="Số dư hệ thống"><input className="form-input" disabled value={loading ? '...' : fmt(systemBalance)} /></Field>
                <Field label="Số dư thực tế"><MoneyInput value={actualBalance} onChange={setActualBalance} /></Field>
                <Field label="Chênh lệch">
                    <input className="form-input" disabled value={diff === null ? '' : fmt(diff)}
                        style={{ color: diff && diff !== 0 ? 'var(--status-danger)' : 'var(--status-success)', fontWeight: 700 }} />
                </Field>
                {canSave && <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>Lưu đối chiếu</button>}
            </div>
            {diff !== null && diff !== 0 && (
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--status-danger)' }}>⚠️ Có chênh lệch giữa sổ sách và thực tế — cần kiểm tra lại.</div>
            )}
        </details>
    );
}

// ════════════════════════════════════════════════════════════════════════
function PrintModal({ rows, onClose, onConfirm }) {
    const [input, setInput] = useState('');
    const [error, setError] = useState('');

    const parseIndexes = (str) => {
        const indexes = new Set();
        for (let part of str.split(',').map(s => s.trim()).filter(Boolean)) {
            const range = part.match(/^(\d+)\s*-\s*(\d+)$/);
            if (range) {
                let [a, b] = [Number(range[1]), Number(range[2])];
                if (a > b) [a, b] = [b, a];
                for (let n = a; n <= b; n++) indexes.add(n);
            } else if (/^\d+$/.test(part)) {
                indexes.add(Number(part));
            } else {
                return null;
            }
        }
        return [...indexes].sort((a, b) => a - b);
    };

    const submit = () => {
        const indexes = parseIndexes(input);
        if (!indexes || indexes.length === 0) { setError('Nhập STT hợp lệ, ví dụ: 1,2,3'); return; }
        const invalid = indexes.filter(n => n < 1 || n > rows.length);
        if (invalid.length) { setError(`STT không hợp lệ: ${invalid.join(', ')} (chỉ có ${rows.length} giao dịch trên trang)`); return; }
        onConfirm(indexes.map(n => rows[n - 1]));
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
                <div className="modal-header"><h3>🖨️ In phiếu</h3><button className="modal-close" onClick={onClose}>×</button></div>
                <div className="modal-body">
                    <div className="form-group">
                        <label className="form-label">Nhập STT giao dịch cần in (theo cột #)</label>
                        <input className="form-input" placeholder="VD: 1,2,3 hoặc 1,3,4" value={input}
                            onChange={e => { setInput(e.target.value); setError(''); }}
                            onKeyDown={e => e.key === 'Enter' && submit()} autoFocus />
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                            Cách nhau bởi dấu phẩy, có thể dùng khoảng (VD: 1-3). Trang hiện có {rows.length} giao dịch.
                        </div>
                        {error && <div style={{ fontSize: 12, color: 'var(--status-danger)', marginTop: 6 }}>{error}</div>}
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-ghost" onClick={onClose}>Đóng</button>
                    <button className="btn btn-primary" onClick={submit}>In</button>
                </div>
            </div>
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════
const TRANSFER_KINDS = [
    { key: 'fund_to_fund', label: 'Quỹ → Quỹ' },
    { key: 'fund_to_bank', label: 'Nộp tiền: Quỹ → Ngân hàng' },
    { key: 'bank_to_fund', label: 'Rút tiền: Ngân hàng → Quỹ' },
];

function TransferModal({ cashFunds, bankAccounts, onClose, onDone }) {
    const [form, setForm] = useState({
        kind: 'fund_to_fund', date: today(), department: '',
        fromFundId: '', toFundId: '', fromBankAccountId: '', toBankAccountId: '',
        amount: '', content: '', notes: '',
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setError(''); };
    const setKind = (kind) => setForm(f => ({
        ...f, kind, fromFundId: '', toFundId: '', fromBankAccountId: '', toBankAccountId: '',
    }));

    const fromFund = cashFunds.find(f => f.id === form.fromFundId);
    const toFund = cashFunds.find(f => f.id === form.toFundId);
    const fromBank = bankAccounts.find(b => b.id === form.fromBankAccountId);
    const toBank = bankAccounts.find(b => b.id === form.toBankAccountId);

    const fromLabel = form.kind === 'bank_to_fund' ? (fromBank ? `${fromBank.bankName}` : null) : (fromFund ? `Quỹ ${fromFund.name}` : null);
    const toLabel = form.kind === 'fund_to_bank' ? (toBank ? `${toBank.bankName}` : null) : (toFund ? `Quỹ ${toFund.name}` : null);

    const submit = async () => {
        if (!form.department) return setError('Vui lòng chọn phòng ban');
        if (form.kind === 'fund_to_fund' && (!form.fromFundId || !form.toFundId || form.fromFundId === form.toFundId)) {
            return setError('Vui lòng chọn quỹ nguồn và quỹ đích khác nhau');
        }
        if (form.kind === 'fund_to_bank' && (!form.fromFundId || !form.toBankAccountId)) {
            return setError('Vui lòng chọn quỹ nguồn và tài khoản ngân hàng đích');
        }
        if (form.kind === 'bank_to_fund' && (!form.fromBankAccountId || !form.toFundId)) {
            return setError('Vui lòng chọn tài khoản ngân hàng nguồn và quỹ đích');
        }
        if (!(Number(form.amount) > 0)) return setError('Số tiền phải lớn hơn 0');
        setSaving(true);
        const res = await fetch('/api/finance-transactions/transfer', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...form, amount: Number(form.amount) }),
        });
        setSaving(false);
        const json = await res.json().catch(() => ({}));
        if (!res.ok) { setError(json.error || 'Lỗi chuyển tiền'); return; }
        onDone();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
                <div className="modal-header"><h3>↔️ Chuyển tiền</h3><button className="modal-close" onClick={onClose}>×</button></div>
                <div className="modal-body">
                    <Field label="Loại chuyển tiền *">
                        <select className="form-select" value={form.kind} onChange={e => setKind(e.target.value)}>
                            {TRANSFER_KINDS.map(k => <option key={k.key} value={k.key}>{k.label}</option>)}
                        </select>
                    </Field>
                    <Row>
                        <Field label="Ngày *"><input className="form-input" type="date" value={form.date} onChange={e => set('date', e.target.value)} /></Field>
                        <Field label="Phòng ban *">
                            <select className="form-select" value={form.department} onChange={e => set('department', e.target.value)}>
                                <option value="">-- chọn --</option>{DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                            </select>
                        </Field>
                    </Row>
                    <Row>
                        <Field label={form.kind === 'bank_to_fund' ? 'Ngân hàng nguồn *' : 'Quỹ nguồn *'}>
                            {form.kind === 'bank_to_fund' ? (
                                <select className="form-select" value={form.fromBankAccountId} onChange={e => set('fromBankAccountId', e.target.value)}>
                                    <option value="">-- chọn --</option>
                                    {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.bankName} ({fmt(b.balance ?? b.openingBalance)})</option>)}
                                </select>
                            ) : (
                                <select className="form-select" value={form.fromFundId} onChange={e => set('fromFundId', e.target.value)}>
                                    <option value="">-- chọn --</option>
                                    {cashFunds.map(f => <option key={f.id} value={f.id}>{f.name} ({fmt(f.balance ?? f.openingBalance)})</option>)}
                                </select>
                            )}
                        </Field>
                        <Field label={form.kind === 'fund_to_bank' ? 'Ngân hàng đích *' : 'Quỹ đích *'}>
                            {form.kind === 'fund_to_bank' ? (
                                <select className="form-select" value={form.toBankAccountId} onChange={e => set('toBankAccountId', e.target.value)}>
                                    <option value="">-- chọn --</option>
                                    {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.bankName} ({fmt(b.balance ?? b.openingBalance)})</option>)}
                                </select>
                            ) : (
                                <select className="form-select" value={form.toFundId} onChange={e => set('toFundId', e.target.value)}>
                                    <option value="">-- chọn --</option>
                                    {cashFunds.filter(f => f.id !== form.fromFundId).map(f => <option key={f.id} value={f.id}>{f.name} ({fmt(f.balance ?? f.openingBalance)})</option>)}
                                </select>
                            )}
                        </Field>
                    </Row>
                    <Field label="Số tiền *"><MoneyInput value={form.amount} onChange={v => set('amount', v)} /></Field>
                    <Field label="Nội dung"><input className="form-input" placeholder="VD: Bổ sung quỹ để chi công trình X" value={form.content} onChange={e => set('content', e.target.value)} /></Field>
                    {fromLabel && toLabel && (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                            Sẽ tạo 1 phiếu Chi ({fromLabel}) và 1 phiếu Thu ({toLabel}), liên kết với nhau.
                        </div>
                    )}
                    {error && <div style={{ fontSize: 12, color: 'var(--status-danger)', marginTop: 8 }}>{error}</div>}
                </div>
                <div className="modal-footer">
                    <button className="btn btn-ghost" onClick={onClose}>Hủy</button>
                    <button className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? 'Đang lưu...' : 'Chuyển tiền'}</button>
                </div>
            </div>
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════
function SettingsModal({ categories, bankAccounts, cashFunds, accounts, onClose, onRefresh }) {
    const [tab, setTab] = useState('categories');
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 640, maxHeight: '85vh', overflowY: 'auto' }}>
                <div className="modal-header"><h3>⚙️ Cài đặt danh mục</h3><button className="modal-close" onClick={onClose}>×</button></div>
                <div className="tab-bar">
                    <button className={`tab-item ${tab === 'categories' ? 'active' : ''}`} onClick={() => setTab('categories')}>Phân loại Thu/Chi</button>
                    <button className={`tab-item ${tab === 'funds' ? 'active' : ''}`} onClick={() => setTab('funds')}>Quỹ tiền mặt</button>
                    <button className={`tab-item ${tab === 'banks' ? 'active' : ''}`} onClick={() => setTab('banks')}>TK ngân hàng</button>
                    <button className={`tab-item ${tab === 'accounts' ? 'active' : ''}`} onClick={() => setTab('accounts')}>TK kế toán</button>
                </div>
                <div className="modal-body">
                    {tab === 'categories' && <CategoryManager items={categories} onRefresh={onRefresh} />}
                    {tab === 'funds' && <CashFundManager items={cashFunds} accounts={accounts} onRefresh={onRefresh} />}
                    {tab === 'banks' && <BankManager items={bankAccounts} onRefresh={onRefresh} />}
                    {tab === 'accounts' && <AccountManager items={accounts} onRefresh={onRefresh} />}
                </div>
            </div>
        </div>
    );
}

function CategoryManager({ items, onRefresh }) {
    const [form, setForm] = useState({ name: '', group: 'Chi', parentId: '' });
    const tree = useMemo(() => buildCategoryTree(items), [items]);
    const parentOptions = items.filter(c => c.group === form.group && c.level < 3);

    const add = async () => {
        if (!form.name.trim()) return;
        const res = await fetch('/api/finance-categories', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: form.name.trim(), group: form.group, parentId: form.parentId || null }),
        });
        if (!res.ok) { const j = await res.json().catch(() => ({})); alert(j.error || 'Lỗi thêm danh mục'); return; }
        setForm(f => ({ ...f, name: '' }));
        onRefresh();
    };
    const del = async (id) => {
        const res = await fetch(`/api/finance-categories/${id}`, { method: 'DELETE' });
        if (!res.ok) { const j = await res.json().catch(() => ({})); alert(j.error || 'Lỗi xóa danh mục'); return; }
        onRefresh();
    };

    const renderNode = (node, depth) => (
        <div key={node.id}>
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '6px 8px', paddingLeft: 8 + depth * 18, fontSize: 13, borderBottom: '1px dotted var(--border-color)',
            }}>
                <span>{depth > 0 ? '↳ ' : ''}{node.name}{node.active ? '' : ' — đã ẩn'}</span>
                <button className="btn btn-icon" onClick={() => del(node.id)} title="Xóa / ẩn">🗑️</button>
            </div>
            {node.children.map(c => renderNode(c, depth + 1))}
        </div>
    );

    return (
        <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                <input className="form-input" placeholder="Tên danh mục" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={{ flex: 1, minWidth: 140 }} />
                <select className="form-select" value={form.group} onChange={e => setForm(f => ({ ...f, group: e.target.value, parentId: '' }))}>
                    <option value="Thu">Thu</option><option value="Chi">Chi</option>
                </select>
                <select className="form-select" value={form.parentId} onChange={e => setForm(f => ({ ...f, parentId: e.target.value }))}>
                    <option value="">-- Nhóm cấp 1 (không có cha) --</option>
                    {parentOptions.map(p => <option key={p.id} value={p.id}>{'—'.repeat(p.level - 1)} {p.name} (cấp {p.level})</option>)}
                </select>
                <button className="btn btn-primary btn-sm" onClick={add}>+ Thêm</button>
            </div>
            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-muted)', margin: '4px 0' }}>THU</div>
                {tree.filter(n => n.group === 'Thu').map(n => renderNode(n, 0))}
                <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-muted)', margin: '10px 0 4px' }}>CHI</div>
                {tree.filter(n => n.group === 'Chi').map(n => renderNode(n, 0))}
            </div>
        </div>
    );
}

function CashFundManager({ items, accounts, onRefresh }) {
    const [form, setForm] = useState({ name: '', openingBalance: 0, accountingAccountId: '' });
    const add = async () => {
        if (!form.name.trim()) return;
        const res = await fetch('/api/cash-funds', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...form, openingBalance: Number(form.openingBalance) || 0, accountingAccountId: form.accountingAccountId || null }),
        });
        if (!res.ok) { const j = await res.json().catch(() => ({})); alert(j.error || 'Lỗi thêm quỹ'); return; }
        setForm({ name: '', openingBalance: 0, accountingAccountId: '' });
        onRefresh();
    };
    const del = async (id) => { await fetch(`/api/cash-funds/${id}`, { method: 'DELETE' }); onRefresh(); };
    const saveEdit = async (item, edited) => {
        const res = await fetch(`/api/cash-funds/${item.id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: edited.name, status: item.status, notes: item.notes || '',
                openingBalance: Number(edited.openingBalance) || 0,
                accountingAccountId: edited.accountingAccountId || null,
            }),
        });
        if (!res.ok) { const j = await res.json().catch(() => ({})); alert(j.error || 'Lỗi cập nhật quỹ'); return; }
        onRefresh();
    };
    const accountOptions = (accounts || []).map(a => ({ value: a.id, label: `${a.code} — ${a.name}` }));
    return (
        <div>
            <Row>
                <input className="form-input" placeholder="Tên quỹ (VD: Quỹ Lan)" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                <MoneyInput placeholder="Số dư đầu kỳ" value={form.openingBalance} onChange={v => setForm(f => ({ ...f, openingBalance: v }))} />
                <select className="form-select" value={form.accountingAccountId} onChange={e => setForm(f => ({ ...f, accountingAccountId: e.target.value }))}>
                    <option value="">-- TK kế toán (để chuyển quỹ) --</option>
                    {accountOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
            </Row>
            <button className="btn btn-primary btn-sm" style={{ marginTop: 8 }} onClick={add}>+ Thêm quỹ tiền mặt</button>
            <div style={{ marginTop: 12 }}>
                <EditableListRows items={items}
                    fields={[
                        { key: 'name', label: 'Tên quỹ', width: 160 },
                        { key: 'openingBalance', label: 'Số dư đầu kỳ', type: 'money', width: 130 },
                        { key: 'accountingAccountId', label: 'TK kế toán', type: 'select', width: 180, emptyLabel: '-- TK kế toán --', options: accountOptions },
                    ]}
                    render={f => `${f.name} · Số dư: ${fmt(f.balance ?? f.openingBalance)}${f.accountingAccount ? ` · TK ${f.accountingAccount.code}` : ''}`}
                    onSave={saveEdit} onDelete={del} />
            </div>
        </div>
    );
}

function BankManager({ items, onRefresh }) {
    const [form, setForm] = useState({ bankName: '', accountNumber: '', accountHolder: '', openingBalance: 0 });
    const add = async () => {
        if (!form.bankName.trim()) return;
        await fetch('/api/bank-accounts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, openingBalance: Number(form.openingBalance) || 0 }) });
        setForm({ bankName: '', accountNumber: '', accountHolder: '', openingBalance: 0 });
        onRefresh();
    };
    const del = async (id) => { await fetch(`/api/bank-accounts/${id}`, { method: 'DELETE' }); onRefresh(); };
    const saveEdit = async (item, edited) => {
        const res = await fetch(`/api/bank-accounts/${item.id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                bankName: edited.bankName, accountNumber: edited.accountNumber, accountHolder: edited.accountHolder,
                branch: item.branch || '', status: item.status, notes: item.notes || '', openingBalance: Number(edited.openingBalance) || 0,
            }),
        });
        if (!res.ok) { const j = await res.json().catch(() => ({})); alert(j.error || 'Lỗi cập nhật tài khoản'); return; }
        onRefresh();
    };
    return (
        <div>
            <Row>
                <input className="form-input" placeholder="Tên ngân hàng" value={form.bankName} onChange={e => setForm(f => ({ ...f, bankName: e.target.value }))} />
                <input className="form-input" placeholder="Số tài khoản" value={form.accountNumber} onChange={e => setForm(f => ({ ...f, accountNumber: e.target.value }))} />
                <input className="form-input" placeholder="Chủ tài khoản" value={form.accountHolder} onChange={e => setForm(f => ({ ...f, accountHolder: e.target.value }))} />
                <MoneyInput placeholder="Số dư đầu kỳ" value={form.openingBalance} onChange={v => setForm(f => ({ ...f, openingBalance: v }))} />
            </Row>
            <button className="btn btn-primary btn-sm" style={{ marginTop: 8 }} onClick={add}>+ Thêm TK ngân hàng</button>
            <div style={{ marginTop: 12 }}>
                <EditableListRows items={items}
                    fields={[
                        { key: 'bankName', label: 'Tên ngân hàng', width: 150 },
                        { key: 'accountNumber', label: 'Số tài khoản', width: 120 },
                        { key: 'accountHolder', label: 'Chủ tài khoản', width: 130 },
                        { key: 'openingBalance', label: 'Số dư đầu kỳ', type: 'money', width: 130 },
                    ]}
                    render={b => `${b.bankName} — ${b.accountNumber} (${b.accountHolder || '—'}) · Số dư: ${fmt(b.balance ?? b.openingBalance)}`}
                    onSave={saveEdit} onDelete={del} />
            </div>
        </div>
    );
}

function AccountManager({ items, onRefresh }) {
    const [form, setForm] = useState({ code: '', name: '' });
    const add = async () => {
        if (!form.code.trim() || !form.name.trim()) return;
        await fetch('/api/accounting-accounts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
        setForm({ code: '', name: '' });
        onRefresh();
    };
    const del = async (id) => { await fetch(`/api/accounting-accounts/${id}`, { method: 'DELETE' }); onRefresh(); };
    return (
        <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <input className="form-input" placeholder="Mã TK (vd 111)" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} style={{ width: 100 }} />
                <input className="form-input" placeholder="Tên TK" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={{ flex: 1 }} />
                <button className="btn btn-primary btn-sm" onClick={add}>+ Thêm</button>
            </div>
            <ListRows items={items} render={a => `${a.code} — ${a.name}${a.active ? '' : ' — đã ẩn'}`} onDelete={del} />
        </div>
    );
}

function EditableListRows({ items, fields, render, onSave, onDelete }) {
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState(null);
    const [saving, setSaving] = useState(false);

    const startEdit = (item) => {
        setEditingId(item.id);
        const f = {};
        fields.forEach(fld => { f[fld.key] = item[fld.key] ?? ''; });
        setEditForm(f);
    };
    const cancelEdit = () => { setEditingId(null); setEditForm(null); };
    const saveEdit = async (item) => {
        setSaving(true);
        await onSave(item, editForm);
        setSaving(false);
        setEditingId(null); setEditForm(null);
    };

    return (
        <div style={{ maxHeight: 260, overflowY: 'auto' }}>
            {items.map(it => editingId === it.id ? (
                <div key={it.id} style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', padding: 8, border: '1px solid var(--border-color)', borderRadius: 6, marginBottom: 6 }}>
                    {fields.map(fld => fld.type === 'select' ? (
                        <select key={fld.key} className="form-select" style={{ width: fld.width || 120 }}
                            value={editForm[fld.key]} onChange={e => setEditForm(f => ({ ...f, [fld.key]: e.target.value }))}>
                            <option value="">{fld.emptyLabel || `-- ${fld.label} --`}</option>
                            {fld.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                    ) : fld.type === 'money' ? (
                        <MoneyInput key={fld.key} placeholder={fld.label} style={{ width: fld.width || 120 }}
                            value={editForm[fld.key]} onChange={v => setEditForm(f => ({ ...f, [fld.key]: v }))} />
                    ) : (
                        <input key={fld.key} className="form-input" type={fld.type || 'text'} placeholder={fld.label}
                            style={{ width: fld.width || 120 }}
                            value={editForm[fld.key]} onChange={e => setEditForm(f => ({ ...f, [fld.key]: e.target.value }))} />
                    ))}
                    <button className="btn btn-primary btn-sm" onClick={() => saveEdit(it)} disabled={saving}>Lưu</button>
                    <button className="btn btn-ghost btn-sm" onClick={cancelEdit}>Hủy</button>
                </div>
            ) : (
                <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', fontSize: 13, borderBottom: '1px dotted var(--border-color)' }}>
                    <span>{render(it)}</span>
                    <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-icon" onClick={() => startEdit(it)} title="Sửa">✏️</button>
                        <button className="btn btn-icon" onClick={() => onDelete(it.id)} title="Xóa / ẩn">🗑️</button>
                    </div>
                </div>
            ))}
            {items.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: 8 }}>Chưa có dữ liệu</div>}
        </div>
    );
}

function ListRows({ items, render, onDelete }) {
    return (
        <div style={{ maxHeight: 260, overflowY: 'auto' }}>
            {items.map(it => (
                <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', fontSize: 13, borderBottom: '1px dotted var(--border-color)' }}>
                    <span>{render(it)}</span>
                    <button className="btn btn-icon" onClick={() => onDelete(it.id)} title="Xóa / ẩn">🗑️</button>
                </div>
            ))}
            {items.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: 8 }}>Chưa có dữ liệu</div>}
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════
function ImportModal({ onClose, onDone }) {
    const [file, setFile] = useState(null);
    const [rows, setRows] = useState([]);
    const [step, setStep] = useState('pick'); // pick | preview | done
    const [result, setResult] = useState(null);
    const [busy, setBusy] = useState(false);

    const pickFile = async (e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        setFile(f);
        const XLSX = await import('xlsx');
        const buf = await f.arrayBuffer();
        const wb = XLSX.read(buf);
        const ws = wb.Sheets[wb.SheetNames[0]];
        const parsed = XLSX.utils.sheet_to_json(ws, { raw: false });
        setRows(parsed);
        setStep('preview');
    };

    const confirmImport = async () => {
        setBusy(true);
        const res = await fetch('/api/finance-transactions/import', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rows }),
        });
        const json = await res.json();
        setBusy(false);
        setResult(json);
        setStep('done');
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 640, maxHeight: '85vh', overflowY: 'auto' }}>
                <div className="modal-header"><h3>⬆️ Nhập Excel</h3><button className="modal-close" onClick={onClose}>×</button></div>
                <div className="modal-body">
                    {step === 'pick' && (
                        <div className="form-group">
                            <label className="form-label">Chọn file Excel (.xlsx) theo đúng cấu trúc file mẫu</label>
                            <input className="form-file" type="file" accept=".xlsx,.xls" onChange={pickFile} />
                        </div>
                    )}
                    {step === 'preview' && (
                        <div>
                            <div style={{ marginBottom: 8, fontSize: 13 }}>📄 {file?.name} — {rows.length} dòng dữ liệu sẽ được nhập.</div>
                            <div style={{ maxHeight: 300, overflow: 'auto', border: '1px solid var(--border-color)', borderRadius: 8 }}>
                                <table className="data-table" style={{ fontSize: 11, margin: 0 }}>
                                    <thead><tr>{Object.keys(rows[0] || {}).map(k => <th key={k}>{k}</th>)}</tr></thead>
                                    <tbody>
                                        {rows.slice(0, 20).map((r, i) => (
                                            <tr key={i}>{Object.keys(rows[0] || {}).map(k => <td key={k}>{String(r[k] ?? '')}</td>)}</tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {rows.length > 20 && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>...và {rows.length - 20} dòng khác</div>}
                        </div>
                    )}
                    {step === 'done' && result && (
                        <div>
                            <div style={{ color: 'var(--status-success)', fontWeight: 600, marginBottom: 8 }}>✅ Đã nhập thành công {result.success} dòng</div>
                            {result.errors?.length > 0 && (
                                <div>
                                    <div style={{ color: 'var(--status-danger)', fontWeight: 600, marginBottom: 4 }}>⚠️ {result.errors.length} dòng lỗi:</div>
                                    <div style={{ maxHeight: 200, overflowY: 'auto', fontSize: 12 }}>
                                        {result.errors.map((e, i) => <div key={i}>Dòng {e.row}: {e.message}</div>)}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <div className="modal-footer">
                    {step === 'preview' && <button className="btn btn-ghost" onClick={() => setStep('pick')} disabled={busy}>← Chọn lại</button>}
                    {step === 'preview' && <button className="btn btn-primary" onClick={confirmImport} disabled={busy}>{busy ? 'Đang nhập...' : `Xác nhận nhập ${rows.length} dòng`}</button>}
                    {step === 'done' && <button className="btn btn-primary" onClick={onDone}>Xong</button>}
                    {step !== 'preview' && step !== 'done' && <button className="btn btn-ghost" onClick={onClose}>Đóng</button>}
                </div>
            </div>
        </div>
    );
}
