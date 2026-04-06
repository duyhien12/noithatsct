'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';

const API_BASE = 'https://api.kientrucsct.com';

export default function FieldUpdateTask() {
    const router = useRouter();
    const { taskId } = useParams();
    const searchParams = useSearchParams();
    const projectId = searchParams.get('projectId');
    const taskName = searchParams.get('name') || 'Hạng mục';
    const currentProgress = parseInt(searchParams.get('progress') || '0', 10);

    const [progress, setProgress] = useState(currentProgress);
    const [description, setDescription] = useState('');
    const [images, setImages] = useState([]); // [{url, preview, uploading, error}]
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef(null);

    useEffect(() => {
        const token = localStorage.getItem('field_token');
        if (!token) router.replace('/field');
    }, [router]);

    const uploadFile = async (file) => {
        const token = localStorage.getItem('field_token');
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'proofs');

        const res = await fetch(`${API_BASE}/api/upload`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
        });
        if (!res.ok) throw new Error('Upload thất bại');
        const data = await res.json();
        return data.url;
    };

    const handleFileChange = async (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;

        // Limit to 10 photos total
        const remaining = 10 - images.length;
        const toProcess = files.slice(0, remaining);

        // Add placeholders
        const placeholders = toProcess.map(f => ({
            id: Math.random().toString(36).slice(2),
            preview: URL.createObjectURL(f),
            url: null,
            uploading: true,
            error: null,
        }));
        setImages(prev => [...prev, ...placeholders]);

        // Upload each
        toProcess.forEach(async (file, i) => {
            const ph = placeholders[i];
            try {
                // Compress if image is too large
                const url = await uploadFile(file);
                setImages(prev => prev.map(img => img.id === ph.id ? { ...img, url, uploading: false } : img));
            } catch (err) {
                setImages(prev => prev.map(img => img.id === ph.id ? { ...img, uploading: false, error: 'Lỗi upload' } : img));
            }
        });

        // Reset input
        e.target.value = '';
    };

    const removeImage = (id) => {
        setImages(prev => prev.filter(img => img.id !== id));
    };

    const handleSubmit = async () => {
        if (progress <= currentProgress) {
            setError(`Tiến độ mới phải lớn hơn hiện tại (${currentProgress}%)`);
            return;
        }
        if (images.some(img => img.uploading)) {
            setError('Vui lòng chờ ảnh upload xong');
            return;
        }
        const successfulImages = images.filter(img => img.url).map(img => img.url);
        if (successfulImages.length === 0) {
            setError('Cần ít nhất 1 ảnh');
            return;
        }

        setSubmitting(true);
        setError('');
        try {
            const token = localStorage.getItem('field_token');
            const user = JSON.parse(localStorage.getItem('field_user') || '{}');
            const res = await fetch(`${API_BASE}/api/progress-reports`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                    'x-user-name': user.name || 'Thợ thi công',
                },
                body: JSON.stringify({
                    taskId,
                    projectId,
                    progressTo: progress,
                    description,
                    images: successfulImages,
                    reportDate: new Date().toISOString(),
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Lỗi gửi báo cáo');
            setSubmitted(true);
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (submitted) return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0f172a', padding: 24 }}>
            <div style={{ textAlign: 'center', animation: 'fadeIn 0.4s ease' }}>
                <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
                <h2 style={{ margin: '0 0 8px', fontSize: 20, color: '#f8fafc' }}>Đã gửi thành công!</h2>
                <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 28px' }}>Tiến độ đã được cập nhật lên {progress}%</p>
                <button onClick={() => router.replace('/field/dashboard')} style={{ padding: '14px 28px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
                    Về trang chính
                </button>
            </div>
            <style>{`@keyframes fadeIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }`}</style>
        </div>
    );

    const allUploaded = images.length > 0 && images.every(img => !img.uploading);
    const uploadingCount = images.filter(img => img.uploading).length;

    return (
        <>
            <style>{`
                * { box-sizing: border-box; }
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                textarea { resize: none; -webkit-appearance: none; }
                textarea:focus { outline: none; }
                input[type=range] { -webkit-appearance: none; appearance: none; height: 6px; border-radius: 3px; background: rgba(255,255,255,0.1); cursor: pointer; }
                input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 22px; height: 22px; border-radius: 50%; background: linear-gradient(135deg, #3b82f6, #8b5cf6); cursor: pointer; box-shadow: 0 2px 8px rgba(59,130,246,0.5); }
            `}</style>
            <div style={{ minHeight: '100vh', background: '#0f172a', paddingBottom: 100 }}>
                {/* Header */}
                <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(10px)', padding: '52px 16px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <button onClick={() => router.back()} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 12px', color: '#94a3b8', fontSize: 16, cursor: 'pointer' }}>
                            ←
                        </button>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 11, color: '#475569', marginBottom: 2 }}>Cập nhật tiến độ</div>
                            <div style={{ fontWeight: 600, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{decodeURIComponent(taskName)}</div>
                        </div>
                    </div>
                </div>

                <div style={{ padding: '20px 16px' }}>
                    {/* Current vs New Progress */}
                    <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: '20px', marginBottom: 20, border: '1px solid rgba(255,255,255,0.07)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: 28, fontWeight: 700, color: '#64748b' }}>{currentProgress}%</div>
                                <div style={{ fontSize: 11, color: '#475569' }}>Hiện tại</div>
                            </div>
                            <div style={{ fontSize: 20, color: '#3b82f6' }}>→</div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: 36, fontWeight: 800, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{progress}%</div>
                                <div style={{ fontSize: 11, color: '#475569' }}>Mới</div>
                            </div>
                        </div>

                        {/* Slider */}
                        <input
                            type="range"
                            min={currentProgress}
                            max={100}
                            step={5}
                            value={progress}
                            onChange={e => setProgress(Number(e.target.value))}
                            style={{ width: '100%' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                            <span style={{ fontSize: 10, color: '#475569' }}>{currentProgress}%</span>
                            <span style={{ fontSize: 10, color: '#475569' }}>100%</span>
                        </div>

                        {/* Quick select */}
                        <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
                            {[25, 50, 75, 100].filter(v => v > currentProgress).map(v => (
                                <button key={v} onClick={() => setProgress(v)} style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${progress === v ? '#3b82f6' : 'rgba(255,255,255,0.1)'}`, background: progress === v ? 'rgba(59,130,246,0.2)' : 'transparent', color: progress === v ? '#3b82f6' : '#64748b', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                                    {v}%
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Photo Upload */}
                    <div style={{ marginBottom: 20 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                            <div style={{ fontSize: 14, fontWeight: 600 }}>Ảnh tiến độ <span style={{ color: '#ef4444' }}>*</span></div>
                            <span style={{ fontSize: 11, color: '#64748b' }}>{images.length}/10 ảnh</span>
                        </div>

                        {/* Photo Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 10 }}>
                            {images.map(img => (
                                <div key={img.id} style={{ position: 'relative', aspectRatio: '1', borderRadius: 10, overflow: 'hidden', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                    <img src={img.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    {img.uploading && (
                                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <div style={{ width: 20, height: 20, border: '2px solid #334155', borderTop: '2px solid #3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                                        </div>
                                    )}
                                    {img.error && (
                                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(239,68,68,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff' }}>Lỗi</div>
                                    )}
                                    {!img.uploading && (
                                        <button onClick={() => removeImage(img.id)} style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: 'none', color: '#fff', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>×</button>
                                    )}
                                </div>
                            ))}

                            {/* Add photo buttons */}
                            {images.length < 10 && (
                                <>
                                    {/* Camera capture */}
                                    <div onClick={() => {
                                        const inp = document.createElement('input');
                                        inp.type = 'file';
                                        inp.accept = 'image/*';
                                        inp.capture = 'environment';
                                        inp.onchange = handleFileChange;
                                        inp.click();
                                    }} style={{ aspectRatio: '1', borderRadius: 10, border: '2px dashed rgba(59,130,246,0.4)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'rgba(59,130,246,0.05)', gap: 4 }}>
                                        <span style={{ fontSize: 24 }}>📷</span>
                                        <span style={{ fontSize: 10, color: '#3b82f6' }}>Chụp ảnh</span>
                                    </div>

                                    {/* Gallery pick */}
                                    <div onClick={() => fileInputRef.current?.click()} style={{ aspectRatio: '1', borderRadius: 10, border: '2px dashed rgba(255,255,255,0.15)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'rgba(255,255,255,0.02)', gap: 4 }}>
                                        <span style={{ fontSize: 24 }}>🖼️</span>
                                        <span style={{ fontSize: 10, color: '#64748b' }}>Thư viện</span>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Hidden multi-file input */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            style={{ display: 'none' }}
                            onChange={handleFileChange}
                        />

                        {uploadingCount > 0 && (
                            <div style={{ fontSize: 12, color: '#3b82f6', textAlign: 'center' }}>
                                Đang upload {uploadingCount} ảnh...
                            </div>
                        )}
                    </div>

                    {/* Description */}
                    <div style={{ marginBottom: 20 }}>
                        <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Mô tả công việc</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Mô tả công việc đã thực hiện, vật liệu, ghi chú..."
                            rows={4}
                            style={{ width: '100%', padding: '14px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#f8fafc', fontSize: 15, lineHeight: 1.5 }}
                            onFocus={e => e.target.style.borderColor = '#3b82f6'}
                            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                        />
                    </div>

                    {/* Error */}
                    {error && (
                        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '12px 14px', marginBottom: 16, fontSize: 13, color: '#f87171' }}>
                            {error}
                        </div>
                    )}
                </div>

                {/* Submit Button - fixed bottom */}
                <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px', background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(10px)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting || images.some(img => img.uploading) || images.filter(img => img.url).length === 0}
                        style={{
                            width: '100%', padding: '16px', borderRadius: 14, border: 'none',
                            background: submitting || images.filter(img => img.url).length === 0 ? '#1e293b' : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                            color: submitting || images.filter(img => img.url).length === 0 ? '#475569' : '#fff',
                            fontSize: 16, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {submitting ? 'Đang gửi...' : `Gửi báo cáo tiến độ ${progress}%`}
                    </button>
                </div>
            </div>
        </>
    );
}
