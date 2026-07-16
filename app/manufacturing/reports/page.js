'use client';
import { useState, useEffect, useCallback } from 'react';
import { BarChart2, Download } from 'lucide-react';

const fmtMoney = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);
function isoDaysAgo(n) { return new Date(Date.now() - n * 86400000).toISOString().slice(0, 10); }

function StatBox({ label, value, color }) {
    return (
        <div style={{ textAlign: 'center', padding: '12px 8px', background: '#f8fafc', borderRadius: 8 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: color || 'var(--text-primary)' }}>{value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</div>
        </div>
    );
}

function SimpleTable({ rows, cols }) {
    if (!rows || rows.length === 0) return <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Không có dữ liệu.</div>;
    return (
        <table className="data-table" style={{ fontSize: 12.5 }}>
            <thead><tr>{cols.map(c => <th key={c.key}>{c.label}</th>)}</tr></thead>
            <tbody>{rows.map((r, i) => <tr key={i}>{cols.map(c => <td key={c.key}>{r[c.key]}</td>)}</tr>)}</tbody>
        </table>
    );
}

export default function ManufacturingReportsPage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [projects, setProjects] = useState([]);
    const [filters, setFilters] = useState({ dateFrom: isoDaysAgo(29), dateTo: isoDaysAgo(0), projectId: '' });

    const load = useCallback(() => {
        setLoading(true);
        setError('');
        const qs = new URLSearchParams(filters);
        fetch(`/api/manufacturing/reports?${qs}`)
            .then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(new Error(e.error || `HTTP ${r.status}`))))
            .then(d => { setData(d); setLoading(false); })
            .catch(e => { setError(e.message || 'Lỗi tải báo cáo'); setLoading(false); });
    }, [filters]);

    useEffect(load, [load]);
    useEffect(() => { fetch('/api/projects?limit=300').then(r => r.json()).then(d => setProjects(d?.data || [])); }, []);

    async function exportExcel() {
        if (!data) return;
        const XLSX = await import('xlsx');
        const wb = XLSX.utils.book_new();
        const progressSheet = XLSX.utils.json_to_sheet([data.progress]);
        XLSX.utils.book_append_sheet(wb, progressSheet, 'Tiến độ');
        const qualitySheet = XLSX.utils.json_to_sheet(data.quality.issuesBySeverity.concat(data.quality.issuesByStage, data.quality.issuesByTeam));
        XLSX.utils.book_append_sheet(wb, qualitySheet, 'Chất lượng');
        const prodSheet = XLSX.utils.json_to_sheet(data.productivity.productionByDay);
        XLSX.utils.book_append_sheet(wb, prodSheet, 'Năng suất theo ngày');
        const teamSheet = XLSX.utils.json_to_sheet(data.productivity.hoursByTeam);
        XLSX.utils.book_append_sheet(wb, teamSheet, 'Giờ công theo tổ');
        XLSX.writeFile(wb, `bao_cao_san_xuat_${filters.dateFrom}_${filters.dateTo}.xlsx`);
    }

    return (
        <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <BarChart2 size={20} color="#2563eb" />
                    <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Báo cáo sản xuất</h1>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={exportExcel} disabled={!data}><Download size={14} /> Xuất Excel</button>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
                <input type="date" className="form-input" style={{ width: 150 }} value={filters.dateFrom} onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))} />
                <input type="date" className="form-input" style={{ width: 150 }} value={filters.dateTo} onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))} />
                <select className="form-input" style={{ width: 260 }} value={filters.projectId} onChange={e => setFilters(f => ({ ...f, projectId: e.target.value }))}>
                    <option value="">Tất cả dự án</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                </select>
            </div>

            {loading ? <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div> : error || !data ? (
                <div style={{ padding: 60, textAlign: 'center', color: 'var(--status-danger)' }}>
                    Lỗi tải báo cáo: {error || 'Không có dữ liệu'}. <button className="btn btn-ghost" onClick={load}>Thử lại</button>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div className="card" style={{ padding: 16 }}>
                        <div style={{ fontWeight: 700, marginBottom: 12 }}>1. Tiến độ</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
                            <StatBox label="Đúng hạn" value={data.progress.onTimeRate != null ? `${data.progress.onTimeRate}%` : '—'} color="#16a34a" />
                            <StatBox label="Lệnh chậm" value={data.progress.lateOrdersCount} color="#dc2626" />
                            <StatBox label="Số ngày chậm TB" value={data.progress.avgLateDays} />
                            <StatBox label="SP chờ vật tư" value={data.progress.itemsWaitingMaterial} />
                            <StatBox label="SP chờ QC" value={data.progress.itemsWaitingQc} />
                        </div>
                    </div>

                    <div className="card" style={{ padding: 16 }}>
                        <div style={{ fontWeight: 700, marginBottom: 12 }}>2. Chất lượng</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 16 }}>
                            <StatBox label="Đạt QC lần đầu" value={data.quality.firstPassRate != null ? `${data.quality.firstPassRate}%` : '—'} color="#16a34a" />
                            <StatBox label="Phải làm lại" value={data.quality.reworkRate != null ? `${data.quality.reworkRate}%` : '—'} color="#dc2626" />
                            {data.quality.totalRepairCost != null && <StatBox label="Chi phí sửa lỗi" value={fmtMoney(data.quality.totalRepairCost)} />}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                            <div><div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Lỗi theo mức độ</div><SimpleTable rows={data.quality.issuesBySeverity} cols={[{ key: 'severity', label: 'Mức độ' }, { key: 'count', label: 'Số lượng' }]} /></div>
                            <div><div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Lỗi theo công đoạn</div><SimpleTable rows={data.quality.issuesByStage} cols={[{ key: 'name', label: 'Công đoạn' }, { key: 'count', label: 'Số lượng' }]} /></div>
                            <div><div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Lỗi theo tổ</div><SimpleTable rows={data.quality.issuesByTeam} cols={[{ key: 'name', label: 'Tổ' }, { key: 'count', label: 'Số lượng' }]} /></div>
                        </div>
                    </div>

                    <div className="card" style={{ padding: 16 }}>
                        <div style={{ fontWeight: 700, marginBottom: 12 }}>3. Năng suất</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 16 }}>
                            <StatBox label="SP hoàn thành" value={`${data.productivity.itemsCompleted}/${data.productivity.itemsTotal}`} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                            <div><div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Giờ công theo tổ</div><SimpleTable rows={data.productivity.hoursByTeam} cols={[{ key: 'name', label: 'Tổ' }, { key: 'hours', label: 'Giờ' }]} /></div>
                            <div><div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Giờ công theo người</div><SimpleTable rows={data.productivity.hoursByWorker} cols={[{ key: 'name', label: 'Người' }, { key: 'hours', label: 'Giờ' }]} /></div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
