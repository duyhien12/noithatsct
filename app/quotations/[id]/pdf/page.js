'use client';
import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

/* =============================================
   BRAND COLORS - KIẾN TRÚC ĐÔ THỊ SCT
   ============================================= */
const BRAND = {
    blue: '#1e3a5f',        // Navy SCT
    gold: '#E05B0A',        // Orange SCT
    grey: '#C6C6C6',
    dark: '#0f2335',
    white: '#ffffff',
    textDark: '#1e293b',
    textMid: '#475569',
    textLight: '#94a3b8',
};

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Math.round(n || 0));
const fmtNum = (n) => new Intl.NumberFormat('vi-VN').format(n || 0);

/* =============================================
   SỐ TIỀN BẰNG CHỮ (Tiếng Việt)
   ============================================= */
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
    'Thi công điện nước': [
        'Vật liệu chính hãng có CO/CQ',
        'Đội thợ chuyên nghiệp',
        'Không phát sinh ngoài HĐ',
        'Bảo hành hệ thống 2 năm',
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
    'Thi công điện nước': 'BÁO GIÁ THI CÔNG ĐIỆN NƯỚC',
};

/* =============================================
   LOGO SVG - Kim cương chữ K (SCT)
   ============================================= */
function SCTLogo({ size = 68 }) {
    // Geometric K logo matching SCT brand - angular overlapping shapes
    return (
        <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="100" height="100" rx="8" fill={BRAND.gold} />
            {/* Left vertical bar of K */}
            <rect x="20" y="18" width="18" height="64" rx="2" fill="white" />
            {/* Upper diagonal of K */}
            <polygon points="38,50 72,18 88,18 55,50" fill="white" />
            {/* Lower diagonal of K */}
            <polygon points="38,50 72,82 88,82 55,50" fill="white" />
            {/* Notch for authenticity */}
            <polygon points="38,50 55,40 55,60" fill={BRAND.gold} />
        </svg>
    );
}

/* =============================================
   MAIN COMPONENT
   ============================================= */
async function toDataUrl(url) {
    try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const blob = await res.blob();
        return await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
        });
    } catch {
        return null;
    }
}

export default function QuotationPDFPage() {
    const { id } = useParams();
    const [data, setData] = useState(null);
    const [copied, setCopied] = useState(false);
    const [imgCache, setImgCache] = useState({});

    useEffect(() => {
        fetch(`/api/quotations/${id}`)
            .then(r => { if (!r.ok) throw new Error('Not found'); return r.json(); })
            .then(async (d) => {
                setData(d);
                const code = d.code || '';
                const cust = d.customer?.name || '';
                const type = d.type || '';
                document.title = [code, cust, type].filter(Boolean).join('_');

                // Pre-fetch all images as base64 so they embed correctly in PDF export
                const urls = new Set();
                (d.categories || []).forEach(cat => {
                    if (cat.image) urls.add(cat.image);
                    (cat.items || []).forEach(item => { if (item.image) urls.add(item.image); });
                });
                const entries = await Promise.all(
                    Array.from(urls).map(async url => [url, await toDataUrl(url)])
                );
                const cache = {};
                entries.forEach(([url, dataUrl]) => { if (dataUrl) cache[url] = dataUrl; });
                setImgCache(cache);
            })
            .catch(() => setData({ error: true }));
    }, [id]);

    const resolveImg = (url) => imgCache[url] || url;

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
                    .header { display: none !important; }
                    .sidebar { display: none !important; }
                    body { background: white !important; }
                    .pdf-page {
                        box-shadow: none !important;
                        margin: 0 !important;
                        max-width: 100% !important;
                        border-radius: 0 !important;
                    }
                    @page {
                        size: A4 landscape;
                        margin: 0;
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
                    padding-top: 20px;
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
                    padding: 6px 38px;
                    font-size: 10px;
                    font-style: italic;
                    color: ${BRAND.textMid};
                    position: relative;
                    z-index: 1;
                }
                .mn-doc-bar .code { font-weight: 700; color: ${BRAND.blue}; font-style: italic; }
                .mn-doc-bar .meta { font-weight: 400; font-style: italic; }

                /* ====== CONTENT AREA ====== */
                .mn-content { padding: 0 38px 28px; position: relative; z-index: 1; }

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
                    border-collapse: separate;
                    border-spacing: 0;
                    font-size: 10.5px;
                    margin-bottom: 2px;
                    border-radius: 0 0 6px 6px;
                    overflow: hidden;
                    border: 1px solid ${BRAND.grey};
                    border-top: none;
                }
                .mn-table th {
                    background: #e8ecf4;
                    color: ${BRAND.blue};
                    font-weight: 700;
                    padding: 8px 6px;
                    font-size: 9px;
                    text-transform: uppercase;
                    letter-spacing: 0.3px;
                    white-space: nowrap;
                    border-bottom: 2px solid ${BRAND.blue}30;
                }
                .mn-table td {
                    border-bottom: 1px solid ${BRAND.grey};
                    border-right: 1px solid ${BRAND.grey}08;
                    padding: 6px 6px;
                    vertical-align: middle;
                    font-weight: 400;
                }
                .mn-table td:last-child { border-right: none; }
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
                    background: linear-gradient(135deg, ${BRAND.blue} 0%, #1a327a 100%);
                    color: #fff;
                    padding: 0;
                    border-radius: 8px 8px 0 0;
                    overflow: hidden;
                    display: flex;
                    align-items: stretch;
                }
                .mn-cat-group-label {
                    background: ${BRAND.gold};
                    color: #fff;
                    padding: 0 14px;
                    font-size: 10px;
                    font-weight: 800;
                    letter-spacing: 0.5px;
                    display: flex;
                    align-items: center;
                    white-space: nowrap;
                    min-width: 36px;
                    justify-content: center;
                }
                .mn-cat-room-block {
                    flex: 1;
                    padding: 10px 18px;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    gap: 2px;
                }
                .mn-cat-room-subtitle {
                    font-size: 8px;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 2px;
                    color: ${BRAND.gold};
                    opacity: 0.9;
                }
                .mn-space-name {
                    font-weight: 900;
                    font-size: 15px;
                    letter-spacing: 1px;
                    text-transform: uppercase;
                    color: #ffffff;
                    text-shadow: 0 1px 4px rgba(0,0,0,0.25);
                    line-height: 1.2;
                }
                .mn-sub-total td {
                    background: linear-gradient(135deg, ${BRAND.blue}0A 0%, ${BRAND.blue}15 100%);
                    font-weight: 800;
                    font-size: 11.5px;
                    color: ${BRAND.blue};
                    border-top: 2px solid ${BRAND.gold};
                    padding: 9px 10px;
                    letter-spacing: 0.3px;
                }
                .mn-sub-total td:last-child {
                    color: ${BRAND.blue};
                    font-size: 12.5px;
                    white-space: nowrap;
                }
                .mn-desc { font-size: 9.5px; color: ${BRAND.textMid}; font-style: italic; }
                .item-img { width: 40px; height: 40px; object-fit: cover; border-radius: 4px; display: block; margin: 2px auto; }
                .no-img { color: #ccc; font-size: 10px; text-align: center; }

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
                .mn-summary-wrap {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-end;
                    gap: 20px;
                    margin: 20px 0;
                }
                .mn-sum-words {
                    flex: 1;
                    padding: 12px 16px;
                    background: ${BRAND.blue}05;
                    border: 1px solid ${BRAND.blue}20;
                    border-left: 3px solid ${BRAND.blue};
                    border-radius: 6px;
                    font-size: 10.5px;
                    color: ${BRAND.textMid};
                    line-height: 1.6;
                }
                .mn-sum-words-label {
                    display: block;
                    font-size: 8px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 1.5px;
                    color: ${BRAND.blue};
                    margin-bottom: 5px;
                    opacity: 0.8;
                }
                .mn-sum-words-text {
                    color: ${BRAND.textDark};
                    font-weight: 600;
                    font-style: italic;
                }
                .mn-sum-box {
                    width: 310px;
                    flex-shrink: 0;
                    border: 1px solid ${BRAND.grey};
                    border-radius: 6px;
                    overflow: hidden;
                }
                .mn-sum-row {
                    display: flex;
                    justify-content: space-between;
                    padding: 7px 14px;
                    font-size: 10.5px;
                    font-weight: 500;
                    border-bottom: 1px solid #f1f5f9;
                }
                .mn-sum-row.total {
                    background: linear-gradient(135deg, ${BRAND.blue} 0%, #1a327a 100%);
                    color: rgba(255,255,255,0.85);
                    font-weight: 700;
                    font-size: 11.5px;
                    border: none;
                    letter-spacing: 0.3px;
                    padding: 11px 14px;
                }
                .mn-sum-row.total span:last-child {
                    color: ${BRAND.gold};
                    font-weight: 900;
                    font-size: 13px;
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
                    margin-bottom: 8px;
                }
                .mn-sign-space {
                    height: 80px;
                    position: relative;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .mn-stamp-circle {
                    width: 72px;
                    height: 72px;
                    border-radius: 50%;
                    border: 2px dashed ${BRAND.blue}40;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 8px;
                    color: ${BRAND.blue}40;
                    font-style: italic;
                    text-align: center;
                    line-height: 1.4;
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
                    content: 'SCT  SCT  SCT  SCT  SCT  SCT  SCT  SCT  SCT';
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
                <div className="watermark">SCT</div>

                {/* ====== HEADER SCT ====== */}
                {/* Partner brands strip - colorful gradient border top */}
                <div style={{ background: '#f8f9fa', borderTop: '4px solid', borderImage: 'linear-gradient(90deg, #e63946, #f4a261, #2a9d8f, #264653, #e76f51, #4361ee) 1', borderBottom: '1px solid #e5e7eb', padding: '7px 28px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 28 }}>
                    {[
                        { name: 'AN CƯỜNG', color: '#1a5276', bg: '#eaf2fb' },
                        { name: 'AConcept', color: '#1b2631', bg: '#f0f3f4' },
                        { name: 'MALLOCA', color: '#d4ac0d', bg: '#fef9e7' },
                        { name: 'VICOSTONE', color: '#1a5276', bg: '#eaf2fb' },
                        { name: 'A.O.Smith', color: '#1e8449', bg: '#eafaf1' },
                        { name: 'Schneider', color: '#1e8449', bg: '#eafaf1' },
                        { name: 'HIGOLD', color: '#7d6608', bg: '#fef9e7' },
                        { name: 'blum', color: '#922b21', bg: '#fdedec' },
                    ].map(b => (
                        <span key={b.name} style={{ fontSize: 9.5, fontWeight: 800, color: b.color, letterSpacing: 0.5, padding: '3px 10px', borderRadius: 4, background: b.bg, border: `1px solid ${b.color}30`, whiteSpace: 'nowrap' }}>{b.name}</span>
                    ))}
                </div>

                {/* Company header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '14px 28px 12px', background: 'linear-gradient(135deg, #fff 0%, #fff8f5 100%)', borderBottom: `3px solid ${BRAND.gold}` }}>
                    <SCTLogo size={68} />
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 18, fontWeight: 900, color: BRAND.gold, letterSpacing: 1.5, textTransform: 'uppercase', lineHeight: 1.2 }}>Công ty TNHH Kiến Trúc Đô Thị SCT</div>
                        <div style={{ fontSize: 10, color: '#7f8c8d', marginTop: 5, lineHeight: 2 }}>
                            <span style={{ marginRight: 12 }}>📍 149 Đ. Nguyễn Tất Thành - P. Yên Thịnh - TP. Yên Bái - T. Yên Bái</span><br />
                            <span style={{ marginRight: 16 }}>☎ Hotline: <strong style={{ color: BRAND.gold, fontSize: 11 }}>0914 99 88 22</strong></span>
                            <span style={{ marginRight: 16 }}>🌐 www.kientrucsct.com</span>
                            <span>Zalo OA: Kiến trúc đô thị SCT</span>
                        </div>
                        <div style={{ fontSize: 9, color: '#aaa', fontStyle: 'italic', marginTop: 1 }}>facebook.com/kientrucyenbai</div>
                    </div>
                    <div style={{ textAlign: 'right', paddingLeft: 20, borderLeft: `4px solid ${BRAND.gold}` }}>
                        <div style={{ fontSize: 26, fontWeight: 900, color: BRAND.blue, textTransform: 'uppercase', letterSpacing: 3, lineHeight: 1.1 }}>BẢNG BÁO GIÁ</div>
                        <div style={{ fontSize: 10, color: BRAND.textMid, marginTop: 6, lineHeight: 1.8 }}>
                            <div><strong style={{ color: BRAND.gold, fontSize: 12 }}>{q.code}</strong></div>
                            <div>Ngày lập: <strong>{dateStr}</strong></div>
                            {validStr && <div>Hiệu lực đến: <strong>{validStr}</strong></div>}
                        </div>
                    </div>
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
                                {q.project?.address && <>Địa điểm: {q.project.address}<br /></>}
                                <span style={{ color: BRAND.gold, fontWeight: 600 }}>Hạng mục: {q.type || 'Thi công'}</span>
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
                        const toRoman = (n) => {
                            const vals = [1000,900,500,400,100,90,50,40,10,9,5,4,1];
                            const syms = ['M','CM','D','CD','C','XC','L','XL','X','IX','V','IV','I'];
                            let r = '';
                            for (let i = 0; i < vals.length; i++) {
                                while (n >= vals[i]) { r += syms[i]; n -= vals[i]; }
                            }
                            return r;
                        };
                        const fmtAmt = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(n || 0));
                        const isDienNuoc = q.type === 'Thi công điện nước';
                        const isTongHop = q.type === 'Tổng hợp chi phí hoàn thiện';

                        if (!q.categories || q.categories.length === 0) {
                            return (
                                <table className="mn-table">
                                    <thead><tr>
                                        <th className="c" style={{ width: 36 }}>STT</th>
                                        <th>TÊN HẠNG MỤC</th>
                                        <th className="c" style={{ width: 44 }}>ĐVT</th>
                                        <th className="r" style={{ width: 44 }}>SL</th>
                                        <th className="r" style={{ width: 90 }}>ĐƠN GIÁ</th>
                                        <th className="r" style={{ width: 100 }}>THÀNH TIỀN</th>
                                    </tr></thead>
                                    <tbody>{q.items?.map((item, i) => (
                                        <tr key={item.id}>
                                            <td className="c">{i + 1}</td>
                                            <td>
                                                <div style={{ fontWeight: 600 }}>{item.name}</div>
                                                {item.description && <div style={{ fontSize: 9, color: BRAND.textMid, fontStyle: 'italic', marginTop: 2 }}>{item.description}</div>}
                                            </td>
                                            <td className="c">{item.unit}</td>
                                            <td className="r">{fmtAmt(item.quantity)}</td>
                                            <td className="r">{fmtAmt(item.unitPrice)}</td>
                                            <td className="r amt">{fmtAmt(item.amount)}</td>
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

                        return (
                            <table className="mn-table" style={{ borderRadius: 6, overflow: 'hidden' }}>
                                <thead>
                                    <tr>
                                        <th className="c" style={{ width: 36 }}>STT</th>
                                        <th style={{ textAlign: 'left' }}>TÊN HẠNG MỤC</th>
                                        {!isTongHop && <th className="c" style={{ width: 44 }}>ĐVT</th>}
                                        {!isTongHop && <th className="r" style={{ width: 44 }}>SL</th>}
                                        {!isTongHop && <th className="r" style={{ width: 90 }}>ĐƠN GIÁ</th>}
                                        <th className="r" style={{ width: 110 }}>THÀNH TIỀN</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {groupOrder.map((groupName, gi) => {
                                        const subs = grouped[groupName];
                                        const groupTotal = subs.reduce((s, c) => s + (c.subtotal || 0), 0);
                                        const catLetter = String.fromCharCode(65 + gi);
                                        return (
                                            <React.Fragment key={gi}>
                                                {/* ── Hàng A/B/C: Hạng mục chính ── */}
                                                <tr style={{ background: BRAND.blue }}>
                                                    <td className="c" style={{ fontWeight: 900, fontSize: 13, color: '#fff', padding: '9px 6px' }}>{catLetter}</td>
                                                    <td colSpan={isTongHop ? 1 : 4} style={{ fontWeight: 800, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: '#fff', padding: '9px 8px' }}>{groupName}</td>
                                                    <td className="r" style={{ fontWeight: 900, fontSize: 12, color: BRAND.gold, padding: '9px 8px', whiteSpace: 'nowrap' }}>{fmtAmt(groupTotal)}</td>
                                                </tr>

                                                {subs.map((cat, ci) => (
                                                    <React.Fragment key={cat.id || ci}>
                                                        {/* ── Hàng I/II/III: Phân mục ── */}
                                                        <tr style={{ background: '#f0f2f5' }}>
                                                            <td className="c" style={{ fontWeight: 700, fontSize: 11, color: BRAND.blue, fontStyle: 'italic' }}>{toRoman(ci + 1)}</td>
                                                            {isDienNuoc ? (
                                                                <>
                                                                    <td style={{ fontWeight: 700, fontSize: 11, color: BRAND.textDark, fontStyle: 'italic', padding: '7px 8px' }}>{cat.name || `Khu vực ${ci + 1}`}</td>
                                                                    <td className="c" style={{ fontWeight: 700, fontSize: 10, color: BRAND.blue }}>{cat.sharedUnit || 'trọn gói'}</td>
                                                                    <td className="r" style={{ fontWeight: 700, fontSize: 10, color: BRAND.blue }}>{fmtAmt(cat.sharedQuantity ?? 1)}</td>
                                                                    <td className="r" style={{ fontWeight: 700, fontSize: 10, color: BRAND.blue }}>{fmtAmt(cat.sharedUnitPrice || (cat.subtotal / (cat.sharedQuantity || 1)))}</td>
                                                                    <td className="r" style={{ fontWeight: 700, fontSize: 11, color: BRAND.blue, padding: '7px 8px', whiteSpace: 'nowrap' }}>{fmtAmt(cat.subtotal || 0)}</td>
                                                                </>
                                                            ) : isTongHop ? (
                                                                <>
                                                                    <td style={{ fontWeight: 700, fontSize: 11, color: BRAND.textDark, fontStyle: 'italic', padding: '7px 8px' }}>{cat.name || `Khu vực ${ci + 1}`}</td>
                                                                    <td className="r" style={{ fontWeight: 700, fontSize: 11, color: BRAND.blue, padding: '7px 8px', whiteSpace: 'nowrap' }}>{fmtAmt(cat.subtotal || 0)}</td>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <td colSpan={4} style={{ fontWeight: 700, fontSize: 11, color: BRAND.textDark, fontStyle: 'italic', padding: '7px 8px' }}>{cat.name || `Khu vực ${ci + 1}`}</td>
                                                                    <td className="r" style={{ fontWeight: 700, fontSize: 11, color: BRAND.blue, padding: '7px 8px', whiteSpace: 'nowrap' }}>{fmtAmt(cat.subtotal || 0)}</td>
                                                                </>
                                                            )}
                                                        </tr>

                                                        {/* ── Ảnh khu vực (subcategory image) ── */}
                                                        {imgCache[cat.image] && (
                                                            <tr>
                                                                <td colSpan={6} style={{ padding: '6px 8px 8px' }}>
                                                                    <img src={resolveImg(cat.image)} alt="" style={{ maxWidth: '100%', maxHeight: 220, objectFit: 'contain', borderRadius: 4, border: `1px solid ${BRAND.blue}20`, display: 'block' }} />
                                                                </td>
                                                            </tr>
                                                        )}

                                                        {/* ── Hàng 1/2/3: Items ── */}
                                                        {(cat.items || []).map((item, ii) => (
                                                            <React.Fragment key={item.id || ii}>
                                                                <tr style={{ background: ii % 2 === 1 ? '#fafbfc' : '#fff' }}>
                                                                    <td className="c" style={{ color: BRAND.textMid, fontSize: 10 }}>{ii + 1}</td>
                                                                    {isDienNuoc ? (
                                                                        <td colSpan={5} style={{ padding: '6px 8px' }}>
                                                                            <div style={{ fontWeight: 600, fontSize: 11, color: BRAND.textDark }}>{item.name}</div>
                                                                            {item.description && <div style={{ fontSize: 9, color: BRAND.textMid, fontStyle: 'italic', marginTop: 2, lineHeight: 1.4 }}>{item.description}</div>}
                                                                            {imgCache[item.image] && <img src={resolveImg(item.image)} alt="" style={{ marginTop: 6, width: '100%', maxWidth: 220, height: 140, objectFit: 'cover', borderRadius: 5, border: '1px solid #e2e8f0', display: 'block' }} />}
                                                                        </td>
                                                                    ) : isTongHop ? (
                                                                        <>
                                                                            <td style={{ padding: '6px 8px' }}>
                                                                                <div style={{ fontWeight: 600, fontSize: 11, color: BRAND.textDark }}>{item.name}</div>
                                                                                {item.description && <div style={{ fontSize: 9, color: BRAND.textMid, fontStyle: 'italic', marginTop: 2, lineHeight: 1.4 }}>{item.description}</div>}
                                                                            </td>
                                                                            <td className="r" style={{ fontWeight: 700, color: BRAND.blue, fontSize: 11 }}>{fmtAmt(item.amount)}</td>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <td style={{ padding: '6px 8px' }}>
                                                                                <div style={{ fontWeight: 600, fontSize: 11, color: BRAND.textDark }}>{item.name}</div>
                                                                                {item.description && <div style={{ fontSize: 9, color: BRAND.textMid, fontStyle: 'italic', marginTop: 2, lineHeight: 1.4 }}>{item.description}</div>}
                                                                                {imgCache[item.image] && <img src={resolveImg(item.image)} alt="" style={{ marginTop: 6, width: '100%', maxWidth: 220, height: 140, objectFit: 'cover', borderRadius: 5, border: '1px solid #e2e8f0', display: 'block' }} />}
                                                                            </td>
                                                                            <td className="c" style={{ fontSize: 10 }}>{item.unit}</td>
                                                                            <td className="r" style={{ fontSize: 10 }}>{fmtAmt(item.volume || item.quantity)}</td>
                                                                            <td className="r" style={{ fontSize: 10 }}>{fmtAmt(item.unitPrice)}</td>
                                                                            <td className="r" style={{ fontWeight: 700, color: BRAND.blue, fontSize: 11 }}>{fmtAmt(item.amount)}</td>
                                                                        </>
                                                                    )}
                                                                </tr>
                                                                {/* Sub-items (phụ kiện) */}
                                                                {(item.subItems || []).map((si, sii) => (
                                                                    <tr key={`sub-${ii}-${sii}`} style={{ background: '#f8f9fc' }}>
                                                                        <td className="c" style={{ fontSize: 8, opacity: 0.35 }}>↳</td>
                                                                        {isDienNuoc ? (
                                                                            <td colSpan={5} style={{ paddingLeft: 22, padding: '4px 8px 4px 22px' }}>
                                                                                <div style={{ fontSize: 10, fontStyle: 'italic', color: BRAND.textMid }}>{si.name}</div>
                                                                                {si.description && <div style={{ fontSize: 8, color: BRAND.textLight, marginTop: 1 }}>{si.description}</div>}
                                                                            </td>
                                                                        ) : isTongHop ? (
                                                                            <>
                                                                                <td style={{ paddingLeft: 22, padding: '4px 8px 4px 22px' }}>
                                                                                    <div style={{ fontSize: 10, fontStyle: 'italic', color: BRAND.textMid }}>{si.name}</div>
                                                                                    {si.description && <div style={{ fontSize: 8, color: BRAND.textLight, marginTop: 1 }}>{si.description}</div>}
                                                                                </td>
                                                                                <td className="r" style={{ fontSize: 9, opacity: 0.7 }}>{fmtAmt(si.amount || 0)}</td>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <td style={{ paddingLeft: 22, padding: '4px 8px 4px 22px' }}>
                                                                                    <div style={{ fontSize: 10, fontStyle: 'italic', color: BRAND.textMid }}>{si.name}</div>
                                                                                    {si.description && <div style={{ fontSize: 8, color: BRAND.textLight, marginTop: 1 }}>{si.description}</div>}
                                                                                </td>
                                                                                <td className="c" style={{ fontSize: 9 }}>{si.unit}</td>
                                                                                <td className="r" style={{ fontSize: 9 }}>{fmtAmt(si.volume || si.quantity)}</td>
                                                                                <td className="r" style={{ fontSize: 9 }}>{fmtAmt(si.unitPrice)}</td>
                                                                                <td className="r" style={{ fontSize: 9, opacity: 0.7 }}>{fmtAmt(si.amount || 0)}</td>
                                                                            </>
                                                                        )}
                                                                    </tr>
                                                                ))}
                                                            </React.Fragment>
                                                        ))}
                                                    </React.Fragment>
                                                ))}
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        );
                    })()}

                    {/* NOTES */}
                    {q.notes && <div className="mn-notes">📝 <strong>Ghi chú:</strong> {q.notes}</div>}

                    {/* ====== SUMMARY ====== */}
                    <div className="mn-summary-wrap">
                        <div className="mn-sum-words">
                            <span className="mn-sum-words-label">Tổng giá trị bằng chữ</span>
                            <span className="mn-sum-words-text">{numberToWords(q.grandTotal >= 999999 ? Math.floor(q.grandTotal / 1000000) * 1000000 : Math.round(q.grandTotal))}</span>
                        </div>
                        <div className="mn-sum-box">
                            {q.otherFee > 0 && <div className="mn-sum-row"><span>Vận chuyển, lắp đặt</span><span>{fmt(q.otherFee)}</span></div>}
                            <div className="mn-sum-row"><span>Tổng cộng</span><span style={{ fontWeight: 700 }}>{fmt(q.total)}</span></div>
                            {q.discount > 0 && <div className="mn-sum-row discount"><span>Chiết khấu ({q.discount}%)</span><span>-{fmt(q.total * q.discount / 100)}</span></div>}
                            {/* Deductions / Promotions */}
                            {(q.deductions || []).length > 0 && (q.deductions || []).map((d, di) => (
                                <div key={di} className="mn-sum-row discount">
                                    <span>{d.type === 'khuyến mại' ? '🎁 KM' : '📉 GT'} {d.name}</span>
                                    <span>-{fmt(d.amount)}</span>
                                </div>
                            ))}
                            <div style={{ fontSize: 8, color: '#888', fontStyle: 'italic', textAlign: 'right', padding: '3px 0' }}>* Đơn giá đã bao gồm VAT</div>
                            <div className="mn-sum-row total"><span>TỔNG GIÁ TRỊ</span><span>{fmt(q.grandTotal)}</span></div>
                            {q.grandTotal >= 999999 && (
                                <div className="mn-sum-row total" style={{ marginTop: 3, opacity: 0.9 }}>
                                    <span>TỔNG GIÁ TRỊ LÀM TRÒN</span>
                                    <span>{fmt(Math.floor(q.grandTotal / 1000000) * 1000000)}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ====== FOOTER: CAM KẾT + KÝ TÊN ====== */}
                    <div className="mn-footer-section">
                        <div className="mn-footer-grid">
                            <div className="mn-validity">
                                <strong>Điều khoản & Cam kết:</strong><br />
                                {q.terms ? (
                                    <span style={{ whiteSpace: 'pre-wrap' }}>{q.terms}</span>
                                ) : (<>
                                    • Báo giá có hiệu lực {validStr ? `đến ${validStr}` : '30 ngày'} kể từ ngày lập.<br />
                                    • Thanh toán theo tiến độ giai đoạn được thỏa thuận trong hợp đồng.<br />
                                    • Giá trên đã bao gồm nhân công, vật tư theo bảng chi tiết.<br />
                                    • SCT cam kết thi công đúng tiến độ, đúng chất lượng.<br />
                                    • Mọi thay đổi phát sinh sẽ được thông báo và xác nhận trước khi thực hiện.
                                </>)}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                                <div className="mn-sign-area">
                                    <div className="mn-sign-title">Đại diện<br />Khách hàng</div>
                                    <div className="mn-sign-space"></div>
                                    <div className="mn-sign-line">(Ký, ghi rõ họ tên)</div>
                                </div>
                                <div className="mn-sign-area">
                                    <div className="mn-sign-title">Đại diện<br />Kiến Trúc Đô Thị SCT</div>
                                    <div className="mn-sign-space">
                                        <div className="mn-stamp-circle">Dấu<br />công ty</div>
                                    </div>
                                    <div className="mn-sign-line">(Ký tên, đóng dấu)</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ====== GHI CHÚ + LỊCH THANH TOÁN ====== */}
                <div style={{ padding: '14px 28px 10px', borderTop: '2px solid #e2e8f0' }}>
                    {/* Gift promo banner — only show if explicitly filled */}
                    {q.promoText?.trim() && (
                        <div style={{ background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)', color: '#fff', borderRadius: 6, padding: '7px 14px', marginBottom: 12, textAlign: 'center', fontSize: 10, fontWeight: 700, letterSpacing: 0.5 }}>
                            {q.promoText.trim()}
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: q.type === 'Tổng hợp chi phí hoàn thiện' ? '1fr' : '1fr 1fr', gap: 16, alignItems: 'start' }}>
                        {/* Ghi chú */}
                        <div>
                            <div style={{ fontSize: 9, fontWeight: 700, color: BRAND.blue, borderBottom: `1.5px solid ${BRAND.gold}`, paddingBottom: 3, marginBottom: 6 }}>GHI CHÚ</div>
                            <div style={{ fontSize: 8.5, color: '#374151', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
                                {q.notes || '• Báo giá chỉ bao gồm các hạng mục nêu trong bảng, không bao gồm phần xây dựng thô.\n• Màu sắc, chủng loại vật liệu theo thỏa thuận hợp đồng.\n• SCT cam kết thi công đúng tiến độ, đúng chất lượng, bảo hành theo quy định.\n• Mọi thay đổi phát sinh sẽ được thông báo và xác nhận trước khi thực hiện.'}
                            </div>
                        </div>

                        {/* Lịch thanh toán — ẩn với Tổng hợp chi phí hoàn thiện */}
                        {q.type !== 'Tổng hợp chi phí hoàn thiện' && <div>
                            <div style={{ fontSize: 9, fontWeight: 700, color: BRAND.blue, borderBottom: `1.5px solid ${BRAND.gold}`, paddingBottom: 3, marginBottom: 6 }}>LỊCH THANH TOÁN</div>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 8.5 }}>
                                <thead>
                                    <tr style={{ background: BRAND.blue, color: '#fff' }}>
                                        <th style={{ padding: '4px 6px', textAlign: 'left', fontWeight: 600 }}>Nội dung</th>
                                        <th style={{ padding: '4px 6px', textAlign: 'center', fontWeight: 600, width: 40 }}>Tỷ lệ</th>
                                        <th style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 600, width: 90 }}>Thành tiền</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(q.paymentSchedule && Array.isArray(q.paymentSchedule) && q.paymentSchedule.length > 0
                                        ? q.paymentSchedule
                                        : [
                                            { desc: 'Tạm ứng khi ký hợp đồng', pct: 50 },
                                            { desc: 'Khi hoàn thành tường ngăn phòng', pct: 20 },
                                            { desc: 'Khi trát hoàn thiện xong', pct: 20 },
                                            { desc: 'Nghiệm thu & bàn giao', pct: 10 },
                                        ]
                                    ).map((row, i) => {
                                        const baseTotal = q.grandTotal >= 999999 ? Math.floor(q.grandTotal / 1000000) * 1000000 : q.grandTotal;
                                        return (
                                        <tr key={i} style={{ background: i % 2 === 0 ? '#f8fafc' : '#fff' }}>
                                            <td style={{ padding: '4px 6px', color: '#374151' }}>{row.desc}</td>
                                            <td style={{ padding: '4px 6px', textAlign: 'center', fontWeight: 600, color: BRAND.gold }}>{row.pct}%</td>
                                            <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 600 }}>{fmt(baseTotal * row.pct / 100)}</td>
                                        </tr>
                                        );
                                    })}
                                    <tr style={{ background: BRAND.blue, color: '#fff' }}>
                                        <td style={{ padding: '4px 6px', fontWeight: 700 }}>TỔNG CỘNG</td>
                                        <td style={{ padding: '4px 6px', textAlign: 'center', fontWeight: 700 }}>100%</td>
                                        <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 700 }}>{fmt(q.grandTotal >= 999999 ? Math.floor(q.grandTotal / 1000000) * 1000000 : q.grandTotal)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>}
                    </div>
                </div>

                {/* ====== BRAND FOOTER STRIP ====== */}
                <div style={{ background: `linear-gradient(135deg, ${BRAND.blue} 0%, #0f2335 100%)`, padding: '10px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <SCTLogo size={28} />
                        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.85)', lineHeight: 1.7 }}>
                            <div><strong style={{ color: BRAND.gold, fontSize: 10 }}>CÔNG TY TNHH KIẾN TRÚC ĐÔ THỊ SCT</strong> — Cùng bạn xây dựng ước mơ</div>
                            <div>Hotline: <strong style={{ color: BRAND.gold }}>0914 99 88 22</strong> &nbsp;·&nbsp; www.kientrucsct.com &nbsp;·&nbsp; 149 Đ. Nguyễn Tất Thành, P. Yên Thịnh, TP. Yên Bái</div>
                        </div>
                    </div>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)', textAlign: 'right' }}>
                        <div>{q.code} — {dateStr}</div>
                        <div style={{ fontSize: 8 }}>Tài liệu nội bộ — không sao chép</div>
                    </div>
                </div>
            </div>
        </>
    );
}