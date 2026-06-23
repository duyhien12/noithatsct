'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { apiFetch } from '@/lib/fetchClient';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Pagination from '@/components/ui/Pagination';
import { QUOTATION_STATUSES, STATUS_BADGE, fmtCurrency } from '@/lib/quotation-constants';
import { useRole } from '@/contexts/RoleContext';

export default function QuotationsPage() {
    const { isKinhDoanh } = useRole();
    const [quotations, setQuotations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [attachModal, setAttachModal] = useState(null); // { id, code, attachments }
    const [uploadingFile, setUploadingFile] = useState(false);
    const fileInputRef = useRef(null);
    const router = useRouter();
    const toast = useToast();

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page, limit: 1000 });
            if (filterStatus) params.set('status', filterStatus);
            if (search.trim()) params.set('search', search.trim());
            const d = await apiFetch(`/api/quotations?${params}`);
            const data = d.data || [];
            setQuotations(isKinhDoanh ? data.filter(q => q.type === 'Báo giá nội thất') : data);
            setPagination(d.pagination || null);
        } catch (e) {
            toast.error(e.message);
        }
        setLoading(false);
    }, [page, filterStatus, search, isKinhDoanh]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Reset to page 1 when filters change
    useEffect(() => { setPage(1); }, [filterStatus, search]);

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await apiFetch(`/api/quotations/${deleteTarget}`, { method: 'DELETE' });
            toast.success('Đã xóa báo giá');
            fetchData();
        } catch (e) {
            toast.error(e.message);
        }
        setDeleteTarget(null);
    };

    const handleConfirmKH = async (q, e) => {
        e.stopPropagation();
        try {
            await apiFetch(`/api/quotations/${q.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'Xác nhận' }) });
            toast.success(`BG ${q.code} — KH đã xác nhận!`);
            fetchData();
        } catch (err) { toast.error(err.message); }
    };

    const handleCreateContract = (q, e) => {
        e.stopPropagation();
        router.push(`/contracts/create?quotationId=${q.id}&customerId=${q.customerId}&projectId=${q.projectId || ''}&type=${encodeURIComponent(q.type)}&value=${q.grandTotal}`);
    };

    const openAttachModal = async (q, e) => {
        e.stopPropagation();
        const data = await apiFetch(`/api/quotations/${q.id}`).catch(() => null);
        setAttachModal({ id: q.id, code: q.code, attachments: Array.isArray(data?.attachments) ? data.attachments : [] });
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !attachModal) return;
        setUploadingFile(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('type', 'documents');
            const res = await fetch('/api/upload', { method: 'POST', body: fd });
            if (!res.ok) throw new Error('Upload thất bại');
            const { url } = await res.json();
            const newAttachments = [...attachModal.attachments, { name: file.name, url, size: file.size, uploadedAt: new Date().toISOString() }];
            await apiFetch(`/api/quotations/${attachModal.id}`, { method: 'PATCH', body: JSON.stringify({ attachments: newAttachments }) });
            setAttachModal(m => ({ ...m, attachments: newAttachments }));
            toast.success(`Đã tải lên: ${file.name}`);
        } catch (err) { toast.error(err.message || 'Lỗi tải file'); }
        setUploadingFile(false);
        e.target.value = '';
    };

    const handleDeleteAttachment = async (idx) => {
        if (!attachModal) return;
        const newAttachments = attachModal.attachments.filter((_, i) => i !== idx);
        await apiFetch(`/api/quotations/${attachModal.id}`, { method: 'PATCH', body: JSON.stringify({ attachments: newAttachments }) });
        setAttachModal(m => ({ ...m, attachments: newAttachments }));
    };

    const fmtFileSize = (b) => !b ? '' : b < 1024 ? `${b}B` : b < 1048576 ? `${(b/1024).toFixed(1)}KB` : `${(b/1048576).toFixed(1)}MB`;

    // Stats from current page data (for display)
    const allOnPage = quotations;
    const totalCount = pagination?.total || allOnPage.length;
    const confirmedCount = allOnPage.filter(q => q.status === 'Xác nhận').length;
    const contractCount = allOnPage.filter(q => q.status === 'Hợp đồng').length;
    const contractValue = allOnPage.filter(q => q.status === 'Hợp đồng').reduce((s, q) => s + q.grandTotal, 0);

    return (
        <div>
            <div className="stats-grid">
                <div className="stat-card"><div className="stat-icon">📄</div><div><div className="stat-value">{totalCount}</div><div className="stat-label">Tổng BG</div></div></div>
                <div className="stat-card"><div className="stat-icon">🟡</div><div><div className="stat-value">{confirmedCount}</div><div className="stat-label">Chờ ký HĐ</div></div></div>
                <div className="stat-card"><div className="stat-icon">✅</div><div><div className="stat-value">{contractCount}</div><div className="stat-label">Đã ký HĐ</div></div></div>
                <div className="stat-card"><div className="stat-icon">💰</div><div><div className="stat-value">{fmtCurrency(contractValue)}</div><div className="stat-label">Giá trị HĐ</div></div></div>
            </div>

            <div className="card" style={{ marginTop: 24 }}>
                <div className="card-header">
                    <h3>Danh sách báo giá</h3>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-secondary" onClick={() => router.push('/quotations/templates')}>📋 Mẫu báo giá</button>
                        <button className="btn btn-secondary" onClick={() => router.push('/quotations/noi-that')} title="Nhập kiểu Excel cho Báo giá nội thất">🪑 BG Nội thất</button>
                        <button className="btn btn-primary" onClick={() => router.push('/quotations/create')}>+ Tạo báo giá mới</button>
                    </div>
                </div>
                <div className="filter-bar">
                    <input type="text" className="form-input" placeholder="🔍 Tìm mã BG, khách hàng..." value={search}
                        onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 0 }} />
                    <select className="form-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                        <option value="">Tất cả trạng thái</option>
                        {QUOTATION_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>

                {loading ? (
                    <div style={{ padding: 40, textAlign: 'center' }}>Đang tải...</div>
                ) : quotations.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Không có báo giá nào</div>
                ) : (
                    <>
                        {/* Desktop table */}
                        <div className="quotation-list-desktop">
                            <table className="data-table">
                                <thead><tr>
                                    <th>Mã BG</th><th>Khách hàng</th><th>Dự án</th><th>Loại</th>
                                    <th>Tổng tiền</th><th>CK</th><th>VAT</th><th>Thành tiền</th>
                                    <th>TT</th><th></th>
                                </tr></thead>
                                <tbody>{quotations.map(q => (
                                    <tr key={q.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/quotations/${q.id}/edit`)}>
                                        <td className="accent">{q.code}</td>
                                        <td className="primary">{q.customer?.name}</td>
                                        <td style={{ fontSize: 12 }}>{q.project?.name || '-'}</td>
                                        <td><span style={{ fontSize: 11, opacity: 0.7 }}>{q.type}</span></td>
                                        <td>{fmtCurrency(q.total)}</td>
                                        <td>{q.discount}%</td>
                                        <td>{q.vat}%</td>
                                        <td style={{ fontWeight: 700 }}>{fmtCurrency(q.grandTotal)}</td>
                                        <td><span className={`badge ${STATUS_BADGE[q.status] || 'muted'}`}>{q.status}</span></td>
                                        <td style={{ display: 'flex', gap: 4 }}>
                                            {!['Xác nhận', 'Hợp đồng', 'Từ chối'].includes(q.status) && (
                                                <button className="btn btn-sm" title="Khách hàng đã duyệt báo giá"
                                                    style={{ background: '#16a34a', color: '#fff', fontWeight: 600 }}
                                                    onClick={(e) => handleConfirmKH(q, e)}>
                                                    ✓ KH duyệt
                                                </button>
                                            )}
                                            {q.status === 'Xác nhận' && (
                                                <button className="btn btn-primary btn-sm" title="Tạo hợp đồng"
                                                    onClick={(e) => handleCreateContract(q, e)}>
                                                    📋 Tạo HĐ
                                                </button>
                                            )}
                                            <button className="btn btn-ghost" title="Xem PDF"
                                                onClick={(e) => { e.stopPropagation(); window.open(`/quotations/${q.id}/pdf`, '_blank'); }}>
                                                📄
                                            </button>
                                            <button className="btn btn-ghost" title="File đính kèm" onClick={(e) => openAttachModal(q, e)}>📎</button>
                                            <button className="btn btn-ghost" onClick={(e) => { e.stopPropagation(); router.push(`/quotations/${q.id}/edit`); }}>✏️</button>
                                            <button className="btn btn-ghost" onClick={(e) => { e.stopPropagation(); setDeleteTarget(q.id); }}>🗑️</button>
                                        </td>
                                    </tr>
                                ))}</tbody>
                            </table>
                        </div>

                        {/* Mobile card view */}
                        <div className="quotation-list-mobile">
                            {quotations.map(q => (
                                <div key={q.id} className="quotation-mobile-card" onClick={() => router.push(`/quotations/${q.id}/edit`)}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                        <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{q.code}</span>
                                        <span className={`badge ${STATUS_BADGE[q.status] || 'muted'}`}>{q.status}</span>
                                    </div>
                                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{q.customer?.name}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                                        {q.project?.name || '-'} &middot; {q.type}
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontWeight: 700, fontSize: 15 }}>{fmtCurrency(q.grandTotal)}</span>
                                        <div style={{ display: 'flex', gap: 4 }}>
                                            {!['Xác nhận', 'Hợp đồng', 'Từ chối'].includes(q.status) && (
                                                <button className="btn btn-sm" style={{ background: '#16a34a', color: '#fff', fontWeight: 600 }}
                                                    onClick={(e) => handleConfirmKH(q, e)}>✓ KH duyệt</button>
                                            )}
                                            {q.status === 'Xác nhận' && (
                                                <button className="btn btn-primary btn-sm" onClick={(e) => handleCreateContract(q, e)}>📋 Tạo HĐ</button>
                                            )}
                                            <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); window.open(`/quotations/${q.id}/pdf`, '_blank'); }}>📄</button>
                                            <button className="btn btn-ghost btn-sm" title="File đính kèm" onClick={(e) => openAttachModal(q, e)}>📎</button>
                                            <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); setDeleteTarget(q.id); }}>🗑️</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <Pagination pagination={pagination} onPageChange={setPage} />
                    </>
                )}
            </div>

            <div className="card" style={{ marginTop: 16, background: 'var(--surface-alt)', border: '1px dashed var(--border-color)' }}>
                <div className="card-body" style={{ padding: 12 }}>
                    <span style={{ fontSize: 12, opacity: 0.6 }}>
                        <strong>Phát sinh:</strong> Tạo báo giá mới {'>'} chọn loại <em>&quot;Phát sinh&quot;</em> {'>'} liên kết với dự án đang thi công.
                        Sau khi KH xác nhận sẽ xuất hiện nút <strong>&quot;Tạo HĐ phụ lục&quot;</strong>.
                    </span>
                </div>
            </div>

            <ConfirmDialog
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
                title="Xóa báo giá"
                message="Bạn có chắc muốn xóa báo giá này? Hành động không thể hoàn tác."
                confirmText="Xóa"
                variant="danger"
            />

            {/* Modal file đính kèm */}
            {attachModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                    <div style={{ background: '#fff', borderRadius: 10, width: '100%', maxWidth: 480, padding: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                            <h3 style={{ margin: 0, fontSize: 16 }}>📎 File đính kèm — {attachModal.code}</h3>
                            <button onClick={() => setAttachModal(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6b7280' }}>×</button>
                        </div>

                        <input ref={fileInputRef} type="file" style={{ display: 'none' }}
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                            onChange={handleFileUpload} />

                        <button className="btn btn-secondary" style={{ width: '100%', marginBottom: 14 }}
                            onClick={() => fileInputRef.current?.click()} disabled={uploadingFile}>
                            {uploadingFile ? '⏳ Đang tải lên...' : '+ Tải file lên'}
                        </button>
                        <p style={{ fontSize: 11, color: '#9ca3af', marginTop: -10, marginBottom: 14 }}>
                            Hỗ trợ: PDF, Word, Excel, ảnh JPG/PNG
                        </p>

                        {attachModal.attachments.length === 0 ? (
                            <p style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Chưa có file đính kèm</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {attachModal.attachments.map((f, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                                        <span style={{ fontSize: 20 }}>
                                            {/\.pdf$/i.test(f.name) ? '📄' : /\.(xls|xlsx)$/i.test(f.name) ? '📊' : /\.(doc|docx)$/i.test(f.name) ? '📝' : '🖼️'}
                                        </span>
                                        <a href={f.url} target="_blank" rel="noreferrer"
                                            style={{ flex: 1, fontSize: 13, color: 'var(--accent-primary)', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {f.name}
                                        </a>
                                        <span style={{ fontSize: 11, color: '#9ca3af', whiteSpace: 'nowrap' }}>{fmtFileSize(f.size)}</span>
                                        <button onClick={() => handleDeleteAttachment(i)}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', fontSize: 18, lineHeight: 1 }}
                                            onMouseEnter={e => e.target.style.color = '#ef4444'}
                                            onMouseLeave={e => e.target.style.color = '#d1d5db'}>✕</button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
