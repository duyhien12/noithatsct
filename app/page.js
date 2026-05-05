'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRole } from '@/contexts/RoleContext';

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
const fmtShort = (n) => {
  if (!n) return '0';
  if (n >= 1e9) return (n / 1e9).toFixed(1) + ' tỷ';
  if (n >= 1e6) return (n / 1e6).toFixed(0) + ' tr';
  return fmt(n);
};
const today = () => new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });

const statusColor = (status) => {
  const map = {
    'Thi công': '#2563eb', 'Đang thi công': '#2563eb',
    'Thiết kế': '#7c3aed',
    'Hoàn thành': '#16a34a',
    'Dừng': '#dc2626',
    'Chờ': '#d97706',
  };
  return map[status] || '#64748b';
};

const statusBg = (status) => {
  const map = {
    'Thi công': 'rgba(37,99,235,0.1)', 'Đang thi công': 'rgba(37,99,235,0.1)',
    'Thiết kế': 'rgba(124,58,237,0.1)',
    'Hoàn thành': 'rgba(22,163,74,0.1)',
    'Dừng': 'rgba(220,38,38,0.1)',
    'Chờ': 'rgba(217,119,6,0.1)',
  };
  return map[status] || 'rgba(100,116,139,0.1)';
};

// SVG Icons
const Icons = {
  Revenue: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  ),
  Projects: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
    </svg>
  ),
  Customers: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  Contracts: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
    </svg>
  ),
  WorkOrder: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
    </svg>
  ),
  Products: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>
  ),
  TrendUp: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
    </svg>
  ),
  Alert: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  ArrowRight: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
    </svg>
  ),
};

const KPI_CONFIG = [
  { key: 'revenue',       label: 'Doanh thu',      Icon: Icons.Revenue,   color: '#1C3A6B', bg: 'rgba(28,58,107,0.08)',  format: fmtShort, href: '/finance' },
  { key: 'activeProjects',label: 'Dự án đang chạy',Icon: Icons.Projects,  color: '#2563eb', bg: 'rgba(37,99,235,0.08)',  format: v => v,   href: '/projects' },
  { key: 'customers',     label: 'Khách hàng',     Icon: Icons.Customers, color: '#7c3aed', bg: 'rgba(124,58,237,0.08)', format: v => v,   href: '/customers' },
  { key: 'contracts',     label: 'Hợp đồng',       Icon: Icons.Contracts, color: '#0891b2', bg: 'rgba(8,145,178,0.08)',  format: v => v,   href: '/contracts' },
  { key: 'workOrders',    label: 'Phiếu công việc', Icon: Icons.WorkOrder, color: '#d97706', bg: 'rgba(217,119,6,0.08)',  format: v => v,   href: '/work-orders' },
  { key: 'products',      label: 'Sản phẩm',       Icon: Icons.Products,  color: '#16a34a', bg: 'rgba(22,163,74,0.08)',  format: v => v,   href: '/products' },
];

export default function Dashboard() {
  const router = useRouter();
  const { canViewDashboard, role } = useRole();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (role === 'kinh_doanh') { router.replace('/sales'); return; }
    if (role === 'xuong') { router.replace('/workshop'); return; }
    if (role === 'xay_dung') { router.replace('/projects'); return; }
    if (role && !canViewDashboard) { router.replace('/projects'); return; }
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d); setLoading(false); })
      .catch(() => { setError('Không thể tải dữ liệu'); setLoading(false); });
  }, [role, canViewDashboard]);

  if (!canViewDashboard && role) return null;

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 16 }}>
      <div style={{ width: 40, height: 40, border: '3px solid var(--border-color)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>Đang tải dữ liệu...</span>
    </div>
  );

  if (error || !data?.stats) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400, color: 'var(--text-muted)' }}>
      Không thể tải dữ liệu dashboard
    </div>
  );

  const s = data.stats;
  const profit = s.revenue - s.expense;
  const collectionRate = s.totalContractValue > 0 ? Math.round(s.totalPaid / s.totalContractValue * 100) : 0;
  const totalProjects = data.projectsByStatus.reduce((sum, p) => sum + p._count, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>Tổng quan hệ thống</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{today()}</p>
        </div>
        {s.pendingWorkOrders > 0 && (
          <a href="/work-orders" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 8, textDecoration: 'none', color: '#dc2626', fontSize: 13, fontWeight: 500 }}>
            <Icons.Alert />
            {s.pendingWorkOrders} phiếu chờ xử lý
          </a>
        )}
      </div>

      {/* ── KPI Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        {KPI_CONFIG.map(({ key, label, Icon, color, bg, format, href }) => (
          <a key={key} href={href} style={{ textDecoration: 'none' }}>
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 14,
              padding: '18px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              boxShadow: 'var(--shadow-sm)',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
            >
              {/* Accent bar top */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: color, borderRadius: '14px 14px 0 0' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ width: 40, height: 40, background: bg, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
                  <Icon />
                </div>
                <div style={{ color: 'var(--text-muted)', opacity: 0.5 }}><Icons.ArrowRight /></div>
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px', lineHeight: 1.2 }}>
                  {format(s[key])}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3, fontWeight: 500 }}>{label}</div>
              </div>
            </div>
          </a>
        ))}
      </div>

      {/* ── Middle: Finance + Project Status ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 14 }}>

        {/* Finance Card */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 14, boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>Tổng quan tài chính</span>
            <a href="/finance" style={{ fontSize: 12, color: 'var(--primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>Xem chi tiết <Icons.ArrowRight /></a>
          </div>
          <div style={{ padding: '20px' }}>
            {/* Revenue / Expense / Profit */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Doanh thu', value: s.revenue, color: '#16a34a', bg: 'rgba(22,163,74,0.06)' },
                { label: 'Chi phí', value: s.expense, color: '#dc2626', bg: 'rgba(220,38,38,0.06)' },
                { label: 'Lợi nhuận', value: profit, color: profit >= 0 ? '#16a34a' : '#dc2626', bg: profit >= 0 ? 'rgba(22,163,74,0.06)' : 'rgba(220,38,38,0.06)' },
              ].map(item => (
                <div key={item.label} style={{ background: item.bg, borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{item.label}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: item.color, letterSpacing: '-0.3px' }}>{fmtShort(item.value)}</div>
                </div>
              ))}
            </div>

            {/* Collection Progress */}
            <div style={{ background: 'var(--bg-primary)', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Tiến độ thu hồi công nợ</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)' }}>{collectionRate}%</span>
              </div>
              <div style={{ height: 8, background: 'var(--border-color)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${collectionRate}%`, background: 'linear-gradient(90deg, #1C3A6B, #2A5298)', borderRadius: 99, transition: 'width 0.6s ease' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                <span>Đã thu: <strong style={{ color: '#16a34a' }}>{fmtShort(s.totalPaid)}</strong></span>
                <span>Tổng HĐ: <strong style={{ color: 'var(--text-secondary)' }}>{fmtShort(s.totalContractValue)}</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Project Status Card */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 14, boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>Dự án theo trạng thái</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tổng: {totalProjects}</span>
          </div>
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data.projectsByStatus.map(ps => {
              const pct = totalProjects > 0 ? Math.round(ps._count / totalProjects * 100) : 0;
              return (
                <div key={ps.status}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor(ps.status), flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>{ps.status}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{pct}%</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 24, height: 22, padding: '0 7px', background: statusBg(ps.status), color: statusColor(ps.status), borderRadius: 6, fontSize: 12, fontWeight: 700 }}>{ps._count}</span>
                    </div>
                  </div>
                  <div style={{ height: 5, background: 'var(--bg-primary)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: statusColor(ps.status), borderRadius: 99, transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Low Stock Alert ── */}
      {data.lowStockProducts?.length > 0 && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(220,38,38,0.25)', borderRadius: 14, boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(220,38,38,0.15)', background: 'rgba(220,38,38,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#dc2626', fontWeight: 600, fontSize: 14 }}>
              <Icons.Alert />
              Sản phẩm hết hàng
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 20, height: 20, background: '#dc2626', color: '#fff', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>{data.lowStockProducts.length}</span>
            </div>
            <a href="/products" style={{ fontSize: 12, color: '#dc2626', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500 }}>Xem tất cả <Icons.ArrowRight /></a>
          </div>
          <div style={{ padding: '14px 20px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {data.lowStockProducts.map(p => (
              <a key={p.id} href={`/products/${p.id}`} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.15)',
                borderRadius: 10, textDecoration: 'none', color: 'inherit',
              }}>
                {p.image && <img src={p.image} style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} alt="" />}
                <div>
                  <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-primary)' }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: '#dc2626', fontWeight: 500 }}>Tồn: {p.stock}{p.minStock > 0 && ` / min ${p.minStock}`}</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* ── Recent Projects ── */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 14, boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>Dự án gần đây</span>
          <a href="/projects" style={{ fontSize: 12, color: 'var(--primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500 }}>Xem tất cả <Icons.ArrowRight /></a>
        </div>

        {/* Desktop */}
        <div className="desktop-table-view">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-primary)' }}>
                {['Mã DA', 'Tên dự án', 'Khách hàng', 'Ngân sách', 'Tiến độ', 'Trạng thái'].map(h => (
                  <th key={h} style={{ padding: '10px 20px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.recentProjects.map((p, i) => (
                <tr key={p.id}
                  onClick={() => window.location.href = `/projects/${p.id}`}
                  style={{ cursor: 'pointer', borderTop: '1px solid var(--border-color)', transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-primary)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '13px 20px', fontSize: 13, fontWeight: 600, color: 'var(--primary)', whiteSpace: 'nowrap' }}>{p.code}</td>
                  <td style={{ padding: '13px 20px', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', maxWidth: 220 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                  </td>
                  <td style={{ padding: '13px 20px', fontSize: 13, color: 'var(--text-secondary)' }}>{p.customer?.name}</td>
                  <td style={{ padding: '13px 20px', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{fmtShort(p.budget)}</td>
                  <td style={{ padding: '13px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 6, background: 'var(--border-color)', borderRadius: 99, overflow: 'hidden', minWidth: 60 }}>
                        <div style={{ height: '100%', width: `${p.progress}%`, background: p.progress >= 80 ? '#16a34a' : p.progress >= 40 ? '#2563eb' : '#d97706', borderRadius: 99 }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', minWidth: 32 }}>{p.progress}%</span>
                    </div>
                  </td>
                  <td style={{ padding: '13px 20px' }}>
                    <span style={{ display: 'inline-block', padding: '3px 10px', background: statusBg(p.status), color: statusColor(p.status), borderRadius: 6, fontSize: 12, fontWeight: 600 }}>{p.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile */}
        <div className="mobile-card-list">
          {data.recentProjects.map(p => (
            <div key={p.id} className="mobile-card-item" onClick={() => window.location.href = `/projects/${p.id}`}
              style={{ padding: '14px 16px', borderTop: '1px solid var(--border-color)', cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{p.code} · {p.customer?.name}</div>
                </div>
                <span style={{ display: 'inline-block', padding: '3px 10px', background: statusBg(p.status), color: statusColor(p.status), borderRadius: 6, fontSize: 11, fontWeight: 600, flexShrink: 0 }}>{p.status}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)', minWidth: 70 }}>{fmtShort(p.budget)}</span>
                <div style={{ flex: 1, height: 6, background: 'var(--border-color)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${p.progress}%`, background: p.progress >= 80 ? '#16a34a' : p.progress >= 40 ? '#2563eb' : '#d97706', borderRadius: 99 }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', minWidth: 32, textAlign: 'right' }}>{p.progress}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
