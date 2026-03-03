'use client';
import { useState, useEffect } from 'react';

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';

const STATUS_OPTS = ['Đang làm', 'Nghỉ phép', 'Nghỉ việc'];
const STATUS_COLOR = { 'Đang làm': 'badge-success', 'Nghỉ phép': 'badge-warning', 'Nghỉ việc': 'badge-default' };

const EMPTY_FORM = { name: '', position: '', phone: '', email: '', salary: '', departmentId: '', status: 'Đang làm', joinDate: '' };

export default function HRPage() {
    const [data, setData] = useState({ employees: [], departments: [] });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterDept, setFilterDept] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editTarget, setEditTarget] = useState(null); // employee object being edited
    const [form, setForm] = useState(EMPTY_FORM);

    const fetchData = async () => {
        setLoading(true);
        const p = new URLSearchParams({ limit: 1000 });
        if (filterDept) p.set('departmentId', filterDept);
        const res = await fetch(`/api/employees?${p}`);
        const d = await res.json();
        setData({ employees: d.data || [], departments: d.departments || [] });
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, [filterDept]);

    const openAdd = () => {
        setEditTarget(null);
        setForm({ ...EMPTY_FORM, departmentId: data.departments[0]?.id || '' });
        setShowModal(true);
    };

    const openEdit = (e) => {
        setEditTarget(e);
        setForm({
            name: e.name, position: e.position, phone: e.phone,
            email: e.email, salary: e.salary, departmentId: e.departmentId,
            status: e.status, joinDate: e.joinDate ? e.joinDate.split('T')[0] : '',
        });
        setShowModal(true);
    };

    const handleSubmit = async () => {
        const joinDate = form.joinDate ? new Date(form.joinDate).toISOString() : null;
        const payload = { ...form, salary: Number(form.salary) || 0, joinDate };
        if (editTarget) {
            await fetch(`/api/employees/${editTarget.id}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
        } else {
            await fetch('/api/employees', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
        }
        setShowModal(false);
        fetchData();
    };

    const handleDelete = async (id) => {
        if (!confirm('Xóa nhân viên này?')) return;
        await fetch(`/api/employees/${id}`, { method: 'DELETE' });
        fetchData();
    };

    const allEmployees = data.employees;
    const filtered = allEmployees.filter(e => {
        if (filterStatus && e.status !== filterStatus) return false;
        if (search && !e.name.toLowerCase().includes(search.toLowerCase()) && !e.code.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    const activeCount = allEmployees.filter(e => e.status === 'Đang làm').length;
    const onLeaveCount = allEmployees.filter(e => e.status === 'Nghỉ phép').length;
    const totalPayroll = allEmployees.filter(e => e.status === 'Đang làm').reduce((s, e) => s + (e.salary || 0), 0);

    return (
        <div>
            {/* KPI cards */}
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', marginBottom: 24 }}>
                <div className="stat-card">
                    <div className="stat-icon">👥</div>
                    <div>
                        <div className="stat-value">{allEmployees.length}</div>
                        <div className="stat-label">Tổng nhân sự</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">✅</div>
                    <div>
                        <div className="stat-value" style={{ color: 'var(--status-success)' }}>{activeCount}</div>
                        <div className="stat-label">Đang làm việc</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">🏖️</div>
                    <div>
                        <div className="stat-value" style={{ color: 'var(--status-warning)' }}>{onLeaveCount}</div>
                        <div className="stat-label">Nghỉ phép</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">💵</div>
                    <div>
                        <div className="stat-value" style={{ color: 'var(--accent-primary)', fontSize: 16 }}>{fmt(totalPayroll)}</div>
                        <div className="stat-label">Quỹ lương / tháng</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">🏢</div>
                    <div>
                        <div className="stat-value">{data.departments.length}</div>
                        <div className="stat-label">Phòng ban</div>
                    </div>
                </div>
            </div>

            {/* Department cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
                {data.departments.map(d => (
                    <div
                        key={d.id}
                        className="card"
                        style={{ padding: '12px 16px', cursor: 'pointer', border: filterDept === d.id ? '2px solid var(--accent-primary)' : '2px solid transparent' }}
                        onClick={() => setFilterDept(filterDept === d.id ? '' : d.id)}
                    >
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{d.name}</div>
                        <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--accent-primary)', lineHeight: 1.2, marginTop: 4 }}>{d._count?.employees || 0}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>nhân viên</div>
                    </div>
                ))}
            </div>

            {/* Employee table */}
            <div className="card">
                <div className="card-header">
                    <h3>Nhân viên {filtered.length !== allEmployees.length && `(${filtered.length}/${allEmployees.length})`}</h3>
                    <button className="btn btn-primary" onClick={openAdd}>+ Thêm NV</button>
                </div>
                <div className="filter-bar" style={{ display: 'flex', gap: 10, padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
                    <input
                        type="text" className="form-input" placeholder="Tìm theo tên, mã..."
                        value={search} onChange={e => setSearch(e.target.value)}
                        style={{ maxWidth: 220 }}
                    />
                    <select className="form-select" style={{ width: 160 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                        <option value="">Tất cả trạng thái</option>
                        {STATUS_OPTS.map(s => <option key={s}>{s}</option>)}
                    </select>
                    {(filterDept || filterStatus || search) && (
                        <button className="btn btn-ghost btn-sm" onClick={() => { setFilterDept(''); setFilterStatus(''); setSearch(''); }}>
                            Xóa bộ lọc
                        </button>
                    )}
                </div>
                {loading ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
                ) : (
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Mã</th><th>Họ tên</th><th>Chức vụ</th><th>Phòng ban</th>
                                    <th>SĐT</th><th>Lương</th><th>Ngày vào</th><th>TT</th><th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(e => (
                                    <tr key={e.id}>
                                        <td className="accent">{e.code}</td>
                                        <td className="primary" style={{ cursor: 'pointer' }} onClick={() => openEdit(e)}>{e.name}</td>
                                        <td style={{ fontSize: 13 }}>{e.position}</td>
                                        <td><span className="badge badge-info">{e.department?.name}</span></td>
                                        <td style={{ fontSize: 13 }}>{e.phone}</td>
                                        <td style={{ fontWeight: 600 }}>{fmt(e.salary)}</td>
                                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmtDate(e.joinDate)}</td>
                                        <td>
                                            <span className={`badge ${STATUS_COLOR[e.status] || 'badge-default'}`}>{e.status}</span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 4 }}>
                                                <button className="btn btn-ghost btn-sm" onClick={() => openEdit(e)}>✏️</button>
                                                <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(e.id)}>🗑️</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            {filtered.length > 0 && (
                                <tfoot>
                                    <tr>
                                        <td colSpan={5} style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 16px' }}>
                                            {filtered.length} nhân viên
                                        </td>
                                        <td style={{ fontWeight: 700, padding: '8px 16px' }}>
                                            {fmt(filtered.filter(e => e.status === 'Đang làm').reduce((s, e) => s + (e.salary || 0), 0))}
                                        </td>
                                        <td colSpan={3} />
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                )}
                {!loading && filtered.length === 0 && (
                    <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Không có nhân viên</div>
                )}
            </div>

            {/* Modal thêm / sửa */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
                        <div className="modal-header">
                            <h3>{editTarget ? `Sửa — ${editTarget.name}` : 'Thêm nhân viên'}</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Họ tên *</label>
                                <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Chức vụ</label>
                                    <input className="form-input" value={form.position} onChange={e => setForm({ ...form, position: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Phòng ban</label>
                                    <select className="form-select" value={form.departmentId} onChange={e => setForm({ ...form, departmentId: e.target.value })}>
                                        {data.departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">SĐT</label>
                                    <input className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Email</label>
                                    <input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Lương (VND)</label>
                                    <input className="form-input" type="number" value={form.salary} onChange={e => setForm({ ...form, salary: e.target.value })} />
                                    {Number(form.salary) > 0 && <div style={{ fontSize: 11, color: 'var(--accent-primary)', marginTop: 2 }}>{fmt(Number(form.salary))}</div>}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Ngày vào làm</label>
                                    <input className="form-input" type="date" value={form.joinDate} onChange={e => setForm({ ...form, joinDate: e.target.value })} />
                                </div>
                            </div>
                            {editTarget && (
                                <div className="form-group">
                                    <label className="form-label">Trạng thái</label>
                                    <select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                                        {STATUS_OPTS.map(s => <option key={s}>{s}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Hủy</button>
                            <button className="btn btn-primary" onClick={handleSubmit} disabled={!form.name.trim()}>
                                {editTarget ? 'Cập nhật' : 'Thêm mới'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
