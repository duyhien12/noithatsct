'use client';
import { useState, useEffect } from 'react';

// Ô chọn Phương thức (Tiền mặt/Chuyển khoản) + TK ngân hàng/Quỹ tiền mặt — dùng chung cho các
// modal "Xác nhận thu tiền" (payments, finance, workshop/expenses, sales/expenses) để đủ dữ liệu
// tạo đúng giao dịch Thu trong Nhật ký Thu – Chi (Thu TM vs Thu TGNH).
export default function CollectMethodFields({ method, bankAccountId, cashFundId, onChange }) {
    const [bankAccounts, setBankAccounts] = useState([]);
    const [cashFunds, setCashFunds] = useState([]);

    useEffect(() => {
        fetch('/api/bank-accounts').then(r => r.json()).then(d => setBankAccounts(Array.isArray(d) ? d : [])).catch(() => {});
        fetch('/api/cash-funds').then(r => r.json()).then(d => setCashFunds(Array.isArray(d) ? d : [])).catch(() => {});
    }, []);

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
            <div className="form-group">
                <label className="form-label">Phương thức *</label>
                <select className="form-select" value={method} onChange={e => onChange({ method: e.target.value, bankAccountId: '', cashFundId: '' })}>
                    <option value="Tiền mặt">Tiền mặt</option>
                    <option value="Chuyển khoản">Chuyển khoản</option>
                </select>
            </div>
            {method === 'Tiền mặt' ? (
                <div className="form-group">
                    <label className="form-label">Quỹ nhận</label>
                    <select className="form-select" value={cashFundId} onChange={e => onChange({ cashFundId: e.target.value })}>
                        <option value="">-- mặc định --</option>
                        {cashFunds.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                </div>
            ) : (
                <div className="form-group">
                    <label className="form-label">TK nhận *</label>
                    <select className="form-select" value={bankAccountId} onChange={e => onChange({ bankAccountId: e.target.value })}>
                        <option value="">-- chọn --</option>
                        {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.bankName} — {b.accountNumber}</option>)}
                    </select>
                </div>
            )}
        </div>
    );
}
