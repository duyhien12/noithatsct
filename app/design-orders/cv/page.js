'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Trash2 } from 'lucide-react';
import { STATUSES, STATUS_COLORS, DONE_STATUSES, DESIGNERS, STATUS_PROGRESS, colorForExecutor } from '@/lib/designTaskStatus';
import { useToast } from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';
import FormGroup from '@/components/ui/FormGroup';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
const toInputDate = (d) => d ? new Date(d).toISOString().slice(0, 10) : '';

const EMPTY_FORM = { customerId: '', title: '', executorName: '', startDate: '', endDate: '', status: 'Việc cần làm', notes: '' };

function Avatar({ name }) {
    const initials = (name || '?').split(' ').filter(Boolean).slice(-2).map(w => w[0]).join('').toUpperCase() || '?';
    const color = colorForExecutor(name);
    return (
        <div style={{ width: 26, height: 26, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 11, flexShrink: 0 }}>
            {initials}
        </div>
    );
}

// Ô ngày — luôn hiện input, trong suốt cho tới khi focus, lưu khi rời ô (blur) nếu có thay đổi.
function DateCell({ value, onSave, isOverdue }) {
    return (
        <input
            key={value || 'none'}
            type="date"
            defaultValue={toInputDate(value)}
            className="form-input"
            style={{
                fontSize: 12, padding: '4px 6px', width: 134, border: '1px solid transparent', borderRadius: 6,
                background: 'transparent', color: isOverdue ? '#dc2626' : 'inherit', fontWeight: isOverdue ? 700 : 400,
            }}
            onFocus={e => { e.target.style.border = '1px solid var(--border)'; e.target.style.background = 'var(--bg-card, #fff)'; }}
            onBlur={e => {
                e.target.style.border = '1px solid transparent';
                e.target.style.background = 'transparent';
                if (e.target.value === toInputDate(value)) return;
                onSave(e.target.value ? new Date(e.target.value).toISOString() : null);
            }}
            onClick={e => e.stopPropagation()}
        />
    );
}

// Ô trạng thái — dropdown dạng badge màu, đổi trực tiếp trên bảng.
function StatusCell({ task, onSave }) {
    const sc = STATUS_COLORS[task.status] || { bg: '#F1F5F9', text: '#64748B' };
    return (
        <select
            value={task.status}
            className="form-select"
            style={{ fontSize: 12, padding: '3px 24px 3px 10px', fontWeight: 600, color: sc.text, background: sc.bg, border: `1px solid ${sc.text}33`, borderRadius: 20, cursor: 'pointer' }}
            onClick={e => e.stopPropagation()}
            onChange={e => { const v = e.target.value; if (v !== task.status) onSave(v); }}
        >
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
    );
}

// Ô text trong suốt — dùng chung cho tiêu đề công việc và ghi chú.
function TextCell({ value, placeholder, onSave, taskId, muted }) {
    return (
        <input
            key={taskId}
            defaultValue={value || ''}
            placeholder={placeholder}
            className="form-input"
            style={{ fontSize: 12, padding: '4px 6px', border: '1px solid transparent', borderRadius: 6, background: 'transparent', width: '100%', color: muted ? 'var(--text-muted)' : 'inherit' }}
            onFocus={e => { e.target.style.border = '1px solid var(--border)'; e.target.style.background = 'var(--bg-card, #fff)'; }}
            onBlur={e => {
                e.target.style.border = '1px solid transparent';
                e.target.style.background = 'transparent';
                if (e.target.value === (value || '')) return;
                onSave(e.target.value);
            }}
            onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
            onClick={e => e.stopPropagation()}
        />
    );
}

export default function DesignTaskCvPage() {
    const toast = useToast();
    const [tasks, setTasks]       = useState([]);
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading]   = useState(true);
    const [search, setSearch]     = useState('');
    const [filterExecutor, setFilterExecutor] = useState('');
    const [filterStatus, setFilterStatus]     = useState('');
    const [hideDone, setHideDone] = useState(false);
    const [collapsedGroups, setCollapsedGroups] = useState(new Set());

    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);

    const toggleCollapse = (name) => setCollapsedGroups(prev => {
        const next = new Set(prev);
        next.has(name) ? next.delete(name) : next.add(name);
        return next;
    });

    const fetchTasks = useCallback(async () => {
        setLoading(true);
        try {
            let all = [];
            let page = 1;
            for (;;) {
                const res = await fetch(`/api/design-tasks?limit=500&page=${page}`).then(r => r.json());
                all = all.concat(res?.data || []);
                if (!res?.pagination?.hasNext) break;
                page += 1;
            }
            setTasks(all);
        } catch {}
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchTasks();
        fetch('/api/customers?limit=1000').then(r => r.json()).then(d => setCustomers(d.data || [])).catch(() => {});
    }, [fetchTasks]);

    const patchTask = async (id, body) => {
        const res = await fetch(`/api/design-tasks/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || 'Không lưu được thay đổi');
        return res.json();
    };

    const handleSaveField = useCallback(async (task, field, value) => {
        const prev = task[field];
        setTasks(list => list.map(t => t.id === task.id ? { ...t, [field]: value } : t));
        try {
            await patchTask(task.id, { [field]: value });
        } catch (e) {
            setTasks(list => list.map(t => t.id === task.id ? { ...t, [field]: prev } : t));
            toast.error(e.message);
        }
    }, [toast]);

    const openCreateModal = (prefillExecutor = '') => {
        setForm({ ...EMPTY_FORM, executorName: prefillExecutor });
        setShowModal(true);
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!form.customerId) return toast.error('Chọn khách hàng!');
        setSaving(true);
        try {
            const res = await fetch('/api/design-tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
                    endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
                }),
            });
            if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || 'Không tạo được công việc');
            const created = await res.json();
            setTasks(list => [created, ...list]);
            toast.success(`Đã tạo công việc ${created.code}`);
            setShowModal(false);
        } catch (e) {
            toast.error(e.message);
        }
        setSaving(false);
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            const res = await fetch(`/api/design-tasks/${deleteTarget.id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || 'Không xóa được');
            setTasks(list => list.filter(t => t.id !== deleteTarget.id));
            toast.success(`Đã xóa công việc ${deleteTarget.code}`);
        } catch (e) {
            toast.error(e.message);
        }
        setDeleteTarget(null);
    };

    const executors = useMemo(
        () => Array.from(new Set([...DESIGNERS, ...tasks.map(t => t.executorName).filter(Boolean)])).sort((a, b) => a.localeCompare(b, 'vi')),
        [tasks]
    );

    const filtered = tasks.filter(t => {
        if (filterExecutor && t.executorName !== filterExecutor) return false;
        if (filterStatus && t.status !== filterStatus) return false;
        if (hideDone && DONE_STATUSES.includes(t.status)) return false;
        if (search) {
            const q = search.toLowerCase();
            if (!t.customerName?.toLowerCase().includes(q) && !t.code?.toLowerCase().includes(q) && !t.title?.toLowerCase().includes(q)) return false;
        }
        return true;
    });

    const groupedRaw = {};
    filtered.forEach(t => {
        const key = t.executorName || 'Chưa phân công';
        if (!groupedRaw[key]) groupedRaw[key] = [];
        groupedRaw[key].push(t);
    });
    Object.values(groupedRaw).forEach(list => {
        list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    });
    const groupNames = Object.keys(groupedRaw).sort((a, b) => {
        if (a === 'Chưa phân công') return 1;
        if (b === 'Chưa phân công') return -1;
        return a.localeCompare(b, 'vi');
    });

    const now = new Date();

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="card" style={{ padding: '12px 16px' }}>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>📋 CV Thiết kế</span>

                    <input className="form-input" placeholder="🔍 Tìm khách hàng / mã / tên việc..." value={search}
                        onChange={e => setSearch(e.target.value)} style={{ fontSize: 13, maxWidth: 220 }} />
                    <select className="form-select" value={filterExecutor} onChange={e => setFilterExecutor(e.target.value)} style={{ fontSize: 13, maxWidth: 180 }}>
                        <option value="">Tất cả người thực hiện</option>
                        {executors.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <select className="form-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ fontSize: 13 }}>
                        <option value="">Tất cả trạng thái</option>
                        {STATUSES.map(s => <option key={s}>{s}</option>)}
                    </select>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, cursor: 'pointer', userSelect: 'none' }}>
                        <input type="checkbox" checked={hideDone} onChange={e => setHideDone(e.target.checked)} />
                        Ẩn Hoàn thành
                    </label>
                    {(filterExecutor || filterStatus || search || hideDone) && (
                        <button className="btn btn-ghost btn-sm" onClick={() => { setFilterExecutor(''); setFilterStatus(''); setSearch(''); setHideDone(false); }}>✕ Xóa lọc</button>
                    )}

                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                        <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => setCollapsedGroups(new Set(groupNames))}>▶ Thu gọn tất cả</button>
                        <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => setCollapsedGroups(new Set())}>▼ Mở tất cả</button>
                        <button className="btn btn-primary btn-sm" onClick={() => openCreateModal()}>+ Tạo công việc</button>
                    </div>
                </div>

                {!loading && (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border-light)', fontSize: 12, color: 'var(--text-muted)' }}>
                        Hiển thị <b style={{ color: 'var(--text-primary)' }}>{filtered.length}</b> công việc / <b>{groupNames.length}</b> người thực hiện
                        <span style={{ marginLeft: 8 }}>· Bấm vào ngày / trạng thái / ghi chú để sửa trực tiếp</span>
                    </div>
                )}
            </div>

            {loading ? (
                <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
            ) : filtered.length === 0 ? (
                <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                    Chưa có công việc nào.
                    <div style={{ marginTop: 12 }}>
                        <button className="btn btn-primary btn-sm" onClick={() => openCreateModal()}>+ Tạo công việc</button>
                    </div>
                </div>
            ) : (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th style={{ width: 44 }}>STT</th>
                                    <th>Khách hàng / Việc</th>
                                    <th>Ngày bắt đầu</th>
                                    <th>Ngày kết thúc</th>
                                    <th>Trạng thái</th>
                                    <th>Ghi chú</th>
                                    <th style={{ width: 40 }}></th>
                                </tr>
                            </thead>
                            {groupNames.map(name => {
                                const list = groupedRaw[name];
                                const isCollapsed = collapsedGroups.has(name);
                                const pct = list.length ? Math.round(list.reduce((s, t) => s + (STATUS_PROGRESS[t.status] ?? 0), 0) / list.length) : 0;

                                return (
                                    <tbody key={name}>
                                        <tr onClick={() => toggleCollapse(name)} style={{ cursor: 'pointer', background: 'var(--bg-secondary)' }}>
                                            <td colSpan={7} style={{ padding: '8px 14px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <span style={{ fontSize: 10, color: 'var(--text-muted)', width: 10 }}>{isCollapsed ? '▶' : '▼'}</span>
                                                    <Avatar name={name} />
                                                    <span style={{ fontWeight: 700, fontSize: 13 }}>{name === 'Chưa phân công' ? '⚠ Chưa phân công' : name}</span>
                                                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{list.length} bản ghi</span>
                                                    <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        <span style={{ width: 80, height: 6, borderRadius: 3, background: 'rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                                                            <span style={{ display: 'block', height: '100%', width: `${pct}%`, background: pct === 100 ? '#16a34a' : '#2563eb' }} />
                                                        </span>
                                                        <span style={{ fontSize: 12, fontWeight: 700, color: pct === 100 ? '#16a34a' : '#2563eb' }}>{pct}%</span>
                                                        <button
                                                            className="btn btn-ghost btn-sm"
                                                            style={{ fontSize: 11, padding: '2px 8px' }}
                                                            onClick={e => { e.stopPropagation(); openCreateModal(name === 'Chưa phân công' ? '' : name); }}
                                                        >+ Thêm</button>
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>

                                        {!isCollapsed && list.map((t, i) => {
                                            const isDone = DONE_STATUSES.includes(t.status);
                                            const isOverdue = !isDone && t.endDate && new Date(t.endDate) < now;
                                            return (
                                                <tr key={t.id}>
                                                    <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                                                    <td>
                                                        <div className="accent" style={{ fontWeight: 700 }}>{t.customerName}</div>
                                                        <TextCell taskId={t.id} value={t.title} placeholder="Tên công việc..." muted
                                                            onSave={(v) => handleSaveField(t, 'title', v)} />
                                                    </td>
                                                    <td>
                                                        <DateCell value={t.startDate} onSave={(iso) => handleSaveField(t, 'startDate', iso)} />
                                                    </td>
                                                    <td>
                                                        <DateCell value={t.endDate} isOverdue={isOverdue} onSave={(iso) => handleSaveField(t, 'endDate', iso)} />
                                                        {isOverdue && <span style={{ marginLeft: 2 }}>⚠</span>}
                                                    </td>
                                                    <td>
                                                        <StatusCell task={t} onSave={(status) => handleSaveField(t, 'status', status)} />
                                                    </td>
                                                    <td style={{ minWidth: 200 }}>
                                                        <TextCell taskId={t.id} value={t.notes} placeholder="Nhập ghi chú..."
                                                            onSave={(v) => handleSaveField(t, 'notes', v)} />
                                                    </td>
                                                    <td>
                                                        <button className="btn btn-ghost" style={{ padding: 4 }} title="Xóa công việc"
                                                            onClick={() => setDeleteTarget(t)}>
                                                            <Trash2 size={14} color="#dc2626" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                );
                            })}
                        </table>
                    </div>
                </div>
            )}

            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Tạo công việc thiết kế" maxWidth={480}>
                <form onSubmit={handleCreate}>
                    <FormGroup label="Khách hàng" required>
                        <select className="form-select" value={form.customerId} onChange={e => setForm(f => ({ ...f, customerId: e.target.value }))} required>
                            <option value="">-- Chọn khách hàng --</option>
                            {customers.map(c => <option key={c.id} value={c.id}>{c.name}{c.phone ? ` — ${c.phone}` : ''}</option>)}
                        </select>
                    </FormGroup>
                    <FormGroup label="Tên công việc">
                        <input className="form-input" placeholder="VD: Làm định hướng phong cách..."
                            value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                    </FormGroup>
                    <FormGroup label="Người thực hiện">
                        <select className="form-select" value={form.executorName} onChange={e => setForm(f => ({ ...f, executorName: e.target.value }))}>
                            <option value="">-- Chưa phân công --</option>
                            {executors.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </FormGroup>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <div style={{ flex: 1 }}>
                            <FormGroup label="Ngày bắt đầu">
                                <input type="date" className="form-input" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
                            </FormGroup>
                        </div>
                        <div style={{ flex: 1 }}>
                            <FormGroup label="Ngày kết thúc">
                                <input type="date" className="form-input" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
                            </FormGroup>
                        </div>
                    </div>
                    <FormGroup label="Trạng thái">
                        <select className="form-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </FormGroup>
                    <FormGroup label="Ghi chú">
                        <textarea className="form-input" rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                    </FormGroup>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                        <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Hủy</button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Đang tạo...' : 'Tạo công việc'}</button>
                    </div>
                </form>
            </Modal>

            <ConfirmDialog
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
                title="Xóa công việc"
                message={`Xác nhận xóa công việc ${deleteTarget?.code}? Thao tác này không thể hoàn tác.`}
            />
        </div>
    );
}
