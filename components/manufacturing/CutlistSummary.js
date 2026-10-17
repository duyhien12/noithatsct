'use client';
import { compareWithStock, ITEM_GROUP_LABELS } from '@/lib/manufacturing/cutlist';
import { materialFullName } from '@/lib/inventoryV2/materialLabel';

const fmt = (n, d = 2) => n == null ? null : new Intl.NumberFormat('vi-VN', { maximumFractionDigits: d }).format(n);
const NO_DATA = <span style={{ color: 'var(--color-warning)', fontWeight: 600 }}>CHƯA CÓ DỮ LIỆU</span>;
const matLabel = (m) => m ? `${m.sku} — ${materialFullName(m)}` : '—';

/**
 * Tổng hợp nhu cầu + đối chiếu tồn khả dụng của bảng bóc tách.
 * `available` chỉ có cho vật tư đã lưu trên server (tồn lấy lúc tải trang — stockAsOf).
 */
export default function CutlistSummary({ summary, available, stockAsOf, wastePercent, dirty }) {
    const compare = compareWithStock(summary, available || {});
    const shortCount = compare.filter(r => r.shortage > 0).length;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="card-header" style={{ padding: '14px 18px' }}>
                    <span className="card-title">Ván / bề mặt ({summary.totals.panelPieces} chi tiết · {fmt(summary.totals.panelAreaM2, 3)} m²)</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Hao hụt: {Number(wastePercent) ? `${wastePercent}%` : 'chưa nhập'}</span>
                </div>
                <div className="table-container">
                    <table className="data-table">
                        <thead><tr><th>Mã ván</th><th style={{ textAlign: 'right' }}>Số chi tiết</th><th style={{ textAlign: 'right' }}>m² tinh</th><th style={{ textAlign: 'right' }}>m² gồm hao hụt</th><th style={{ textAlign: 'right' }}>m²/tấm</th><th style={{ textAlign: 'right' }}>Số tấm ước tính</th></tr></thead>
                        <tbody>
                            {summary.panels.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có chi tiết tấm gắn mã ván</td></tr>}
                            {summary.panels.map(p => (
                                <tr key={p.materialId}>
                                    <td className="primary">{matLabel(p.material)}</td>
                                    <td style={{ textAlign: 'right' }}>{fmt(p.pieces)}</td>
                                    <td style={{ textAlign: 'right' }}>{fmt(p.areaM2, 3)}</td>
                                    <td style={{ textAlign: 'right' }}>{fmt(p.areaWithWaste, 3)}</td>
                                    <td style={{ textAlign: 'right' }}>{p.sheetAreaM2 != null ? fmt(p.sheetAreaM2, 3) : NO_DATA}</td>
                                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{p.sheetsEstimate != null ? fmt(p.sheetsEstimate, 0) : NO_DATA}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div style={{ padding: '8px 18px', fontSize: 12, color: 'var(--text-muted)' }}>
                    Số tấm = làm tròn lên (m² gồm hao hụt ÷ m² một tấm) — ước tính theo diện tích, chưa phải sơ đồ cắt tối ưu; không dùng làm số chốt mua.
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div className="card-header" style={{ padding: '14px 18px' }}><span className="card-title">Chỉ cạnh</span></div>
                    <div className="table-container">
                        <table className="data-table">
                            <thead><tr><th>Mã chỉ</th><th style={{ textAlign: 'right' }}>m tinh</th><th style={{ textAlign: 'right' }}>m gồm hao hụt</th></tr></thead>
                            <tbody>
                                {summary.edges.length === 0 && <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Không có cạnh dán</td></tr>}
                                {summary.edges.map(e => (
                                    <tr key={e.materialId || 'none'}>
                                        <td className="primary">{e.material ? matLabel(e.material) : <span style={{ color: 'var(--color-danger)' }}>Chưa chọn mã chỉ</span>}</td>
                                        <td style={{ textAlign: 'right' }}>{fmt(e.meters)}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(e.metersWithWaste)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="card">
                    <div className="card-header"><span className="card-title">Keo PUR dán cạnh</span></div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 16px', fontSize: 13.5 }}>
                        <span style={{ color: 'var(--text-muted)' }}>Tổng mét chỉ (gồm hao hụt)</span><strong>{fmt(summary.pur.edgeMeters)} m</strong>
                        <span style={{ color: 'var(--text-muted)' }}>Định mức</span><strong>{summary.pur.gramPerMeter != null ? `${fmt(summary.pur.gramPerMeter)} g/m` : NO_DATA}</strong>
                        <span style={{ color: 'var(--text-muted)' }}>Keo PUR cần</span><strong>{summary.pur.kg != null ? `${fmt(summary.pur.kg, 3)} kg` : NO_DATA}</strong>
                    </div>
                </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="card-header" style={{ padding: '14px 18px' }}><span className="card-title">Phụ kiện · kính · kim loại · keo · khác</span></div>
                <div className="table-container">
                    <table className="data-table">
                        <thead><tr><th>Nhóm</th><th>Vật tư</th><th style={{ textAlign: 'right' }}>Số lượng</th><th>Đơn vị</th></tr></thead>
                        <tbody>
                            {summary.items.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có dòng phụ kiện / vật tư khác</td></tr>}
                            {summary.items.map(i => (
                                <tr key={`${i.materialId || i.materialText}|${i.unit}`}>
                                    <td>{ITEM_GROUP_LABELS[i.group] || 'Khác'}</td>
                                    <td className="primary">{i.material ? matLabel(i.material) : <>{i.materialText} <span className="badge warning">chưa có mã</span></>}</td>
                                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(i.quantity, 3)}</td>
                                    <td>{i.unit}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="card-header" style={{ padding: '14px 18px', flexWrap: 'wrap', gap: 8 }}>
                    <span className="card-title">Đối chiếu tồn kho khả dụng {shortCount > 0 && <span className="badge danger" style={{ marginLeft: 6 }}>{shortCount} mã thiếu</span>}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        Tồn khả dụng = tồn − đã giữ, cộng mọi kho · chốt lúc {stockAsOf ? new Date(stockAsOf).toLocaleString('vi-VN') : '—'}
                        {dirty && ' · có thay đổi chưa lưu — lưu để tải lại tồn'}
                    </span>
                </div>
                <div className="table-container">
                    <table className="data-table">
                        <thead><tr><th>Loại</th><th>Vật tư</th><th>Nhu cầu</th><th style={{ textAlign: 'right' }}>Cần (ĐV kho)</th><th style={{ textAlign: 'right' }}>Khả dụng</th><th style={{ textAlign: 'right' }}>Thiếu</th><th>Ghi chú</th></tr></thead>
                        <tbody>
                            {compare.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có nhu cầu</td></tr>}
                            {compare.map((r, i) => {
                                const notLoaded = r.materialId && !(r.materialId in (available || {}));
                                return (
                                    <tr key={i} style={r.shortage > 0 ? { background: 'var(--color-danger-bg)' } : undefined}>
                                        <td>{r.kind}</td>
                                        <td className="primary">{r.label}</td>
                                        <td style={{ fontSize: 12.5 }}>{r.need}</td>
                                        <td style={{ textAlign: 'right' }}>{r.required != null ? `${fmt(r.required, 3)} ${r.unit}` : '—'}</td>
                                        <td style={{ textAlign: 'right' }}>{notLoaded ? '—' : r.available != null ? `${fmt(r.available, 3)} ${r.unit}` : '—'}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 700, color: r.shortage > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                                            {notLoaded || r.shortage == null ? '—' : r.shortage > 0 ? `${fmt(r.shortage, 3)} ${r.unit}` : 'Đủ'}
                                        </td>
                                        <td style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{notLoaded ? 'Lưu để tải tồn' : r.reason}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                <div style={{ padding: '8px 18px', fontSize: 12, color: 'var(--text-muted)' }}>
                    Chưa tính hàng đang về và phần đã giữ riêng cho lệnh này. Mã khác đơn vị kho chưa có hệ số quy đổi thì không so được — không cộng lẫn đơn vị.
                </div>
            </div>
        </div>
    );
}
