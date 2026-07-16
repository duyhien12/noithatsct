'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';

const API_BASE = 'https://api.kientrucsct.com';

function authHeaders(token, json = true) {
    const h = { Authorization: `Bearer ${token}` };
    if (json) h['Content-Type'] = 'application/json';
    return h;
}

export default function FieldMfgTaskDetail() {
    const router = useRouter();
    const { taskId } = useParams();
    const [task, setTask] = useState(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState('');

    const [workHours, setWorkHours] = useState('');
    const [completedQuantity, setCompletedQuantity] = useState('');
    const [progressAfter, setProgressAfter] = useState('');
    const [issueDescription, setIssueDescription] = useState('');
    const [nextPlan, setNextPlan] = useState('');
    const [photos, setPhotos] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [showIssueForm, setShowIssueForm] = useState(false);
    const [issueTitle, setIssueTitle] = useState('');
    const [issueSeverity, setIssueSeverity] = useState('NORMAL');
    const fileRef = useRef(null);

    const load = useCallback(async () => {
        const token = localStorage.getItem('field_token');
        if (!token) { router.replace('/field'); return; }
        try {
            const res = await fetch(`${API_BASE}/api/manufacturing/tasks/${taskId}`, { headers: authHeaders(token, false) });
            const d = await res.json();
            setTask(d);
            setProgressAfter(String(d.progressPercent || 0));
        } finally {
            setLoading(false);
        }
    }, [taskId, router]);

    useEffect(() => { load(); }, [load]);

    async function changeStatus(status) {
        setBusy(true);
        const token = localStorage.getItem('field_token');
        try {
            const res = await fetch(`${API_BASE}/api/manufacturing/tasks/${taskId}`, { method: 'PUT', headers: authHeaders(token), body: JSON.stringify({ status }) });
            if (!res.ok) throw new Error((await res.json()).error || 'Lỗi cập nhật');
            await load();
        } catch (e) { setMsg(e.message); } finally { setBusy(false); }
    }

    async function uploadPhoto(file) {
        setUploading(true);
        const token = localStorage.getItem('field_token');
        try {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('type', 'proofs');
            const res = await fetch(`${API_BASE}/api/upload`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
            const d = await res.json();
            if (!res.ok) throw new Error('Lỗi tải ảnh');
            setPhotos(p => [...p, d.url]);
        } catch (e) { setMsg(e.message); } finally { setUploading(false); }
    }

    async function submitLog() {
        setBusy(true); setMsg('');
        const token = localStorage.getItem('field_token');
        try {
            const res = await fetch(`${API_BASE}/api/manufacturing/logs`, {
                method: 'POST', headers: authHeaders(token),
                body: JSON.stringify({
                    mfgOrderId: task.mfgOrder.id,
                    mfgItemId: task.item?.id,
                    mfgItemStageId: task.itemStage?.id,
                    taskId: task.id,
                    workDescription: task.title,
                    workHours: Number(workHours) || 0,
                    completedQuantity: Number(completedQuantity) || 0,
                    progressAfter: progressAfter !== '' ? Number(progressAfter) : undefined,
                    issueDescription, nextPlan, images: photos,
                }),
            });
            if (!res.ok) throw new Error((await res.json()).error || 'Lỗi ghi nhật ký');
            setMsg('✅ Đã lưu nhật ký!');
            setWorkHours(''); setCompletedQuantity(''); setIssueDescription(''); setNextPlan(''); setPhotos([]);
        } catch (e) { setMsg(e.message); } finally { setBusy(false); }
    }

    async function submitIssue() {
        if (!issueTitle.trim()) { setMsg('Nhập tiêu đề lỗi'); return; }
        setBusy(true); setMsg('');
        const token = localStorage.getItem('field_token');
        try {
            const res = await fetch(`${API_BASE}/api/manufacturing/quality/issues`, {
                method: 'POST', headers: authHeaders(token),
                body: JSON.stringify({
                    mfgOrderId: task.mfgOrder.id, mfgItemId: task.item?.id, mfgItemStageId: task.itemStage?.id,
                    title: issueTitle, description: issueDescription || issueTitle, severity: issueSeverity, photos,
                }),
            });
            if (!res.ok) throw new Error((await res.json()).error || 'Lỗi báo lỗi');
            setMsg('✅ Đã báo lỗi!');
            setShowIssueForm(false); setIssueTitle(''); setPhotos([]);
        } catch (e) { setMsg(e.message); } finally { setBusy(false); }
    }

    if (loading || !task) return <div style={{ minHeight: '100vh', background: '#0f172a', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Đang tải...</div>;

    const inputStyle = { width: '100%', padding: '14px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#f8fafc', fontSize: 15 };
    const btnStyle = (active) => ({ flex: 1, padding: '14px 8px', borderRadius: 12, border: 'none', background: active ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : 'rgba(255,255,255,0.06)', color: '#fff', fontSize: 14, fontWeight: 700 });

    return (
        <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f8fafc', paddingBottom: 60 }}>
            <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(10px)', padding: '52px 16px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button onClick={() => router.back()} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 12px', color: '#94a3b8', fontSize: 16 }}>←</button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, color: '#475569' }}>{task.mfgOrder?.code} {task.item ? `· ${task.item.code}` : ''}</div>
                        <div style={{ fontWeight: 600, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</div>
                    </div>
                </div>
            </div>

            <div style={{ padding: 16 }}>
                {(task.item?.drawingUrl || task.item?.referenceImageUrl) && (
                    <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                        {task.item.drawingUrl && <a href={task.item.drawingUrl} target="_blank" rel="noopener noreferrer" style={{ flex: 1, textAlign: 'center', padding: 10, borderRadius: 10, background: 'rgba(59,130,246,0.15)', color: '#3b82f6', fontSize: 13, fontWeight: 600 }}>📐 Xem bản vẽ</a>}
                        {task.item.referenceImageUrl && <a href={task.item.referenceImageUrl} target="_blank" rel="noopener noreferrer" style={{ flex: 1, textAlign: 'center', padding: 10, borderRadius: 10, background: 'rgba(139,92,246,0.15)', color: '#8b5cf6', fontSize: 13, fontWeight: 600 }}>🖼 Ảnh tham khảo</a>}
                    </div>
                )}

                <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                    <button disabled={busy} onClick={() => changeStatus('IN_PROGRESS')} style={btnStyle(task.status === 'IN_PROGRESS')}>▶ Bắt đầu</button>
                    <button disabled={busy} onClick={() => changeStatus('PAUSED')} style={btnStyle(task.status === 'PAUSED')}>⏸ Tạm dừng</button>
                    <button disabled={busy} onClick={() => changeStatus('COMPLETED')} style={btnStyle(task.status === 'COMPLETED')}>✅ Hoàn thành</button>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 16, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>📝 Ghi nhật ký</div>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ fontSize: 12, color: '#94a3b8' }}>Số giờ làm</label>
                            <input type="number" style={inputStyle} value={workHours} onChange={e => setWorkHours(e.target.value)} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ fontSize: 12, color: '#94a3b8' }}>Số lượng</label>
                            <input type="number" style={inputStyle} value={completedQuantity} onChange={e => setCompletedQuantity(e.target.value)} />
                        </div>
                    </div>
                    <div>
                        <label style={{ fontSize: 12, color: '#94a3b8' }}>Tiến độ sản phẩm (%)</label>
                        <input type="number" min="0" max="100" style={inputStyle} value={progressAfter} onChange={e => setProgressAfter(e.target.value)} />
                    </div>
                    <div>
                        <label style={{ fontSize: 12, color: '#94a3b8' }}>Khó khăn / phát sinh</label>
                        <textarea rows={2} style={inputStyle} value={issueDescription} onChange={e => setIssueDescription(e.target.value)} />
                    </div>
                    <div>
                        <label style={{ fontSize: 12, color: '#94a3b8' }}>Kế hoạch tiếp theo</label>
                        <textarea rows={2} style={inputStyle} value={nextPlan} onChange={e => setNextPlan(e.target.value)} />
                    </div>
                    <div>
                        <label style={{ fontSize: 12, color: '#94a3b8' }}>Ảnh ({photos.length})</label>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                            {photos.map((p, i) => <img key={i} src={p} alt="" style={{ width: 56, height: 56, borderRadius: 8, objectFit: 'cover' }} />)}
                            <div onClick={() => fileRef.current?.click()} style={{ width: 56, height: 56, borderRadius: 8, border: '2px dashed rgba(59,130,246,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: '#3b82f6' }}>{uploading ? '…' : '📷'}</div>
                            <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => e.target.files[0] && uploadPhoto(e.target.files[0])} />
                        </div>
                    </div>
                    <button disabled={busy} onClick={submitLog} style={{ padding: 14, borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: '#fff', fontWeight: 700, fontSize: 15 }}>
                        {busy ? 'Đang lưu...' : 'Lưu nhật ký'}
                    </button>
                </div>

                {!showIssueForm ? (
                    <button onClick={() => setShowIssueForm(true)} style={{ width: '100%', padding: 14, borderRadius: 12, border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.1)', color: '#f87171', fontWeight: 700 }}>
                        ⚠️ Báo lỗi
                    </button>
                ) : (
                    <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: '#f87171' }}>⚠️ Báo lỗi sản phẩm</div>
                        <input style={inputStyle} placeholder="Tiêu đề lỗi" value={issueTitle} onChange={e => setIssueTitle(e.target.value)} />
                        <select style={inputStyle} value={issueSeverity} onChange={e => setIssueSeverity(e.target.value)}>
                            <option value="MINOR">Nhẹ</option><option value="NORMAL">Bình thường</option><option value="MAJOR">Nặng</option><option value="CRITICAL">Nghiêm trọng</option>
                        </select>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => setShowIssueForm(false)} style={{ flex: 1, padding: 12, borderRadius: 10, border: 'none', background: 'rgba(255,255,255,0.06)', color: '#94a3b8' }}>Hủy</button>
                            <button disabled={busy} onClick={submitIssue} style={{ flex: 1, padding: 12, borderRadius: 10, border: 'none', background: '#ef4444', color: '#fff', fontWeight: 700 }}>Gửi báo lỗi</button>
                        </div>
                    </div>
                )}

                {msg && <div style={{ marginTop: 16, padding: 12, borderRadius: 10, background: 'rgba(255,255,255,0.05)', color: '#f8fafc', fontSize: 13, textAlign: 'center' }}>{msg}</div>}
            </div>
        </div>
    );
}
