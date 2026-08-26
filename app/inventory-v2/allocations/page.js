'use client';
import { useEffect, useState } from 'react';

const fmtNum = (n) => new Intl.NumberFormat('vi-VN').format(n || 0);
const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);

export default function AllocationsPage() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState({});

    useEffect(() => {
        fetch('/api/inventory-v2/allocations').then(r => r.json()).then(d => { setData(d.data || []); setLoading(false); });
    }, []);

    if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>;

    return (
        <div className="card">
            <div className="card-header"><h3 style={{ margin: 0 }}>Phân bổ vật tư theo công trình / lệnh sản xuất</h3></div>
            {data.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có dữ liệu giữ/xuất vật tư gắn công trình</div>
            ) : (
                <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {data.map(bucket => {
                        const isOpen = expanded[bucket.projectId];
                        return (
                            <div key={bucket.projectId} style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                                <div onClick={() => setExpanded(p => ({ ...p, [bucket.projectId]: !isOpen }))}
                                    style={{ padding: '12px 16px', cursor: 'pointer', background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <span>{isOpen ? '▾' : '▸'}</span>
                                    <span className="badge info">{bucket.project?.code}</span>
                                    <strong>{bucket.project?.name}</strong>
                                    <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>{bucket.materials.length} loại vật tư</span>
                                </div>
                                {isOpen && (
                                    <table className="data-table" style={{ margin: 0 }}>
                                        <thead>
                                            <tr><th>Vật tư</th><th style={{ textAlign: 'right' }}>Đã giữ</th><th style={{ textAlign: 'right' }}>Đã xuất</th><th style={{ textAlign: 'right' }}>Hoàn trả</th>{bucket.materials[0]?.netCost !== undefined && <th style={{ textAlign: 'right' }}>Giá trị thực tế</th>}</tr>
                                        </thead>
                                        <tbody>
                                            {bucket.materials.map(m => (
                                                <tr key={m.materialId}>
                                                    <td className="primary">{m.material?.sku} — {m.material?.name}</td>
                                                    <td style={{ textAlign: 'right', color: '#2563eb' }}>{fmtNum(m.held)} {m.material?.stockUnit?.code}</td>
                                                    <td style={{ textAlign: 'right', color: '#dc2626' }}>{fmtNum(m.issued)} {m.material?.stockUnit?.code}</td>
                                                    <td style={{ textAlign: 'right', color: '#16a34a' }}>{fmtNum(m.returned)} {m.material?.stockUnit?.code}</td>
                                                    {m.netCost !== undefined && <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(m.netCost)}</td>}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
