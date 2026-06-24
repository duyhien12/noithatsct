'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const STATUS_COLORS = {
    'Đang thực hiện': { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
    'Đang thiết kế': { bg: '#F5F3FF', color: '#6D28D9', border: '#DDD6FE' },
    'Đang sản xuất': { bg: '#FFFBEB', color: '#B45309', border: '#FDE68A' },
    'Đang thi công': { bg: '#ECFDF5', color: '#065F46', border: '#A7F3D0' },
    'Chờ nghiệm thu': { bg: '#FFF7ED', color: '#C2410C', border: '#FED7AA' },
    'Hoàn thành': { bg: '#F0FDF4', color: '#166534', border: '#BBF7D0' },
};

const TYPE_LABELS = {
    co_thiet_ke: 'Đã có thiết kế',
    chua_co_thiet_ke: 'Chưa có thiết kế',
};

function StatCard({ label, value, sub, color }) {
    return (
        <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderLeft: `4px solid ${color}`, minWidth: 140 }}>
            <div style={{ fontSize: 11, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#111827' }}>{value}</div>
            {sub && <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{sub}</div>}
        </div>
    );
}

export default function ContractManagementPage() {
    const router = useRouter();
    const [processes, setProcesses] = useState([]);
    const [stats, setStats] = useState({ total: 0, byStatus: {}, totalContractValue: 0, totalDebt: 0 });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [customers, setCustomers] = useState([]);
    const [contracts, setContracts] = useState([]);
    const [form, setForm] = useState({ customerId: '', contractId: '', type: 'co_thiet_ke', name: '', startDate: new Date().toISOString().split('T')[0], notes: '' });
    const [saving, setSaving] = useState(false);
    const [customerSearch, setCustomerSearch] = useState('');
    const [showCustomerDrop, setShowCustomerDrop] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const customerRef = useRef(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.set('search', search);
            if (filterType) params.set('type', filterType);
            if (filterStatus) params.set('status', filterStatus);
            const res = await fetch(`/api/contract-processes?${params}`);
            const data = await res.json();
            setProcesses(data.processes || []);
            setStats(data.stats || {});
        } finally {
            setLoading(false);
        }
    }, [search, filterType, filterStatus]);

    useEffect(() => { fetchData(); }, [fetchData]);

    useEffect(() => {
        fetch('/api/customers?limit=200')
            .then(r => r.json())
            .then(d => setCustomers(Array.isArray(d) ? d : (Array.isArray(d.data) ? d.data : [])));
    }, []);

    useEffect(() => {
        if (form.customerId) {
            fetch(`/api/contracts?customerId=${form.customerId}`)
                .then(r => r.json())
                .then(d => setContracts(Array.isArray(d) ? d : (d.contracts || [])))
                .catch(() => setContracts([]));
        } else {
            setContracts([]);
        }
    }, [form.customerId]);

    const handleCreate = async () => {
        if (!form.customerId) return alert('Vui lòng chọn khách hàng');
        setSaving(true);
        try {
            const res = await fetch('/api/contract-processes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (res.ok) {
                setShowModal(false);
                router.push(`/contract-management/${data.id}`);
            } else {
                alert(data.error || 'Lỗi tạo quy trình');
            }
        } finally {
            setSaving(false);
        }
    };

    // Close customer dropdown when clicking outside
    useEffect(() => {
        const handler = e => { if (customerRef.current && !customerRef.current.contains(e.target)) setShowCustomerDrop(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const fmt = n => n?.toLocaleString('vi-VN') || '0';
    const filteredCustomers = customers.filter(c =>
        !customerSearch || c.name?.toLowerCase().includes(customerSearch.toLowerCase()) || c.phone?.includes(customerSearch) || c.code?.toLowerCase().includes(customerSearch.toLowerCase())
    );

    return (
        <div style={{ padding: '24px', background: '#F9FAFB', minHeight: '100vh' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0 }}>Quản lý khách hàng hợp đồng</h1>
                    <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 0' }}>Theo dõi quy trình từ tiếp nhận đến nghiệm thu và bảo hành</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    style={{ background: '#F47920', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 600, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                    + Tạo quy trình mới
                </button>
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
                <StatCard label="Tổng quy trình" value={stats.total || 0} color="#F47920" />
                <StatCard label="Đang thực hiện" value={stats.byStatus?.['Đang thực hiện'] || 0} color="#3B82F6" />
                <StatCard label="Đang sản xuất" value={stats.byStatus?.['Đang sản xuất'] || 0} color="#F59E0B" />
                <StatCard label="Đang thi công" value={stats.byStatus?.['Đang thi công'] || 0} color="#EF4444" />
                <StatCard label="Hoàn thành" value={stats.byStatus?.['Hoàn thành'] || 0} color="#10B981" />
                <StatCard label="Tổng GT hợp đồng" value={`${fmt(stats.totalContractValue)}đ`} sub={`Công nợ: ${fmt(stats.totalDebt)}đ`} color="#8B5CF6" />
            </div>

            {/* Filters */}
            <div style={{ background: '#fff', borderRadius: 10, padding: '14px 16px', marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <input
                    placeholder="Tìm theo mã, tên..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ border: '1px solid #E5E7EB', borderRadius: 7, padding: '7px 12px', fontSize: 13, width: 200, outline: 'none' }}
                />
                <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ border: '1px solid #E5E7EB', borderRadius: 7, padding: '7px 12px', fontSize: 13, outline: 'none', background: '#fff' }}>
                    <option value="">Tất cả loại KH</option>
                    <option value="co_thiet_ke">Đã có thiết kế</option>
                    <option value="chua_co_thiet_ke">Chưa có thiết kế</option>
                </select>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ border: '1px solid #E5E7EB', borderRadius: 7, padding: '7px 12px', fontSize: 13, outline: 'none', background: '#fff' }}>
                    <option value="">Tất cả trạng thái</option>
                    {Object.keys(STATUS_COLORS).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                {(search || filterType || filterStatus) && (
                    <button onClick={() => { setSearch(''); setFilterType(''); setFilterStatus(''); }} style={{ fontSize: 12, color: '#6B7280', background: 'none', border: 'none', cursor: 'pointer' }}>
                        Xóa bộ lọc ✕
                    </button>
                )}
            </div>

            {/* Table */}
            <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>Đang tải...</div>
                ) : processes.length === 0 ? (
                    <div style={{ padding: 60, textAlign: 'center' }}>
                        <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
                        <div style={{ color: '#6B7280', fontSize: 15 }}>Chưa có quy trình nào</div>
                        <button onClick={() => setShowModal(true)} style={{ marginTop: 16, background: '#F47920', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', cursor: 'pointer', fontWeight: 600 }}>
                            Tạo quy trình đầu tiên
                        </button>
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                                {['Mã', 'Khách hàng', 'Điện thoại', 'Loại KH', 'Trạng thái', 'Tiến độ', 'GT hợp đồng', 'Ngày tạo', ''].map(h => (
                                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {processes.map((p, i) => {
                                const sc = STATUS_COLORS[p.status] || { bg: '#F3F4F6', color: '#374151', border: '#E5E7EB' };
                                return (
                                    <tr
                                        key={p.id}
                                        style={{ borderBottom: '1px solid #F3F4F6', cursor: 'pointer', transition: 'background 0.15s' }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#FFFBF5'}
                                        onMouseLeave={e => e.currentTarget.style.background = ''}
                                        onClick={() => router.push(`/contract-management/${p.id}`)}
                                    >
                                        <td style={{ padding: '12px 14px', fontSize: 12, fontWeight: 600, color: '#F47920' }}>{p.code}</td>
                                        <td style={{ padding: '12px 14px' }}>
                                            <div style={{ fontWeight: 600, fontSize: 13, color: '#111827' }}>{p.customer?.name}</div>
                                            {p.name && <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{p.name}</div>}
                                        </td>
                                        <td style={{ padding: '12px 14px', fontSize: 13, color: '#374151' }}>{p.customer?.phone}</td>
                                        <td style={{ padding: '12px 14px' }}>
                                            <span style={{ fontSize: 11, background: p.type === 'co_thiet_ke' ? '#EFF6FF' : '#F5F3FF', color: p.type === 'co_thiet_ke' ? '#1D4ED8' : '#6D28D9', borderRadius: 5, padding: '3px 8px', fontWeight: 500 }}>
                                                {TYPE_LABELS[p.type] || p.type}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px 14px' }}>
                                            <span style={{ fontSize: 11, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, borderRadius: 5, padding: '3px 8px', fontWeight: 500 }}>
                                                {p.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px 14px', minWidth: 120 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <div style={{ flex: 1, height: 6, background: '#E5E7EB', borderRadius: 3, overflow: 'hidden' }}>
                                                    <div style={{ height: '100%', width: `${p.progress}%`, background: p.progress >= 100 ? '#10B981' : p.progress > 50 ? '#F59E0B' : '#3B82F6', borderRadius: 3, transition: 'width 0.3s' }} />
                                                </div>
                                                <span style={{ fontSize: 12, fontWeight: 600, color: '#374151', minWidth: 32 }}>{p.progress}%</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px 14px', fontSize: 13, color: '#374151', whiteSpace: 'nowrap' }}>
                                            {p.contract ? `${fmt(p.contract.contractValue)}đ` : <span style={{ color: '#D1D5DB' }}>—</span>}
                                        </td>
                                        <td style={{ padding: '12px 14px', fontSize: 12, color: '#9CA3AF', whiteSpace: 'nowrap' }}>
                                            {new Date(p.createdAt).toLocaleDateString('vi-VN')}
                                        </td>
                                        <td style={{ padding: '12px 14px' }} onClick={e => e.stopPropagation()}>
                                            <Link href={`/contract-management/${p.id}`} style={{ fontSize: 12, color: '#F47920', textDecoration: 'none', fontWeight: 500 }}>Xem →</Link>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Create Modal */}
            {showModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                    <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 520, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#111827' }}>Tạo quy trình mới</h2>
                            <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#9CA3AF' }}>✕</button>
                        </div>
                        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {/* Customer select */}
                            <div ref={customerRef}>
                                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Khách hàng <span style={{ color: '#EF4444' }}>*</span></label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        autoComplete="off"
                                        placeholder="Tìm tên, SĐT, mã khách hàng..."
                                        value={selectedCustomer ? `${selectedCustomer.name} — ${selectedCustomer.phone}` : customerSearch}
                                        onFocus={() => { if (selectedCustomer) { setSelectedCustomer(null); setForm(f => ({ ...f, customerId: '', contractId: '' })); setCustomerSearch(''); } setShowCustomerDrop(true); }}
                                        onChange={e => { setCustomerSearch(e.target.value); setShowCustomerDrop(true); setSelectedCustomer(null); setForm(f => ({ ...f, customerId: '', contractId: '' })); }}
                                        style={{ width: '100%', border: `1px solid ${form.customerId ? '#10B981' : '#E5E7EB'}`, borderRadius: 7, padding: '8px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box', background: form.customerId ? '#F0FDF4' : '#fff' }}
                                    />
                                    {form.customerId && <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#10B981', fontSize: 16 }}>✓</span>}
                                    {showCustomerDrop && filteredCustomers.length > 0 && (
                                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 50, maxHeight: 220, overflowY: 'auto', marginTop: 4 }}>
                                            {filteredCustomers.slice(0, 30).map(c => (
                                                <div
                                                    key={c.id}
                                                    onMouseDown={e => {
                                                        e.preventDefault();
                                                        setSelectedCustomer(c);
                                                        setForm(f => ({ ...f, customerId: c.id, contractId: '', name: f.name || c.name }));
                                                        setShowCustomerDrop(false);
                                                    }}
                                                    style={{ padding: '9px 14px', cursor: 'pointer', borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                                    onMouseEnter={e => e.currentTarget.style.background = '#FFF7ED'}
                                                    onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                                                >
                                                    <div>
                                                        <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{c.name}</div>
                                                        <div style={{ fontSize: 11, color: '#9CA3AF' }}>{c.code}</div>
                                                    </div>
                                                    <div style={{ fontSize: 12, color: '#6B7280' }}>{c.phone}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Type */}
                            <div>
                                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>Loại khách hàng <span style={{ color: '#EF4444' }}>*</span></label>
                                <div style={{ display: 'flex', gap: 10 }}>
                                    {[{ v: 'co_thiet_ke', l: '✅ Đã có thiết kế', desc: 'Quy trình 6 bước' }, { v: 'chua_co_thiet_ke', l: '📐 Chưa có thiết kế', desc: 'Quy trình 8 bước' }].map(opt => (
                                        <label key={opt.v} style={{ flex: 1, border: `2px solid ${form.type === opt.v ? '#F47920' : '#E5E7EB'}`, borderRadius: 8, padding: '10px 12px', cursor: 'pointer', background: form.type === opt.v ? '#FFF7ED' : '#fff', transition: 'all 0.15s' }}>
                                            <input type="radio" name="type" value={opt.v} checked={form.type === opt.v} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} style={{ display: 'none' }} />
                                            <div style={{ fontWeight: 600, fontSize: 13, color: form.type === opt.v ? '#F47920' : '#374151' }}>{opt.l}</div>
                                            <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{opt.desc}</div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Name */}
                            <div>
                                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Tên quy trình</label>
                                <input
                                    placeholder="VD: Thi công nội thất căn hộ A1..."
                                    value={form.name}
                                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                    style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 7, padding: '8px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                                />
                            </div>

                            {/* Contract (optional) */}
                            {contracts.length > 0 && (
                                <div>
                                    <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Hợp đồng (tùy chọn)</label>
                                    <select value={form.contractId} onChange={e => setForm(f => ({ ...f, contractId: e.target.value }))} style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 7, padding: '8px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box', background: '#fff' }}>
                                        <option value="">-- Không chọn --</option>
                                        {contracts.map(c => <option key={c.id} value={c.id}>{c.code} — {c.contractValue?.toLocaleString('vi-VN')}đ</option>)}
                                    </select>
                                </div>
                            )}

                            {/* Start date */}
                            <div>
                                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Ngày bắt đầu</label>
                                <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 7, padding: '8px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                            </div>

                            {/* Notes */}
                            <div>
                                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Ghi chú</label>
                                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Ghi chú thêm..." style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 7, padding: '8px 12px', fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
                            </div>
                        </div>
                        <div style={{ padding: '16px 24px', borderTop: '1px solid #E5E7EB', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                            <button onClick={() => setShowModal(false)} style={{ padding: '8px 18px', border: '1px solid #E5E7EB', borderRadius: 7, fontSize: 13, cursor: 'pointer', background: '#fff', color: '#374151' }}>Hủy</button>
                            <button onClick={handleCreate} disabled={saving || !form.customerId} style={{ padding: '8px 20px', background: saving || !form.customerId ? '#D1D5DB' : '#F47920', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: saving || !form.customerId ? 'not-allowed' : 'pointer' }}>
                                {saving ? 'Đang tạo...' : '🚀 Tạo quy trình'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
