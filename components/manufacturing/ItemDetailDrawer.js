'use client';
import { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, Circle, PlayCircle, Loader2, QrCode } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { ITEM_STATUS_LABELS, STAGE_STATUS_LABELS } from '@/lib/manufacturing/constants';

const STAGE_DOT_COLOR = {
    NOT_STARTED: '#d1d5db', READY: '#93c5fd', IN_PROGRESS: '#f59e0b', PAUSED: '#a78bfa',
    BLOCKED: '#f87171', WAITING_APPROVAL: '#fbbf24', COMPLETED: '#22c55e', FAILED: '#ef4444', CANCELLED: '#9ca3af',
};

export default function ItemDetailDrawer({ itemId, onClose, onChanged, canUpdateStage = true }) {
    const toast = useToast();
    const [item, setItem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [busyStageId, setBusyStageId] = useState(null);

    const load = useCallback(() => {
        if (!itemId) return;
        setLoading(true);
        fetch(`/api/manufacturing/items/${itemId}`).then(r => r.json()).then(d => { setItem(d); setLoading(false); }).catch(() => setLoading(false));
    }, [itemId]);

    useEffect(load, [load]);

    async function updateStage(stageId, status) {
        setBusyStageId(stageId);
        try {
            const res = await fetch(`/api/manufacturing/item-stages/${stageId}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
            });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error || 'Lỗi cập nhật công đoạn');
            toast.success('Đã cập nhật công đoạn');
            load();
            onChanged?.();
        } catch (e) {
            toast.error(e.message);
        } finally {
            setBusyStageId(null);
        }
    }

    return (
        <Modal isOpen={!!itemId} onClose={onClose} title={item ? `${item.code} — ${item.name}` : 'Đang tải...'} maxWidth={720}>
            {loading || !item ? (
                <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}><Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /></div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <a href={`/api/manufacturing/items/${itemId}/qr`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
                            <QrCode size={14} /> Mã QR sản phẩm
                        </a>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, fontSize: 13 }}>
                        <div><div style={{ color: 'var(--text-muted)' }}>Trạng thái</div><div style={{ fontWeight: 600 }}>{ITEM_STATUS_LABELS[item.status] || item.status}</div></div>
                        <div><div style={{ color: 'var(--text-muted)' }}>Tiến độ</div><div style={{ fontWeight: 600 }}>{item.progressPercent}%</div></div>
                        <div><div style={{ color: 'var(--text-muted)' }}>Số lượng</div><div style={{ fontWeight: 600 }}>{item.quantity} {item.unit}</div></div>
                        <div><div style={{ color: 'var(--text-muted)' }}>Vị trí</div><div style={{ fontWeight: 600 }}>{[item.floorName, item.roomName].filter(Boolean).join(' - ') || '—'}</div></div>
                        <div><div style={{ color: 'var(--text-muted)' }}>Kích thước (D×R×C)</div><div style={{ fontWeight: 600 }}>{item.length || 0}×{item.width || 0}×{item.height || 0}</div></div>
                        <div><div style={{ color: 'var(--text-muted)' }}>Phụ trách</div><div style={{ fontWeight: 600 }}>{item.assignedWorker?.name || item.assignedTeamName || '—'}</div></div>
                    </div>

                    {(item.materialDescription || item.colorDescription || item.hardwareDescription) && (
                        <div style={{ fontSize: 13, background: '#f8fafc', borderRadius: 8, padding: 10 }}>
                            {item.materialDescription && <div><strong>Vật liệu:</strong> {item.materialDescription}</div>}
                            {item.colorDescription && <div><strong>Màu sắc:</strong> {item.colorDescription}</div>}
                            {item.hardwareDescription && <div><strong>Phụ kiện:</strong> {item.hardwareDescription}</div>}
                        </div>
                    )}

                    <div>
                        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Công đoạn ({item.stages?.length || 0})</div>
                        {(!item.stages || item.stages.length === 0) ? (
                            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Chưa áp dụng quy trình công đoạn cho sản phẩm này.</div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {item.stages.map(s => (
                                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, background: s.status === 'IN_PROGRESS' ? '#fffbeb' : '#fafafa', border: '1px solid #f1f5f9' }}>
                                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: STAGE_DOT_COLOR[s.status], flexShrink: 0 }} />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: 13, fontWeight: 600 }}>{s.name}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                                {STAGE_STATUS_LABELS[s.status] || s.status}
                                                {s.assignedWorker?.name ? ` · ${s.assignedWorker.name}` : ''}
                                            </div>
                                        </div>
                                        {canUpdateStage && s.status === 'READY' && (
                                            <button className="btn btn-ghost btn-sm" disabled={busyStageId === s.id} onClick={() => updateStage(s.id, 'IN_PROGRESS')} title="Bắt đầu">
                                                <PlayCircle size={16} /> Bắt đầu
                                            </button>
                                        )}
                                        {canUpdateStage && s.status === 'IN_PROGRESS' && (
                                            <button className="btn btn-primary btn-sm" disabled={busyStageId === s.id} onClick={() => updateStage(s.id, 'COMPLETED')} title="Hoàn thành">
                                                <CheckCircle2 size={16} /> Hoàn thành
                                            </button>
                                        )}
                                        {s.status === 'COMPLETED' && <CheckCircle2 size={18} color="#16a34a" />}
                                        {s.status === 'NOT_STARTED' && <Circle size={16} color="#d1d5db" />}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {item.qualityIssues?.length > 0 && (
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Lỗi ({item.qualityIssues.length})</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {item.qualityIssues.map(i => (
                                    <div key={i.id} style={{ fontSize: 12, padding: 8, borderRadius: 6, background: '#fef2f2', color: '#991b1b' }}>
                                        [{i.severity}] {i.title} — {i.status}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </Modal>
    );
}
