'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Factory, AlertTriangle, Package, ClipboardCheck, Truck, CheckCircle2, Clock } from 'lucide-react';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';

function Card({ icon: Icon, label, value, color }) {
    return (
        <div className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={18} color={color} />
            </div>
            <div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{value}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</div>
            </div>
        </div>
    );
}

function MiniBarChart({ data, labelKey, valueKey, color = '#2563eb' }) {
    const max = Math.max(1, ...data.map(d => d[valueKey]));
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {data.slice(0, 10).map((d, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 100, fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d[labelKey]}</div>
                    <div style={{ flex: 1, background: '#f3f4f6', borderRadius: 4, height: 14, overflow: 'hidden' }}>
                        <div style={{ width: `${(d[valueKey] / max) * 100}%`, height: '100%', background: color }} />
                    </div>
                    <div style={{ width: 28, fontSize: 11, fontWeight: 600, textAlign: 'right' }}>{d[valueKey]}</div>
                </div>
            ))}
            {data.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Không có dữ liệu.</div>}
        </div>
    );
}

export default function ManufacturingDashboardPage() {
    const router = useRouter();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [projects, setProjects] = useState([]);
    const [projectId, setProjectId] = useState('');
    const [error, setError] = useState('');

    const load = useCallback(() => {
        setLoading(true);
        setError('');
        const qs = new URLSearchParams();
        if (projectId) qs.set('projectId', projectId);
        fetch(`/api/manufacturing/dashboard?${qs}`)
            .then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(new Error(e.error || `HTTP ${r.status}`))))
            .then(d => { setData(d); setLoading(false); })
            .catch(e => { setError(e.message || 'Lỗi tải dashboard'); setLoading(false); });
    }, [projectId]);

    useEffect(load, [load]);
    useEffect(() => { fetch('/api/projects?limit=300').then(r => r.json()).then(d => setProjects(d?.data || [])); }, []);

    if (loading) return <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải dashboard...</div>;
    if (error || !data) return (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--status-danger)' }}>
            Lỗi tải dashboard: {error || 'Không có dữ liệu'}. <button className="btn btn-ghost" onClick={load}>Thử lại</button>
        </div>
    );

    const { cards, alerts, charts } = data;

    return (
        <div style={{ padding: 24, maxWidth: 1300, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Factory size={22} color="#2563eb" />
                    <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Dashboard Quản lý sản xuất</h1>
                </div>
                <select className="form-input" style={{ width: 260 }} value={projectId} onChange={e => setProjectId(e.target.value)}>
                    <option value="">Tất cả dự án</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 20 }}>
                <Card icon={Factory} label="Công trình đang SX" value={cards.projectsInProduction} color="#2563eb" />
                <Card icon={Clock} label="Lệnh đang thực hiện" value={cards.ordersInProgress} color="#d97706" />
                <Card icon={AlertTriangle} label="Lệnh chậm tiến độ" value={cards.ordersLate} color="#dc2626" />
                <Card icon={Package} label="SP chờ vật tư" value={cards.itemsWaitingMaterial} color="#7c3aed" />
                <Card icon={ClipboardCheck} label="SP chờ QC" value={cards.itemsWaitingQc} color="#0891b2" />
                <Card icon={AlertTriangle} label="Lỗi đang mở" value={cards.openIssues} color="#dc2626" />
                <Card icon={CheckCircle2} label="SP hoàn thành hôm nay" value={cards.completedToday} color="#16a34a" />
                <Card icon={Truck} label="Giao hàng trong 7 ngày" value={cards.deliveriesNext7Days} color="#2563eb" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16, marginBottom: 20 }}>
                <div className="card" style={{ padding: 16 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>⚠ Cảnh báo</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12.5 }}>
                        {alerts.lateOrders.length > 0 && (
                            <div style={{ padding: 8, background: '#fef2f2', borderRadius: 6, color: '#b91c1c' }}>
                                {alerts.lateOrders.length} lệnh quá hạn: {alerts.lateOrders.map(o => o.code).join(', ')}
                            </div>
                        )}
                        {alerts.unapprovedOrders > 0 && (
                            <div style={{ padding: 8, background: '#fffbeb', borderRadius: 6, color: '#b45309' }} onClick={() => router.push('/manufacturing/orders?status=WAITING_APPROVAL')}>
                                {alerts.unapprovedOrders} lệnh chờ duyệt hồ sơ
                            </div>
                        )}
                        {alerts.failedQc.length > 0 && (
                            <div style={{ padding: 8, background: '#fef2f2', borderRadius: 6, color: '#b91c1c' }}>
                                {alerts.failedQc.length} phiếu QC không đạt gần đây
                            </div>
                        )}
                        {alerts.overdueIssues.length > 0 && (
                            <div style={{ padding: 8, background: '#fef2f2', borderRadius: 6, color: '#b91c1c' }}>
                                {alerts.overdueIssues.length} lỗi quá hạn xử lý
                            </div>
                        )}
                        {alerts.lateOrders.length === 0 && alerts.unapprovedOrders === 0 && alerts.failedQc.length === 0 && alerts.overdueIssues.length === 0 && (
                            <div style={{ color: 'var(--text-muted)' }}>Không có cảnh báo nào.</div>
                        )}
                    </div>
                </div>

                <div className="card" style={{ padding: 16 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Tiến độ theo lệnh sản xuất</div>
                    <MiniBarChart data={charts.ordersProgress} labelKey="code" valueKey="progress" color="#2563eb" />
                </div>

                <div className="card" style={{ padding: 16 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Sản phẩm theo trạng thái</div>
                    <MiniBarChart data={charts.itemsByStatus} labelKey="status" valueKey="count" color="#16a34a" />
                </div>

                <div className="card" style={{ padding: 16 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Sản lượng hoàn thành theo ngày</div>
                    <MiniBarChart data={charts.productionByDay} labelKey="date" valueKey="count" color="#d97706" />
                </div>

                <div className="card" style={{ padding: 16 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Số lỗi theo công đoạn</div>
                    <MiniBarChart data={charts.issuesByStage} labelKey="name" valueKey="count" color="#dc2626" />
                </div>

                <div className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Tỷ lệ đạt QC lần đầu</div>
                    <div style={{ fontSize: 32, fontWeight: 700, color: (charts.firstPassRate ?? 0) >= 80 ? '#16a34a' : '#d97706' }}>
                        {charts.firstPassRate != null ? `${charts.firstPassRate}%` : '—'}
                    </div>
                </div>
            </div>
        </div>
    );
}
