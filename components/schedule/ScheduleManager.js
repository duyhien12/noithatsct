'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import ScheduleListView from './ScheduleListView';
import ScheduleGanttView from './ScheduleGanttView';
import TemplateImportModal from './TemplateImportModal';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(n);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';

export default function ScheduleManager({ projectId, projectCode, projectStartDate, onProgressUpdate }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [view, setView] = useState('list'); // list | gantt
    const [modal, setModal] = useState(null);
    const [alerts, setAlerts] = useState([]);
    const [addForm, setAddForm] = useState({ name: '', startDate: '', endDate: '', parentId: '', weight: 1, assignee: '' });
    const onProgressRef = useRef(onProgressUpdate);
    onProgressRef.current = onProgressUpdate;

    const fetchTasks = useCallback(async () => {
        try {
            const res = await fetch(`/api/schedule-tasks?projectId=${projectId}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const d = await res.json();
            setData(d);
            setError(null);
            if (onProgressRef.current) onProgressRef.current(d.totalProgress);
        } catch (err) {
            console.error('fetchTasks error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
        // Alerts (non-blocking)
        try {
            const alertRes = await fetch(`/api/schedule-tasks/alerts?projectId=${projectId}`);
            if (alertRes.ok) {
                const alertData = await alertRes.json();
                setAlerts(Array.isArray(alertData) ? alertData : []);
            }
        } catch { /* ignore alerts errors */ }
    }, [projectId]);

    useEffect(() => { fetchTasks(); }, [fetchTasks]);

    const addTask = async () => {
        if (!addForm.name.trim() || !addForm.startDate || !addForm.endDate) return;
        await fetch('/api/schedule-tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...addForm,
                projectId,
                weight: Number(addForm.weight) || 1,
                parentId: addForm.parentId || null,
            }),
        });
        setModal(null);
        setAddForm({ name: '', startDate: '', endDate: '', parentId: '', weight: 1, assignee: '' });
        fetchTasks();
    };

    const updateTask = async (taskId, updates) => {
        await fetch(`/api/schedule-tasks/${taskId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
        });
        fetchTasks();
    };

    const deleteTask = async (taskId) => {
        if (!confirm('Xóa hạng mục này và tất cả hạng mục con?')) return;
        await fetch(`/api/schedule-tasks/${taskId}`, { method: 'DELETE' });
        fetchTasks();
    };

    const saveBaseline = async () => {
        if (!confirm('Chốt tiến độ hiện tại làm Baseline? Dữ liệu cũ sẽ bị ghi đè.')) return;
        await fetch('/api/schedule-tasks/baseline', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId }),
        });
        fetchTasks();
    };

    const onImported = () => {
        setModal(null);
        fetchTasks();
    };

    if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải tiến độ...</div>;
    if (error) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--status-danger)' }}><div style={{ fontSize: 32, marginBottom: 8 }}>⚠️</div>Lỗi tải tiến độ: {error}<br /><button className="btn btn-ghost btn-sm" style={{ marginTop: 12 }} onClick={fetchTasks}>Thử lại</button></div>;

    const totalProgress = data?.totalProgress || 0;
    const flat = data?.flat || [];
    const tasks = data?.tasks || [];
    const overdueCount = flat.filter(t => t.status !== 'Hoàn thành' && new Date(t.endDate) < new Date()).length;
    const inProgressCount = flat.filter(t => t.status === 'Đang thi công').length;

    return (
        <div>
            {/* KPI Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
                <div className="stat-card" style={{ padding: 16, textAlign: 'center' }}>
                    <div style={{ fontSize: 28, fontWeight: 800, background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{totalProgress}%</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Tiến độ tổng</div>
                    <div className="progress-bar" style={{ marginTop: 8 }}><div className="progress-fill" style={{ width: `${totalProgress}%` }}></div></div>
                </div>
                <div className="stat-card" style={{ padding: 16, textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 700 }}>{flat.length}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Tổng hạng mục</div>
                </div>
                <div className="stat-card" style={{ padding: 16, textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent-primary)' }}>{inProgressCount}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Đang thi công</div>
                </div>
                <div className="stat-card" style={{ padding: 16, textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: overdueCount > 0 ? 'var(--status-danger)' : 'var(--status-success)' }}>{overdueCount}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Quá hạn</div>
                </div>
            </div>

            {/* Material Alerts */}
            {alerts.length > 0 && (
                <div style={{ marginBottom: 16, padding: '12px 16px', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--status-warning)', marginBottom: 8 }}>⚠️ Cảnh báo vật tư ({alerts.reduce((s, a) => s + a.alerts.length, 0)})</div>
                    {alerts.map(a => (
                        <div key={a.taskId} style={{ marginBottom: 6 }}>
                            <span style={{ fontSize: 12, fontWeight: 600 }}>{a.taskName}</span>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>bắt đầu {fmtDate(a.startDate)}</span>
                            {a.alerts.map((al, i) => (
                                <div key={i} style={{ paddingLeft: 16, fontSize: 11, color: al.type === 'danger' ? 'var(--status-danger)' : 'var(--status-warning)', marginTop: 2 }}>
                                    ⚠ {al.productName}: {al.message}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            )}

            {/* Toolbar */}
            <div className="card schedule-toolbar" style={{ padding: '10px 14px', marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    {/* View toggle */}
                    <div style={{ display: 'flex', gap: 6 }}>
                        <button className={`btn ${view === 'list' ? 'btn-primary' : 'btn-ghost'} btn-sm`} onClick={() => setView('list')}>
                            <span>📋</span><span className="schedule-btn-label"> Danh sách</span>
                        </button>
                        <button className={`btn ${view === 'gantt' ? 'btn-primary' : 'btn-ghost'} btn-sm`} onClick={() => setView('gantt')}>
                            <span>📊</span><span className="schedule-btn-label"> Gantt</span>
                        </button>
                    </div>
                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setModal('import')} title="Thêm từ Mẫu">
                            <span>📥</span><span className="schedule-btn-label"> Từ Mẫu</span>
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={saveBaseline} title="Chốt Tiến độ">
                            <span>📌</span><span className="schedule-btn-label"> Chốt</span>
                        </button>
                        <button className="btn btn-primary btn-sm" onClick={() => setModal('add')}>
                            + <span className="schedule-btn-label">Thêm hạng mục</span>
                        </button>
                        {projectCode && (
                            <span
                                className="badge info"
                                style={{ cursor: 'pointer', fontSize: 11 }}
                                title={`Copy link khách hàng: /progress/${projectCode}`}
                                onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/progress/${projectCode}`); }}
                            >🔗 /progress/{projectCode}</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Views */}
            {view === 'list' && (
                <ScheduleListView
                    tasks={tasks}
                    flat={flat}
                    projectId={projectId}
                    onUpdate={updateTask}
                    onDelete={deleteTask}
                    onRefresh={fetchTasks}
                />
            )}
            {view === 'gantt' && flat.length > 0 && (
                <ScheduleGanttView
                    tasks={tasks}
                    flat={flat}
                    onUpdate={updateTask}
                />
            )}

            {flat.length === 0 && (
                <div className="card" style={{ padding: 40, textAlign: 'center' }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>Chưa có hạng mục tiến độ</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>Bắt đầu bằng cách thêm từ mẫu có sẵn hoặc tạo thủ công</div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                        <button className="btn btn-primary" onClick={() => setModal('import')}>📥 Thêm từ Mẫu</button>
                        <button className="btn btn-ghost" onClick={() => setModal('add')}>+ Thêm thủ công</button>
                    </div>
                </div>
            )}

            {/* Add Task Modal */}
            {modal === 'add' && (
                <div className="modal-overlay" onClick={() => setModal(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 550 }}>
                        <div className="modal-header"><h3>Thêm hạng mục</h3><button className="modal-close" onClick={() => setModal(null)}>×</button></div>
                        <div className="modal-body">
                            <div className="form-group"><label className="form-label">Tên hạng mục *</label><input className="form-input" value={addForm.name} onChange={e => setAddForm({ ...addForm, name: e.target.value })} placeholder="VD: Đổ bê tông móng" /></div>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">Ngày bắt đầu *</label><input type="date" className="form-input" value={addForm.startDate} onChange={e => setAddForm({ ...addForm, startDate: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Ngày kết thúc *</label><input type="date" className="form-input" value={addForm.endDate} onChange={e => setAddForm({ ...addForm, endDate: e.target.value })} /></div>
                            </div>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">Trọng số</label><input type="number" className="form-input" min="0" step="0.1" value={addForm.weight} onChange={e => setAddForm({ ...addForm, weight: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Người phụ trách</label><input className="form-input" value={addForm.assignee} onChange={e => setAddForm({ ...addForm, assignee: e.target.value })} /></div>
                            </div>
                            <div className="form-group"><label className="form-label">Thuộc giai đoạn</label>
                                <select className="form-select" value={addForm.parentId} onChange={e => setAddForm({ ...addForm, parentId: e.target.value })}>
                                    <option value="">— Cấp cao nhất —</option>
                                    {flat.filter(t => !t.parentId).map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="modal-footer"><button className="btn btn-ghost" onClick={() => setModal(null)}>Hủy</button><button className="btn btn-primary" onClick={addTask}>Tạo</button></div>
                    </div>
                </div>
            )}

            {/* Import Template Modal */}
            {modal === 'import' && (
                <TemplateImportModal
                    projectId={projectId}
                    projectStartDate={projectStartDate}
                    onClose={() => setModal(null)}
                    onImported={onImported}
                />
            )}
        </div>
    );
}
