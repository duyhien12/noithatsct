'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

/* =============================================
   BRAND COLORS - MỘT NHÀ
   ============================================= */
const BRAND = {
    blue: '#234093',        // R35 G64 B147
    gold: '#DBB35E',        // R219 G179 B94
    grey: '#C6C6C6',        // R198 G198 B198
    dark: '#1a1a2e',
    white: '#ffffff',
    textDark: '#1e293b',
    textMid: '#475569',
    textLight: '#94a3b8',
};

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Math.round(n || 0));
const fmtNum = (n) => new Intl.NumberFormat('vi-VN').format(n || 0);

/* =============================================
   USP PER QUOTATION TYPE
   ============================================= */
const USP_MAP = {
    'Thiết kế': [
        'Thiết kế cá nhân hóa 100%',
        'Phối cảnh 3D sống động',
        'Hồ sơ kỹ thuật đầy đủ',
        'Bảo hành bản vẽ suốt thi công',
    ],
    'Thiết kế kiến trúc': [
        'Thiết kế cá nhân hóa 100%',
        'Phối cảnh 3D sống động',
        'Hồ sơ kỹ thuật đầy đủ',
        'Bảo hành bản vẽ suốt thi công',
    ],
    'Thiết kế nội thất': [
        'Thiết kế cá nhân hóa 100%',
        'Phối cảnh 3D sống động',
        'Hồ sơ kỹ thuật đầy đủ',
        'Bảo hành bản vẽ suốt thi công',
    ],
    'Thi công thô': [
        'Vật liệu chuẩn TCVN',
        'Giám sát tại công trình hàng ngày',
        'Không phát sinh ngoài HĐ',
        'Bảo hành kết cấu 5 năm',
    ],
    'Thi công hoàn thiện': [
        'Hoàn thiện chuẩn kỹ thuật',
        'Bảo hành sơn 2 năm, ốp lát 3 năm',
        'Bàn giao sạch sẽ',
        'Hậu mãi 12 tháng miễn phí',
    ],
    'Nội thất': [
        'Nội thất sản xuất riêng',
        'Vật liệu chính hãng có CO/CQ',
        'Bảo hành 2–5 năm',
        'Lắp đặt turnkey trọn gói',
    ],
    'Thi công nội thất': [
        'Nội thất sản xuất riêng',
        'Vật liệu chính hãng có CO/CQ',
        'Bảo hành 2–5 năm',
        'Lắp đặt turnkey trọn gói',
    ],
};

const DOC_TITLE_MAP = {
    'Thiết kế': 'BÁO GIÁ THIẾT KẾ',
    'Thiết kế kiến trúc': 'BÁO GIÁ THIẾT KẾ KIẾN TRÚC',
    'Thiết kế nội thất': 'BÁO GIÁ THIẾT KẾ NỘI THẤT',
    'Thi công thô': 'BÁO GIÁ THI CÔNG THÔ',
    'Thi công hoàn thiện': 'BÁO GIÁ THI CÔNG HOÀN THIỆN',
    'Nội thất': 'BÁO GIÁ NỘI THẤT',
    'Thi công nội thất': 'BÁO GIÁ NỘI THẤT',
};

/* =============================================
   LOGO SVG - Chữ M lồng ngôi nhà
   ============================================= */
function MNLogo({ size = 48 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* House shape */}
            <path d="M50 8L8 42V92H92V42L50 8Z" fill={BRAND.blue} />
            {/* Roof accent */}
            <path d="M50 8L8 42H92L50 8Z" fill={BRAND.blue} />
            <path d="M50 14L16 42H84L50 14Z" fill={BRAND.gold} opacity="0.3" />
            {/* M letter */}
            <text x="50" y="72" textAnchor="middle" fontFamily="Montserrat, sans-serif" fontWeight="900" fontSize="42" fill={BRAND.gold}>M</text>
        </svg>
    );
}

/* =============================================
   MAIN COMPONENT
   ============================================= */
export default function QuotationPDFPage() {
    const { id } = useParams();
    const [data, setData] = useState(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        fetch(`/api/public/quotations/${id}`)
            .then(r => { if (!r.ok) throw new Error('Not found'); return r.json(); })
            .then(d => {
                setData(d);
                const code = d.code || '';
                const cust = d.customer?.name || '';
                const type = d.type || '';
                document.title = [code, cust, type].filter(Boolean).join('_');
            })
            .catch(() => setData({ error: true }));
    }, [id]);

    const copyLink = () => {
        const publicUrl = `${window.location.origin}/public/baogia/${id}`;
        navigator.clipboard.writeText(publicUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!data) return (
        <div style={{ padding: 60, textAlign: 'center', fontFamily: 'Montserrat, sans-serif', color: BRAND.blue }}>
            <div style={{ width: 40, height: 40, border: `3px solid ${BRAND.blue}`, borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
            Đang tải báo giá...
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );

    if (data.error) return (
        <div style={{ padding: 60, textAlign: 'center', fontFamily: 'Montserrat, sans-serif', color: '#dc2626' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Báo giá không tồn tại</div>
            <div style={{ fontSize: 13, color: BRAND.textMid }}>Link không hợp lệ hoặc báo giá đã bị xóa.</div>
        </div>
    );

    const q = data;
    const docTitle = DOC_TITLE_MAP[q.type] || `BÁO GIÁ ${(q.type || '').toUpperCase()}`;
    const uspItems = USP_MAP[q.type] || USP_MAP['Nội thất'];
    const dateStr = new Date(q.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const validStr = q.validUntil ? new Date(q.validUntil).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : null;
    const afterDiscount = q.total - (q.total * (q.discount || 0) / 100);
    const vatAmount = afterDiscount * ((q.vat || 0) / 100);

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800;900&display=swap');
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body { background: #e8ecf1 !important; font-family: 'Montserrat', sans-serif; color: ${BRAND.textDark}; }

                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; }
                    .pdf-page {
                        box-shadow: none !important;
                        margin: 0 !important;
                        max-width: 100% !important;
                        border-radius: 0 !important;
                    }
                    @page {
                        size: A4 landscape;
                        margin: 10mm;
                    }
                }

                .pdf-page {
                    max-width: 1100px;
                    margin: 20px auto 40px;
                    background: #fff;
                    box-shadow: 0 4px 40px rgba(0,0,0,0.12);
                    border-radius: 4px;
                    position: relative;
                    overflow: hidden;
                }

                /* ====== WATERMARK ====== */
                .watermark {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%) rotate(-30deg);
                    font-size: 120px;
                    font-weight: 900;
                    color: ${BRAND.blue};
                    opacity: 0.025;
                    pointer-events: none;
                    white-space: nowrap;
                    letter-spacing: 20px;
                    z-index: 0;
                }

                /* ====== HEADER IMAGE ====== */
                .mn-header-img {
                    width: 100%;
                    display: block;
                    position: relative;
                    z-index: 1;
                    overflow: hidden;
                }
                .mn-header-img img {
                    width: 100%;
                    height: auto;
                    display: block;
                }
                .mn-doc-bar {
                    display: flex;
                    justify-content: flex-end;
                    align-items: center;
                    gap: 20px;
                    padding: 6px 36px;
                    font-size: 10px;
                    font-style: italic;
                    color: ${BRAND.textMid};
                    position: relative;
                    z-index: 1;
                }
                .mn-doc-bar .code { font-weight: 700; color: ${BRAND.blue}; font-style: italic; }
                .mn-doc-bar .meta { font-weight: 400; font-style: italic; }

                /* ====== CONTENT AREA ====== */
                .mn-content { padding: 0 36px 28px; position: relative; z-index: 1; }

                /* ====== CUSTOMER + PROJECT + USP ROW ====== */
                .mn-info-row {
                    display: flex;
                    align-items: stretch;
                    margin: 20px 0;
                    border: 1px solid #e2e8f0;
                    border-radius: 6px;
                    overflow: hidden;
                    position: relative;
                    z-index: 1;
                }
                .mn-info-cell {
                    padding: 14px 20px;
                    flex: 1;
                }
                .mn-info-cell + .mn-info-cell {
                    border-left: 1px solid #e2e8f0;
                }
                .mn-info-label {
                    font-size: 8px;
                    font-weight: 700;
                    color: ${BRAND.blue};
                    text-transform: uppercase;
                    letter-spacing: 1.5px;
                    margin-bottom: 6px;
                }
                .mn-info-name { font-size: 13px; font-weight: 700; color: ${BRAND.textDark}; margin-bottom: 2px; }
                .mn-info-detail { font-size: 10px; font-weight: 400; color: ${BRAND.textMid}; line-height: 1.8; }
                .mn-usp-cell {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 8px;
                    padding: 14px 16px;
                    align-content: center;
                    min-width: 240px;
                }
                .mn-usp-badge {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 5px 10px;
                    background: #f0fdf4;
                    border: 1px solid #bbf7d0;
                    border-radius: 6px;
                    font-size: 9.5px;
                    font-weight: 600;
                    color: ${BRAND.textDark};
                    white-space: nowrap;
                }
                .mn-usp-check {
                    font-size: 14px;
                    flex-shrink: 0;
                    line-height: 1;
                }

                /* ====== TABLE ====== */
                .mn-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 10.5px;
                    margin-bottom: 2px;
                }
                .mn-table th {
                    background: ${BRAND.blue};
                    color: #fff;
                    font-weight: 700;
                    padding: 8px 6px;
                    font-size: 9px;
                    text-transform: uppercase;
                    letter-spacing: 0.3px;
                    white-space: nowrap;
                    border: 1px solid ${BRAND.blue};
                }
                .mn-table td {
                    border: 1px solid ${BRAND.grey};
                    padding: 6px 6px;
                    vertical-align: middle;
                    font-weight: 400;
                }
                .mn-table .r { text-align: right; }
                .mn-table .c { text-align: center; }
                .mn-table .amt { font-weight: 700; color: ${BRAND.blue}; }
                .mn-table .item-img {
                    width: 44px; height: 44px; object-fit: cover;
                    border-radius: 3px; border: 1px solid ${BRAND.grey}; display: block;
                }
                .mn-table .no-img {
                    width: 44px; height: 44px; border-radius: 3px;
                    border: 1px dashed ${BRAND.grey}; display: flex;
                    align-items: center; justify-content: center;
                    font-size: 12px; opacity: 0.3;
                }

                /* Room image layout */
                .mn-sub-layout {
                    display: flex;
                    gap: 12px;
                }
                .mn-sub-layout .mn-sub-table-area {
                    flex: 1;
                    min-width: 0;
                }
                .mn-sub-layout .mn-room-image-area {
                    width: 260px;
                    min-width: 260px;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                .mn-room-img {
                    width: 100%;
                    border-radius: 4px;
                    border: 2px solid ${BRAND.blue}20;
                    object-fit: cover;
                }
                .mn-room-caption {
                    font-size: 8px;
                    color: ${BRAND.textMid};
                    text-align: center;
                    font-style: italic;
                }

                /* Category header (main group) */
                .mn-cat-main {
                    background: ${BRAND.gold};
                    color: #fff;
                    padding: 9px 14px;
                    font-weight: 800;
                    font-size: 12px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    letter-spacing: 0.5px;
                }
                .mn-cat-main .mn-space-name {
                    background: #fff;
                    color: ${BRAND.blue};
                    border: 2px solid ${BRAND.gold};
                    padding: 4px 18px;
                    font-weight: 900;
                    font-size: 11px;
                    font-style: italic;
                    letter-spacing: 1.5px;
                    text-transform: uppercase;
                }
                .mn-sub-total td {
                    background: ${BRAND.blue}08;
                    font-weight: 700;
                    font-size: 11px;
                    color: ${BRAND.blue};
                    border-top: 2px solid ${BRAND.gold};
                }
                .mn-desc { font-size: 9.5px; color: ${BRAND.textMid}; font-style: italic; }

                /* ====== NOTES ====== */
                .mn-notes {
                    margin: 16px 0;
                    border: 1px solid ${BRAND.gold}66;
                    border-left: 3px solid ${BRAND.gold};
                    padding: 10px 14px;
                    font-size: 11px;
                    color: ${BRAND.textMid};
                    background: ${BRAND.gold}08;
                }

                /* ====== SUMMARY BOX ====== */
                .mn-summary-wrap { display: flex; justify-content: flex-end; margin: 20px 0; }
                .mn-sum-box {
                    width: 340px;
                    border: 1px solid ${BRAND.grey};
                    overflow: hidden;
                }
                .mn-sum-row {
                    display: flex;
                    justify-content: space-between;
                    padding: 8px 16px;
                    font-size: 11px;
                    font-weight: 500;
                    border-bottom: 1px solid #f1f5f9;
                }
                .mn-sum-row.total {
                    background: ${BRAND.gold};
                    color: #fff;
                    font-weight: 900;
                    font-size: 14px;
                    border: none;
                    letter-spacing: 0.5px;
                }
                .mn-sum-row.discount span:last-child { color: #dc2626; font-weight: 600; }

                /* ====== FOOTER ====== */
                .mn-footer-section {
                    margin-top: 24px;
                    padding-top: 16px;
                    border-top: 2px solid ${BRAND.blue};
                }
                .mn-footer-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 30px;
                    margin-bottom: 28px;
                }
                .mn-validity {
                    font-size: 10px;
                    color: ${BRAND.textMid};
                    line-height: 1.9;
                }
                .mn-validity strong { color: ${BRAND.textDark}; font-weight: 700; }
                .mn-sign-area { text-align: center; }
                .mn-sign-title {
                    font-weight: 700;
                    font-size: 11px;
                    color: ${BRAND.blue};
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    margin-bottom: 55px;
                }
                .mn-sign-line {
                    border-top: 1px solid ${BRAND.grey};
                    padding-top: 6px;
                    font-size: 9px;
                    color: ${BRAND.textLight};
                    font-style: italic;
                }
                /* Brand footer strip */
                .mn-brand-strip {
                    background: ${BRAND.blue};
                    padding: 12px 36px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    position: relative;
                    overflow: hidden;
                }
                .mn-brand-strip::before {
                    content: 'M  M  M  M  M  M  M  M  M  M  M  M  M  M  M';
                    position: absolute;
                    top: 50%;
                    left: 0;
                    right: 0;
                    transform: translateY(-50%);
                    font-family: 'Montserrat', sans-serif;
                    font-size: 28px;
                    font-weight: 900;
                    color: rgba(255,255,255,0.04);
                    letter-spacing: 20px;
                    white-space: nowrap;
                    pointer-events: none;
                }
                .mn-strip-left {
                    font-size: 9px;
                    color: rgba(255,255,255,0.7);
                    font-weight: 400;
                    z-index: 1;
                }
                .mn-strip-left strong { color: ${BRAND.gold}; font-weight: 700; }
                .mn-strip-right {
                    font-size: 9px;
                    color: rgba(255,255,255,0.5);
                    z-index: 1;
                }
            `}</style>

            {/* TOOLBAR (no print) */}
            <div className="no-print" style={{ background: BRAND.dark, padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 10, position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 12px rgba(0,0,0,.4)' }}>
                <span style={{ color: BRAND.textLight, fontSize: 13, flex: 1, fontFamily: 'Montserrat, sans-serif' }}>
                    📄 <strong style={{ color: '#fff' }}>{q.code}</strong> — {q.customer?.name} &nbsp;·&nbsp;
                    <span style={{ fontSize: 11, background: BRAND.blue, padding: '2px 10px', borderRadius: 4, color: BRAND.gold, fontWeight: 600 }}>{docTitle}</span>
                </span>
                <button onClick={copyLink} style={{ padding: '7px 14px', background: copied ? '#10b981' : '#334155', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Montserrat' }}>
                    {copied ? '✅ Đã copy!' : '🔗 Copy link'}
                </button>
                <button onClick={() => window.print()} style={{ padding: '7px 20px', background: BRAND.gold, color: BRAND.blue, border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'Montserrat' }}>
                    🖨️ Xuất PDF
                </button>
                <span style={{ color: '#64748b', fontSize: 11, fontFamily: 'Montserrat' }}>Ctrl+P → Save as PDF</span>
            </div>

            <div className="pdf-page">
                {/* WATERMARK */}
                <div className="watermark">MỘT NHÀ</div>

                {/* ====== HEADER IMAGE ====== */}
                <div className="mn-header-img">
                    <img src="https://pub-1e1be66737b446708af785e6cc8fe673.r2.dev/assets/motnha-header.jpg" alt="Một Nhà - Bảng Báo Giá" />
                </div>
                <div className="mn-doc-bar">
                    <span className="code">{q.code}</span>
                    <span className="meta">
                        Ngày lập: <strong>{dateStr}</strong>
                        {validStr && <> &nbsp;|&nbsp; Hiệu lực đến: <strong>{validStr}</strong></>}
                    </span>
                </div>

                <div className="mn-content">
                    {/* ====== CUSTOMER + PROJECT + USP ROW ====== */}
                    <div className="mn-info-row">
                        <div className="mn-info-cell">
                            <div className="mn-info-label">Khách hàng</div>
                            <div className="mn-info-name">{q.customer?.name}</div>
                            <div className="mn-info-detail">
                                {q.customer?.phone && <>SĐT: {q.customer.phone}</>}
                            </div>
                        </div>
                        <div className="mn-info-cell">
                            <div className="mn-info-label">Công trình / Dự án</div>
                            <div className="mn-info-name">{q.project?.name || '—'}</div>
                            <div className="mn-info-detail">
                                {q.project?.address && <>Địa điểm: {q.project.address}</>}
                            </div>
                        </div>
                        <div className="mn-usp-cell">
                            {[
                                { icon: '🏗️', text: 'Vật liệu chuẩn' },
                                { icon: '👁️', text: 'Giám sát 24/7' },
                                { icon: '📋', text: 'Không phát sinh' },
                                { icon: '🛡️', text: 'Bảo hành lâu dài' },
                            ].map((u, i) => (
                                <div key={i} className="mn-usp-badge">
                                    <span className="mn-usp-check">{u.icon}</span>{u.text}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ====== TABLE CONTENT ====== */}
                    {(() => {
                        if (!q.categories || q.categories.length === 0) {
                            // Fallback: flat items
                            return (
                                <table className="mn-table">
                                    <thead><tr>
                                        <th className="c" style={{ width: 30 }}>STT</th>
                                        <th>Hạng mục</th><th>Diễn giải</th>
                                        <th className="c">ĐVT</th><th className="r">SL</th>
                                        <th className="r">Đơn giá</th><th className="r">Thành tiền</th>
                                    </tr></thead>
                                    <tbody>{q.items?.map((item, i) => (
                                        <tr key={item.id}>
                                            <td className="c">{i + 1}</td>
                                            <td style={{ fontWeight: 600 }}>{item.name}</td>
                                            <td><span className="mn-desc">{item.description}</span></td>
                                            <td className="c">{item.unit}</td>
                                            <td className="r">{fmtNum(item.quantity)}</td>
                                            <td className="r">{fmt(item.unitPrice)}</td>
                                            <td className="r amt">{fmt(item.amount)}</td>
                                        </tr>
                                    ))}</tbody>
                                </table>
                            );
                        }

                        // Group categories by `group` field
                        const grouped = {};
                        const groupOrder = [];
                        q.categories.forEach(cat => {
                            const g = cat.group || cat.name || 'Hạng mục';
                            if (!grouped[g]) { grouped[g] = []; groupOrder.push(g); }
                            grouped[g].push(cat);
                        });

                        return groupOrder.map((groupName, gi) => {
                            const subs = grouped[groupName];
                            const groupTotal = subs.reduce((s, c) => s + (c.subtotal || 0), 0);
                            return (
                                <div key={gi}>
                                    {subs.map((cat, ci) => (
                                        <div key={cat.id || ci}>
                                            {/* Main category + space name merged */}
                                            <div className="mn-cat-main" style={{ marginTop: (gi > 0 || ci > 0) ? 18 : 0 }}>
                                                <span>#{gi + 1}.{ci + 1} {groupName}</span>
                                                <span className="mn-space-name">{cat.name || `Khu vực ${ci + 1}`}</span>
                                            </div>
                                            <div className={cat.image ? 'mn-sub-layout' : ''}>
                                                <div className="mn-sub-table-area">
                                                    <table className="mn-table">
                                                        <thead><tr>
                                                            <th className="c" style={{ width: 28 }}>STT</th>
                                                            <th className="c" style={{ width: 38 }}>Ảnh</th>
                                                            <th>Hạng mục / Sản phẩm</th>
                                                            <th>Diễn giải</th>
                                                            <th className="c" style={{ width: 38 }}>ĐVT</th>
                                                            <th className="r" style={{ width: 40 }}>Dài</th>
                                                            <th className="r" style={{ width: 40 }}>Rộng</th>
                                                            <th className="r" style={{ width: 40 }}>Cao</th>
                                                            <th className="r" style={{ width: 40 }}>SL</th>
                                                            <th className="r" style={{ width: 80 }}>Đơn giá</th>
                                                            <th className="r" style={{ width: 88 }}>Thành tiền</th>
                                                        </tr></thead>
                                                        <tbody>
                                                            {(cat.items || []).map((item, ii) => (
                                                                <tr key={item.id || ii} style={{ background: ii % 2 === 1 ? '#fafbfc' : '#fff' }}>
                                                                    <td className="c" style={{ color: BRAND.textLight, fontSize: 9 }}>{ii + 1}</td>
                                                                    <td className="c">
                                                                        {item.image ? <img src={item.image} className="item-img" alt="" /> : <div className="no-img">—</div>}
                                                                    </td>
                                                                    <td style={{ fontWeight: 600, fontSize: 11 }}>{item.name}</td>
                                                                    <td><span className="mn-desc">{item.description || ''}</span></td>
                                                                    <td className="c">{item.unit}</td>
                                                                    <td className="r">{item.length ? fmtNum(item.length) : ''}</td>
                                                                    <td className="r">{item.width ? fmtNum(item.width) : ''}</td>
                                                                    <td className="r">{item.height ? fmtNum(item.height) : ''}</td>
                                                                    <td className="r">{fmtNum(item.quantity)}</td>
                                                                    <td className="r">{fmt(item.unitPrice)}</td>
                                                                    <td className="r amt">{fmt(item.amount)}</td>
                                                                </tr>
                                                            ))}
                                                            <tr className="mn-sub-total">
                                                                <td colSpan={10} className="r" style={{ paddingRight: 10 }}>Tổng {cat.name || `khu vực #${ci + 1}`}</td>
                                                                <td className="r">{fmt(cat.subtotal)}</td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </div>
                                                {cat.image && (
                                                    <div className="mn-room-image-area">
                                                        <img src={cat.image} className="mn-room-img" alt={cat.name || ''} />
                                                        <div className="mn-room-caption">{cat.name || 'Hình ảnh phòng'}</div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            );
                        });
                    })()}

                    {/* NOTES */}
                    {q.notes && <div className="mn-notes">📝 <strong>Ghi chú:</strong> {q.notes}</div>}

                    {/* ====== SUMMARY ====== */}
                    <div className="mn-summary-wrap">
                        <div className="mn-sum-box">
                            {q.directCost > 0 && <div className="mn-sum-row"><span>Chi phí trực tiếp</span><span>{fmt(q.directCost)}</span></div>}
                            {q.managementFee > 0 && <div className="mn-sum-row"><span>Phí quản lý ({q.managementFeeRate}%)</span><span>{fmt(q.managementFee)}</span></div>}
                            {q.designFee > 0 && <div className="mn-sum-row"><span>Phí thiết kế</span><span>{fmt(q.designFee)}</span></div>}
                            {q.otherFee > 0 && <div className="mn-sum-row"><span>Chi phí khác</span><span>{fmt(q.otherFee)}</span></div>}
                            <div className="mn-sum-row"><span>Tổng trước thuế</span><span style={{ fontWeight: 700 }}>{fmt(q.total)}</span></div>
                            {q.discount > 0 && <div className="mn-sum-row discount"><span>Chiết khấu ({q.discount}%)</span><span>-{fmt(q.total * q.discount / 100)}</span></div>}
                            <div className="mn-sum-row"><span>VAT ({q.vat}%)</span><span>{fmt(vatAmount)}</span></div>
                            <div className="mn-sum-row total"><span>TỔNG GIÁ TRỊ</span><span>{fmt(q.grandTotal)}</span></div>
                        </div>
                    </div>

                    {/* ====== FOOTER: CAM KẾT + KÝ TÊN ====== */}
                    <div className="mn-footer-section">
                        <div className="mn-footer-grid">
                            <div className="mn-validity">
                                <strong>Điều khoản & Cam kết:</strong><br />
                                • Báo giá có hiệu lực {validStr ? `đến ${validStr}` : '30 ngày'} kể từ ngày lập.<br />
                                • Thanh toán theo tiến độ giai đoạn được thỏa thuận trong hợp đồng.<br />
                                • Giá trên đã bao gồm nhân công, vật tư theo bảng chi tiết.<br />
                                • Một Nhà cam kết thi công đúng tiến độ, đúng chất lượng.<br />
                                • Mọi thay đổi phát sinh sẽ được thông báo và xác nhận trước khi thực hiện.
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                                <div className="mn-sign-area">
                                    <div className="mn-sign-title">Đại diện<br />Khách hàng</div>
                                    <div className="mn-sign-line">(Ký, ghi rõ họ tên)</div>
                                </div>
                                <div className="mn-sign-area">
                                    <div className="mn-sign-title">Đại diện<br />Một Nhà</div>
                                    <div className="mn-sign-line">(Ký tên, đóng dấu)</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ====== BRAND FOOTER STRIP ====== */}
                <div className="mn-brand-strip">
                    <div className="mn-strip-left">
                        <strong>MỘT NHÀ</strong> — Nhà ở trọn gói / Nội thất thông minh &nbsp;|&nbsp;
                        Hotline: <strong>(+84) 948 869 89</strong> &nbsp;|&nbsp; www.motnha.vn
                    </div>
                    <div className="mn-strip-right">{q.code} — {dateStr}</div>
                </div>
            </div>
        </>
    );
}