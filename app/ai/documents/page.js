'use client';
import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { apiFetch } from '@/lib/fetchClient';
import { useToast } from '@/components/ui/Toast';
import { canUseDocumentAssistant } from '@/lib/aiAssistant/permissions';
import { DOCUMENT_CATEGORIES, DOCUMENT_TYPES } from '@/lib/aiAssistant/documentTemplates';
import { FileText, Copy, Loader2, Sparkles, Paperclip, X, Printer } from 'lucide-react';

const PRINT_STORAGE_KEY = 'sct_ai_doc_print';

const MAX_ATTACHMENTS = 5;
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel',
    'text/plain', 'text/csv'];
const ACCEPT_ATTR = '.pdf,.jpg,.jpeg,.png,.webp,.gif,.xlsx,.xls,.csv,.txt';

function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1] || '');
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

export default function AIDocumentsPage() {
    const { data: session } = useSession();
    const toast = useToast();
    const email = session?.user?.email;
    const allowed = canUseDocumentAssistant(email);

    const [category, setCategory] = useState(DOCUMENT_CATEGORIES[0].key);
    const typesInCategory = useMemo(
        () => DOCUMENT_TYPES.filter((d) => d.category === category),
        [category]
    );
    const [docType, setDocType] = useState(typesInCategory[0]?.key || '');
    const [userInput, setUserInput] = useState('');
    const [projectQuery, setProjectQuery] = useState('');
    const [projectOptions, setProjectOptions] = useState([]);
    const [selectedProject, setSelectedProject] = useState(null);
    const [showProjectOptions, setShowProjectOptions] = useState(false);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState('');
    const [attachments, setAttachments] = useState([]); // { name, mimeType, dataBase64, sizeKB }
    const [filesBusy, setFilesBusy] = useState(false);
    const searchTimer = useRef(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        const list = DOCUMENT_TYPES.filter((d) => d.category === category);
        setDocType(list[0]?.key || '');
    }, [category]);

    const searchProjects = useCallback((q) => {
        clearTimeout(searchTimer.current);
        if (!q.trim()) { setProjectOptions([]); return; }
        searchTimer.current = setTimeout(async () => {
            try {
                const d = await apiFetch(`/api/projects?search=${encodeURIComponent(q.trim())}&limit=8`);
                setProjectOptions(d.data || []);
            } catch { /* ignore */ }
        }, 300);
    }, []);

    if (!allowed) {
        return (
            <div className="card" style={{ maxWidth: 560, margin: '40px auto', padding: 24, textAlign: 'center' }}>
                <Sparkles size={28} style={{ opacity: 0.4 }} />
                <h3 style={{ margin: '12px 0 4px' }}>Trợ lý Hồ sơ AI</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                    Tính năng này hiện chỉ dành cho một số tài khoản được cấp quyền trong giai đoạn thử nghiệm.
                    Liên hệ quản trị viên nếu cần được cấp quyền sử dụng.
                </p>
            </div>
        );
    }

    const currentTemplate = DOCUMENT_TYPES.find((d) => d.key === docType);

    const handleFilesSelected = async (e) => {
        const files = Array.from(e.target.files || []);
        e.target.value = ''; // cho phép chọn lại cùng file sau này
        if (files.length === 0) return;

        if (attachments.length + files.length > MAX_ATTACHMENTS) {
            toast.error(`Chỉ được đính kèm tối đa ${MAX_ATTACHMENTS} tệp.`);
            return;
        }

        setFilesBusy(true);
        try {
            const newOnes = [];
            for (const file of files) {
                if (!ACCEPTED_TYPES.includes(file.type)) {
                    toast.error(`Định dạng "${file.name}" không được hỗ trợ.`);
                    continue;
                }
                if (file.size > MAX_FILE_BYTES) {
                    toast.error(`Tệp "${file.name}" vượt quá ${MAX_FILE_BYTES / 1024 / 1024}MB.`);
                    continue;
                }
                const dataBase64 = await readFileAsBase64(file);
                newOnes.push({ name: file.name, mimeType: file.type, dataBase64, sizeKB: Math.round(file.size / 1024) });
            }
            setAttachments((prev) => [...prev, ...newOnes]);
        } catch {
            toast.error('Không đọc được tệp đã chọn.');
        }
        setFilesBusy(false);
    };

    const removeAttachment = (idx) => {
        setAttachments((prev) => prev.filter((_, i) => i !== idx));
    };

    const handleSubmit = async () => {
        if (!docType || !userInput.trim()) {
            toast.error('Vui lòng chọn loại hồ sơ và nhập nội dung/yêu cầu.');
            return;
        }
        setLoading(true);
        setResult('');
        try {
            const d = await apiFetch('/api/ai/document-assistant', {
                method: 'POST',
                body: JSON.stringify({
                    docType,
                    userInput: userInput.trim(),
                    projectId: selectedProject?.id || null,
                    attachments: attachments.map(({ name, mimeType, dataBase64 }) => ({ name, mimeType, dataBase64 })),
                }),
            });
            setResult(d.result || '');
        } catch (e) {
            toast.error(e.message || 'Có lỗi khi tạo hồ sơ.');
        }
        setLoading(false);
    };

    const handleCopy = () => {
        if (!result) return;
        navigator.clipboard.writeText(result);
        toast.success('Đã sao chép nội dung.');
    };

    const handleExportPdf = () => {
        if (!result) return;
        const payload = {
            markdown: result,
            docTypeLabel: currentTemplate?.label || '',
            projectLabel: selectedProject ? `${selectedProject.code} - ${selectedProject.name}` : '',
            userName: session?.user?.name || '',
            createdAt: new Date().toISOString(),
        };
        sessionStorage.setItem(PRINT_STORAGE_KEY, JSON.stringify(payload));
        window.open('/ai/documents/print', '_blank');
    };

    return (
        <div>
            <div className="page-header">
                <div className="page-header-left">
                    <h1><FileText size={22} style={{ verticalAlign: -3, marginRight: 6 }} />Trợ lý Hồ sơ AI</h1>
                    <p>Soạn thảo và chuẩn hóa hồ sơ công trình, hồ sơ hành chính - kế toán theo mẫu chuẩn SCT.</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 380px) 1fr', gap: 20, alignItems: 'start' }}>
                <div className="card" style={{ padding: 18 }}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                        {DOCUMENT_CATEGORIES.map((c) => (
                            <button
                                key={c.key}
                                onClick={() => setCategory(c.key)}
                                className={`btn ${category === c.key ? 'btn-primary' : ''}`}
                                style={{ fontSize: 12.5, padding: '6px 10px' }}
                            >
                                {c.label}
                            </button>
                        ))}
                    </div>

                    <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Loại hồ sơ</label>
                    <select className="form-select" value={docType} onChange={(e) => setDocType(e.target.value)} style={{ marginBottom: 14, width: '100%' }}>
                        {typesInCategory.map((d) => (
                            <option key={d.key} value={d.key}>{d.label}</option>
                        ))}
                    </select>

                    {category === 'technical' && (
                        <div style={{ marginBottom: 14, position: 'relative' }}>
                            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                                Công trình liên quan (tuỳ chọn)
                            </label>
                            <input
                                className="form-input"
                                style={{ width: '100%' }}
                                placeholder="Gõ tên hoặc mã công trình..."
                                value={selectedProject ? `${selectedProject.code} - ${selectedProject.name}` : projectQuery}
                                onChange={(e) => {
                                    setSelectedProject(null);
                                    setProjectQuery(e.target.value);
                                    setShowProjectOptions(true);
                                    searchProjects(e.target.value);
                                }}
                                onFocus={() => setShowProjectOptions(true)}
                                onBlur={() => setTimeout(() => setShowProjectOptions(false), 150)}
                            />
                            {showProjectOptions && projectOptions.length > 0 && (
                                <div style={{
                                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                                    background: 'var(--bg-primary, #fff)', border: '1px solid var(--border-color)',
                                    borderRadius: 8, marginTop: 4, maxHeight: 220, overflowY: 'auto',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                }}>
                                    {projectOptions.map((p) => (
                                        <div
                                            key={p.id}
                                            onMouseDown={() => { setSelectedProject(p); setProjectQuery(''); setShowProjectOptions(false); }}
                                            style={{ padding: '8px 10px', fontSize: 13, cursor: 'pointer', borderBottom: '1px solid var(--border-color)' }}
                                        >
                                            <strong>{p.code}</strong> — {p.name}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Nội dung / yêu cầu</label>
                    <textarea
                        className="form-input"
                        style={{ width: '100%', minHeight: 160, resize: 'vertical', fontFamily: 'inherit' }}
                        placeholder="Mô tả thông tin, ghi chú thô hoặc yêu cầu cụ thể..."
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                    />

                    <div style={{ marginTop: 10, marginBottom: 4 }}>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept={ACCEPT_ATTR}
                            multiple
                            hidden
                            onChange={handleFilesSelected}
                        />
                        <button
                            type="button"
                            className="btn"
                            style={{ fontSize: 12.5, padding: '6px 10px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                            onClick={() => fileInputRef.current?.click()}
                            disabled={filesBusy || attachments.length >= MAX_ATTACHMENTS}
                        >
                            <Paperclip size={13} />
                            {filesBusy ? 'Đang đọc tệp...' : 'Đính kèm báo giá / hợp đồng / ảnh...'}
                        </button>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                            PDF, ảnh, Excel, văn bản — tối đa {MAX_ATTACHMENTS} tệp, {MAX_FILE_BYTES / 1024 / 1024}MB/tệp. AI sẽ đọc và lấy dữ liệu từ tệp để soạn hồ sơ.
                        </div>
                    </div>

                    {attachments.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
                            {attachments.map((a, i) => (
                                <div key={i} style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    background: 'var(--bg-secondary, #f3f4f6)', borderRadius: 6, padding: '5px 8px', fontSize: 12,
                                }}>
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        📎 {a.name} <span style={{ color: 'var(--text-muted)' }}>({a.sizeKB}KB)</span>
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => removeAttachment(i)}
                                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}
                                    >
                                        <X size={13} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <button
                        className="btn btn-primary"
                        style={{ width: '100%', marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                        onClick={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={15} />}
                        {loading ? 'Đang soạn...' : 'Soạn hồ sơ'}
                    </button>
                </div>

                <div className="card" style={{ padding: 18, minHeight: 400 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{currentTemplate?.label || 'Kết quả'}</div>
                        {result && (
                            <div style={{ display: 'flex', gap: 6 }}>
                                <button className="btn" style={{ fontSize: 12, padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 4 }} onClick={handleCopy}>
                                    <Copy size={13} /> Sao chép
                                </button>
                                <button className="btn" style={{ fontSize: 12, padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 4 }} onClick={handleExportPdf}>
                                    <Printer size={13} /> Xuất PDF
                                </button>
                            </div>
                        )}
                    </div>
                    {loading && <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Đang xử lý, vui lòng chờ...</div>}
                    {!loading && !result && (
                        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                            Kết quả soạn thảo sẽ hiển thị ở đây. Nội dung sinh ra bởi AI cần được kiểm tra lại trước khi sử dụng chính thức.
                        </div>
                    )}
                    {result && (
                        <div style={{ whiteSpace: 'pre-wrap', fontSize: 13.5, lineHeight: 1.6 }}>{result}</div>
                    )}
                </div>
            </div>
        </div>
    );
}
