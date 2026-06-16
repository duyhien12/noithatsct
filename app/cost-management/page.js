'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { TrendingUp, TrendingDown, Plus, Settings, Factory, AlertTriangle, ChevronRight } from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(n || 0));
const fmtPct = (n) => `${((n || 0) * 100).toFixed(1)}%`;
const STATUS_COLOR = { 'Báo giá': '#6b7280', 'Đang sản xuất': '#d97706', 'Hoàn thành': '#16a34a', 'Tạm dừng': '#dc2626' };

function KpiCard({ label, value, sub, color, icon: Icon }) {
    return (
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={16} color={color} />
                </div>
                <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>{label}</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#111827', letterSpacing: -0.5 }}>{value}</div>
            {sub && <div style={{ fontSize: 11, color: '#9ca3af' }}>{sub}</div>}
        </div>
    );
}

export default function CostDashboard() {
    const router = useRouter();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showSettings, setShowSettings] = useState(false);
    const [settings, setSettings] = useState({ vatPct: 0.08, targetProfitPct: 0.18, commissionPct: 0.05, mgmtPct: 0.04 });
    const [showNewForm, setShowNewForm] = useState(false);
    const [newForm, setNewForm] = useState({ code: '', name: '', client: '', revenue: '', status: 'Báo giá' });
    const [creating, setCreating] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        const res = await fetch('/api/cost-mgmt/dashboard');
        const d = await res.json();
        setData(d);
        if (d.settings) setSettings(d.settings);
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    async function saveSettings() {
        await fetch('/api/cost-mgmt/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) });
        setShowSettings(false);
        load();
    }

    async function createProject() {
        if (!newForm.name.trim()) return;
        setCreating(true);
        const res = await fetch('/api/cost-mgmt/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newForm) });
        const d = await res.json();
        setCreating(false);
        setShowNewForm(false);
        setNewForm({ code: '', name: '', client: '', revenue: '', status: 'Báo giá' });
        if (d.id) router.push(`/cost-management/projects/${d.id}`);
    }

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 12 }}>
            <div style={{ width: 32, height: 32, border: '3px solid #e5e7eb', borderTopColor: '#f97316', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <span style={{ color: '#6b7280', fontSize: 13 }}>Đang tải...</span>
        </div>
    );

    const { projects = [], summary = {}, settings: s = {} } = data || {};
    const target = s.targetProfitPct || 0.18;
    const belowTarget = projects.filter(p => p.profitPct < target && p.revenue > 0);

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px' }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                    <h1 style={{ fontSize: 20, fontWeight: 800, color: '#111827', margin: 0 }}>Giá thành & Lợi nhuận xưởng</h1>
                    <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>SCT — Phân tích lời/lỗ từng công trình</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => router.push('/cost-management/machines')}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid #e5e7eb', background: 'white', color: '#374151', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>
                        <Factory size={14} /> Máy móc
                    </button>
                    <button onClick={() => router.push('/cost-management/monthly')}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid #e5e7eb', background: 'white', color: '#374151', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>
                        Chi phí tháng
                    </button>
                    <button onClick={() => setShowSettings(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid #e5e7eb', background: 'white', color: '#374151', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>
                        <Settings size={14} /> Cài đặt
                    </button>
                    <button onClick={() => setShowNewForm(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', background: '#f97316', color: 'white', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
                        <Plus size={14} /> Công trình mới
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
                <KpiCard label="Tổng doanh thu" value={fmt(summary.totalRevenue) + 'đ'}
                    sub={`${summary.count || 0} công trình`} color="#2563eb" icon={TrendingUp} />
                <KpiCard label="Tổng giá vốn" value={fmt(summary.totalCogs) + 'đ'}
                    sub={summary.totalRevenue > 0 ? `${fmtPct(summary.totalCogs / summary.totalRevenue)} doanh thu` : '—'} color="#d97706" icon={TrendingDown} />
                <KpiCard label="Tổng lợi nhuận" value={fmt(summary.totalProfit) + 'đ'}
                    sub={summary.totalProfit >= 0 ? 'Đang có lãi' : 'Đang lỗ'} color={summary.totalProfit >= 0 ? '#16a34a' : '#dc2626'} icon={TrendingUp} />
                <KpiCard label="Biên lợi nhuận TB" value={fmtPct(summary.avgMargin)}
                    sub={`Mục tiêu: ${fmtPct(target)}`} color={summary.avgMargin >= target ? '#16a34a' : '#dc2626'} icon={TrendingUp} />
            </div>

            {/* Alert */}
            {belowTarget.length > 0 && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <AlertTriangle size={16} color="#dc2626" />
                    <span style={{ fontSize: 13, color: '#dc2626', fontWeight: 500 }}>
                        {belowTarget.length} công trình dưới ngưỡng lợi nhuận mục tiêu {fmtPct(target)}:
                        {' '}{belowTarget.map(p => p.name).join(', ')}
                    </span>
                </div>
            )}

            {/* Project Table */}
            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h2 style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: 0 }}>Danh sách công trình</h2>
                    <span style={{ fontSize: 12, color: '#9ca3af' }}>Nhấn vào tên để xem chi tiết</span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                                {['Mã CT','Tên công trình','Chủ đầu tư','Trạng thái','DT chưa VAT','Giá vốn','Lợi nhuận','Biên LN',''].map(h => (
                                    <th key={h} style={{ padding: '10px 14px', textAlign: h === '' ? 'center' : 'left', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap', fontSize: 12 }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {projects.length === 0 && (
                                <tr><td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>Chưa có công trình nào. Nhấn &quot;Công trình mới&quot; để bắt đầu.</td></tr>
                            )}
                            {projects.map(p => {
                                const isGood = p.profitPct >= target;
                                const hasRevenue = p.revenue > 0;
                                return (
                                    <tr key={p.id}
                                        style={{ borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }}
                                        onClick={() => router.push(`/cost-management/projects/${p.id}`)}
                                        onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                                        <td style={{ padding: '10px 14px', color: '#6b7280', fontWeight: 600, whiteSpace: 'nowrap' }}>{p.code || '—'}</td>
                                        <td style={{ padding: '10px 14px', fontWeight: 600, color: '#111827', minWidth: 180 }}>{p.name}</td>
                                        <td style={{ padding: '10px 14px', color: '#374151' }}>{p.client || '—'}</td>
                                        <td style={{ padding: '10px 14px' }}>
                                            <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, fontWeight: 600, background: (STATUS_COLOR[p.status] || '#6b7280') + '18', color: STATUS_COLOR[p.status] || '#6b7280' }}>{p.status}</span>
                                        </td>
                                        <td style={{ padding: '10px 14px', textAlign: 'right', whiteSpace: 'nowrap', color: '#2563eb', fontWeight: 600 }}>{fmt(p.revenue)}đ</td>
                                        <td style={{ padding: '10px 14px', textAlign: 'right', whiteSpace: 'nowrap', color: '#374151' }}>{fmt(p.cogsTotal)}đ</td>
                                        <td style={{ padding: '10px 14px', textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 700, color: p.profit >= 0 ? '#16a34a' : '#dc2626' }}>{fmt(p.profit)}đ</td>
                                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                            {hasRevenue ? (
                                                <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: isGood ? '#dcfce7' : '#fee2e2', color: isGood ? '#16a34a' : '#dc2626' }}>
                                                    {fmtPct(p.profitPct)}
                                                </span>
                                            ) : <span style={{ color: '#9ca3af' }}>—</span>}
                                        </td>
                                        <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                                            <ChevronRight size={14} color="#9ca3af" />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Settings Modal */}
            {showSettings && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: 'white', borderRadius: 14, padding: 28, width: 380, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
                        <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 20px' }}>Tỷ lệ mặc định</h3>
                        {[
                            { key: 'vatPct', label: 'VAT đầu ra tham khảo (%)' },
                            { key: 'targetProfitPct', label: 'Lợi nhuận mục tiêu (%)' },
                            { key: 'commissionPct', label: 'Hoa hồng / Dẫn việc (%)' },
                            { key: 'mgmtPct', label: 'QLDN phân bổ (%)' },
                        ].map(f => (
                            <div key={f.key} style={{ marginBottom: 14 }}>
                                <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 4 }}>{f.label}</label>
                                <input type="number" step="0.01" value={(settings[f.key] * 100).toFixed(1)}
                                    onChange={e => setSettings(s => ({ ...s, [f.key]: Number(e.target.value) / 100 }))}
                                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, boxSizing: 'border-box' }} />
                            </div>
                        ))}
                        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                            <button onClick={() => setShowSettings(false)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', fontSize: 13 }}>Huỷ</button>
                            <button onClick={saveSettings} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: '#f97316', color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Lưu</button>
                        </div>
                    </div>
                </div>
            )}

            {/* New Project Modal */}
            {showNewForm && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: 'white', borderRadius: 14, padding: 28, width: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
                        <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 20px' }}>Thêm công trình mới</h3>
                        {[
                            { key: 'code', label: 'Mã công trình', placeholder: 'VD: CT001' },
                            { key: 'name', label: 'Tên công trình *', placeholder: 'Nhà anh Kiên...' },
                            { key: 'client', label: 'Chủ đầu tư', placeholder: 'Tên chủ đầu tư' },
                            { key: 'revenue', label: 'Doanh thu chưa VAT (đ)', placeholder: '700000000', type: 'number' },
                        ].map(f => (
                            <div key={f.key} style={{ marginBottom: 14 }}>
                                <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 4 }}>{f.label}</label>
                                <input type={f.type || 'text'} placeholder={f.placeholder} value={newForm[f.key]}
                                    onChange={e => setNewForm(v => ({ ...v, [f.key]: e.target.value }))}
                                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, boxSizing: 'border-box' }} />
                            </div>
                        ))}
                        <div style={{ marginBottom: 14 }}>
                            <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Trạng thái</label>
                            <select value={newForm.status} onChange={e => setNewForm(v => ({ ...v, status: e.target.value }))}
                                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }}>
                                {['Báo giá','Đang sản xuất','Tạm dừng','Hoàn thành'].map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                            <button onClick={() => setShowNewForm(false)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', fontSize: 13 }}>Huỷ</button>
                            <button onClick={createProject} disabled={creating} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: '#f97316', color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: creating ? 0.7 : 1 }}>
                                {creating ? 'Đang tạo...' : 'Tạo & Mở'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
