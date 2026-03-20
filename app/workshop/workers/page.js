'use client';
import { useState, useEffect } from 'react';

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
const todayStr = () => new Date().toISOString().split('T')[0];

const STATUS_OPTS = ['Hoạt động', 'Tạm nghỉ', 'Nghỉ việc'];
const STATUS_COLOR = { 'Hoạt động': '#16a34a', 'Tạm nghỉ': '#d97706', 'Nghỉ việc': '#6b7280' };
const STATUS_BG   = { 'Hoạt động': '#dcfce7', 'Tạm nghỉ': '#fef3c7', 'Nghỉ việc': '#f3f4f6' };

const EMPTY_FORM = { name: '', skill: '', phone: '', hourlyRate: '', status: 'Hoạt động', notes: '' };

export default function WorkersPage() {
    const [workers, setWorkers] = useState([]);
    const [workerTasks, setWorkerTasks] = useState({}); // workerId → tasks
    const [attendance, setAttendance] = useState([]); // today's attendance
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [attendTarget, setAttendTarget] = useState(null); // worker to record attendance
    const [attendForm, setAttendForm] = useState({ date: todayStr(), hoursWorked: 8, notes: '' });

    const fetchAll = async () => {
        setLoading(true);
        const [wRes, aRes, tRes] = await Promise.all([
            fetch('/api/workshop/workers'),
            fetch(`/api/workshop/attendance?date=${todayStr()}`),
            fetch('/api/workshop/tasks?status=Đang làm'),
        ]);
        const [w, a, t] = await Promise.all([wRes.json(), aRes.json(), tRes.json()]);
        setWorkers(Array.isArray(w) ? w : []);
        setAttendance(Array.isArray(a) ? a : []);
        // Map tasks to workers
        const taskMap = {};
        if (Array.isArray(t)) {
            t.forEach(task => {
                task.workers?.forEach(tw => {
                    if (!taskMap[tw.workerId]) taskMap[tw.workerId] = [];
                    taskMap[tw.workerId].push(task);
                });
            });
        }
        setWorkerTasks(taskMap);
        setLoading(false);
    };

    useEffect(() => { fetchAll(); }, []);

    const openAdd = () => { setEditTarget(null); setForm(EMPTY_FORM); setShowModal(true); };
    const openEdit = (w) => {
        setEditTarget(w);
        setForm({ name: w.name, skill: w.skill, phone: w.phone, hourlyRate: w.hourlyRate, status: w.status, notes: w.notes });
        setShowModal(true);
    };

    const handleSubmit = async () => {
        if (!form.name.trim()) return;
        setSaving(true);
        try {
            const payload = { ...form, hourlyRate: Number(form.hourlyRate) || 0 };
            const url = editTarget ? `/api/workshop/workers/${editTarget.id}` : '/api/workshop/workers';
            await fetch(url, { method: editTarget ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            setShowModal(false);
            fetchAll();
        } finally { setSaving(false); }
    };

    const handleDelete = async () => {
        await fetch(`/api/workshop/workers/${deleteTarget.id}`, { method: 'DELETE' });
        setDeleteTarget(null);
        fetchAll();
    };

    const openAttend = (w) => {
        const existing = attendance.find(a => a.workerId === w.id);
        setAttendTarget(w);
        setAttendForm({ date: todayStr(), hoursWorked: existing?.hoursWorked ?? 8, notes: existing?.notes ?? '' });
    };

    const handleAttend = async () => {
        await fetch('/api/workshop/attendance', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ workerId: attendTarget.id, ...attendForm }),
        });
        setAttendTarget(null);
        fetchAll();
    };

    const filtered = workers.filter(w =>
        !search || w.name.toLowerCase().includes(search.toLowerCase()) ||
        w.skill?.toLowerCase().includes(search.toLowerCase())
    );

    const activeCount = workers.filter(w => w.status === 'Hoạt động').length;
    const attendedToday = attendance.length;
    const totalHoursToday = attendance.reduce((s, a) => s + a.hoursWorked, 0);
    const totalCostToday = attendance.reduce((s, a) => s + a.hoursWorked * (a.worker?.hourlyRate || 0), 0);
    const monthlyPayroll = workers.filter(w => w.status === 'Hoạt động').reduce((s, w) => s + w.hourlyRate * 8 * 26, 0);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* KPI */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14 }}>
                <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #2563eb' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>👷 Nhân công hoạt động</div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: '#2563eb' }}>{activeCount}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>/ {workers.length} tổng cộng</div>
                </div>
                <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #16a34a' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>✅ Chấm công hôm nay</div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: '#16a34a' }}>{attendedToday}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{totalHoursToday} giờ làm việc</div>
                </div>
                <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #f59e0b' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>💵 Chi phí hôm nay</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#f59e0b' }}>{new Intl.NumberFormat('vi-VN').format(Math.round(totalCostToday / 1000))}k</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Theo giờ × đơn giá</div>
                </div>
                <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #8b5cf6' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>📅 Quỹ lương/tháng</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#8b5cf6' }}>{new Intl.NumberFormat('vi-VN').format(Math.round(monthlyPayroll / 1e6))}tr</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>8h × 26 ngày</div>
                </div>
            </div>

            <div className="card">
                <div className="card-header">
                    <h3>Danh sách nhân công</h3>
                    <button className="btn btn-primary" onClick={openAdd}>+ Thêm thợ</button>
                </div>
                <div className="filter-bar" style={{ borderBottom: '1px solid var(--border)' }}>
                    <input className="form-input" placeholder="🔍 Tìm theo tên, tay nghề..."
                        value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 0 }} />
                </div>

                {loading ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
                ) : (
                    <>
                    {/* Desktop table */}
                    <div className="desktop-table-view">
                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Họ tên</th>
                                        <th>Tay nghề</th>
                                        <th>SĐT</th>
                                        <th>Đơn giá/giờ</th>
                                        <th>Việc hiện tại</th>
                                        <th>Hôm nay</th>
                                        <th>Trạng thái</th>
                                        <th style={{ textAlign: 'right' }}>Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map(w => {
                                        const todayRecord = attendance.find(a => a.workerId === w.id);
                                        const currentTasks = workerTasks[w.id] || [];
                                        return (
                                            <tr key={w.id}>
                                                <td>
                                                    <div style={{ fontWeight: 600, fontSize: 13 }}>{w.name}</div>
                                                </td>
                                                <td style={{ fontSize: 12 }}>{w.skill || '—'}</td>
                                                <td style={{ fontSize: 12 }}>{w.phone || '—'}</td>
                                                <td style={{ fontWeight: 600, fontSize: 13 }}>
                                                    {w.hourlyRate > 0 ? `${new Intl.NumberFormat('vi-VN').format(w.hourlyRate)}đ/h` : '—'}
                                                </td>
                                                <td style={{ fontSize: 12 }}>
                                                    {currentTasks.length > 0
                                                        ? <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                            {currentTasks.slice(0, 2).map(t => (
                                                                <span key={t.id} style={{ padding: '1px 6px', borderRadius: 8, background: '#dbeafe', color: '#1d4ed8', fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 140 }}>{t.title}</span>
                                                            ))}
                                                            {currentTasks.length > 2 && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>+{currentTasks.length - 2} việc</span>}
                                                          </div>
                                                        : <span style={{ color: 'var(--text-muted)' }}>Rảnh</span>
                                                    }
                                                </td>
                                                <td>
                                                    {todayRecord ? (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                            <span style={{ padding: '2px 8px', borderRadius: 20, background: '#dcfce7', color: '#15803d', fontSize: 12, fontWeight: 600 }}>
                                                                ✓ {todayRecord.hoursWorked}h
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        w.status === 'Hoạt động'
                                                            ? <span style={{ color: '#dc2626', fontSize: 12 }}>Chưa chấm</span>
                                                            : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                                                    )}
                                                </td>
                                                <td>
                                                    <span style={{ padding: '3px 9px', borderRadius: 20, background: STATUS_BG[w.status] || '#f3f4f6', color: STATUS_COLOR[w.status] || '#6b7280', fontSize: 12, fontWeight: 600 }}>
                                                        {w.status}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                                                        {w.status === 'Hoạt động' && (
                                                            <button className="btn btn-sm" style={{ background: todayRecord ? '#dcfce7' : '#dbeafe', color: todayRecord ? '#15803d' : '#1d4ed8', border: 'none', fontWeight: 600 }} onClick={() => openAttend(w)}>
                                                                {todayRecord ? '✓ Chấm' : '+ Chấm'}
                                                            </button>
                                                        )}
                                                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(w)}>✏️</button>
                                                        <button className="btn btn-ghost btn-sm" onClick={() => setDeleteTarget(w)} style={{ color: 'var(--status-danger)' }}>🗑️</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {filtered.length === 0 && (
                                        <tr><td colSpan={8} style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>Chưa có nhân công nào</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Mobile */}
                    <div className="mobile-card-list">
                        {filtered.map(w => {
                            const todayRecord = attendance.find(a => a.workerId === w.id);
                            const currentTasks = workerTasks[w.id] || [];
                            return (
                                <div key={w.id} className="mobile-card-item">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <div>
                                            <div className="card-title">{w.name}</div>
                                            <div className="card-subtitle">{w.skill || 'Chưa ghi tay nghề'} · {w.phone || '—'}</div>
                                        </div>
                                        <span style={{ padding: '3px 9px', borderRadius: 20, background: STATUS_BG[w.status], color: STATUS_COLOR[w.status], fontSize: 11, fontWeight: 600, height: 'fit-content' }}>
                                            {w.status}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8 }}>
                                        <span style={{ color: 'var(--text-muted)' }}>{w.hourlyRate > 0 ? `${new Intl.NumberFormat('vi-VN').format(w.hourlyRate)}đ/h` : 'Chưa có đơn giá'}</span>
                                        {todayRecord
                                            ? <span style={{ color: '#15803d', fontWeight: 600 }}>✓ {todayRecord.hoursWorked}h hôm nay</span>
                                            : <span style={{ color: '#dc2626' }}>Chưa chấm công</span>}
                                    </div>
                                    {currentTasks.length > 0 && (
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
                                            Đang làm: {currentTasks.map(t => t.title).join(', ')}
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        {w.status === 'Hoạt động' && <button className="btn btn-sm" onClick={() => openAttend(w)}>{todayRecord ? '✓ Cập nhật' : '+ Chấm công'}</button>}
                                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(w)}>✏️</button>
                                        <button className="btn btn-ghost btn-sm" onClick={() => setDeleteTarget(w)} style={{ color: 'var(--status-danger)' }}>🗑️</button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    </>
                )}
            </div>

            {/* Modal thêm/sửa */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
                        <div className="modal-header">
                            <h3>{editTarget ? `Sửa — ${editTarget.name}` : 'Thêm nhân công'}</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Họ tên *</label>
                                <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nguyễn Văn A" />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Tay nghề</label>
                                    <input className="form-input" value={form.skill} onChange={e => setForm(f => ({ ...f, skill: e.target.value }))} placeholder="VD: Thợ mộc, Thợ sơn..." />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">SĐT</label>
                                    <input className="form-input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Đơn giá / giờ (VND)</label>
                                    <input className="form-input" type="number" value={form.hourlyRate} onChange={e => setForm(f => ({ ...f, hourlyRate: e.target.value }))} placeholder="0" />
                                    {Number(form.hourlyRate) > 0 && (
                                        <div style={{ fontSize: 11, color: '#8b5cf6', marginTop: 3 }}>
                                            ≈ {new Intl.NumberFormat('vi-VN').format(Number(form.hourlyRate) * 8 * 26)}đ/tháng
                                        </div>
                                    )}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Trạng thái</label>
                                    <select className="form-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                                        {STATUS_OPTS.map(s => <option key={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Ghi chú</label>
                                <textarea className="form-input" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Hủy</button>
                            <button className="btn btn-primary" onClick={handleSubmit} disabled={saving || !form.name.trim()}>
                                {saving ? 'Đang lưu...' : editTarget ? 'Cập nhật' : 'Thêm mới'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal chấm công */}
            {attendTarget && (
                <div className="modal-overlay" onClick={() => setAttendTarget(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
                        <div className="modal-header">
                            <h3>Chấm công — {attendTarget.name}</h3>
                            <button className="modal-close" onClick={() => setAttendTarget(null)}>×</button>
                        </div>
                        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div className="form-group">
                                <label className="form-label">Ngày</label>
                                <input className="form-input" type="date" value={attendForm.date} onChange={e => setAttendForm(f => ({ ...f, date: e.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Số giờ làm việc</label>
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                    {[4, 6, 8, 10, 12].map(h => (
                                        <button key={h} type="button" onClick={() => setAttendForm(f => ({ ...f, hoursWorked: h }))}
                                            style={{ padding: '6px 16px', borderRadius: 8, border: '2px solid', cursor: 'pointer', fontWeight: 600,
                                                borderColor: attendForm.hoursWorked === h ? '#2563eb' : 'var(--border)',
                                                background: attendForm.hoursWorked === h ? '#2563eb' : 'transparent',
                                                color: attendForm.hoursWorked === h ? '#fff' : 'inherit' }}>
                                            {h}h
                                        </button>
                                    ))}
                                    <input type="number" min={0.5} max={24} step={0.5} value={attendForm.hoursWorked}
                                        onChange={e => setAttendForm(f => ({ ...f, hoursWorked: Number(e.target.value) }))}
                                        style={{ width: 70, padding: '6px 8px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }} />
                                </div>
                                {attendTarget.hourlyRate > 0 && (
                                    <div style={{ marginTop: 6, fontSize: 12, color: '#8b5cf6', fontWeight: 600 }}>
                                        Chi phí: {new Intl.NumberFormat('vi-VN').format(attendForm.hoursWorked * attendTarget.hourlyRate)}đ
                                    </div>
                                )}
                            </div>
                            <div className="form-group">
                                <label className="form-label">Ghi chú</label>
                                <input className="form-input" value={attendForm.notes} onChange={e => setAttendForm(f => ({ ...f, notes: e.target.value }))} placeholder="VD: Làm thêm giờ..." />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setAttendTarget(null)}>Hủy</button>
                            <button className="btn btn-primary" onClick={handleAttend}>Xác nhận chấm công</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm delete */}
            {deleteTarget && (
                <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 380 }}>
                        <div className="modal-header"><h3>Xóa nhân công</h3><button className="modal-close" onClick={() => setDeleteTarget(null)}>×</button></div>
                        <div className="modal-body"><p style={{ fontSize: 14 }}>Xóa <strong>{deleteTarget.name}</strong>? Hành động không thể hoàn tác.</p></div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>Hủy</button>
                            <button className="btn btn-danger" onClick={handleDelete}>Xóa</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
