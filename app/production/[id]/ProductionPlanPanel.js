'use client';
import { useState, useEffect, useCallback } from 'react';
import { Check, Circle, Plus, Trash2, AlertTriangle } from 'lucide-react';

const STAGE_STYLE = {
    intake:     { color: '#4f46e5', bg: '#ede9fe' },
    material:   { color: '#0891b2', bg: '#cffafe' },
    production: { color: '#b45309', bg: '#fef3c7' },
    install:    { color: '#1d4ed8', bg: '#dbeafe' },
    complete:   { color: '#15803d', bg: '#dcfce7' },
};

function isOverdue(step) {
    if (step.completed || !step.deadline) return false;
    return new Date(step.deadline) < new Date(new Date().toDateString());
}

function fmtDateInput(value) {
    if (!value) return '';
    return new Date(value).toISOString().slice(0, 10);
}

export default function ProductionPlanPanel({ projectId }) {
    const [plan, setPlan] = useState(null);
    const [loading, setLoading] = useState(true);
    const [openStage, setOpenStage] = useState(null);
    const [addingStage, setAddingStage] = useState(null);
    const [newStepName, setNewStepName] = useState('');

    const fetchPlan = useCallback(async () => {
        const res = await fetch(`/api/production-plan/${projectId}`);
        const data = await res.json();
        setPlan(data);
        setLoading(false);
        if (openStage === null && data?.stages?.length) setOpenStage(data.stages[0].id);
    }, [projectId, openStage]);

    useEffect(() => { fetchPlan(); }, [fetchPlan]);

    async function toggleStep(step) {
        setPlan(p => ({
            ...p,
            stages: p.stages.map(s => ({
                ...s,
                steps: s.steps.map(st => st.id === step.id ? { ...st, completed: !step.completed } : st),
            })),
        }));
        await fetch(`/api/production-plan/steps/${step.id}`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ completed: !step.completed }),
        });
    }

    async function setDeadline(step, value) {
        setPlan(p => ({
            ...p,
            stages: p.stages.map(s => ({
                ...s,
                steps: s.steps.map(st => st.id === step.id ? { ...st, deadline: value || null } : st),
            })),
        }));
        await fetch(`/api/production-plan/steps/${step.id}`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deadline: value || null }),
        });
    }

    async function setStartDate(step, value) {
        setPlan(p => ({
            ...p,
            stages: p.stages.map(s => ({
                ...s,
                steps: s.steps.map(st => st.id === step.id ? { ...st, startDate: value || null } : st),
            })),
        }));
        await fetch(`/api/production-plan/steps/${step.id}`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ startDate: value || null }),
        });
    }

    async function addStep(stageId) {
        if (!newStepName.trim()) return;
        await fetch(`/api/production-plan/stages/${stageId}/steps`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newStepName.trim() }),
        });
        setNewStepName(''); setAddingStage(null);
        fetchPlan();
    }

    async function deleteStep(stepId) {
        if (!confirm('Xoá bước này?')) return;
        await fetch(`/api/production-plan/steps/${stepId}`, { method: 'DELETE' });
        fetchPlan();
    }

    if (loading) return (
        <div style={{ padding: 30, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>Đang tải kế hoạch...</div>
    );
    if (!plan?.stages) return (
        <div style={{ padding: 30, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>Không tải được kế hoạch sản xuất.</div>
    );

    return (
        <div>
            {/* Stage row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, overflowX: 'auto', paddingBottom: 4, marginBottom: 14 }}>
                {plan.stages.map((stage, i) => {
                    const st = STAGE_STYLE[stage.key] || STAGE_STYLE.intake;
                    const total = stage.steps.length;
                    const done = stage.steps.filter(s => s.completed).length;
                    const hasOverdue = stage.steps.some(isOverdue);
                    const active = openStage === stage.id;
                    return (
                        <div key={stage.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <div onClick={() => setOpenStage(active ? null : stage.id)} style={{
                                minWidth: 110, padding: '10px 14px', borderRadius: 10, textAlign: 'center', cursor: 'pointer',
                                background: hasOverdue ? '#fee2e2' : st.bg,
                                border: `2px solid ${hasOverdue ? '#dc2626' : active ? st.color : 'transparent'}`,
                                transition: 'transform 0.1s',
                            }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: hasOverdue ? '#dc2626' : st.color, marginBottom: 4, whiteSpace: 'nowrap' }}>
                                    {stage.name}
                                </div>
                                <div style={{ fontSize: 20, fontWeight: 800, color: hasOverdue ? '#dc2626' : st.color, lineHeight: 1 }}>
                                    {done}/{total}
                                </div>
                                {hasOverdue && (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, fontSize: 9, color: '#dc2626', marginTop: 3, fontWeight: 600 }}>
                                        <AlertTriangle size={10} /> Quá hạn
                                    </div>
                                )}
                            </div>
                            {i < plan.stages.length - 1 && (
                                <svg width={18} height={18} viewBox="0 0 18 18">
                                    <path d="M4 9h10M10 5l4 4-4 4" stroke="#64748b" strokeWidth={2} fill="none" />
                                </svg>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Expanded stage steps */}
            {plan.stages.filter(s => s.id === openStage).map(stage => {
                const st = STAGE_STYLE[stage.key] || STAGE_STYLE.intake;
                return (
                    <div key={stage.id} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, padding: 14 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: st.color, marginBottom: 10 }}>{stage.name}</div>
                        {stage.steps.map(step => {
                            const overdue = isOverdue(step);
                            return (
                                <div key={step.id} style={{
                                    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
                                    borderBottom: '1px solid #f3f4f6',
                                }}>
                                    <button onClick={() => toggleStep(step)} style={{
                                        width: 26, height: 26, borderRadius: 6, border: 'none', cursor: 'pointer', flexShrink: 0,
                                        background: step.completed ? '#16a34a' : '#f3f4f6', color: step.completed ? 'white' : '#9ca3af',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        {step.completed ? <Check size={14} strokeWidth={2.5} /> : <Circle size={12} />}
                                    </button>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 13, color: step.completed ? '#9ca3af' : '#111827', textDecoration: step.completed ? 'line-through' : 'none' }}>
                                            {step.name}
                                        </div>
                                        {step.completed && step.completedBy && (
                                            <div style={{ fontSize: 10, color: '#9ca3af' }}>
                                                Hoàn thành bởi {step.completedBy}
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                        <input
                                            type="date"
                                            value={fmtDateInput(step.startDate)}
                                            onChange={e => setStartDate(step, e.target.value)}
                                            title="Ngày bắt đầu"
                                            style={{
                                                padding: '5px 8px', borderRadius: 6, fontSize: 12,
                                                border: '1px solid #e5e7eb', color: '#374151', background: 'white',
                                            }}
                                        />
                                        <span style={{ fontSize: 11, color: '#9ca3af' }}>→</span>
                                        <input
                                            type="date"
                                            value={fmtDateInput(step.deadline)}
                                            onChange={e => setDeadline(step, e.target.value)}
                                            title="Ngày kết thúc"
                                            style={{
                                                padding: '5px 8px', borderRadius: 6, fontSize: 12,
                                                border: `1px solid ${overdue ? '#dc2626' : '#e5e7eb'}`,
                                                color: overdue ? '#dc2626' : '#374151',
                                                background: overdue ? '#fef2f2' : 'white',
                                            }}
                                        />
                                    </div>
                                    <button onClick={() => deleteStep(step.id)} style={{ padding: '3px 4px', border: 'none', background: 'transparent', color: '#d1d5db', cursor: 'pointer', flexShrink: 0 }}>
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            );
                        })}

                        {addingStage === stage.id ? (
                            <div style={{ display: 'flex', gap: 7, marginTop: 10 }}>
                                <input autoFocus value={newStepName} onChange={e => setNewStepName(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') addStep(stage.id); if (e.key === 'Escape') setAddingStage(null); }}
                                    placeholder="Tên bước..." style={{ flex: 1, padding: '7px 10px', borderRadius: 7, border: '1px solid #93c5fd', fontSize: 13 }} />
                                <button onClick={() => addStep(stage.id)} style={{ padding: '7px 14px', borderRadius: 7, background: '#2563eb', color: 'white', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Thêm</button>
                                <button onClick={() => setAddingStage(null)} style={{ padding: '7px 10px', borderRadius: 7, border: '1px solid #e5e7eb', background: 'white', color: '#6b7280', cursor: 'pointer', fontSize: 13 }}>Huỷ</button>
                            </div>
                        ) : (
                            <button onClick={() => { setAddingStage(stage.id); setNewStepName(''); }}
                                style={{ marginTop: 10, padding: '7px 12px', borderRadius: 7, border: '1px dashed #d1d5db', background: 'transparent', color: '#6b7280', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
                                <Plus size={13} /> Thêm bước
                            </button>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
