'use client';
import { useState } from 'react';
import ProgressReportModal from './ProgressReportModal';
import ProgressHistoryModal from './ProgressHistoryModal';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
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
    const [reportModal, setReportModal] = useState(null); // task obj
    const [historyModal, setHistoryModal] = useState(null); // task obj
    const [editModal, setEditModal] = useState(null); // task obj
    const [editForm, setEditForm] = useState({});
    const [saving, setSaving] = useState(false);

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

    const renderTask = (task, depth = 0) => {
        const isGroup = task.children && task.children.length > 0;
        const isOverdue = task.status !== 'Hoàn thành' && new Date(task.endDate) < new Date();
        const actualStatus = isOverdue && task.status !== 'Hoàn thành' ? 'Quá hạn' : task.status;
        const hasBaseline = task.baselineStart && task.baselineEnd;
        const baselineEnd = hasBaseline ? new Date(task.baselineEnd) : null;
        const actualEnd = new Date(task.endDate);
        const delayDays = hasBaseline ? Math.ceil((actualEnd - baselineEnd) / 86400000) : 0;
        const progressColor = task.progress === 100 ? 'var(--status-success)' : task.progress > 0 ? 'var(--accent-primary)' : 'var(--border)';

        return (
            <div key={task.id}>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 90px 75px 75px 50px 150px 100px 70px',
                    alignItems: 'center',
                    padding: '10px 16px',
                    borderBottom: '1px solid var(--border-light)',
                    background: isGroup ? 'var(--bg-elevated)' : 'transparent',
                    fontSize: 13,
                }}>
                    {/* Name */}
                    <div style={{ paddingLeft: depth * 24, display: 'flex', alignItems: 'center', gap: 8 }}>
                        {isGroup && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>▼</span>}
                        {task.color && <span style={{ width: 4, height: 20, borderRadius: 2, background: task.color, flexShrink: 0 }}></span>}
                        <span style={{ fontWeight: isGroup ? 700 : 500 }}>
                            {task.wbs && <span style={{ color: 'var(--text-muted)', marginRight: 6, fontSize: 11 }}>{task.wbs}</span>}
                            {task.name}
                        </span>
                        {task.isLocked && <span title="Đã khóa" style={{ fontSize: 12 }}>🔒</span>}
                        {task.predecessorId && <span title="Liên kết FS" style={{ fontSize: 10, color: 'var(--accent-primary)' }}>🔗</span>}
                        {delayDays > 0 && <span className="badge danger" style={{ fontSize: 10, padding: '1px 6px' }}>+{delayDays}d</span>}
                    </div>

                    {/* Assignee */}
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{task.assignee || '—'}</div>

                    {/* Start */}
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtDate(task.startDate)}</div>

                    {/* End */}
                    <div style={{ fontSize: 11, color: isOverdue ? 'var(--status-danger)' : 'var(--text-muted)' }}>{fmtDate(task.endDate)}</div>

                    {/* Duration */}
                    <div style={{ fontSize: 11, textAlign: 'center', color: 'var(--text-muted)' }}>{task.duration}d</div>

                    {/* Progress — progress bar (not slider) + history icon */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${task.progress}%`, background: progressColor, borderRadius: 3, transition: 'width 0.3s' }} />
                        </div>
                        <span style={{
                            fontWeight: 700, fontSize: 12, minWidth: 32, textAlign: 'right',
                            color: task.progress === 100 ? 'var(--status-success)' : 'var(--text-primary)',
                        }}>{task.progress}%</span>
                        {/* History icon */}
                        <button
                            onClick={() => setHistoryModal(task)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, fontSize: 14 }}
                            title="Xem lịch sử cập nhật"
                        >👁️</button>
                    </div>

                    {/* Status */}
                    <div>
                        <span
                            className={`badge ${STATUS_COLORS[actualStatus] || 'muted'}`}
                            style={{
                                fontSize: 11,
                                animation: actualStatus === 'Quá hạn' ? 'pulse 1.5s infinite' : 'none',
                            }}
                        >{actualStatus}</span>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 4 }}>
                        {!isGroup && !task.isLocked && (
                            <button
                                onClick={() => setReportModal(task)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-primary)', fontSize: 13, padding: 2 }}
                                title="Cập nhật tiến độ"
                            >📤</button>
                        )}
                        <button
                            onClick={() => openEdit(task)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 13, padding: 2 }}
                            title="Chỉnh sửa tiến độ"
                        >✏️</button>
                        <button onClick={() => onDelete(task.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, padding: 2 }} title="Xóa">🗑️</button>
                    </div>
                </div>
                {task.children && [...task.children].sort((a, b) => a.order - b.order).map(child => renderTask(child, depth + 1))}
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
            `}</style>
            <div className="card" style={{ overflow: 'hidden' }}>
                {/* Header */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 90px 75px 75px 50px 150px 100px 70px',
                    alignItems: 'center',
                    padding: '10px 16px',
                    background: 'var(--bg-elevated)',
                    borderBottom: '2px solid var(--border-color)',
                    fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
                    textTransform: 'uppercase', letterSpacing: 0.5,
                }}>
                    <div>Hạng mục</div>
                    <div>Phụ trách</div>
                    <div>Bắt đầu</div>
                    <div>Kết thúc</div>
                    <div style={{ textAlign: 'center' }}>Ngày</div>
                    <div>Tiến độ</div>
                    <div>Trạng thái</div>
                    <div></div>
                </div>
                {tasks.map(t => renderTask(t, 0))}
                {tasks.length === 0 && (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có hạng mục</div>
                )}
            </div>

            {/* Report Modal */}
            {reportModal && (
                <ProgressReportModal
                    task={reportModal}
                    projectId={projectId}
                    onClose={() => setReportModal(null)}
                    onSubmitted={() => { setReportModal(null); if (onRefresh) onRefresh(); }}
                />
            )}

            {/* History Modal */}
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
                            {/* Task name */}
                            <div style={{ padding: '10px 14px', background: 'var(--bg-card)', borderRadius: 8, marginBottom: 16, fontWeight: 700, fontSize: 14 }}>
                                {editModal.wbs && <span style={{ color: 'var(--text-muted)', marginRight: 6, fontSize: 12 }}>{editModal.wbs}</span>}
                                {editModal.name}
                            </div>

                            {/* Progress slider */}
                            <div className="form-group">
                                <label className="form-label">Tiến độ (%)</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <input
                                        type="range"
                                        min={0}
                                        max={100}
                                        value={editForm.progress}
                                        onChange={e => {
                                            const p = Number(e.target.value);
                                            const status = p === 100 ? 'Hoàn thành' : p > 0 ? 'Đang thi công' : 'Chưa bắt đầu';
                                            setEditForm(f => ({ ...f, progress: p, status }));
                                        }}
                                        style={{ flex: 1, accentColor: 'var(--accent-primary)' }}
                                    />
                                    <input
                                        type="number"
                                        min={0}
                                        max={100}
                                        value={editForm.progress}
                                        onChange={e => {
                                            const p = Math.min(100, Math.max(0, Number(e.target.value)));
                                            const status = p === 100 ? 'Hoàn thành' : p > 0 ? 'Đang thi công' : 'Chưa bắt đầu';
                                            setEditForm(f => ({ ...f, progress: p, status }));
                                        }}
                                        style={{ width: 64, textAlign: 'center', fontWeight: 700, fontSize: 16 }}
                                        className="form-input"
                                    />
                                </div>
                                <div className="progress-bar" style={{ marginTop: 8 }}>
                                    <div className="progress-fill" style={{ width: `${editForm.progress}%` }} />
                                </div>
                            </div>

                            {/* Status */}
                            <div className="form-group">
                                <label className="form-label">Trạng thái</label>
                                <select className="form-select" value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}>
                                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>

                            {/* Assignee */}
                            <div className="form-group">
                                <label className="form-label">Người phụ trách</label>
                                <input className="form-input" value={editForm.assignee} onChange={e => setEditForm(f => ({ ...f, assignee: e.target.value }))} placeholder="Tên người phụ trách" />
                            </div>

                            {/* Dates */}
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

                            {/* Notes */}
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
