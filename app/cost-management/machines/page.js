'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ExternalLink } from 'lucide-react';

const fmt = (n) => n ? new Intl.NumberFormat('vi-VN').format(Math.round(n)) : '—';
const toNum = (v) => Number(v) || 0;

// Tính khấu hao/tháng từ nguyên giá × tỷ lệ KH năm / 12
function calcMonthlyDepr(originalCost, depreciationRate) {
    return Math.round(toNum(originalCost) * toNum(depreciationRate) / 12);
}

function fmtDate(d) {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('vi-VN', { month: '2-digit', year: 'numeric' }); }
    catch { return '—'; }
}

export default function MachinesPage() {
    const router = useRouter();
    const [machines, setMachines] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        // Lấy từ Tài sản cố định, lọc loại Máy móc - Thiết bị
        const res = await fetch('/api/workshop/assets?assetType=Máy móc - Thiết bị');
        const data = await res.json();
        setMachines(Array.isArray(data) ? data : []);
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const activeMachines = machines.filter(m => m.status === 'Đang dùng');
    const totalMonthlyDepr = activeMachines.reduce((s, m) => s + calcMonthlyDepr(m.originalCost, m.depreciationRate), 0);

    return (
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <button onClick={() => router.push('/cost-management')}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 11px', borderRadius: 8, border: '1px solid #e5e7eb', background: 'white', color: '#374151', fontSize: 13, cursor: 'pointer' }}>
                    <ArrowLeft size={14} />
                </button>
                <div style={{ flex: 1 }}>
                    <h1 style={{ fontSize: 18, fontWeight: 800, color: '#111827', margin: 0 }}>Máy móc — Thiết bị sản xuất</h1>
                    <p style={{ fontSize: 12, color: '#6b7280', margin: '2px 0 0' }}>
                        Lấy từ Tài sản cố định · {activeMachines.length} máy đang dùng ·
                        Tổng KH/tháng: <strong style={{ color: '#7c3aed' }}>{fmt(totalMonthlyDepr)}đ</strong>
                    </p>
                </div>
                <button onClick={() => router.push('/workshop/assets')}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid #e5e7eb', background: 'white', color: '#374151', fontSize: 13, cursor: 'pointer' }}>
                    <ExternalLink size={14} /> Quản lý tài sản
                </button>
            </div>

            {/* Tổng khấu hao banner */}
            <div style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', borderRadius: 12, padding: '14px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <div style={{ fontSize: 11, color: '#e9d5ff', fontWeight: 500 }}>Tổng khấu hao máy/tháng (đang dùng)</div>
                    <div style={{ fontSize: 26, fontWeight: 900, color: 'white', letterSpacing: -0.5 }}>{fmt(totalMonthlyDepr)}đ</div>
                    <div style={{ fontSize: 11, color: '#c4b5fd' }}>→ Dùng con số này khi nhập Chi phí tháng</div>
                </div>
                <div style={{ textAlign: 'right', color: '#e9d5ff', fontSize: 12 }}>
                    <div>{activeMachines.length} máy đang dùng</div>
                    <div>{machines.filter(m => m.status !== 'Đang dùng').length} đã thanh lý / bảo trì</div>
                </div>
            </div>

            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e5e7eb' }}>
                                {['Mã TSCĐ','Tên máy/thiết bị','Ngày dùng','Nguyên giá','Tỷ lệ KH/năm','KH/tháng','Trạng thái','Ghi chú'].map((h, i) => (
                                    <th key={i} style={{ padding: '10px 14px', textAlign: i >= 3 && i <= 5 ? 'right' : 'left', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap', fontSize: 12 }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading && (
                                <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Đang tải...</td></tr>
                            )}
                            {!loading && machines.length === 0 && (
                                <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
                                    Chưa có máy móc nào. Vào <strong>Tài sản cố định</strong> → thêm tài sản loại "Máy móc - Thiết bị".
                                </td></tr>
                            )}
                            {machines.map(m => {
                                const monthly = calcMonthlyDepr(m.originalCost, m.depreciationRate);
                                const isActive = m.status === 'Đang dùng';
                                return (
                                    <tr key={m.id} style={{ borderBottom: '1px solid #f3f4f6', opacity: isActive ? 1 : 0.55 }}>
                                        <td style={{ padding: '10px 14px', color: '#6b7280', fontWeight: 600, fontSize: 12 }}>{m.code}</td>
                                        <td style={{ padding: '10px 14px', fontWeight: 600, color: '#111827' }}>{m.name}</td>
                                        <td style={{ padding: '10px 14px', color: '#6b7280' }}>{fmtDate(m.startUseDate)}</td>
                                        <td style={{ padding: '10px 14px', textAlign: 'right', color: '#374151' }}>{fmt(m.originalCost)}đ</td>
                                        <td style={{ padding: '10px 14px', textAlign: 'right', color: '#d97706', fontWeight: 600 }}>
                                            {m.depreciationRate ? `${(toNum(m.depreciationRate) * 100).toFixed(1)}%` : '—'}
                                        </td>
                                        <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: isActive ? '#7c3aed' : '#9ca3af' }}>
                                            {isActive ? fmt(monthly) + 'đ' : '—'}
                                        </td>
                                        <td style={{ padding: '10px 14px' }}>
                                            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600,
                                                background: isActive ? '#dcfce7' : '#f3f4f6',
                                                color: isActive ? '#16a34a' : '#6b7280' }}>
                                                {m.status || 'Đang dùng'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '10px 14px', color: '#9ca3af', fontSize: 12 }}>{m.notes || '—'}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        {!loading && activeMachines.length > 0 && (
                            <tfoot>
                                <tr style={{ background: '#f5f3ff', borderTop: '2px solid #c4b5fd' }}>
                                    <td colSpan={5} style={{ padding: '10px 14px', fontWeight: 700, color: '#7c3aed', fontSize: 13 }}>
                                        Tổng khấu hao/tháng ({activeMachines.length} máy đang dùng)
                                    </td>
                                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 900, color: '#7c3aed', fontSize: 15 }}>
                                        {fmt(totalMonthlyDepr)}đ
                                    </td>
                                    <td colSpan={2} />
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>

            <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 10, textAlign: 'center' }}>
                Để thêm/sửa/xoá máy → vào <strong>Tài sản cố định</strong>. Con số KH/tháng tự cập nhật khi tỷ lệ khấu hao thay đổi.
            </p>
        </div>
    );
}
