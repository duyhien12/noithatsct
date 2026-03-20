'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRole } from '@/contexts/RoleContext';
const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
const fmtShort = (n) => {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + ' tỷ';
  if (n >= 1e6) return (n / 1e6).toFixed(0) + ' tr';
  return fmt(n);
};
export default function Dashboard() {
  const router = useRouter();
  const { canViewDashboard, role } = useRole();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Redirect nếu không có quyền (chỉ ban lãnh đạo & admin)
    if (role === 'kinh_doanh') {
      router.replace('/sales');
      return;
    }
    if (role === 'xuong' || role === 'xay_dung') {
      router.replace('/workshop');
      return;
    }
    if (role && !canViewDashboard) {
      // Các phòng ban khác vào thẳng trang dự án
      router.replace('/projects');
      return;
    }
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(d => { if (d.error) { setError(d.error); } else { setData(d); } setLoading(false); })
      .catch(() => { setError('Không thể tải dữ liệu'); setLoading(false); });
  }, [role, canViewDashboard]);

  if (!canViewDashboard && role) return null;
  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400, color: 'var(--text-muted)' }}>Đang tải dữ liệu...</div>;
  if (error || !data?.stats) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400, color: 'var(--text-muted)' }}>Không thể tải dữ liệu dashboard</div>;
  const s = data.stats;
  const collectionRate = s.totalContractValue > 0 ? Math.round(s.totalPaid / s.totalContractValue * 100) : 0;
  return (
    <div>
      {/* Stats grid - responsive auto-fit */}
      <div className="stats-grid">
        <div className="stat-card"><div className="stat-icon">💰</div><div><div className="stat-value">{fmtShort(s.revenue)}</div><div className="stat-label">Doanh thu</div></div></div>
        <div className="stat-card"><div className="stat-icon">🏗️</div><div><div className="stat-value">{s.activeProjects}</div><div className="stat-label">DA đang chạy</div></div></div>
        <div className="stat-card"><div className="stat-icon">👥</div><div><div className="stat-value">{s.customers}</div><div className="stat-label">Khách hàng</div></div></div>
        <div className="stat-card"><div className="stat-icon">📝</div><div><div className="stat-value">{s.contracts}</div><div className="stat-label">Hợp đồng</div></div></div>
        <div className="stat-card"><div className="stat-icon">🔧</div><div><div className="stat-value">{s.workOrders}</div><div className="stat-label">Phiếu CV</div><div style={{ fontSize: 10, color: 'var(--status-warning)' }}>{s.pendingWorkOrders} chờ xử lý</div></div></div>
        <div className="stat-card"><div className="stat-icon">📦</div><div><div className="stat-value">{s.products}</div><div className="stat-label">Sản phẩm</div></div></div>
      </div>

      {/* Finance + Status - stacks on mobile via dashboard-grid class */}
      <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
        <div className="card">
          <div className="card-header"><h3>Tổng quan tài chính</h3></div>
          <div style={{ padding: '12px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 13 }}><span>Doanh thu</span><span style={{ color: 'var(--status-success)', fontWeight: 600 }}>{fmtShort(s.revenue)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 13 }}><span>Chi phí</span><span style={{ color: 'var(--status-danger)', fontWeight: 600 }}>{fmtShort(s.expense)}</span></div>
            <hr style={{ border: '1px solid var(--border-light)', marginBottom: 10 }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: 14 }}><span style={{ fontWeight: 600 }}>Lợi nhuận</span><span style={{ color: s.revenue - s.expense >= 0 ? 'var(--status-success)' : 'var(--status-danger)', fontWeight: 700 }}>{fmtShort(s.revenue - s.expense)}</span></div>
            <hr style={{ border: '1px solid var(--border-light)', marginBottom: 10 }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}><span>Tổng giá trị HĐ</span><span style={{ fontWeight: 600 }}>{fmtShort(s.totalContractValue)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}><span>Đã thu</span><span style={{ fontWeight: 600, color: 'var(--status-success)' }}>{fmtShort(s.totalPaid)}</span></div>
            <div className="progress-bar" style={{ marginTop: 8 }}><div className="progress-fill" style={{ width: `${collectionRate}%` }}></div></div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, textAlign: 'right' }}>Tỷ lệ thu: {collectionRate}%</div>
          </div>
        </div>
        <div className="card">
          <div className="card-header"><h3>Dự án theo trạng thái</h3></div>
          <div style={{ padding: '12px 0' }}>
            {data.projectsByStatus.map(ps => (
              <div key={ps.status} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                <span>{ps.status}</span><span className="badge badge-info">{ps._count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Low stock alert */}
      {data.lowStockProducts?.length > 0 && (
        <div className="card" style={{ marginTop: 16, borderLeft: '3px solid #dc2626' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>⚠️ Hết hàng <span className="badge" style={{ background: '#dc2626', color: '#fff', fontSize: 11 }}>{data.lowStockProducts.length}</span></h3>
            <a href="/products" style={{ fontSize: 12, color: 'var(--primary)', textDecoration: 'none' }}>Xem tất cả →</a>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {data.lowStockProducts.map(p => (
              <a key={p.id} href={`/products/${p.id}`} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: 'rgba(231,76,60,0.06)', borderRadius: 8, border: '1px solid rgba(231,76,60,0.15)', textDecoration: 'none', color: 'inherit', fontSize: 12 }}>
                {p.image && <img src={p.image} style={{ width: 24, height: 24, borderRadius: 4, objectFit: 'cover' }} alt="" />}
                <div>
                  <div style={{ fontWeight: 600, fontSize: 11 }}>{p.name}</div>
                  <div style={{ fontSize: 10, color: '#dc2626' }}>Tồn: {p.stock}{p.minStock > 0 && ` / min ${p.minStock}`}</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Recent projects - uses table-container for horizontal scroll */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-header"><h3>Dự án gần đây</h3></div>

        {/* Desktop table */}
        <div className="desktop-table-view">
          <div className="table-container">
            <table className="data-table">
              <thead><tr><th>Mã DA</th><th>Tên dự án</th><th>Khách hàng</th><th>Ngân sách</th><th>Tiến độ</th><th>Trạng thái</th></tr></thead>
              <tbody>
                {data.recentProjects.map(p => (
                  <tr key={p.id} onClick={() => window.location.href = `/projects/${p.id}`} style={{ cursor: 'pointer' }}>
                    <td className="accent">{p.code}</td>
                    <td className="primary">{p.name}</td>
                    <td>{p.customer?.name}</td>
                    <td>{fmtShort(p.budget)}</td>
                    <td><div className="progress-bar" style={{ width: 60 }}><div className="progress-fill" style={{ width: `${p.progress}%` }}></div></div><span style={{ fontSize: 11 }}>{p.progress}%</span></td>
                    <td><span className="badge badge-info">{p.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile card list */}
        <div className="mobile-card-list">
          {data.recentProjects.map(p => (
            <div key={p.id} className="mobile-card-item" onClick={() => window.location.href = `/projects/${p.id}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <div className="card-title">{p.name}</div>
                  <div className="card-subtitle">{p.code} · {p.customer?.name}</div>
                </div>
                <span className="badge badge-info">{p.status}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                <span style={{ color: 'var(--text-muted)' }}>{fmtShort(p.budget)}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div className="progress-bar" style={{ width: 60, height: 6 }}><div className="progress-fill" style={{ width: `${p.progress}%` }}></div></div>
                  <span style={{ fontWeight: 600, fontSize: 11 }}>{p.progress}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
