'use client';
import { useState, useEffect, useRef } from 'react';
import ProgressReportModal from './ProgressReportModal';
import ProgressHistoryModal from './ProgressHistoryModal';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
const fmtDateShort = (d) => d ? new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : '—';
const toInputDate = (d) => d ? new Date(d).toISOString().slice(0, 10) : '';
const STATUS_COLORS = {
    'Chưa bắt đầu': 'muted',
    'Sẵn sàng': 'info',
    'Đang thi công': 'warning',
    'Hoàn thành': 'success',
    'Quá hạn': 'danger',
};
const STATUSES = ['Chưa bắt đầu', 'Sẵn sàng', 'Đang thi công', 'Hoàn thành'];

export default function ScheduleListView({ tasks, flat, projectId, onUpdate, onDelete, onRefresh }) {
    const [reportModal, setReportModal] = useState(null);
    const [historyModal, setHistoryModal] = useState(null);
    const [editModal, setEditModal] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [saving, setSaving] = useState(false);
    const [collapsed, setCollapsed] = useState({}); // groupId -> bool
    const [users, setUsers] = useState([]);
    const [filterDept, setFilterDept] = useState('');
    const [now, setNow] = useState(() => new Date());
    const [dragSrcId, setDragSrcId] = useState(null);
    const [dragOverId, setDragOverId] = useState(null);
    const dragSrcIdRef = useRef(null);

    useEffect(() => {
        fetch('/api/users').then(r => r.ok ? r.json() : []).then(data => setUsers(Array.isArray(data) ? data : [])).catch(() => {});
    }, []);

    // Update "now" every minute so overdue status recalculates automatically
    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    const openEdit = (task) => {
        setEditForm({
            progress: task.progress,
            status: task.status || 'Chưa bắt đầu',
            assignee: task.assignee || '',
            startDate: toInputDate(task.startDate),
            endDate: toInputDate(task.endDate),
            notes: task.notes || '',
        });
        setEditModal(task);
    };

    const saveEdit = async () => {
        if (!editModal) return;
        setSaving(true);
        const payload = {
            progress: Number(editForm.progress),
            status: editForm.status,
            assignee: editForm.assignee || undefined,
            notes: editForm.notes || undefined,
        };
        if (editForm.startDate) payload.startDate = editForm.startDate;
        if (editForm.endDate) payload.endDate = editForm.endDate;
        await onUpdate(editModal.id, payload);
        setSaving(false);
        setEditModal(null);
    };

    const toggleCollapse = (id) => setCollapsed(prev => ({ ...prev, [id]: !prev[id] }));

    /* ── DRAG & DROP ── */
    const handleDragStart = (e, taskId) => {
        dragSrcIdRef.current = taskId;
        setDragSrcId(taskId);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', taskId);
    };

    const handleDragOver = (e, taskId) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverId(taskId);
    };

    const handleDrop = async (e, targetTask, siblings) => {
        e.preventDefault();
        const srcId = dragSrcIdRef.current;
        if (!srcId || srcId === targetTask.id) { setDragSrcId(null); setDragOverId(null); return; }
        const sorted = [...siblings].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        const srcIdx = sorted.findIndex(t => t.id === srcId);
        const tgtIdx = sorted.findIndex(t => t.id === targetTask.id);
        if (srcIdx === -1 || tgtIdx === -1) { setDragSrcId(null); setDragOverId(null); return; }
        const reordered = [...sorted];
        const [moved] = reordered.splice(srcIdx, 1);
        reordered.splice(tgtIdx, 0, moved);
        await Promise.all(reordered.map((t, i) => onUpdate(t.id, { order: i * 10 })));
        setDragSrcId(null);
        setDragOverId(null);
        dragSrcIdRef.current = null;
    };

    const handleDragEnd = () => { setDragSrcId(null); setDragOverId(null); dragSrcIdRef.current = null; };

    /* ── DESKTOP TABLE ROW ── */
    const renderTaskDesktop = (task, depth = 0, siblings = tasks) => {
        const isGroup = task.children && task.children.length > 0;
        const isCollapsed = collapsed[task.id];
        const isOverdue = task.status !== 'Hoàn thành' && new Date(task.endDate) < now;
        const actualStatus = isOverdue ? 'Quá hạn' : task.status;
        const hasBaseline = task.baselineStart && task.baselineEnd;
        const delayDays = hasBaseline ? Math.ceil((new Date(task.endDate) - new Date(task.baselineEnd)) / 86400000) : 0;
        const progressColor = task.progress === 100 ? 'var(--status-success)' : task.progress > 0 ? 'var(--accent-primary)' : 'var(--border)';

        const isDraggingOver = dragOverId === task.id && dragSrcId !== task.id;

        return (
            <div key={task.id}>
                <div
                    draggable
                    onDragStart={e => handleDragStart(e, task.id)}
                    onDragOver={e => handleDragOver(e, task.id)}
                    onDrop={e => handleDrop(e, task, siblings)}
                    onDragEnd={handleDragEnd}
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '20px 1fr 90px 75px 75px 50px 150px 100px 70px',
                        alignItems: 'center',
                        padding: '10px 16px',
                        borderBottom: isDraggingOver ? '2px solid var(--accent-primary)' : '1px solid var(--border-light)',
                        background: isDraggingOver ? 'rgba(99,102,241,0.05)' : isGroup ? 'var(--bg-elevated)' : 'transparent',
                        fontSize: 13,
                        opacity: dragSrcId === task.id ? 0.4 : 1,
                        cursor: 'default',
                    }}>
                    <span style={{ cursor: 'grab', color: 'var(--text-muted)', fontSize: 14, userSelect: 'none', textAlign: 'center' }} title="Kéo để sắp xếp">⠿</span>
                    <div style={{ paddingLeft: depth * 24, display: 'flex', alignItems: 'center', gap: 8 }}>
                        {isGroup && (
                            <span
                                onClick={() => toggleCollapse(task.id)}
                                style={{ fontSize: 10, color: 'var(--text-muted)', cursor: 'pointer', userSelect: 'none' }}
                            >{isCollapsed ? '▶' : '▼'}</span>
                        )}
                        {task.color && <span style={{ width: 4, height: 20, borderRadius: 2, background: task.color, flexShrink: 0 }} />}
                        <span style={{ fontWeight: isGroup ? 700 : 500 }}>
                            {task.wbs && <span style={{ color: 'var(--text-muted)', marginRight: 6, fontSize: 11 }}>{task.wbs}</span>}
                            {task.name}
                        </span>
                        {task.isLocked && <span title="Đã khóa" style={{ fontSize: 12 }}>🔒</span>}
                        {task.predecessorId && <span title="Liên kết FS" style={{ fontSize: 10, color: 'var(--accent-primary)' }}>🔗</span>}
                        {delayDays > 0 && <span className="badge danger" style={{ fontSize: 10, padding: '1px 6px' }}>+{delayDays}d</span>}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{task.assignee || '—'}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtDate(task.startDate)}</div>
                    <div style={{ fontSize: 11, color: isOverdue ? 'var(--status-danger)' : 'var(--text-muted)' }}>{fmtDate(task.endDate)}</div>
                    <div style={{ fontSize: 11, textAlign: 'center', color: 'var(--text-muted)' }}>{task.duration}d</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${task.progress}%`, background: progressColor, borderRadius: 3, transition: 'width 0.3s' }} />
                        </div>
                        <span style={{ fontWeight: 700, fontSize: 12, minWidth: 32, textAlign: 'right', color: task.progress === 100 ? 'var(--status-success)' : 'var(--text-primary)' }}>{task.progress}%</span>
                        <button onClick={() => setHistoryModal(task)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, fontSize: 14 }} title="Xem lịch sử">👁️</button>
                    </div>
                    <div>
                        <span className={`badge ${STATUS_COLORS[actualStatus] || 'muted'}`} style={{ fontSize: 11, animation: actualStatus === 'Quá hạn' ? 'pulse 1.5s infinite' : 'none' }}>{actualStatus}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                        {!isGroup && !task.isLocked && (
                            <button onClick={() => setReportModal(task)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-primary)', fontSize: 13, padding: 2 }} title="Cập nhật tiến độ">📤</button>
                        )}
                        <button onClick={() => openEdit(task)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 13, padding: 2 }} title="Chỉnh sửa">✏️</button>
                        <button onClick={() => onDelete(task.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, padding: 2 }} title="Xóa">🗑️</button>
                    </div>
                </div>
                {!isCollapsed && task.children && [...task.children].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map(child => renderTaskDesktop(child, depth + 1, task.children))}
            </div>
        );
    };

    /* ── MOBILE CARD ── */
    const renderTaskMobile = (task, depth = 0) => {
        const isGroup = task.children && task.children.length > 0;
        const isCollapsed = collapsed[task.id];
        const isOverdue = task.status !== 'Hoàn thành' && new Date(task.endDate) < now;
        const actualStatus = isOverdue ? 'Quá hạn' : task.status;
        const progressColor = task.progress === 100 ? 'var(--status-success)' : task.progress > 0 ? 'var(--accent-primary)' : 'var(--border)';

        return (
            <div key={task.id}>
                <div style={{
                    padding: '10px 14px',
                    borderBottom: '1px solid var(--border-light)',
                    background: isGroup ? 'var(--bg-elevated)' : 'transparent',
                    paddingLeft: 14 + depth * 16,
                }}>
                    {/* Row 1: name + status + collapse */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                        {isGroup && (
                            <button
                                onClick={() => toggleCollapse(task.id)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', fontSize: 12, color: 'var(--text-muted)', flexShrink: 0, marginTop: 2 }}
                            >{isCollapsed ? '▶' : '▼'}</button>
                        )}
                        {task.color && <span style={{ width: 3, height: 18, borderRadius: 2, background: task.color, flexShrink: 0, marginTop: 3 }} />}
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: isGroup ? 700 : 600, fontSize: 13, lineHeight: 1.4 }}>
                                {task.wbs && <span style={{ color: 'var(--text-muted)', marginRight: 5, fontSize: 11 }}>{task.wbs}</span>}
                                {task.name}
                                {task.isLocked && <span style={{ fontSize: 11, marginLeft: 4 }}>🔒</span>}
                            </div>
                            {/* Row 2: meta info */}
                            <div style={{ display: 'flex', gap: 8, marginTop: 3, flexWrap: 'wrap', alignItems: 'center' }}>
                                <span className={`badge ${STATUS_COLORS[actualStatus] || 'muted'}`} style={{ fontSize: 10, animation: actualStatus === 'Quá hạn' ? 'pulse 1.5s infinite' : 'none' }}>{actualStatus}</span>
                                {task.assignee && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>👤 {task.assignee}</span>}
                                <span style={{ fontSize: 11, color: isOverdue ? 'var(--status-danger)' : 'var(--text-muted)' }}>
                                    📅 {fmtDateShort(task.startDate)} → {fmtDateShort(task.endDate)}
                                </span>
                                {task.duration && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{task.duration}d</span>}
                            </div>
                        </div>
                        {/* Actions */}
                        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                            {!isGroup && !task.isLocked && (
                                <button onClick={() => setReportModal(task)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: '4px 6px' }} title="Cập nhật tiến độ">📤</button>
                            )}
                            <button onClick={() => openEdit(task)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: '4px 6px' }} title="Chỉnh sửa">✏️</button>
                            <button onClick={() => onDelete(task.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: '4px 6px', color: 'var(--text-muted)' }} title="Xóa">🗑️</button>
                        </div>
                    </div>

                    {/* Row 3: progress bar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${task.progress}%`, background: progressColor, borderRadius: 3, transition: 'width 0.3s' }} />
                        </div>
                        <span style={{ fontWeight: 700, fontSize: 12, minWidth: 36, textAlign: 'right', color: task.progress === 100 ? 'var(--status-success)' : 'var(--text-primary)' }}>{task.progress}%</span>
                        <button onClick={() => setHistoryModal(task)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: '2px 4px', color: 'var(--text-muted)' }} title="Lịch sử">👁️</button>
                    </div>
                </div>
                {!isCollapsed && task.children && [...task.children].sort((a, b) => a.order - b.order).map(child => renderTaskMobile(child, depth + 1))}
            </div>
        );
    };

    return (
        <>
            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.4; }
                }
                .schedule-desktop { display: block; }
                .schedule-mobile  { display: none; }
                @media (max-width: 768px) {
                    .schedule-desktop { display: none; }
                    .schedule-mobile  { display: block; }
                }
            `}</style>

            {/* ── DESKTOP TABLE ── */}
            <div className="schedule-desktop card" style={{ overflow: 'hidden' }}>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '20px 1fr 90px 75px 75px 50px 150px 100px 70px',
                    alignItems: 'center',
                    padding: '10px 16px',
                    background: 'var(--bg-elevated)',
                    borderBottom: '2px solid var(--border-color)',
                    fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
                    textTransform: 'uppercase', letterSpacing: 0.5,
                }}>
                    <div></div>
                    <div>Hạng mục</div>
                    <div>Phụ trách</div>
                    <div>Bắt đầu</div>
                    <div>Kết thúc</div>
                    <div style={{ textAlign: 'center' }}>Ngày</div>
                    <div>Tiến độ</div>
                    <div>Trạng thái</div>
                    <div></div>
                </div>
                {tasks.map(t => renderTaskDesktop(t, 0, tasks))}
                {tasks.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có hạng mục</div>}
            </div>

            {/* ── MOBILE CARD LIST ── */}
            <div className="schedule-mobile card" style={{ overflow: 'hidden' }}>
                {/* Mobile header */}
                <div style={{
                    padding: '8px 14px',
                    background: 'var(--bg-elevated)',
                    borderBottom: '2px solid var(--border-color)',
                    fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
                    textTransform: 'uppercase', letterSpacing: 0.5,
                    display: 'flex', justifyContent: 'space-between',
                }}>
                    <span>Hạng mục / Tiến độ</span>
                    <span>{flat.length} hạng mục</span>
                </div>
                {tasks.map(t => renderTaskMobile(t, 0))}
                {tasks.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có hạng mục</div>}
            </div>

            {/* Modals */}
            {reportModal && (
                <ProgressReportModal
                    task={reportModal}
                    projectId={projectId}
                    onClose={() => setReportModal(null)}
                    onSubmitted={() => { setReportModal(null); if (onRefresh) onRefresh(); }}
                />
            )}

            {historyModal && (
                <ProgressHistoryModal
                    task={historyModal}
                    onClose={() => setHistoryModal(null)}
                    onReject={() => { if (onRefresh) onRefresh(); }}
                />
            )}

            {/* Edit Progress Modal */}
            {editModal && (
                <div className="modal-overlay" onClick={() => setEditModal(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
                        <div className="modal-header">
                            <h3>✏️ Chỉnh sửa tiến độ</h3>
                            <button className="modal-close" onClick={() => setEditModal(null)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div style={{ padding: '10px 14px', background: 'var(--bg-card)', borderRadius: 8, marginBottom: 16, fontWeight: 700, fontSize: 14 }}>
                                {editModal.wbs && <span style={{ color: 'var(--text-muted)', marginRight: 6, fontSize: 12 }}>{editModal.wbs}</span>}
                                {editModal.name}
                            </div>
                            <div className="form-group">
                                <label className="form-label">Tiến độ (%)</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <input
                                        type="range" min={0} max={100} value={editForm.progress}
                                        onChange={e => {
                                            const p = Number(e.target.value);
                                            setEditForm(f => ({ ...f, progress: p, status: p === 100 ? 'Hoàn thành' : p > 0 ? 'Đang thi công' : 'Chưa bắt đầu' }));
                                        }}
                                        style={{ flex: 1, accentColor: 'var(--accent-primary)' }}
                                    />
                                    <input
                                        type="number" min={0} max={100} value={editForm.progress}
                                        onChange={e => {
                                            const p = Math.min(100, Math.max(0, Number(e.target.value)));
                                            setEditForm(f => ({ ...f, progress: p, status: p === 100 ? 'Hoàn thành' : p > 0 ? 'Đang thi công' : 'Chưa bắt đầu' }));
                                        }}
                                        style={{ width: 64, textAlign: 'center', fontWeight: 700, fontSize: 16 }}
                                        className="form-input"
                                    />
                                </div>
                                <div className="progress-bar" style={{ marginTop: 8 }}>
                                    <div className="progress-fill" style={{ width: `${editForm.progress}%` }} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Trạng thái</label>
                                <select className="form-select" value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}>
                                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Người phụ trách</label>
                                <input className="form-input" value={editForm.assignee} onChange={e => setEditForm(f => ({ ...f, assignee: e.target.value }))} placeholder="Tên người phụ trách" />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Ngày bắt đầu</label>
                                    <input type="date" className="form-input" value={editForm.startDate} onChange={e => setEditForm(f => ({ ...f, startDate: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Ngày kết thúc</label>
                                    <input type="date" className="form-input" value={editForm.endDate} onChange={e => setEditForm(f => ({ ...f, endDate: e.target.value }))} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Ghi chú</label>
                                <textarea className="form-input" rows={2} value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} placeholder="Ghi chú thêm..." />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setEditModal(null)}>Hủy</button>
                            <button className="btn btn-primary" onClick={saveEdit} disabled={saving}>
                                {saving ? 'Đang lưu...' : '💾 Lưu thay đổi'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
