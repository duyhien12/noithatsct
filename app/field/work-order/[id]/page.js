'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

const API_BASE = 'https://api.kientrucsct.com';

const STATUS_FLOW = ['Chờ xử lý', 'Đang thực hiện', 'Tạm dừng', 'Hoàn thành'];
const STATUS_COLOR = { 'Hoàn thành': '#22c55e', 'Đang thực hiện': '#3b82f6', 'Chờ xử lý': '#f59e0b', 'Tạm dừng': '#ef4444' };

export default function WorkOrderDetail() {
    const router = useRouter();
    const { id } = useParams();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [note, setNote] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        const token = localStorage.getItem('field_token');
        if (!token) { router.replace('/field'); return; }

        fetch(`${API_BASE}/api/work-orders/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(r => r.json())
            .then(data => { setOrder(data); setLoading(false); })
            .catch(() => setLoading(false));
    }, [id, router]);

    const updateStatus = async (newStatus) => {
        setUpdating(true);
        setError('');
        try {
            const token = localStorage.getItem('field_token');
            const res = await fetch(`${API_BASE}/api/work-orders/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    title: order.title,
                    projectId: order.projectId,
                    status: newStatus,
                    priority: order.priority,
                    assignee: order.assignee,
                    category: order.category,
                    dueDate: order.dueDate,
                    description: note ? (order.description || '') + '\n\n[Ghi chú] ' + note : order.description,
                }),
            });
            if (!res.ok) throw new Error('Cập nhật thất bại');
            const updated = await res.json();
            setOrder(updated);
            setSuccess(`Đã cập nhật: ${newStatus}`);
            setNote('');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.message);
        } finally {
            setUpdating(false);
        }
    };

    if (loading) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
            <div style={{ width: 36, height: 36, border: '3px solid #1e293b', borderTop: '3px solid #f59e0b', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );

    if (!order) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: '#ef4444' }}>
            Không tìm thấy lệnh công việc
        </div>
    );

    const currentStatusIdx = STATUS_FLOW.indexOf(order.status);
    const nextStatuses = STATUS_FLOW.slice(currentStatusIdx + 1);

    return (
        <>
            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                textarea { resize: none; -webkit-appearance: none; }
                textarea:focus { outline: none; }
            `}</style>
            <div style={{ minHeight: '100vh', background: '#0f172a', paddingBottom: 32 }}>
                {/* Header */}
                <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(10px)', padding: '52px 16px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <button onClick={() => router.back()} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 12px', color: '#94a3b8', fontSize: 16, cursor: 'pointer' }}>←</button>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 10, color: '#475569' }}>{order.code}</div>
                            <div style={{ fontWeight: 600, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{order.title}</div>
                        </div>
                        <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 8, background: `${STATUS_COLOR[order.status] || '#475569'}22`, color: STATUS_COLOR[order.status] || '#94a3b8', fontWeight: 600 }}>
                            {order.status}
                        </span>
                    </div>
                </div>

                <div style={{ padding: '20px 16px' }}>
                    {/* Info Card */}
                    <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 16, marginBottom: 16, border: '1px solid rgba(255,255,255,0.07)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div>
                                <div style={{ fontSize: 10, color: '#475569', marginBottom: 3 }}>Dự án</div>
                                <div style={{ fontSize: 13, fontWeight: 600 }}>{order.project?.name}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: 10, color: '#475569', marginBottom: 3 }}>Ưu tiên</div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: order.priority === 'Khẩn cấp' ? '#ef4444' : order.priority === 'Cao' ? '#f97316' : '#94a3b8' }}>{order.priority}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: 10, color: '#475569', marginBottom: 3 }}>Hạn chót</div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: order.dueDate && new Date(order.dueDate) < new Date() ? '#ef4444' : '#94a3b8' }}>
                                    {order.dueDate ? new Date(order.dueDate).toLocaleDateString('vi-VN') : 'Chưa có'}
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: 10, color: '#475569', marginBottom: 3 }}>Danh mục</div>
                                <div style={{ fontSize: 13 }}>{order.category || 'Chưa phân loại'}</div>
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    {order.description && (
                        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: '14px 16px', marginBottom: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ fontSize: 11, color: '#475569', marginBottom: 6 }}>Mô tả</div>
                            <div style={{ fontSize: 14, color: '#cbd5e1', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{order.description}</div>
                        </div>
                    )}

                    {/* Success/Error */}
                    {success && <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: '#4ade80' }}>{success}</div>}
                    {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: '#f87171' }}>{error}</div>}

                    {/* Update Status */}
                    {order.status !== 'Hoàn thành' && (
                        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 16, border: '1px solid rgba(255,255,255,0.07)' }}>
                            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Cập nhật trạng thái</div>

                            <textarea
                                value={note}
                                onChange={e => setNote(e.target.value)}
                                placeholder="Ghi chú (tùy chọn)..."
                                rows={2}
                                style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#f8fafc', fontSize: 14, marginBottom: 12 }}
                            />

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {order.status === 'Chờ xử lý' && (
                                    <button onClick={() => updateStatus('Đang thực hiện')} disabled={updating} style={{ padding: '13px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #3b82f6, #0ea5e9)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                                        Bắt đầu thực hiện
                                    </button>
                                )}
                                {order.status === 'Đang thực hiện' && (
                                    <>
                                        <button onClick={() => updateStatus('Tạm dừng')} disabled={updating} style={{ padding: '13px', borderRadius: 12, border: 'none', background: 'rgba(239,68,68,0.15)', color: '#f87171', fontSize: 14, fontWeight: 600, cursor: 'pointer', border: '1px solid rgba(239,68,68,0.3)' }}>
                                            Tạm dừng
                                        </button>
                                        <button onClick={() => updateStatus('Hoàn thành')} disabled={updating} style={{ padding: '13px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                                            Hoàn thành
                                        </button>
                                    </>
                                )}
                                {order.status === 'Tạm dừng' && (
                                    <button onClick={() => updateStatus('Đang thực hiện')} disabled={updating} style={{ padding: '13px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #3b82f6, #0ea5e9)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                                        Tiếp tục thực hiện
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {order.status === 'Hoàn thành' && (
                        <div style={{ textAlign: 'center', padding: '24px', background: 'rgba(34,197,94,0.08)', borderRadius: 16, border: '1px solid rgba(34,197,94,0.2)' }}>
                            <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
                            <div style={{ fontSize: 14, color: '#4ade80', fontWeight: 600 }}>Lệnh công việc đã hoàn thành</div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
