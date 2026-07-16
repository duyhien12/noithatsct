'use client';
import { useState } from 'react';
import { Plus, CheckCircle2, XCircle } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { QC_CHECKLIST_FIELDS, SEVERITY_LABELS, QUALITY_ISSUE_STATUS_LABELS } from '@/lib/manufacturing/constants';

const ISSUE_NEXT_ACTION = {
    OPEN: { to: 'IN_REPAIR', label: 'Bắt đầu sửa' },
    ASSIGNED: { to: 'IN_REPAIR', label: 'Bắt đầu sửa' },
    IN_REPAIR: { to: 'WAITING_VERIFICATION', label: 'Gửi xác minh' },
    WAITING_VERIFICATION: { to: 'RESOLVED', label: 'QC xác minh & đóng' },
};

export default function OrderQualityTab({ order, perms, onChanged }) {
    const toast = useToast();
    const [showQc, setShowQc] = useState(false);
    const [showIssue, setShowIssue] = useState(false);
    const [saving, setSaving] = useState(false);
    const [qcForm, setQcForm] = useState({ mfgItemId: '', inspectionType: 'IN_PROCESS', overallNote: '', ...Object.fromEntries(QC_CHECKLIST_FIELDS.map(f => [f.key, true])) });
    const [issueForm, setIssueForm] = useState({ mfgItemId: '', title: '', description: '', severity: 'NORMAL', dueDate: '', photos: [] });
    const [uploading, setUploading] = useState(false);

    async function handleCreateQc() {
        setSaving(true);
        try {
            const res = await fetch('/api/manufacturing/quality/inspections', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...qcForm, mfgOrderId: order.id, mfgItemId: qcForm.mfgItemId || undefined }),
            });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error || 'Lỗi tạo phiếu QC');
            toast.success(d.result === 'PASSED' ? 'QC đạt ✓' : 'QC không đạt — vui lòng báo lỗi cho sản phẩm');
            setShowQc(false);
            if (d.requiresIssue) { setIssueForm(f => ({ ...f, mfgItemId: qcForm.mfgItemId })); setShowIssue(true); }
            onChanged();
        } catch (e) { toast.error(e.message); } finally { setSaving(false); }
    }

    async function handleUploadPhoto(file) {
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('type', 'proofs');
            const res = await fetch('/api/upload', { method: 'POST', body: fd });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error || 'Lỗi tải ảnh');
            setIssueForm(f => ({ ...f, photos: [...f.photos, d.url] }));
        } catch (e) { toast.error(e.message); } finally { setUploading(false); }
    }

    async function handleCreateIssue() {
        if (!issueForm.title.trim() || !issueForm.description.trim()) { toast.error('Nhập tiêu đề và mô tả lỗi'); return; }
        if (['MAJOR', 'CRITICAL'].includes(issueForm.severity) && issueForm.photos.length === 0) { toast.error('Lỗi MAJOR/CRITICAL bắt buộc có ảnh'); return; }
        setSaving(true);
        try {
            const res = await fetch('/api/manufacturing/quality/issues', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...issueForm, mfgOrderId: order.id, mfgItemId: issueForm.mfgItemId || undefined }),
            });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error || 'Lỗi báo lỗi');
            toast.success(`Đã tạo phiếu lỗi ${d.code}`);
            setShowIssue(false);
            setIssueForm({ mfgItemId: '', title: '', description: '', severity: 'NORMAL', dueDate: '', photos: [] });
            onChanged();
        } catch (e) { toast.error(e.message); } finally { setSaving(false); }
    }

    async function advanceIssue(id, toStatus) {
        const res = await fetch(`/api/manufacturing/quality/issues/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: toStatus }) });
        const d = await res.json();
        if (!res.ok) { toast.error(d.error || 'Lỗi cập nhật'); return; }
        toast.success('Đã cập nhật lỗi');
        onChanged();
    }

    const inspections = order.qualityInspections || [];
    const issues = order.qualityIssues || [];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="card-header" style={{ padding: '14px 18px' }}>
                    <span className="card-title">Phiếu QC ({inspections.length})</span>
                    {perms.qc && <button className="btn btn-primary btn-sm" onClick={() => setShowQc(true)}><Plus size={14} /> Tạo phiếu QC</button>}
                </div>
                {inspections.length === 0 ? <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có phiếu QC nào.</div> : (
                    <div className="table-container">
                        <table className="data-table">
                            <thead><tr><th>Mã</th><th>Sản phẩm</th><th>Loại</th><th>Kết quả</th><th>Ngày</th></tr></thead>
                            <tbody>
                                {inspections.map(i => (
                                    <tr key={i.id}>
                                        <td style={{ fontWeight: 600 }}>{i.code}</td>
                                        <td>{i.item?.code || '—'}</td>
                                        <td>{i.inspectionType}</td>
                                        <td>{i.result === 'PASSED' ? <span style={{ color: '#16a34a', display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle2 size={14} /> Đạt</span> : <span style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: 4 }}><XCircle size={14} /> Không đạt</span>}</td>
                                        <td>{new Date(i.inspectedAt).toLocaleDateString('vi-VN')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="card-header" style={{ padding: '14px 18px' }}>
                    <span className="card-title">Lỗi & sửa lỗi ({issues.length})</span>
                    <button className="btn btn-secondary btn-sm" onClick={() => setShowIssue(true)}><Plus size={14} /> Báo lỗi</button>
                </div>
                {issues.length === 0 ? <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có lỗi nào được ghi nhận.</div> : (
                    <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {issues.map(i => {
                            const next = ISSUE_NEXT_ACTION[i.status];
                            const canAct = next && (next.to === 'RESOLVED' ? (perms.qc || perms.resolve_issue) : perms.resolve_issue);
                            return (
                                <div key={i.id} style={{ padding: 10, borderRadius: 8, border: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 600 }}>
                                            <span className={`badge ${i.severity === 'CRITICAL' ? 'danger' : i.severity === 'MAJOR' ? 'warning' : ''}`}>{SEVERITY_LABELS[i.severity]}</span> {i.title}
                                        </div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{i.code} · {QUALITY_ISSUE_STATUS_LABELS[i.status]} {i.item?.code ? `· ${i.item.code}` : ''}</div>
                                    </div>
                                    {next && canAct && <button className="btn btn-primary btn-sm" onClick={() => advanceIssue(i.id, next.to)}>{next.label}</button>}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <Modal isOpen={showQc} onClose={() => setShowQc(false)} title="Tạo phiếu kiểm tra chất lượng (QC)">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div className="form-group">
                        <label className="form-label">Sản phẩm</label>
                        <select className="form-input" value={qcForm.mfgItemId} onChange={e => setQcForm(f => ({ ...f, mfgItemId: e.target.value }))}>
                            <option value="">-- Chọn sản phẩm --</option>
                            {(order.items || []).map(it => <option key={it.id} value={it.id}>{it.code} — {it.name}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Loại kiểm tra</label>
                        <select className="form-input" value={qcForm.inspectionType} onChange={e => setQcForm(f => ({ ...f, inspectionType: e.target.value }))}>
                            <option value="IN_PROCESS">Trong quá trình</option>
                            <option value="FINAL_FACTORY">Cuối xưởng</option>
                            <option value="BEFORE_DELIVERY">Trước khi giao</option>
                            <option value="AFTER_INSTALLATION">Sau lắp đặt</option>
                        </select>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        {QC_CHECKLIST_FIELDS.map(f => (
                            <label key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                                <input type="checkbox" checked={qcForm[f.key]} onChange={e => setQcForm(prev => ({ ...prev, [f.key]: e.target.checked }))} />
                                {f.label}
                            </label>
                        ))}
                    </div>
                    <div className="form-group"><label className="form-label">Ghi chú</label><textarea className="form-input" rows={2} value={qcForm.overallNote} onChange={e => setQcForm(f => ({ ...f, overallNote: e.target.value }))} /></div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        <button className="btn btn-secondary" onClick={() => setShowQc(false)}>Hủy</button>
                        <button className="btn btn-primary" onClick={handleCreateQc} disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu phiếu QC'}</button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={showIssue} onClose={() => setShowIssue(false)} title="Báo lỗi">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div className="form-group">
                        <label className="form-label">Sản phẩm</label>
                        <select className="form-input" value={issueForm.mfgItemId} onChange={e => setIssueForm(f => ({ ...f, mfgItemId: e.target.value }))}>
                            <option value="">-- Chọn sản phẩm --</option>
                            {(order.items || []).map(it => <option key={it.id} value={it.id}>{it.code} — {it.name}</option>)}
                        </select>
                    </div>
                    <div className="form-group"><label className="form-label">Tiêu đề lỗi *</label><input className="form-input" value={issueForm.title} onChange={e => setIssueForm(f => ({ ...f, title: e.target.value }))} /></div>
                    <div className="form-group"><label className="form-label">Mô tả *</label><textarea className="form-input" rows={2} value={issueForm.description} onChange={e => setIssueForm(f => ({ ...f, description: e.target.value }))} /></div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div className="form-group">
                            <label className="form-label">Mức độ *</label>
                            <select className="form-input" value={issueForm.severity} onChange={e => setIssueForm(f => ({ ...f, severity: e.target.value }))}>
                                {Object.entries(SEVERITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                        </div>
                        <div className="form-group"><label className="form-label">Hạn xử lý</label><input type="date" className="form-input" value={issueForm.dueDate} onChange={e => setIssueForm(f => ({ ...f, dueDate: e.target.value }))} /></div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Ảnh lỗi {['MAJOR', 'CRITICAL'].includes(issueForm.severity) && '*'}</label>
                        <input type="file" accept="image/*" onChange={e => e.target.files[0] && handleUploadPhoto(e.target.files[0])} disabled={uploading} />
                        <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                            {issueForm.photos.map((p, i) => <img key={i} src={p} alt="" style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 6 }} />)}
                        </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        <button className="btn btn-secondary" onClick={() => setShowIssue(false)}>Hủy</button>
                        <button className="btn btn-primary" onClick={handleCreateIssue} disabled={saving}>{saving ? 'Đang lưu...' : 'Báo lỗi'}</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
