'use client';
import { useState, useEffect } from 'react';
import { useRole } from '@/contexts/RoleContext';

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);
const fmtShort = (n) => {
    if (!n) return '0';
    if (n >= 1e9) return (n / 1e9).toFixed(1) + ' tỷ';
    if (n >= 1e6) return (n / 1e6).toFixed(0) + 'tr';
    return new Intl.NumberFormat('vi-VN').format(n);
};

export default function MaterialsPage() {
    const { isXuong } = useRole();
    const [materials, setMaterials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterLow, setFilterLow] = useState(false);
    const [adjustTarget, setAdjustTarget] = useState(null);
    const [adjustForm, setAdjustForm] = useState({ type: 'in', quantity: 1, note: '' });
    const [saving, setSaving] = useState(false);

    const fetchMaterials = async () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (filterLow) params.set('lowStock', 'true');
        if (isXuong) params.set('supplier', 'Kho nội thất');
        const res = await fetch(`/api/workshop/materials?${params}`);
        const data = await res.json();
        setMaterials(Array.isArray(data) ? data : []);
        setLoading(false);
    };

    useEffect(() => { fetchMaterials(); }, [filterLow, isXuong]);

    const handleSearch = (e) => {
        if (e.key === 'Enter') fetchMaterials();
    };

    const handleAdjust = async () => {
        setSaving(true);
        try {
            await fetch('/api/workshop/materials', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId: adjustTarget.id, ...adjustForm }),
            });
            setAdjustTarget(null);
            fetchMaterials();
        } finally { setSaving(false); }
    };

    const totalValue = materials.reduce((s, m) => s + m.inventoryValue, 0);
    const lowCount = materials.filter(m => m.isLowStock).length;
    const totalUsed = materials.reduce((s, m) => s + m.usedInTasks, 0);

    const filtered = materials.filter(m =>
        !search || m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.category?.toLowerCase().includes(search.toLowerCase()) ||
        m.code?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* KPI */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14 }}>
                <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #8b5cf6' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>📦 Tổng loại vật tư</div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: '#8b5cf6' }}>{materials.length}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>loại đang quản lý</div>
                </div>
                <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #2563eb' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>💰 Giá trị tồn kho</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#2563eb' }}>{fmtShort(totalValue)}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>theo giá nhập</div>
                </div>
                <div className="card" style={{ padding: '16px 20px', borderLeft: `4px solid ${lowCount > 0 ? '#dc2626' : '#16a34a'}` }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>⚠️ Sắp hết hàng</div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: lowCount > 0 ? '#dc2626' : '#16a34a' }}>{lowCount}</div>
                    <div style={{ fontSize: 11, color: lowCount > 0 ? '#dc2626' : 'var(--text-muted)' }}>
                        {lowCount > 0 ? 'Cần nhập thêm!' : 'Tồn kho ổn'}
                    </div>
                </div>
                <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #f59e0b' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>🔨 Đã dùng trong việc</div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: '#f59e0b' }}>{totalUsed}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>lượt xuất vật tư</div>
                </div>
            </div>

            <div className="card">
                <div className="card-header">
                    <h3>Kho vật tư xưởng</h3>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                            <input type="checkbox" checked={filterLow} onChange={e => setFilterLow(e.target.checked)} />
                            <span style={{ color: filterLow ? '#dc2626' : 'inherit', fontWeight: filterLow ? 600 : 400 }}>Chỉ sắp hết</span>
                        </label>
                        <a href="/products" className="btn btn-ghost btn-sm">Quản lý sản phẩm →</a>
                    </div>
                </div>
                <div className="filter-bar" style={{ borderBottom: '1px solid var(--border)' }}>
                    <input className="form-input" placeholder="🔍 Tìm vật tư, mã, loại... (Enter để tìm)"
                        value={search} onChange={e => setSearch(e.target.value)} onKeyDown={handleSearch}
                        style={{ flex: 1, minWidth: 0 }} />
                    <button className="btn btn-ghost btn-sm" onClick={fetchMaterials}>Tìm</button>
                </div>

                {loading ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
                ) : (
                    <>
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Mã</th>
                                    <th>Tên vật tư</th>
                                    <th>Loại</th>
                                    <th style={{ textAlign: 'right' }}>Tồn kho</th>
                                    <th style={{ textAlign: 'right' }}>Tối thiểu</th>
                                    <th style={{ textAlign: 'right' }}>Đã dùng</th>
                                    <th>ĐV</th>
                                    <th style={{ textAlign: 'right' }}>Giá nhập</th>
                                    <th style={{ textAlign: 'right' }}>Giá trị tồn</th>
                                    <th style={{ textAlign: 'right' }}>Kho</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(m => (
                                    <tr key={m.id} style={{ background: m.isLowStock ? 'rgba(220,38,38,0.03)' : undefined }}>
                                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{m.code}</td>
                                        <td>
                                            <div style={{ fontWeight: 600, fontSize: 13, color: m.isLowStock ? '#dc2626' : 'inherit' }}>
                                                {m.isLowStock && '⚠️ '}{m.name}
                                            </div>
                                            {m.supplier && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.supplier}</div>}
                                        </td>
                                        <td style={{ fontSize: 12 }}>{m.category || '—'}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 700, color: m.isLowStock ? '#dc2626' : m.stock === 0 ? '#6b7280' : '#16a34a' }}>
                                            {m.stock}
                                        </td>
                                        <td style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-muted)' }}>{m.minStock || '—'}</td>
                                        <td style={{ textAlign: 'right', fontSize: 12, color: '#f59e0b', fontWeight: 600 }}>{m.usedInTasks || '—'}</td>
                                        <td style={{ fontSize: 12 }}>{m.unit}</td>
                                        <td style={{ textAlign: 'right', fontSize: 12 }}>{m.importPrice > 0 ? fmt(m.importPrice) : '—'}</td>
                                        <td style={{ textAlign: 'right', fontSize: 12, fontWeight: 600, color: '#8b5cf6' }}>
                                            {m.inventoryValue > 0 ? fmtShort(m.inventoryValue) : '—'}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 3, justifyContent: 'flex-end' }}>
                                                <button
                                                    className="btn btn-sm"
                                                    style={{ background: '#dcfce7', color: '#15803d', border: 'none', fontWeight: 600, fontSize: 12 }}
                                                    onClick={() => { setAdjustTarget(m); setAdjustForm({ type: 'in', quantity: 1, note: '' }); }}
                                                >+ Nhập</button>
                                                <button
                                                    className="btn btn-sm"
                                                    style={{ background: '#fee2e2', color: '#dc2626', border: 'none', fontWeight: 600, fontSize: 12 }}
                                                    onClick={() => { setAdjustTarget(m); setAdjustForm({ type: 'out', quantity: 1, note: '' }); }}
                                                >− Xuất</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filtered.length === 0 && (
                                    <tr><td colSpan={10} style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
                                        Không có vật tư nào {filterLow ? 'sắp hết' : ''}
                                    </td></tr>
                                )}
                            </tbody>
                            {filtered.length > 0 && (
                                <tfoot>
                                    <tr style={{ background: 'var(--bg-secondary)', fontWeight: 700 }}>
                                        <td colSpan={8} style={{ padding: '8px 16px', fontSize: 12, color: 'var(--text-muted)' }}>
                                            {filtered.length} vật tư
                                        </td>
                                        <td style={{ textAlign: 'right', padding: '8px 16px', color: '#8b5cf6' }}>
                                            {fmtShort(filtered.reduce((s, m) => s + m.inventoryValue, 0))}
                                        </td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>

                    {/* Mobile */}
                    <div className="mobile-card-list">
                        {filtered.map(m => (
                            <div key={m.id} className="mobile-card-item" style={{ borderLeft: m.isLowStock ? '3px solid #dc2626' : undefined }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: 14, color: m.isLowStock ? '#dc2626' : 'inherit' }}>{m.isLowStock && '⚠️ '}{m.name}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.code} · {m.category}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: 20, fontWeight: 800, color: m.isLowStock ? '#dc2626' : '#16a34a' }}>{m.stock}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.unit}</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8 }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Giá trị: {fmtShort(m.inventoryValue)}</span>
                                    <span style={{ color: '#f59e0b' }}>Đã dùng: {m.usedInTasks || 0} lần</span>
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button className="btn btn-sm" style={{ background: '#dcfce7', color: '#15803d', border: 'none', flex: 1 }}
                                        onClick={() => { setAdjustTarget(m); setAdjustForm({ type: 'in', quantity: 1, note: '' }); }}>+ Nhập kho</button>
                                    <button className="btn btn-sm" style={{ background: '#fee2e2', color: '#dc2626', border: 'none', flex: 1 }}
                                        onClick={() => { setAdjustTarget(m); setAdjustForm({ type: 'out', quantity: 1, note: '' }); }}>− Xuất kho</button>
                                </div>
                            </div>
                        ))}
                    </div>
                    </>
                )}
            </div>

            {/* Modal nhập/xuất kho */}
            {adjustTarget && (
                <div className="modal-overlay" onClick={() => setAdjustTarget(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
                        <div className="modal-header">
                            <h3>{adjustForm.type === 'in' ? '📥 Nhập kho' : '📤 Xuất kho'}</h3>
                            <button className="modal-close" onClick={() => setAdjustTarget(null)}>×</button>
                        </div>
                        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}>
                                <div style={{ fontWeight: 700, fontSize: 14 }}>{adjustTarget.name}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                                    Tồn hiện tại: <strong>{adjustTarget.stock} {adjustTarget.unit}</strong>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: 8 }}>
                                <button onClick={() => setAdjustForm(f => ({ ...f, type: 'in' }))}
                                    style={{ flex: 1, padding: '10px', borderRadius: 8, border: '2px solid', cursor: 'pointer', fontWeight: 700,
                                        borderColor: adjustForm.type === 'in' ? '#16a34a' : 'var(--border)',
                                        background: adjustForm.type === 'in' ? '#dcfce7' : 'transparent',
                                        color: adjustForm.type === 'in' ? '#15803d' : 'inherit' }}>
                                    📥 Nhập kho
                                </button>
                                <button onClick={() => setAdjustForm(f => ({ ...f, type: 'out' }))}
                                    style={{ flex: 1, padding: '10px', borderRadius: 8, border: '2px solid', cursor: 'pointer', fontWeight: 700,
                                        borderColor: adjustForm.type === 'out' ? '#dc2626' : 'var(--border)',
                                        background: adjustForm.type === 'out' ? '#fee2e2' : 'transparent',
                                        color: adjustForm.type === 'out' ? '#dc2626' : 'inherit' }}>
                                    📤 Xuất kho
                                </button>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Số lượng ({adjustTarget.unit})</label>
                                <input className="form-input" type="number" min={0.1} step={0.1} value={adjustForm.quantity}
                                    onChange={e => setAdjustForm(f => ({ ...f, quantity: Number(e.target.value) }))} />
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                                    Sau điều chỉnh: <strong style={{ color: adjustForm.type === 'out' && adjustTarget.stock - adjustForm.quantity < 0 ? '#dc2626' : 'inherit' }}>
                                        {adjustForm.type === 'in' ? adjustTarget.stock + adjustForm.quantity : adjustTarget.stock - adjustForm.quantity} {adjustTarget.unit}
                                    </strong>
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Ghi chú</label>
                                <input className="form-input" value={adjustForm.note} onChange={e => setAdjustForm(f => ({ ...f, note: e.target.value }))}
                                    placeholder={adjustForm.type === 'in' ? 'VD: Nhập từ NCC ABC...' : 'VD: Xuất cho việc đóng tủ...'} />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setAdjustTarget(null)}>Hủy</button>
                            <button
                                className="btn btn-primary"
                                style={{ background: adjustForm.type === 'in' ? '#16a34a' : '#dc2626' }}
                                onClick={handleAdjust}
                                disabled={saving || adjustForm.quantity <= 0}
                            >
                                {saving ? 'Đang lưu...' : adjustForm.type === 'in' ? 'Xác nhận nhập' : 'Xác nhận xuất'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
