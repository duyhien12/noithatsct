'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { SPACES, DOC_CATEGORIES, STATUS_CONFIG } from '@/lib/document-constants';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
const fmtSize = (bytes) => {
    if (!bytes || bytes === 0) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

const MIME_ICONS = {
    'application/pdf': '📄',
    'image/': '🖼️',
    'application/vnd.openxmlformats-officedocument.wordprocessingml': '📝',
    'application/msword': '📝',
    'application/vnd.openxmlformats-officedocument.spreadsheetml': '📊',
    'application/vnd.ms-excel': '📊',
};

function getFileIcon(mimeType, fileName) {
    if (!mimeType && !fileName) return '📎';
    const mime = mimeType || '';
    for (const [key, icon] of Object.entries(MIME_ICONS)) {
        if (mime.startsWith(key)) return icon;
    }
    const ext = (fileName || '').split('.').pop()?.toLowerCase();
    if (['dwg', 'dxf'].includes(ext)) return '📐';
    if (['zip', 'rar'].includes(ext)) return '📦';
    if (['svg'].includes(ext)) return '🎨';
    return '📎';
}

function canPreview(mimeType) {
    if (!mimeType) return false;
    return mimeType === 'application/pdf' || mimeType.startsWith('image/');
}

// ============ FOLDER TREE ============
function FolderTree({ folders, selectedFolderId, onSelect, onCreateFolder }) {
    const [expandedIds, setExpandedIds] = useState(new Set(folders.map(f => f.id)));
    const [newFolderParentId, setNewFolderParentId] = useState(null);
    const [newFolderName, setNewFolderName] = useState('');

    const toggle = (id) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const handleCreateFolder = async (parentId) => {
        if (!newFolderName.trim()) return;
        await onCreateFolder(newFolderName.trim(), parentId);
        setNewFolderName('');
        setNewFolderParentId(null);
    };

    const renderFolder = (folder, depth = 0) => {
        const isExpanded = expandedIds.has(folder.id);
        const isSelected = selectedFolderId === folder.id;
        const hasChildren = folder.children && folder.children.length > 0;
        const docCount = folder._count?.documents || 0;

        return (
            <div key={folder.id}>
                <div
                    className={`folder-node ${isSelected ? 'selected' : ''}`}
                    style={{ paddingLeft: 12 + depth * 20, display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', paddingLeft: 12 + depth * 20, cursor: 'pointer', borderRadius: 6, margin: '1px 4px', background: isSelected ? 'var(--accent-primary-light, rgba(59,130,246,0.1))' : 'transparent', color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)', fontSize: 13, transition: 'all 0.15s' }}
                    onClick={() => onSelect(folder.id)}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-elevated, rgba(0,0,0,0.03))'; }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                >
                    {hasChildren ? (
                        <span onClick={(e) => { e.stopPropagation(); toggle(folder.id); }} style={{ cursor: 'pointer', fontSize: 10, width: 16, textAlign: 'center', color: 'var(--text-muted)' }}>
                            {isExpanded ? '▼' : '▶'}
                        </span>
                    ) : (
                        <span style={{ width: 16 }}></span>
                    )}
                    <span>{isExpanded ? '📂' : '📁'}</span>
                    <span style={{ flex: 1, fontWeight: isSelected ? 600 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{folder.name}</span>
                    {docCount > 0 && <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-primary)', borderRadius: 10, padding: '1px 7px', minWidth: 20, textAlign: 'center' }}>{docCount}</span>}
                    <button
                        onClick={(e) => { e.stopPropagation(); setNewFolderParentId(folder.id); setNewFolderName(''); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--text-muted)', padding: '0 2px', opacity: 0.5 }}
                        title="Thêm thư mục con"
                    >+</button>
                </div>
                {newFolderParentId === folder.id && (
                    <div style={{ paddingLeft: 32 + depth * 20, paddingRight: 8, paddingBottom: 4 }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                            <input autoFocus className="form-input" style={{ padding: '4px 8px', fontSize: 12, flex: 1 }} value={newFolderName} onChange={e => setNewFolderName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleCreateFolder(folder.id); if (e.key === 'Escape') setNewFolderParentId(null); }} placeholder="Tên thư mục..." />
                            <button className="btn btn-primary" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => handleCreateFolder(folder.id)}>OK</button>
                        </div>
                    </div>
                )}
                {isExpanded && hasChildren && folder.children.map(child => renderFolder(child, depth + 1))}
            </div>
        );
    };

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', cursor: 'pointer', borderRadius: 6, margin: '1px 4px', background: selectedFolderId === null ? 'var(--accent-primary-light, rgba(59,130,246,0.1))' : 'transparent', color: selectedFolderId === null ? 'var(--accent-primary)' : 'var(--text-primary)', fontSize: 13, fontWeight: selectedFolderId === null ? 600 : 400 }} onClick={() => onSelect(null)}>
                <span style={{ width: 16 }}></span><span>📋</span><span style={{ flex: 1 }}>Tất cả tài liệu</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', cursor: 'pointer', borderRadius: 6, margin: '1px 4px', background: selectedFolderId === 'unsorted' ? 'var(--accent-primary-light, rgba(59,130,246,0.1))' : 'transparent', color: selectedFolderId === 'unsorted' ? 'var(--accent-primary)' : 'var(--text-muted)', fontSize: 13, fontWeight: selectedFolderId === 'unsorted' ? 600 : 400 }} onClick={() => onSelect('unsorted')}>
                <span style={{ width: 16 }}></span><span>📂</span><span style={{ flex: 1 }}>Chưa phân loại</span>
            </div>
            <div style={{ height: 1, background: 'var(--border-light)', margin: '6px 8px' }}></div>
            {folders.map(f => renderFolder(f))}
            {newFolderParentId === 'root' ? (
                <div style={{ padding: '4px 8px' }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                        <input autoFocus className="form-input" style={{ padding: '4px 8px', fontSize: 12, flex: 1 }} value={newFolderName} onChange={e => setNewFolderName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleCreateFolder(null); if (e.key === 'Escape') setNewFolderParentId(null); }} placeholder="Tên thư mục..." />
                        <button className="btn btn-primary" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => handleCreateFolder(null)}>OK</button>
                    </div>
                </div>
            ) : (
                <button onClick={() => { setNewFolderParentId('root'); setNewFolderName(''); }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', width: '100%', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12, borderRadius: 6, margin: '2px 4px' }}>
                    <span style={{ width: 16 }}></span>+ Thêm thư mục
                </button>
            )}
        </div>
    );
}

// ============ UPLOAD MODAL ============
function UploadModal({ onClose, onUpload, folders, preselectedFolderId, parentDoc }) {
    const [files, setFiles] = useState([]);
    const [folderId, setFolderId] = useState(preselectedFolderId || '');
    const [space, setSpace] = useState('');
    const [category, setCategory] = useState('Khác');
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef(null);

    const flatFolders = [];
    const flatten = (list, depth = 0) => {
        for (const f of list) {
            flatFolders.push({ id: f.id, name: f.name, depth });
            if (f.children) flatten(f.children, depth + 1);
        }
    };
    flatten(folders);

    const handleFiles = (fileList) => {
        const newFiles = Array.from(fileList).map(f => ({
            file: f,
            name: f.name.replace(/\.[^.]+$/, ''),
        }));
        setFiles(prev => [...prev, ...newFiles]);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        handleFiles(e.dataTransfer.files);
    };

    const removeFile = (idx) => setFiles(prev => prev.filter((_, i) => i !== idx));
    const updateFileName = (idx, name) => setFiles(prev => { const u = [...prev]; u[idx] = { ...u[idx], name }; return u; });

    const handleUpload = async () => {
        if (files.length === 0) return;
        setUploading(true);
        setProgress({ current: 0, total: files.length });

        // Upload files in parallel batches of 3
        const BATCH_SIZE = 3;
        let completed = 0;

        for (let i = 0; i < files.length; i += BATCH_SIZE) {
            const batch = files.slice(i, i + BATCH_SIZE);
            const promises = batch.map(async ({ file, name }) => {
                try {
                    const formData = new FormData();
                    formData.append('file', file);
                    formData.append('type', 'documents');
                    const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
                    if (!uploadRes.ok) {
                        const err = await uploadRes.json();
                        throw new Error(err.error || 'Upload failed');
                    }
                    const { url, thumbnailUrl } = await uploadRes.json();

                    const docData = {
                        name: name || file.name,
                        fileName: file.name,
                        fileUrl: url,
                        thumbnailUrl: thumbnailUrl || '',
                        mimeType: file.type,
                        fileSize: file.size,
                        folderId: folderId || null,
                        space: space || '',
                        category,
                        projectId: '',
                    };
                    if (parentDoc) {
                        docData.parentDocumentId = parentDoc.id;
                    }
                    // Only save to DB, skip refresh per file
                    await onUpload(docData, true);
                } catch (err) {
                    console.error('Upload error:', err);
                    alert(`Lỗi upload "${file.name}": ${err.message}`);
                }
                completed++;
                setProgress({ current: completed, total: files.length });
            });
            await Promise.all(promises);
        }

        // Refresh once after all uploads complete
        await onUpload(null, false);
        setUploading(false);
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
                <div className="modal-header">
                    <h3>{parentDoc ? `📤 Upload phiên bản mới — ${parentDoc.name}` : '📤 Upload tài liệu'}</h3>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>
                <div className="modal-body">
                    {/* Drag-drop zone */}
                    <div
                        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                            border: `2px dashed ${dragOver ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                            borderRadius: 12, padding: '28px 24px', textAlign: 'center', cursor: 'pointer',
                            background: dragOver ? 'rgba(59,130,246,0.05)' : 'var(--bg-primary)',
                            transition: 'all 0.2s', marginBottom: 16,
                        }}
                    >
                        <div style={{ fontSize: 32, marginBottom: 6 }}>📁</div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>Kéo thả file vào đây</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>hoặc click để chọn file (tối đa 200MB)</div>
                        <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />
                    </div>

                    {/* Space + Category + Folder */}
                    {!parentDoc && (
                        <div className="form-row" style={{ gap: 8, marginBottom: 12 }}>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label">🏠 Khu vực / Không gian</label>
                                <select className="form-select" value={space} onChange={e => setSpace(e.target.value)}>
                                    <option value="">— Chọn không gian —</option>
                                    {SPACES.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label">📁 Loại tài liệu</label>
                                <select className="form-select" value={category} onChange={e => setCategory(e.target.value)}>
                                    {DOC_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label">📂 Thư mục</label>
                                <select className="form-select" value={folderId} onChange={e => setFolderId(e.target.value)}>
                                    <option value="">Chưa phân loại</option>
                                    {flatFolders.map(f => <option key={f.id} value={f.id}>{'  '.repeat(f.depth)}{f.name}</option>)}
                                </select>
                            </div>
                        </div>
                    )}

                    {/* File list */}
                    {files.length > 0 && (
                        <div style={{ marginTop: 8 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{files.length} file đã chọn</div>
                            {files.map((f, idx) => (
                                <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border-light)' }}>
                                    <span style={{ fontSize: 18 }}>{getFileIcon(f.file.type, f.file.name)}</span>
                                    <input className="form-input" style={{ flex: 1, padding: '4px 8px', fontSize: 13 }} value={f.name} onChange={e => updateFileName(idx, e.target.value)} />
                                    <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{fmtSize(f.file.size)}</span>
                                    <button onClick={() => removeFile(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--status-danger)', fontSize: 16 }}>×</button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Progress */}
                    {uploading && (
                        <div style={{ marginTop: 16 }}>
                            <div style={{ fontSize: 13, marginBottom: 6 }}>Đang upload {progress.current}/{progress.total}...</div>
                            <div className="progress-bar"><div className="progress-fill" style={{ width: `${(progress.current / progress.total) * 100}%`, transition: 'width 0.3s' }}></div></div>
                        </div>
                    )}
                </div>
                <div className="modal-footer">
                    <button className="btn btn-ghost" onClick={onClose} disabled={uploading}>Hủy</button>
                    <button className="btn btn-primary" onClick={handleUpload} disabled={uploading || files.length === 0}>
                        {uploading ? 'Đang upload...' : `Upload ${files.length > 0 ? `(${files.length})` : ''}`}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ============ PREVIEW MODAL ============
function PreviewModal({ doc, onClose }) {
    if (!doc) return null;
    const isPdf = doc.mimeType === 'application/pdf';
    const isImage = doc.mimeType?.startsWith('image/');

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: isPdf || isImage ? 900 : 500, width: '90vw' }}>
                <div className="modal-header">
                    <h3>{getFileIcon(doc.mimeType, doc.fileName)} {doc.name}</h3>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>
                <div className="modal-body" style={{ padding: 0 }}>
                    {isPdf && <iframe src={doc.fileUrl} style={{ width: '100%', height: '70vh', border: 'none' }} />}
                    {isImage && (
                        <div style={{ textAlign: 'center', padding: 16, maxHeight: '70vh', overflow: 'auto' }}>
                            <img src={doc.fileUrl} alt={doc.name} style={{ maxWidth: '100%', maxHeight: '65vh', objectFit: 'contain' }} />
                        </div>
                    )}
                    {!isPdf && !isImage && (
                        <div style={{ padding: 40, textAlign: 'center' }}>
                            <div style={{ fontSize: 48, marginBottom: 16 }}>{getFileIcon(doc.mimeType, doc.fileName)}</div>
                            <div style={{ fontSize: 14, marginBottom: 8 }}>{doc.fileName}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>{fmtSize(doc.fileSize)}</div>
                            {doc.fileUrl && <a href={doc.fileUrl} download className="btn btn-primary" target="_blank" rel="noopener">Tải xuống</a>}
                        </div>
                    )}
                </div>
                <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>v{doc.version} • {doc.space || '—'} • {doc.uploadedBy || '—'} • {fmtDate(doc.createdAt)}</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        {doc.fileUrl && <a href={doc.fileUrl} download className="btn btn-ghost btn-sm" target="_blank" rel="noopener">Tải xuống</a>}
                        <button className="btn btn-ghost btn-sm" onClick={onClose}>Đóng</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ============ VERSION HISTORY MODAL ============
function VersionModal({ docId, onClose }) {
    const [versions, setVersions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`/api/project-documents/${docId}/versions`)
            .then(r => r.json())
            .then(data => { setVersions(data); setLoading(false); })
            .catch(() => setLoading(false));
    }, [docId]);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
                <div className="modal-header"><h3>Lịch sử phiên bản</h3><button className="modal-close" onClick={onClose}>×</button></div>
                <div className="modal-body">
                    {loading ? (
                        <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
                    ) : (
                        <div className="table-container">
                            <table className="data-table">
                                <thead><tr><th>Version</th><th>File</th><th>Kích thước</th><th>Người upload</th><th>Ngày</th><th>TT</th></tr></thead>
                                <tbody>
                                    {versions.map(v => (
                                        <tr key={v.id}>
                                            <td><span className="badge info">v{v.version}</span></td>
                                            <td>{v.fileUrl ? <a href={v.fileUrl} target="_blank" rel="noopener" style={{ color: 'var(--text-accent)', fontSize: 13 }}>{v.fileName || v.name}</a> : <span style={{ fontSize: 13 }}>{v.fileName || v.name}</span>}</td>
                                            <td style={{ fontSize: 12 }}>{fmtSize(v.fileSize)}</td>
                                            <td style={{ fontSize: 12 }}>{v.uploadedBy || '—'}</td>
                                            <td style={{ fontSize: 12 }}>{fmtDate(v.createdAt)}</td>
                                            <td><span className={`badge ${STATUS_CONFIG[v.status]?.color || 'muted'}`}>{v.status}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {!loading && versions.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>Chỉ có 1 phiên bản</div>}
                </div>
                <div className="modal-footer"><button className="btn btn-ghost" onClick={onClose}>Đóng</button></div>
            </div>
        </div>
    );
}

// ============ GRID CARD ============
function DocCard({ doc, onPreview, onNewVersion, onDelete, onStatusChange, flatFolders, onMoveDoc }) {
    const st = STATUS_CONFIG[doc.status] || STATUS_CONFIG['Nháp'];
    const versionCount = (doc._count?.versions || 0) + 1;
    const thumb = doc.thumbnailUrl || (doc.mimeType?.startsWith('image/') ? doc.fileUrl : '');

    return (
        <div style={{
            borderRadius: 12, overflow: 'hidden', background: 'var(--bg-card)',
            border: '1px solid var(--border-light)', transition: 'all 0.2s',
            cursor: 'pointer', display: 'flex', flexDirection: 'column',
        }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
        >
            {/* Thumbnail */}
            <div
                onClick={() => { if (doc.fileUrl) onPreview(doc); }}
                style={{
                    width: '100%', paddingTop: '56.25%', /* 16:9 */
                    position: 'relative', background: thumb ? `url(${thumb}) center/cover` : 'linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-elevated, #e5e7eb) 100%)',
                }}
            >
                {!thumb && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, opacity: 0.4 }}>
                        {getFileIcon(doc.mimeType, doc.fileName)}
                    </div>
                )}
                {/* Version badge */}
                <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 4 }}>
                    <span className={`badge ${st.color}`} style={{ fontSize: 10, padding: '2px 6px' }}>{st.icon} {doc.status}</span>
                </div>
                <div style={{ position: 'absolute', top: 8, left: 8 }}>
                    <span className="badge info" style={{ fontSize: 10, padding: '2px 6px', cursor: versionCount > 1 ? 'pointer' : 'default' }}>v{doc.version}</span>
                </div>
            </div>

            {/* Info */}
            <div style={{ padding: '10px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={doc.name}>{doc.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {doc.space && <span style={{ background: 'rgba(59,130,246,0.1)', color: 'var(--accent-primary)', padding: '1px 6px', borderRadius: 4, fontSize: 10 }}>{doc.space}</span>}
                    <span>{fmtSize(doc.fileSize)}</span>
                    <span>•</span>
                    <span>{fmtDate(doc.createdAt)}</span>
                </div>
            </div>

            {/* Actions */}
            <div style={{ padding: '6px 12px 10px', display: 'flex', gap: 4, borderTop: '1px solid var(--border-light)' }}>
                {doc.fileUrl && canPreview(doc.mimeType) && <button className="btn btn-ghost btn-sm" style={{ padding: '2px 6px', fontSize: 11 }} onClick={() => onPreview(doc)} title="Xem">👁️</button>}
                {doc.fileUrl && <a href={doc.fileUrl} download className="btn btn-ghost btn-sm" style={{ padding: '2px 6px', fontSize: 11 }} target="_blank" rel="noopener" title="Tải">⬇️</a>}
                <button className="btn btn-ghost btn-sm" style={{ padding: '2px 6px', fontSize: 11 }} onClick={() => onNewVersion(doc)} title="Upload phiên bản mới">📤</button>
                <div style={{ flex: 1 }}></div>
                <button className="btn btn-ghost btn-sm" style={{ padding: '2px 6px', fontSize: 11, color: 'var(--status-danger)' }} onClick={() => onDelete(doc.id)} title="Xóa">🗑️</button>
            </div>
        </div>
    );
}

// ============ MAIN DOCUMENT MANAGER ============
export default function DocumentManager({ projectId, onRefresh }) {
    const [folders, setFolders] = useState([]);
    const [documents, setDocuments] = useState([]);
    const [selectedFolderId, setSelectedFolderId] = useState(null);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [spaceFilter, setSpaceFilter] = useState('');
    const [viewMode, setViewMode] = useState('grid'); // 'list' | 'grid'
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(null);
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [totalDocs, setTotalDocs] = useState(0);

    const fetchFolders = useCallback(async () => {
        try {
            const res = await fetch(`/api/document-folders?projectId=${projectId}`);
            const data = await res.json();
            setFolders(data);
        } catch (err) { console.error('Error fetching folders:', err); }
    }, [projectId]);

    const fetchDocuments = useCallback(async () => {
        try {
            const params = new URLSearchParams({ projectId, limit: '100' });
            if (selectedFolderId && selectedFolderId !== 'unsorted') params.set('folderId', selectedFolderId);
            else if (selectedFolderId === 'unsorted') params.set('folderId', 'unsorted');
            if (search) params.set('search', search);
            if (statusFilter) params.set('status', statusFilter);
            if (spaceFilter) params.set('space', spaceFilter);

            const res = await fetch(`/api/project-documents?${params}`);
            const data = await res.json();
            setDocuments(data.data || []);
            setTotalDocs(data.pagination?.total || 0);
        } catch (err) { console.error('Error fetching documents:', err); }
        setLoading(false);
    }, [projectId, selectedFolderId, search, statusFilter, spaceFilter]);

    useEffect(() => { fetchFolders(); }, [fetchFolders]);
    useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

    const handleCreateFolder = async (name, parentId) => {
        try {
            await fetch('/api/document-folders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, projectId, parentId: parentId === 'root' ? null : parentId }) });
            fetchFolders();
        } catch (err) { console.error(err); }
    };

    const handleInitFolders = async () => {
        try {
            const res = await fetch('/api/document-folders/init', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId }) });
            if (res.ok) fetchFolders();
        } catch (err) { console.error(err); }
    };

    const handleUploadDoc = async (docData, skipRefresh = false) => {
        try {
            if (docData) {
                await fetch('/api/project-documents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...docData, projectId }) });
            }
            if (!skipRefresh) {
                fetchDocuments();
                fetchFolders();
                if (onRefresh) onRefresh();
            }
        } catch (err) { console.error(err); }
    };

    const handleStatusChange = async (docId, newStatus) => {
        try {
            const res = await fetch(`/api/project-documents/${docId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) });
            if (!res.ok) { const err = await res.json(); alert(err.error || 'Lỗi'); return; }
            fetchDocuments();
        } catch (err) { console.error(err); }
    };

    const handleDeleteDoc = async (docId) => {
        if (!confirm('Xóa tài liệu này?')) return;
        try {
            const res = await fetch(`/api/project-documents/${docId}`, { method: 'DELETE' });
            if (!res.ok) { const err = await res.json(); alert(err.error || 'Lỗi'); return; }
            fetchDocuments(); fetchFolders();
            if (onRefresh) onRefresh();
        } catch (err) { console.error(err); }
    };

    const handleMoveDoc = async (docId, newFolderId) => {
        try {
            await fetch(`/api/project-documents/${docId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ folderId: newFolderId || null }) });
            fetchDocuments(); fetchFolders();
        } catch (err) { console.error(err); }
    };

    const flatFolders = [];
    const flatten = (list, depth = 0) => { for (const f of list) { flatFolders.push({ id: f.id, name: f.name, depth }); if (f.children) flatten(f.children, depth + 1); } };
    flatten(folders);

    return (
        <div style={{ display: 'flex', gap: 0, minHeight: 500 }}>
            {/* LEFT: Folder Tree */}
            <div style={{ width: 260, flexShrink: 0, borderRight: '1px solid var(--border-light)', background: 'var(--bg-card)', borderRadius: '12px 0 0 12px', overflow: 'hidden' }}>
                <div style={{ padding: '16px 12px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>Thư mục</span>
                    {folders.length === 0 && <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={handleInitFolders}>Tạo mặc định</button>}
                </div>
                <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 300px)' }}>
                    <FolderTree folders={folders} selectedFolderId={selectedFolderId} onSelect={setSelectedFolderId} onCreateFolder={handleCreateFolder} />
                </div>
            </div>

            {/* RIGHT: Document List */}
            <div style={{ flex: 1, background: 'var(--bg-card)', borderRadius: '0 12px 12px 0', overflow: 'hidden' }}>
                {/* Toolbar */}
                <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-light)', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input className="form-input" style={{ flex: 1, minWidth: 120, padding: '6px 12px', fontSize: 13 }} placeholder="Tìm tài liệu..." value={search} onChange={e => setSearch(e.target.value)} />
                    <select className="form-select" style={{ width: 'auto', padding: '6px 28px 6px 10px', fontSize: 12 }} value={spaceFilter} onChange={e => setSpaceFilter(e.target.value)}>
                        <option value="">🏠 Tất cả KV</option>
                        {SPACES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select className="form-select" style={{ width: 'auto', padding: '6px 28px 6px 10px', fontSize: 12 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                        <option value="">Tất cả TT</option>
                        {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.icon} {k}</option>)}
                    </select>
                    {/* View toggle */}
                    <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                        <button onClick={() => setViewMode('grid')} style={{ padding: '5px 10px', background: viewMode === 'grid' ? 'var(--accent-primary)' : 'transparent', color: viewMode === 'grid' ? '#fff' : 'var(--text-muted)', border: 'none', cursor: 'pointer', fontSize: 14, lineHeight: 1 }} title="Grid View">▦</button>
                        <button onClick={() => setViewMode('list')} style={{ padding: '5px 10px', background: viewMode === 'list' ? 'var(--accent-primary)' : 'transparent', color: viewMode === 'list' ? '#fff' : 'var(--text-muted)', border: 'none', cursor: 'pointer', fontSize: 14, lineHeight: 1 }} title="List View">☰</button>
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={() => setModal('upload')}>+ Upload</button>
                </div>

                {/* Stats bar */}
                <div style={{ padding: '6px 16px', fontSize: 12, color: 'var(--text-muted)', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{totalDocs} tài liệu</span>
                    {selectedFolderId && selectedFolderId !== 'unsorted' && <span>{flatFolders.find(f => f.id === selectedFolderId)?.name || ''}</span>}
                    {selectedFolderId === 'unsorted' && <span>Chưa phân loại</span>}
                </div>

                {/* Content */}
                <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 360px)', padding: viewMode === 'grid' ? 16 : 0 }}>
                    {loading ? (
                        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
                    ) : documents.length === 0 ? (
                        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                            <div style={{ fontSize: 40, marginBottom: 8 }}>📂</div>
                            <div>Chưa có tài liệu</div>
                            <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => setModal('upload')}>Upload tài liệu đầu tiên</button>
                        </div>
                    ) : viewMode === 'grid' ? (
                        /* ======== GRID VIEW ======== */
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
                            {documents.map(doc => (
                                <DocCard
                                    key={doc.id}
                                    doc={doc}
                                    onPreview={(d) => { setSelectedDoc(d); setModal('preview'); }}
                                    onNewVersion={(d) => { setSelectedDoc(d); setModal('newVersion'); }}
                                    onDelete={handleDeleteDoc}
                                    onStatusChange={handleStatusChange}
                                    flatFolders={flatFolders}
                                    onMoveDoc={handleMoveDoc}
                                />
                            ))}
                        </div>
                    ) : (
                        /* ======== LIST VIEW ======== */
                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: 30 }}></th>
                                        <th>Tên</th>
                                        <th style={{ width: 90 }}>Khu vực</th>
                                        <th style={{ width: 100 }}>Thư mục</th>
                                        <th style={{ width: 60 }}>Ver</th>
                                        <th style={{ width: 70 }}>Size</th>
                                        <th style={{ width: 100 }}>Trạng thái</th>
                                        <th style={{ width: 80 }}>Ngày</th>
                                        <th style={{ width: 110 }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {documents.map(doc => {
                                        const st = STATUS_CONFIG[doc.status] || STATUS_CONFIG['Nháp'];
                                        const versionCount = (doc._count?.versions || 0) + 1;
                                        return (
                                            <tr key={doc.id}>
                                                <td style={{ fontSize: 18, textAlign: 'center' }}>{getFileIcon(doc.mimeType, doc.fileName)}</td>
                                                <td>
                                                    <div style={{ fontWeight: 600, fontSize: 13, cursor: doc.fileUrl ? 'pointer' : 'default', color: doc.fileUrl ? 'var(--text-accent)' : 'var(--text-primary)' }} onClick={() => { if (doc.fileUrl) { setSelectedDoc(doc); setModal('preview'); } }}>{doc.name}</div>
                                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{doc.fileName || '—'} {doc.uploadedBy && `• ${doc.uploadedBy}`}</div>
                                                </td>
                                                <td>{doc.space ? <span style={{ fontSize: 11, background: 'rgba(59,130,246,0.1)', color: 'var(--accent-primary)', padding: '1px 6px', borderRadius: 4 }}>{doc.space}</span> : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>}</td>
                                                <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                                    <select className="form-select" style={{ padding: '2px 20px 2px 6px', fontSize: 11, minWidth: 80 }} value={doc.folderId || ''} onChange={e => handleMoveDoc(doc.id, e.target.value || null)}>
                                                        <option value="">—</option>
                                                        {flatFolders.map(f => <option key={f.id} value={f.id}>{'  '.repeat(f.depth)}{f.name}</option>)}
                                                    </select>
                                                </td>
                                                <td>
                                                    <span className="badge info" style={{ cursor: versionCount > 1 ? 'pointer' : 'default' }} onClick={() => { if (versionCount > 1) { setSelectedDoc(doc); setModal('version'); } }}>
                                                        v{doc.version}{versionCount > 1 ? ` (${versionCount})` : ''}
                                                    </span>
                                                </td>
                                                <td style={{ fontSize: 12 }}>{fmtSize(doc.fileSize)}</td>
                                                <td>
                                                    <select className="form-select" style={{ padding: '2px 20px 2px 6px', fontSize: 11, minWidth: 90 }} value={doc.status} onChange={e => handleStatusChange(doc.id, e.target.value)}>
                                                        {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.icon} {k}</option>)}
                                                    </select>
                                                </td>
                                                <td style={{ fontSize: 12 }}>{fmtDate(doc.createdAt)}</td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: 4 }}>
                                                        {doc.fileUrl && canPreview(doc.mimeType) && <button className="btn btn-ghost btn-sm" style={{ padding: '2px 6px', fontSize: 12 }} onClick={() => { setSelectedDoc(doc); setModal('preview'); }} title="Xem">👁️</button>}
                                                        {doc.fileUrl && <a href={doc.fileUrl} download className="btn btn-ghost btn-sm" style={{ padding: '2px 6px', fontSize: 12 }} target="_blank" rel="noopener" title="Tải">⬇️</a>}
                                                        <button className="btn btn-ghost btn-sm" style={{ padding: '2px 6px', fontSize: 12 }} onClick={() => { setSelectedDoc(doc); setModal('newVersion'); }} title="Upload phiên bản mới">📤</button>
                                                        <button className="btn btn-ghost btn-sm" style={{ padding: '2px 6px', fontSize: 12, color: 'var(--status-danger)' }} onClick={() => handleDeleteDoc(doc.id)} title="Xóa">🗑️</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            {modal === 'upload' && (
                <UploadModal onClose={() => setModal(null)} onUpload={handleUploadDoc} folders={folders} preselectedFolderId={selectedFolderId !== 'unsorted' ? selectedFolderId : ''} />
            )}
            {modal === 'newVersion' && selectedDoc && (
                <UploadModal onClose={() => { setModal(null); setSelectedDoc(null); }} onUpload={handleUploadDoc} folders={folders} preselectedFolderId={selectedDoc.folderId || ''} parentDoc={selectedDoc} />
            )}
            {modal === 'preview' && selectedDoc && (
                <PreviewModal doc={selectedDoc} onClose={() => { setModal(null); setSelectedDoc(null); }} />
            )}
            {modal === 'version' && selectedDoc && (
                <VersionModal docId={selectedDoc.id} onClose={() => { setModal(null); setSelectedDoc(null); }} />
            )}
        </div>
    );
}
