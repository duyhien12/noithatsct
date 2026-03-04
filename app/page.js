'use client';
import { useState, useEffect } from 'react';
const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch('/api/dashboard').then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, []);
  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400, color: 'var(--text-muted)' }}>Đang tải dữ liệu...</div>;
  const s = data.stats;
  const collectionRate = s.totalContractValue > 0 ? Math.round(s.totalPaid / s.totalContractValue * 100) : 0;
  return (
    <div>
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
        <div className="stat-card"><div className="stat-icon">💰</div><div><div className="stat-value">{fmt(s.revenue)}</div><div className="stat-label">Doanh thu</div></div></div>
        <div className="stat-card"><div className="stat-icon">🏗️</div><div><div className="stat-value">{s.activeProjects}</div><div className="stat-label">DA đang chạy</div></div></div>
        <div className="stat-card"><div className="stat-icon">👥</div><div><div className="stat-value">{s.customers}</div><div className="stat-label">Khách hàng</div></div></div>
        <div className="stat-card"><div className="stat-icon">📝</div><div><div className="stat-value">{s.contracts}</div><div className="stat-label">Hợp đồng</div></div></div>
        <div className="stat-card"><div className="stat-icon">🔧</div><div><div className="stat-value">{s.workOrders}</div><div className="stat-label">Phiếu CV</div><div style={{ fontSize: 10, color: 'var(--status-warning)' }}>{s.pendingWorkOrders} chờ xử lý</div></div></div>
        <div className="stat-card"><div className="stat-icon">📦</div><div><div className="stat-value">{s.products}</div><div className="stat-label">Sản phẩm</div></div></div>
      </div>
      <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 24 }}>
        <div className="card">
          <div className="card-header"><h3>Tổng quan tài chính</h3></div>
          <div style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}><span>Doanh thu</span><span style={{ color: 'var(--status-success)', fontWeight: 600 }}>{fmt(s.revenue)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}><span>Chi phí</span><span style={{ color: 'var(--status-danger)', fontWeight: 600 }}>{fmt(s.expense)}</span></div>
            <hr style={{ border: '1px solid var(--border-subtle)', marginBottom: 12 }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}><span style={{ fontWeight: 600 }}>Lợi nhuận</span><span style={{ color: s.revenue - s.expense >= 0 ? 'var(--status-success)' : 'var(--status-danger)', fontWeight: 700 }}>{fmt(s.revenue - s.expense)}</span></div>
            <hr style={{ border: '1px solid var(--border-subtle)', marginBottom: 12 }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span style={{ fontSize: 13 }}>Tổng giá trị HĐ</span><span style={{ fontWeight: 600 }}>{fmt(s.totalContractValue)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span style={{ fontSize: 13 }}>Đã thu</span><span style={{ fontWeight: 600, color: 'var(--status-success)' }}>{fmt(s.totalPaid)}</span></div>
            <div className="progress-bar" style={{ marginTop: 8 }}><div className="progress-fill" style={{ width: `${collectionRate}%` }}></div></div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, textAlign: 'right' }}>Tỷ lệ thu: {collectionRate}%</div>
          </div>
        </div>
        <div className="card">
          <div className="card-header"><h3>Dự án theo trạng thái</h3></div>
          <div style={{ padding: 20 }}>
            {data.projectsByStatus.map(ps => (
              <div key={ps.status} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span>{ps.status}</span><span className="badge badge-info">{ps._count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Low stock alert */}
      {data.lowStockProducts?.length > 0 && (
        <div className="card" style={{ marginTop: 24, borderLeft: '3px solid #dc2626' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>⚠️ Sản phẩm hết hàng <span className="badge" style={{ background: '#dc2626', color: '#fff', fontSize: 11 }}>{data.lowStockProducts.length}</span></h3>
            <a href="/products" style={{ fontSize: 12, color: 'var(--primary)', textDecoration: 'none' }}>Xem tất cả →</a>
          </div>
          <div style={{ padding: '8px 16px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {data.lowStockProducts.map(p => (
                <a key={p.id} href={`/products/${p.id}`} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: 'rgba(231,76,60,0.06)', borderRadius: 8, border: '1px solid rgba(231,76,60,0.15)', textDecoration: 'none', color: 'inherit', fontSize: 12 }}>
                  {p.image && <img src={p.image} style={{ width: 24, height: 24, borderRadius: 4, objectFit: 'cover' }} alt="" />}
                  <div>
                    <div style={{ fontWeight: 600 }}>{p.name}</div>
                    <div style={{ fontSize: 10, color: '#dc2626' }}>Tồn: {p.stock}{p.minStock > 0 && ` / min ${p.minStock}`}</div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
      <div className="card" style={{ marginTop: 24 }}>
        <div className="card-header"><h3>Dự án gần đây</h3></div>
        <div className="table-container">
          <table className="data-table">
            <thead><tr><th>Mã DA</th><th>Tên dự án</th><th>Khách hàng</th><th>Ngân sách</th><th>Tiến độ</th><th>Trạng thái</th></tr></thead>
            <tbody>
              {data.recentProjects.map(p => (
                <tr key={p.id} onClick={() => window.location.href = `/projects/${p.id}`} style={{ cursor: 'pointer' }}>
                  <td className="accent">{p.code}</td>
                  <td className="primary">{p.name}</td>
                  <td>{p.customer?.name}</td>
                  <td>{fmt(p.budget)}</td>
                  <td><div className="progress-bar"><div className="progress-fill" style={{ width: `${p.progress}%` }}></div></div><span style={{ fontSize: 11 }}>{p.progress}%</span></td>
                  <td><span className="badge badge-info">{p.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
