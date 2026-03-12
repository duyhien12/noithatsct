'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);
const fmtDate = (d) => d ? new Date(d).toISOString().slice(0, 10) : '';
const fmtDateVN = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
const STATUS_OPTS = ['Nháp', 'Đã ký', 'Đang thực hiện', 'Hoàn thành', 'Hủy'];
const TYPE_OPTS = ['Thiết kế kiến trúc', 'Thiết kế nội thất', 'Thi công thô', 'Thi công hoàn thiện', 'Thi công nội thất'];

const PAYMENT_TEMPLATES = {
    'Thiết kế kiến trúc': [
        { phase: 'Đặt cọc thiết kế', pct: 50 },
        { phase: 'Nghiệm thu bản vẽ', pct: 50 },
    ],
    'Thiết kế nội thất': [
        { phase: 'Đặt cọc thiết kế nội thất', pct: 50 },
        { phase: 'Nghiệm thu phối cảnh 3D', pct: 30 },
        { phase: 'Nghiệm thu bản vẽ triển khai', pct: 20 },
    ],
    'Thi công thô': [
        { phase: 'Đặt cọc thi công', pct: 30 },
        { phase: 'Hoàn thiện móng + khung', pct: 30 },
        { phase: 'Hoàn thiện xây thô', pct: 30 },
        { phase: 'Nghiệm thu bàn giao thô', pct: 10 },
    ],
    'Thi công hoàn thiện': [
        { phase: 'Đặt cọc hoàn thiện', pct: 30 },
        { phase: 'Hoàn thiện trát + ốp lát', pct: 25 },
        { phase: 'Hoàn thiện sơn + điện nước', pct: 25 },
        { phase: 'Nghiệm thu bàn giao', pct: 20 },
    ],
    'Thi công nội thất': [
        { phase: 'Đặt cọc nội thất', pct: 50 },
        { phase: 'Giao hàng + lắp đặt', pct: 40 },
        { phase: 'Nghiệm thu hoàn thiện', pct: 10 },
    ],
};

export default function ContractDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const [data, setData] = useState(null);
    const [form, setForm] = useState(null);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [editingPayments, setEditingPayments] = useState(false);
    const [paymentPhases, setPaymentPhases] = useState([]);
    const [savingPayments, setSavingPayments] = useState(false);
    const fileRef = useRef();

    const reload = () => {
        fetch(`/api/contracts/${id}`)
            .then(r => r.json())
            .then(d => {
                setData(d);
                setForm({
                    name: d.name || '',
                    type: d.type || 'Thi công thô',
                    status: d.status || 'Nháp',
                    contractValue: d.contractValue || 0,
                    variationAmount: d.variationAmount || 0,
                    signDate: fmtDate(d.signDate),
                    startDate: fmtDate(d.startDate),
                    endDate: fmtDate(d.endDate),
                    paymentTerms: d.paymentTerms || '',
                    notes: d.notes || '',
                    fileUrl: d.fileUrl || '',
                });
            });
    };

    useEffect(() => { reload(); }, [id]);

    const save = async () => {
        setSaving(true);
        const res = await fetch(`/api/contracts/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...form,
                contractValue: parseFloat(form.contractValue) || 0,
                variationAmount: parseFloat(form.variationAmount) || 0,
                signDate: form.signDate ? new Date(form.signDate) : null,
                startDate: form.startDate ? new Date(form.startDate) : null,
                endDate: form.endDate ? new Date(form.endDate) : null,
            }),
        });
        if (res.ok) {
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
            const updated = await res.json();
            setData(prev => ({ ...prev, ...updated }));
        }
        setSaving(false);
    };

    const deleteContract = async () => {
        if (!confirm('Bạn chắc chắn muốn xóa hợp đồng này?')) return;
        const res = await fetch(`/api/contracts/${id}`, { method: 'DELETE' });
        if (res.ok) router.push('/contracts');
    };

    const uploadFile = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        const fd = new FormData();
        fd.append('file', file);
        fd.append('type', 'contracts');
        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        const json = await res.json();
        if (json.url) setForm(f => ({ ...f, fileUrl: json.url }));
        setUploading(false);
    };

    const startEditPayments = () => {
        const cv = parseFloat(form.contractValue) || 0;
        setPaymentPhases((data.payments || []).map(p => ({
            phase: p.phase, amount: p.amount || 0, paidAmount: p.paidAmount || 0,
            pct: cv > 0 ? Math.round((p.amount || 0) / cv * 100) : 0,
            status: p.status || 'Chưa thu', notes: p.notes || '',
        })));
        setEditingPayments(true);
    };

    const loadTemplate = () => {
        const tmpl = PAYMENT_TEMPLATES[form.type] || [];
        const cv = parseFloat(form.contractValue) || 0;
        setPaymentPhases(tmpl.map(t => ({
            phase: t.phase, pct: t.pct,
            amount: Math.round(cv * t.pct / 100),
            paidAmount: 0, status: 'Chưa thu', notes: '',
        })));
    };

    const updatePhase = (idx, field, value) => {
        const cv = parseFloat(form.contractValue) || 0;
        setPaymentPhases(prev => prev.map((p, i) => {
            if (i !== idx) return p;
            const updated = { ...p, [field]: value };
            if (field === 'pct') updated.amount = Math.round(cv * (Number(value) || 0) / 100);
            if (field === 'amount') updated.pct = cv ? Math.round((Number(value) || 0) / cv * 100) : 0;
            return updated;
        }));
    };

    const addPhase = () => setPaymentPhases(prev => [...prev, { phase: '', pct: 0, amount: 0, paidAmount: 0, status: 'Chưa thu', notes: '' }]);
    const removePhase = (idx) => setPaymentPhases(prev => prev.filter((_, i) => i !== idx));

    const savePayments = async () => {
        setSavingPayments(true);
        const res = await fetch(`/api/contracts/${id}/payments`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phases: paymentPhases }),
        });
        if (res.ok) {
            const payments = await res.json();
            setData(prev => ({ ...prev, payments }));
            setEditingPayments(false);
        }
        setSavingPayments(false);
    };

    const totalPhasePct = paymentPhases.reduce((s, p) => s + (p.pct || 0), 0);
    const totalPhaseAmount = paymentPhases.reduce((s, p) => s + (p.amount || 0), 0);

    if (!data || !form) return <div style={{ padding: 40, textAlign: 'center' }}>⏳ Đang tải...</div>;

    const fileExt = form.fileUrl ? form.fileUrl.split('.').pop().toUpperCase() : null;
    const fileName = form.fileUrl ? form.fileUrl.split('/').pop() : null;
    const totalValue = (parseFloat(form.contractValue) || 0) + (parseFloat(form.variationAmount) || 0);
    const paidPct = totalValue > 0 ? Math.round(((data.paidAmount || 0) / totalValue) * 100) : 0;

    return (
        <div>
            {/* ── HEADER ── */}
            <div className="contract-detail-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => router.push('/contracts')}>← HĐ</button>
                    <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>/</span>
                    <span className="accent" style={{ fontWeight: 700, fontSize: 14 }}>{data.code}</span>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>{data.name}</span>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                    {saved && <span style={{ color: 'var(--status-success)', fontWeight: 600, fontSize: 12 }}>✅</span>}
                    {data.status === 'Nháp' && (
                        <button className="btn btn-danger btn-sm" onClick={deleteContract}>🗑</button>
                    )}
                    <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>
                        {saving ? '⏳' : '💾 Lưu'}
                    </button>
                </div>
            </div>

            {/* ── MOBILE SUMMARY STRIP (only on mobile) ── */}
            <div className="contract-mobile-summary">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    {[
                        { label: 'Giá trị HĐ', value: fmt(form.contractValue), color: 'var(--accent-primary)' },
                        { label: 'Đã thu', value: fmt(data.paidAmount), color: 'var(--status-success)' },
                        { label: 'Còn lại', value: fmt(totalValue - (data.paidAmount || 0)), color: 'var(--status-danger)' },
                    ].map(s => (
                        <div key={s.label} style={{ background: 'var(--bg-card)', borderRadius: 8, padding: '8px 10px', border: '1px solid var(--border-light)' }}>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>{s.label}</div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: s.color, wordBreak: 'break-all' }}>{s.value}</div>
                        </div>
                    ))}
                </div>
                <div style={{ marginTop: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                        <span style={{ color: 'var(--text-muted)' }}>{data.customer?.name} • {form.type}</span>
                        <span style={{ fontWeight: 600 }}>{paidPct}% đã thu</span>
                    </div>
                    <div className="progress-bar" style={{ height: 6 }}>
                        <div className="progress-fill" style={{ width: `${paidPct}%` }} />
                    </div>
                </div>
            </div>

            {/* ── MAIN LAYOUT ── */}
            <div className="contract-detail-layout">
                {/* LEFT */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
                    {/* Thông tin chung */}
                    <div className="card">
                        <div className="card-header"><h3>📋 Thông tin hợp đồng</h3></div>
                        <div className="card-body">
                            <div className="contract-form-grid">
                                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                    <label className="form-label">Tên hợp đồng</label>
                                    <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Loại hợp đồng</label>
                                    <select className="form-select" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                                        {TYPE_OPTS.map(t => <option key={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Trạng thái</label>
                                    <select className="form-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                                        {STATUS_OPTS.map(s => <option key={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Giá trị HĐ (₫)</label>
                                    <input className="form-input" type="number" value={form.contractValue} onChange={e => setForm(f => ({ ...f, contractValue: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Phát sinh (₫)</label>
                                    <input className="form-input" type="number" value={form.variationAmount} onChange={e => setForm(f => ({ ...f, variationAmount: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Ngày ký</label>
                                    <input className="form-input" type="date" value={form.signDate} onChange={e => setForm(f => ({ ...f, signDate: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Ngày bắt đầu</label>
                                    <input className="form-input" type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
                                </div>
                                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                    <label className="form-label">Ngày kết thúc</label>
                                    <input className="form-input" type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
                                </div>
                                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                    <label className="form-label">Điều khoản thanh toán</label>
                                    <textarea className="form-input" rows={3} value={form.paymentTerms} onChange={e => setForm(f => ({ ...f, paymentTerms: e.target.value }))} style={{ resize: 'vertical' }} />
                                </div>
                                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                    <label className="form-label">Ghi chú</label>
                                    <textarea className="form-input" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={{ resize: 'vertical' }} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* File HĐ */}
                    <div className="card">
                        <div className="card-header"><h3>📎 File hợp đồng</h3></div>
                        <div className="card-body">
                            {form.fileUrl ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border)' }}>
                                    <span style={{ fontSize: 28 }}>{['DOC', 'DOCX'].includes(fileExt) ? '📝' : fileExt === 'PDF' ? '📄' : '📁'}</span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fileName}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{fileExt} file</div>
                                    </div>
                                    <a href={form.fileUrl} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">⬇️</a>
                                    <button className="btn btn-danger btn-sm" onClick={() => setForm(f => ({ ...f, fileUrl: '' }))}>🗑</button>
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '24px 20px', border: '2px dashed var(--border)', borderRadius: 8, color: 'var(--text-muted)' }}>
                                    <div style={{ fontSize: 32, marginBottom: 8 }}>📎</div>
                                    <div style={{ fontSize: 13, marginBottom: 12 }}>Chưa có file hợp đồng</div>
                                    <button className="btn btn-primary btn-sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                                        {uploading ? '⏳ Đang upload...' : '📤 Upload (DOC, PDF)'}
                                    </button>
                                </div>
                            )}
                            {form.fileUrl && (
                                <button className="btn btn-secondary btn-sm" style={{ marginTop: 10 }} onClick={() => fileRef.current?.click()} disabled={uploading}>
                                    {uploading ? '⏳...' : '🔄 Thay file khác'}
                                </button>
                            )}
                            <input ref={fileRef} type="file" accept=".doc,.docx,.pdf,.xls,.xlsx" style={{ display: 'none' }} onChange={uploadFile} />
                        </div>
                    </div>

                    {/* Lịch thanh toán */}
                    <div className="card">
                        <div className="card-header" style={{ flexWrap: 'wrap', gap: 8 }}>
                            <h3>💰 Lịch thanh toán</h3>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                {!editingPayments ? (
                                    <button className="btn btn-secondary btn-sm" onClick={startEditPayments}>✏️ Sửa đợt TT</button>
                                ) : (
                                    <>
                                        <button className="btn btn-ghost btn-sm" onClick={loadTemplate} title="Load mẫu">📋</button>
                                        <button className="btn btn-ghost btn-sm" onClick={addPhase}>➕</button>
                                        <button className="btn btn-ghost btn-sm" onClick={() => setEditingPayments(false)}>✕</button>
                                        <button className="btn btn-primary btn-sm" onClick={savePayments} disabled={savingPayments}>
                                            {savingPayments ? '⏳' : '💾 Lưu'}
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="card-body" style={{ padding: 0 }}>
                            {editingPayments ? (
                                paymentPhases.length === 0 ? (
                                    <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
                                        Bấm <strong>📋</strong> để load mẫu hoặc <strong>➕</strong> thêm đợt.
                                    </div>
                                ) : (
                                    <div style={{ overflowX: 'auto' }}>
                                        <table className="data-table" style={{ margin: 0, minWidth: 400 }}>
                                            <thead><tr>
                                                <th style={{ width: 30 }}>#</th>
                                                <th>Giai đoạn</th>
                                                <th style={{ width: 70, textAlign: 'center' }}>%</th>
                                                <th style={{ width: 140, textAlign: 'right' }}>Số tiền</th>
                                                <th style={{ width: 36 }}></th>
                                            </tr></thead>
                                            <tbody>
                                                {paymentPhases.map((p, idx) => (
                                                    <tr key={idx}>
                                                        <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--text-muted)' }}>{idx + 1}</td>
                                                        <td><input className="form-input form-input-compact" value={p.phase} onChange={e => updatePhase(idx, 'phase', e.target.value)} style={{ width: '100%' }} /></td>
                                                        <td>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                                <input className="form-input form-input-compact" type="number" value={p.pct || ''} onChange={e => updatePhase(idx, 'pct', parseFloat(e.target.value) || 0)} style={{ width: 48, textAlign: 'center' }} />
                                                                <span style={{ fontSize: 11 }}>%</span>
                                                            </div>
                                                        </td>
                                                        <td><input className="form-input form-input-compact" type="number" value={p.amount || ''} onChange={e => updatePhase(idx, 'amount', parseFloat(e.target.value) || 0)} style={{ width: '100%', textAlign: 'right' }} /></td>
                                                        <td><button className="btn btn-ghost" onClick={() => removePhase(idx)} style={{ padding: '2px 6px', fontSize: 11, color: 'var(--status-danger)' }}>✕</button></td>
                                                    </tr>
                                                ))}
                                                <tr style={{ background: 'var(--bg-hover)', fontWeight: 700 }}>
                                                    <td></td><td>Tổng cộng</td>
                                                    <td style={{ textAlign: 'center', color: totalPhasePct === 100 ? 'var(--status-success)' : 'var(--status-danger)' }}>{totalPhasePct}%</td>
                                                    <td style={{ textAlign: 'right', color: 'var(--primary)' }}>{fmt(totalPhaseAmount)}</td>
                                                    <td></td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                )
                            ) : (
                                data.payments?.length > 0 ? (
                                    <>
                                        {/* Desktop table */}
                                        <div className="desktop-table-view">
                                            <table className="data-table" style={{ margin: 0 }}>
                                                <thead><tr>
                                                    <th>Đợt thanh toán</th>
                                                    <th style={{ width: 50 }}>%</th>
                                                    <th>Giá trị</th>
                                                    <th>Đã thu</th>
                                                    <th>Tiến độ</th>
                                                    <th>Trạng thái</th>
                                                </tr></thead>
                                                <tbody>
                                                    {data.payments.map(p => {
                                                        const cv = parseFloat(form.contractValue) || 0;
                                                        const phasePct = cv > 0 ? Math.round((p.amount || 0) / cv * 100) : 0;
                                                        const paidPct = p.amount > 0 ? Math.round((p.paidAmount || 0) / p.amount * 100) : 0;
                                                        return (
                                                            <tr key={p.id}>
                                                                <td style={{ fontWeight: 600 }}>{p.phase}</td>
                                                                <td style={{ textAlign: 'center' }}>{phasePct}%</td>
                                                                <td className="amount">{fmt(p.amount)}</td>
                                                                <td style={{ color: 'var(--status-success)', fontWeight: 600 }}>{fmt(p.paidAmount)}</td>
                                                                <td>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                        <div className="progress-bar" style={{ flex: 1, minWidth: 60 }}><div className="progress-fill" style={{ width: `${paidPct}%` }} /></div>
                                                                        <span style={{ fontSize: 11 }}>{paidPct}%</span>
                                                                    </div>
                                                                </td>
                                                                <td>
                                                                    <span className={`badge ${p.status === 'Đã thu' ? 'success' : p.status === 'Thu một phần' ? 'warning' : 'muted'}`}>{p.status}</span>
                                                                    {p.proofUrl && <a href={p.proofUrl} target="_blank" rel="noreferrer" style={{ marginLeft: 4 }}>📸</a>}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                        {/* Mobile payment cards */}
                                        <div className="mobile-card-list" style={{ padding: '8px 12px', gap: 8 }}>
                                            {data.payments.map((p, idx) => {
                                                const cv = parseFloat(form.contractValue) || 0;
                                                const phasePct = cv > 0 ? Math.round((p.amount || 0) / cv * 100) : 0;
                                                const paidPct = p.amount > 0 ? Math.round((p.paidAmount || 0) / p.amount * 100) : 0;
                                                return (
                                                    <div key={p.id} style={{ padding: '10px 12px', background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 8 }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                                            <span style={{ fontWeight: 600, fontSize: 13 }}>Đợt {idx + 1}: {p.phase}</span>
                                                            <span className={`badge ${p.status === 'Đã thu' ? 'success' : p.status === 'Thu một phần' ? 'warning' : 'muted'}`} style={{ fontSize: 11 }}>{p.status}</span>
                                                        </div>
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 6 }}>
                                                            <div>
                                                                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Giá trị ({phasePct}%)</div>
                                                                <div style={{ fontSize: 12, fontWeight: 600 }}>{fmt(p.amount)}</div>
                                                            </div>
                                                            <div style={{ textAlign: 'right' }}>
                                                                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Đã thu</div>
                                                                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--status-success)' }}>{fmt(p.paidAmount)}</div>
                                                            </div>
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                            <div className="progress-bar" style={{ flex: 1, height: 5 }}><div className="progress-fill" style={{ width: `${paidPct}%` }} /></div>
                                                            <span style={{ fontSize: 11, fontWeight: 600 }}>{paidPct}%</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <div style={{ padding: '10px 16px', textAlign: 'center', borderTop: '1px solid var(--border)' }}>
                                            <a href="/finance?tab=receivables" style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)' }}>
                                                💰 Thu tiền → module Tài chính
                                            </a>
                                        </div>
                                    </>
                                ) : (
                                    <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
                                        Chưa có lịch thanh toán. Bấm <strong>"✏️ Sửa đợt TT"</strong> để tạo.
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                </div>

                {/* RIGHT sidebar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div className="card">
                        <div className="card-header"><h3>📊 Tóm tắt</h3></div>
                        <div className="card-body">
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {[
                                    ['Khách hàng', data.customer?.name],
                                    ['Dự án', data.project?.name],
                                    ['Loại HĐ', form.type],
                                    ['Báo giá liên kết', data.quotation?.code || '—'],
                                ].map(([label, val]) => (
                                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 13 }}>
                                        <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                                        <span style={{ fontWeight: 600, textAlign: 'right' }}>{val}</span>
                                    </div>
                                ))}
                                <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '4px 0' }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Giá trị HĐ</span>
                                    <span style={{ fontWeight: 700 }}>{fmt(form.contractValue)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Phát sinh</span>
                                    <span style={{ fontWeight: 600, color: 'var(--status-warning)' }}>+{fmt(form.variationAmount)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 800, color: 'var(--accent-primary)', borderTop: '2px solid var(--accent-primary)', paddingTop: 8 }}>
                                    <span>Tổng giá trị</span>
                                    <span>{fmt(totalValue)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Đã thu</span>
                                    <span style={{ fontWeight: 600, color: 'var(--status-success)' }}>{fmt(data.paidAmount)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Còn lại</span>
                                    <span style={{ fontWeight: 700, color: 'var(--status-danger)' }}>{fmt(totalValue - (data.paidAmount || 0))}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-header"><h3>📈 Tiến độ thu tiền</h3></div>
                        <div className="card-body">
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                                <span>Đã thu</span><span style={{ fontWeight: 700 }}>{paidPct}%</span>
                            </div>
                            <div className="progress-bar" style={{ height: 10 }}>
                                <div className="progress-fill" style={{ width: `${paidPct}%` }} />
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                                {data.payments?.filter(p => p.status === 'Đã thu').length || 0} / {data.payments?.length || 0} đợt đã thanh toán
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
