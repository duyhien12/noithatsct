'use client';
import { useState, useEffect, useRef } from 'react';
import { CATEGORIES, SEVERITIES, STATUSES } from '@/lib/lessonLearned';

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function LessonForm({ initial, customers, projects, onSubmit, saving, submitLabel = 'Lưu bài học', canEditStatus = true }) {
    const fileInputRef = useRef(null);
    const [uploading, setUploading] = useState(false);
    const [form, setForm] = useState(() => ({
        occurredAt: initial?.occurredAt ? new Date(initial.occurredAt).toISOString().slice(0, 10) : todayStr(),
        projectId: initial?.projectId || '',
        projectName: initial?.projectName || '',
        customerId: initial?.customerId || '',
        customerName: initial?.customerName || '',
        category: initial?.category || 'Khác',
        severity: initial?.severity || 'Trung bình',
        issueContent: initial?.issueContent || '',
        cause: initial?.cause || '',
        solution: initial?.solution || '',
        prevention: initial?.prevention || '',
        notes: initial?.notes || '',
        assignee: initial?.assignee || '',
        status: initial?.status || 'Đang xử lý',
        attachments: initial?.attachments || [],
    }));

    useEffect(() => {
        if (!initial) return;
        setForm(f => ({
            ...f,
            occurredAt: initial.occurredAt ? new Date(initial.occurredAt).toISOString().slice(0, 10) : todayStr(),
            projectId: initial.projectId || '', projectName: initial.projectName || '',
            customerId: initial.customerId || '', customerName: initial.customerName || '',
            category: initial.category || 'Khác', severity: initial.severity || 'Trung bình',
            issueContent: initial.issueContent || '', cause: initial.cause || '',
            solution: initial.solution || '', prevention: initial.prevention || '',
            notes: initial.notes || '', assignee: initial.assignee || '',
            status: initial.status || 'Đang xử lý', attachments: initial.attachments || [],
        }));
    }, [initial]);

    const selectProject = (projectId) => {
        const p = projects.find(x => x.id === projectId);
        setForm(f => ({ ...f, projectId, projectName: p?.name || f.projectName }));
    };

    const selectCustomer = (customerId) => {
        const c = customers.find(x => x.id === customerId);
        setForm(f => ({ ...f, customerId, customerName: c?.name || f.customerName }));
    };

    const handleFileSelect = async (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;
        setUploading(true);
        for (const file of files) {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('type', 'documents');
            try {
                const res = await fetch('/api/upload', { method: 'POST', body: formData });
                if (res.ok) {
                    const result = await res.json();
                    setForm(f => ({ ...f, attachments: [...f.attachments, { url: result.url, name: file.name, type: file.type }] }));
                }
            } catch { /* ignore single file failure */ }
        }
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeAttachment = (idx) => setForm(f => ({ ...f, attachments: f.attachments.filter((_, i) => i !== idx) }));

    const filteredProjects = form.customerId ? projects.filter(p => p.customerId === form.customerId) : projects;

    const validate = () => {
        if (!form.occurredAt) return 'Chọn ngày phát sinh!';
        if (!form.issueContent.trim()) return 'Nhập nội dung sự việc!';
        return null;
    };

    const submit = () => {
        const err = validate();
        if (err) return onSubmit(null, err);
        onSubmit(form);
    };

    return (
        <div>
            <div className="card" style={{ marginBottom: 20 }}>
                <div className="card-header"><h3>Thông tin dự án / sự việc</h3></div>
                <div className="card-body">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 16 }}>
                        <div>
                            <label className="form-label">Ngày phát sinh *</label>
                            <input className="form-input" type="date" value={form.occurredAt} onChange={e => setForm({ ...form, occurredAt: e.target.value })} />
                        </div>
                        <div>
                            <label className="form-label">Khách hàng</label>
                            <select className="form-select" value={form.customerId} onChange={e => selectCustomer(e.target.value)}>
                                <option value="">-- Chọn khách hàng (nếu có) --</option>
                                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="form-label">Tên dự án</label>
                            <select className="form-select" value={form.projectId} onChange={e => selectProject(e.target.value)}>
                                <option value="">-- Chọn dự án (nếu có) --</option>
                                {filteredProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                            <input className="form-input" style={{ marginTop: 6 }} placeholder="Hoặc nhập tên dự án tự do"
                                value={form.projectName} onChange={e => setForm({ ...form, projectName: e.target.value })} />
                        </div>
                        <div>
                            <label className="form-label">Hạng mục</label>
                            <select className="form-select" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="form-label">Mức độ</label>
                            <select className="form-select" value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value })}>
                                {SEVERITIES.map(s => <option key={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="form-label">Người phụ trách</label>
                            <input className="form-input" value={form.assignee} onChange={e => setForm({ ...form, assignee: e.target.value })} placeholder="Tên người phụ trách xử lý" />
                        </div>
                        {canEditStatus && (
                            <div>
                                <label className="form-label">Trạng thái</label>
                                <select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                                    {STATUSES.map(s => <option key={s}>{s}</option>)}
                                </select>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="card" style={{ marginBottom: 20 }}>
                <div className="card-header"><h3>Nội dung sự việc & xử lý</h3></div>
                <div className="card-body" style={{ display: 'grid', gap: 16 }}>
                    <div>
                        <label className="form-label">Nội dung sự việc *</label>
                        <textarea className="form-input" rows={3} value={form.issueContent} onChange={e => setForm({ ...form, issueContent: e.target.value })} placeholder="Mô tả chi tiết lỗi/sự cố đã xảy ra..." />
                    </div>
                    <div>
                        <label className="form-label">Nguyên nhân</label>
                        <textarea className="form-input" rows={3} value={form.cause} onChange={e => setForm({ ...form, cause: e.target.value })} placeholder="Vì sao xảy ra sự việc này?" />
                    </div>
                    <div>
                        <label className="form-label">Giải pháp xử lý</label>
                        <textarea className="form-input" rows={3} value={form.solution} onChange={e => setForm({ ...form, solution: e.target.value })} placeholder="Đã/sẽ xử lý như thế nào?" />
                    </div>
                    <div>
                        <label className="form-label">Biện pháp phòng ngừa tái diễn</label>
                        <textarea className="form-input" rows={3} value={form.prevention} onChange={e => setForm({ ...form, prevention: e.target.value })} placeholder="Làm gì để không lặp lại sai sót này?" />
                    </div>
                    <div>
                        <label className="form-label">Ghi chú</label>
                        <textarea className="form-input" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                    </div>
                </div>
            </div>

            <div className="card" style={{ marginBottom: 20 }}>
                <div className="card-header"><h3>File đính kèm</h3></div>
                <div className="card-body">
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                        {form.attachments.map((att, i) => (
                            <div key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-hover)', fontSize: 12 }}>
                                <span>{att.name}</span>
                                <button type="button" onClick={() => removeAttachment(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--status-danger)' }}>✕</button>
                            </div>
                        ))}
                    </div>
                    <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" onChange={handleFileSelect} disabled={uploading} />
                    {uploading && <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>Đang tải lên...</span>}
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>Hỗ trợ: Ảnh, PDF, Excel, Word</div>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-primary" disabled={saving || uploading} onClick={submit}>
                    {saving ? '⏳ Đang lưu...' : `💾 ${submitLabel}`}
                </button>
            </div>
        </div>
    );
}
