'use client';
import { useState, useEffect } from 'react';
import { useRole } from '@/contexts/RoleContext';
import { useRouter } from 'next/navigation';

const ZALO_APP_ID = '2211646598601440511';

const ROLES = [
    { key: 'ban_gd',        label: 'Ban giám đốc',             icon: '👑' },
    { key: 'kinh_doanh',    label: 'Phòng kinh doanh',         icon: '💼' },
    { key: 'xay_dung',      label: 'Phòng xây dựng',           icon: '🏗️' },
    { key: 'thiet_ke',      label: 'Phòng thiết kế',           icon: '✏️' },
    { key: 'marketing',     label: 'Phòng Marketing',          icon: '📣' },
    { key: 'hanh_chinh_kt', label: 'Phòng hành chính kế toán', icon: '📊' },
    { key: 'xuong',         label: 'Xưởng nội thất',           icon: '🪚' },
    { key: 'viewer',        label: 'Chỉ xem (Read-only)',      icon: '👁️' },
];

const ROLE_COLORS = {
    ban_gd:        { color: '#c0392b', bg: '#fdecea' },
    kinh_doanh:    { color: '#8e44ad', bg: '#f3e8fd' },
    xay_dung:      { color: '#2980b9', bg: '#e8f4fd' },
    thiet_ke:      { color: '#16a085', bg: '#e8f8f5' },
    marketing:     { color: '#e91e63', bg: '#fce4ec' },
    hanh_chinh_kt: { color: '#f39c12', bg: '#fef9e7' },
    xuong:         { color: '#d35400', bg: '#fdf0e8' },
    viewer:        { color: '#6b7280', bg: '#f3f4f6' },
    // fallback cho roles cũ
    giam_doc:      { color: '#c0392b', bg: '#fdecea' },
    pho_gd:        { color: '#e67e22', bg: '#fef3e2' },
    ke_toan:       { color: '#2980b9', bg: '#e8f4fd' },
    ky_thuat:      { color: '#27ae60', bg: '#e8f8f0' },
};

const EMPTY_FORM = { name: '', email: '', password: '', role: 'ky_thuat', department: '', phone: '', zaloUserId: '' };

function ZaloOACard({ status, onRefresh }) {
    const redirectUri = 'https://admin.kientrucsct.com/api/auth/zalo-oa/callback';
    const oauthUrl = `https://oauth.zaloapp.com/v4/oa/permission?app_id=${ZALO_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}`;

    const [refreshing, setRefreshing] = useState(false);

    const handleRefreshToken = async () => {
        setRefreshing(true);
        try {
            const res = await fetch('/api/cron/refresh-zalo-token', {
                headers: { 'x-cron-secret': 'noithatsct-cron-2026' },
            });
            const data = await res.json();
            if (data.success) {
                alert('Token đã được làm mới thành công!');
                onRefresh();
            } else {
                alert('Lỗi: ' + (data.error || 'Không thể làm mới token'));
            }
        } finally {
            setRefreshing(false);
        }
    };

    const isExpiringSoon = status?.expiresAt && (() => {
        const expires = new Date(status.expiresAt);
        const daysLeft = Math.ceil((expires - Date.now()) / 86400000);
        return daysLeft <= 7;
    })();

    const expiresDisplay = status?.expiresAt
        ? new Date(status.expiresAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : null;

    return (
        <div className="card" style={{ marginBottom: 20, borderLeft: `4px solid ${status?.connected ? '#22c55e' : '#f59e0b'}` }}>
            <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: status?.connected ? '#dcfce7' : '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                        💬
                    </div>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
                            Zalo OA
                            <span style={{
                                padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                                background: status?.connected ? '#dcfce7' : '#fef3c7',
                                color: status?.connected ? '#16a34a' : '#d97706',
                            }}>
                                {status === null ? 'Đang kiểm tra...' : status.connected ? '● Đã kết nối' : '○ Chưa kết nối'}
                            </span>
                            {status?.connected && isExpiringSoon && (
                                <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: '#fee2e2', color: '#dc2626' }}>
                                    ⚠️ Sắp hết hạn
                                </span>
                            )}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                            {status?.connected
                                ? `Token hết hạn: ${expiresDisplay || 'Không rõ'}${status.updatedAt ? ` · Cập nhật: ${new Date(status.updatedAt).toLocaleDateString('vi-VN')}` : ''}`
                                : 'Cần kết nối để gửi thông báo Zalo tự động cho nhân viên'}
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    {status?.connected && (
                        <button
                            className="btn btn-sm"
                            onClick={handleRefreshToken}
                            disabled={refreshing}
                            title="Làm mới token mà không cần OAuth lại"
                        >
                            {refreshing ? 'Đang làm mới...' : '🔄 Làm mới token'}
                        </button>
                    )}
                    <a
                        href={oauthUrl}
                        className="btn btn-sm btn-primary"
                        style={{ textDecoration: 'none' }}
                    >
                        {status?.connected ? '🔗 Kết nối lại' : '🔗 Kết nối Zalo OA'}
                    </a>
                </div>
            </div>
        </div>
    );
}

export default function AccountsPage() {
    const { role } = useRole();
    const router = useRouter();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [filterRole, setFilterRole] = useState('');
    const [showInactive, setShowInactive] = useState(false);
    const [resetPwTarget, setResetPwTarget] = useState(null);
    const [newPassword, setNewPassword] = useState('');
    const [zaloStatus, setZaloStatus] = useState(null);

    useEffect(() => {
        if (role && role !== 'ban_gd' && role !== 'giam_doc' && role !== 'pho_gd') {
            router.replace('/hr');
        }
    }, [role]);

    const fetchZaloStatus = async () => {
        try {
            const res = await fetch('/api/notifications/zalo-status');
            if (res.ok) setZaloStatus(await res.json());
        } catch {}
    };

    const fetchUsers = async () => {
        setLoading(true);
        const res = await fetch(`/api/users?includeInactive=${showInactive}`);
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : []);
        setLoading(false);
    };

    useEffect(() => { fetchUsers(); }, [showInactive]);
    useEffect(() => { fetchZaloStatus(); }, []);

    const filtered = users.filter(u => {
        if (filterRole && u.role !== filterRole) return false;
        if (search && !u.name.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    const openAdd = () => {
        setEditTarget(null);
        setForm(EMPTY_FORM);
        setShowModal(true);
    };

    const openEdit = (u) => {
        setEditTarget(u);
        setForm({ name: u.name, email: u.email, password: '', role: u.role, department: u.department || '', phone: u.phone || '', zaloUserId: u.zaloUserId || '' });
        setShowModal(true);
    };

    const handleSubmit = async () => {
        if (!form.name.trim()) return alert('Vui lòng nhập tên');
        if (!editTarget && !form.email.trim()) return alert('Vui lòng nhập email');
        if (!editTarget && !form.password.trim()) return alert('Vui lòng nhập mật khẩu');
        setSaving(true);
        try {
            if (editTarget) {
                const body = { name: form.name, role: form.role, department: form.department, phone: form.phone, zaloUserId: form.zaloUserId };
                if (form.password.trim()) body.password = form.password;
                const res = await fetch(`/api/users/${editTarget.id}`, {
                    method: 'PUT', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                });
                if (!res.ok) { const e = await res.json(); return alert(e.error || 'Lỗi cập nhật'); }
            } else {
                const res = await fetch('/api/users', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(form),
                });
                if (!res.ok) { const e = await res.json(); return alert(e.error || 'Lỗi tạo tài khoản'); }
            }
            setShowModal(false);
            fetchUsers();
        } finally {
            setSaving(false);
        }
    };

    const toggleActive = async (u) => {
        const action = u.active ? 'Vô hiệu hóa' : 'Kích hoạt';
        if (!confirm(`${action} tài khoản "${u.name}"?`)) return;
        await fetch(`/api/users/${u.id}`, {
            method: u.active ? 'DELETE' : 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: u.active ? undefined : JSON.stringify({ active: true }),
        });
        fetchUsers();
    };

    const handleDelete = async (u) => {
        if (!confirm(`Xóa vĩnh viễn tài khoản "${u.name}" (${u.email})?\n\nHành động này không thể hoàn tác!`)) return;
        const res = await fetch(`/api/users/${u.id}?permanent=true`, { method: 'DELETE' });
        if (!res.ok) { const e = await res.json(); return alert(e.error || 'Lỗi xóa tài khoản'); }
        fetchUsers();
    };

    const handleResetPassword = async () => {
        if (!newPassword.trim() || newPassword.length < 6) return alert('Mật khẩu tối thiểu 6 ký tự');
        const res = await fetch(`/api/users/${resetPwTarget.id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: newPassword }),
        });
        if (!res.ok) { const e = await res.json(); return alert(e.error || 'Lỗi'); }
        setResetPwTarget(null);
        setNewPassword('');
        alert('Đã đổi mật khẩu thành công');
    };

    const activeCount = users.filter(u => u.active).length;
    const roleCount = {};
    for (const u of users) { if (u.active) roleCount[u.role] = (roleCount[u.role] || 0) + 1; }

    return (
        <div>
            {/* Stats */}
            <div className="stats-grid" style={{ marginBottom: 20 }}>
                <div className="stat-card">
                    <div className="stat-icon">👤</div>
                    <div>
                        <div className="stat-value">{activeCount}</div>
                        <div className="stat-label">Tài khoản hoạt động</div>
                    </div>
                </div>
                {ROLES.map(r => roleCount[r.key] ? (
                    <div key={r.key} className="stat-card">
                        <div className="stat-icon">{r.icon}</div>
                        <div>
                            <div className="stat-value">{roleCount[r.key]}</div>
                            <div className="stat-label">{r.label}</div>
                        </div>
                    </div>
                ) : null)}
            </div>

            {/* Zalo OA Connection Card */}
            <ZaloOACard status={zaloStatus} onRefresh={fetchZaloStatus} />

            <div className="card">
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <span className="card-title">Danh sách tài khoản</span>
                    <button className="btn btn-primary" onClick={openAdd}>+ Tạo tài khoản</button>
                </div>

                {/* Filters */}
                <div className="filter-bar">
                    <input
                        type="text" className="form-input" placeholder="🔍 Tìm tên hoặc email..."
                        value={search} onChange={e => setSearch(e.target.value)}
                        style={{ flex: 1, minWidth: 0 }}
                    />
                    <select className="form-select" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
                        <option value="">Tất cả vai trò</option>
                        {ROLES.map(r => <option key={r.key} value={r.key}>{r.icon} {r.label}</option>)}
                    </select>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
                        Hiện tài khoản đã khóa
                    </label>
                </div>

                {/* Desktop table */}
                <div className="desktop-table-view">
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Tên</th>
                                    <th>Email</th>
                                    <th>Phòng ban</th>
                                    <th>Vai trò</th>
                                    <th>Trạng thái</th>
                                    <th style={{ textAlign: 'right' }}>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>Đang tải...</td></tr>
                                ) : filtered.length === 0 ? (
                                    <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>Không có tài khoản nào</td></tr>
                                ) : filtered.map(u => {
                                    const rc = ROLE_COLORS[u.role] || { color: '#6b7280', bg: '#f3f4f6' };
                                    const ri = ROLES.find(r => r.key === u.role);
                                    return (
                                        <tr key={u.id} style={{ opacity: u.active ? 1 : 0.5 }}>
                                            <td className="primary">
                                                <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    {u.name}
                                                    {u.zaloUserId && <span title="Đã liên kết Zalo" style={{ fontSize: 14 }}>💬</span>}
                                                </div>
                                            </td>
                                            <td style={{ fontSize: 13 }}>{u.email}</td>
                                            <td>
                                                <span style={{ padding: '3px 10px', borderRadius: 20, background: rc.bg, color: rc.color, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
                                                    {ri?.icon} {ri?.label || u.role}
                                                </span>
                                            </td>
                                            <td style={{ fontSize: 13 }}>{u.department || '—'}</td>
                                            <td>
                                                <span className={`badge ${u.active ? 'badge-success' : 'badge-default'}`}>
                                                    {u.active ? 'Hoạt động' : 'Đã khóa'}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                                    <button className="btn btn-sm" onClick={() => openEdit(u)}>Sửa</button>
                                                    <button className="btn btn-sm" onClick={() => { setResetPwTarget(u); setNewPassword(''); }}>Đổi MK</button>
                                                    <button
                                                        className={`btn btn-sm ${u.active ? 'btn-danger' : 'btn-success'}`}
                                                        onClick={() => toggleActive(u)}
                                                    >
                                                        {u.active ? 'Khóa' : 'Mở khóa'}
                                                    </button>
                                                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(u)} title="Xóa vĩnh viễn">
                                                        Xóa
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Mobile cards */}
                <div className="mobile-card-list">
                    {filtered.map(u => {
                        const rc = ROLE_COLORS[u.role] || { color: '#6b7280', bg: '#f3f4f6' };
                        const ri = ROLES.find(r => r.key === u.role);
                        return (
                            <div key={u.id} className="mobile-card-item" style={{ opacity: u.active ? 1 : 0.5 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                    <div>
                                        <div className="card-title">{u.name}</div>
                                        <div className="card-subtitle">{u.email}</div>
                                    </div>
                                    <span style={{ padding: '3px 9px', borderRadius: 20, background: rc.bg, color: rc.color, fontSize: 11, fontWeight: 600 }}>
                                        {ri?.icon} {ri?.label || u.role}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                    <button className="btn btn-sm" onClick={() => openEdit(u)}>Sửa</button>
                                    <button className="btn btn-sm" onClick={() => { setResetPwTarget(u); setNewPassword(''); }}>Đổi MK</button>
                                    <button className={`btn btn-sm ${u.active ? 'btn-danger' : 'btn-success'}`} onClick={() => toggleActive(u)}>
                                        {u.active ? 'Khóa' : 'Mở khóa'}
                                    </button>
                                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(u)}>Xóa</button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Modal tạo / sửa */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
                        <div className="modal-header">
                            <h3>{editTarget ? 'Sửa tài khoản' : 'Tạo tài khoản mới'}</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div>
                                <label className="form-label">Họ và tên *</label>
                                <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nguyễn Văn A" />
                            </div>
                            {!editTarget && (
                                <div>
                                    <label className="form-label">Email *</label>
                                    <input className="form-input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@kientrucsct.com" />
                                </div>
                            )}
                            {editTarget && (
                                <div>
                                    <label className="form-label">Email</label>
                                    <input className="form-input" value={editTarget.email} disabled style={{ opacity: 0.6 }} />
                                </div>
                            )}
                            {!editTarget && (
                                <div>
                                    <label className="form-label">Mật khẩu *</label>
                                    <input className="form-input" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Tối thiểu 6 ký tự" />
                                </div>
                            )}
                            <div>
                                <label className="form-label">Phòng ban *</label>
                                <select className="form-select" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                                    {ROLES.map(r => (
                                        <option key={r.key} value={r.key}>{r.icon} {r.label}</option>
                                    ))}
                                </select>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                                    {form.role === 'ban_gd'        && '→ Toàn quyền truy cập hệ thống'}
                                    {form.role === 'kinh_doanh'    && '→ Portal Kinh doanh (dashboard riêng)'}
                                    {form.role === 'xuong'         && '→ Portal Xưởng nội thất (dashboard riêng)'}
                                    {form.role === 'xay_dung'      && '→ Giao diện admin — dự án, phiếu CV, vật tư'}
                                    {form.role === 'thiet_ke'      && '→ Giao diện admin — dự án, báo giá, thiết kế'}
                                    {form.role === 'marketing'     && '→ Giao diện admin — khách hàng, pipeline, báo giá'}
                                    {form.role === 'hanh_chinh_kt' && '→ Giao diện admin — tài chính, kế toán đầy đủ'}
                                </div>
                            </div>
                            <div>
                                <label className="form-label">Vai trò</label>
                                <select className="form-select" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}>
                                    <option value="">— Chọn vai trò —</option>
                                    <option>Trưởng phòng</option>
                                    <option>Phó phòng</option>
                                    <option>Nhân viên</option>
                                    <option>Quản lý</option>
                                    <option>Thợ chính</option>
                                    <option>Thợ phụ</option>
                                </select>
                            </div>
                            <div>
                                <label className="form-label">Số điện thoại</label>
                                <input className="form-input" type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="0901 234 567" />
                            </div>
                            <div>
                                <label className="form-label">Zalo User ID <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 12 }}>(để nhận thông báo tự động)</span></label>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <input className="form-input" value={form.zaloUserId} onChange={e => setForm(f => ({ ...f, zaloUserId: e.target.value }))} placeholder="VD: 1234567890" style={{ flex: 1 }} />
                                    {editTarget && form.zaloUserId && (
                                        <button
                                            type="button"
                                            className="btn btn-sm"
                                            style={{ whiteSpace: 'nowrap' }}
                                            onClick={async () => {
                                                const res = await fetch('/api/notifications/zalo-test', {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({ zaloUserId: form.zaloUserId }),
                                                });
                                                if (res.ok) alert('Đã gửi tin nhắn test thành công!');
                                                else { const e = await res.json(); alert('Lỗi: ' + (e.error || 'Không gửi được')); }
                                            }}
                                        >
                                            Test Zalo
                                        </button>
                                    )}
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                                    Nhân viên cần <strong>follow Zalo OA</strong> của công ty trước, rồi nhắn bất kỳ để lấy User ID.
                                </div>
                            </div>
                            {editTarget && (
                                <div>
                                    <label className="form-label">Mật khẩu mới (để trống nếu không đổi)</label>
                                    <input className="form-input" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Để trống nếu không thay đổi" />
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn" onClick={() => setShowModal(false)}>Hủy</button>
                            <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
                                {saving ? 'Đang lưu...' : editTarget ? 'Cập nhật' : 'Tạo tài khoản'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal đổi mật khẩu */}
            {resetPwTarget && (
                <div className="modal-overlay" onClick={() => setResetPwTarget(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
                        <div className="modal-header">
                            <h3>Đổi mật khẩu</h3>
                            <button className="modal-close" onClick={() => setResetPwTarget(null)}>×</button>
                        </div>
                        <div className="modal-body">
                            <p style={{ marginBottom: 12, fontSize: 14 }}>
                                Đổi mật khẩu cho <strong>{resetPwTarget.name}</strong>
                            </p>
                            <label className="form-label">Mật khẩu mới *</label>
                            <input
                                className="form-input" type="password"
                                value={newPassword} onChange={e => setNewPassword(e.target.value)}
                                placeholder="Tối thiểu 6 ký tự"
                                autoFocus
                            />
                        </div>
                        <div className="modal-footer">
                            <button className="btn" onClick={() => setResetPwTarget(null)}>Hủy</button>
                            <button className="btn btn-primary" onClick={handleResetPassword}>Xác nhận</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
