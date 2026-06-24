'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

const STATUS_OPTIONS = ['Chưa bắt đầu', 'Đang thực hiện', 'Hoàn thành', 'Bị chặn', 'Trễ hạn'];
const STATUS_COLORS = {
    'Chưa bắt đầu': { bg: '#F3F4F6', color: '#6B7280', border: '#E5E7EB' },
    'Đang thực hiện': { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
    'Hoàn thành': { bg: '#F0FDF4', color: '#166534', border: '#BBF7D0' },
    'Bị chặn': { bg: '#FEF2F2', color: '#991B1B', border: '#FECACA' },
    'Trễ hạn': { bg: '#FFF7ED', color: '#C2410C', border: '#FED7AA' },
};
const DEPT_COLORS = {
    'Kinh doanh': '#8B5CF6', 'Kỹ thuật': '#3B82F6', 'Thiết kế': '#EC4899',
    'Xưởng': '#F59E0B', 'Kế toán': '#10B981', 'Kho': '#6B7280', 'Mua hàng': '#EF4444',
};

function flattenTree(nodes, result = []) {
    nodes.forEach(n => {
        result.push(n);
        if (n.children?.length) flattenTree(n.children, result);
    });
    return result;
}

function buildTree(steps) {
    const map = {};
    steps.forEach(s => { map[s.id] = { ...s, children: [] }; });
    const roots = [];
    steps.forEach(s => {
        if (s.parentId && map[s.parentId]) map[s.parentId].children.push(map[s.id]);
        else if (!s.parentId) roots.push(map[s.id]);
    });
    return roots;
}

function StatusBadge({ status }) {
    const sc = STATUS_COLORS[status] || STATUS_COLORS['Chưa bắt đầu'];
    return (
        <span style={{ fontSize: 11, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, borderRadius: 5, padding: '2px 7px', fontWeight: 500, whiteSpace: 'nowrap' }}>
            {status}
        </span>
    );
}

// ── Gantt Chart ──────────────────────────────────────────────────────────────
function GanttChart({ steps, processStartDate }) {
    const flatSteps = flattenTree(steps);
    if (!flatSteps.length || !processStartDate) {
        return <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>Chưa có dữ liệu Gantt</div>;
    }

    const start = new Date(processStartDate);
    // Find total duration
    let maxEnd = new Date(start);
    flatSteps.forEach(s => {
        if (s.endDate) {
            const e = new Date(s.endDate);
            if (e > maxEnd) maxEnd = e;
        }
    });
    const totalDays = Math.max(30, Math.ceil((maxEnd - start) / 86400000) + 7);
    const DAY_PX = 18;
    const ROW_H = 28;
    const LABEL_W = 0;
    const totalWidth = totalDays * DAY_PX;

    // Generate week headers
    const weeks = [];
    let d = new Date(start);
    d.setDate(d.getDate() - d.getDay()); // start of week
    while (d < maxEnd) {
        const offsetDays = Math.ceil((d - start) / 86400000);
        weeks.push({ label: `T${Math.ceil((d - start) / 86400000 / 7) + 1} (${d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })})`, offsetPx: Math.max(0, offsetDays * DAY_PX) });
        d = new Date(d);
        d.setDate(d.getDate() + 7);
    }

    return (
        <div style={{ overflowX: 'auto', overflowY: 'hidden' }}>
            <svg width={totalWidth + 2} height={(flatSteps.length + 2) * ROW_H + 4} style={{ display: 'block' }}>
                {/* Week columns */}
                {weeks.map((w, i) => (
                    <g key={i}>
                        <rect x={w.offsetPx} y={0} width={7 * DAY_PX} height={(flatSteps.length + 2) * ROW_H + 4} fill={i % 2 === 0 ? '#FAFAFA' : '#F3F4F6'} />
                        <text x={w.offsetPx + 3} y={14} fontSize={9} fill="#9CA3AF">{w.label}</text>
                    </g>
                ))}

                {/* Today line */}
                {(() => {
                    const todayOffset = Math.ceil((new Date() - start) / 86400000) * DAY_PX;
                    if (todayOffset >= 0 && todayOffset < totalWidth) {
                        return <line x1={todayOffset} y1={0} x2={todayOffset} y2={(flatSteps.length + 2) * ROW_H + 4} stroke="#EF4444" strokeWidth={1.5} strokeDasharray="4 3" opacity={0.6} />;
                    }
                })()}

                {/* Bars */}
                {flatSteps.map((step, i) => {
                    const y = (i + 1) * ROW_H + 4;
                    if (!step.startDate) return null;

                    const barStart = Math.max(0, Math.ceil((new Date(step.startDate) - start) / 86400000)) * DAY_PX;
                    const dur = step.duration || 1;
                    const barW = Math.max(4, dur * DAY_PX);
                    const barColor = step.color || '#3B82F6';
                    const progressW = Math.floor(barW * (step.progress / 100));
                    const isParent = step.level === 0;
                    const isPayment = step.isPaymentStep;

                    if (isPayment) {
                        // Diamond milestone
                        const cx = barStart + barW / 2;
                        const cy = y + ROW_H / 2 - 2;
                        const s = 7;
                        return (
                            <g key={step.id}>
                                <polygon points={`${cx},${cy - s} ${cx + s},${cy} ${cx},${cy + s} ${cx - s},${cy}`} fill="#F59E0B" opacity={0.9} />
                                <text x={cx + s + 3} y={cy + 4} fontSize={9} fill="#92400E">💰{step.paymentPercent}%</text>
                            </g>
                        );
                    }

                    return (
                        <g key={step.id}>
                            {/* Background bar */}
                            <rect x={barStart} y={y + (isParent ? 6 : 9)} width={barW} height={isParent ? ROW_H - 12 : ROW_H - 18} rx={isParent ? 3 : 4} fill={barColor} opacity={0.2} />
                            {/* Progress bar */}
                            {progressW > 0 && (
                                <rect x={barStart} y={y + (isParent ? 6 : 9)} width={progressW} height={isParent ? ROW_H - 12 : ROW_H - 18} rx={isParent ? 3 : 4} fill={barColor} opacity={0.85} />
                            )}
                            {/* Label if space */}
                            {barW > 40 && (
                                <text x={barStart + 4} y={y + ROW_H / 2 + 1} fontSize={9} fill={isParent ? '#1F2937' : '#374151'} fontWeight={isParent ? 700 : 400}>
                                    {step.progress > 0 ? `${step.progress}%` : ''}
                                </text>
                            )}
                        </g>
                    );
                })}

                {/* Grid lines */}
                {flatSteps.map((_, i) => (
                    <line key={i} x1={0} y1={(i + 1) * ROW_H + 4} x2={totalWidth} y2={(i + 1) * ROW_H + 4} stroke="#E5E7EB" strokeWidth={0.5} />
                ))}
            </svg>
        </div>
    );
}

// ── WBS Row ──────────────────────────────────────────────────────────────────
function WBSRow({ step, depth, collapsed, onToggle, onUpdate, dragHandlers }) {
    const [editing, setEditing] = useState(null); // field name being edited
    const [localProgress, setLocalProgress] = useState(step.progress);
    const [localStatus, setLocalStatus] = useState(step.status);
    const [localAssignee, setLocalAssignee] = useState(step.assignee || '');
    const [localNotes, setLocalNotes] = useState(step.notes || '');
    const hasChildren = step.children?.length > 0;
    const isPayment = step.isPaymentStep;
    const rowBg = isPayment ? 'rgba(245,158,11,0.07)' : depth === 0 ? '#F9FAFB' : '#fff';

    const save = async (field, value) => {
        setEditing(null);
        await onUpdate(step.id, { [field]: value });
    };

    const fmtDate = d => d ? new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—';
    const sc = STATUS_COLORS[step.status] || STATUS_COLORS['Chưa bắt đầu'];
    const deptColor = DEPT_COLORS[step.department] || '#6B7280';

    return (
        <tr
            draggable
            {...dragHandlers}
            data-id={step.id}
            style={{ background: rowBg, borderBottom: '1px solid #F3F4F6', transition: 'background 0.1s' }}
            onMouseEnter={e => !isPayment && (e.currentTarget.style.background = '#FFFBF5')}
            onMouseLeave={e => e.currentTarget.style.background = rowBg}
        >
            {/* Expand / WBS */}
            <td style={{ padding: '6px 8px 6px', paddingLeft: 8 + depth * 20, whiteSpace: 'nowrap', width: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ cursor: 'grab', color: '#D1D5DB', fontSize: 14 }}>⠿</span>
                    {hasChildren ? (
                        <button onClick={() => onToggle(step.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', fontSize: 12, padding: '0 2px', lineHeight: 1 }}>
                            {collapsed ? '▶' : '▼'}
                        </button>
                    ) : <span style={{ width: 18, display: 'inline-block' }} />}
                    <span style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'monospace', minWidth: 32 }}>{step.wbs}</span>
                </div>
            </td>

            {/* Name */}
            <td style={{ padding: '6px 10px', minWidth: 180 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    {isPayment && <span style={{ fontSize: 12 }}>💰</span>}
                    <span style={{ fontSize: 13, fontWeight: depth === 0 ? 700 : 400, color: '#111827' }}>{step.name}</span>
                    {isPayment && <span style={{ fontSize: 10, color: '#F59E0B', fontWeight: 600 }}>{step.paymentPercent}%</span>}
                </div>
            </td>

            {/* Assignee */}
            <td style={{ padding: '6px 8px', minWidth: 100 }}>
                {editing === 'assignee' ? (
                    <input
                        autoFocus
                        value={localAssignee}
                        onChange={e => setLocalAssignee(e.target.value)}
                        onBlur={() => save('assignee', localAssignee)}
                        onKeyDown={e => e.key === 'Enter' && save('assignee', localAssignee)}
                        style={{ width: '100%', border: '1px solid #F47920', borderRadius: 4, padding: '3px 6px', fontSize: 12, outline: 'none' }}
                    />
                ) : (
                    <span onClick={() => setEditing('assignee')} style={{ fontSize: 12, color: step.assignee ? '#374151' : '#D1D5DB', cursor: 'pointer', display: 'block', minHeight: 20 }}>
                        {step.assignee || 'Chưa phân công'}
                    </span>
                )}
            </td>

            {/* Department */}
            <td style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>
                <span style={{ fontSize: 11, background: deptColor + '18', color: deptColor, borderRadius: 4, padding: '2px 7px', fontWeight: 500 }}>
                    {step.department || '—'}
                </span>
            </td>

            {/* Start date */}
            <td style={{ padding: '6px 8px', fontSize: 12, color: '#374151', whiteSpace: 'nowrap' }}>{depth === 0 ? fmtDate(step.startDate) : ''}</td>
            {/* End date */}
            <td style={{ padding: '6px 8px', fontSize: 12, color: '#374151', whiteSpace: 'nowrap' }}>{depth === 0 ? fmtDate(step.endDate) : ''}</td>
            {/* Duration */}
            <td style={{ padding: '6px 8px', fontSize: 12, color: '#374151', textAlign: 'center' }}>{depth === 0 ? (step.duration || '—') : ''}</td>

            {/* Status */}
            <td style={{ padding: '6px 8px' }}>
                <select
                    value={localStatus}
                    onChange={async e => {
                        setLocalStatus(e.target.value);
                        await onUpdate(step.id, { status: e.target.value });
                    }}
                    style={{ fontSize: 11, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, borderRadius: 5, padding: '2px 6px', fontWeight: 500, cursor: 'pointer', outline: 'none' }}
                >
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </td>

            {/* Progress */}
            <td style={{ padding: '6px 8px', minWidth: 120 }}>
                {editing === 'progress' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input
                            type="range" min={0} max={100} value={localProgress}
                            onChange={e => setLocalProgress(Number(e.target.value))}
                            onMouseUp={() => save('progress', localProgress)}
                            onTouchEnd={() => save('progress', localProgress)}
                            style={{ flex: 1, accentColor: '#F47920' }}
                        />
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#374151', minWidth: 30 }}>{localProgress}%</span>
                    </div>
                ) : (
                    <div onClick={() => setEditing('progress')} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                        <div style={{ flex: 1, height: 6, background: '#E5E7EB', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${step.progress}%`, background: step.progress >= 100 ? '#10B981' : step.progress > 50 ? '#F59E0B' : '#3B82F6', borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#374151', minWidth: 30 }}>{step.progress}%</span>
                    </div>
                )}
            </td>

            {/* Notes */}
            <td style={{ padding: '6px 8px', maxWidth: 150 }}>
                {editing === 'notes' ? (
                    <input
                        autoFocus
                        value={localNotes}
                        onChange={e => setLocalNotes(e.target.value)}
                        onBlur={() => save('notes', localNotes)}
                        onKeyDown={e => e.key === 'Enter' && save('notes', localNotes)}
                        style={{ width: '100%', border: '1px solid #F47920', borderRadius: 4, padding: '3px 6px', fontSize: 12, outline: 'none' }}
                    />
                ) : (
                    <span onClick={() => setEditing('notes')} style={{ fontSize: 12, color: step.notes ? '#374151' : '#E5E7EB', cursor: 'pointer', display: 'block', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {step.notes || '+ Ghi chú'}
                    </span>
                )}
            </td>
        </tr>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ContractProcessDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const [proc, setProc] = useState(null);
    const [loading, setLoading] = useState(true);
    const [collapsed, setCollapsed] = useState({});
    const [view, setView] = useState('wbs'); // 'wbs' | 'gantt' | 'split'
    const [saving, setSaving] = useState(false);
    const [statusEdit, setStatusEdit] = useState(false);
    const dragTarget = useRef(null);
    const dragOver = useRef(null);

    const fetchProc = useCallback(async () => {
        const res = await fetch(`/api/contract-processes/${id}`);
        if (res.ok) {
            const d = await res.json();
            setProc(d);
        }
        setLoading(false);
    }, [id]);

    useEffect(() => { fetchProc(); }, [fetchProc]);

    const toggleCollapse = id => setCollapsed(c => ({ ...c, [id]: !c[id] }));

    const updateStep = async (stepId, data) => {
        const res = await fetch(`/api/contract-processes/${id}/steps/${stepId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (res.ok) {
            // Optimistic local update
            const updated = await res.json();
            setProc(p => {
                if (!p) return p;
                const newSteps = p.steps.map(s => s.id === stepId ? { ...s, ...updated } : s);
                const tree = buildTree(newSteps);
                const leafSteps = newSteps.filter(s => !newSteps.some(o => o.parentId === s.id));
                const progress = leafSteps.length > 0 ? Math.round(leafSteps.reduce((a, t) => a + t.progress, 0) / leafSteps.length) : 0;
                return { ...p, steps: newSteps, stepsTree: tree, progress };
            });
        }
    };

    const updateStatus = async (status) => {
        setSaving(true);
        await fetch(`/api/contract-processes/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status }),
        });
        setProc(p => p ? { ...p, status } : p);
        setStatusEdit(false);
        setSaving(false);
    };

    // Drag & drop reorder
    const dragHandlers = (step) => ({
        onDragStart: () => { dragTarget.current = step.id; },
        onDragOver: (e) => { e.preventDefault(); dragOver.current = step.id; },
        onDrop: async () => {
            if (!dragTarget.current || dragTarget.current === dragOver.current) return;
            const flat = flattenTree(proc.stepsTree || []);
            const fromIdx = flat.findIndex(s => s.id === dragTarget.current);
            const toIdx = flat.findIndex(s => s.id === dragOver.current);
            if (fromIdx < 0 || toIdx < 0) return;
            const reordered = [...flat];
            const [moved] = reordered.splice(fromIdx, 1);
            reordered.splice(toIdx, 0, moved);
            const updates = reordered.map((s, i) => ({ id: s.id, sortOrder: i }));
            await fetch(`/api/contract-processes/${id}/steps`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ updates }),
            });
            fetchProc();
        },
    });

    const renderRows = (nodes, depth = 0) => {
        const rows = [];
        nodes.forEach(step => {
            const isCollapsed = collapsed[step.id];
            rows.push(
                <WBSRow
                    key={step.id}
                    step={step}
                    depth={depth}
                    collapsed={isCollapsed}
                    onToggle={toggleCollapse}
                    onUpdate={updateStep}
                    dragHandlers={dragHandlers(step)}
                />
            );
            if (step.children?.length && !isCollapsed) {
                rows.push(...renderRows(step.children, depth + 1));
            }
        });
        return rows;
    };

    if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>Đang tải...</div>;
    if (!proc) return <div style={{ padding: 40, textAlign: 'center', color: '#EF4444' }}>Không tìm thấy quy trình</div>;

    const flat = flattenTree(proc.stepsTree || []);
    const completedCount = flat.filter(s => s.status === 'Hoàn thành').length;
    const inProgressCount = flat.filter(s => s.status === 'Đang thực hiện').length;
    const delayedCount = flat.filter(s => s.status === 'Trễ hạn').length;
    const blockedCount = flat.filter(s => s.status === 'Bị chặn').length;
    const typeLabel = proc.type === 'co_thiet_ke' ? 'Đã có thiết kế' : 'Chưa có thiết kế';

    return (
        <div style={{ background: '#F9FAFB', minHeight: '100vh' }}>
            {/* Top bar */}
            <div style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <Link href="/contract-management" style={{ fontSize: 13, color: '#6B7280', textDecoration: 'none' }}>← Quản lý HĐ</Link>
                <span style={{ color: '#D1D5DB' }}>/</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#F47920' }}>{proc.code}</span>
                <span style={{ fontSize: 13, color: '#374151' }}>— {proc.customer?.name}</span>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                    {['wbs', 'split', 'gantt'].map(v => (
                        <button key={v} onClick={() => setView(v)} style={{ padding: '5px 12px', borderRadius: 6, border: `1px solid ${view === v ? '#F47920' : '#E5E7EB'}`, background: view === v ? '#FFF7ED' : '#fff', color: view === v ? '#F47920' : '#6B7280', fontSize: 12, fontWeight: view === v ? 600 : 400, cursor: 'pointer' }}>
                            {v === 'wbs' ? '📋 WBS' : v === 'split' ? '⬛ Split' : '📊 Gantt'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Header */}
            <div style={{ background: '#fff', padding: '16px 20px', borderBottom: '1px solid #E5E7EB' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 260 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111827' }}>
                                {proc.name || proc.customer?.name}
                            </h1>
                            <span style={{ fontSize: 11, background: proc.type === 'co_thiet_ke' ? '#EFF6FF' : '#F5F3FF', color: proc.type === 'co_thiet_ke' ? '#1D4ED8' : '#6D28D9', borderRadius: 5, padding: '2px 8px', fontWeight: 500 }}>
                                {typeLabel}
                            </span>
                        </div>
                        <div style={{ fontSize: 13, color: '#6B7280', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                            <span>👤 {proc.customer?.phone}</span>
                            {proc.contract && <span>📄 HĐ {proc.contract.code} — {proc.contract.contractValue?.toLocaleString('vi-VN')}đ</span>}
                            {proc.startDate && <span>📅 Bắt đầu {new Date(proc.startDate).toLocaleDateString('vi-VN')}</span>}
                        </div>
                    </div>

                    {/* Status */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                        {statusEdit ? (
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                {['Đang thực hiện', 'Đang thiết kế', 'Đang sản xuất', 'Đang thi công', 'Chờ nghiệm thu', 'Hoàn thành'].map(s => (
                                    <button key={s} onClick={() => updateStatus(s)} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 5, border: `1px solid ${proc.status === s ? '#F47920' : '#E5E7EB'}`, background: proc.status === s ? '#FFF7ED' : '#fff', color: proc.status === s ? '#F47920' : '#374151', cursor: 'pointer' }}>
                                        {s}
                                    </button>
                                ))}
                                <button onClick={() => setStatusEdit(false)} style={{ fontSize: 11, padding: '4px 8px', border: 'none', background: 'none', color: '#9CA3AF', cursor: 'pointer' }}>✕</button>
                            </div>
                        ) : (
                            <button onClick={() => setStatusEdit(true)} style={{ fontSize: 12, background: '#F3F4F6', color: '#374151', border: '1px solid #E5E7EB', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontWeight: 500 }}>
                                {proc.status} ✎
                            </button>
                        )}
                    </div>
                </div>

                {/* Overall progress */}
                <div style={{ marginTop: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: '#6B7280' }}>Tiến độ tổng thể</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: proc.progress >= 100 ? '#10B981' : '#F47920' }}>{proc.progress}%</span>
                    </div>
                    <div style={{ height: 10, background: '#E5E7EB', borderRadius: 5, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${proc.progress}%`, background: proc.progress >= 100 ? '#10B981' : proc.progress > 60 ? '#F59E0B' : '#3B82F6', borderRadius: 5, transition: 'width 0.4s' }} />
                    </div>
                </div>

                {/* Quick stats */}
                <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
                    {[
                        { label: 'Tổng bước', value: flat.length, color: '#6B7280' },
                        { label: 'Hoàn thành', value: completedCount, color: '#10B981' },
                        { label: 'Đang thực hiện', value: inProgressCount, color: '#3B82F6' },
                        { label: 'Trễ hạn', value: delayedCount, color: '#EF4444' },
                        { label: 'Bị chặn', value: blockedCount, color: '#F59E0B' },
                    ].map(s => (
                        <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                            <span style={{ fontSize: 12, color: '#6B7280' }}>{s.label}:</span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: s.color }}>{s.value}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Content */}
            <div style={{ display: 'flex', height: 'calc(100vh - 220px)', overflow: 'hidden' }}>
                {/* WBS Panel */}
                {(view === 'wbs' || view === 'split') && (
                    <div style={{ flex: view === 'split' ? '0 0 60%' : '1 1 100%', overflowX: 'auto', overflowY: 'auto', borderRight: view === 'split' ? '2px solid #E5E7EB' : 'none' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 900 }}>
                            <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                                <tr style={{ background: '#F1F5F9', borderBottom: '2px solid #E2E8F0' }}>
                                    <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>WBS</th>
                                    <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, minWidth: 180 }}>Tên công việc</th>
                                    <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 }}>Người phụ trách</th>
                                    <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 }}>Phòng ban</th>
                                    <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>Bắt đầu</th>
                                    <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>Kết thúc</th>
                                    <th style={{ padding: '8px 10px', textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>Ngày</th>
                                    <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 }}>Trạng thái</th>
                                    <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, minWidth: 130 }}>% hoàn thành</th>
                                    <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 }}>Ghi chú</th>
                                </tr>
                            </thead>
                            <tbody>
                                {renderRows(proc.stepsTree || [])}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Gantt Panel */}
                {(view === 'gantt' || view === 'split') && (
                    <div style={{ flex: view === 'split' ? '0 0 40%' : '1 1 100%', overflowX: 'auto', overflowY: 'auto', background: '#fff', padding: '0 0' }}>
                        <div style={{ position: 'sticky', top: 0, background: '#F1F5F9', borderBottom: '2px solid #E2E8F0', padding: '8px 14px', zIndex: 10 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 }}>📊 Gantt Chart</span>
                        </div>
                        {view === 'split' && (
                            <div style={{ padding: '0 0', position: 'relative' }}>
                                {/* Row spacers to align with WBS */}
                                <div style={{ height: 28 * flattenTree(proc.stepsTree || []).length + 8 }}>
                                    <GanttChart steps={proc.stepsTree || []} processStartDate={proc.startDate} />
                                </div>
                            </div>
                        )}
                        {view === 'gantt' && <GanttChart steps={proc.stepsTree || []} processStartDate={proc.startDate} />}
                    </div>
                )}
            </div>
        </div>
    );
}
