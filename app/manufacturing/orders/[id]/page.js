'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Plus, AlertTriangle, Loader2, History } from 'lucide-react';
import { useRole } from '@/contexts/RoleContext';
import { getMfgPermissions } from '@/lib/manufacturing/permissions';
import { ORDER_STATUS_LABELS, ITEM_STATUS_LABELS, PRIORITY_LABELS } from '@/lib/manufacturing/constants';
import { useToast } from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';
import ItemDetailDrawer from '@/components/manufacturing/ItemDetailDrawer';
import OrderMaterialsTab from '@/components/manufacturing/OrderMaterialsTab';
import OrderQualityTab from '@/components/manufacturing/OrderQualityTab';
import OrderPackingTab from '@/components/manufacturing/OrderPackingTab';
import OrderDeliveryTab from '@/components/manufacturing/OrderDeliveryTab';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
const fmtDateTime = (d) => d ? new Date(d).toLocaleString('vi-VN') : '—';

const ACTIONS_BY_STATUS = {
    DRAFT: [{ action: 'submit', label: 'Nộp duyệt', perm: 'update', variant: 'primary' }],
    WAITING_DOCUMENTS: [{ action: 'submit', label: 'Nộp duyệt', perm: 'update', variant: 'primary' }],
    WAITING_APPROVAL: [
        { action: 'approve', label: 'Duyệt lệnh', perm: 'approve', variant: 'primary' },
        { action: 'reject', label: 'Từ chối', perm: 'approve', variant: 'secondary' },
    ],
    WAITING_MATERIALS: [{ action: 'start', label: 'Bắt đầu sản xuất', perm: 'start', variant: 'primary' }],
    READY: [{ action: 'start', label: 'Bắt đầu sản xuất', perm: 'start', variant: 'primary' }],
    IN_PRODUCTION: [
        { action: 'pause', label: 'Tạm dừng', perm: 'update', variant: 'secondary' },
        { action: 'complete_factory', label: 'Hoàn thành tại xưởng', perm: 'qc', variant: 'primary' },
    ],
    WAITING_QC: [{ action: 'complete_factory', label: 'Hoàn thành tại xưởng', perm: 'qc', variant: 'primary' }],
    REWORK: [{ action: 'complete_factory', label: 'Hoàn thành tại xưởng', perm: 'qc', variant: 'primary' }],
    PAUSED: [{ action: 'resume', label: 'Tiếp tục sản xuất', perm: 'start', variant: 'primary' }],
    COMPLETED_AT_FACTORY: [{ action: 'complete', label: 'Hoàn thành lệnh', perm: 'complete', variant: 'primary' }],
    PACKED: [{ action: 'complete', label: 'Hoàn thành lệnh', perm: 'complete', variant: 'primary' }],
    DELIVERED: [{ action: 'complete', label: 'Hoàn thành lệnh', perm: 'complete', variant: 'primary' }],
    INSTALLING: [{ action: 'complete', label: 'Hoàn thành lệnh', perm: 'complete', variant: 'primary' }],
};

const CANCELLABLE = ['DRAFT', 'WAITING_DOCUMENTS', 'WAITING_APPROVAL', 'WAITING_MATERIALS', 'READY', 'IN_PRODUCTION', 'WAITING_QC', 'REWORK', 'PAUSED'];

const SUB_TABS = [
    { key: 'overview', label: 'Tổng quan' },
    { key: 'items', label: 'Sản phẩm' },
    { key: 'materials', label: 'Vật tư' },
    { key: 'quality', label: 'QC & Lỗi' },
    { key: 'packing', label: 'Đóng gói' },
    { key: 'delivery', label: 'Vận chuyển' },
    { key: 'history', label: 'Lịch sử' },
];

export default function MfgOrderDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const toast = useToast();
    const { role, email, department } = useRole();
    const perms = getMfgPermissions({ role, email, department });

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [subTab, setSubTab] = useState('overview');
    const [busy, setBusy] = useState(false);
    const [showAddItem, setShowAddItem] = useState(false);
    const [showCancel, setShowCancel] = useState(false);
    const [cancelNote, setCancelNote] = useState('');
    const [activeItemId, setActiveItemId] = useState(null);
    const [stageTemplates, setStageTemplates] = useState([]);
    const [itemForm, setItemForm] = useState({ name: '', category: '', roomName: '', floorName: '', quantity: 1, unit: 'cái', note: '', stageTemplateIds: [] });
    const [savingItem, setSavingItem] = useState(false);

    const load = useCallback(() => {
        setLoading(true);
        fetch(`/api/manufacturing/orders/${id}`).then(r => r.ok ? r.json() : Promise.reject(r)).then(d => { setOrder(d); setLoading(false); }).catch(() => setLoading(false));
    }, [id]);

    useEffect(load, [load]);
    useEffect(() => { fetch('/api/manufacturing/stage-templates').then(r => r.json()).then(setStageTemplates).catch(() => {}); }, []);

    async function runAction(action, note) {
        setBusy(true);
        try {
            const res = await fetch(`/api/manufacturing/orders/${id}/actions`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, note }),
            });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error || 'Thao tác thất bại');
            toast.success('Đã cập nhật trạng thái lệnh sản xuất');
            load();
        } catch (e) {
            toast.error(e.message);
        } finally {
            setBusy(false);
        }
    }

    async function handleAddItem() {
        if (!itemForm.name.trim()) { toast.error('Nhập tên sản phẩm'); return; }
        setSavingItem(true);
        try {
            const res = await fetch('/api/manufacturing/items', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...itemForm, mfgOrderId: id, quantity: Number(itemForm.quantity) || 1 }),
            });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error || 'Lỗi tạo sản phẩm');
            toast.success(`Đã tạo sản phẩm ${d.code}`);
            setShowAddItem(false);
            setItemForm({ name: '', category: '', roomName: '', floorName: '', quantity: 1, unit: 'cái', note: '', stageTemplateIds: [] });
            load();
        } catch (e) {
            toast.error(e.message);
        } finally {
            setSavingItem(false);
        }
    }

    if (loading) return <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}><Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} /></div>;
    if (!order) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--status-danger)' }}>Không tìm thấy lệnh sản xuất.</div>;

    const availableActions = (ACTIONS_BY_STATUS[order.status] || []).filter(a => perms[a.perm]);
    const canCancel = perms.delete && CANCELLABLE.includes(order.status);

    return (
        <div style={{ padding: 24, maxWidth: 1300, margin: '0 auto' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => router.push('/manufacturing/orders')} style={{ marginBottom: 16 }}><ArrowLeft size={14} /> Quay lại</button>

            <div className="card" style={{ marginBottom: 16, padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                            <span style={{ color: 'var(--text-accent)', fontWeight: 700 }}>{order.code}</span>
                            <span className="badge">{ORDER_STATUS_LABELS[order.status] || order.status}</span>
                            <span className="badge muted">{PRIORITY_LABELS[order.priority]}</span>
                            {order.isLate && <span className="badge danger"><AlertTriangle size={11} style={{ verticalAlign: -1 }} /> Trễ {order.daysLate} ngày</span>}
                        </div>
                        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{order.title}</h2>
                        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                            Dự án: <a href={`/projects/${order.project.id}`} style={{ color: 'var(--text-accent)' }}>{order.project.code} — {order.project.name}</a>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                            📅 {fmtDate(order.plannedStartDate)} → {fmtDate(order.plannedEndDate)}
                            {order.productionManagerId && ` · 👤 QĐ: ${order.productionManagerId}`}
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 26, fontWeight: 700 }}>{order.progressPercent ?? order.computedProgress ?? 0}%</div>
                        <div className="progress-bar" style={{ width: 120 }}><div className="progress-fill" style={{ width: `${order.progressPercent ?? 0}%` }} /></div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
                    {availableActions.map(a => (
                        <button key={a.action} className={`btn btn-${a.variant} btn-sm`} disabled={busy}
                            onClick={() => a.action === 'reject' ? runAction('reject', 'Từ chối hồ sơ, yêu cầu bổ sung') : runAction(a.action)}>
                            {a.label}
                        </button>
                    ))}
                    {canCancel && <button className="btn btn-ghost btn-sm" style={{ color: '#dc2626' }} disabled={busy} onClick={() => setShowCancel(true)}>Hủy lệnh</button>}
                </div>
            </div>

            <div className="project-tabs" style={{ marginBottom: 16 }}>
                {SUB_TABS.map(t => (
                    <button key={t.key} className={`project-tab ${subTab === t.key ? 'active' : ''}`} onClick={() => setSubTab(t.key)}>
                        <span className="tab-label">{t.label}</span>
                    </button>
                ))}
            </div>

            {subTab === 'overview' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
                    {[
                        { v: order.items?.length ?? 0, l: 'Sản phẩm' },
                        { v: order.items?.filter(i => ['COMPLETED', 'INSTALLED', 'DELIVERED'].includes(i.status)).length ?? 0, l: 'Hoàn thành' },
                        { v: order.materialReqs?.length ?? 0, l: 'Nhu cầu vật tư' },
                        { v: order.qualityIssues?.filter(i => ['OPEN', 'ASSIGNED', 'IN_REPAIR', 'WAITING_VERIFICATION'].includes(i.status)).length ?? 0, l: 'Lỗi đang mở' },
                        { v: order.packingRecords?.length ?? 0, l: 'Kiện đã đóng gói' },
                        { v: order.deliveryRecords?.length ?? 0, l: 'Chuyến giao hàng' },
                    ].map(x => (
                        <div key={x.l} className="card" style={{ textAlign: 'center', padding: 16 }}>
                            <div style={{ fontSize: 22, fontWeight: 700 }}>{x.v}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{x.l}</div>
                        </div>
                    ))}
                    {order.note && <div className="card" style={{ gridColumn: '1 / -1', padding: 16, fontSize: 13, whiteSpace: 'pre-wrap' }}><strong>Ghi chú:</strong> {order.note}</div>}
                </div>
            )}

            {subTab === 'items' && (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div className="card-header" style={{ padding: '14px 18px' }}>
                        <span className="card-title">Sản phẩm ({order.items?.length ?? 0})</span>
                        {perms.create && <button className="btn btn-primary btn-sm" onClick={() => setShowAddItem(true)}><Plus size={14} /> Thêm sản phẩm</button>}
                    </div>
                    {(!order.items || order.items.length === 0) ? (
                        <div style={{ padding: 50, textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có sản phẩm nào trong lệnh này.</div>
                    ) : (
                        <div className="table-container">
                            <table className="data-table">
                                <thead><tr><th>Mã</th><th>Tên</th><th>Vị trí</th><th>SL</th><th>Trạng thái</th><th>Tiến độ</th><th>Phụ trách</th><th>Lỗi</th></tr></thead>
                                <tbody>
                                    {order.items.map(it => (
                                        <tr key={it.id} style={{ cursor: 'pointer' }} onClick={() => setActiveItemId(it.id)}>
                                            <td style={{ fontWeight: 600 }}>{it.code}</td>
                                            <td>{it.name}</td>
                                            <td>{[it.floorName, it.roomName].filter(Boolean).join(' - ') || '—'}</td>
                                            <td>{it.quantity} {it.unit}</td>
                                            <td><span className="badge">{ITEM_STATUS_LABELS[it.status] || it.status}</span></td>
                                            <td>{it.progressPercent}%</td>
                                            <td>{it.assignedWorker?.name || it.assignedTeamName || '—'}</td>
                                            <td>{it._count?.qualityIssues > 0 ? <span className="badge danger">{it._count.qualityIssues}</span> : '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {subTab === 'materials' && <OrderMaterialsTab order={order} perms={perms} onChanged={load} />}
            {subTab === 'quality' && <OrderQualityTab order={order} perms={perms} onChanged={load} />}
            {subTab === 'packing' && <OrderPackingTab order={order} perms={perms} onChanged={load} />}
            {subTab === 'delivery' && <OrderDeliveryTab order={order} perms={perms} onChanged={load} />}

            {subTab === 'history' && (
                <div className="card" style={{ padding: 0 }}>
                    {(!order.auditLog || order.auditLog.length === 0) ? (
                        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có lịch sử thay đổi.</div>
                    ) : (
                        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {order.auditLog.map(l => (
                                <div key={l.id} style={{ display: 'flex', gap: 10, fontSize: 13, borderBottom: '1px solid var(--border-light)', paddingBottom: 8 }}>
                                    <History size={14} color="#9ca3af" style={{ marginTop: 2 }} />
                                    <div>
                                        <strong>{l.action}</strong> {l.fromStatus && `${ORDER_STATUS_LABELS[l.fromStatus] || l.fromStatus} → `}{l.toStatus && (ORDER_STATUS_LABELS[l.toStatus] || l.toStatus)}
                                        {l.note && <div style={{ color: 'var(--text-muted)' }}>{l.note}</div>}
                                        <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>{l.byUserName || 'Hệ thống'} · {fmtDateTime(l.createdAt)}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <Modal isOpen={showAddItem} onClose={() => setShowAddItem(false)} title="Thêm sản phẩm">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div className="form-group">
                        <label className="form-label">Tên sản phẩm *</label>
                        <input className="form-input" value={itemForm.name} onChange={e => setItemForm(f => ({ ...f, name: e.target.value }))} placeholder="VD: Tủ bếp trên" />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div className="form-group"><label className="form-label">Loại</label><input className="form-input" value={itemForm.category} onChange={e => setItemForm(f => ({ ...f, category: e.target.value }))} /></div>
                        <div className="form-group"><label className="form-label">Số lượng</label><input type="number" className="form-input" value={itemForm.quantity} onChange={e => setItemForm(f => ({ ...f, quantity: e.target.value }))} /></div>
                        <div className="form-group"><label className="form-label">Tầng</label><input className="form-input" value={itemForm.floorName} onChange={e => setItemForm(f => ({ ...f, floorName: e.target.value }))} /></div>
                        <div className="form-group"><label className="form-label">Phòng</label><input className="form-input" value={itemForm.roomName} onChange={e => setItemForm(f => ({ ...f, roomName: e.target.value }))} /></div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Quy trình công đoạn áp dụng</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 160, overflowY: 'auto', border: '1px solid var(--border-light)', borderRadius: 8, padding: 8 }}>
                            {stageTemplates.map(t => (
                                <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, padding: '3px 8px', borderRadius: 14, background: itemForm.stageTemplateIds.includes(t.id) ? '#dbeafe' : '#f3f4f6', cursor: 'pointer' }}>
                                    <input type="checkbox" checked={itemForm.stageTemplateIds.includes(t.id)}
                                        onChange={e => setItemForm(f => ({ ...f, stageTemplateIds: e.target.checked ? [...f.stageTemplateIds, t.id] : f.stageTemplateIds.filter(x => x !== t.id) }))} />
                                    {t.name}
                                </label>
                            ))}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Bỏ trống để áp dụng các công đoạn bắt buộc mặc định.</div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        <button className="btn btn-secondary" onClick={() => setShowAddItem(false)}>Hủy</button>
                        <button className="btn btn-primary" onClick={handleAddItem} disabled={savingItem}>{savingItem ? 'Đang lưu...' : 'Thêm sản phẩm'}</button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={showCancel} onClose={() => setShowCancel(false)} title="Hủy lệnh sản xuất">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div className="form-group">
                        <label className="form-label">Lý do hủy *</label>
                        <textarea className="form-input" rows={3} value={cancelNote} onChange={e => setCancelNote(e.target.value)} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        <button className="btn btn-secondary" onClick={() => setShowCancel(false)}>Đóng</button>
                        <button className="btn btn-primary" style={{ background: '#dc2626' }} disabled={busy}
                            onClick={async () => { await runAction('cancel', cancelNote); setShowCancel(false); setCancelNote(''); }}>
                            Xác nhận hủy lệnh
                        </button>
                    </div>
                </div>
            </Modal>

            {activeItemId && (
                <ItemDetailDrawer itemId={activeItemId} onClose={() => setActiveItemId(null)} onChanged={load} canUpdateStage={perms.start || perms.create} />
            )}
        </div>
    );
}
