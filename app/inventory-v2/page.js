'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);
const fmtNum = (n) => new Intl.NumberFormat('vi-VN').format(n || 0);

function TrendChart({ trend }) {
    if (!trend || trend.length === 0) return <div style={{ padding: 20, color: 'var(--text-muted)', fontSize: 13 }}>Chưa có dữ liệu 30 ngày gần đây</div>;
    const max = Math.max(1, ...trend.map(t => Math.max(t.inQty, t.outQty)));
    const w = 720, h = 160, barW = w / trend.length;
    return (
        <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 160 }}>
            {trend.map((t, i) => {
                const inH = (t.inQty / max) * (h - 24);
                const outH = (t.outQty / max) * (h - 24);
                const x = i * barW;
                return (
                    <g key={t.date}>
                        <rect x={x + 2} y={h - 20 - inH} width={barW / 2 - 3} height={inH} fill="#16a34a" opacity={0.85} />
                        <rect x={x + barW / 2 + 1} y={h - 20 - outH} width={barW / 2 - 3} height={outH} fill="#dc2626" opacity={0.85} />
                        <title>{`${t.date}: Nhập ${t.inQty} · Xuất ${t.outQty}`}</title>
                    </g>
                );
            })}
            <line x1={0} y1={h - 20} x2={w} y2={h - 20} stroke="var(--border)" strokeWidth={1} />
        </svg>
    );
}

export default function InventoryV2Dashboard() {
    const router = useRouter();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/inventory-v2/dashboard').then(r => r.json()).then(d => { setData(d); setLoading(false); });
    }, []);

    if (loading || !data) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>;

    const cards = [
        { icon: '📦', label: 'Tổng SKU', value: fmtNum(data.totalSku) },
        data.totalValue !== undefined && { icon: '💰', label: 'Giá trị tồn kho', value: fmt(data.totalValue), accent: true },
        { icon: '🚨', label: 'Dưới mức tối thiểu', value: fmtNum(data.belowMinCount), danger: data.belowMinCount > 0, onClick: () => router.push('/inventory-v2/stock?filter=low') },
        { icon: '🛒', label: 'Thiếu cho sản xuất', value: fmtNum(data.shortForProductionCount), danger: data.shortForProductionCount > 0, onClick: () => router.push('/inventory-v2/stock?filter=reorder') },
        { icon: '🚚', label: 'Đã đặt chưa về', value: fmtNum(data.orderedNotArrivedCount) },
        { icon: '🕒', label: 'Không phát sinh > 6 tháng', value: fmtNum(data.idle180), onClick: () => router.push('/inventory-v2/stock?filter=idle&idleDays=180') },
        data.reservedValue !== undefined && { icon: '🔒', label: 'Giá trị đã giữ cho công trình', value: fmt(data.reservedValue) },
        data.remnantValue !== undefined && { icon: '🪵', label: 'Giá trị ván thừa', value: fmt(data.remnantValue) },
    ].filter(Boolean);

    return (
        <div>
            <div className="stats-grid" style={{ marginBottom: 20 }}>
                {cards.map((c, i) => (
                    <div key={i} className="stat-card" style={{ cursor: c.onClick ? 'pointer' : undefined }} onClick={c.onClick}>
                        <div className="stat-icon" style={{ color: c.danger ? '#dc2626' : undefined }}>{c.icon}</div>
                        <div>
                            <div className="stat-value" style={{ color: c.danger ? '#dc2626' : c.accent ? 'var(--accent-primary)' : undefined, fontSize: typeof c.value === 'string' && c.value.length > 10 ? 16 : undefined }}>{c.value}</div>
                            <div className="stat-label">{c.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="card">
                <div className="card-header"><h3 style={{ margin: 0, fontSize: 14 }}>📈 Nhập – Xuất 30 ngày gần đây</h3></div>
                <div style={{ padding: 16 }}><TrendChart trend={data.trend} /></div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
                <Link href="/inventory-v2/materials" className="btn btn-ghost">📋 Danh mục vật tư</Link>
                <Link href="/inventory-v2/documents" className="btn btn-ghost">📥 Phiếu nhập/xuất/điều chuyển</Link>
                <Link href="/inventory-v2/stock" className="btn btn-ghost">📊 Tồn kho hiện tại</Link>
                <Link href="/inventory-v2/remnants" className="btn btn-ghost">🪵 Ván thừa</Link>
                <Link href="/inventory-v2/stocktakes" className="btn btn-ghost">✅ Kiểm kê kho</Link>
                <Link href="/inventory-v2/allocations" className="btn btn-ghost">🗂 Phân bổ công trình</Link>
                <Link href="/inventory-v2/settings" className="btn btn-ghost">⚙️ Thiết lập kho</Link>
                <Link href="/inventory-v2/migration" className="btn btn-ghost">🔄 Di trú dữ liệu cũ</Link>
            </div>
        </div>
    );
}
