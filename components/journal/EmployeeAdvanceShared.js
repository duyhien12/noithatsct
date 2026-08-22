'use client';
import { useState, useEffect } from 'react';
import { ADVANCE_TYPES, SETTLE_TYPES } from '@/lib/employeeAdvance';
import { DEPARTMENTS } from '@/lib/financeJournal';

// Component dùng chung giữa "Tạm ứng nhân viên" (/finance/journal/advances) và
// "Tạm ứng công tác/vật tư/tiền ăn" (/finance/journal/advance-expenses) — cả 2 trang
// cùng thao tác trên model EmployeeAdvance/AdvanceSettlement, chỉ khác cách lọc/hiển thị danh sách.

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(n || 0));
const today = () => new Date().toISOString().slice(0, 10);

const EMPTY_ADVANCE_FORM = {
    employeeId: '', employeeName: '', projectId: '', advanceType: 'Khác',
    date: today(), content: '', amount: '',
    method: 'Tiền mặt', bankAccountId: '', cashFundId: '',
    department: '', debitAccountId: '', creditAccountId: '',
    documentNo: '', documentDate: '', attachments: [], notes: '',
};

export function findAccountByCode(accounts, code) { return accounts.find(a => a.code === code)?.id || ''; }

export function EmployeePicker({ employees, employeeId, employeeName, onChange }) {
    const [q, setQ] = useState('');
    const options = q ? employees.filter(e => e.name.toLowerCase().includes(q.toLowerCase()) || e.code.toLowerCase().includes(q.toLowerCase())).slice(0, 30) : [];
    return (
        <div>
            <input className="form-input" placeholder="Tìm nhân viên..." value={employeeId ? employeeName : q}
                onChange={e => { setQ(e.target.value); onChange({ employeeId: '', employeeName: e.target.value, department: '' }); }} />
            {options.length > 0 && !employeeId && (
                <div style={{ border: '1px solid var(--border-color)', borderRadius: 6, marginTop: 4, maxHeight: 160, overflowY: 'auto' }}>
                    {options.map(o => (
                        <div key={o.id} style={{ padding: '6px 10px', fontSize: 13, cursor: 'pointer' }}
                            onClick={() => { onChange({ employeeId: o.id, employeeName: o.name, department: o.department?.name || '' }); setQ(''); }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                            onMouseLeave={e => e.currentTarget.style.background = ''}>
                            {o.name} ({o.code}) — {o.department?.name || ''}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export function CreateAdvanceModal({ employees, projects, bankAccounts, cashFunds, accounts, typeOptions, onClose, onSave }) {
    const advanceTypes = typeOptions || ADVANCE_TYPES;
    const [form, setForm] = useState({ ...EMPTY_ADVANCE_FORM, advanceType: advanceTypes[0] || 'Khác' });
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    useEffect(() => {
        // Mặc định hạch toán Nợ TK 141 (Tạm ứng) / Có 111|112 theo phương thức — kế toán có thể đổi lại.
        setForm(f => ({
            ...f,
            debitAccountId: f.debitAccountId || findAccountByCode(accounts, '141'),
            creditAccountId: findAccountByCode(accounts, f.method === 'Tiền mặt' ? '111' : '112'),
        }));
    }, [form.method, accounts]);

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
        e.target.value = '';
    };

    const submit = async () => {
        if (!form.employeeId) return alert('Vui lòng chọn nhân viên');
        if (!form.department) return alert('Vui lòng chọn phòng ban');
        if (!form.content.trim()) return alert('Vui lòng nhập nội dung');
        if (!(Number(form.amount) > 0)) return alert('Số tiền phải lớn hơn 0');
        if (form.method === 'Chuyển khoản' && !form.bankAccountId) return alert('Vui lòng chọn tài khoản ngân hàng');
        if (!form.debitAccountId || !form.creditAccountId) return alert('Vui lòng chọn TK Nợ/Có');
        setSaving(true);
        await onSave(form);
        setSaving(false);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 640, maxHeight: '90vh', overflowY: 'auto' }}>
                <h2 style={{ marginBottom: 16 }}>+ Tạo tạm ứng</h2>

                <div style={{ display: 'grid', gap: 12 }}>
                    <div>
                        <label className="form-label">Nhân viên *</label>
                        <EmployeePicker employees={employees} employeeId={form.employeeId} employeeName={form.employeeName}
                            onChange={patch => setForm(f => ({ ...f, ...patch }))} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                            <label className="form-label">Ngày *</label>
                            <input className="form-input" type="date" value={form.date} onChange={e => set('date', e.target.value)} />
                        </div>
                        <div>
                            <label className="form-label">Loại tạm ứng *</label>
                            <select className="form-select" value={form.advanceType} onChange={e => set('advanceType', e.target.value)}>
                                {advanceTypes.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="form-label">Nội dung *</label>
                        <input className="form-input" value={form.content} onChange={e => set('content', e.target.value)} placeholder="VD: Tạm ứng công tác Hà Nội" />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                            <label className="form-label">Dự án/Công trình</label>
                            <select className="form-select" value={form.projectId} onChange={e => set('projectId', e.target.value)}>
                                <option value="">-- không có --</option>
                                {projects.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="form-label">Phòng ban *</label>
                            <select className="form-select" value={form.department} onChange={e => set('department', e.target.value)}>
                                <option value="">-- chọn --</option>
                                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="form-label">Số tiền *</label>
                        <input className="form-input" type="number" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0" />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                            <label className="form-label">Phương thức *</label>
                            <select className="form-select" value={form.method} onChange={e => set('method', e.target.value)}>
                                <option value="Tiền mặt">Tiền mặt</option>
                                <option value="Chuyển khoản">Chuyển khoản</option>
                            </select>
                        </div>
                        {form.method === 'Tiền mặt' ? (
                            <div>
                                <label className="form-label">Quỹ tiền mặt</label>
                                <select className="form-select" value={form.cashFundId} onChange={e => set('cashFundId', e.target.value)}>
                                    <option value="">-- mặc định --</option>
                                    {cashFunds.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                </select>
                            </div>
                        ) : (
                            <div>
                                <label className="form-label">Tài khoản ngân hàng *</label>
                                <select className="form-select" value={form.bankAccountId} onChange={e => set('bankAccountId', e.target.value)}>
                                    <option value="">-- chọn --</option>
                                    {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.bankName} — {b.accountNumber}</option>)}
                                </select>
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                            <label className="form-label">TK Nợ *</label>
                            <select className="form-select" value={form.debitAccountId} onChange={e => set('debitAccountId', e.target.value)}>
                                {accounts.map(a => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="form-label">TK Có *</label>
                            <select className="form-select" value={form.creditAccountId} onChange={e => set('creditAccountId', e.target.value)}>
                                {accounts.map(a => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="form-label">Chứng từ</label>
                        <input className="form-file" type="file" onChange={upload} disabled={uploading} />
                        {form.attachments.map((a, i) => (
                            <div key={i} style={{ fontSize: 12, marginTop: 4 }}>
                                📎 <a href={a.url} target="_blank" rel="noreferrer">{a.name}</a>
                                <button className="btn btn-icon" onClick={() => set('attachments', form.attachments.filter((_, idx) => idx !== i))}>✕</button>
                            </div>
                        ))}
                    </div>

                    <div>
                        <label className="form-label">Ghi chú</label>
                        <textarea className="form-input" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
                    <button className="btn btn-ghost" onClick={onClose}>Hủy</button>
                    <button className="btn btn-primary" disabled={saving} onClick={submit}>{saving ? 'Đang lưu...' : 'Lưu tạm ứng'}</button>
                </div>
            </div>
        </div>
    );
}

export function SettleModal({ advance, bankAccounts, cashFunds, accounts, onClose, onDone }) {
    const settled = advance.settlements.reduce((s, x) => s + x.amount, 0);
    const remaining = advance.amount - settled;

    const [form, setForm] = useState({
        settleType: 'cash_return', amount: remaining, date: today(),
        method: 'Tiền mặt', bankAccountId: '', cashFundId: '',
        debitAccountId: findAccountByCode(accounts, '111'), creditAccountId: findAccountByCode(accounts, '141'),
        proofUrl: '', notes: '',
    });
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    useEffect(() => {
        if (form.settleType !== 'cash_return') return;
        set('debitAccountId', findAccountByCode(accounts, form.method === 'Tiền mặt' ? '111' : '112'));
    }, [form.method, form.settleType]); // eslint-disable-line react-hooks/exhaustive-deps

    const upload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        const fd = new FormData();
        fd.append('file', file);
        fd.append('type', 'documents');
        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        const json = await res.json();
        if (json.url) set('proofUrl', json.url);
        setUploading(false);
    };

    const submit = async () => {
        if (!(Number(form.amount) > 0)) return alert('Số tiền phải lớn hơn 0');
        if (Number(form.amount) > remaining + 0.01) return alert(`Số tiền vượt quá số dư còn lại (${fmt(remaining)} đ)`);
        if (form.settleType === 'cash_return' && form.method === 'Chuyển khoản' && !form.bankAccountId) return alert('Vui lòng chọn tài khoản ngân hàng');

        const payload = {
            settleType: form.settleType, amount: Number(form.amount), date: form.date,
            proofUrl: form.proofUrl, notes: form.notes,
            method: form.settleType === 'cash_return' ? form.method : null,
            bankAccountId: form.settleType === 'cash_return' && form.method === 'Chuyển khoản' ? form.bankAccountId : null,
            cashFundId: form.settleType === 'cash_return' && form.method === 'Tiền mặt' ? (form.cashFundId || null) : null,
            debitAccountId: form.settleType === 'cash_return' ? form.debitAccountId : null,
            creditAccountId: form.settleType === 'cash_return' ? form.creditAccountId : null,
        };
        setSaving(true);
        const res = await fetch(`/api/employee-advances/${advance.id}/settle`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
        });
        const json = await res.json();
        setSaving(false);
        if (!res.ok) { alert(json.error || 'Lỗi xử lý'); return; }
        onDone();
    };

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
                <h2 style={{ marginBottom: 4 }}>Hoàn ứng — {advance.code}</h2>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>Còn lại: <strong>{fmt(remaining)} đ</strong> / Tổng tạm ứng: {fmt(advance.amount)} đ</div>

                <div style={{ display: 'grid', gap: 12 }}>
                    <div>
                        <label className="form-label">Hình thức *</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {SETTLE_TYPES.map(t => (
                                <label key={t.value} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                                    <input type="radio" name="settleType" checked={form.settleType === t.value} onChange={() => set('settleType', t.value)} />
                                    {t.label}
                                </label>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="form-label">Số tiền *</label>
                        <input className="form-input" type="number" value={form.amount} onChange={e => set('amount', e.target.value)} />
                    </div>
                    <div>
                        <label className="form-label">Ngày *</label>
                        <input className="form-input" type="date" value={form.date} onChange={e => set('date', e.target.value)} />
                    </div>

                    {form.settleType === 'cash_return' ? (
                        <>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div>
                                    <label className="form-label">Phương thức *</label>
                                    <select className="form-select" value={form.method} onChange={e => set('method', e.target.value)}>
                                        <option value="Tiền mặt">Tiền mặt</option>
                                        <option value="Chuyển khoản">Chuyển khoản</option>
                                    </select>
                                </div>
                                {form.method === 'Tiền mặt' ? (
                                    <div>
                                        <label className="form-label">Quỹ nhận</label>
                                        <select className="form-select" value={form.cashFundId} onChange={e => set('cashFundId', e.target.value)}>
                                            <option value="">-- mặc định --</option>
                                            {cashFunds.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                        </select>
                                    </div>
                                ) : (
                                    <div>
                                        <label className="form-label">TK nhận *</label>
                                        <select className="form-select" value={form.bankAccountId} onChange={e => set('bankAccountId', e.target.value)}>
                                            <option value="">-- chọn --</option>
                                            {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.bankName} — {b.accountNumber}</option>)}
                                        </select>
                                    </div>
                                )}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div>
                                    <label className="form-label">TK Nợ *</label>
                                    <select className="form-select" value={form.debitAccountId} onChange={e => set('debitAccountId', e.target.value)}>
                                        {accounts.map(a => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="form-label">TK Có *</label>
                                    <select className="form-select" value={form.creditAccountId} onChange={e => set('creditAccountId', e.target.value)}>
                                        {accounts.map(a => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                                    </select>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: 8, borderRadius: 6 }}>
                            ℹ️ Hình thức này chỉ giảm số dư tạm ứng, <strong>không</strong> tạo dòng tiền trong Nhật ký Thu – Chi.
                        </div>
                    )}

                    <div>
                        <label className="form-label">Chứng từ {form.settleType === 'expense_proof' ? '*' : ''}</label>
                        <input className="form-file" type="file" onChange={upload} disabled={uploading} />
                        {form.proofUrl && <div style={{ fontSize: 12, marginTop: 4 }}>📎 <a href={form.proofUrl} target="_blank" rel="noreferrer">Đã đính kèm</a></div>}
                    </div>

                    <div>
                        <label className="form-label">Ghi chú</label>
                        <textarea className="form-input" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
                    <button className="btn btn-ghost" onClick={onClose}>Hủy</button>
                    <button className="btn btn-primary" disabled={saving} onClick={submit}>{saving ? 'Đang lưu...' : 'Xác nhận'}</button>
                </div>
            </div>
        </div>
    );
}
