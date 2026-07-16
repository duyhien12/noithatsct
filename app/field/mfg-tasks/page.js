'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE = 'https://api.kientrucsct.com';
const PRIORITY_COLOR = { URGENT: '#ef4444', HIGH: '#f97316', NORMAL: '#3b82f6', LOW: '#64748b' };
const PRIORITY_LABEL = { URGENT: 'Khẩn cấp', HIGH: 'Cao', NORMAL: 'Trung bình', LOW: 'Thấp' };
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : '';
const isOverdue = (d) => d && new Date(d) < new Date();

export default function FieldMfgTasksPage() {
    const router = useRouter();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        const token = localStorage.getItem('field_token');
        if (!token) { router.replace('/field'); return; }
        try {
            const res = await fetch(`${API_BASE}/api/field/mfg-tasks`, { headers: { Authorization: `Bearer ${token}` } });
            const d = await res.json();
            setTasks(d.tasks || []);
        } finally {
            setLoading(false);
        }
    }, [router]);

    useEffect(() => { load(); }, [load]);

    return (
        <div style={{ minHeight: '100vh', background: '#0f172a', paddingBottom: 40, color: '#f8fafc' }}>
            <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(10px)', padding: '52px 16px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button onClick={() => router.push('/field/dashboard')} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 12px', color: '#94a3b8', fontSize: 16 }}>←</button>
                    <div style={{ fontWeight: 700, fontSize: 17 }}>🏭 Công việc sản xuất</div>
                </div>
            </div>

            <div style={{ padding: '16px' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', color: '#64748b', padding: 40 }}>Đang tải...</div>
                ) : tasks.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#64748b', padding: 40 }}>Không có công việc nào được giao.</div>
                ) : tasks.map(t => {
                    const overdue = isOverdue(t.dueDate);
                    return (
                        <div key={t.id} onClick={() => router.push(`/field/mfg-tasks/${t.id}`)}
                            style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: '14px 16px', marginBottom: 10, border: `1px solid ${overdue ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.07)'}`, cursor: 'pointer' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 10, color: '#475569' }}>{t.mfgOrder?.code} {t.item ? `· ${t.item.code}` : ''}</div>
                                    <div style={{ fontWeight: 600, fontSize: 14 }}>{t.title}</div>
                                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>📁 {t.mfgOrder?.project?.name}</div>
                                </div>
                                <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, background: `${PRIORITY_COLOR[t.priority]}22`, color: PRIORITY_COLOR[t.priority], fontWeight: 600, flexShrink: 0 }}>
                                    {PRIORITY_LABEL[t.priority]}
                                </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 11, color: overdue ? '#ef4444' : '#64748b' }}>{overdue ? '⚠️ Quá hạn ' : ''}{fmtDate(t.dueDate)}</span>
                                <span style={{ fontSize: 12, color: '#3b82f6', fontWeight: 600 }}>{t.status}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
