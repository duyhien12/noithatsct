'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useRole } from '@/contexts/RoleContext';
import { apiFetch } from '@/lib/fetchClient';
import { useToast } from '@/components/ui/Toast';
import ItemsTable from '@/components/design-orders/ItemsTable';
import { calcAll } from '@/lib/designOrderCalc';
import { canEditDraft } from '@/lib/designOrderStatus';

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Math.round(n || 0));
const toDateInput = (d) => d ? new Date(d).toISOString().slice(0, 10) : '';

const PROJECT_TYPES = ['Nhà phố', 'Biệt thự', 'Chung cư', 'Văn phòng', 'Showroom', 'Homestay', 'Khác'];
const REQUIREMENT_LEVELS = ['Cơ bản', 'Tiêu chuẩn', 'Cao cấp'];
const VAT_OPTIONS = [0, 8, 10];

export default function EditDesignOrderPage() {
    const router = useRouter();
    const { id } = useParams();
    const { role } = useRole();
    const toast = useToast();
    const fileInputRef = useRef(null);

    const [loading, setLoading] = useState(true);
    const [customers, setCustomers] = useState([]);
    const [projects, setProjects] = useState([]);
    const [priceList, setPriceList] = useState([]);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState('');

    const [form, setForm] = useState(null);
    const [items, setItems] = useState([]);
    const [attachments, setAttachments] = useState([]);

    useEffect(() => {
        fetch('/api/customers?limit=1000').then(r => r.json()).then(d => setCustomers(d.data || []));
        fetch('/api/projects?limit=1000').then(r => r.json()).then(d => setProjects(d.data || []));
        apiFetch('/api/design-orders/price-list').then(setPriceList).catch(() => {});
        apiFetch(`/api/design-orders/${id}`).then(o => {
            setStatus(o.status);
            setForm({
                customerId: o.customerId, projectId: o.projectId || '',
                customerName: o.customerName, customerPhone: o.customerPhone, siteAddress: o.siteAddress,
                projectType: o.projectType, designArea: o.designArea, designStyle: o.designStyle,
                requirementLevel: o.requirementLevel, deadline: toDateInput(o.deadline), notes: o.notes,
                discount: o.discount, discountType: o.discountType, vatRate: o.vatRate,
            });
            setItems((o.items || []).map(it => ({ name: it.name, unit: it.unit, quantity: it.quantity, unitPrice: it.unitPrice, note: it.note })));
            setAttachments(o.attachments || []);
            setLoading(false);
        }).catch(e => { toast.error(e.message); setLoading(false); });
    }, [id]);

    const filteredProjects = form?.customerId ? projects.filter(p => p.customerId === form.customerId) : projects;

    const selectCustomer = (customerId) => {
        const c = customers.find(x => x.id === customerId);
        setForm(f => ({ ...f, customerId, projectId: '', customerName: c?.name || f.customerName, customerPhone: c?.phone || f.customerPhone }));
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
                    setAttachments(prev => [...prev, { url: result.url, name: file.name, type: file.type }]);
                }
            } catch { /* ignore single file failure */ }
        }
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeAttachment = (idx) => setAttachments(prev => prev.filter((_, i) => i !== idx));

    const totals = useMemo(() => form ? calcAll(items, form.discount, form.discountType, form.vatRate) : { subtotal: 0, totalAfterDiscount: 0, grandTotal: 0 }, [items, form]);

    if (loading || !form) return <div style={{ padding: 40, textAlign: 'center' }}>Đang tải...</div>;

    if (!canEditDraft(role, status)) {
        return (
            <div className="card" style={{ padding: 40, textAlign: 'center' }}>
                <p>Phiếu này đang ở trạng thái &quot;{status}&quot; — không thể chỉnh sửa.</p>
                <button className="btn btn-ghost" onClick={() => router.push(`/design-orders/${id}`)}>← Về trang chi tiết</button>
            </div>
        );
    }

    const handleSave = async () => {
        if (!form.customerId) return toast.error('Chọn khách hàng!');
        if (!form.siteAddress.trim()) return toast.error('Nhập địa chỉ công trình!');
        if (!form.deadline) return toast.error('Chọn deadline mong muốn!');
        if (items.length === 0) return toast.error('Thêm ít nhất 1 hạng mục!');

        setSaving(true);
        try {
            await apiFetch(`/api/design-orders/${id}`, {
                method: 'PUT',
                body: JSON.stringify({ ...form, items, attachments }),
            });
            toast.success('Đã lưu thay đổi');
            router.push(`/design-orders/${id}`);
        } catch (e) {
            toast.error(e.message);
        }
        setSaving(false);
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ margin: 0 }}>✏️ Sửa phiếu đặt hàng thiết kế nội thất</h2>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-ghost" onClick={() => router.back()}>← Quay lại</button>
                    <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? '⏳ Đang lưu...' : '💾 Lưu thay đổi'}</button>
                </div>
            </div>

            <div className="card" style={{ marginBottom: 20 }}>
                <div className="card-header"><h3>Thông tin khách hàng / công trình</h3></div>
                <div className="card-body">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
                        <div>
                            <label className="form-label">Khách hàng *</label>
                            <select className="form-select" value={form.customerId} onChange={e => selectCustomer(e.target.value)}>
                                <option value="">-- Chọn khách hàng --</option>
                                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="form-label">Số điện thoại khách hàng</label>
                            <input className="form-input" value={form.customerPhone} onChange={e => setForm({ ...form, customerPhone: e.target.value })} />
                        </div>
                        <div>
                            <label className="form-label">Dự án liên kết (nếu có)</label>
                            <select className="form-select" value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })}>
                                <option value="">-- Không liên kết dự án --</option>
                                {filteredProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="form-label">Địa chỉ công trình *</label>
                            <input className="form-input" value={form.siteAddress} onChange={e => setForm({ ...form, siteAddress: e.target.value })} />
                        </div>
                        <div>
                            <label className="form-label">Loại công trình</label>
                            <select className="form-select" value={form.projectType} onChange={e => setForm({ ...form, projectType: e.target.value })}>
                                {PROJECT_TYPES.map(t => <option key={t}>{t}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="form-label">Diện tích thiết kế (m²)</label>
                            <input className="form-input" type="number" min="0" value={form.designArea || ''} onChange={e => setForm({ ...form, designArea: parseFloat(e.target.value) || 0 })} />
                        </div>
                        <div>
                            <label className="form-label">Phong cách thiết kế</label>
                            <input className="form-input" value={form.designStyle} onChange={e => setForm({ ...form, designStyle: e.target.value })} />
                        </div>
                        <div>
                            <label className="form-label">Mức độ yêu cầu</label>
                            <select className="form-select" value={form.requirementLevel} onChange={e => setForm({ ...form, requirementLevel: e.target.value })}>
                                {REQUIREMENT_LEVELS.map(l => <option key={l}>{l}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="form-label">Deadline mong muốn *</label>
                            <input className="form-input" type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} />
                        </div>
                    </div>
                    <div style={{ marginTop: 16 }}>
                        <label className="form-label">Ghi chú yêu cầu từ Phòng Kinh doanh</label>
                        <textarea className="form-input" rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                    </div>
                    <div style={{ marginTop: 16 }}>
                        <label className="form-label">File đính kèm</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                            {attachments.map((att, i) => (
                                <div key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-hover)', fontSize: 12 }}>
                                    <span>{att.name}</span>
                                    <button type="button" onClick={() => removeAttachment(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--status-danger)' }}>✕</button>
                                </div>
                            ))}
                        </div>
                        <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" onChange={handleFileSelect} disabled={uploading} />
                        {uploading && <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>Đang tải lên...</span>}
                    </div>
                </div>
            </div>

            <div className="card" style={{ marginBottom: 20 }}>
                <div className="card-header"><h3>Bảng hạng mục tính tiền</h3></div>
                <ItemsTable items={items} onChange={setItems} priceList={priceList} />
            </div>

            <div className="card">
                <div className="card-header"><h3>Giảm giá & VAT</h3></div>
                <div className="card-body">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 16 }}>
                        <div>
                            <label className="form-label">Giảm giá</label>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <input className="form-input" type="number" min="0" value={form.discount || ''} onChange={e => setForm({ ...form, discount: parseFloat(e.target.value) || 0 })} style={{ flex: 1 }} />
                                <select className="form-select" value={form.discountType} onChange={e => setForm({ ...form, discountType: e.target.value })} style={{ maxWidth: 100 }}>
                                    <option value="amount">VNĐ</option>
                                    <option value="percent">%</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="form-label">VAT</label>
                            <select className="form-select" value={form.vatRate} onChange={e => setForm({ ...form, vatRate: parseFloat(e.target.value) })}>
                                {VAT_OPTIONS.map(v => <option key={v} value={v}>{v}%</option>)}
                            </select>
                        </div>
                    </div>
                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 16, display: 'grid', gap: 8, maxWidth: 360, marginLeft: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Tổng trước giảm giá</span><strong>{fmt(totals.subtotal)}</strong></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Tổng sau giảm giá</span><strong>{fmt(totals.totalAfterDiscount)}</strong></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, color: 'var(--primary)' }}><span>Tổng thanh toán</span><strong>{fmt(totals.grandTotal)}</strong></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
