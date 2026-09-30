'use client';
import { useState, useEffect, useCallback, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/fetchClient';
import { useToast } from '@/components/ui/Toast';
import { revenueMonthOf } from '@/lib/designOrderStatus';

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Math.round(n || 0));
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
const fmtMonth = (m) => m ? `${m.slice(5)}/${m.slice(0, 4)}` : '';

export default function DesignRevenuePage() {
    const router = useRouter();
    const toast = useToast();
    const thisMonth = revenueMonthOf(new Date());

    const [fromMonth, setFromMonth] = useState(thisMonth);
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
        </div>
    );
}
