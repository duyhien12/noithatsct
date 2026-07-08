'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/fetchClient';
import { useToast } from '@/components/ui/Toast';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Pagination from '@/components/ui/Pagination';
import StatusBadge from '@/components/ui/StatusBadge';
import { useRole } from '@/contexts/RoleContext';
import { STATUSES, STATUS_COLORS, canEditDraft } from '@/lib/designOrderStatus';

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';

const PROJECT_TYPES = ['Nhà phố', 'Biệt thự', 'Chung cư', 'Văn phòng', 'Showroom', 'Homestay', 'Khác'];

export default function DesignOrdersPage() {
    const { role } = useRole();
    const router = useRouter();
    const toast = useToast();

    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState(null);
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [projectType, setProjectType] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [deleteTarget, setDeleteTarget] = useState(null);

    const canCreate = role === 'kinh_doanh' || ['ban_gd', 'giam_doc', 'pho_gd', 'admin'].includes(role);
    const canManagePriceList = ['ban_gd', 'giam_doc', 'pho_gd', 'admin'].includes(role);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page, limit: 20 });
            if (search.trim()) params.set('search', search.trim());
            if (status) params.set('status', status);
            if (projectType) params.set('projectType', projectType);
            if (fromDate) params.set('fromDate', fromDate);
            if (toDate) params.set('toDate', toDate);
            const d = await apiFetch(`/api/design-orders?${params}`);
            setOrders(d.data || []);
            setPagination(d.pagination || null);
        } catch (e) {
            toast.error(e.message);
        }
        setLoading(false);
    }, [page, search, status, projectType, fromDate, toDate]);

    useEffect(() => { fetchData(); }, [fetchData]);
    useEffect(() => { setPage(1); }, [search, status, projectType, fromDate, toDate]);

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await apiFetch(`/api/design-orders/${deleteTarget.id}`, { method: 'DELETE' });
            toast.success(`Đã xóa phiếu ${deleteTarget.code}`);
            fetchData();
        } catch (e) {
            toast.error(e.message);
        }
        setDeleteTarget(null);
    };

    return (
        <div>
            <div className="card">
                <div className="card-header">
                    <h3>Phiếu đặt hàng thiết kế nội thất</h3>
                    <div style={{ display: 'flex', gap: 8 }}>
                        {canManagePriceList && (
                            <button className="btn btn-ghost" onClick={() => router.push('/design-orders/settings/price-list')}>⚙️ Bảng đơn giá</button>
                        )}
                        {canCreate && (
                            <button className="btn btn-primary" onClick={() => router.push('/design-orders/new')}>+ Tạo phiếu mới</button>
                        )}
                    </div>
                </div>

                <div className="filter-bar">
                    <input type="text" className="form-input" placeholder="🔍 Tìm mã phiếu, khách hàng, địa chỉ..."
                        value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 0 }} />
                    <select className="form-select" value={status} onChange={e => setStatus(e.target.value)}>
                        <option value="">Tất cả trạng thái</option>
                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select className="form-select" value={projectType} onChange={e => setProjectType(e.target.value)}>
                        <option value="">Tất cả loại công trình</option>
                        {PROJECT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <input type="date" className="form-input" value={fromDate} onChange={e => setFromDate(e.target.value)} style={{ maxWidth: 160 }} />
                    <input type="date" className="form-input" value={toDate} onChange={e => setToDate(e.target.value)} style={{ maxWidth: 160 }} />
                </div>

                {loading ? (
                    <div style={{ padding: 40, textAlign: 'center' }}>Đang tải...</div>
                ) : orders.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có phiếu đặt hàng thiết kế nào</div>
                ) : (
                    <>
                        <div className="desktop-table-view">
                            <div className="table-container">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Mã phiếu</th><th>Ngày tạo</th><th>Khách hàng</th><th>Công trình</th>
                                            <th>Người tạo</th><th>NV thiết kế</th><th>Tổng tiền</th><th>Deadline</th>
                                            <th>Trạng thái</th><th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {orders.map(o => (
                                            <tr key={o.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/design-orders/${o.id}`)}>
                                                <td className="accent">{o.code}</td>
                                                <td>{fmtDate(o.createdAt)}</td>
                                                <td>{o.customerName || o.customer?.name}</td>
                                                <td>{o.project?.name || o.siteAddress}</td>
                                                <td>{o.createdBy}</td>
                                                <td>{o.designerAssignee || <span style={{ color: 'var(--text-muted)' }}>Chưa phân công</span>}</td>
                                                <td className="amount">{fmt(o.grandTotal)}</td>
                                                <td>{fmtDate(o.deadline)}</td>
                                                <td><StatusBadge status={o.status} colorMap={STATUS_COLORS} /></td>
                                                <td onClick={e => e.stopPropagation()}>
                                                    <div style={{ display: 'flex', gap: 6 }}>
                                                        <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => router.push(`/design-orders/${o.id}`)}>Xem</button>
                                                        {canEditDraft(role, o.status) && (
                                                            <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => router.push(`/design-orders/${o.id}/edit`)}>Sửa</button>
                                                        )}
                                                        {o.status === 'Nháp' && canCreate && (
                                                            <button className="btn btn-danger" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => setDeleteTarget(o)}>Xóa</button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="mobile-card-list">
                            {orders.map(o => (
                                <div key={o.id} className="mobile-card-item" onClick={() => router.push(`/design-orders/${o.id}`)}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                        <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                                            <div className="card-title">{o.code}</div>
                                            <div className="card-subtitle" style={{ marginTop: 2 }}>{o.customerName || o.customer?.name}</div>
                                        </div>
                                        <StatusBadge status={o.status} colorMap={STATUS_COLORS} />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                        <div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Tổng tiền</div>
                                            <div style={{ fontSize: 13, fontWeight: 700 }}>{fmt(o.grandTotal)}</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Deadline</div>
                                            <div style={{ fontSize: 13, fontWeight: 700 }}>{fmtDate(o.deadline)}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div style={{ padding: '0 16px' }}>
                            <Pagination pagination={pagination} onPageChange={setPage} />
                        </div>
                    </>
                )}
            </div>

            <ConfirmDialog
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
                title="Xóa phiếu đặt hàng thiết kế"
                message={`Xác nhận xóa phiếu ${deleteTarget?.code}? Thao tác này không thể hoàn tác.`}
            />
        </div>
    );
}
