'use client';
import { useState, useEffect } from 'react';
import { DEPARTMENTS } from '@/lib/financeJournal';

export function findAccountByCode(accounts, code) { return accounts.find(a => a.code === code)?.id || ''; }

const EMPTY_FORM = () => ({
    date: new Date().toISOString().slice(0, 10), method: 'Tiền mặt', bankAccountId: '', cashFundId: '',
    department: 'Hành chính kế toán', content: '',
    debitAccountId: '', creditAccountId: '', amount: '',
    documentNo: '', documentDate: '', attachments: [], notes: '',
});

export function ObjectPicker({ options, objectId, objectName, onChange }) {
    const [q, setQ] = useState('');
    const list = q ? options.filter(o => o.name.toLowerCase().includes(q.toLowerCase()) || o.code?.toLowerCase().includes(q.toLowerCase())).slice(0, 30) : [];
    return (
        <div>
            <input className="form-input" placeholder="Tìm..." value={objectId ? objectName : q}
                onChange={e => { setQ(e.target.value); onChange({ id: '', name: e.target.value }); }} />
            {list.length > 0 && !objectId && (
                <div style={{ border: '1px solid var(--border-color)', borderRadius: 6, marginTop: 4, maxHeight: 160, overflowY: 'auto' }}>
                    {list.map(o => (
                        <div key={o.id} style={{ padding: '6px 10px', fontSize: 13, cursor: 'pointer' }}
                            onClick={() => { onChange({ id: o.id, name: o.name }); setQ(''); }}
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

// Modal ghi nhận giao dịch đơn giản — tạo THẲNG 1 FinanceTransaction qua /api/finance-transactions
// (objectType/objectId cố định theo NCC/KH đang chọn). Đây là nơi DUY NHẤT các submodule Công nợ
// NCC/Khách hàng tạo dòng tiền — không có bước "phân bổ" nào khác, đúng nguyên tắc chỉ lấy/ghi dữ
// liệu qua Nhật ký Thu – Chi.
export default function FinanceRecordModal({ title, objectType, objectOptions, fixedObject, bankAccounts, cashFunds, accounts, debitCode, onClose, onDone }) {
    const type = objectType === 'NCC' ? 'Chi' : 'Thu';
    const [object, setObject] = useState(fixedObject || { id: '', name: '' });
    const [form, setForm] = useState({
        ...EMPTY_FORM(),
        debitAccountId: findAccountByCode(accounts, type === 'Chi' ? debitCode : '111'),
        creditAccountId: findAccountByCode(accounts, type === 'Chi' ? '111' : debitCode),
    });
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    useEffect(() => {
        if (type === 'Chi') {
            set('creditAccountId', findAccountByCode(accounts, form.method === 'Tiền mặt' ? '111' : '112'));
        } else {
            set('debitAccountId', findAccountByCode(accounts, form.method === 'Tiền mặt' ? '111' : '112'));
        }
    }, [form.method]); // eslint-disable-line react-hooks/exhaustive-deps

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
        if (!object.id) return alert(`Vui lòng chọn ${objectType === 'NCC' ? 'NCC' : 'khách hàng'}`);
        if (!form.content.trim()) return alert('Vui lòng nhập nội dung');
        if (!(Number(form.amount) > 0)) return alert('Số tiền phải lớn hơn 0');
        if (form.method === 'Chuyển khoản' && !form.bankAccountId) return alert('Vui lòng chọn tài khoản ngân hàng');
        if (!form.debitAccountId || !form.creditAccountId) return alert('Vui lòng chọn TK Nợ/Có');

        const payload = {
            date: form.date, type, method: form.method, amount: Number(form.amount),
            department: form.department, content: form.content,
            debitAccountId: form.debitAccountId, creditAccountId: form.creditAccountId,
            bankAccountId: form.method === 'Chuyển khoản' ? (form.bankAccountId || null) : null,
            cashFundId: form.method === 'Tiền mặt' ? (form.cashFundId || null) : null,
            objectType, objectId: object.id, objectName: object.name,
            documentNo: form.documentNo, documentDate: form.documentDate || null,
            attachments: form.attachments, notes: form.notes, status: 'Đã hạch toán',
        };
        setSaving(true);
        const res = await fetch('/api/finance-transactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const json = await res.json();
        setSaving(false);
        if (!res.ok) { alert(json.error || 'Lỗi ghi nhận giao dịch'); return; }
        onDone();
    };

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}>
                <h2 style={{ marginBottom: 16 }}>{title}</h2>

                <div style={{ display: 'grid', gap: 12 }}>
                    {!fixedObject && (
                        <div>
                            <label className="form-label">{objectType === 'NCC' ? 'Nhà cung cấp' : 'Khách hàng'} *</label>
                            <ObjectPicker options={objectOptions} objectId={object.id} objectName={object.name} onChange={setObject} />
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                            <label className="form-label">Ngày *</label>
                            <input className="form-input" type="date" value={form.date} onChange={e => set('date', e.target.value)} />
                        </div>
                        <div>
                            <label className="form-label">Phòng ban *</label>
                            <select className="form-select" value={form.department} onChange={e => set('department', e.target.value)}>
                                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="form-label">Nội dung *</label>
                        <input className="form-input" value={form.content} onChange={e => set('content', e.target.value)} />
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
                                <label className="form-label">Quỹ</label>
                                <select className="form-select" value={form.cashFundId} onChange={e => set('cashFundId', e.target.value)}>
                                    <option value="">-- mặc định --</option>
                                    {cashFunds.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                </select>
                            </div>
                        ) : (
                            <div>
                                <label className="form-label">TK ngân hàng *</label>
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
                        <input type="file" onChange={upload} disabled={uploading} />
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
                    <button className="btn btn-primary" disabled={saving} onClick={submit}>{saving ? 'Đang lưu...' : 'Xác nhận'}</button>
                </div>
            </div>
        </div>
    );
}
