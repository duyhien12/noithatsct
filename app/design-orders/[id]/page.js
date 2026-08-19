'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useRole } from '@/contexts/RoleContext';
import { apiFetch } from '@/lib/fetchClient';
import { useToast } from '@/components/ui/Toast';
import StatusBadge from '@/components/ui/StatusBadge';
import { STATUSES, STATUS_COLORS, ALLOWED_TRANSITIONS, canTransition, canAssignDesigner, canEditDraft } from '@/lib/designOrderStatus';

const BRAND = { blue: '#1e3a5f', gold: '#E05B0A' };

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Math.round(n || 0));
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';

function numberToWords(n) {
    if (!n || n === 0) return 'Không đồng';
    const u = ['', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
    function readGroup(num, leadZero) {
        const h = Math.floor(num / 100), t = Math.floor((num % 100) / 10), o = num % 10;
        let s = '';
        if (h) s += u[h] + ' trăm ';
        if (t === 0) { if (o) s += (h || leadZero ? 'lẻ ' : '') + u[o] + ' '; }
        else if (t === 1) { s += 'mười ' + (o === 5 ? 'lăm ' : o ? u[o] + ' ' : ''); }
        else { s += u[t] + ' mươi ' + (o === 1 ? 'mốt ' : o === 5 ? 'lăm ' : o ? u[o] + ' ' : ''); }
        return s;
    }
    const ty = Math.floor(n / 1e9), tr = Math.floor((n % 1e9) / 1e6), ng = Math.floor((n % 1e6) / 1e3), rem = n % 1e3;
    let r = '';
    if (ty) r += readGroup(ty, false) + 'tỷ ';
    if (tr) r += readGroup(tr, !!ty) + 'triệu ';
    if (ng) r += readGroup(ng, !!(ty || tr)) + 'nghìn ';
    if (rem) r += readGroup(rem, !!(ty || tr || ng));
    r = r.trim();
    return r.charAt(0).toUpperCase() + r.slice(1) + ' đồng';
}

export default function DesignOrderDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { role } = useRole();
    const toast = useToast();

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [assignForm, setAssignForm] = useState({ designerAssignee: '', confirmedDeadline: '' });

    const load = useCallback(() => {
        apiFetch(`/api/design-orders/${id}`).then(o => {
            setOrder(o);
            setAssignForm({
                designerAssignee: o.designerAssignee || '',
                confirmedDeadline: o.confirmedDeadline ? new Date(o.confirmedDeadline).toISOString().slice(0, 10) : '',
            });
        }).catch(e => toast.error(e.message)).finally(() => setLoading(false));
    }, [id, toast]);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        if (order && searchParams.get('print') === '1') {
            setTimeout(() => window.print(), 300);
        }
    }, [order, searchParams]);

    const changeStatus = async (status) => {
        setBusy(true);
        try {
            await apiFetch(`/api/design-orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
            toast.success(`Đã chuyển sang "${status}"`);
            load();
        } catch (e) {
            toast.error(e.message);
        }
        setBusy(false);
    };

    const saveAssignment = async () => {
        setBusy(true);
        try {
            await apiFetch(`/api/design-orders/${id}/assign`, {
                method: 'PATCH',
                body: JSON.stringify(assignForm),
            });
            toast.success('Đã cập nhật phân công');
            load();
        } catch (e) {
            toast.error(e.message);
        }
        setBusy(false);
    };

    if (loading) return <div style={{ padding: 60, textAlign: 'center' }}>Đang tải...</div>;
    if (!order) return <div style={{ padding: 60, textAlign: 'center', color: 'var(--status-danger)' }}>Không tìm thấy phiếu</div>;

    const nextStatuses = ALLOWED_TRANSITIONS[order.status] || [];
    const allowedNextStatuses = nextStatuses.filter(s => canTransition(role, order.status, s));

    return (
        <>
            <style>{`
                @media print {
                    .no-print { display: none !important; }
                    .header { display: none !important; }
                    .sidebar { display: none !important; }
                    body { background: white !important; }
                    .do-page { box-shadow: none !important; margin: 0 !important; max-width: 100% !important; }
                }
                @page { size: A4; margin: 14mm; }
                .do-page {
                    max-width: 820px; margin: 20px auto 60px; background: #fff;
                    box-shadow: 0 4px 30px rgba(0,0,0,0.1); border-radius: 6px;
                    padding: 40px 44px; color: #1e293b; font-size: 13px; line-height: 1.5;
                }
                .do-h-row { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid ${BRAND.gold}; padding-bottom: 16px; margin-bottom: 20px; }
                .do-co-name { font-size: 16px; font-weight: 800; color: ${BRAND.blue}; }
                .do-co-info { font-size: 11px; color: #64748b; margin-top: 4px; }
                .do-code { text-align: right; font-size: 12px; color: #64748b; }
                .do-code .code { font-weight: 700; color: ${BRAND.blue}; }
                .do-title { text-align: center; font-size: 20px; font-weight: 800; color: ${BRAND.blue}; margin: 10px 0 24px; letter-spacing: 0.5px; }
                .do-section-title { font-size: 13px; font-weight: 700; color: ${BRAND.blue}; text-transform: uppercase; margin: 22px 0 10px; border-left: 4px solid ${BRAND.gold}; padding-left: 8px; }
                .do-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; }
                .do-info-grid .label { color: #64748b; }
                .do-table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
                .do-table th, .do-table td { border: 1px solid #d1d5db; padding: 6px 8px; }
                .do-table th { background: #f1f5f9; font-weight: 700; text-align: center; }
                .do-total-row { display: flex; justify-content: space-between; padding: 4px 0; }
                .do-sign-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 40px; text-align: center; }
                .do-sign-grid .role { font-weight: 700; margin-bottom: 60px; }
                .do-sign-grid .name { font-style: italic; color: #64748b; font-size: 11px; }
            `}</style>

            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: 820, margin: '20px auto 0' }}>
                <button className="btn btn-ghost" onClick={() => router.push('/design-orders')}>← Danh sách</button>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <StatusBadge status={order.status} colorMap={STATUS_COLORS} />
                    {canEditDraft(role, order.status) && (
                        <button className="btn btn-ghost" onClick={() => router.push(`/design-orders/${id}/edit`)}>✏️ Sửa</button>
                    )}
                    <button className="btn btn-primary" onClick={() => window.print()}>🖨️ In phiếu</button>
                </div>
            </div>

            {/* Action bar — đổi trạng thái & phân công */}
            <div className="no-print card" style={{ maxWidth: 820, margin: '16px auto' }}>
                <div className="card-body" style={{ display: 'grid', gap: 16 }}>
                    {allowedNextStatuses.length > 0 && (
                        <div>
                            <div className="form-label">Chuyển trạng thái</div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {allowedNextStatuses.map(s => (
                                    <button key={s} className="btn btn-secondary" disabled={busy} onClick={() => changeStatus(s)}>{s}</button>
                                ))}
                            </div>
                        </div>
                    )}
                    {canAssignDesigner(role) && (
                        <div>
                            <div className="form-label">Phân công nhân sự thiết kế & xác nhận deadline</div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                                <div>
                                    <label className="form-label" style={{ fontSize: 11 }}>NV thiết kế phụ trách</label>
                                    <input className="form-input" value={assignForm.designerAssignee}
                                        onChange={e => setAssignForm(f => ({ ...f, designerAssignee: e.target.value }))}
                                        placeholder="Tên nhân viên thiết kế" style={{ minWidth: 200 }} />
                                </div>
                                <div>
                                    <label className="form-label" style={{ fontSize: 11 }}>Deadline xác nhận</label>
                                    <input className="form-input" type="date" value={assignForm.confirmedDeadline}
                                        onChange={e => setAssignForm(f => ({ ...f, confirmedDeadline: e.target.value }))} />
                                </div>
                                <button className="btn btn-primary" disabled={busy} onClick={saveAssignment}>Lưu phân công</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Phiếu in A4 */}
            <div className="do-page">
                <div className="do-h-row">
                    <div>
                        <div className="do-co-name">CÔNG TY TNHH KIẾN TRÚC ĐÔ THỊ SCT</div>
                        <div className="do-co-info">📍 149 Nguyễn Tất Thành &nbsp;|&nbsp; 📞 0914 998 822 &nbsp;|&nbsp; kientrucsct.com</div>
                    </div>
                    <div className="do-code">
                        <div>Số phiếu: <span className="code">{order.code}</span></div>
                        <div>Ngày lập: {fmtDate(order.createdAt)}</div>
                    </div>
                </div>

                <div className="do-title">PHIẾU ĐẶT HÀNG THIẾT KẾ NỘI THẤT</div>

                <div className="do-section-title">Thông tin khách hàng / công trình</div>
                <div className="do-info-grid">
                    <div><span className="label">Khách hàng: </span><strong>{order.customerName || order.customer?.name}</strong></div>
                    <div><span className="label">Số điện thoại: </span><strong>{order.customerPhone || order.customer?.phone}</strong></div>
                    <div style={{ gridColumn: '1 / -1' }}><span className="label">Địa chỉ công trình: </span><strong>{order.siteAddress}</strong></div>
                    <div><span className="label">Loại công trình: </span>{order.projectType}</div>
                    <div><span className="label">Diện tích thiết kế: </span>{order.designArea} m²</div>
                    <div><span className="label">Phong cách thiết kế: </span>{order.designStyle || '—'}</div>
                    <div><span className="label">Mức độ yêu cầu: </span>{order.requirementLevel}</div>
                    <div><span className="label">Deadline mong muốn: </span><strong>{fmtDate(order.deadline)}</strong></div>
                    {order.confirmedDeadline && <div><span className="label">Deadline xác nhận: </span><strong>{fmtDate(order.confirmedDeadline)}</strong></div>}
                    {order.designerAssignee && <div><span className="label">NV thiết kế phụ trách: </span><strong>{order.designerAssignee}</strong></div>}
                </div>

                {order.notes && (<>
                    <div className="do-section-title">Ghi chú yêu cầu từ Phòng Kinh doanh</div>
                    <div>{order.notes}</div>
                </>)}

                <div className="do-section-title">Bảng hạng mục tính tiền</div>
                <table className="do-table">
                    <thead>
                        <tr><th style={{ width: 30 }}>STT</th><th>Hạng mục công việc</th><th style={{ width: 60 }}>ĐVT</th><th style={{ width: 70 }}>KL</th><th style={{ width: 100 }}>Đơn giá</th><th style={{ width: 110 }}>Thành tiền</th><th>Ghi chú</th></tr>
                    </thead>
                    <tbody>
                        {order.items.map((it, i) => (
                            <tr key={it.id}>
                                <td style={{ textAlign: 'center' }}>{i + 1}</td>
                                <td>{it.name}</td>
                                <td style={{ textAlign: 'center' }}>{it.unit}</td>
                                <td style={{ textAlign: 'right' }}>{it.quantity}</td>
                                <td style={{ textAlign: 'right' }}>{fmt(it.unitPrice)}</td>
                                <td style={{ textAlign: 'right' }}>{fmt(it.amount)}</td>
                                <td>{it.note}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div style={{ maxWidth: 320, marginLeft: 'auto', marginTop: 16 }}>
                    <div className="do-total-row"><span>Tổng trước giảm giá</span><strong>{fmt(order.subtotal)}</strong></div>
                    <div className="do-total-row"><span>Giảm giá</span><span>{order.discountType === 'percent' ? `${order.discount}%` : fmt(order.discount)}</span></div>
                    <div className="do-total-row"><span>Tổng sau giảm giá</span><strong>{fmt(order.totalAfterDiscount)}</strong></div>
                    <div className="do-total-row"><span>VAT</span><span>{order.vatRate}%</span></div>
                    <div className="do-total-row" style={{ fontSize: 15, borderTop: '1px solid #d1d5db', paddingTop: 6, marginTop: 4 }}><span>Tổng thanh toán</span><strong style={{ color: BRAND.blue }}>{fmt(order.grandTotal)}</strong></div>
                    <div style={{ fontStyle: 'italic', fontSize: 11.5, color: '#64748b', marginTop: 4 }}>({numberToWords(Math.round(order.grandTotal))})</div>
                </div>

                <div className="do-sign-grid">
                    <div>
                        <div className="role">Người lập phiếu</div>
                        <div className="name">{order.createdBy || ' '}</div>
                    </div>
                    <div>
                        <div className="role">Trưởng phòng Kinh doanh xác nhận</div>
                        <div className="name">{order.salesApprovedBy || ' '}</div>
                    </div>
                    <div>
                        <div className="role">Ban giám đốc (nếu cần)</div>
                        <div className="name">&nbsp;</div>
                    </div>
                </div>
            </div>
        </>
    );
}
