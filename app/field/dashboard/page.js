'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE = 'https://api.kientrucsct.com';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : '';
const isOverdue = (d) => d && new Date(d) < new Date();

const STATUS_COLOR = {
    'Hoàn thành': '#22c55e',
    'Đang thi công': '#3b82f6',
    'Sẵn sàng': '#f59e0b',
    'Chưa bắt đầu': '#475569',
    'Chờ xử lý': '#f59e0b',
    'Đang thực hiện': '#3b82f6',
    'Tạm dừng': '#ef4444',
};

const PRIORITY_COLOR = { 'Khẩn cấp': '#ef4444', 'Cao': '#f97316', 'Trung bình': '#3b82f6', 'Thấp': '#64748b' };

function TaskCard({ task, onClick }) {
    const overdue = isOverdue(task.endDate) && task.status !== 'Hoàn thành';
    return (
        <div onClick={() => onClick(task)} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: '14px 16px', marginBottom: 10, border: `1px solid ${overdue ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.07)'}`, cursor: 'pointer', transition: 'all 0.15s', WebkitTapHighlightColor: 'transparent', active: { transform: 'scale(0.98)' } }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.name}</div>
                    <div style={{ fontSize: 12, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        📁 {task.project?.name}
                    </div>
                </div>
                <span style={{ marginLeft: 8, fontSize: 11, padding: '3px 8px', borderRadius: 6, background: `${STATUS_COLOR[task.status] || '#475569'}22`, color: STATUS_COLOR[task.status] || '#94a3b8', fontWeight: 600, flexShrink: 0 }}>
                    {task.status}
                </span>
            </div>

            {/* Progress bar */}
            <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden', marginBottom: 8 }}>
                <div style={{ height: '100%', width: `${task.progress}%`, background: task.progress === 100 ? '#22c55e' : 'linear-gradient(90deg, #3b82f6, #8b5cf6)', borderRadius: 2 }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: overdue ? '#ef4444' : '#64748b' }}>
                    {overdue ? '⚠️ Quá hạn ' : ''}{fmtDate(task.startDate)} → {fmtDate(task.endDate)}
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: task.progress === 100 ? '#22c55e' : '#3b82f6' }}>{task.progress}%</span>
            </div>
        </div>
    );
}

function WorkOrderCard({ order, onClick }) {
    const overdue = isOverdue(order.dueDate);
    return (
        <div onClick={() => onClick(order)} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: '14px 16px', marginBottom: 10, border: `1px solid ${overdue ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.07)'}`, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10, color: '#475569', marginBottom: 2 }}>{order.code}</div>
                    <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{order.title}</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>📁 {order.project?.name}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0, marginLeft: 8 }}>
                    <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, background: `${PRIORITY_COLOR[order.priority] || '#475569'}22`, color: PRIORITY_COLOR[order.priority] || '#94a3b8', fontWeight: 600 }}>
                        {order.priority}
                    </span>
                    <span style={{ fontSize: 11, color: overdue ? '#ef4444' : '#64748b' }}>
                        {overdue ? '⚠️ ' : ''}{fmtDate(order.dueDate)}
                    </span>
                </div>
            </div>
            {order.description && (
                <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{order.description}</div>
            )}
        </div>
    );
}

export default function FieldDashboard() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('tasks');
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = useCallback(async (token) => {
        try {
            const res = await fetch(`${API_BASE}/api/field/my-tasks`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.status === 401) {
                localStorage.removeItem('field_token');
                router.replace('/field');
                return;
            }
            const json = await res.json();
            setData(json);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [router]);

    useEffect(() => {
        const token = localStorage.getItem('field_token');
        if (!token) { router.replace('/field'); return; }
        const u = JSON.parse(localStorage.getItem('field_user') || '{}');
        setUser(u);
        fetchData(token);
    }, [fetchData, router]);

    const handleRefresh = () => {
        setRefreshing(true);
        const token = localStorage.getItem('field_token');
        fetchData(token);
    };

    const handleLogout = () => {
        localStorage.removeItem('field_token');
        localStorage.removeItem('field_user');
        router.replace('/field');
    };

    const handleTaskClick = (task) => {
        router.push(`/field/update/${task.id}?projectId=${task.projectId}&name=${encodeURIComponent(task.name)}&progress=${task.progress}`);
    };

    const handleWorkOrderClick = (order) => {
        router.push(`/field/work-order/${order.id}`);
    };

    if (loading) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
            <div style={{ textAlign: 'center', color: '#64748b' }}>
                <div style={{ width: 36, height: 36, border: '3px solid #1e293b', borderTop: '3px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
                <div style={{ fontSize: 13 }}>Đang tải...</div>
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );

    const tasks = data?.tasks || [];
    const workOrders = data?.workOrders || [];
    const activeTasks = tasks.filter(t => t.status !== 'Hoàn thành');
    const activeOrders = workOrders.filter(o => o.status !== 'Hoàn thành');

    return (
        <>
            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .task-card:active { transform: scale(0.98); }
            `}</style>
            <div style={{ minHeight: '100vh', background: '#0f172a', paddingBottom: 80 }}>
                {/* Header */}
                <div style={{ padding: '52px 16px 16px', background: 'linear-gradient(180deg, #1e293b 0%, transparent 100%)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <div style={{ fontSize: 11, color: '#475569', letterSpacing: 2, textTransform: 'uppercase' }}>Xin chào</div>
                            <div style={{ fontSize: 20, fontWeight: 700, color: '#f8fafc', marginTop: 2 }}>{user?.name}</div>
                            <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>{user?.role}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <button onClick={handleRefresh} disabled={refreshing} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 12px', color: '#94a3b8', fontSize: 14, cursor: 'pointer' }}>
                                {refreshing ? '⟳' : '↻'}
                            </button>
                            <button onClick={handleLogout} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '8px 12px', color: '#f87171', fontSize: 12, cursor: 'pointer' }}>
                                Đăng xuất
                            </button>
                        </div>
                    </div>

                    {/* Stats */}
                    <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                        <div style={{ flex: 1, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 12, padding: '12px 14px' }}>
                            <div style={{ fontSize: 22, fontWeight: 700, color: '#3b82f6' }}>{activeTasks.length}</div>
                            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Hạng mục</div>
                        </div>
                        <div style={{ flex: 1, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 12, padding: '12px 14px' }}>
                            <div style={{ fontSize: 22, fontWeight: 700, color: '#f59e0b' }}>{activeOrders.length}</div>
                            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Lệnh công việc</div>
                        </div>
                        <div style={{ flex: 1, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 12, padding: '12px 14px' }}>
                            <div style={{ fontSize: 22, fontWeight: 700, color: '#22c55e' }}>{tasks.filter(t => t.status === 'Hoàn thành').length}</div>
                            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Hoàn thành</div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', padding: '0 16px', marginBottom: 16, gap: 8 }}>
                    <button onClick={() => setTab('tasks')} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: tab === 'tasks' ? '#3b82f6' : 'rgba(255,255,255,0.05)', color: tab === 'tasks' ? '#fff' : '#64748b', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                        Hạng mục ({activeTasks.length})
                    </button>
                    <button onClick={() => setTab('orders')} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: tab === 'orders' ? '#f59e0b' : 'rgba(255,255,255,0.05)', color: tab === 'orders' ? '#fff' : '#64748b', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                        Lệnh ({activeOrders.length})
                    </button>
                </div>

                {/* Content */}
                <div style={{ padding: '0 16px' }}>
                    {tab === 'tasks' && (
                        activeTasks.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px 0', color: '#475569' }}>
                                <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                                <div style={{ fontSize: 14 }}>Không có hạng mục nào được giao</div>
                            </div>
                        ) : (
                            <div style={{ animation: 'fadeIn 0.3s ease' }}>
                                {activeTasks.map(t => <TaskCard key={t.id} task={t} onClick={handleTaskClick} />)}
                            </div>
                        )
                    )}

                    {tab === 'orders' && (
                        activeOrders.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px 0', color: '#475569' }}>
                                <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
                                <div style={{ fontSize: 14 }}>Không có lệnh công việc nào</div>
                            </div>
                        ) : (
                            <div style={{ animation: 'fadeIn 0.3s ease' }}>
                                {activeOrders.map(o => <WorkOrderCard key={o.id} order={o} onClick={handleWorkOrderClick} />)}
                            </div>
                        )
                    )}
                </div>
            </div>
        </>
    );
}
