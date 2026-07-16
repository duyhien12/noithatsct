'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, QrCode, Loader2 } from 'lucide-react';
import { ITEM_STATUS_LABELS, STAGE_STATUS_LABELS } from '@/lib/manufacturing/constants';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';

// Trang tra cứu nội bộ khi quét QR sản phẩm (mục XII) — chỉ xem, yêu cầu đăng nhập (bảo vệ bởi AppShell)
export default function MfgItemLookupPage() {
    const { id } = useParams();
    const router = useRouter();
    const [item, setItem] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`/api/manufacturing/items/${id}`).then(r => r.ok ? r.json() : Promise.reject(r)).then(d => { setItem(d); setLoading(false); }).catch(() => setLoading(false));
    }, [id]);

    if (loading) return <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}><Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} /></div>;
    if (!item) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--status-danger)' }}>Không tìm thấy sản phẩm.</div>;

    return (
        <div style={{ padding: 24, maxWidth: 720, margin: '0 auto' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => router.push(`/manufacturing/orders/${item.mfgOrder.id}`)} style={{ marginBottom: 16 }}>
                <ArrowLeft size={14} /> Về lệnh sản xuất
            </button>

            <div className="card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div>
                        <div style={{ fontSize: 12, color: 'var(--text-accent)', fontWeight: 700 }}>{item.code}</div>
                        <h2 style={{ margin: '4px 0', fontSize: 20 }}>{item.name}</h2>
                        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{item.project?.code} — {item.project?.name}</div>
                    </div>
                    <QrCode size={28} color="#9ca3af" />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, fontSize: 13, marginBottom: 16 }}>
                    <div><div style={{ color: 'var(--text-muted)' }}>Trạng thái</div><div style={{ fontWeight: 600 }}>{ITEM_STATUS_LABELS[item.status] || item.status}</div></div>
                    <div><div style={{ color: 'var(--text-muted)' }}>Tiến độ</div><div style={{ fontWeight: 600 }}>{item.progressPercent}%</div></div>
                    <div><div style={{ color: 'var(--text-muted)' }}>Vị trí</div><div style={{ fontWeight: 600 }}>{[item.floorName, item.roomName].filter(Boolean).join(' - ') || '—'}</div></div>
                    <div><div style={{ color: 'var(--text-muted)' }}>Số lượng</div><div style={{ fontWeight: 600 }}>{item.quantity} {item.unit}</div></div>
                    <div><div style={{ color: 'var(--text-muted)' }}>Kích thước</div><div style={{ fontWeight: 600 }}>{item.length || 0}×{item.width || 0}×{item.height || 0}</div></div>
                    <div><div style={{ color: 'var(--text-muted)' }}>Phụ trách</div><div style={{ fontWeight: 600 }}>{item.assignedWorker?.name || item.assignedTeamName || '—'}</div></div>
                </div>

                {(item.materialDescription || item.colorDescription || item.hardwareDescription) && (
                    <div style={{ fontSize: 13, background: '#f8fafc', borderRadius: 8, padding: 10, marginBottom: 16 }}>
                        {item.materialDescription && <div><strong>Vật liệu:</strong> {item.materialDescription}</div>}
                        {item.colorDescription && <div><strong>Màu sắc:</strong> {item.colorDescription}</div>}
                        {item.hardwareDescription && <div><strong>Phụ kiện:</strong> {item.hardwareDescription}</div>}
                    </div>
                )}

                {item.drawingUrl && (
                    <div style={{ marginBottom: 16 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Bản vẽ</div>
                        <a href={item.drawingUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">Xem bản vẽ</a>
                    </div>
                )}

                <div style={{ marginBottom: 16 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Công đoạn hiện tại</div>
                    {(item.stages || []).length === 0 ? <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Chưa áp dụng quy trình.</div> : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {item.stages.map(s => (
                                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, padding: '4px 8px', background: s.status === 'IN_PROGRESS' ? '#fffbeb' : '#fafafa', borderRadius: 6 }}>
                                    <span>{s.name}</span><span style={{ color: 'var(--text-muted)' }}>{STAGE_STATUS_LABELS[s.status] || s.status}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {item.qualityInspections?.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>QC gần nhất</div>
                        <div style={{ fontSize: 12.5 }}>
                            {item.qualityInspections[0].result === 'PASSED' ? '✅ Đạt' : '❌ Không đạt'} — {fmtDate(item.qualityInspections[0].inspectedAt)}
                        </div>
                    </div>
                )}

                {item.packingItems?.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Kiện đóng gói</div>
                        <div style={{ fontSize: 12.5 }}>{item.packingItems.map(p => p.packingRecord?.code).join(', ')}</div>
                    </div>
                )}
            </div>
        </div>
    );
}
