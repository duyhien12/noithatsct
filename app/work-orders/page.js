'use client';
import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRole } from '@/contexts/RoleContext';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
const fmtDateTime = (d) => d ? new Date(d).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : '—';
const toInputDate = (d) => d ? new Date(d).toISOString().slice(0, 10) : '';
const diffMinutes = (a, b) => Math.round((new Date(b) - new Date(a)) / 60000);

const PHOTO_TYPES = ['evidence', 'before', 'after', 'qc'];
const PHOTO_TYPE_LABEL = { evidence: 'Minh chứng', before: 'Trước', after: 'Sau', qc: 'QC' };
const QC_STATUS_STYLE = {
    pending: { color: '#6b7280', bg: '#f3f4f6', label: 'Chờ' },
    pass:    { color: '#16a34a', bg: '#dcfce7', label: 'Đạt' },
    fail:    { color: '#dc2626', bg: '#fee2e2', label: 'Không đạt' },
    na:      { color: '#9ca3af', bg: '#f3f4f6', label: 'N/A' },
};
const STATUS_STYLE = {
    'Chờ xử lý': { color: '#d97706', bg: '#fef3c7' },
    'Đang xử lý': { color: '#2563eb', bg: '#dbeafe' },
    'Hoàn thành': { color: '#16a34a', bg: '#dcfce7' },
    'Quá hạn':   { color: '#dc2626', bg: '#fee2e2' },
};

// ─── WorkOrderDetailModal ─────────────────────────────────────────────────────
function WorkOrderDetailModal({ wo, onClose, onUpdated, session }) {
    const [tab, setTab] = useState('detail');
    const [editForm, setEditForm] = useState({});
    const [saving, setSaving] = useState(false);

    // Photos state
    const [photos, setPhotos] = useState([]);
    const [photoLoading, setPhotoLoading] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [photoType, setPhotoType] = useState('evidence');
    const [photoCaption, setPhotoCaption] = useState('');
    const photoInputRef = useRef(null);

    // QC state
    const [qcItems, setQcItems] = useState([]);
    const [qcLoading, setQcLoading] = useState(false);
    const [newQcItem, setNewQcItem] = useState('');
    const [addingQc, setAddingQc] = useState(false);

    // Checkin state
    const [checkins, setCheckins] = useState([]);
    const [checkinLoading, setCheckinLoading] = useState(false);
    const [checkinWorker, setCheckinWorker] = useState('');
    const [doingCheckin, setDoingCheckin] = useState(false);

    // Stage history state
    const [stageLogs, setStageLogs] = useState([]);
    const [stageLoading, setStageLoading] = useState(false);

    // QR scanner
    const [scannerOpen, setScannerOpen] = useState(false);
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const scannerIntervalRef = useRef(null);

    useEffect(() => {
        if (!wo) return;
        setEditForm({
            title: wo.title || '',
            description: wo.description || '',
            category: wo.category || '',
            assignee: wo.assignee || '',
            priority: wo.priority || 'Trung bình',
            status: wo.status || 'Chờ xử lý',
            dueDate: toInputDate(wo.dueDate),
        });
        setTab('detail');
    }, [wo?.id]);

    useEffect(() => {
        if (!wo) return;
        if (tab === 'photos') fetchPhotos();
        if (tab === 'qc') fetchQC();
        if (tab === 'checkins') fetchCheckins();
        if (tab === 'history') fetchStageLogs();
    }, [tab, wo?.id]);

    const fetchPhotos = async () => {
        setPhotoLoading(true);
        const r = await fetch(`/api/work-orders/${wo.id}/photos`);
        setPhotos(await r.json());
        setPhotoLoading(false);
    };

    const fetchQC = async () => {
        setQcLoading(true);
        const r = await fetch(`/api/work-orders/${wo.id}/qc`);
        setQcItems(await r.json());
        setQcLoading(false);
    };

    const fetchCheckins = async () => {
        setCheckinLoading(true);
        const r = await fetch(`/api/work-orders/${wo.id}/checkins`);
        setCheckins(await r.json());
        setCheckinLoading(false);
    };

    const fetchStageLogs = async () => {
        setStageLoading(true);
        const r = await fetch(`/api/work-orders/${wo.id}/stage-logs`);
        setStageLogs(await r.json());
        setStageLoading(false);
    };

    // ── Save basic info ───────────────────────────────────────────────────────
    const saveEdit = async () => {
        if (!editForm.title?.trim()) return;
        setSaving(true);
        await fetch(`/api/work-orders/${wo.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: editForm.title.trim(),
                description: editForm.description || '',
                category: editForm.category || '',
                assignee: editForm.assignee || '',
                priority: editForm.priority,
                status: editForm.status,
                dueDate: editForm.dueDate || null,
            }),
        });
        setSaving(false);
        onUpdated?.();
        // refresh stage logs if status changed
        if (editForm.status !== wo.status) fetchStageLogs();
    };

    // ── Photos ────────────────────────────────────────────────────────────────
    const handlePhotoUpload = async (file) => {
        if (!file) return;
        setUploadingPhoto(true);
        const form = new FormData();
        form.append('file', file);
        form.append('type', 'proofs');
        const uploadRes = await fetch('/api/upload?type=proofs', { method: 'POST', body: form });
        const uploadData = await uploadRes.json();
        if (uploadData.url) {
            await fetch(`/api/work-orders/${wo.id}/photos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: uploadData.url, caption: photoCaption, type: photoType }),
            });
            setPhotoCaption('');
            fetchPhotos();
        }
        setUploadingPhoto(false);
    };

    const deletePhoto = async (photoId) => {
        await fetch(`/api/work-orders/${wo.id}/photos?photoId=${photoId}`, { method: 'DELETE' });
        fetchPhotos();
    };

    // ── QC ────────────────────────────────────────────────────────────────────
    const addQcItem = async () => {
        if (!newQcItem.trim()) return;
        setAddingQc(true);
        await fetch(`/api/work-orders/${wo.id}/qc`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ item: newQcItem.trim(), sortOrder: qcItems.length }),
        });
        setNewQcItem('');
        fetchQC();
        setAddingQc(false);
    };

    const updateQcStatus = async (itemId, status) => {
        await fetch(`/api/work-orders/${wo.id}/qc`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ itemId, status }),
        });
        fetchQC();
    };

    const deleteQcItem = async (itemId) => {
        await fetch(`/api/work-orders/${wo.id}/qc?itemId=${itemId}`, { method: 'DELETE' });
        fetchQC();
    };

    // ── Check-in/out ──────────────────────────────────────────────────────────
    const doCheckin = async () => {
        if (!checkinWorker.trim()) return;
        setDoingCheckin(true);
        await fetch(`/api/work-orders/${wo.id}/checkins`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ workerName: checkinWorker.trim() }),
        });
        setCheckinWorker('');
        fetchCheckins();
        setDoingCheckin(false);
    };

    const doCheckout = async (checkinId) => {
        await fetch(`/api/work-orders/${wo.id}/checkins`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ checkinId }),
        });
        fetchCheckins();
    };

    // ── QR Scanner ────────────────────────────────────────────────────────────
    const startScanner = async () => {
        setScannerOpen(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
            }
            if ('BarcodeDetector' in window) {
                const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
                scannerIntervalRef.current = setInterval(async () => {
                    if (!videoRef.current) return;
                    try {
                        const codes = await detector.detect(videoRef.current);
                        if (codes.length > 0) {
                            stopScanner();
                            const scannedUrl = codes[0].rawValue;
                            const match = scannedUrl.match(/[?&]wo=([^&]+)/);
                            if (match) window.location.href = `/work-orders?wo=${match[1]}`;
                        }
                    } catch {}
                }, 300);
            }
        } catch (e) {
            setScannerOpen(false);
            alert('Không thể mở camera: ' + e.message);
        }
    };

    const stopScanner = () => {
        if (scannerIntervalRef.current) clearInterval(scannerIntervalRef.current);
        if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        setScannerOpen(false);
    };

    // ── QC summary ────────────────────────────────────────────────────────────
    const qcPass = qcItems.filter(i => i.status === 'pass').length;
    const qcFail = qcItems.filter(i => i.status === 'fail').length;
    const qcChecked = qcItems.filter(i => i.status !== 'pending').length;

    const TABS = [
        { key: 'detail',   label: 'Chi tiết' },
        { key: 'photos',   label: `Ảnh${photos.length ? ` (${photos.length})` : ''}` },
        { key: 'qc',       label: `QC${qcItems.length ? ` ${qcPass}/${qcItems.length}` : ''}` },
        { key: 'checkins', label: `Check-in${checkins.length ? ` (${checkins.length})` : ''}` },
        { key: 'history',  label: 'Lịch sử' },
    ];

    if (!wo) return null;

    return (
        <>
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '20px 8px', overflowY: 'auto' }}>
            <div style={{ background: 'var(--bg-card)', borderRadius: 14, width: '100%', maxWidth: 640, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
                {/* Header */}
                <div style={{ padding: '18px 20px 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                <span style={{ fontSize: 13, fontWeight: 600, color: '#6b7280' }}>{wo.code}</span>
                                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600, ...STATUS_STYLE[wo.status] }}>{wo.status}</span>
                            </div>
                            <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4, color: 'var(--text-primary)' }}>{wo.title}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{wo.project?.name} · {wo.assignee || 'Chưa giao'}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={startScanner} title="Quét QR" className="btn btn-ghost btn-sm" style={{ fontSize: 18, padding: '4px 8px' }}>📷</button>
                            <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ fontSize: 20, lineHeight: 1, padding: '4px 8px' }}>×</button>
                        </div>
                    </div>
                    {/* Tabs */}
                    <div style={{ display: 'flex', gap: 0, overflowX: 'auto' }}>
                        {TABS.map(t => (
                            <button key={t.key} onClick={() => setTab(t.key)} style={{
                                padding: '8px 14px', fontSize: 13, fontWeight: tab === t.key ? 700 : 400,
                                border: 'none', background: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                                color: tab === t.key ? 'var(--primary)' : 'var(--text-muted)',
                                borderBottom: tab === t.key ? '2px solid var(--primary)' : '2px solid transparent',
                            }}>{t.label}</button>
                        ))}
                    </div>
                </div>

                {/* Tab content */}
                <div style={{ padding: 20, maxHeight: '70vh', overflowY: 'auto' }}>

                    {/* ── Chi tiết tab ── */}
                    {tab === 'detail' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Tiêu đề *</label>
                                <input className="form-input" value={editForm.title || ''} onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))} style={{ width: '100%' }} />
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Mô tả</label>
                                <textarea className="form-input" value={editForm.description || ''} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} rows={2} style={{ width: '100%', resize: 'vertical' }} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div>
                                    <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Loại công việc</label>
                                    <select className="form-select" value={editForm.category || ''} onChange={e => setEditForm(p => ({ ...p, category: e.target.value }))} style={{ width: '100%' }}>
                                        <option value="">— Chọn —</option>
                                        {['Thi công','Lắp đặt','Kiểm tra','Hoàn thiện','Sửa chữa','Khác'].map(c => <option key={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Ưu tiên</label>
                                    <select className="form-select" value={editForm.priority || 'Trung bình'} onChange={e => setEditForm(p => ({ ...p, priority: e.target.value }))} style={{ width: '100%' }}>
                                        {['Cao','Trung bình','Thấp'].map(p => <option key={p}>{p}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div>
                                    <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Trạng thái</label>
                                    <select className="form-select" value={editForm.status || 'Chờ xử lý'} onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))} style={{ width: '100%' }}>
                                        {['Chờ xử lý','Đang xử lý','Hoàn thành','Quá hạn'].map(s => <option key={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Hạn chót</label>
                                    <input type="date" className="form-input" value={editForm.dueDate || ''} onChange={e => setEditForm(p => ({ ...p, dueDate: e.target.value }))} style={{ width: '100%' }} />
                                </div>
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Người thực hiện</label>
                                <input className="form-input" value={editForm.assignee || ''} onChange={e => setEditForm(p => ({ ...p, assignee: e.target.value }))} placeholder="Tên người thực hiện" style={{ width: '100%' }} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                                <button className="btn btn-ghost" onClick={onClose}>Đóng</button>
                                <button className="btn btn-primary" onClick={saveEdit} disabled={saving || !editForm.title?.trim()}>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</button>
                            </div>
                        </div>
                    )}

                    {/* ── Ảnh tab ── */}
                    {tab === 'photos' && (
                        <div>
                            {/* Upload area */}
                            <div style={{ background: 'var(--bg-hover)', borderRadius: 10, padding: 14, marginBottom: 16 }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                                    <div>
                                        <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Loại ảnh</label>
                                        <select className="form-select" value={photoType} onChange={e => setPhotoType(e.target.value)} style={{ width: '100%', fontSize: 12 }}>
                                            {PHOTO_TYPES.map(t => <option key={t} value={t}>{PHOTO_TYPE_LABEL[t]}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Chú thích</label>
                                        <input className="form-input" value={photoCaption} onChange={e => setPhotoCaption(e.target.value)} placeholder="Mô tả ảnh..." style={{ width: '100%', fontSize: 12 }} />
                                    </div>
                                </div>
                                <input ref={photoInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
                                    onChange={e => handlePhotoUpload(e.target.files?.[0])} />
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button className="btn btn-primary btn-sm" onClick={() => photoInputRef.current?.click()} disabled={uploadingPhoto} style={{ flex: 1 }}>
                                        {uploadingPhoto ? '⏳ Đang tải...' : '📷 Chụp / Chọn ảnh'}
                                    </button>
                                </div>
                            </div>
                            {/* Gallery */}
                            {photoLoading ? <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>Đang tải...</div> : (
                                photos.length === 0 ? (
                                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 30, fontSize: 13 }}>Chưa có ảnh nào</div>
                                ) : (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
                                        {photos.map(p => (
                                            <div key={p.id} style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)', position: 'relative' }}>
                                                <img src={p.url} alt={p.caption} style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block' }} />
                                                <div style={{ padding: '6px 8px', background: 'var(--bg-card)' }}>
                                                    <div style={{ fontSize: 10, color: 'var(--primary)', fontWeight: 600 }}>{PHOTO_TYPE_LABEL[p.type] || p.type}</div>
                                                    {p.caption && <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.caption}</div>}
                                                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{fmtDate(p.createdAt)}</div>
                                                </div>
                                                <button onClick={() => deletePhoto(p.id)} style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: 20, width: 22, height: 22, cursor: 'pointer', color: '#fff', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                                            </div>
                                        ))}
                                    </div>
                                )
                            )}
                        </div>
                    )}

                    {/* ── QC Checklist tab ── */}
                    {tab === 'qc' && (
                        <div>
                            {/* Summary bar */}
                            {qcItems.length > 0 && (
                                <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, ...QC_STATUS_STYLE.pass }}>Đạt: {qcPass}</span>
                                    <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, ...QC_STATUS_STYLE.fail }}>Không đạt: {qcFail}</span>
                                    <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, background: '#f3f4f6', color: '#6b7280' }}>Chờ: {qcItems.length - qcChecked}</span>
                                    {qcItems.length > 0 && <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, background: '#ede9fe', color: '#7c3aed', marginLeft: 'auto' }}>{Math.round(qcPass / qcItems.length * 100)}% đạt</span>}
                                </div>
                            )}
                            {/* Add item */}
                            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                                <input className="form-input" value={newQcItem} onChange={e => setNewQcItem(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && addQcItem()}
                                    placeholder="Thêm hạng mục kiểm tra..." style={{ flex: 1, fontSize: 13 }} />
                                <button className="btn btn-primary btn-sm" onClick={addQcItem} disabled={addingQc || !newQcItem.trim()}>Thêm</button>
                            </div>
                            {/* QC list */}
                            {qcLoading ? <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>Đang tải...</div> : (
                                qcItems.length === 0 ? (
                                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 30, fontSize: 13 }}>Chưa có hạng mục QC nào</div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {qcItems.map(item => (
                                            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-hover)' }}>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontSize: 13, fontWeight: 500 }}>{item.item}</div>
                                                    {item.checkedBy && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{item.checkedBy} · {fmtDateTime(item.checkedAt)}</div>}
                                                </div>
                                                <div style={{ display: 'flex', gap: 4 }}>
                                                    {['pass', 'fail', 'na'].map(s => (
                                                        <button key={s} onClick={() => updateQcStatus(item.id, item.status === s ? 'pending' : s)} style={{
                                                            padding: '3px 8px', fontSize: 11, fontWeight: 600, borderRadius: 20, border: 'none', cursor: 'pointer',
                                                            ...( item.status === s ? QC_STATUS_STYLE[s] : { color: '#9ca3af', bg: '#f3f4f6', background: '#f3f4f6' }),
                                                            background: item.status === s ? QC_STATUS_STYLE[s].bg : '#f3f4f6',
                                                            color: item.status === s ? QC_STATUS_STYLE[s].color : '#9ca3af',
                                                            outline: item.status === s ? `2px solid ${QC_STATUS_STYLE[s].color}` : 'none',
                                                        }}>{QC_STATUS_STYLE[s].label}</button>
                                                    ))}
                                                    <button onClick={() => deleteQcItem(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 14, padding: '3px 4px' }}>×</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )
                            )}
                        </div>
                    )}

                    {/* ── Check-in/out tab ── */}
                    {tab === 'checkins' && (
                        <div>
                            {/* Check-in form */}
                            <div style={{ background: 'var(--bg-hover)', borderRadius: 10, padding: 14, marginBottom: 16 }}>
                                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--text-muted)' }}>Ghi nhận check-in</div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <input className="form-input" value={checkinWorker} onChange={e => setCheckinWorker(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && doCheckin()}
                                        placeholder="Tên thợ / nhân viên..." style={{ flex: 1, fontSize: 13 }} />
                                    <button className="btn btn-primary btn-sm" onClick={doCheckin} disabled={doingCheckin || !checkinWorker.trim()}>Check-in</button>
                                </div>
                            </div>
                            {/* Checkin list */}
                            {checkinLoading ? <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>Đang tải...</div> : (
                                checkins.length === 0 ? (
                                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 30, fontSize: 13 }}>Chưa có check-in nào</div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {checkins.map(c => {
                                            const duration = c.checkoutAt ? diffMinutes(c.checkinAt, c.checkoutAt) : null;
                                            return (
                                                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-hover)' }}>
                                                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: c.checkoutAt ? '#dcfce7' : '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                                                        {c.checkoutAt ? '✅' : '🔵'}
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontWeight: 600, fontSize: 13 }}>{c.workerName}</div>
                                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                                            Vào: {fmtDateTime(c.checkinAt)}
                                                            {c.checkoutAt && <> · Ra: {fmtDateTime(c.checkoutAt)}</>}
                                                        </div>
                                                        {duration !== null && (
                                                            <div style={{ fontSize: 11, color: '#7c3aed', fontWeight: 500, marginTop: 1 }}>
                                                                Thời gian: {duration >= 60 ? `${Math.floor(duration/60)}h ${duration%60}p` : `${duration}p`}
                                                            </div>
                                                        )}
                                                    </div>
                                                    {!c.checkoutAt && (
                                                        <button className="btn btn-ghost btn-sm" onClick={() => doCheckout(c.id)} style={{ fontSize: 12, whiteSpace: 'nowrap' }}>Check-out</button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )
                            )}
                        </div>
                    )}

                    {/* ── Lịch sử tab ── */}
                    {tab === 'history' && (
                        <div>
                            {/* QR Code */}
                            <div style={{ textAlign: 'center', marginBottom: 20 }}>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600 }}>QR Code phiếu này</div>
                                <img src={`/api/work-orders/${wo.id}/qr`} alt="QR Code" style={{ width: 140, height: 140, border: '1px solid var(--border)', borderRadius: 8 }} />
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Scan để mở phiếu trên thiết bị khác</div>
                            </div>
                            {/* Stage history timeline */}
                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 10 }}>Lịch sử trạng thái</div>
                            {stageLoading ? <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>Đang tải...</div> : (
                                stageLogs.length === 0 ? (
                                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: 20 }}>Chưa có lịch sử thay đổi</div>
                                ) : (
                                    <div style={{ position: 'relative', paddingLeft: 24 }}>
                                        <div style={{ position: 'absolute', left: 8, top: 0, bottom: 0, width: 2, background: 'var(--border)' }} />
                                        {stageLogs.map((log, i) => (
                                            <div key={log.id} style={{ position: 'relative', paddingBottom: 16 }}>
                                                <div style={{ position: 'absolute', left: -20, top: 4, width: 10, height: 10, borderRadius: '50%', background: STATUS_STYLE[log.toStatus]?.color || '#6b7280', border: '2px solid var(--bg-card)' }} />
                                                <div style={{ fontSize: 12 }}>
                                                    <span style={{ fontWeight: 600 }}>{log.fromStatus}</span>
                                                    <span style={{ color: 'var(--text-muted)', margin: '0 6px' }}>→</span>
                                                    <span style={{ fontWeight: 700, color: STATUS_STYLE[log.toStatus]?.color }}>{log.toStatus}</span>
                                                </div>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                                    {log.changedBy && <span>{log.changedBy} · </span>}
                                                    {fmtDateTime(log.createdAt)}
                                                </div>
                                                {log.note && <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 2 }}>{log.note}</div>}
                                            </div>
                                        ))}
                                    </div>
                                )
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* QR Scanner overlay */}
        {scannerOpen && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 2000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                <div style={{ fontSize: 16, color: '#fff', fontWeight: 600 }}>Quét QR phiếu công việc</div>
                <video ref={videoRef} style={{ width: '100%', maxWidth: 360, borderRadius: 12, border: '3px solid #fff' }} playsInline muted />
                {'BarcodeDetector' in (typeof window !== 'undefined' ? window : {}) ? (
                    <div style={{ fontSize: 13, color: '#aaa' }}>Hướng camera vào QR code</div>
                ) : (
                    <div style={{ fontSize: 13, color: '#f87171' }}>Trình duyệt không hỗ trợ quét tự động.<br/>Dùng Chrome/Android để quét QR.</div>
                )}
                <button className="btn btn-ghost" onClick={stopScanner} style={{ color: '#fff', borderColor: '#fff' }}>Đóng</button>
            </div>
        )}
        </>
    );
}

function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
    d.setHours(0, 0, 0, 0);
    return d;
}
function addDays(date, n) { const d = new Date(date); d.setDate(d.getDate() + n); return d; }
function toISO(date) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
function getWeekNum(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    return Math.ceil((((d - new Date(Date.UTC(d.getUTCFullYear(),0,1))) / 86400000) + 1) / 7);
}

// ─── Tab 1: Phiếu công việc ───────────────────────────────────────────────────

const WO_CATEGORIES = ['Thi công', 'Lắp đặt', 'Kiểm tra', 'Hoàn thiện', 'Sửa chữa', 'Khác'];
const WO_PRIORITIES = ['Cao', 'Trung bình', 'Thấp'];
const WO_STATUSES   = ['Chờ xử lý', 'Đang xử lý', 'Hoàn thành', 'Quá hạn'];

function PhieuTab() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterPriority, setFilterPriority] = useState('');
    const [syncing, setSyncing] = useState(false);
    const [syncMsg, setSyncMsg] = useState('');
    const [syncWeek, setSyncWeek] = useState(() => getWeekStart(new Date()));
    const [detailWO, setDetailWO] = useState(null);
    const [zaloMsg, setZaloMsg] = useState({});

    const fetchOrders = useCallback(() => {
        fetch('/api/work-orders?limit=1000').then(r => r.json()).then(d => {
            setOrders(d.data || []); setLoading(false);
        });
    }, []);
    useEffect(fetchOrders, [fetchOrders]);

    // Auto-open from QR scan (?wo=<id>)
    useEffect(() => {
        const woId = searchParams?.get('wo');
        if (woId) {
            fetch(`/api/work-orders/${woId}`).then(r => r.ok ? r.json() : null).then(d => { if (d) setDetailWO(d); });
        }
    }, [searchParams]);

    // Open detail modal — refresh work order data from server first
    const openDetail = async (wo) => {
        const r = await fetch(`/api/work-orders/${wo.id}`);
        setDetailWO(await r.json());
    };

    const syncFromLog = async () => {
        setSyncing(true); setSyncMsg('');
        const res = await fetch('/api/work-orders/sync-from-log', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ start: toISO(syncWeek), end: toISO(addDays(syncWeek, 6)) }),
        });
        const data = await res.json();
        setSyncMsg(data.created !== undefined
            ? `✅ Tạo mới ${data.created} phiếu, bỏ qua ${data.skipped} (đã tồn tại)`
            : `❌ ${data.error || 'Lỗi không xác định'}`);
        if (data.created > 0) fetchOrders();
        setSyncing(false);
    };

    const updateStatus = async (id, status, e) => {
        e.stopPropagation();
        await fetch(`/api/work-orders/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
        fetchOrders();
    };

    const deleteOrder = async (wo, e) => {
        e.stopPropagation();
        if (!window.confirm(`Xoá phiếu "${wo.title}"?`)) return;
        await fetch(`/api/work-orders/${wo.id}`, { method: 'DELETE' });
        fetchOrders();
    };

    const sendZalo = async (wo, e) => {
        e.stopPropagation();
        setZaloMsg(p => ({ ...p, [wo.id]: '⏳' }));
        const res = await fetch(`/api/work-orders/${wo.id}/notify-zalo`, { method: 'POST' });
        const data = await res.json();
        setZaloMsg(p => ({ ...p, [wo.id]: data.success ? '✅ Đã gửi' : `❌ ${data.message || 'Lỗi'}` }));
        setTimeout(() => setZaloMsg(p => { const n = { ...p }; delete n[wo.id]; return n; }), 4000);
    };

    const filtered = orders.filter(w => {
        if (filterStatus && w.status !== filterStatus) return false;
        if (filterPriority && w.priority !== filterPriority) return false;
        if (search && !w.title.toLowerCase().includes(search.toLowerCase()) && !w.code.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    const pending = orders.filter(w => w.status === 'Chờ xử lý').length;
    const inProgress = orders.filter(w => w.status === 'Đang xử lý').length;
    const done = orders.filter(w => w.status === 'Hoàn thành').length;
    const highPriority = orders.filter(w => w.priority === 'Cao').length;

    return (
        <div>
            <div className="stats-grid">
                <div className="stat-card"><div className="stat-card-header"><span className="stat-card-icon revenue">📋</span></div><div style={{ fontSize: 24, fontWeight: 700, marginTop: 8 }}>{orders.length}</div><div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Tổng phiếu</div></div>
                <div className="stat-card"><div className="stat-card-header"><span className="stat-card-icon quotations">⏳</span></div><div style={{ fontSize: 24, fontWeight: 700, color: 'var(--status-warning)', marginTop: 8 }}>{pending}</div><div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Chờ xử lý</div></div>
                <div className="stat-card"><div className="stat-card-header"><span className="stat-card-icon projects">🔄</span></div><div style={{ fontSize: 24, fontWeight: 700, color: 'var(--status-info)', marginTop: 8 }}>{inProgress}</div><div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Đang xử lý</div></div>
                <div className="stat-card"><div className="stat-card-header"><span className="stat-card-icon customers">✅</span></div><div style={{ fontSize: 24, fontWeight: 700, color: 'var(--status-success)', marginTop: 8 }}>{done}</div><div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Hoàn thành</div></div>
                <div className="stat-card"><div style={{ fontSize: 24, fontWeight: 700, color: 'var(--status-danger)' }}>{highPriority}</div><div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Ưu tiên cao</div></div>
            </div>

            <div className="card" style={{ marginTop: 16 }}>
                <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                    <span className="card-title">Danh sách phiếu</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                            <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Tuần {getWeekNum(syncWeek)}:</span>
                            <button className="btn btn-ghost btn-sm" onClick={() => setSyncWeek(d => addDays(d, -7))}>◀</button>
                            <span style={{ fontWeight: 600, fontSize: 12, minWidth: 80, textAlign: 'center' }}>
                                {toISO(syncWeek).slice(5).replace('-','/')} – {toISO(addDays(syncWeek,6)).slice(5).replace('-','/')}
                            </span>
                            <button className="btn btn-ghost btn-sm" onClick={() => setSyncWeek(d => addDays(d, 7))}>▶</button>
                        </div>
                        <button className="btn btn-primary btn-sm" onClick={syncFromLog} disabled={syncing} style={{ whiteSpace: 'nowrap', fontSize: 12 }}>
                            {syncing ? '⏳ Đang đồng bộ...' : '🔄 Đồng bộ từ Nhật ký'}
                        </button>
                        {syncMsg && <span style={{ fontSize: 11, color: syncMsg.startsWith('✅') ? '#16a34a' : '#dc2626', whiteSpace: 'nowrap' }}>{syncMsg}</span>}
                    </div>
                </div>
                <div className="filter-bar">
                    <input type="text" className="form-input" placeholder="🔍 Tìm kiếm..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 0 }} />
                    <select className="form-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                        <option value="">Tất cả TT</option><option>Chờ xử lý</option><option>Đang xử lý</option><option>Hoàn thành</option><option>Quá hạn</option>
                    </select>
                    <select className="form-select" value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
                        <option value="">Tất cả ưu tiên</option><option>Cao</option><option>Trung bình</option><option>Thấp</option>
                    </select>
                </div>
                {loading ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div> : (<>
                    <div className="desktop-table-view">
                        <div className="table-container"><table className="data-table">
                            <thead><tr><th>Công trình</th><th>Tiêu đề</th><th>Loại</th><th>Ưu tiên</th><th>Người thực hiện</th><th>Hạn</th><th style={{ width: 90 }}>HĐ</th></tr></thead>
                            <tbody>{filtered.map(wo => (
                                <tr key={wo.id} onClick={() => openDetail(wo)} style={{ cursor: 'pointer' }}>
                                    <td onClick={e => { e.stopPropagation(); wo.project && router.push(`/projects/${wo.projectId}`); }} style={{ cursor: wo.project ? 'pointer' : 'default' }}>
                                        <span className="badge info">{wo.project?.code}</span> <span style={{ fontSize: 12 }}>{wo.project?.name}</span>
                                    </td>
                                    <td className="primary">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 500 }}>{wo.code}</span>
                                            {wo.sourceLogId && <span style={{ fontSize: 9, color: '#7c3aed', background: '#ede9fe', borderRadius: 4, padding: '1px 4px' }}>Nhật ký</span>}
                                        </div>
                                        <div>{wo.title}</div>
                                        {wo.description && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{wo.description}</div>}
                                    </td>
                                    <td><span className="badge muted">{wo.category}</span></td>
                                    <td><span className={`badge ${wo.priority === 'Cao' ? 'danger' : wo.priority === 'Trung bình' ? 'warning' : 'muted'}`}>{wo.priority}</span></td>
                                    <td style={{ fontSize: 13 }}>{wo.assignee || '—'}</td>
                                    <td style={{ fontSize: 12 }}>{fmtDate(wo.dueDate)}</td>
                                    <td onClick={e => e.stopPropagation()}>
                                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                            <button className="btn btn-ghost btn-sm" title="Gửi qua Zalo OA" onClick={e => sendZalo(wo, e)} style={{ padding: '3px 7px', fontSize: 14 }} disabled={zaloMsg[wo.id] === '⏳'}>
                                                {zaloMsg[wo.id] === '⏳' ? '⏳' : '💬'}
                                            </button>
                                            <button className="btn btn-ghost btn-sm" title="Xoá" onClick={e => deleteOrder(wo, e)} style={{ padding: '3px 7px', fontSize: 14, color: '#dc2626' }}>🗑️</button>
                                        </div>
                                        {zaloMsg[wo.id] && zaloMsg[wo.id] !== '⏳' && (
                                            <div style={{ fontSize: 10, marginTop: 2, color: zaloMsg[wo.id].startsWith('✅') ? '#16a34a' : '#dc2626', whiteSpace: 'nowrap' }}>{zaloMsg[wo.id]}</div>
                                        )}
                                    </td>
                                </tr>
                            ))}</tbody>
                        </table></div>
                    </div>
                    <div className="mobile-card-list">
                        {filtered.map(wo => (
                            <div key={wo.id} className="mobile-card-item" onClick={() => openDetail(wo)} style={{ cursor: 'pointer' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div className="card-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{wo.title}</div>
                                        <div className="card-subtitle">{wo.code} · {wo.project?.name || '—'}</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                                        <span className={`badge ${wo.priority === 'Cao' ? 'danger' : wo.priority === 'Trung bình' ? 'warning' : 'muted'}`}>{wo.priority}</span>
                                        <button className="btn btn-ghost btn-sm" onClick={e => sendZalo(wo, e)} style={{ padding: '2px 6px', fontSize: 13 }} disabled={zaloMsg[wo.id] === '⏳'}>
                                            {zaloMsg[wo.id] === '⏳' ? '⏳' : '💬'}
                                        </button>
                                        <button className="btn btn-ghost btn-sm" onClick={e => deleteOrder(wo, e)} style={{ padding: '2px 6px', fontSize: 13, color: '#dc2626' }}>🗑️</button>
                                    </div>
                                </div>
                                {zaloMsg[wo.id] && zaloMsg[wo.id] !== '⏳' && (
                                    <div style={{ fontSize: 11, color: zaloMsg[wo.id].startsWith('✅') ? '#16a34a' : '#dc2626', marginTop: 4 }}>{zaloMsg[wo.id]}</div>
                                )}
                                <div className="card-row" onClick={e => e.stopPropagation()}>
                                    <div><span className="card-label">Người TH</span><div style={{ fontSize: 12, fontWeight: 500 }}>{wo.assignee || '—'}</div></div>
                                    <div><span className="card-label">Hạn</span><div style={{ fontSize: 12, fontWeight: 500 }}>{fmtDate(wo.dueDate)}</div></div>
                                    <div>
                                        <select value={wo.status} onChange={e => updateStatus(wo.id, e.target.value, e)} className="form-select" style={{ padding: '6px 28px 6px 8px', fontSize: 12, minWidth: 0 }}>
                                            <option>Chờ xử lý</option><option>Đang xử lý</option><option>Hoàn thành</option><option>Quá hạn</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </>)}
            </div>

            <WorkOrderDetailModal
                wo={detailWO}
                onClose={() => setDetailWO(null)}
                onUpdated={async () => {
                    fetchOrders();
                    if (detailWO) {
                        const r = await fetch(`/api/work-orders/${detailWO.id}`);
                        if (r.ok) setDetailWO(await r.json());
                    }
                }}
            />
        </div>
    );
}

// ─── Tab 2: Công việc xưởng ───────────────────────────────────────────────────

const WT_STATUS_OPTS   = ['Chờ làm', 'Đang làm', 'Hoàn thành', 'Tạm dừng'];
const WT_PRIORITY_OPTS = ['Cao', 'Trung bình', 'Thấp'];
const WT_STATUS_STYLE  = {
    'Chờ làm':    { color: '#d97706', bg: '#fef3c7' },
    'Đang làm':   { color: '#2563eb', bg: '#dbeafe' },
    'Hoàn thành': { color: '#16a34a', bg: '#dcfce7' },
    'Tạm dừng':   { color: '#9ca3af', bg: '#f3f4f6' },
};
const WT_PRIORITY_STYLE = {
    'Cao':        { color: '#dc2626', bg: '#fee2e2' },
    'Trung bình': { color: '#d97706', bg: '#fef3c7' },
    'Thấp':       { color: '#16a34a', bg: '#dcfce7' },
};
const WT_EMPTY_FORM = {
    title: '', description: '', projectId: '', startDate: '', deadline: '',
    priority: 'Trung bình', notes: '', workerIds: [], materials: [],
};

function CongViecXuongTab({ workers, projects }) {
    const [tasks, setTasks] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('');
    const [filterProject, setFilterProject] = useState('');
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [form, setForm] = useState(WT_EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [progressTarget, setProgressTarget] = useState(null);
    const [progressVal, setProgressVal] = useState(0);
    const [matSearch, setMatSearch] = useState('');

    const fetchTasks = useCallback(async () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (filterStatus) params.set('status', filterStatus);
        if (filterProject) params.set('projectId', filterProject);
        const [tRes, prRes] = await Promise.all([
            fetch(`/api/workshop/tasks?${params}`),
            fetch('/api/workshop/materials'),
        ]);
        const [t, pr] = await Promise.all([tRes.json(), prRes.json()]);
        setTasks(Array.isArray(t) ? t : []);
        setProducts(Array.isArray(pr) ? pr : []);
        setLoading(false);
    }, [filterStatus, filterProject]);

    useEffect(() => { fetchTasks(); }, [fetchTasks]);

    const openAdd = () => { setEditTarget(null); setForm(WT_EMPTY_FORM); setShowModal(true); };
    const openEdit = (t) => {
        setEditTarget(t);
        setForm({ title: t.title, description: t.description || '', projectId: t.projectId || '',
            startDate: toInputDate(t.startDate), deadline: toInputDate(t.deadline),
            priority: t.priority, notes: t.notes || '',
            workerIds: t.workers?.map(w => w.workerId) || [],
            materials: t.materials?.map(m => ({ productId: m.productId, quantity: m.quantity })) || [] });
        setShowModal(true);
    };

    const handleSubmit = async () => {
        if (!form.title.trim()) return;
        setSaving(true);
        try {
            const payload = { ...form, projectId: form.projectId || null, startDate: form.startDate || null, deadline: form.deadline || null };
            const url = editTarget ? `/api/workshop/tasks/${editTarget.id}` : '/api/workshop/tasks';
            await fetch(url, { method: editTarget ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            setShowModal(false); fetchTasks();
        } finally { setSaving(false); }
    };

    const handleStatusChange = async (task, newStatus) => {
        const progress = newStatus === 'Hoàn thành' ? 100 : task.progress;
        await fetch(`/api/workshop/tasks/${task.id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus, progress }),
        });
        fetchTasks();
    };

    const handleLock = async (task) => {
        await fetch(`/api/workshop/tasks/${task.id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isLocked: !task.isLocked }),
        });
        fetchTasks();
    };

    const handleProgressSave = async () => {
        await fetch(`/api/workshop/tasks/${progressTarget.id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ progress: Number(progressVal), status: Number(progressVal) >= 100 ? 'Hoàn thành' : progressTarget.status }),
        });
        setProgressTarget(null); fetchTasks();
    };

    const handleDelete = async () => {
        await fetch(`/api/workshop/tasks/${deleteTarget.id}`, { method: 'DELETE' });
        setDeleteTarget(null); fetchTasks();
    };

    const toggleWorker = (wid) => setForm(f => ({
        ...f, workerIds: f.workerIds.includes(wid) ? f.workerIds.filter(id => id !== wid) : [...f.workerIds, wid],
    }));
    const addMaterial = (productId) => {
        if (!productId || form.materials.find(m => m.productId === productId)) return;
        setForm(f => ({ ...f, materials: [...f.materials, { productId, quantity: 1 }] }));
    };
    const updateMaterialQty = (productId, qty) => setForm(f => ({
        ...f, materials: f.materials.map(m => m.productId === productId ? { ...m, quantity: qty } : m),
    }));
    const removeMaterial = (productId) => setForm(f => ({
        ...f, materials: f.materials.filter(m => m.productId !== productId),
    }));

    const filtered = tasks.filter(t => {
        if (search && !t.title.toLowerCase().includes(search.toLowerCase()) &&
            !t.project?.name?.toLowerCase().includes(search.toLowerCase()) &&
            !t.workers?.some(w => w.worker.name.toLowerCase().includes(search.toLowerCase()))) return false;
        return true;
    });

    const counts = WT_STATUS_OPTS.reduce((a, s) => ({ ...a, [s]: tasks.filter(t => t.status === s).length }), {});
    const overdueCount = tasks.filter(t => t.deadline && new Date(t.deadline) < new Date() && t.status !== 'Hoàn thành').length;
    const activeWorkers = workers.filter(w => w.status === 'Hoạt động');

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[
                    { label: 'Tất cả', value: '', count: tasks.length, color: '#6b7280' },
                    { label: 'Chờ làm', value: 'Chờ làm', count: counts['Chờ làm'], color: '#d97706' },
                    { label: 'Đang làm', value: 'Đang làm', count: counts['Đang làm'], color: '#2563eb' },
                    { label: 'Hoàn thành', value: 'Hoàn thành', count: counts['Hoàn thành'], color: '#16a34a' },
                    { label: 'Tạm dừng', value: 'Tạm dừng', count: counts['Tạm dừng'], color: '#9ca3af' },
                ].map(({ label, value, count, color }) => (
                    <button key={label} onClick={() => setFilterStatus(filterStatus === value && value !== '' ? '' : value)}
                        style={{ padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                            border: '2px solid', borderColor: filterStatus === value ? color : 'var(--border)',
                            background: filterStatus === value ? color : 'var(--bg-card)',
                            color: filterStatus === value ? '#fff' : 'var(--text-primary)' }}>
                        {label} <span style={{ opacity: 0.8 }}>({count || 0})</span>
                    </button>
                ))}
                {overdueCount > 0 && (
                    <span style={{ padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 700, background: '#fee2e2', color: '#dc2626', border: '2px solid #dc2626' }}>
                        ⚠️ Trễ: {overdueCount}
                    </span>
                )}
            </div>

            <div className="card">
                <div className="card-header">
                    <h3>Danh sách công việc xưởng</h3>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <select className="form-select" value={filterProject} onChange={e => setFilterProject(e.target.value)} style={{ fontSize: 13 }}>
                            <option value="">Tất cả dự án</option>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <button className="btn btn-primary" onClick={openAdd}>+ Thêm việc</button>
                    </div>
                </div>
                <div className="filter-bar" style={{ borderBottom: '1px solid var(--border)' }}>
                    <input className="form-input" placeholder="🔍 Tìm theo tên việc, dự án, nhân công..."
                        value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 0 }} />
                    {(search || filterStatus || filterProject) && (
                        <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setFilterStatus(''); setFilterProject(''); }}>Xóa bộ lọc</button>
                    )}
                </div>

                {loading ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
                ) : (
                    <>
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Tên công việc</th><th>Dự án</th><th>Nhân công</th>
                                    <th>Bắt đầu</th><th>Hạn hoàn thành</th>
                                    <th style={{ minWidth: 120 }}>Tiến độ</th>
                                    <th>Ưu tiên</th><th>Trạng thái</th><th style={{ textAlign: 'right' }}>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(t => {
                                    const ss = WT_STATUS_STYLE[t.status] || WT_STATUS_STYLE['Chờ làm'];
                                    const ps = WT_PRIORITY_STYLE[t.priority] || WT_PRIORITY_STYLE['Trung bình'];
                                    const isOverdue = t.deadline && new Date(t.deadline) < new Date() && t.status !== 'Hoàn thành';
                                    return (
                                        <tr key={t.id} style={{ background: isOverdue ? 'rgba(220,38,38,0.04)' : undefined }}>
                                            <td>
                                                <div style={{ fontWeight: 600, fontSize: 13, color: isOverdue ? '#dc2626' : 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    {t.isLocked && <span title="Đã khóa">🔒</span>}{t.title}
                                                </div>
                                                {t.description && <div style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.description}</div>}
                                            </td>
                                            <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.project?.name || '—'}</td>
                                            <td style={{ fontSize: 12 }}>
                                                {t.workers?.length > 0
                                                    ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                                                        {t.workers.map(w => (
                                                            <span key={w.workerId} style={{ padding: '1px 6px', borderRadius: 10, background: 'var(--bg-secondary)', fontSize: 11, border: '1px solid var(--border-light)' }}>
                                                                {w.worker.name}
                                                            </span>
                                                        ))}
                                                    </div>
                                                    : <span style={{ color: 'var(--text-muted)' }}>Chưa giao</span>
                                                }
                                            </td>
                                            <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmtDate(t.startDate)}</td>
                                            <td style={{ fontSize: 12, fontWeight: isOverdue ? 700 : 400, color: isOverdue ? '#dc2626' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                                {isOverdue ? '⚠️ ' : ''}{fmtDate(t.deadline)}
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <div style={{ flex: 1, height: 7, borderRadius: 4, background: 'var(--border-light)', overflow: 'hidden', minWidth: 60 }}>
                                                        <div style={{ height: '100%', borderRadius: 4, width: `${t.progress}%`, background: t.progress >= 100 ? '#16a34a' : t.progress >= 50 ? '#2563eb' : '#f59e0b', transition: 'width 0.3s' }} />
                                                    </div>
                                                    <span style={{ fontSize: 12, fontWeight: 600, minWidth: 30 }}>{t.progress}%</span>
                                                </div>
                                            </td>
                                            <td>
                                                <span style={{ padding: '2px 7px', borderRadius: 20, background: ps.bg, color: ps.color, fontSize: 11, fontWeight: 600 }}>{t.priority}</span>
                                            </td>
                                            <td>
                                                <select className="form-select" value={t.status} disabled={t.isLocked} onChange={e => handleStatusChange(t, e.target.value)}
                                                    style={{ padding: '3px 8px', fontSize: 12, background: ss.bg, color: ss.color, fontWeight: 600, border: 'none', borderRadius: 20, cursor: t.isLocked ? 'not-allowed' : 'pointer' }}>
                                                    {WT_STATUS_OPTS.map(s => <option key={s}>{s}</option>)}
                                                </select>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 3, justifyContent: 'flex-end' }}>
                                                    <button className="btn btn-ghost btn-sm" title="Cập nhật tiến độ" onClick={() => { setProgressTarget(t); setProgressVal(t.progress); }}>📊</button>
                                                    <button className="btn btn-ghost btn-sm" title="Sửa" onClick={() => openEdit(t)} disabled={t.isLocked}>✏️</button>
                                                    <button className="btn btn-ghost btn-sm" title={t.isLocked ? 'Mở khóa' : 'Khóa'} onClick={() => handleLock(t)}>{t.isLocked ? '🔓' : '🔒'}</button>
                                                    <button className="btn btn-ghost btn-sm" title="Xóa" onClick={() => setDeleteTarget(t)} style={{ color: 'var(--status-danger)' }}>🗑️</button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filtered.length === 0 && (
                                    <tr><td colSpan={9} style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
                                        {search || filterStatus || filterProject ? 'Không tìm thấy công việc nào' : 'Chưa có công việc nào'}
                                    </td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="mobile-card-list">
                        {filtered.map(t => {
                            const ss = WT_STATUS_STYLE[t.status] || WT_STATUS_STYLE['Chờ làm'];
                            const isOverdue = t.deadline && new Date(t.deadline) < new Date() && t.status !== 'Hoàn thành';
                            return (
                                <div key={t.id} className="mobile-card-item" style={{ borderLeft: isOverdue ? '3px solid #dc2626' : undefined }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <div style={{ flex: 1, paddingRight: 8 }}>
                                            <div style={{ fontWeight: 700, fontSize: 14, color: isOverdue ? '#dc2626' : 'inherit' }}>{t.isLocked && '🔒 '}{t.title}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.project?.name || 'Không có DA'}</div>
                                        </div>
                                        <span style={{ padding: '2px 8px', borderRadius: 20, background: ss.bg, color: ss.color, fontSize: 11, fontWeight: 600, height: 'fit-content' }}>{t.status}</span>
                                    </div>
                                    <div style={{ marginBottom: 6 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                                            <span style={{ color: 'var(--text-muted)' }}>Tiến độ</span>
                                            <span style={{ fontWeight: 600 }}>{t.progress}%</span>
                                        </div>
                                        <div style={{ height: 6, borderRadius: 3, background: 'var(--border-light)', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${t.progress}%`, background: t.progress >= 100 ? '#16a34a' : '#2563eb', borderRadius: 3 }} />
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                                        <span style={{ color: isOverdue ? '#dc2626' : 'var(--text-muted)' }}>{isOverdue ? '⚠️ ' : ''}Hạn: {fmtDate(t.deadline)}</span>
                                        <div style={{ display: 'flex', gap: 4 }}>
                                            <button className="btn btn-ghost btn-sm" onClick={() => { setProgressTarget(t); setProgressVal(t.progress); }}>📊</button>
                                            <button className="btn btn-ghost btn-sm" onClick={() => openEdit(t)}>✏️</button>
                                            <button className="btn btn-ghost btn-sm" onClick={() => setDeleteTarget(t)} style={{ color: 'var(--status-danger)' }}>🗑️</button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    </>
                )}
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 680, maxHeight: '90vh', overflowY: 'auto' }}>
                        <div className="modal-header">
                            <h3>{editTarget ? 'Sửa công việc' : 'Thêm công việc xưởng'}</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div className="form-group">
                                <label className="form-label">Tên công việc *</label>
                                <input className="form-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="VD: Đóng tủ bếp nhà anh Nam..." />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Mô tả</label>
                                <textarea className="form-input" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Dự án</label>
                                    <select className="form-select" value={form.projectId} onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))}>
                                        <option value="">— Không gắn DA —</option>
                                        {projects.map(p => <option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Ưu tiên</label>
                                    <select className="form-select" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                                        {WT_PRIORITY_OPTS.map(p => <option key={p}>{p}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Ngày bắt đầu</label>
                                    <input className="form-input" type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Hạn hoàn thành</label>
                                    <input className="form-input" type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Nhân công phụ trách</label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                                    {activeWorkers.length === 0 && <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Chưa có thợ nào. <a href="/workshop/workers">Thêm thợ →</a></span>}
                                    {activeWorkers.map(w => (
                                        <button key={w.id} type="button" onClick={() => toggleWorker(w.id)}
                                            style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer', border: '2px solid',
                                                borderColor: form.workerIds.includes(w.id) ? '#2563eb' : 'var(--border)',
                                                background: form.workerIds.includes(w.id) ? '#2563eb' : 'transparent',
                                                color: form.workerIds.includes(w.id) ? '#fff' : 'inherit', fontWeight: 600 }}>
                                            {w.name} {w.skill ? `· ${w.skill}` : ''}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Vật tư sử dụng</label>
                                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                                    <input className="form-input" placeholder="Tìm vật tư..." value={matSearch} onChange={e => setMatSearch(e.target.value)} style={{ flex: 1 }} />
                                </div>
                                {matSearch && (
                                    <div style={{ border: '1px solid var(--border)', borderRadius: 8, maxHeight: 160, overflowY: 'auto', marginBottom: 8 }}>
                                        {products.filter(p => p.name.toLowerCase().includes(matSearch.toLowerCase()) && !form.materials.find(m => m.productId === p.id)).slice(0, 8).map(p => (
                                            <div key={p.id} onClick={() => { addMaterial(p.id); setMatSearch(''); }}
                                                style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, display: 'flex', justifyContent: 'space-between' }}
                                                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                <span>{p.name}</span>
                                                <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Tồn: {p.stock} {p.unit}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {form.materials.length > 0 && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        {form.materials.map(m => {
                                            const p = products.find(pr => pr.id === m.productId);
                                            return p ? (
                                                <div key={m.productId} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}>
                                                    <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{p.name}</span>
                                                    <input type="number" min={0.1} step={0.1} value={m.quantity}
                                                        onChange={e => updateMaterialQty(m.productId, Number(e.target.value))}
                                                        style={{ width: 60, padding: '2px 6px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, textAlign: 'right' }} />
                                                    <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 30 }}>{p.unit}</span>
                                                    <button onClick={() => removeMaterial(m.productId)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--status-danger)', fontSize: 16 }}>×</button>
                                                </div>
                                            ) : null;
                                        })}
                                    </div>
                                )}
                            </div>
                            <div className="form-group">
                                <label className="form-label">Ghi chú</label>
                                <textarea className="form-input" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Hủy</button>
                            <button className="btn btn-primary" onClick={handleSubmit} disabled={saving || !form.title.trim()}>
                                {saving ? 'Đang lưu...' : editTarget ? 'Cập nhật' : 'Tạo công việc'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {progressTarget && (
                <div className="modal-overlay" onClick={() => setProgressTarget(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
                        <div className="modal-header">
                            <h3>Cập nhật tiến độ</h3>
                            <button className="modal-close" onClick={() => setProgressTarget(null)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div style={{ marginBottom: 12, fontWeight: 600, fontSize: 14 }}>{progressTarget.title}</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                                <span>Tiến độ</span>
                                <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: 18 }}>{progressVal}%</span>
                            </div>
                            <input type="range" min={0} max={100} step={5} value={progressVal}
                                onChange={e => setProgressVal(Number(e.target.value))} style={{ width: '100%', marginBottom: 8 }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)' }}>
                                <span>0%</span><span>50%</span><span>100%</span>
                            </div>
                            <div style={{ marginTop: 12, height: 10, borderRadius: 5, background: 'var(--border-light)', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${progressVal}%`, background: progressVal >= 100 ? '#16a34a' : progressVal >= 50 ? '#2563eb' : '#f59e0b', borderRadius: 5, transition: 'width 0.2s' }} />
                            </div>
                            {progressVal >= 100 && <div style={{ marginTop: 8, fontSize: 12, color: '#16a34a', fontWeight: 600, textAlign: 'center' }}>✓ Sẽ đánh dấu là Hoàn thành</div>}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setProgressTarget(null)}>Hủy</button>
                            <button className="btn btn-primary" onClick={handleProgressSave}>Lưu tiến độ</button>
                        </div>
                    </div>
                </div>
            )}

            {deleteTarget && (
                <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 380 }}>
                        <div className="modal-header"><h3>Xác nhận xóa</h3><button className="modal-close" onClick={() => setDeleteTarget(null)}>×</button></div>
                        <div className="modal-body"><p style={{ fontSize: 14 }}>Xóa công việc <strong>{deleteTarget.title}</strong>?</p></div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>Hủy</button>
                            <button className="btn btn-danger" onClick={handleDelete}>Xóa</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function WorkOrdersPage() {
    const { role } = useRole();
    const router = useRouter();
    const [tab, setTab] = useState('phieu');
    const [workers, setWorkers] = useState([]);
    const [projects, setProjects] = useState([]);

    useEffect(() => {
        if (role && !['xuong', 'ban_gd', 'giam_doc', 'pho_gd', 'admin',
            'ke_toan', 'hanh_chinh_kt', 'kinh_doanh', 'ky_thuat', 'viewer',
            'xay_dung', 'thiet_ke'].includes(role)) {
            router.replace('/'); return;
        }
        fetch('/api/workshop/workers').then(r => r.json()).then(d => setWorkers(Array.isArray(d) ? d : []));
        fetch('/api/projects?limit=200').then(r => r.json()).then(d => setProjects(d?.data || []));
    }, [role]);

    const tabs = [
        { key: 'phieu', label: '📋 Phiếu công việc' },
        { key: 'xuong', label: '🔧 Công việc xưởng' },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid var(--border)', paddingBottom: 0 }}>
                {tabs.map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)}
                        style={{
                            padding: '8px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                            border: 'none', background: 'transparent',
                            borderBottom: tab === t.key ? '2px solid var(--accent-primary)' : '2px solid transparent',
                            color: tab === t.key ? 'var(--accent-primary)' : 'var(--text-muted)',
                            marginBottom: -2, transition: 'color 0.15s',
                        }}>
                        {t.label}
                    </button>
                ))}
            </div>

            {tab === 'phieu'
                ? <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>}><PhieuTab /></Suspense>
                : <CongViecXuongTab workers={workers} projects={projects} />
            }
        </div>
    );
}
