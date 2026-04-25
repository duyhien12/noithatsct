'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
const fmtNum = (n) => new Intl.NumberFormat('vi-VN').format(n || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
const pct = (a, b) => b > 0 ? Math.round((a / b) * 100) : 0;

const STATUS_BADGE = { 'Đã thanh toán': 'badge-success', 'Đã giao': 'badge-info', 'Đang giao': 'badge-warning', 'Nháp': 'badge-default' };

function PurchasingContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('');
    const [projects, setProjects] = useState([]);
    const [suppliers, setSuppliers] = useState([]);

    // Create/Edit PO modal
    const [showModal, setShowModal] = useState(false);
    const [editingPO, setEditingPO] = useState(null); // null = create, object = edit
    const [poForm, setPoForm] = useState({ supplier: '', supplierId: null, projectId: '', deliveryDate: '', notes: '' });
    const [poItems, setPoItems] = useState([{ productName: '', unit: 'cái', quantity: 1, unitPrice: 0, amount: 0, productId: null }]);
    const [saving, setSaving] = useState(false);

    const [deletingId, setDeletingId] = useState(null);

    const openEdit = (po) => {
        setEditingPO(po);
        setPoForm({
            supplier: po.supplier || '',
            supplierId: po.supplierId || null,
            projectId: po.projectId || '',
            deliveryDate: po.deliveryDate ? new Date(po.deliveryDate).toISOString().split('T')[0] : '',
            notes: po.notes || '',
        });
        setPoItems(po.items?.length > 0
            ? po.items.map(it => ({ productName: it.productName, unit: it.unit, quantity: it.quantity, unitPrice: it.unitPrice, amount: it.amount, productId: it.productId || null }))
            : [{ productName: '', unit: 'cái', quantity: 1, unitPrice: 0, amount: 0, productId: null }]
        );
        setShowModal(true);
    };

    const deletePO = async (po) => {
        if (!confirm(`Xóa đơn hàng ${po.code}? Hành động này không thể hoàn tác.`)) return;
        setDeletingId(po.id);
        const res = await fetch(`/api/purchase-orders/${po.id}`, { method: 'DELETE' });
        setDeletingId(null);
        if (!res.ok) { const e = await res.json(); return alert(e.error || 'Lỗi xóa đơn hàng'); }
        fetchOrders();
    };

    // Approve & phiếu chi
    const [approvingId, setApprovingId] = useState(null);
    const [showPhieuChiModal, setShowPhieuChiModal] = useState(false);
    const [approvedPO, setApprovedPO] = useState(null);
    const [phieuChiDesc, setPhieuChiDesc] = useState('');
    const [phieuChiNotes, setPhieuChiNotes] = useState('');
    const [creatingPhieuChi, setCreatingPhieuChi] = useState(false);

    const fetchOrders = () => {
        setLoading(true);
        fetch('/api/purchase-orders?limit=1000&excludeRole=xay_dung').then(r => r.json()).then(d => { setOrders(d.data || []); setLoading(false); });
    };

    useEffect(() => {
        fetchOrders();
        fetch('/api/projects?limit=200').then(r => r.json()).then(d => setProjects(d.data || []));
        fetch('/api/suppliers?limit=1000').then(r => r.json()).then(d => setSuppliers(d.data || []));
    }, []);

    // Pre-fill from URL params (from products bulk action)
    useEffect(() => {
        const createPO = searchParams.get('createPO');
        const productIds = searchParams.get('products')?.split(',').filter(Boolean) || [];
        if (createPO && productIds.length > 0) {
            fetch('/api/products?limit=1000').then(r => r.json()).then(d => {
                const all = d.data || [];
                const items = productIds.map(pid => {
                    const p = all.find(x => x.id === pid);
                    return p ? { productName: p.name, unit: p.unit || 'cái', quantity: 1, unitPrice: p.salePrice || 0, amount: p.salePrice || 0, productId: p.id } : null;
                }).filter(Boolean);
                if (items.length > 0) {
                    setPoItems(items);
                    setPoForm(f => ({ ...f, supplier: items[0] ? (d.data?.find(p => p.id === items[0].productId)?.supplier || '') : '' }));
                    setShowModal(true);
                }
            });
        }
    }, [searchParams]);

    const totalValue = orders.reduce((s, o) => s + o.totalAmount, 0);
    const totalPaid = orders.reduce((s, o) => s + o.paidAmount, 0);
    const statuses = ['Nháp', 'Đang đặt', 'Đã xác nhận', 'Đang giao', 'Đã giao', 'Đã thanh toán'];
    const filtered = filterStatus ? orders.filter(o => o.status === filterStatus) : orders;

    const updateItem = (i, field, value) => {
        setPoItems(items => items.map((it, idx) => {
            if (idx !== i) return it;
            const updated = { ...it, [field]: value };
            updated.amount = (Number(updated.quantity) || 0) * (Number(updated.unitPrice) || 0);
            return updated;
        }));
    };

    const poTotal = poItems.reduce((s, it) => s + (it.amount || 0), 0);

    const approvePO = async (po) => {
        if (!confirm(`Duyệt đơn hàng ${po.code} — ${po.supplier}?`)) return;
        setApprovingId(po.id);
        const res = await fetch(`/api/purchase-orders/${po.id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'Đã duyệt' }),
        });
        setApprovingId(null);
        if (!res.ok) return alert('Lỗi duyệt PO');
        fetchOrders();
        setApprovedPO(po);
        setPhieuChiDesc(`Phiếu chi mua hàng ${po.code} — ${po.supplier}`);
        setPhieuChiNotes(`Từ PO ${po.code}`);
        setShowPhieuChiModal(true);
    };

    const createPhieuChi = async () => {
        if (!approvedPO) return;
        setCreatingPhieuChi(true);
        const res = await fetch('/api/project-expenses', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                description: phieuChiDesc || `Phiếu chi ${approvedPO.code}`,
                amount: approvedPO.totalAmount,
                projectId: approvedPO.projectId || null,
                expenseType: 'Mua hàng',
                category: 'Vật tư',
                status: 'Chờ thanh toán',
                recipientType: 'supplier',
                recipientName: approvedPO.supplier,
                notes: phieuChiNotes,
            }),
        });
        setCreatingPhieuChi(false);
        if (!res.ok) { const e = await res.json(); return alert(e.error || 'Lỗi tạo phiếu chi'); }
        setShowPhieuChiModal(false);
        setApprovedPO(null);
        alert('✅ Đã tạo phiếu chi thành công!');
    };

    const createPO = async () => {
        if (!poForm.supplier.trim()) return alert('Vui lòng nhập nhà cung cấp');
        if (poItems.every(it => !it.productName.trim())) return alert('Vui lòng nhập ít nhất 1 sản phẩm');
        setSaving(true);
        const validItems = poItems.filter(it => it.productName.trim()).map(it => ({
            productName: it.productName,
            unit: it.unit || '',
            quantity: parseFloat(it.quantity) || 0,
            unitPrice: parseFloat(it.unitPrice) || 0,
            amount: (parseFloat(it.quantity) || 0) * (parseFloat(it.unitPrice) || 0),
            productId: it.productId || null,
            materialPlanId: it.materialPlanId || null,
            notes: it.notes || '',
        }));
        const poTotal2 = validItems.reduce((s, it) => s + it.amount, 0);
        const payload = { ...poForm, projectId: poForm.projectId || null, totalAmount: poTotal2, items: validItems };
        const res = editingPO
            ? await fetch(`/api/purchase-orders/${editingPO.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
            : await fetch('/api/purchase-orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        setSaving(false);
        if (!res.ok) { const e = await res.json(); return alert(e.error || (editingPO ? 'Lỗi cập nhật PO' : 'Lỗi tạo PO')); }
        setShowModal(false);
        setEditingPO(null);
        setPoForm({ supplier: '', supplierId: null, projectId: '', deliveryDate: '', notes: '' });
        setPoItems([{ productName: '', unit: 'cái', quantity: 1, unitPrice: 0, amount: 0, productId: null }]);
        fetchOrders();
    };

    return (
        <div>
            <div style={{ marginBottom: 24 }}>
                <h2 style={{ margin: 0 }}>🛒 Mua sắm vật tư toàn công ty</h2>
            </div>

            <div className="stats-grid" style={{ marginBottom: 24 }}>
                <div className="stat-card"><div className="stat-icon">🛒</div><div><div className="stat-value">{orders.length}</div><div className="stat-label">Tổng đơn hàng</div></div></div>
                <div className="stat-card"><div className="stat-icon">💰</div><div><div className="stat-value">{fmt(totalValue)}</div><div className="stat-label">Tổng giá trị</div></div></div>
                <div className="stat-card"><div className="stat-icon">✅</div><div><div className="stat-value" style={{ color: 'var(--status-success)' }}>{fmt(totalPaid)}</div><div className="stat-label">Đã thanh toán</div></div></div>
                <div className="stat-card"><div className="stat-icon">📦</div><div><div className="stat-value" style={{ color: 'var(--status-warning)' }}>{orders.filter(o => o.status === 'Đang giao').length}</div><div className="stat-label">Đang giao</div></div></div>
                <div className="stat-card"><div className="stat-icon">⏳</div><div><div className="stat-value" style={{ color: 'var(--status-info)' }}>{orders.filter(o => o.status === 'Đang đặt').length}</div><div className="stat-label">Đang đặt</div></div></div>
            </div>

            <div className="card">
                <div className="card-header">
                    <h3>Danh sách đơn mua hàng</h3>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <select className="form-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                            <option value="">Tất cả</option>
                            {statuses.map(s => <option key={s}>{s}</option>)}
                        </select>
                        <button className="btn btn-primary" onClick={() => {
                            setEditingPO(null);
                            setPoForm({ supplier: '', supplierId: null, projectId: '', deliveryDate: '', notes: '' });
                            setPoItems([{ productName: '', unit: 'cái', quantity: 1, unitPrice: 0, amount: 0, productId: null }]);
                            setShowModal(true);
                        }}>+ Tạo PO mới</button>
                    </div>
                </div>
                {loading ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div> : (
                    <div className="table-container"><table className="data-table">
                        <thead><tr><th>Mã PO</th><th>NCC</th><th>Dự án</th><th>Tổng tiền</th><th>Đã TT</th><th>Số SP</th><th>Ngày đặt</th><th>Giao hàng</th><th>Trạng thái</th><th></th></tr></thead>
                        <tbody>{filtered.map(o => {
                            const rate = pct(o.paidAmount, o.totalAmount);
                            const canApprove = ['Nháp', 'Chờ duyệt', 'Chờ duyệt vượt định mức'].includes(o.status);
                            const isDuyet = o.status === 'Đã duyệt';
                            return (
                                <tr key={o.id} onClick={() => o.projectId && router.push(`/projects/${o.projectId}`)} style={{ cursor: o.projectId ? 'pointer' : 'default' }}>
                                    <td className="accent">{o.code}</td>
                                    <td className="primary">{o.supplier}</td>
                                    <td>{o.project ? <span className="badge badge-info">{o.project.code}</span> : <span style={{ opacity: 0.3, fontSize: 12 }}>—</span>}</td>
                                    <td className="amount">{fmt(o.totalAmount)}</td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <div className="progress-bar" style={{ flex: 1, maxWidth: 50 }}><div className="progress-fill" style={{ width: `${rate}%` }}></div></div>
                                            <span style={{ fontSize: 12 }}>{rate}%</span>
                                        </div>
                                    </td>
                                    <td>{o.items?.length || 0}</td>
                                    <td style={{ fontSize: 12 }}>{fmtDate(o.orderDate)}</td>
                                    <td style={{ fontSize: 12 }}>{fmtDate(o.deliveryDate)}</td>
                                    <td><span className={`badge ${STATUS_BADGE[o.status] || 'badge-default'}`}>{o.status}</span></td>
                                    <td onClick={e => e.stopPropagation()} style={{ whiteSpace: 'nowrap', display: 'flex', gap: 4, alignItems: 'center' }}>
                                        <button
                                            className="btn btn-sm btn-ghost"
                                            style={{ fontSize: 12, padding: '4px 8px' }}
                                            onClick={() => openEdit(o)}
                                            title="Chỉnh sửa"
                                        >✏️</button>
                                        {canApprove && (
                                            <button
                                                className="btn btn-sm"
                                                style={{ background: '#16a34a', color: '#fff', fontSize: 12, padding: '4px 10px' }}
                                                onClick={() => approvePO(o)}
                                                disabled={approvingId === o.id}
                                            >
                                                {approvingId === o.id ? '...' : '✓ Duyệt'}
                                            </button>
                                        )}
                                        <button
                                            className="btn btn-sm"
                                            style={{ background: '#ef4444', color: '#fff', fontSize: 12, padding: '4px 8px' }}
                                            onClick={() => deletePO(o)}
                                            disabled={deletingId === o.id}
                                            title="Xóa đơn hàng"
                                        >
                                            {deletingId === o.id ? '...' : '🗑'}
                                        </button>
                                        {isDuyet && (
                                            <button
                                                className="btn btn-sm btn-primary"
                                                style={{ fontSize: 12, padding: '4px 10px' }}
                                                onClick={() => {
                                                    setApprovedPO(o);
                                                    setPhieuChiDesc(`Phiếu chi mua hàng ${o.code} — ${o.supplier}`);
                                                    setPhieuChiNotes(`Từ PO ${o.code}`);
                                                    setShowPhieuChiModal(true);
                                                }}
                                            >
                                                + Phiếu chi
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}</tbody>
                    </table></div>
                )}
                {!loading && filtered.length === 0 && <div style={{ color: 'var(--text-muted)', padding: 24, textAlign: 'center' }}>Không có dữ liệu</div>}
            </div>

            {/* Phiếu chi modal */}
            {showPhieuChiModal && approvedPO && (
                <div className="modal-overlay" onClick={() => setShowPhieuChiModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 500, width: '95%' }}>
                        <div className="modal-header">
                            <h3>💸 Tạo phiếu chi</h3>
                            <button className="modal-close" onClick={() => setShowPhieuChiModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: 13 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Mã PO</span>
                                    <strong>{approvedPO.code}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Nhà cung cấp</span>
                                    <strong>{approvedPO.supplier}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Số tiền</span>
                                    <strong style={{ color: 'var(--status-danger)', fontSize: 15 }}>{fmt(approvedPO.totalAmount)}</strong>
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Mô tả phiếu chi *</label>
                                <input className="form-input" value={phieuChiDesc} onChange={e => setPhieuChiDesc(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Ghi chú</label>
                                <input className="form-input" value={phieuChiNotes} onChange={e => setPhieuChiNotes(e.target.value)} />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowPhieuChiModal(false)}>Bỏ qua</button>
                            <button className="btn btn-primary" onClick={createPhieuChi} disabled={creatingPhieuChi}>
                                {creatingPhieuChi ? 'Đang tạo...' : '💸 Tạo phiếu chi'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create PO Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => { setShowModal(false); setEditingPO(null); }}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 760, width: '95%' }}>
                        <div className="modal-header">
                            <h3>{editingPO ? `Chỉnh sửa ${editingPO.code}` : 'Tạo đơn mua hàng (PO)'}</h3>
                            <button className="modal-close" onClick={() => { setShowModal(false); setEditingPO(null); }}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-row">
                                <div className="form-group" style={{ flex: 2 }}>
                                    <label className="form-label">Nhà cung cấp *</label>
                                    <select className="form-select" value={poForm.supplierId || ''} autoFocus
                                        onChange={e => {
                                            const sup = suppliers.find(s => s.id === e.target.value);
                                            setPoForm(f => ({ ...f, supplierId: sup?.id || null, supplier: sup?.name || '' }));
                                        }}>
                                        <option value="">-- Chọn nhà cung cấp --</option>
                                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}{s.isBlacklisted ? ' 🚫' : ''}</option>)}
                                    </select>
                                    {!poForm.supplierId && (
                                        <input className="form-input" style={{ marginTop: 6, fontSize: 12 }} value={poForm.supplier} onChange={e => setPoForm(f => ({ ...f, supplier: e.target.value }))} placeholder="Hoặc nhập tên NCC thủ công..." />
                                    )}
                                    {(() => {
                                        const sup = suppliers.find(s => s.id === poForm.supplierId);
                                        if (!sup) return null;
                                        const debt = (sup.totalPurchase || 0) - (sup.totalPaid || 0);
                                        const remaining = sup.creditLimit > 0 ? sup.creditLimit - debt : null;
                                        return (
                                            <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                {sup.isBlacklisted && (
                                                    <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid var(--status-danger)', borderRadius: 6, padding: '8px 12px', fontSize: 13, color: 'var(--status-danger)', fontWeight: 600 }}>
                                                        🚫 NCC này đang trong Blacklist — không thể tạo PO
                                                    </div>
                                                )}
                                                {sup.creditLimit > 0 && (
                                                    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 12px', fontSize: 12, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                                        <span>Hạn mức: <strong>{new Intl.NumberFormat('vi-VN', { notation: 'compact' }).format(sup.creditLimit)}</strong></span>
                                                        <span>Đang nợ: <strong style={{ color: 'var(--status-danger)' }}>{new Intl.NumberFormat('vi-VN', { notation: 'compact' }).format(debt)}</strong></span>
                                                        <span>Còn lại: <strong style={{ color: remaining >= 0 ? 'var(--status-success)' : 'var(--status-danger)' }}>{new Intl.NumberFormat('vi-VN', { notation: 'compact' }).format(remaining)}</strong></span>
                                                    </div>
                                                )}
                                                {sup.creditLimit > 0 && poTotal > (remaining ?? Infinity) && !sup.isBlacklisted && (
                                                    <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid var(--status-warning)', borderRadius: 6, padding: '6px 12px', fontSize: 12, color: '#b45309', fontWeight: 600 }}>
                                                        ⚠️ Tổng PO vượt hạn mức tín dụng còn lại
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>
                                <div className="form-group" style={{ flex: 2 }}>
                                    <label className="form-label">Dự án (không bắt buộc)</label>
                                    <select className="form-select" value={poForm.projectId} onChange={e => setPoForm(f => ({ ...f, projectId: e.target.value }))}>
                                        <option value="">-- Không gắn dự án --</option>
                                        {projects.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Ngày giao hàng</label>
                                    <input className="form-input" type="date" value={poForm.deliveryDate} onChange={e => setPoForm(f => ({ ...f, deliveryDate: e.target.value }))} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Ghi chú</label>
                                <input className="form-input" value={poForm.notes} onChange={e => setPoForm(f => ({ ...f, notes: e.target.value }))} placeholder="Yêu cầu đặc biệt, quy cách giao hàng..." />
                            </div>

                            {/* Items table */}
                            <div style={{ marginTop: 12 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    <label className="form-label" style={{ margin: 0 }}>Danh sách sản phẩm</label>
                                    <button className="btn btn-ghost btn-sm" onClick={() => setPoItems(it => [...it, { productName: '', unit: 'cái', quantity: 1, unitPrice: 0, amount: 0, productId: null }])}>
                                        + Thêm dòng
                                    </button>
                                </div>
                                <div style={{ border: '1px solid var(--border-color)', borderRadius: 6, overflow: 'hidden' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                        <thead>
                                            <tr style={{ background: 'var(--surface-alt)' }}>
                                                <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, fontSize: 11 }}>Tên sản phẩm</th>
                                                <th style={{ padding: '8px 8px', width: 65, textAlign: 'left', fontWeight: 600, fontSize: 11 }}>ĐVT</th>
                                                <th style={{ padding: '8px 8px', width: 80, textAlign: 'left', fontWeight: 600, fontSize: 11 }}>Số lượng</th>
                                                <th style={{ padding: '8px 8px', width: 110, textAlign: 'left', fontWeight: 600, fontSize: 11 }}>Đơn giá</th>
                                                <th style={{ padding: '8px 8px', width: 110, textAlign: 'right', fontWeight: 600, fontSize: 11 }}>Thành tiền</th>
                                                <th style={{ width: 36 }}></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {poItems.map((it, i) => (
                                                <tr key={i} style={{ borderTop: '1px solid var(--border-color)' }}>
                                                    <td style={{ padding: '6px 8px' }}>
                                                        <input className="form-input" style={{ fontSize: 12, padding: '4px 8px' }} value={it.productName}
                                                            onChange={e => updateItem(i, 'productName', e.target.value)} placeholder="Tên sản phẩm..." />
                                                    </td>
                                                    <td style={{ padding: '6px 4px' }}>
                                                        <input className="form-input" style={{ fontSize: 12, padding: '4px 6px' }} value={it.unit}
                                                            onChange={e => updateItem(i, 'unit', e.target.value)} />
                                                    </td>
                                                    <td style={{ padding: '6px 4px' }}>
                                                        <input className="form-input" type="text" inputMode="decimal" style={{ fontSize: 12, padding: '4px 6px' }} value={it.quantity}
                                                            onChange={e => updateItem(i, 'quantity', e.target.value)}
                                                            onFocus={e => e.target.select()} />
                                                    </td>
                                                    <td style={{ padding: '6px 4px' }}>
                                                        <input className="form-input" type="text" inputMode="numeric" style={{ fontSize: 12, padding: '4px 6px' }}
                                                            value={it._rawPrice !== undefined ? it._rawPrice : (it.unitPrice || '')}
                                                            placeholder="0"
                                                            onChange={e => {
                                                                const raw = e.target.value.replace(/[^0-9]/g, '');
                                                                setPoItems(prev => prev.map((it2, idx) => {
                                                                    if (idx !== i) return it2;
                                                                    const price = raw === '' ? 0 : parseInt(raw, 10);
                                                                    return { ...it2, _rawPrice: raw, unitPrice: price, amount: (Number(it2.quantity) || 0) * price };
                                                                }));
                                                            }}
                                                            onBlur={() => {
                                                                setPoItems(prev => prev.map((it2, idx) => {
                                                                    if (idx !== i) return it2;
                                                                    const { _rawPrice, ...rest } = it2;
                                                                    return rest;
                                                                }));
                                                            }}
                                                            onFocus={e => e.target.select()} />
                                                    </td>
                                                    <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600, fontSize: 12 }}>
                                                        {fmtNum(it.amount)}
                                                    </td>
                                                    <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                                                        {poItems.length > 1 && (
                                                            <button className="btn btn-ghost btn-sm" style={{ fontSize: 12 }}
                                                                onClick={() => setPoItems(it => it.filter((_, idx) => idx !== i))}>✕</button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr style={{ background: 'var(--surface-alt)', borderTop: '2px solid var(--border-color)' }}>
                                                <td colSpan={4} style={{ padding: '10px 12px', fontWeight: 700, fontSize: 13 }}>TỔNG CỘNG</td>
                                                <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 700, fontSize: 14, color: 'var(--primary)' }}>{fmt(poTotal)}</td>
                                                <td></td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => { setShowModal(false); setEditingPO(null); }}>Hủy</button>
                            <button className="btn btn-primary" onClick={createPO} disabled={saving || suppliers.find(s => s.id === poForm.supplierId)?.isBlacklisted}>{saving ? '...' : editingPO ? 'Lưu thay đổi' : 'Tạo đơn hàng'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function PurchasingPage() {
    return (
        <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', opacity: 0.4 }}>Đang tải...</div>}>
            <PurchasingContent />
        </Suspense>
    );
}
