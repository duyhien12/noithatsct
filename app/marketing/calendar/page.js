'use client';
import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { ChevronLeft, ChevronRight, Plus, X, Clock, User, Flag, CheckCircle2, Circle, Pencil, Trash2 } from 'lucide-react';

const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const MONTHS_VI = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];

const STATUS_OPTIONS = ['Cần làm', 'Đang làm', 'Hoàn thành', 'Đã hủy'];
const PRIORITY_OPTIONS = ['Cao', 'Trung bình', 'Thấp'];

const STATUS_COLORS = {
    'Cần làm': { bg: '#fff7ed', text: '#c2410c', dot: '#f97316' },
    'Đang làm': { bg: '#eff6ff', text: '#1d4ed8', dot: '#3b82f6' },
    'Hoàn thành': { bg: '#f0fdf4', text: '#15803d', dot: '#22c55e' },
    'Đã hủy': { bg: '#fef2f2', text: '#b91c1c', dot: '#ef4444' },
};

const PRIORITY_COLORS = {
    'Cao': '#dc2626',
    'Trung bình': '#d97706',
    'Thấp': '#6b7280',
};

function toDateStr(date) {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fmtDisplayDate(dateStr) {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
}

function fmtMonthYear(year, month) {
    return `${MONTHS_VI[month]} ${year}`;
}

export default function MarketingCalendarPage() {
    const { data: session } = useSession();
    const [today] = useState(() => new Date());
    const [viewYear, setViewYear] = useState(() => today.getFullYear());
    const [viewMonth, setViewMonth] = useState(() => today.getMonth());
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(null);
    const [showDayModal, setShowDayModal] = useState(false);
    const [showEventForm, setShowEventForm] = useState(false);
    const [editingEvent, setEditingEvent] = useState(null);
    const [users, setUsers] = useState([]);

    const monthStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;

    const fetchEvents = useCallback(() => {
        setLoading(true);
        fetch(`/api/marketing/calendar?month=${monthStr}`)
            .then(r => r.json())
            .then(d => { setEvents(d.data || []); setLoading(false); })
            .catch(() => setLoading(false));
    }, [monthStr]);

    useEffect(() => { fetchEvents(); }, [fetchEvents]);

    useEffect(() => {
        fetch('/api/users').then(r => r.json()).then(d => setUsers(Array.isArray(d) ? d : []));
    }, []);

    // Build calendar grid
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();

    const cells = [];
    for (let i = firstDay - 1; i >= 0; i--) {
        cells.push({ day: prevMonthDays - i, currentMonth: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
        cells.push({ day: d, currentMonth: true });
    }
    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d++) {
        cells.push({ day: d, currentMonth: false });
    }

    const getEventsForDay = (day, currentMonth) => {
        if (!currentMonth) return [];
        const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return events.filter(e => toDateStr(e.date) === dateStr);
    };

    const todayStr = toDateStr(today);
    const isToday = (day, currentMonth) => {
        if (!currentMonth) return false;
        return `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` === todayStr;
    };

    const prevMonth = () => {
        if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
        else setViewMonth(m => m - 1);
    };
    const nextMonth = () => {
        if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
        else setViewMonth(m => m + 1);
    };
    const goToday = () => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); };

    const openDay = (day, currentMonth) => {
        if (!currentMonth) return;
        const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        setSelectedDate(dateStr);
        setShowDayModal(true);
        setShowEventForm(false);
        setEditingEvent(null);
    };

    const openNewEvent = (dateStr) => {
        setEditingEvent(null);
        setShowEventForm(true);
    };

    const openEditEvent = (ev) => {
        setEditingEvent(ev);
        setShowEventForm(true);
    };

    const handleEventSaved = (saved, isNew) => {
        if (isNew) {
            setEvents(prev => [...prev, saved].sort((a, b) => new Date(a.date) - new Date(b.date)));
        } else {
            setEvents(prev => prev.map(e => e.id === saved.id ? saved : e));
        }
        setShowEventForm(false);
        setEditingEvent(null);
    };

    const handleDeleteEvent = async (id) => {
        if (!confirm('Xóa sự kiện này?')) return;
        await fetch(`/api/marketing/calendar/${id}`, { method: 'DELETE' });
        setEvents(prev => prev.filter(e => e.id !== id));
    };

    const selectedDayEvents = selectedDate
        ? events.filter(e => toDateStr(e.date) === selectedDate).sort((a, b) => {
            if (!a.startTime) return 1;
            if (!b.startTime) return -1;
            return a.startTime.localeCompare(b.startTime);
        })
        : [];

    const totalThisMonth = events.length;
    const doneThisMonth = events.filter(e => e.status === 'Hoàn thành').length;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 1100, margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                        📅 Lịch công việc Marketing
                    </h1>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '2px 0 0' }}>
                        {totalThisMonth} việc trong tháng · {doneThisMonth} hoàn thành
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button className="btn btn-secondary" onClick={goToday} style={{ fontSize: 12 }}>Hôm nay</button>
                    <button
                        className="btn btn-primary"
                        onClick={() => { setSelectedDate(todayStr); setShowDayModal(true); setShowEventForm(true); setEditingEvent(null); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
                    >
                        <Plus size={15} /> Thêm việc
                    </button>
                </div>
            </div>

            {/* Month navigator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button onClick={prevMonth} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    <ChevronLeft size={18} />
                </button>
                <span style={{ fontSize: 18, fontWeight: 700, minWidth: 160, textAlign: 'center', color: 'var(--text-primary)' }}>
                    {fmtMonthYear(viewYear, viewMonth)}
                </span>
                <button onClick={nextMonth} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    <ChevronRight size={18} />
                </button>
            </div>

            {/* Calendar grid */}
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border-color)', overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
                {/* Weekday headers */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border-color)' }}>
                    {WEEKDAYS.map((day, i) => (
                        <div key={day} style={{
                            padding: '10px 0', textAlign: 'center', fontSize: 12, fontWeight: 700,
                            color: i === 0 ? '#ef4444' : i === 6 ? '#3b82f6' : 'var(--text-muted)',
                            background: '#f8f9fa',
                        }}>
                            {day}
                        </div>
                    ))}
                </div>

                {/* Calendar cells */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
                    {cells.map((cell, idx) => {
                        const dayEvents = getEventsForDay(cell.day, cell.currentMonth);
                        const isT = isToday(cell.day, cell.currentMonth);
                        const colIdx = idx % 7;
                        const isSun = colIdx === 0;
                        const isSat = colIdx === 6;
                        const cellDateStr = cell.currentMonth
                            ? `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(cell.day).padStart(2, '0')}`
                            : null;

                        return (
                            <div
                                key={idx}
                                onClick={() => openDay(cell.day, cell.currentMonth)}
                                style={{
                                    minHeight: 96,
                                    padding: '6px 6px 4px',
                                    borderRight: (idx + 1) % 7 !== 0 ? '1px solid var(--border-color)' : 'none',
                                    borderBottom: idx < 35 ? '1px solid var(--border-color)' : 'none',
                                    background: !cell.currentMonth ? '#fafafa' : isT ? '#fff7ed' : '#fff',
                                    cursor: cell.currentMonth ? 'pointer' : 'default',
                                    transition: 'background 0.12s',
                                    position: 'relative',
                                }}
                                onMouseEnter={e => { if (cell.currentMonth) e.currentTarget.style.background = isT ? '#ffedd5' : '#f8fafc'; }}
                                onMouseLeave={e => { if (cell.currentMonth) e.currentTarget.style.background = isT ? '#fff7ed' : '#fff'; }}
                            >
                                <div style={{
                                    width: 26, height: 26, borderRadius: '50%',
                                    background: isT ? '#f97316' : 'transparent',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    marginBottom: 4,
                                }}>
                                    <span style={{
                                        fontSize: 13, fontWeight: isT ? 800 : cell.currentMonth ? 600 : 400,
                                        color: isT ? '#fff' : !cell.currentMonth ? '#c4c8cc' : isSun ? '#ef4444' : isSat ? '#3b82f6' : 'var(--text-primary)',
                                    }}>
                                        {cell.day}
                                    </span>
                                </div>
                                {/* Event pills */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    {dayEvents.slice(0, 3).map(ev => {
                                        const sc = STATUS_COLORS[ev.status] || STATUS_COLORS['Cần làm'];
                                        return (
                                            <div key={ev.id} style={{
                                                fontSize: 11, fontWeight: 600, padding: '2px 6px', borderRadius: 4,
                                                background: sc.bg, color: sc.text,
                                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                display: 'flex', alignItems: 'center', gap: 3,
                                            }}>
                                                <span style={{ width: 5, height: 5, borderRadius: '50%', background: sc.dot, flexShrink: 0 }} />
                                                {ev.startTime && <span style={{ opacity: 0.7, fontWeight: 400, flexShrink: 0 }}>{ev.startTime}</span>}
                                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.title}</span>
                                            </div>
                                        );
                                    })}
                                    {dayEvents.length > 3 && (
                                        <div style={{ fontSize: 10, color: 'var(--text-muted)', paddingLeft: 4, fontWeight: 600 }}>
                                            +{dayEvents.length - 3} việc nữa
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Trạng thái:</span>
                {STATUS_OPTIONS.map(s => {
                    const sc = STATUS_COLORS[s];
                    return (
                        <span key={s} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: sc.text }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: sc.dot }} />
                            {s}
                        </span>
                    );
                })}
            </div>

            {/* Day detail modal */}
            {showDayModal && selectedDate && (
                <DayModal
                    date={selectedDate}
                    events={selectedDayEvents}
                    users={users}
                    showForm={showEventForm}
                    editingEvent={editingEvent}
                    currentUserName={session?.user?.name || ''}
                    onClose={() => { setShowDayModal(false); setShowEventForm(false); setEditingEvent(null); }}
                    onOpenForm={() => openNewEvent(selectedDate)}
                    onCancelForm={() => { setShowEventForm(false); setEditingEvent(null); }}
                    onEditEvent={openEditEvent}
                    onDeleteEvent={handleDeleteEvent}
                    onEventSaved={handleEventSaved}
                    onStatusChange={async (evId, newStatus) => {
                        setEvents(prev => prev.map(e => e.id === evId ? { ...e, status: newStatus } : e));
                        const ev = events.find(e => e.id === evId);
                        if (ev) {
                            const res = await fetch(`/api/marketing/calendar/${evId}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ ...ev, status: newStatus }),
                            });
                            const data = await res.json();
                            setEvents(prev => prev.map(e => e.id === evId ? data : e));
                        }
                    }}
                />
            )}
        </div>
    );
}

function DayModal({ date, events, users, showForm, editingEvent, currentUserName, onClose, onOpenForm, onCancelForm, onEditEvent, onDeleteEvent, onEventSaved, onStatusChange }) {
    const dayOfWeek = new Date(date + 'T00:00:00').getDay();
    const dayLabel = WEEKDAYS[dayOfWeek];
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    return (
        <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '48px 16px', overflowY: 'auto' }}
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 600, boxShadow: '0 16px 48px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 96px)', overflow: 'hidden' }}>
                {/* Modal header */}
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                    <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: isWeekend ? '#ef4444' : '#f97316', textTransform: 'uppercase', letterSpacing: 1 }}>
                            {dayLabel}
                        </div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>
                            {fmtDisplayDate(date)}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            {events.length} công việc
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {!showForm && (
                            <button
                                className="btn btn-primary"
                                onClick={onOpenForm}
                                style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}
                            >
                                <Plus size={14} /> Thêm việc
                            </button>
                        )}
                        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                    {/* Event form */}
                    {showForm && (
                        <div style={{ borderBottom: '1px solid var(--border-color)', background: '#fafafa' }}>
                            <EventForm
                                key={editingEvent?.id || 'new'}
                                date={date}
                                editingEvent={editingEvent}
                                users={users}
                                currentUserName={currentUserName}
                                onSaved={onEventSaved}
                                onCancel={onCancelForm || (() => {})}
                            />
                        </div>
                    )}

                    {/* Events list */}
                    <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {events.length === 0 && !showForm && (
                            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
                                <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
                                <div style={{ fontSize: 14, fontWeight: 600 }}>Không có việc trong ngày này</div>
                                <div style={{ fontSize: 12, marginTop: 4 }}>Bấm "+ Thêm việc" để tạo mới</div>
                            </div>
                        )}
                        {events.map(ev => (
                            <EventCard
                                key={ev.id}
                                event={ev}
                                onEdit={onEditEvent}
                                onDelete={onDeleteEvent}
                                onStatusChange={onStatusChange}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function EventCard({ event, onEdit, onDelete, onStatusChange }) {
    const sc = STATUS_COLORS[event.status] || STATUS_COLORS['Cần làm'];
    const isDone = event.status === 'Hoàn thành';

    return (
        <div style={{
            background: '#fff', borderRadius: 10, border: `1px solid ${sc.dot}30`,
            borderLeft: `4px solid ${sc.dot}`, padding: '12px 14px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                {/* Status toggle */}
                <button
                    onClick={() => onStatusChange(event.id, isDone ? 'Cần làm' : 'Hoàn thành')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: isDone ? '#22c55e' : '#d1d5db', flexShrink: 0, marginTop: 1 }}
                    title={isDone ? 'Đánh dấu chưa xong' : 'Đánh dấu hoàn thành'}
                >
                    {isDone ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                </button>

                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', textDecoration: isDone ? 'line-through' : 'none', opacity: isDone ? 0.6 : 1 }}>
                            {event.title}
                        </span>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: sc.bg, color: sc.text }}>
                            {event.status}
                        </span>
                        <span style={{ fontSize: 10, fontWeight: 700, color: PRIORITY_COLORS[event.priority] || '#6b7280' }}>
                            <Flag size={10} style={{ display: 'inline', marginRight: 2 }} />{event.priority}
                        </span>
                    </div>

                    {(event.startTime || event.endTime) && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
                            <Clock size={12} />
                            {event.startTime && <span>{event.startTime}</span>}
                            {event.startTime && event.endTime && <span>→</span>}
                            {event.endTime && <span>{event.endTime}</span>}
                        </div>
                    )}

                    {event.assignee && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
                            <User size={12} />
                            <span>{event.assignee}</span>
                        </div>
                    )}

                    {event.description && (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, marginTop: 4 }}>
                            {event.description}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button
                        onClick={() => onEdit(event)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4 }}
                        title="Chỉnh sửa"
                    >
                        <Pencil size={14} />
                    </button>
                    <button
                        onClick={() => onDelete(event.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4 }}
                        title="Xóa"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
}

function EventForm({ date, editingEvent, users, currentUserName, onSaved, onCancel }) {
    const [form, setForm] = useState({
        title: editingEvent?.title || '',
        description: editingEvent?.description || '',
        startTime: editingEvent?.startTime || '',
        endTime: editingEvent?.endTime || '',
        assignee: editingEvent?.assignee || currentUserName || '',
        status: editingEvent?.status || 'Cần làm',
        priority: editingEvent?.priority || 'Trung bình',
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const isEdit = !!editingEvent;

    const submit = async () => {
        if (!form.title.trim()) { setError('Vui lòng nhập tiêu đề'); return; }
        setSaving(true); setError('');

        const payload = {
            title: form.title.trim(),
            description: form.description.trim(),
            date,
            startTime: form.startTime || null,
            endTime: form.endTime || null,
            assignee: form.assignee,
            status: form.status,
            priority: form.priority,
        };

        const url = isEdit ? `/api/marketing/calendar/${editingEvent.id}` : '/api/marketing/calendar';
        const method = isEdit ? 'PUT' : 'POST';

        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const data = await res.json();
        setSaving(false);
        if (!res.ok) { setError(data.error || 'Lỗi lưu'); return; }
        onSaved(data, !isEdit);
    };

    return (
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: isEdit ? '#2563eb' : '#f97316' }}>
                {isEdit ? '✏️ Chỉnh sửa công việc' : '➕ Thêm công việc mới'}
            </div>

            {error && <div style={{ color: '#dc2626', fontSize: 12 }}>{error}</div>}

            <div>
                <label style={labelSt}>Tiêu đề *</label>
                <input
                    className="form-input"
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="Tên công việc..."
                    style={{ width: '100%', fontSize: 14 }}
                    autoFocus
                />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                    <label style={labelSt}>Giờ bắt đầu</label>
                    <input
                        type="time"
                        className="form-input"
                        value={form.startTime}
                        onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                        style={{ width: '100%' }}
                    />
                </div>
                <div>
                    <label style={labelSt}>Giờ kết thúc</label>
                    <input
                        type="time"
                        className="form-input"
                        value={form.endTime}
                        onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
                        style={{ width: '100%' }}
                    />
                </div>
                <div>
                    <label style={labelSt}>Trạng thái</label>
                    <select className="form-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={{ width: '100%' }}>
                        {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                    </select>
                </div>
                <div>
                    <label style={labelSt}>Ưu tiên</label>
                    <select className="form-select" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} style={{ width: '100%' }}>
                        {PRIORITY_OPTIONS.map(p => <option key={p}>{p}</option>)}
                    </select>
                </div>
            </div>

            <div>
                <label style={labelSt}>Người phụ trách</label>
                <select className="form-select" value={form.assignee} onChange={e => setForm(f => ({ ...f, assignee: e.target.value }))} style={{ width: '100%' }}>
                    <option value="">-- Chọn người --</option>
                    {users.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                </select>
            </div>

            <div>
                <label style={labelSt}>Mô tả</label>
                <textarea
                    className="form-input"
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Chi tiết công việc..."
                    rows={3}
                    style={{ width: '100%', resize: 'vertical', fontSize: 13 }}
                />
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary" onClick={onCancel} style={{ fontSize: 12 }}>Hủy</button>
                <button className="btn btn-primary" onClick={submit} disabled={saving} style={{ fontSize: 12 }}>
                    {saving ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Tạo việc'}
                </button>
            </div>
        </div>
    );
}

const labelSt = { fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 4, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 };
