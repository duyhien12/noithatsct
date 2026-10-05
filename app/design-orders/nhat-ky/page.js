'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';
import FormGroup from '@/components/ui/FormGroup';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import JournalGantt from './JournalGantt';
import { JOURNAL_STATUSES, JOURNAL_STATUS_COLORS, DEFAULT_JOURNAL_STATUS } from '@/lib/designJournalStatus';
import { ARCHITECTS } from '@/lib/designWorkLog';

const VIEW_KEY = 'design-journal-view';

const toInputDate = (d) => d ? new Date(d).toISOString().slice(0, 10) : '';
const todayInput = () => toInputDate(new Date());

// Số ngày tính cả ngày đầu và ngày cuối — dùng để gợi ý ô "Thời gian".
const daysBetween = (from, to) => {
    if (!from || !to) return null;
    const n = Math.round((new Date(to) - new Date(from)) / 86400000) + 1;
    return n > 0 ? n : null;
};

const EMPTY_FORM = { content: '', projectName: '', executorName: '', duration: '', startDate: '', endDate: '', status: DEFAULT_JOURNAL_STATUS };

const cellFocus = e => { e.target.style.border = '1px solid var(--border)'; e.target.style.background = 'var(--bg-card)'; };
const cellBlur = e => { e.target.style.border = '1px solid transparent'; e.target.style.background = 'transparent'; };
const cellStyle = { fontSize: 12, padding: '4px 6px', border: '1px solid transparent', borderRadius: 6, background: 'transparent' };

// Ô text trong suốt — lưu khi rời ô nếu có thay đổi.
function TextCell({ value, placeholder, onSave, rowId, list, style }) {
    return (
        <input
            key={`${rowId}-${value}`}
            defaultValue={value || ''}
            placeholder={placeholder}
            list={list}
            className="form-input"
            style={{ ...cellStyle, width: '100%', ...style }}
            onFocus={cellFocus}
            onBlur={e => {
                cellBlur(e);
                if (e.target.value.trim() === (value || '')) return;
                onSave(e.target.value.trim());
            }}
            onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
        />
    );
}

function DateCell({ value, onSave }) {
    return (
        <input
            key={value || 'none'}
            type="date"
            defaultValue={toInputDate(value)}
            className="form-input"
            style={{ ...cellStyle, width: 134 }}
            onFocus={cellFocus}
            onBlur={e => {
                cellBlur(e);
                if (e.target.value === toInputDate(value)) return;
                onSave(e.target.value ? new Date(e.target.value).toISOString() : null);
            }}
        />
    );
}

// Ô Đánh giá — dropdown dạng badge màu, đổi trực tiếp trên bảng.
function StatusCell({ value, onSave }) {
    const c = JOURNAL_STATUS_COLORS[value] || JOURNAL_STATUS_COLORS[DEFAULT_JOURNAL_STATUS];
    return (
        <select
            value={value || DEFAULT_JOURNAL_STATUS}
            className="form-select"
            style={{ fontSize: 12, padding: '3px 24px 3px 10px', fontWeight: 600, color: c.text, background: c.bg, border: `1px solid ${c.br}`, borderRadius: 20, cursor: 'pointer' }}
            onChange={e => { const v = e.target.value; if (v !== value) onSave(v); }}
        >
            {JOURNAL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
    );
}

function ExecutorCell({ value, executors, onSave }) {
    return (
        <select
            value={value || ''}
            className="form-select"
            style={{ ...cellStyle, padding: '3px 8px', cursor: 'pointer' }}
            onFocus={cellFocus}
            onBlur={cellBlur}
            onChange={e => { const v = e.target.value; if (v !== (value || '')) onSave(v); }}
        >
            <option value="">-- Chưa chọn --</option>
            {executors.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
    );
}

export default function DesignJournalPage() {
    const toast = useToast();
    const [rows, setRows] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterExecutor, setFilterExecutor] = useState('');
    const [filterMonth, setFilterMonth] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [view, setView] = useState('table');

    useEffect(() => {
        try { if (localStorage.getItem(VIEW_KEY) === 'gantt') setView('gantt'); } catch {}
    }, []);
    const changeView = (v) => {
        setView(v);
        try { localStorage.setItem(VIEW_KEY, v); } catch {}
    };

    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [durationTouched, setDurationTouched] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);

    const fetchRows = useCallback(async () => {
        setLoading(true);
        try {
            let all = [];
            let page = 1;
            for (;;) {
                const res = await fetch(`/api/design-journals?limit=500&page=${page}`).then(r => r.json());
                all = all.concat(res?.data || []);
                if (!res?.pagination?.hasNext) break;
                page += 1;
            }
            setRows(all);
        } catch {}
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchRows();
        // Tên công trình gợi ý toàn bộ khách thuộc bảng "Khách hàng TKKT" trên Kanban Khách hàng
        // (khách có giai đoạn bắt đầu bằng "TKKT ", xem PIPELINE_TKKT trong app/customers/page.js).
        fetch('/api/customers?dept=thiet_ke&limit=1000').then(r => r.json())
            .then(d => setCustomers((d.data || []).filter(c => (c.pipelineStage || '').startsWith('TKKT '))))
            .catch(() => {});
    }, [fetchRows]);

    const handleSaveField = useCallback(async (row, field, value) => {
        const prev = row[field];
        setRows(list => list.map(r => r.id === row.id ? { ...r, [field]: value } : r));
        try {
            const res = await fetch(`/api/design-journals/${row.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [field]: value }),
            });
            if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || 'Không lưu được thay đổi');
        } catch (e) {
            setRows(list => list.map(r => r.id === row.id ? { ...r, [field]: prev } : r));
            toast.error(e.message);
        }
    }, [toast]);

    // Kéo thanh trên biểu đồ tiến độ đổi cả Từ ngày lẫn Đến ngày trong một lần lưu.
    const handleSaveDates = useCallback(async (id, startDate, endDate) => {
        const old = rows.find(r => r.id === id);
        if (!old) return;
        setRows(list => list.map(r => r.id === id ? { ...r, startDate, endDate } : r));
        try {
            const res = await fetch(`/api/design-journals/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ startDate, endDate }),
            });
            if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || 'Không lưu được thay đổi');
        } catch (e) {
            setRows(list => list.map(r => r.id === id ? { ...r, startDate: old.startDate, endDate: old.endDate } : r));
            toast.error(e.message);
        }
    }, [rows, toast]);

    const openCreateModal = () => {
        setForm({ ...EMPTY_FORM, executorName: filterExecutor, startDate: todayInput(), endDate: todayInput() });
        setDurationTouched(false);
        setShowModal(true);
    };

    // Đổi ngày trong form thì tự gợi ý "N ngày" cho ô Thời gian, trừ khi người dùng đã tự gõ.
    const setFormDate = (field, value) => setForm(f => {
        const next = { ...f, [field]: value };
        if (!durationTouched) {
            const n = daysBetween(next.startDate, next.endDate);
            next.duration = n ? `${n} ngày` : '';
        }
        return next;
    });

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!form.content.trim()) return toast.error('Nhập nội dung công việc!');
        setSaving(true);
        try {
            const res = await fetch('/api/design-journals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
                    endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
                }),
            });
            if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || 'Không thêm được nhật ký');
            const created = await res.json();
            setRows(list => [created, ...list]);
            toast.success('Đã thêm nhật ký');
            setShowModal(false);
        } catch (e) {
            toast.error(e.message);
        }
        setSaving(false);
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            const res = await fetch(`/api/design-journals/${deleteTarget.id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || 'Không xóa được');
            setRows(list => list.filter(r => r.id !== deleteTarget.id));
            toast.success('Đã xóa nhật ký');
        } catch (e) {
            toast.error(e.message);
        }
        setDeleteTarget(null);
    };

    const executors = useMemo(
        () => Array.from(new Set([...ARCHITECTS, ...rows.map(r => r.executorName).filter(Boolean)])).sort((a, b) => a.localeCompare(b, 'vi')),
        [rows]
    );

    const projectNames = useMemo(
        () => Array.from(new Set(customers.map(c => c.name).filter(Boolean))),
        [customers]
    );

    const filtered = rows.filter(r => {
        if (filterExecutor && r.executorName !== filterExecutor) return false;
        if (filterStatus && (r.status || DEFAULT_JOURNAL_STATUS) !== filterStatus) return false;
        if (filterMonth) {
            // Bản ghi thuộc tháng nếu khoảng [Từ ngày, Đến ngày] chạm vào tháng đó.
            const from = toInputDate(r.startDate || r.endDate || r.createdAt).slice(0, 7);
            const to = toInputDate(r.endDate || r.startDate || r.createdAt).slice(0, 7);
            if (filterMonth < from || filterMonth > to) return false;
        }
        if (search) {
            const q = search.toLowerCase();
            if (!r.content?.toLowerCase().includes(q) && !r.projectName?.toLowerCase().includes(q)) return false;
        }
        return true;
    });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="card" style={{ padding: '12px 16px' }}>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>📓 Nhật ký TKKT</span>

                    <input className="form-input" placeholder="🔍 Tìm nội dung / công trình..." value={search}
                        onChange={e => setSearch(e.target.value)} style={{ fontSize: 13, maxWidth: 220 }} />
                    <select className="form-select" value={filterExecutor} onChange={e => setFilterExecutor(e.target.value)} style={{ fontSize: 13, maxWidth: 200 }}>
                        <option value="">Tất cả người thực hiện</option>
                        {executors.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <input type="month" className="form-input" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
                        style={{ fontSize: 13, maxWidth: 160 }} title="Lọc theo tháng" />
                    <select className="form-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ fontSize: 13, maxWidth: 160 }}>
                        <option value="">Tất cả đánh giá</option>
                        {JOURNAL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    {(filterExecutor || filterMonth || filterStatus || search) && (
                        <button className="btn btn-ghost btn-sm" onClick={() => { setFilterExecutor(''); setFilterMonth(''); setFilterStatus(''); setSearch(''); }}>✕ Xóa lọc</button>
                    )}

                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                        <div style={{ display: 'flex' }}>
                            <button className={`btn btn-sm ${view === 'table' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => changeView('table')}>📋 Bảng</button>
                            <button className={`btn btn-sm ${view === 'gantt' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => changeView('gantt')}>📊 Tiến độ</button>
                        </div>
                        <button className="btn btn-primary btn-sm" onClick={openCreateModal}>+ Thêm nhật ký</button>
                    </div>
                </div>

                {!loading && (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border-light)', fontSize: 12, color: 'var(--text-muted)' }}>
                        Hiển thị <b style={{ color: 'var(--text-primary)' }}>{filtered.length}</b> / {rows.length} bản ghi
                        {view === 'table' && <span style={{ marginLeft: 8 }}>· Bấm vào ô bất kỳ để sửa trực tiếp</span>}
                    </div>
                )}
            </div>

            {loading ? (
                <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
            ) : filtered.length === 0 ? (
                <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                    Chưa có nhật ký nào.
                    <div style={{ marginTop: 12 }}>
                        <button className="btn btn-primary btn-sm" onClick={openCreateModal}>+ Thêm nhật ký</button>
                    </div>
                </div>
            ) : view === 'gantt' ? (
                // Bảng tiến độ chỉ hiện việc còn đang làm — Hoàn thành / Huỷ chỉ xem ở dạng Bảng.
                <JournalGantt rows={filtered.filter(r => (r.status || DEFAULT_JOURNAL_STATUS) === DEFAULT_JOURNAL_STATUS)} onChangeDates={handleSaveDates} />
            ) : (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th style={{ width: 44 }}>STT</th>
                                    <th style={{ minWidth: 260 }}>Nội dung công việc</th>
                                    <th style={{ minWidth: 200 }}>Tên công trình</th>
                                    <th>Người thực hiện</th>
                                    <th style={{ width: 110 }}>Thời gian</th>
                                    <th>Từ ngày</th>
                                    <th>Đến ngày</th>
                                    <th>Đánh giá</th>
                                    <th style={{ width: 40 }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((r, i) => (
                                    <tr key={r.id}>
                                        <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                                        <td>
                                            <TextCell rowId={r.id} value={r.content} placeholder="Nội dung công việc..."
                                                onSave={(v) => v ? handleSaveField(r, 'content', v) : toast.error('Nội dung công việc không được để trống')} />
                                        </td>
                                        <td>
                                            <TextCell rowId={r.id} value={r.projectName} placeholder="Tên công trình..." list="journal-projects"
                                                style={{ fontWeight: 600 }} onSave={(v) => handleSaveField(r, 'projectName', v)} />
                                        </td>
                                        <td>
                                            <ExecutorCell value={r.executorName} executors={executors} onSave={(v) => handleSaveField(r, 'executorName', v)} />
                                        </td>
                                        <td>
                                            <TextCell rowId={r.id} value={r.duration}
                                                placeholder={daysBetween(r.startDate, r.endDate) ? `${daysBetween(r.startDate, r.endDate)} ngày` : 'VD: 4 giờ'}
                                                onSave={(v) => handleSaveField(r, 'duration', v)} />
                                        </td>
                                        <td>
                                            <DateCell value={r.startDate} onSave={(iso) => handleSaveField(r, 'startDate', iso)} />
                                        </td>
                                        <td>
                                            <DateCell value={r.endDate} onSave={(iso) => handleSaveField(r, 'endDate', iso)} />
                                        </td>
                                        <td>
                                            <StatusCell value={r.status} onSave={(v) => handleSaveField(r, 'status', v)} />
                                        </td>
                                        <td>
                                            <button className="btn btn-ghost" style={{ padding: 4 }} title="Xóa nhật ký" onClick={() => setDeleteTarget(r)}>
                                                <Trash2 size={14} color="var(--color-danger)" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <datalist id="journal-projects">
                {projectNames.map(n => <option key={n} value={n} />)}
            </datalist>

            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Thêm nhật ký TKKT" maxWidth={520}>
                <form onSubmit={handleCreate}>
                    <FormGroup label="Nội dung công việc" required>
                        <textarea className="form-input" rows={3} placeholder="VD: Dựng mặt bằng tầng 1, chỉnh mặt đứng..."
                            value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} required autoFocus />
                    </FormGroup>
                    <FormGroup label="Tên công trình">
                        <input className="form-input" list="journal-projects" placeholder="Gõ hoặc chọn công trình..."
                            value={form.projectName} onChange={e => setForm(f => ({ ...f, projectName: e.target.value }))} />
                    </FormGroup>
                    <FormGroup label="Người thực hiện">
                        <select className="form-select" value={form.executorName} onChange={e => setForm(f => ({ ...f, executorName: e.target.value }))}>
                            <option value="">-- Chưa chọn --</option>
                            {executors.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </FormGroup>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: 140 }}>
                            <FormGroup label="Từ ngày">
                                <input type="date" className="form-input" value={form.startDate} onChange={e => setFormDate('startDate', e.target.value)} />
                            </FormGroup>
                        </div>
                        <div style={{ flex: 1, minWidth: 140 }}>
                            <FormGroup label="Đến ngày">
                                <input type="date" className="form-input" value={form.endDate} onChange={e => setFormDate('endDate', e.target.value)} />
                            </FormGroup>
                        </div>
                    </div>
                    <FormGroup label="Thời gian">
                        <input className="form-input" placeholder="VD: 4 giờ, 2 ngày..."
                            value={form.duration} onChange={e => { setDurationTouched(true); setForm(f => ({ ...f, duration: e.target.value })); }} />
                    </FormGroup>
                    <FormGroup label="Đánh giá">
                        <select className="form-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                            {JOURNAL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </FormGroup>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                        <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Hủy</button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Đang lưu...' : 'Thêm nhật ký'}</button>
                    </div>
                </form>
            </Modal>

            <ConfirmDialog
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
                title="Xóa nhật ký"
                message="Xác nhận xóa dòng nhật ký này? Thao tác này không thể hoàn tác."
            />
        </div>
    );
}
