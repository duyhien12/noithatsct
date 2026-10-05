'use client';
import { useState, useEffect, useCallback, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/fetchClient';
import { useToast } from '@/components/ui/Toast';
import { useRole } from '@/contexts/RoleContext';
import { revenueMonthOf, canEditPricing } from '@/lib/designOrderStatus';
import { calcAll, calcItemAmount } from '@/lib/designOrderCalc';

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Math.round(n || 0));
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
const fmtMonth = (m) => m ? `${m.slice(5)}/${m.slice(0, 4)}` : '';

// Hạng mục của một phiếu: giữ nguyên tên/ĐVT/KL, chỉ nhập đơn giá cho mục có khối lượng
function OrderPricing({ order, canEdit, onSaved }) {
    const toast = useToast();
    const initial = () => Object.fromEntries(order.items.map(it => [it.id, it.unitPrice || '']));
    const [prices, setPrices] = useState(initial);
    const [busy, setBusy] = useState(false);

    const items = order.items.map(it => ({ ...it, unitPrice: Number(prices[it.id]) || 0 }));
    const { subtotal, totalAfterDiscount } = calcAll(items, order.discount, order.discountType, 0);
    const dirty = order.items.some(it => (Number(prices[it.id]) || 0) !== (it.unitPrice || 0));

    const save = async () => {
        setBusy(true);
        try {
            await apiFetch(`/api/design-orders/${order.id}/pricing`, {
                method: 'PATCH',
                body: JSON.stringify({ items: items.map(it => ({ id: it.id, unitPrice: it.unitPrice })) }),
            });
            toast.success(`Đã lưu đơn giá phiếu ${order.code}`);
            onSaved();
        } catch (e) {
            toast.error(e.message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12, display: 'grid', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', fontSize: 13 }}>
                <div>
                    <Link href={`/design-orders/${order.id}`} className="accent"><strong>{order.code}</strong></Link> · {order.customerName}
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        Nghiệm thu {fmtDate(order.acceptedAt)} ({fmtMonth(order.revenueMonth)}) · {order.designers.map(d => `${d.userName} ${d.sharePercent}%`).join(', ')}
                    </div>
                </div>
            </div>
            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th style={{ width: 40 }}>STT</th><th>Hạng mục công việc</th><th style={{ width: 70 }}>ĐVT</th>
                            <th style={{ width: 80, textAlign: 'right' }}>KL</th><th style={{ width: 150, textAlign: 'right' }}>Đơn giá</th>
                            <th style={{ width: 140, textAlign: 'right' }}>Thành tiền</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((it, i) => (
                            <tr key={it.id}>
                                <td style={{ textAlign: 'center' }}>{i + 1}</td>
                                <td>{it.name}{it.note && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{it.note}</div>}</td>
                                <td style={{ textAlign: 'center' }}>{it.unit}</td>
                                <td style={{ textAlign: 'right' }}>{it.quantity}</td>
                                <td style={{ textAlign: 'right' }}>
                                    {it.quantity > 0 ? (
                                        canEdit ? (
                                            <input type="number" min="0" step="1000" className="form-input" value={prices[it.id]}
                                                onChange={e => setPrices(p => ({ ...p, [it.id]: e.target.value }))}
                                                style={{ width: 130, textAlign: 'right' }} />
                                        ) : fmt(it.unitPrice)
                                    ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                                </td>
                                <td className="amount">{it.quantity > 0 ? fmt(calcItemAmount(it.quantity, it.unitPrice)) : ''}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 16, flexWrap: 'wrap', fontSize: 13 }}>
                {subtotal !== totalAfterDiscount && <span>Tổng: {fmt(subtotal)} · Giảm giá: {fmt(subtotal - totalAfterDiscount)}</span>}
                <span>Doanh số (trước VAT): <strong style={{ fontSize: 15 }}>{fmt(totalAfterDiscount)}</strong></span>
                {canEdit && (<>
                    {dirty && <button className="btn btn-ghost" disabled={busy} onClick={() => setPrices(initial())}>Hoàn tác</button>}
                    <button className="btn btn-primary" disabled={busy || !dirty} onClick={save}>Lưu đơn giá</button>
                </>)}
            </div>
        </div>
    );
}

export default function DesignRevenuePage() {
    const router = useRouter();
    const toast = useToast();
    const { role } = useRole();
    const thisMonth = revenueMonthOf(new Date());
    const yearStart = `${thisMonth.slice(0, 4)}-01`;
    const [y, m] = thisMonth.split('-').map(Number);
    const lastMonth = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
    const presets = [
        { label: 'Tháng này', from: thisMonth, to: thisMonth },
        { label: 'Tháng trước', from: lastMonth, to: lastMonth },
        { label: 'Năm nay', from: yearStart, to: thisMonth },
    ];

    const [fromMonth, setFromMonth] = useState(yearStart);
    const [toMonth, setToMonth] = useState(thisMonth);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(null);

    const fetchData = useCallback(() => {
        if (!fromMonth || !toMonth) return;
        setLoading(true);
        apiFetch(`/api/design-orders/revenue?fromMonth=${fromMonth}&toMonth=${toMonth}`)
            .then(setData)
            .catch(e => toast.error(e.message))
            .finally(() => setLoading(false));
    }, [fromMonth, toMonth, toast]);

    useEffect(() => { fetchData(); }, [fetchData]);

    return (
        <div className="card">
            <div className="card-header">
                <h3>Doanh số thiết kế</h3>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tính trên tổng sau giảm giá, trước VAT · ghi nhận theo tháng KD nghiệm thu</div>
            </div>

            <div className="filter-bar">
                <label style={{ fontSize: 13 }}>Từ tháng</label>
                <input type="month" className="form-input" value={fromMonth} onChange={e => setFromMonth(e.target.value)} style={{ maxWidth: 170 }} />
                <label style={{ fontSize: 13 }}>đến</label>
                <input type="month" className="form-input" value={toMonth} onChange={e => setToMonth(e.target.value)} style={{ maxWidth: 170 }} />
                {presets.map(p => (
                    <button key={p.label} className={`btn ${fromMonth === p.from && toMonth === p.to ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => { setFromMonth(p.from); setToMonth(p.to); }}>
                        {p.label}
                    </button>
                ))}
            </div>

            {data && (
                <div style={{ display: 'flex', gap: 24, padding: '8px 16px', flexWrap: 'wrap' }}>
                    <div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tổng doanh số</div><div style={{ fontSize: 20, fontWeight: 700 }}>{fmt(data.total)}</div></div>
                    <div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Số phiếu hoàn thành</div><div style={{ fontSize: 20, fontWeight: 700 }}>{data.orderCount}</div></div>
                </div>
            )}

            {loading ? (
                <div style={{ padding: 40, textAlign: 'center' }}>Đang tải...</div>
            ) : !data?.rows.length ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có phiếu nào được nghiệm thu trong khoảng thời gian này</div>
            ) : (
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr><th>Nhân viên thiết kế</th><th style={{ textAlign: 'right' }}>Số phiếu</th><th style={{ textAlign: 'right' }}>Doanh số</th><th style={{ textAlign: 'right' }}>Tỷ trọng</th></tr>
                        </thead>
                        <tbody>
                            {data.rows.map(r => (
                                <Fragment key={r.userId}>
                                    <tr style={{ cursor: 'pointer' }} onClick={() => setExpanded(expanded === r.userId ? null : r.userId)}>
                                        <td><strong>{expanded === r.userId ? '▾' : '▸'} {r.userName}</strong></td>
                                        <td style={{ textAlign: 'right' }}>{r.orderCount}</td>
                                        <td className="amount">{fmt(r.amount)}</td>
                                        <td style={{ textAlign: 'right' }}>{data.total ? (r.amount / data.total * 100).toFixed(1) : 0}%</td>
                                    </tr>
                                    {expanded === r.userId && r.details.map(d => (
                                        <tr key={d.designOrderId} style={{ background: 'var(--surface-alt)', cursor: 'pointer', fontSize: 12.5 }}
                                            onClick={() => router.push(`/design-orders/${d.designOrderId}`)}>
                                            <td style={{ paddingLeft: 28 }}>
                                                <span className="accent">{d.code}</span> · {d.customerName}
                                                <div style={{ color: 'var(--text-muted)' }}>Nghiệm thu {fmtDate(d.acceptedAt)} ({fmtMonth(d.revenueMonth)}) bởi {d.acceptedBy}</div>
                                            </td>
                                            <td style={{ textAlign: 'right' }}>{d.sharePercent}%</td>
                                            <td className="amount">{fmt(d.amount)}</td>
                                            <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>/ {fmt(d.orderRevenue)}</td>
                                        </tr>
                                    ))}
                                </Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {!loading && data?.orders?.length > 0 && (
                <div style={{ padding: 16, display: 'grid', gap: 12 }}>
                    <div>
                        <h4 style={{ margin: 0 }}>Bảng hạng mục tính doanh số</h4>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Các hạng mục lấy từ phiếu đặt hàng. Chỉ cần nhập đơn giá cho mục có khối lượng, doanh số và phần chia cho nhân viên sẽ được tính lại khi lưu.</div>
                    </div>
                    {data.orders.map(o => (
                        <OrderPricing key={`${o.id}-${o.totalAfterDiscount}`} order={o} canEdit={canEditPricing(role)} onSaved={fetchData} />
                    ))}
                </div>
            )}
        </div>
    );
}
