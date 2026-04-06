'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
const CONTRACTOR_TYPES = ['Thầu xây dựng', 'CTV thiết kế kiến trúc', 'CTV Kết cấu', 'CTV 3D', 'Thầu mộc', 'Thầu điện', 'Thầu nước', 'Thầu sơn', 'Thầu đá', 'Thầu cơ khí', 'Thầu nhôm kính', 'Thầu trần thạch cao', 'Khác'];
const STATUS_COLORS = { 'Chưa TT': 'warning', 'Đang TT': 'info', 'Hoàn thành': 'success', 'Tạm ứng': 'muted' };
const DOC_CATEGORIES = ['Hợp đồng', 'Phụ lục HĐ', 'Biên bản nghiệm thu', 'Hóa đơn', 'Biên bản', 'Chứng từ', 'Khác'];
const FILE_ICONS = { pdf: '📄', doc: '📝', docx: '📝', xls: '📊', xlsx: '📊', jpg: '🖼️', jpeg: '🖼️', png: '🖼️', zip: '📦', rar: '📦', default: '📎' };
const fileIcon = (name = '') => FILE_ICONS[name.split('.').pop()?.toLowerCase()] || FILE_ICONS.default;

const AGING_ORDER = ['0–30 ngày', '31–60 ngày', '61–90 ngày', '>90 ngày'];
const AGING_COLORS = ['var(--status-success)', 'var(--accent-primary)', 'var(--status-warning)', 'var(--status-danger)'];

function getAgingBucket(p) {
    const debt = (p.contractAmount || 0) - (p.paidAmount || 0);
    if (debt <= 0) return null;
    const ref = p.dueDate || p.createdAt;
    const days = Math.floor((Date.now() - new Date(ref).getTime()) / 86400000);
    if (days <= 30) return '0–30 ngày';
    if (days <= 60) return '31–60 ngày';
    if (days <= 90) return '61–90 ngày';
    return '>90 ngày';
}

export default function ContractorDetailPage() {
    const { id } = useParams();
    const router = useRouter();

    const [contractor, setContractor] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('info');
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({});
    const [saving, setSaving] = useState(false);
    const [expandedPay, setExpandedPay] = useState(null);

    const [docs, setDocs] = useState([]);
    const [docsLoading, setDocsLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [docName, setDocName] = useState('');
    const [docCategory, setDocCategory] = useState('Khác');
    const [docNotes, setDocNotes] = useState('');
    const fileInputRef = useRef();

    const fetchContractor = async () => {
        setLoading(true);
        const res = await fetch(`/api/contractors/${id}`);
        if (res.ok) {
            const data = await res.json();
            setContractor(data);
            setForm({
                name: data.name, type: data.type, phone: data.phone || '',
                address: data.address || '', taxCode: data.taxCode || '',
                bankAccount: data.bankAccount || '', bankName: data.bankName || '',
                rating: data.rating, notes: data.notes || '',
                isBlacklisted: data.isBlacklisted, creditLimit: data.creditLimit || 0,
            });
        }
        setLoading(false);
    };

    const fetchDocs = async () => {
        setDocsLoading(true);
        const res = await fetch(`/api/contractors/${id}/documents`);
        if (res.ok) setDocs(await res.json());
        setDocsLoading(false);
    };

    useEffect(() => { fetchContractor(); }, [id]);
    useEffect(() => { if (tab === 'docs') fetchDocs(); }, [tab]);

    const handleSave = async () => {
        setSaving(true);
        await fetch(`/api/contractors/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
        setSaving(false);
        setEditing(false);
        fetchContractor();
    };

    const handleUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!docName.trim()) { alert('Nhập tên tài liệu!'); return; }
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('type', 'documents');
            const upRes = await fetch('/api/upload', { method: 'POST', body: fd });
            if (!upRes.ok) { alert('Upload thất bại'); return; }
            const { url } = await upRes.json();
            await fetch(`/api/contractors/${id}/documents`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: docName.trim(), fileName: file.name, category: docCategory, fileSize: file.size, fileUrl: url, mimeType: file.type, notes: docNotes }),
            });
            setDocName(''); setDocNotes(''); setDocCategory('Khác');
            fileInputRef.current.value = '';
            fetchDocs();
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteDoc = async (docId) => {
        if (!confirm('Xóa tài liệu này?')) return;
        await fetch(`/api/partner-documents/${docId}`, { method: 'DELETE' });
        setDocs(prev => prev.filter(d => d.id !== docId));
    };

    // Build ledger from payments
    const buildLedger = () => {
        if (!contractor?.payments?.length) return { rows: [], totalContract: 0, totalPaid: 0, totalDebt: 0, aging: {} };
        const rows = [];
        let balance = 0;
        for (const p of contractor.payments) {
            balance += p.contractAmount || 0;
            rows.push({
                date: p.createdAt, desc: `HĐ — ${p.project?.name || 'Không rõ DA'}`,
                subDesc: p.description, debit: p.contractAmount || 0, credit: 0, balance, status: p.status,
            });
            if ((p.paidAmount || 0) > 0) {
                balance -= p.paidAmount;
                rows.push({ date: p.updatedAt, desc: `Thanh toán — ${p.project?.name || 'Không rõ DA'}`, subDesc: '', debit: 0, credit: p.paidAmount, balance, status: null });
            }
        }
        const totalContract = contractor.payments.reduce((s, p) => s + (p.contractAmount || 0), 0);
        const totalPaid = contractor.payments.reduce((s, p) => s + (p.paidAmount || 0), 0);
        const aging = {};
        for (const p of contractor.payments) {
            const bucket = getAgingBucket(p);
            if (bucket) aging[bucket] = (aging[bucket] || 0) + (p.contractAmount || 0) - (p.paidAmount || 0);
        }
        return { rows, totalContract, totalPaid, totalDebt: totalContract - totalPaid, aging };
    };

    const getProjects = () => {
        if (!contractor?.payments?.length) return [];
        const map = {};
        for (const p of contractor.payments) {
            if (p.project && !map[p.project.id]) map[p.project.id] = p.project;
        }
        return Object.values(map);
    };

    if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Đang tải...</div>;
    if (!contractor) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--status-danger)' }}>Không tìm thấy thầu phụ</div>;

    const { rows: ledgerRows, totalContract, totalPaid, totalDebt, aging } = buildLedger();
    const projects = getProjects();

    const iS = { padding: '6px 10px', fontSize: 13, border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg-primary)', color: 'var(--text-primary)', width: '100%' };

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 24 }}>
                <button className="btn btn-ghost" onClick={() => router.push('/partners')} style={{ marginTop: 4 }}>← Quay lại</button>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{contractor.name}</h1>
                        <span className="badge muted">{contractor.code}</span>
                        <span className="badge warning">{contractor.type}</span>
                        {contractor.isBlacklisted && <span style={{ background: '#1f2937', color: '#fff', fontSize: 12, padding: '2px 8px', borderRadius: 12, fontWeight: 600 }}>🚫 Danh sách đen</span>}
                        <span>{'⭐'.repeat(contractor.rating)}</span>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Tổng hợp đồng</div>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{fmt(totalContract)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Đã thanh toán</div>
                        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--status-success)' }}>{fmt(totalPaid)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Còn nợ</div>
                        <div style={{ fontWeight: 700, fontSize: 15, color: totalDebt > 0 ? 'var(--status-danger)' : 'var(--text-muted)' }}>{fmt(totalDebt)}</div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="card">
                <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid var(--border)', paddingLeft: 16 }}>
                    {[
                        { key: 'info', label: '📋 Thông tin' },
                        { key: 'ledger', label: '📒 Sổ công nợ' },
                        { key: 'projects', label: '🏗️ Dự án tham gia' },
                        { key: 'docs', label: '📁 Tài liệu' },
                    ].map(t => (
                        <button key={t.key} onClick={() => setTab(t.key)}
                            style={{ padding: '10px 18px', fontWeight: 600, fontSize: 13, cursor: 'pointer', border: 'none', borderBottom: tab === t.key ? '3px solid var(--accent-primary)' : '3px solid transparent', background: 'none', color: tab === t.key ? 'var(--accent-primary)' : 'var(--text-muted)', transition: '0.2s' }}>
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Tab: Thông tin */}
                {tab === 'info' && (
                    <div style={{ padding: 24 }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                            {editing ? (
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button className="btn btn-ghost" onClick={() => setEditing(false)}>Hủy</button>
                                    <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Đang lưu...' : '💾 Lưu'}</button>
                                </div>
                            ) : (
                                <button className="btn btn-ghost" onClick={() => setEditing(true)}>✏️ Sửa</button>
                            )}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
                            {[
                                { label: 'Tên thầu phụ', key: 'name', type: 'text' },
                                { label: 'Loại', key: 'type', type: 'select', opts: CONTRACTOR_TYPES },
                                { label: 'SĐT', key: 'phone', type: 'text' },
                                { label: 'Địa chỉ', key: 'address', type: 'text' },
                                { label: 'Mã số thuế', key: 'taxCode', type: 'text' },
                                { label: 'STK ngân hàng', key: 'bankAccount', type: 'text' },
                                { label: 'Ngân hàng', key: 'bankName', type: 'text' },
                            ].map(({ label, key, type, opts }) => (
                                <div key={key}>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                                    {editing ? (
                                        type === 'select'
                                            ? <select style={iS} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })}>{opts.map(o => <option key={o}>{o}</option>)}</select>
                                            : <input style={iS} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} />
                                    ) : (
                                        <div style={{ fontSize: 14, fontWeight: 500, color: form[key] ? 'var(--text-primary)' : 'var(--text-muted)' }}>{form[key] || '—'}</div>
                                    )}
                                </div>
                            ))}
                            <div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Đánh giá</div>
                                {editing ? (
                                    <select style={iS} value={form.rating} onChange={e => setForm({ ...form, rating: Number(e.target.value) })}>
                                        {[1,2,3,4,5].map(n => <option key={n} value={n}>{'⭐'.repeat(n)} ({n} sao)</option>)}
                                    </select>
                                ) : <div style={{ fontSize: 16 }}>{'⭐'.repeat(form.rating)}</div>}
                            </div>
                            <div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hạn mức tín dụng</div>
                                {editing ? (
                                    <input style={iS} type="number" min="0" value={form.creditLimit} onChange={e => setForm({ ...form, creditLimit: Number(e.target.value) })} />
                                ) : <div style={{ fontSize: 14, fontWeight: 500 }}>{form.creditLimit > 0 ? fmt(form.creditLimit) : '—'}</div>}
                            </div>
                            <div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Trạng thái</div>
                                {editing ? (
                                    <button style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid var(--border)', cursor: 'pointer', background: form.isBlacklisted ? '#1f2937' : 'var(--bg-secondary)', color: form.isBlacklisted ? '#fff' : 'var(--text-primary)', fontWeight: 600, fontSize: 13 }}
                                        onClick={() => setForm({ ...form, isBlacklisted: !form.isBlacklisted })}>
                                        {form.isBlacklisted ? '🚫 Đang trong danh sách đen — nhấn để bỏ' : '✅ Hoạt động — nhấn để thêm vào danh sách đen'}
                                    </button>
                                ) : (
                                    <span style={{ background: form.isBlacklisted ? '#1f2937' : 'rgba(16,185,129,0.1)', color: form.isBlacklisted ? '#fff' : 'var(--status-success)', padding: '3px 10px', borderRadius: 12, fontSize: 13, fontWeight: 600 }}>
                                        {form.isBlacklisted ? '🚫 Danh sách đen' : '✅ Hoạt động'}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div style={{ marginTop: 20 }}>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ghi chú</div>
                            {editing ? (
                                <textarea style={{ ...iS, resize: 'vertical' }} rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                            ) : <div style={{ fontSize: 14, color: form.notes ? 'var(--text-primary)' : 'var(--text-muted)', whiteSpace: 'pre-wrap' }}>{form.notes || '—'}</div>}
                        </div>
                    </div>
                )}

                {/* Tab: Sổ công nợ */}
                {tab === 'ledger' && (
                    <div>
                        {Object.keys(aging).length > 0 && (
                            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
                                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Phân kỳ tồn nợ:</span>
                                {AGING_ORDER.filter(b => aging[b]).map(b => (
                                    <div key={b} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{b}</div>
                                        <div style={{ fontWeight: 700, fontSize: 13, color: AGING_COLORS[AGING_ORDER.indexOf(b)] }}>{fmt(aging[b])}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div style={{ overflowX: 'auto' }}>
                            {!contractor?.payments?.length ? (
                                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có giao dịch nào</div>
                            ) : (
                                <table className="data-table" style={{ margin: 0 }}>
                                    <thead><tr>
                                        <th style={{ width: 30 }}></th>
                                        <th>Dự án</th><th>Mô tả HĐ</th><th>Trạng thái</th>
                                        <th style={{ textAlign: 'right' }}>Giá trị HĐ</th>
                                        <th style={{ textAlign: 'right' }}>Đã TT</th>
                                        <th style={{ textAlign: 'right' }}>Còn nợ</th>
                                    </tr></thead>
                                    <tbody>
                                        {contractor.payments.map((p) => {
                                            const isExp = expandedPay === p.id;
                                            const debt = (p.contractAmount || 0) - (p.paidAmount || 0);
                                            return (<>
                                                <tr key={p.id} style={{ cursor: p.items?.length ? 'pointer' : 'default' }} onClick={() => p.items?.length && setExpandedPay(isExp ? null : p.id)}>
                                                    <td style={{ textAlign: 'center', fontSize: 12 }}>{p.items?.length ? (isExp ? '▼' : '▶') : ''}</td>
                                                    <td style={{ fontSize: 12 }}><span className="accent">{p.project?.code}</span> {p.project?.name}</td>
                                                    <td style={{ fontSize: 13 }}>
                                                        <div>{p.description || '—'}</div>
                                                        {p.items?.length > 0 && <div style={{ fontSize: 11, color: 'var(--accent-primary)' }}>{p.items.length} hạng mục NT</div>}
                                                    </td>
                                                    <td><span className={`badge ${STATUS_COLORS[p.status] || 'muted'}`}>{p.status}</span></td>
                                                    <td style={{ textAlign: 'right', fontSize: 12 }}>{fmt(p.contractAmount)}</td>
                                                    <td style={{ textAlign: 'right', fontSize: 12, color: 'var(--status-success)' }}>{fmt(p.paidAmount)}</td>
                                                    <td style={{ textAlign: 'right', fontSize: 12, fontWeight: 600, color: debt > 0 ? 'var(--status-danger)' : 'var(--text-muted)' }}>{fmt(debt)}</td>
                                                </tr>
                                                {isExp && p.items?.map(it => (
                                                    <tr key={it.id} style={{ background: 'rgba(59,130,246,0.04)' }}>
                                                        <td></td>
                                                        <td colSpan={2} style={{ fontSize: 12, paddingLeft: 24, color: 'var(--text-muted)' }}>↳ {it.description}</td>
                                                        <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Intl.NumberFormat('vi-VN').format(it.quantity)} {it.unit} × {new Intl.NumberFormat('vi-VN').format(it.unitPrice)}</td>
                                                        <td style={{ textAlign: 'right', fontSize: 12 }}>{fmt(it.amount)}</td>
                                                        <td colSpan={2}></td>
                                                    </tr>
                                                ))}
                                            </>);
                                        })}
                                        <tr style={{ background: 'var(--bg-secondary)', fontWeight: 700 }}>
                                            <td colSpan={4} style={{ textAlign: 'right', fontSize: 13 }}>Tổng</td>
                                            <td style={{ textAlign: 'right', fontSize: 13, color: 'var(--status-danger)' }}>{fmt(totalContract)}</td>
                                            <td style={{ textAlign: 'right', fontSize: 13, color: 'var(--status-success)' }}>{fmt(totalPaid)}</td>
                                            <td style={{ textAlign: 'right', fontSize: 13, color: totalDebt > 0 ? 'var(--status-danger)' : 'var(--text-muted)' }}>{fmt(totalDebt)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                )}

                {/* Tab: Dự án tham gia */}
                {tab === 'projects' && (
                    <div style={{ overflowX: 'auto' }}>
                        {projects.length === 0 ? (
                            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Chưa tham gia dự án nào</div>
                        ) : (
                            <table className="data-table" style={{ margin: 0 }}>
                                <thead><tr><th>Mã DA</th><th>Tên dự án</th><th>Trạng thái</th><th></th></tr></thead>
                                <tbody>{projects.map(p => (
                                    <tr key={p.id}>
                                        <td className="accent">{p.code}</td>
                                        <td className="primary">{p.name}</td>
                                        <td><span className="badge info">{p.status}</span></td>
                                        <td><button className="btn btn-ghost btn-sm" onClick={() => router.push(`/projects/${p.id}`)}>Xem →</button></td>
                                    </tr>
                                ))}</tbody>
                            </table>
                        )}
                    </div>
                )}

                {/* Tab: Tài liệu */}
                {tab === 'docs' && (
                    <div style={{ padding: 20 }}>
                        <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: 16, marginBottom: 20, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                            <div style={{ flex: '1 1 200px' }}>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>TÊN TÀI LIỆU</div>
                                <input style={iS} placeholder="Nhập tên tài liệu..." value={docName} onChange={e => setDocName(e.target.value)} />
                            </div>
                            <div style={{ flex: '0 1 180px' }}>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>DANH MỤC</div>
                                <select style={iS} value={docCategory} onChange={e => setDocCategory(e.target.value)}>
                                    {DOC_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                                </select>
                            </div>
                            <div style={{ flex: '1 1 160px' }}>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>GHI CHÚ</div>
                                <input style={iS} placeholder="Ghi chú (tuỳ chọn)" value={docNotes} onChange={e => setDocNotes(e.target.value)} />
                            </div>
                            <div>
                                <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleUpload}
                                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.zip,.rar,.dwg,.dxf" />
                                <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()} disabled={uploading || !docName.trim()}>
                                    {uploading ? 'Đang tải...' : '📎 Chọn file & Upload'}
                                </button>
                            </div>
                        </div>
                        {docsLoading ? (
                            <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>Đang tải...</div>
                        ) : docs.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                                <div style={{ fontSize: 36, marginBottom: 8 }}>📁</div>
                                <div>Chưa có tài liệu nào. Upload file đầu tiên!</div>
                            </div>
                        ) : (
                            <table className="data-table" style={{ margin: 0 }}>
                                <thead><tr>
                                    <th>Tên tài liệu</th><th>Danh mục</th><th>Kích thước</th><th>Ngày tải</th><th>Ghi chú</th><th></th>
                                </tr></thead>
                                <tbody>
                                    {docs.map(doc => (
                                        <tr key={doc.id}>
                                            <td>
                                                <a href={doc.fileUrl} target="_blank" rel="noreferrer"
                                                    style={{ color: 'var(--accent-primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                                                    <span>{fileIcon(doc.fileName)}</span><span>{doc.name}</span>
                                                </a>
                                                {doc.fileName !== doc.name && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{doc.fileName}</div>}
                                            </td>
                                            <td><span className="badge muted" style={{ fontSize: 11 }}>{doc.category}</span></td>
                                            <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{doc.fileSize > 0 ? (doc.fileSize > 1048576 ? `${(doc.fileSize / 1048576).toFixed(1)} MB` : `${Math.round(doc.fileSize / 1024)} KB`) : '—'}</td>
                                            <td style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{fmtDate(doc.createdAt)}</td>
                                            <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{doc.notes || '—'}</td>
                                            <td><button className="btn btn-ghost btn-sm" style={{ color: 'var(--status-danger)' }} onClick={() => handleDeleteDoc(doc.id)}>Xóa</button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
