'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(n || 0));
const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const COST_TYPES = ['Tất cả', 'Vật tư', 'Nhân công', 'Thầu phụ', 'Khác'];

const thStyle = { background: '#1e3a5f', color: 'white', fontWeight: 700, textAlign: 'center', fontSize: 11, padding: '8px 6px', border: '1px solid #1e3a5f', whiteSpace: 'nowrap' };
const cellStyle = { border: '1px solid #d1d5db', padding: '5px 7px', fontSize: 12 };
const inpStyle = { width: '100%', padding: '3px 5px', fontSize: 11, border: '1px solid #93c5fd', borderRadius: 3, outline: 'none', background: '#eff6ff', boxSizing: 'border-box' };

const fmtDate = () => new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

const UNIT_LIST = ['m2', 'm3', 'Cái', 'TG', 'Tầng', 'md', 'Bộ'];

function UnitInput({ value, onChange, onBlur, style, placeholder }) {
    const [open, setOpen] = useState(false);
    const suggestions = value
        ? UNIT_LIST.filter(u => u.toLowerCase().includes(value.toLowerCase()))
        : UNIT_LIST;
    return (
        <div style={{ position: 'relative' }}>
            <input
                style={style}
                value={value}
                placeholder={placeholder || 'm², cái...'}
                onChange={e => { onChange(e.target.value); setOpen(true); }}
                onFocus={() => setOpen(true)}
                onBlur={() => { setTimeout(() => setOpen(false), 150); if (onBlur) onBlur(); }}
            />
            {open && suggestions.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, minWidth: 80, background: '#fff', border: '1px solid #93c5fd', borderRadius: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.12)', zIndex: 300 }}>
                    {suggestions.map(u => (
                        <div key={u}
                            onMouseDown={() => { onChange(u); setOpen(false); }}
                            style={{ padding: '5px 10px', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#eff6ff'}
                            onMouseLeave={e => e.currentTarget.style.background = ''}>
                            {u}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function buildPrintHTML(project, items, summary) {
    const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(n || 0));

    // Build hierarchy
    const hierarchy = {};
    const g1Order = [];
    items.forEach(item => {
        const g1 = item.group1 || 'Chưa phân loại';
        const g2 = item.group2 || '';
        if (!hierarchy[g1]) { hierarchy[g1] = { subgroups: {}, g2Order: [], direct: [] }; g1Order.push(g1); }
        if (g2) {
            if (!hierarchy[g1].subgroups[g2]) { hierarchy[g1].subgroups[g2] = []; hierarchy[g1].g2Order.push(g2); }
            hierarchy[g1].subgroups[g2].push(item);
        } else { hierarchy[g1].direct.push(item); }
    });

    let rowsHTML = '';
    let globalStt = 0;

    g1Order.forEach((g1) => {
        const d = hierarchy[g1];
        const allG1 = [...d.direct, ...Object.values(d.subgroups).flat()];
        const g1Budget = allG1.reduce((s, i) => s + (i.budgetTotal || 0), 0);
        const g1Actual = allG1.reduce((s, i) => s + (i.actualTotal || 0), 0);
        const g1Var = g1Budget - g1Actual;

        rowsHTML += `<tr class="g1-header">
          <td colspan="10">
            <span class="g1-bar"></span>
            ${g1}
            <span style="margin-left:16px;font-size:10px;opacity:.85">DT: ${fmt(g1Budget)}</span>
            ${g1Actual > 0 ? `<span style="margin-left:10px;font-size:10px;color:${g1Var >= 0 ? '#86efac' : '#fca5a5'}">${g1Var >= 0 ? '+' : ''}${fmt(g1Var)}</span>` : ''}
          </td>
        </tr>`;

        const g2Keys = d.g2Order.filter((v, i, a) => a.indexOf(v) === i);
        const sections = [];
        if (d.direct.length) sections.push({ label: g1, items: d.direct, g2: '' });
        g2Keys.forEach(g2 => sections.push({ label: g2, items: d.subgroups[g2] || [], g2 }));

        sections.forEach(({ label, items: si }, si2) => {
            const sBudget = si.reduce((s, i) => s + (i.budgetTotal || 0), 0);
            const sActual = si.reduce((s, i) => s + (i.actualTotal || 0), 0);
            const sVar = sBudget - sActual;

            if (sections.length > 1 || label !== g1) {
                rowsHTML += `<tr class="g2-header"><td colspan="10">${ALPHA[si2]}. &nbsp;${label}</td></tr>`;
            }

            si.forEach((item, rowIdx) => {
                globalStt++;
                const sectionStt = rowIdx + 1;
                const ap = item.avgActualPrice || 0;
                const p = item.budgetUnitPrice || 0;
                const variance = (item.budgetTotal || 0) - (item.actualTotal || 0);
                const rowClass = sectionStt % 2 === 0 ? ' class="even"' : '';
                rowsHTML += `<tr${rowClass}>
                    <td class="center num">${sectionStt}</td>
                    <td class="name-cell">${item.productName || ''}${item.productCode ? `<br><span class="sub">${item.productCode}</span>` : ''}</td>
                    <td class="center">${item.unit || ''}</td>
                    <td class="right">${item.budgetQty || 0}</td>
                    <td class="right">${p > 0 ? fmt(p) : '—'}</td>
                    <td class="right blue bold">${fmt(item.budgetTotal || 0)}</td>
                    <td class="right">${item.actualQty > 0 ? item.actualQty : '—'}</td>
                    <td class="right ${ap > p * 1.05 ? 'red' : ap > 0 ? 'orange' : 'muted'}">${ap > 0 ? fmt(ap) : '—'}</td>
                    <td class="right ${item.actualTotal > item.budgetTotal * 1.05 ? 'red bold' : item.actualTotal > 0 ? 'orange bold' : 'muted'}">${item.actualTotal > 0 ? fmt(item.actualTotal) : '—'}</td>
                    <td class="right ${variance >= 0 ? 'green bold' : 'red bold'}">${item.actualTotal > 0 ? (variance >= 0 ? '+' : '') + fmt(variance) : '—'}</td>
                </tr>`;
            });

            rowsHTML += `<tr class="subtotal">
                <td colspan="5" class="right italic">Cộng ${label}:</td>
                <td class="right blue bold">${fmt(sBudget)}</td>
                <td></td>
                <td></td>
                <td class="right ${sActual > sBudget ? 'red bold' : 'bold'}">${sActual > 0 ? fmt(sActual) : '—'}</td>
                <td class="right ${sVar >= 0 ? 'green bold' : 'red bold'}">${sActual > 0 ? (sVar >= 0 ? '+' : '') + fmt(sVar) : '—'}</td>
            </tr>`;
        });
    });

    const totalVar = (summary?.totalBudget || 0) - (summary?.totalActual || 0);
    const cpi = summary?.overallCpi;

    return `<!DOCTYPE html><html lang="vi"><head><meta charset="utf-8">
<title>Bảng theo dõi Chênh lệch Vật tư — ${project?.name || ''}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Be Vietnam Pro', Arial, sans-serif; font-size: 11px; color: #1a1a1a; background: #e5e7eb; }
  .page { max-width: 1080px; margin: 20px auto; background: #fff; box-shadow: 0 8px 40px rgba(0,0,0,.18); border-radius: 0; overflow: hidden; }

  /* ═══ HEADER — white bg, orange wave ═══ */
  .header-wrap { background: #ffffff; position: relative; overflow: hidden; min-height: 130px; }
  /* Big orange wave top-right */
  .header-wrap::before {
    content: '';
    position: absolute; top: -30px; right: -60px;
    width: 360px; height: 180px;
    background: #f97316;
    border-radius: 0 0 0 100%;
  }
  /* Diamond watermark pattern */
  .header-wrap::after {
    content: '';
    position: absolute; top: 0; left: 0; right: 0; bottom: 0;
    background-image: repeating-linear-gradient(
      45deg, rgba(249,115,22,.06) 0px, rgba(249,115,22,.06) 1px,
      transparent 1px, transparent 28px),
      repeating-linear-gradient(
      -45deg, rgba(249,115,22,.06) 0px, rgba(249,115,22,.06) 1px,
      transparent 1px, transparent 28px);
    pointer-events: none;
  }
  .header-inner { position: relative; z-index: 2; display: flex; align-items: center; justify-content: space-between; padding: 22px 32px 14px; }
  /* Logo block */
  .logo-wrap { display: flex; align-items: center; gap: 14px; }
  .diamond-outer {
    width: 56px; height: 56px; background: #f97316;
    transform: rotate(45deg); border-radius: 6px;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 6px 20px rgba(249,115,22,.55); flex-shrink: 0;
  }
  .diamond-k {
    transform: rotate(-45deg);
    font-size: 28px; font-weight: 900; color: #fff;
    font-style: italic; letter-spacing: -2px; line-height: 1;
  }
  .brand-block { }
  .brand-name { font-size: 20px; font-weight: 900; color: #1a1a1a; letter-spacing: 2px; line-height: 1; }
  .brand-sub   { font-size: 9px; font-weight: 600; color: #f97316; letter-spacing: 2px; text-transform: uppercase; margin-top: 3px; }
  .brand-tag   { font-size: 9px; color: #94a3b8; margin-top: 2px; font-style: italic; }
  /* Meta top-right (over orange wave → white text) */
  .header-meta { text-align: right; color: rgba(255,255,255,.92); font-size: 10px; line-height: 1.9; position: relative; z-index: 3; }
  .header-meta strong { font-weight: 700; }
  /* Title band */
  .title-band { background: #1e3a5f; padding: 14px 32px; display: flex; align-items: center; justify-content: space-between; }
  .doc-title { font-size: 16px; font-weight: 900; color: #fff; letter-spacing: 3px; text-transform: uppercase; }
  .doc-sub { font-size: 9px; color: rgba(255,255,255,.5); letter-spacing: 2px; text-transform: uppercase; margin-top: 3px; }
  .orange-accent { height: 5px; background: linear-gradient(90deg, #f97316 0%, #fb923c 50%, #f97316 100%); }

  /* ═══ PROJECT INFO ═══ */
  .project-section { padding: 14px 32px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 40px; }
  .info-row { display: flex; align-items: baseline; gap: 8px; font-size: 11px; }
  .info-label { color: #64748b; min-width: 80px; font-size: 10px; font-weight: 500; }
  .info-value { font-weight: 700; color: #1e3a5f; font-size: 11.5px; }

  /* ═══ SUMMARY ═══ */
  .summary-section { padding: 16px 32px 18px; background: #fff; }
  .summary-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 14px; }
  .sum-card { border-radius: 10px; padding: 13px 16px; border: 1.5px solid #e2e8f0; position: relative; overflow: hidden; }
  .sum-card::after { content: ''; position: absolute; bottom: -12px; right: -12px; width: 50px; height: 50px; border-radius: 50%; opacity: .08; }
  .sum-card.budget  { border-top: 3.5px solid #2563eb; } .sum-card.budget::after  { background: #2563eb; }
  .sum-card.actual  { border-top: 3.5px solid #64748b; } .sum-card.actual::after  { background: #64748b; }
  .sum-card.variance{ border-top: 3.5px solid #16a34a; } .sum-card.variance::after{ background: #16a34a; }
  .sum-card.cpi     { border-top: 3.5px solid #f97316; } .sum-card.cpi::after     { background: #f97316; }
  .sum-label { font-size: 9px; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: .6px; margin-bottom: 7px; }
  .sum-value { font-size: 16px; font-weight: 900; line-height: 1; }
  .sum-unit  { font-size: 11px; font-weight: 600; }

  /* ═══ TABLE ═══ */
  .table-section { padding: 4px 32px 24px; }
  table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 10.5px; }
  thead th {
    background: #1e3a5f; color: #fff; font-size: 10px; font-weight: 700;
    padding: 9px 7px; text-align: center; border: 1px solid #0f2240;
    white-space: nowrap; letter-spacing: .4px;
  }
  thead th:nth-child(2) { text-align: left; padding-left: 12px; }
  td { border: 1px solid #e2e8f0; padding: 6px 7px; vertical-align: middle; }
  tr.even td { background: #fafafa; }
  /* G1 header row — orange accent bar + navy bg */
  .g1-header td {
    background: #1e3a5f !important; color: #fff;
    font-weight: 800; font-size: 11.5px; padding: 9px 14px;
    border-color: #0f2240 !important; letter-spacing: .3px;
  }
  .g1-bar {
    display: inline-block; width: 5px; height: 15px;
    background: #f97316; border-radius: 3px;
    vertical-align: middle; margin-right: 10px;
  }
  .g1-budget { font-size: 10px; opacity: .8; margin-left: 14px; font-weight: 600; }
  .g1-var    { font-size: 10px; margin-left: 10px; }
  /* G2 header row — light orange/amber */
  .g2-header td {
    background: #fff7ed !important; color: #9a3412;
    font-weight: 700; font-size: 10.5px; padding: 7px 14px;
    border-left: 5px solid #f97316 !important;
  }
  .subtotal td { background: #fef9f0 !important; font-size: 10px; font-weight: 600; }
  .total-row td {
    background: #f97316 !important; color: #fff !important;
    font-weight: 900; font-size: 11.5px; padding: 10px 7px;
    border-color: #ea580c !important; letter-spacing: .3px;
  }
  .name-cell { padding-left: 12px !important; }
  .num  { color: #94a3b8; }
  .center { text-align: center; }
  .right  { text-align: right; }
  .bold   { font-weight: 700; }
  .italic { font-style: italic; color: #64748b; }
  .blue   { color: #1d4ed8; }
  .green  { color: #16a34a; }
  .orange { color: #ea580c; }
  .red    { color: #dc2626; }
  .muted  { color: #9ca3af; }
  .sub    { font-size: 9px; color: #94a3b8; }

  /* ═══ FOOTER ═══ */
  .footer-section { background: #1e3a5f; padding: 0; }
  .footer-top-bar { background: #f97316; padding: 10px 32px; display: flex; align-items: center; justify-content: space-between; }
  .footer-top-bar .ft-brand { color: #fff; font-size: 11px; font-weight: 800; letter-spacing: 1.5px; }
  .footer-top-bar .ft-tagline { color: rgba(255,255,255,.8); font-size: 9px; font-style: italic; }
  .footer-body { padding: 20px 32px 24px; display: flex; justify-content: space-between; align-items: flex-end; }
  .footer-note { font-size: 9px; color: rgba(255,255,255,.5); line-height: 1.9; }
  .footer-note span { color: rgba(255,255,255,.75); font-weight: 600; }
  .sign-area { display: flex; gap: 56px; }
  .sign-box { text-align: center; min-width: 130px; }
  .sign-title { font-weight: 800; color: #f97316; font-size: 10.5px; text-transform: uppercase; letter-spacing: .5px; }
  .sign-role  { font-size: 9px; color: rgba(255,255,255,.5); margin-top: 2px; }
  .sign-line  { border-bottom: 1px solid rgba(255,255,255,.25); margin: 44px auto 6px; }
  .sign-name  { font-size: 9.5px; color: rgba(255,255,255,.6); }

  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
  @media print {
    body { background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { margin: 0; box-shadow: none; max-width: 100%; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  }
</style></head><body>
<div class="page">

  <!-- ═══ HEADER ═══ -->
  <div class="header-wrap">
    <div class="header-inner">
      <div class="logo-wrap">
        <div class="diamond-outer"><span class="diamond-k">K</span></div>
        <div class="brand-block">
          <div class="brand-name">KIẾN TRÚC ĐÔ THỊ SCT</div>
          <div class="brand-sub">KIẾN TRÚC · XÂY DỰNG · NỘI THẤT</div>
          <div class="brand-tag">Cùng bạn xây dựng ước mơ</div>
        </div>
      </div>
      <div class="header-meta">
        <div>Ngày in: <strong>${fmtDate()}</strong></div>
        <div>Mã CT: <strong>${project?.code || '—'}</strong></div>
      </div>
    </div>
  </div>

  <!-- Title band -->
  <div class="title-band">
    <div>
      <div class="doc-title">Bảng theo dõi chênh lệch vật tư</div>
      <div class="doc-sub">Material Variance Tracking Report</div>
    </div>
  </div>
  <div class="orange-accent"></div>

  <!-- ═══ PROJECT INFO ═══ -->
  <div class="project-section">
    <div class="info-grid">
      <div class="info-row"><span class="info-label">Công trình:</span><span class="info-value">${project?.name || '—'}</span></div>
      <div class="info-row"><span class="info-label">Mã dự án:</span> <span class="info-value">${project?.code || '—'}</span></div>
      <div class="info-row"><span class="info-label">Khách hàng:</span><span class="info-value">${project?.customer?.name || '—'}</span></div>
      <div class="info-row"><span class="info-label">Địa chỉ:</span>   <span class="info-value">${project?.address || '—'}</span></div>
    </div>
  </div>

  <!-- ═══ SUMMARY CARDS ═══ -->
  <div class="summary-section">
    <div class="summary-grid">
      <div class="sum-card budget">
        <div class="sum-label">Tổng Dự toán</div>
        <div class="sum-value" style="color:#1d4ed8">${fmt(summary?.totalBudget||0)}<span class="sum-unit">đ</span></div>
      </div>
      <div class="sum-card actual">
        <div class="sum-label">Tổng Thực tế</div>
        <div class="sum-value" style="color:#334155">${fmt(summary?.totalActual||0)}<span class="sum-unit">đ</span></div>
      </div>
      <div class="sum-card variance">
        <div class="sum-label">Chênh lệch</div>
        <div class="sum-value" style="color:${totalVar>=0?'#16a34a':'#dc2626'}">${totalVar>=0?'+':''}${fmt(totalVar)}<span class="sum-unit">đ</span></div>
      </div>
      <div class="sum-card variance">
        <div class="sum-label">Hiệu suất LN</div>
        <div class="sum-value" style="color:${totalVar>=0?'#16a34a':'#dc2626'}">${(summary?.totalBudget||0)>0?(totalVar>=0?'+':'')+((totalVar/(summary.totalBudget))*100).toFixed(1)+'%':'—'}</div>
      </div>
      <div class="sum-card cpi">
        <div class="sum-label">CPI · Hiệu quả chi phí</div>
        <div class="sum-value" style="color:${(cpi||0)>=1?'#16a34a':(cpi||0)>=.9?'#f97316':'#dc2626'}">${cpi!=null?cpi.toFixed(2):'—'}</div>
      </div>
    </div>
  </div>

  <!-- ═══ TABLE ═══ -->
  <div class="table-section">
    <table>
      <thead><tr>
        <th style="width:28px">#</th>
        <th style="text-align:left;padding-left:12px">HẠNG MỤC / SẢN PHẨM</th>
        <th style="width:50px">ĐVT</th>
        <th style="width:50px">SL</th>
        <th style="width:92px">ĐG DT</th>
        <th style="width:105px">TỔNG DT</th>
        <th style="width:50px">SLTT</th>
        <th style="width:92px">ĐG TT</th>
        <th style="width:105px">TỔNG TT</th>
        <th style="width:105px">CHÊNH LỆCH</th>
      </tr></thead>
      <tbody>${rowsHTML}
        <tr class="total-row">
          <td colspan="5" class="right" style="letter-spacing:.5px;padding-right:12px">TỔNG CỘNG</td>
          <td class="right">${fmt(summary?.totalBudget||0)}</td>
          <td></td>
          <td></td>
          <td class="right">${(summary?.totalActual||0)>0?fmt(summary.totalActual):'—'}</td>
          <td class="right">${(summary?.totalActual||0)>0?(totalVar>=0?'+':'')+fmt(totalVar):'—'}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- ═══ FOOTER ═══ -->
  <div class="footer-section">
    <div class="footer-top-bar">
      <span class="ft-brand">KIẾN TRÚC ĐÔ THỊ SCT</span>
      <span class="ft-tagline">Tư vấn thiết kế &nbsp;·&nbsp; Xây dựng trọn gói &nbsp;·&nbsp; Thi công nội ngoại thất</span>
    </div>
    <div class="footer-body">
      <div class="footer-note">
        <div><span>(+)</span> Chênh lệch dương = tiết kiệm so với dự toán</div>
        <div><span>CPI &gt; 1.0</span> = hiệu quả tốt &nbsp;|&nbsp; <span>CPI &lt; 1.0</span> = vượt dự toán</div>
        <div style="margin-top:6px;font-size:8.5px">In ngày ${fmtDate()} &nbsp;·&nbsp; Tài liệu nội bộ SCT ERP</div>
      </div>
      <div class="sign-area">
        <div class="sign-box">
          <div class="sign-title">Lập bảng</div>
          <div class="sign-role">Kỹ thuật / Kinh doanh</div>
          <div class="sign-line"></div>
          <div class="sign-name">Ký tên &amp; ghi rõ họ tên</div>
        </div>
        <div class="sign-box">
          <div class="sign-title">Giám đốc duyệt</div>
          <div class="sign-role">Ban lãnh đạo SCT</div>
          <div class="sign-line"></div>
          <div class="sign-name">Ký tên &amp; đóng dấu</div>
        </div>
      </div>
    </div>
  </div>

</div>
</body></html>`;
}

export default function VarianceTable({ projectId, onTotalBudgetLoaded, project }) {
    const [items, setItems] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [costFilter, setCostFilter] = useState('Tất cả');
    const [activeTab, setActiveTab] = useState(0);
    const [collapsed, setCollapsed] = useState({});
    const [edits, setEdits] = useState({}); // { [id]: { qty, price, ap, name } }
    const editsRef = useRef({}); // Ref để saveItem luôn đọc edits mới nhất (tránh stale closure)
    const [dirty, setDirty] = useState(false);
    const [allSaving, setAllSaving] = useState(false);
    const savingItems = useRef(new Set()); // guard against concurrent save-on-blur retry
    const [addingTo, setAddingTo] = useState(null); // { g1, g2 }
    const [addForm, setAddForm] = useState({ name: '', unit: '', qty: 0, budgetUnitPrice: 0, actualQty: 0, actualUnitPrice: 0 });
    const [addingSubTo, setAddingSubTo] = useState(null);
    const [newSubName, setNewSubName] = useState('');
    const [addingG1, setAddingG1] = useState(false);
    const [newG1Name, setNewG1Name] = useState('');
    const xlsxRef = useRef(null);
    const [showImportModal, setShowImportModal] = useState(false);
    const [pendingFile, setPendingFile] = useState(null);
    const [importing, setImporting] = useState(false);
    const [renamingSection, setRenamingSection] = useState(null); // { key, g1, g2, value }
    const [renamingTab, setRenamingTab] = useState(null); // { g1, value }
    const [newTabName, setNewTabName] = useState('');
    const [showCostPanel, setShowCostPanel] = useState(false);
    const [mgmtRate, setMgmtRate] = useState(5);       // % chi phí quản lý / Tổng DT
    const [otherCosts, setOtherCosts] = useState(0);   // Chi phí khác (VNĐ cố định)
    const [showCopyModal, setShowCopyModal] = useState(false);
    const [copyProjects, setCopyProjects] = useState([]);
    const [copyTarget, setCopyTarget] = useState('');
    const [copying, setCopying] = useState(false);

    // Load/save chi phí vận hành từ localStorage
    useEffect(() => {
        if (!projectId) return;
        const saved = localStorage.getItem(`variance_costs_${projectId}`);
        if (saved) {
            try { const p = JSON.parse(saved); setMgmtRate(p.mgmtRate ?? 5); setOtherCosts(p.otherCosts ?? 0); } catch {}
        }
    }, [projectId]);
    const saveCosts = (rate, other) => {
        localStorage.setItem(`variance_costs_${projectId}`, JSON.stringify({ mgmtRate: rate, otherCosts: other }));
    };

    const exportPDF = () => {
        const html = buildPrintHTML(project, items, summary);
        const win = window.open('', '_blank');
        win.document.write(html);
        win.document.close();
        win.focus();
        setTimeout(() => { win.print(); }, 600);
    };

    const reload = useCallback(() => {
        // Preserve scroll position so the page doesn't jump to top after reload
        const scrollY = window.scrollY;
        setLoading(true);
        fetch(`/api/budget/variance?projectId=${projectId}&planType=tracking`)
            .then(r => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json();
            })
            .then(d => {
                setItems(d.items || []);
                setSummary(d.summary || null);
                setEdits({});
                setDirty(false);
                if (d?.summary?.totalBudget !== undefined) onTotalBudgetLoaded?.(d.summary.totalBudget);
            })
            .catch((err) => {
                console.error('[VarianceTable] Lỗi tải dữ liệu:', err);
                setItems([]);
            })
            .finally(() => {
                setLoading(false);
                // Double-RAF ensures scroll restores after all React re-renders complete
                requestAnimationFrame(() =>
                    requestAnimationFrame(() =>
                        window.scrollTo({ top: scrollY, behavior: 'instant' })
                    )
                );
            });
    }, [projectId]);

    useEffect(() => { reload(); }, [reload]);

    // Get current value (local edit override or original)
    const getVal = (item, field) => {
        const e = edits[item.id];
        if (e && e[field] !== undefined) return e[field];
        switch (field) {
            case 'qty': return item.budgetQty ?? 0;
            case 'price': return item.budgetUnitPrice ?? 0;
            case 'ap': return item.avgActualPrice ?? 0;
            case 'aqty': return item.actualQty > 0 ? item.actualQty : (item.budgetQty ?? 0);
            case 'name': return item.productName || item.category || '';
            case 'unit': return item.unit || '';
        }
        return '';
    };

    const updateEdit = (id, field, val) => {
        const next = { ...editsRef.current, [id]: { ...editsRef.current[id], [field]: val } };
        editsRef.current = next;
        setEdits(next);
        setDirty(true);
    };

    const buildBody = (id, e) => {
        const item = items.find(i => i.id === id);
        if (!item) return null;
        const qty = Number(e.qty ?? item.budgetQty) || 0;
        const price = Number(e.price ?? item.budgetUnitPrice) || 0;
        const ap = Number(e.ap ?? item.avgActualPrice) || 0;
        const aqty = Number(e.aqty ?? (item.actualQty > 0 ? item.actualQty : item.budgetQty)) || 0;
        const body = { quantity: qty, budgetUnitPrice: price, actualCost: ap * aqty, actualQty: aqty };
        if (e.name !== undefined && !item.productCode) body.category = e.name;
        if (e.unit !== undefined) body.unit = e.unit;
        return body;
    };

    // Auto-save single item on blur
    const saveItem = async (id) => {
        // Guard: skip if this item is already mid-save (prevents retry loop on rapid blur)
        if (savingItems.current.has(id)) return;
        const e = editsRef.current[id]; // dùng ref để tránh stale closure từ onBlur
        if (!e) return;
        // Snapshot which fields we are saving now (so post-save clear only removes these)
        const savedFields = Object.keys(e);
        const body = buildBody(id, e);
        if (!body) return;
        savingItems.current.add(id);
        try {
            const res = await fetch(`/api/material-plans/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (!res.ok) {
                console.error('saveItem failed', await res.text());
                return; // keep edits so user still sees their typed value
            }
            // Success: only clear fields that were included in THIS save (not any new edits typed during the request)
            setEdits(prev => {
                const n = { ...prev };
                if (n[id]) {
                    const remaining = { ...n[id] };
                    savedFields.forEach(f => delete remaining[f]);
                    if (Object.keys(remaining).length === 0) delete n[id];
                    else n[id] = remaining;
                }
                editsRef.current = n; // đồng bộ ref sau khi clear
                setDirty(Object.keys(n).length > 0);
                return n;
            });
            setItems(prev => prev.map(i => {
                if (i.id !== id) return i;
                const qty = Number(e.qty ?? i.budgetQty) || 0;
                const price = Number(e.price ?? i.budgetUnitPrice) || 0;
                const ap = Number(e.ap ?? i.avgActualPrice) || 0;
                const aqty = Number(e.aqty ?? (i.actualQty > 0 ? i.actualQty : i.budgetQty)) || 0;
                return {
                    ...i,
                    budgetQty: qty,
                    budgetUnitPrice: price,
                    budgetTotal: qty * price,
                    avgActualPrice: ap,
                    actualQty: aqty,
                    actualTotal: ap * aqty,
                    ...(e.name !== undefined && !i.productCode ? { productName: e.name } : {}),
                    ...(e.unit !== undefined ? { unit: e.unit } : {}),
                };
            }));
        } catch (err) {
            console.error('saveItem error', err);
        } finally {
            savingItems.current.delete(id);
        }
    };

    const saveAll = async () => {
        setAllSaving(true);
        try {
            const changed = Object.keys(edits);
            for (const id of changed) {
                const e = edits[id];
                const body = buildBody(id, e);
                if (!body) continue;
                await fetch(`/api/material-plans/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                });
            }
            reload();
        } catch { alert('Lỗi lưu'); }
        finally { setAllSaving(false); }
    };

    const deleteItem = async (id) => {
        if (!confirm('Xóa dòng này?')) return;
        await fetch(`/api/material-plans/${id}`, { method: 'DELETE' });
        setItems(prev => prev.filter(i => i.id !== id));
    };

    const deleteG1 = async (g1) => {
        const groupItems = items.filter(i => (i.group1 || 'Chưa phân loại') === g1);
        if (!groupItems.length) { alert('Không tìm thấy hạng mục trong nhóm này'); return; }
        if (!confirm(`Xóa toàn bộ nhóm "${g1}" (${groupItems.length} hạng mục)?`)) return;
        // Delete theo batch 5 cái để tránh 429 Too Many Requests
        const BATCH = 5;
        for (let i = 0; i < groupItems.length; i += BATCH) {
            await Promise.all(groupItems.slice(i, i + BATCH).map(item => fetch(`/api/material-plans/${item.id}`, { method: 'DELETE' })));
        }
        setItems(prev => prev.filter(i => (i.group1 || 'Chưa phân loại') !== g1));
        setActiveTab(0);
    };

    const submitAddItem = async (g1, g2) => {
        if (!addForm.name.trim()) return;
        const savedScroll = window.scrollY;
        const qty = Number(addForm.qty) || 0;
        const actualCost = (Number(addForm.actualQty) || 0) * (Number(addForm.actualUnitPrice) || 0);
        const res = await fetch('/api/material-plans', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                items: [{
                    customName: addForm.name,
                    unit: addForm.unit || '',
                    quantity: qty,
                    unitPrice: Number(addForm.budgetUnitPrice) || 0,
                    actualCost,
                    costType: 'Vật tư', group1: g1 || '', group2: g2 || '', planType: 'tracking',
                }],
                projectId,
            }),
        });
        if (res.ok) {
            setAddingTo(null);
            setAddForm({ name: '', unit: '', qty: 0, budgetUnitPrice: 0, actualQty: 0, actualUnitPrice: 0 });
            reload();
            // Ensure scroll is restored after the reload re-render
            requestAnimationFrame(() =>
                requestAnimationFrame(() =>
                    window.scrollTo({ top: savedScroll, behavior: 'instant' })
                )
            );
        }
    };

    const submitAddG1 = async () => {
        if (!newG1Name.trim()) return;
        await fetch('/api/material-plans', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                items: [{ customName: 'Hạng mục mới', quantity: 0, unitPrice: 0, costType: 'Vật tư', group1: newG1Name.trim(), group2: '', planType: 'tracking' }],
                projectId,
            }),
        });
        setAddingG1(false); setNewG1Name(''); reload();
    };

    const submitRenameSection = async () => {
        if (!renamingSection) return;
        const { g1, g2, value } = renamingSection;
        const newName = value.trim();
        if (!newName) { setRenamingSection(null); return; }

        // Find all items in this section and update their group field
        const toUpdate = items.filter(i =>
            i.group1 === g1 && (g2 ? i.group2 === g2 : !i.group2)
        );
        const field = g2 ? 'group2' : 'group1';
        for (const item of toUpdate) {
            await fetch(`/api/material-plans/${item.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [field]: newName }),
            });
        }
        setRenamingSection(null);
        reload();
    };

    const submitRenameTab = async () => {
        if (!renamingTab) return;
        const { g1 } = renamingTab;
        const newName = newTabName.trim();
        if (!newName || newName === g1) { setRenamingTab(null); return; }

        const toUpdate = items.filter(i => i.group1 === g1);
        for (const item of toUpdate) {
            await fetch(`/api/material-plans/${item.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ group1: newName }),
            });
        }
        setRenamingTab(null);
        reload();
    };

    const submitAddSub = async (g1) => {
        if (!newSubName.trim()) return;
        await fetch('/api/material-plans', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                items: [{ customName: 'Hạng mục mới', quantity: 1, unitPrice: 0, costType: 'Vật tư', group1: g1, group2: newSubName.trim(), planType: 'tracking' }],
                projectId,
            }),
        });
        setAddingSubTo(null); setNewSubName(''); reload();
    };

    if (loading) return <div style={{ padding: 24, textAlign: 'center', color: '#9ca3af' }}>Đang tải...</div>;

    const allItems = costFilter === 'Tất cả' ? items : items.filter(i => i.costType === costFilter);

    // Build hierarchy
    const hierarchy = {};
    const g1Order = [];
    allItems.forEach(item => {
        const g1 = item.group1 || 'Chưa phân loại';
        const g2 = item.group2 || '';
        if (!hierarchy[g1]) { hierarchy[g1] = { subgroups: {}, g2Order: [], direct: [] }; g1Order.push(g1); }
        if (g2) {
            if (!hierarchy[g1].subgroups[g2]) { hierarchy[g1].subgroups[g2] = []; hierarchy[g1].g2Order.push(g2); }
            hierarchy[g1].subgroups[g2].push(item);
        } else {
            hierarchy[g1].direct.push(item);
        }
    });

    const downloadTemplate = () => {
        const wb = XLSX.utils.book_new();
        const header = [['Nhóm (group1)', 'Nhóm con (group2)', 'Tên hạng mục', 'ĐVT', 'SL dự toán', 'Đơn giá DT', 'Loại chi phí', 'SL thực tế (SLTT)', 'Đơn giá TT (ĐG TT)']];
        const sample = [
            ['Vật tư', 'Gỗ', 'Gỗ MDF 18mm', 'm2', 50, 320000, 'Vật tư', 48, 335000],
            ['Vật tư', 'Sơn', 'Sơn tường Dulux', 'lít', 20, 185000, 'Vật tư', 22, 190000],
            ['Nhân công', '', 'Nhân công lắp đặt tủ bếp', 'ngày', 5, 450000, 'Nhân công', 6, 450000],
            ['Thầu phụ', '', 'Thầu điện nước', 'gói', 1, 12000000, 'Thầu phụ', 1, 13500000],
        ];
        const notes = [
            [],
            ['--- HƯỚNG DẪN ---'],
            ['Cột A (Nhóm)', 'Tên nhóm chính, VD: Vật tư, Nhân công, Thầu phụ, Khác'],
            ['Cột B (Nhóm con)', 'Tên nhóm con (có thể để trống), VD: Gỗ, Sơn, Đá'],
            ['Cột C (Tên hạng mục)', 'BẮT BUỘC - Tên vật tư / hạng mục công việc'],
            ['Cột D (ĐVT)', 'Đơn vị tính: m2, m3, md, cái, bộ, kg, lít, gói, ngày...'],
            ['Cột E (SL dự toán)', 'Số lượng theo dự toán ban đầu'],
            ['Cột F (Đơn giá DT)', 'Đơn giá dự toán (VNĐ, không có dấu phẩy)'],
            ['Cột G (Loại chi phí)', 'Vật tư / Nhân công / Thầu phụ / Khác'],
            ['Cột H (SL thực tế)', 'Số lượng thực tế (để trống = lấy bằng SL dự toán)'],
            ['Cột I (Đơn giá TT)', 'Đơn giá thực tế (VNĐ, để trống = 0)'],
        ];
        const ws = XLSX.utils.aoa_to_sheet([...header, ...sample, ...notes]);
        ws['!cols'] = [
            { wch: 20 }, { wch: 18 }, { wch: 36 }, { wch: 10 },
            { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 18 }, { wch: 18 },
        ];
        XLSX.utils.book_append_sheet(wb, ws, 'Bảng chênh lệch');
        XLSX.writeFile(wb, 'mau_chenh_lech_vat_tu_SCT.xlsx');
    };

    const handleImportExcel = async (file) => {
        setImporting(true);
        try {
            const buf = await file.arrayBuffer();
            const wb = XLSX.read(buf, { type: 'array' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
            const dataRows = rows.slice(1).filter(r => r[2] && String(r[2]).trim());
            if (!dataRows.length) { alert('Không có dữ liệu hợp lệ trong file'); setImporting(false); return; }
            const itemsPayload = dataRows.map(r => {
                const sltt = Number(r[7]) || 0;
                const dgtt = Number(r[8]) || 0;
                return {
                    customName: String(r[2] || '').trim(),
                    unit: String(r[3] || '').trim(),
                    quantity: Number(r[4]) || 0,
                    unitPrice: Number(r[5]) || 0,
                    actualCost: sltt * dgtt,
                    costType: String(r[6] || 'Vật tư').trim() || 'Vật tư',
                    group1: String(r[0] || '').trim(),
                    group2: String(r[1] || '').trim(),
                    planType: 'tracking',
                };
            });
            const res = await fetch('/api/material-plans', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: itemsPayload, projectId }),
            });
            if (!res.ok) { const err = await res.json(); alert(err.error || 'Lỗi nhập dữ liệu'); setImporting(false); return; }
            setShowImportModal(false);
            setPendingFile(null);
            await reload();
        } catch (err) {
            alert('Lỗi đọc file: ' + err.message);
        }
        setImporting(false);
    };

    const safeTab = Math.min(activeTab, g1Order.length - 1);
    const activeG1 = g1Order[safeTab];
    const activeData = hierarchy[activeG1] || { subgroups: {}, g2Order: [], direct: [] };

    const liveAgg = (sectionItems) => sectionItems.reduce((acc, item) => {
        const q = Number(getVal(item, 'qty')) || 0;
        const p = Number(getVal(item, 'price')) || 0;
        const ap = Number(getVal(item, 'ap')) || 0;
        const aqty = Number(getVal(item, 'aqty')) || q;
        acc.budget += q * p;
        acc.actual += ap * aqty;
        return acc;
    }, { budget: 0, actual: 0 });

    const renderRow = (item, stt) => {
        const q = Number(getVal(item, 'qty')) || 0;
        const p = Number(getVal(item, 'price')) || 0;
        const ap = Number(getVal(item, 'ap')) || 0;
        const aqty = Number(getVal(item, 'aqty')) || q;
        const name = getVal(item, 'name');
        const budgetTotal = q * p;
        const actualTotal = ap * aqty;
        const variance = budgetTotal - actualTotal;
        const isCustom = !item.productCode;
        const hasEdit = !!edits[item.id];
        const rowBg = hasEdit ? '#fffbeb' : stt % 2 === 0 ? '#f9fafb' : '#fff';

        return (
            <tr key={item.id} style={{ background: rowBg }}>
                <td style={{ ...cellStyle, textAlign: 'center', color: '#9ca3af', fontSize: 11, width: 32 }}>{stt}</td>

                {/* HẠNG MỤC */}
                <td style={{ ...cellStyle, padding: '3px 4px' }}>
                    {isCustom ? (
                        <input style={{ ...inpStyle, textAlign: 'left' }}
                            value={name}
                            onChange={e => updateEdit(item.id, 'name', e.target.value)}
                            onBlur={() => saveItem(item.id)}
                            placeholder="Tên hạng mục..."
                        />
                    ) : (
                        <>
                            <div style={{ fontWeight: 500, fontSize: 12 }}>{name}</div>
                            {item.productCode && <div style={{ fontSize: 10, color: '#9ca3af' }}>{item.productCode}</div>}
                        </>
                    )}
                </td>

                {/* ĐVT */}
                <td style={{ ...cellStyle, padding: '3px 4px', width: 70 }}>
                    <UnitInput
                        style={{ ...inpStyle, textAlign: 'center' }}
                        value={getVal(item, 'unit')}
                        onChange={v => updateEdit(item.id, 'unit', v)}
                        onBlur={() => saveItem(item.id)}
                    />
                </td>

                {/* SL */}
                <td style={{ ...cellStyle, padding: '3px 4px', width: 72 }}>
                    <input style={{ ...inpStyle, textAlign: 'right' }} type="number"
                        value={getVal(item, 'qty')}
                        onChange={e => updateEdit(item.id, 'qty', e.target.value)}
                        onBlur={() => saveItem(item.id)}
                        onFocus={e => e.target.select()} />
                </td>

                {/* ĐG DT */}
                <td style={{ ...cellStyle, padding: '3px 4px', width: 110 }}>
                    <input style={{ ...inpStyle, textAlign: 'right' }} type="number"
                        value={getVal(item, 'price')}
                        onChange={e => updateEdit(item.id, 'price', e.target.value)}
                        onBlur={() => saveItem(item.id)}
                        onFocus={e => e.target.select()} />
                </td>

                {/* TỔNG DT */}
                <td style={{ ...cellStyle, textAlign: 'right', fontWeight: 600, color: '#2563eb', width: 105 }}>
                    {fmt(budgetTotal)}
                </td>

                {/* SLTT */}
                <td style={{ ...cellStyle, padding: '3px 4px', width: 72 }}>
                    <input style={{ ...inpStyle, textAlign: 'right' }} type="number"
                        value={getVal(item, 'aqty')}
                        onChange={e => updateEdit(item.id, 'aqty', e.target.value)}
                        onBlur={() => saveItem(item.id)}
                        onFocus={e => e.target.select()} />
                </td>

                {/* ĐG TT */}
                <td style={{ ...cellStyle, padding: '3px 4px', width: 110 }}>
                    <input style={{ ...inpStyle, textAlign: 'right', color: ap > p ? '#dc2626' : ap > 0 ? '#16a34a' : undefined }} type="number"
                        value={getVal(item, 'ap')}
                        onChange={e => updateEdit(item.id, 'ap', e.target.value)}
                        onBlur={() => saveItem(item.id)}
                        onFocus={e => e.target.select()} />
                </td>

                {/* TỔNG TT */}
                <td style={{ ...cellStyle, textAlign: 'right', fontWeight: 600, width: 105,
                    color: actualTotal > budgetTotal ? '#dc2626' : actualTotal > 0 ? '#16a34a' : '#9ca3af' }}>
                    {actualTotal > 0 ? fmt(actualTotal) : '—'}
                </td>

                {/* CHÊNH LỆCH */}
                <td style={{ ...cellStyle, textAlign: 'right', fontWeight: 700, width: 105,
                    color: variance >= 0 ? '#16a34a' : '#dc2626' }}>
                    {actualTotal > 0 ? `${variance >= 0 ? '+' : ''}${fmt(variance)}` : '—'}
                </td>

                {/* Actions */}
                <td style={{ ...cellStyle, textAlign: 'center', padding: '3px 4px', width: 36 }}>
                    <button onClick={() => deleteItem(item.id)} title="Xóa"
                        style={{ padding: '2px 7px', fontSize: 11, background: 'none', border: '1px solid #fca5a5', borderRadius: 4, cursor: 'pointer', color: '#dc2626' }}>🗑</button>
                </td>
            </tr>
        );
    };

    const renderSection = (label, sttLetter, sectionItems, g1, g2, key) => {
        const isCollapsed = collapsed[key];
        const { budget, actual } = liveAgg(sectionItems);
        const variance = budget - actual;
        const isAdding = addingTo?.g1 === g1 && addingTo?.g2 === g2;

        const isRenaming = renamingSection?.key === key;

        return (
            <div key={key} style={{ marginBottom: 16, border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ background: '#fde68a', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, color: '#78350f', cursor: 'pointer' }}
                        onClick={() => setCollapsed(p => ({ ...p, [key]: !p[key] }))}>
                        {isCollapsed ? '▶' : '▼'}
                    </span>
                    <span style={{ fontWeight: 700, fontSize: 13, color: '#78350f', minWidth: 24 }}>{sttLetter}.</span>
                    {isRenaming ? (
                        <input
                            autoFocus
                            style={{ flex: 1, padding: '3px 8px', fontSize: 13, fontWeight: 700, border: '2px solid #92400e', borderRadius: 6, outline: 'none', background: '#fffbeb', color: '#92400e' }}
                            value={renamingSection.value}
                            onChange={e => setRenamingSection(r => ({ ...r, value: e.target.value }))}
                            onKeyDown={e => { if (e.key === 'Enter') submitRenameSection(); if (e.key === 'Escape') setRenamingSection(null); }}
                            onBlur={submitRenameSection}
                            onClick={e => e.stopPropagation()}
                        />
                    ) : (
                        <span
                            style={{ fontWeight: 600, fontSize: 13, color: '#92400e', flex: 1, cursor: 'pointer' }}
                            onClick={() => setCollapsed(p => ({ ...p, [key]: !p[key] }))}
                            onDoubleClick={e => { e.stopPropagation(); setRenamingSection({ key, g1, g2, value: label }); }}
                            title="Double-click để đổi tên">
                            {label}
                            <span style={{ marginLeft: 6, fontSize: 10, color: '#b45309', opacity: 0.6 }}>✏️</span>
                        </span>
                    )}
                    <span style={{ fontSize: 12, color: '#92400e' }}>DT: <strong>{fmt(budget)}</strong></span>
                    {actual > 0 && (
                        <span style={{ fontSize: 12, marginLeft: 8, color: variance >= 0 ? '#16a34a' : '#dc2626', fontWeight: 700 }}>
                            {variance >= 0 ? '+' : ''}{fmt(variance)}
                        </span>
                    )}
                </div>

                {!isCollapsed && (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                            <thead>
                                <tr>
                                    <th style={{ ...thStyle, width: 32 }}>#</th>
                                    <th style={{ ...thStyle }}>HẠNG MỤC</th>
                                    <th style={{ ...thStyle, width: 52 }}>ĐVT</th>
                                    <th style={{ ...thStyle, width: 62 }}>SL</th>
                                    <th style={{ ...thStyle, width: 105 }}>ĐG DT</th>
                                    <th style={{ ...thStyle, width: 105 }}>TỔNG DT</th>
                                    <th style={{ ...thStyle, width: 62 }}>SLTT</th>
                                    <th style={{ ...thStyle, width: 105 }}>ĐG TT</th>
                                    <th style={{ ...thStyle, width: 105 }}>TỔNG TT</th>
                                    <th style={{ ...thStyle, width: 105 }}>CHÊNH LỆCH</th>
                                    <th style={{ ...thStyle, width: 72 }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {sectionItems.map((item, i) => renderRow(item, i + 1))}
                                {/* Add row */}
                                {isAdding && (
                                    <tr style={{ background: '#f0fdf4' }}>
                                        <td style={{ ...cellStyle, textAlign: 'center', color: '#9ca3af', fontSize: 11 }}>+</td>
                                        <td style={{ ...cellStyle, padding: '3px 4px' }}>
                                            <input autoFocus style={{ ...inpStyle, textAlign: 'left' }}
                                                placeholder="Tên hạng mục..."
                                                value={addForm.name}
                                                onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                                                onKeyDown={e => { if (e.key === 'Enter') submitAddItem(g1, g2); if (e.key === 'Escape') setAddingTo(null); }}
                                            />
                                        </td>
                                        <td style={{ ...cellStyle, padding: '3px 4px' }}>
                                            <UnitInput
                                                style={{ ...inpStyle, textAlign: 'center' }}
                                                placeholder="ĐVT"
                                                value={addForm.unit || ''}
                                                onChange={v => setAddForm(f => ({ ...f, unit: v }))}
                                            />
                                        </td>
                                        <td style={{ ...cellStyle, padding: '3px 4px' }}>
                                            <input style={{ ...inpStyle, textAlign: 'right' }} type="number"
                                                placeholder="SL" value={addForm.qty || ''}
                                                onChange={e => setAddForm(f => ({ ...f, qty: e.target.value }))} />
                                        </td>
                                        <td style={{ ...cellStyle, padding: '3px 4px' }}>
                                            <input style={{ ...inpStyle, textAlign: 'right' }} type="number"
                                                placeholder="Đơn giá DT" value={addForm.budgetUnitPrice || ''}
                                                onChange={e => setAddForm(f => ({ ...f, budgetUnitPrice: e.target.value }))} />
                                        </td>
                                        <td style={{ ...cellStyle, textAlign: 'right', color: '#2563eb', fontWeight: 600 }}>
                                            {fmt((Number(addForm.qty) || 0) * (Number(addForm.budgetUnitPrice) || 0))}
                                        </td>
                                        {/* SLTT */}
                                        <td style={{ ...cellStyle, padding: '3px 4px' }}>
                                            <input style={{ ...inpStyle, textAlign: 'right', color: '#16a34a' }} type="number"
                                                placeholder="SLTT" value={addForm.actualQty || ''}
                                                onChange={e => setAddForm(f => ({ ...f, actualQty: e.target.value }))} />
                                        </td>
                                        {/* ĐG TT */}
                                        <td style={{ ...cellStyle, padding: '3px 4px' }}>
                                            <input style={{ ...inpStyle, textAlign: 'right', color: '#16a34a' }} type="number"
                                                placeholder="Đơn giá TT" value={addForm.actualUnitPrice || ''}
                                                onChange={e => setAddForm(f => ({ ...f, actualUnitPrice: e.target.value }))}
                                                onKeyDown={e => { if (e.key === 'Enter') submitAddItem(g1, g2); if (e.key === 'Escape') setAddingTo(null); }} />
                                        </td>
                                        {/* TỔNG TT calculated */}
                                        <td style={{ ...cellStyle, textAlign: 'right', color: '#16a34a', fontWeight: 600 }}>
                                            {fmt((Number(addForm.actualQty) || 0) * (Number(addForm.actualUnitPrice) || 0))}
                                        </td>
                                        {/* CHÊNH LỆCH — */}
                                        <td style={{ ...cellStyle, textAlign: 'right', color: '#9ca3af' }}>—</td>
                                        <td style={{ ...cellStyle, padding: '3px 4px' }}>
                                            <div style={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
                                                <button onClick={() => submitAddItem(g1, g2)}
                                                    style={{ padding: '3px 9px', fontSize: 12, background: '#16a34a', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 700 }}>✓</button>
                                                <button onClick={() => setAddingTo(null)}
                                                    style={{ padding: '3px 7px', fontSize: 12, background: '#6b7280', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>✕</button>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                                {/* Subtotal */}
                                <tr style={{ background: '#fce4d6' }}>
                                    <td colSpan={5} style={{ ...cellStyle, textAlign: 'right', fontWeight: 700, fontSize: 12, color: '#92400e' }}>Cộng {label}:</td>
                                    <td style={{ ...cellStyle, textAlign: 'right', fontWeight: 700, color: '#1d4ed8' }}>{fmt(budget)}</td>
                                    <td style={cellStyle} />
                                    <td style={{ ...cellStyle, textAlign: 'right', fontWeight: 700, color: actual > budget ? '#dc2626' : '#16a34a' }}>
                                        {actual > 0 ? fmt(actual) : '—'}
                                    </td>
                                    <td style={{ ...cellStyle, textAlign: 'right', fontWeight: 700, color: variance >= 0 ? '#16a34a' : '#dc2626' }}>
                                        {actual > 0 ? `${variance >= 0 ? '+' : ''}${fmt(variance)}` : '—'}
                                    </td>
                                    <td style={cellStyle} />
                                </tr>
                            </tbody>
                        </table>
                        <div style={{ padding: '8px 12px' }}>
                            <button onClick={async () => {
                                    if (addingTo && addForm.name.trim()) {
                                        await submitAddItem(addingTo.g1, addingTo.g2);
                                    }
                                    setAddingTo({ g1, g2 });
                                    setAddForm({ name: '', unit: '', qty: 0, budgetUnitPrice: 0, actualQty: 0, actualUnitPrice: 0 });
                                }}
                                style={{ fontSize: 12, color: '#2563eb', background: 'none', border: '1px dashed #93c5fd', borderRadius: 6, padding: '4px 12px', cursor: 'pointer' }}>
                                + Thêm dòng
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const g2Keys = (activeData.g2Order || []).filter((v, i, a) => a.indexOf(v) === i);
    const sections = [];
    if (activeData.direct.length) sections.push({ label: activeG1, items: activeData.direct, g2: '' });
    g2Keys.forEach(g2 => sections.push({ label: g2, items: activeData.subgroups[g2] || [], g2 }));
    if (!sections.length) sections.push({ label: activeG1, items: [], g2: '' });

    const allTabItems = [...(activeData.direct || []), ...g2Keys.flatMap(g2 => activeData.subgroups[g2] || [])];
    const { budget: tabBudget, actual: tabActual } = liveAgg(allTabItems);

    if (!items.length) return (
        <div style={{ padding: 24 }}>
            <div style={{ textAlign: 'center', color: '#9ca3af', marginBottom: 20 }}>Chưa có dữ liệu. Tạo hạng mục đầu tiên để bắt đầu nhập.</div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
                {addingG1 ? (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input autoFocus
                            style={{ padding: '7px 14px', fontSize: 13, border: '1px solid #93c5fd', borderRadius: 8, outline: 'none', width: 200 }}
                            placeholder="Tên hạng mục chính..."
                            value={newG1Name}
                            onChange={e => setNewG1Name(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') submitAddG1(); if (e.key === 'Escape') setAddingG1(false); }}
                        />
                        <button onClick={submitAddG1}
                            style={{ padding: '7px 16px', fontSize: 13, background: '#16a34a', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>✓ Thêm</button>
                        <button onClick={() => setAddingG1(false)}
                            style={{ padding: '7px 12px', fontSize: 13, background: 'none', border: '1px solid #d1d5db', borderRadius: 8, cursor: 'pointer', color: '#6b7280' }}>✕</button>
                    </div>
                ) : (
                    <button onClick={() => { setAddingG1(true); setNewG1Name(''); }}
                        style={{ padding: '9px 24px', fontSize: 14, border: '2px dashed #93c5fd', borderRadius: 10, background: 'transparent', cursor: 'pointer', color: '#2563eb', fontWeight: 600 }}>
                        + Thêm hạng mục chính
                    </button>
                )}
            </div>
        </div>
    );

    return (
        <>
        <div>
            {/* Summary */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
                    {summary && (() => {
                        const profit = -summary.totalVariance;
                        const efficiency = summary.totalBudget > 0 ? (profit / summary.totalBudget * 100) : 0;
                        const effColor = efficiency >= 0 ? '#16a34a' : '#dc2626';
                        return [
                            { label: 'Tổng DT', value: fmt(summary.totalBudget) + 'đ', color: '#2563eb' },
                            { label: 'Tổng TT', value: fmt(summary.totalActual) + 'đ', color: '#111' },
                            { label: 'Chênh lệch', value: (profit >= 0 ? '+' : '') + fmt(profit) + 'đ', color: effColor },
                            { label: 'Hiệu suất LN', value: (efficiency >= 0 ? '+' : '') + efficiency.toFixed(1) + '%', color: effColor },
                        ].map(s => (
                            <div key={s.label} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <span style={{ fontSize: 11, color: '#9ca3af' }}>{s.label}</span>
                                <span style={{ fontWeight: 700, fontSize: 14, color: s.color }}>{s.value}</span>
                            </div>
                        ));
                    })()}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <button onClick={saveAll} disabled={allSaving}
                        style={{ padding: '7px 18px', fontSize: 13, fontWeight: 700, borderRadius: 8, border: 'none', cursor: 'pointer',
                            background: dirty ? '#1e3a5f' : '#4b7ab5', color: 'white',
                            boxShadow: '0 2px 8px rgba(30,58,95,0.25)', display: 'flex', alignItems: 'center', gap: 6,
                            opacity: allSaving ? 0.7 : 1 }}>
                        💾 {allSaving ? 'Đang lưu...' : dirty ? 'Lưu *' : 'Lưu'}
                    </button>
                    <button onClick={exportPDF}
                        style={{ padding: '7px 16px', fontSize: 12, fontWeight: 700, borderRadius: 8, border: 'none', cursor: 'pointer',
                            background: '#f97316', color: 'white', display: 'flex', alignItems: 'center', gap: 6 }}>
                        📄 Xuất PDF
                    </button>
                    <button onClick={downloadTemplate}
                        style={{ padding: '7px 14px', fontSize: 12, fontWeight: 600, borderRadius: 8, border: '1px solid #16a34a', cursor: 'pointer',
                            background: '#f0fdf4', color: '#15803d', display: 'flex', alignItems: 'center', gap: 5 }}>
                        📥 Tải mẫu
                    </button>
                    <button onClick={() => xlsxRef.current?.click()}
                        style={{ padding: '7px 14px', fontSize: 12, fontWeight: 600, borderRadius: 8, border: '1px solid #2563eb', cursor: 'pointer',
                            background: '#eff6ff', color: '#1d4ed8', display: 'flex', alignItems: 'center', gap: 5 }}>
                        📊 Nhập Excel
                    </button>
                    <button onClick={async () => {
                            const res = await fetch('/api/projects?limit=200');
                            const d = await res.json();
                            setCopyProjects((d.data || []).filter(p => p.id !== projectId));
                            setCopyTarget('');
                            setShowCopyModal(true);
                        }}
                        style={{ padding: '7px 14px', fontSize: 12, fontWeight: 600, borderRadius: 8, border: '1px solid #7c3aed', cursor: 'pointer',
                            background: '#f5f3ff', color: '#6d28d9', display: 'flex', alignItems: 'center', gap: 5 }}>
                        📋 Sao chép
                    </button>
                    <input ref={xlsxRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }}
                        onChange={e => { const f = e.target.files[0]; if (f) { setPendingFile(f); setShowImportModal(true); } e.target.value = ''; }} />
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {COST_TYPES.map(ct => (
                        <button key={ct} onClick={() => setCostFilter(ct)}
                            style={{ padding: '4px 11px', fontSize: 11, fontWeight: 600, borderRadius: 6, border: '1px solid', cursor: 'pointer',
                                background: costFilter === ct ? '#1e3a5f' : 'white', color: costFilter === ct ? 'white' : '#6b7280',
                                borderColor: costFilter === ct ? '#1e3a5f' : '#d1d5db' }}>
                            {ct}
                        </button>
                    ))}
                    </div>
                </div>
            </div>

            {/* Chi phí vận hành & Lợi nhuận ròng */}
            {summary && (() => {
                const totalDT = summary.totalBudget || 0;
                const totalTT = summary.totalActual || 0;
                const rawProfit = totalDT - totalTT;
                const mgmtCost = totalDT * (mgmtRate / 100);
                const netProfit = rawProfit - mgmtCost - otherCosts;
                const netRate = totalDT > 0 ? (netProfit / totalDT * 100) : 0;
                const rawRate = totalDT > 0 ? (rawProfit / totalDT * 100) : 0;
                const isProfit = netProfit >= 0;
                return (
                    <div style={{ marginBottom: 16, border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden', background: 'white' }}>
                        {/* Header toggle */}
                        <button onClick={() => setShowCostPanel(v => !v)}
                            style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', background: '#f8fafc', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, color: '#1e3a5f' }}>
                            <span>📊 Phân tích Lợi nhuận & Chi phí vận hành</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <span style={{ fontWeight: 800, fontSize: 14, color: isProfit ? '#16a34a' : '#dc2626' }}>
                                    LN ròng: {isProfit ? '+' : ''}{fmt(netProfit)}đ ({netRate.toFixed(1)}%)
                                </span>
                                <span style={{ color: '#9ca3af', fontSize: 14 }}>{showCostPanel ? '▲' : '▼'}</span>
                            </div>
                        </button>

                        {showCostPanel && (
                            <div style={{ padding: '16px 20px' }}>
                                {/* Công thức */}
                                <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: 12, lineHeight: 1.8 }}>
                                    <div style={{ fontWeight: 700, color: '#0369a1', marginBottom: 6 }}>📐 Công thức tính:</div>
                                    <div style={{ fontFamily: 'monospace', color: '#334155' }}>
                                        <div>① LN thô (Chênh lệch VT) = Tổng DT − Tổng TT</div>
                                        <div style={{ paddingLeft: 16, color: '#64748b' }}>= {fmt(totalDT)}đ − {fmt(totalTT)}đ = <strong style={{ color: rawProfit >= 0 ? '#16a34a' : '#dc2626' }}>{rawProfit >= 0 ? '+' : ''}{fmt(rawProfit)}đ ({rawRate.toFixed(1)}%)</strong></div>
                                        <div style={{ marginTop: 4 }}>② Chi phí Quản lý = Tổng DT × {mgmtRate}%</div>
                                        <div style={{ paddingLeft: 16, color: '#64748b' }}>= {fmt(totalDT)}đ × {mgmtRate}% = <strong style={{ color: '#dc2626' }}>−{fmt(mgmtCost)}đ</strong></div>
                                        {otherCosts > 0 && <>
                                            <div style={{ marginTop: 4 }}>③ Chi phí khác (cố định) = <strong style={{ color: '#dc2626' }}>−{fmt(otherCosts)}đ</strong></div>
                                        </>}
                                        <div style={{ marginTop: 8, borderTop: '1px solid #bae6fd', paddingTop: 8, fontWeight: 700, color: '#0369a1' }}>
                                            LN ròng = LN thô − CP Quản lý{otherCosts > 0 ? ' − CP Khác' : ''}<br />
                                            <span style={{ fontSize: 13, color: isProfit ? '#16a34a' : '#dc2626' }}>
                                                = {fmt(rawProfit)}đ − {fmt(mgmtCost)}đ{otherCosts > 0 ? ` − ${fmt(otherCosts)}đ` : ''} = <strong>{isProfit ? '+' : ''}{fmt(netProfit)}đ</strong>
                                            </span>
                                        </div>
                                        <div style={{ marginTop: 4, color: '#0369a1' }}>
                                            Hiệu suất LN = LN ròng ÷ Tổng DT = <strong>{netRate.toFixed(2)}%</strong>
                                        </div>
                                    </div>
                                </div>

                                {/* Input chi phí */}
                                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                                    <div>
                                        <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>Chi phí Quản lý (% Tổng DT)</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <input type="number" min="0" max="100" step="0.5"
                                                value={mgmtRate}
                                                onChange={e => { const v = Number(e.target.value) || 0; setMgmtRate(v); saveCosts(v, otherCosts); }}
                                                style={{ width: 80, padding: '6px 10px', fontSize: 13, fontWeight: 700, border: '1px solid #93c5fd', borderRadius: 6, outline: 'none', textAlign: 'right' }} />
                                            <span style={{ fontSize: 13, color: '#6b7280' }}>%</span>
                                            <span style={{ fontSize: 12, color: '#dc2626', fontWeight: 600 }}>= −{fmt(mgmtCost)}đ</span>
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>Chi phí Khác (VNĐ cố định)</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <input type="number" min="0" step="100000"
                                                value={otherCosts}
                                                onChange={e => { const v = Number(e.target.value) || 0; setOtherCosts(v); saveCosts(mgmtRate, v); }}
                                                style={{ width: 140, padding: '6px 10px', fontSize: 13, fontWeight: 700, border: '1px solid #93c5fd', borderRadius: 6, outline: 'none', textAlign: 'right' }} />
                                            <span style={{ fontSize: 12, color: '#dc2626', fontWeight: 600 }}>đ</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Bảng tổng hợp */}
                                <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
                                    {[
                                        { label: 'Tổng DT (doanh thu)', value: fmt(totalDT) + 'đ', color: '#2563eb', bg: '#eff6ff' },
                                        { label: 'Tổng TT (vật tư/nhân công)', value: '−' + fmt(totalTT) + 'đ', color: '#dc2626', bg: '#fef2f2' },
                                        { label: `CP Quản lý (${mgmtRate}%)`, value: '−' + fmt(mgmtCost) + 'đ', color: '#f97316', bg: '#fff7ed' },
                                        otherCosts > 0 ? { label: 'CP Khác (cố định)', value: '−' + fmt(otherCosts) + 'đ', color: '#f97316', bg: '#fff7ed' } : null,
                                        { label: 'LN Ròng', value: (isProfit ? '+' : '') + fmt(netProfit) + 'đ', color: isProfit ? '#16a34a' : '#dc2626', bg: isProfit ? '#f0fdf4' : '#fef2f2', bold: true },
                                        { label: 'Hiệu suất LN', value: (netRate >= 0 ? '+' : '') + netRate.toFixed(2) + '%', color: isProfit ? '#16a34a' : '#dc2626', bg: isProfit ? '#f0fdf4' : '#fef2f2', bold: true },
                                    ].filter(Boolean).map(s => (
                                        <div key={s.label} style={{ background: s.bg, borderRadius: 8, padding: '10px 14px', border: `1px solid ${s.color}22` }}>
                                            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>{s.label}</div>
                                            <div style={{ fontWeight: s.bold ? 800 : 700, fontSize: s.bold ? 16 : 13, color: s.color }}>{s.value}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })()}

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 16, borderBottom: '2px solid #e5e7eb', paddingBottom: 8, alignItems: 'center' }}>
                {g1Order.map((g1, ti) => {
                    const d = hierarchy[g1];
                    const allG1 = [...d.direct, ...Object.values(d.subgroups).flat()];
                    const { budget, actual } = liveAgg(allG1);
                    const v = budget - actual;
                    const isActive = ti === safeTab;
                    const isRenamingThis = renamingTab?.g1 === g1;
                    return (
                        <div key={g1} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            {isRenamingThis ? (
                                <>
                                    <input autoFocus
                                        style={{ padding: '5px 10px', fontSize: 13, border: '2px solid #2563eb', borderRadius: 8, outline: 'none', width: 180, fontWeight: 700 }}
                                        value={newTabName}
                                        onChange={e => setNewTabName(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') submitRenameTab(); if (e.key === 'Escape') setRenamingTab(null); }}
                                        onBlur={submitRenameTab}
                                    />
                                    <button onMouseDown={e => { e.preventDefault(); submitRenameTab(); }}
                                        style={{ padding: '4px 8px', fontSize: 12, background: '#16a34a', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 700 }}>✓</button>
                                    <button onMouseDown={e => { e.preventDefault(); setRenamingTab(null); }}
                                        style={{ padding: '4px 7px', fontSize: 12, background: 'none', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', color: '#6b7280' }}>✕</button>
                                </>
                            ) : (
                                <>
                                    <button onClick={() => setActiveTab(ti)}
                                        style={{ padding: '7px 16px', fontSize: 13, fontWeight: isActive ? 700 : 500, borderRadius: 8,
                                            border: isActive ? '2px solid #2563eb' : '1px solid #e5e7eb',
                                            background: isActive ? '#eff6ff' : 'var(--bg-card)', cursor: 'pointer',
                                            color: isActive ? '#2563eb' : 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                                        {g1}
                                        {budget > 0 && <span style={{ marginLeft: 6, fontSize: 11, color: isActive ? '#3b82f6' : '#9ca3af' }}>{fmt(budget)}</span>}
                                        {actual > 0 && <span style={{ marginLeft: 4, fontSize: 10, color: v >= 0 ? '#16a34a' : '#dc2626' }}>{v >= 0 ? '▲' : '▼'}</span>}
                                    </button>
                                    <button onClick={e => { e.stopPropagation(); setActiveTab(ti); setRenamingTab({ g1 }); setNewTabName(g1); }}
                                        title="Đổi tên"
                                        style={{ padding: '3px 6px', fontSize: 11, background: 'none', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', color: '#9ca3af', lineHeight: 1 }}>
                                        ✏️
                                    </button>
                                    <button onClick={e => { e.stopPropagation(); deleteG1(g1); }}
                                        title="Xóa nhóm"
                                        style={{ padding: '3px 6px', fontSize: 11, background: 'none', border: '1px solid #fca5a5', borderRadius: 6, cursor: 'pointer', color: '#ef4444', lineHeight: 1 }}>
                                        🗑️
                                    </button>
                                </>
                            )}
                        </div>
                    );
                })}
                {addingG1 ? (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <input autoFocus
                            style={{ padding: '6px 12px', fontSize: 13, border: '1px solid #93c5fd', borderRadius: 8, outline: 'none', width: 160 }}
                            placeholder="Tên hạng mục..."
                            value={newG1Name}
                            onChange={e => setNewG1Name(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') submitAddG1(); if (e.key === 'Escape') setAddingG1(false); }}
                        />
                        <button onClick={submitAddG1}
                            style={{ padding: '5px 12px', fontSize: 12, background: '#16a34a', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 700 }}>✓</button>
                        <button onClick={() => setAddingG1(false)}
                            style={{ padding: '5px 9px', fontSize: 12, background: 'none', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', color: '#6b7280' }}>✕</button>
                    </div>
                ) : (
                    <button onClick={() => { setAddingG1(true); setNewG1Name(''); }}
                        style={{ padding: '7px 14px', fontSize: 13, border: '1px dashed #93c5fd', borderRadius: 8, background: 'transparent', cursor: 'pointer', color: '#2563eb', fontWeight: 500 }}>
                        + Thêm
                    </button>
                )}
            </div>

            {/* Sections */}
            {sections.map(({ label, items: si, g2 }, idx) =>
                renderSection(label, ALPHA[idx], si, activeG1, g2, `s-${activeG1}-${g2 || idx}`)
            )}

            {/* Add subcategory */}
            <div style={{ marginBottom: 16 }}>
                {addingSubTo === activeG1 ? (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input autoFocus
                            style={{ padding: '6px 12px', fontSize: 13, border: '1px solid #86efac', borderRadius: 8, outline: 'none', width: 200 }}
                            placeholder="Tên mục con..."
                            value={newSubName}
                            onChange={e => setNewSubName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') submitAddSub(activeG1); if (e.key === 'Escape') setAddingSubTo(null); }}
                        />
                        <button onClick={() => submitAddSub(activeG1)}
                            style={{ padding: '6px 14px', fontSize: 12, background: '#16a34a', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}>✓ Thêm</button>
                        <button onClick={() => setAddingSubTo(null)}
                            style={{ padding: '6px 10px', fontSize: 12, background: 'none', border: '1px solid #d1d5db', borderRadius: 8, cursor: 'pointer', color: '#6b7280' }}>✕</button>
                    </div>
                ) : (
                    <button onClick={() => { setAddingSubTo(activeG1); setNewSubName(''); }}
                        style={{ fontSize: 13, color: '#16a34a', background: 'none', border: '1px dashed #86efac', borderRadius: 8, padding: '6px 16px', cursor: 'pointer' }}>
                        + Thêm mục con
                    </button>
                )}
            </div>

            {/* Tab total */}
            <div style={{ background: '#1e3a5f', borderRadius: 8, padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <span style={{ color: 'white', fontWeight: 700, fontSize: 13, letterSpacing: 0.5 }}>TỔNG — {activeG1}</span>
                <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ color: '#93c5fd', fontSize: 13 }}>DT: <strong style={{ color: 'white' }}>{fmt(tabBudget)}</strong></span>
                    {tabActual > 0 && (
                        <span style={{ color: '#93c5fd', fontSize: 13 }}>TT: <strong style={{ color: tabActual > tabBudget ? '#fca5a5' : '#86efac' }}>{fmt(tabActual)}</strong></span>
                    )}
                    {tabActual > 0 && (() => {
                        const v = tabBudget - tabActual;
                        return <span style={{ fontSize: 13, fontWeight: 700, color: v >= 0 ? '#86efac' : '#fca5a5' }}>{v >= 0 ? '+' : ''}{fmt(v)}</span>;
                    })()}
                </div>
            </div>
        </div>

        {/* Import Excel modal */}
        {showImportModal && (
            <div className="modal-overlay" onClick={() => { setShowImportModal(false); setPendingFile(null); }}>
                <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
                    <div className="modal-header">
                        <h3 style={{ margin: 0 }}>📊 Nhập vật tư từ Excel</h3>
                        <button className="modal-close" onClick={() => { setShowImportModal(false); setPendingFile(null); }}>×</button>
                    </div>
                    <div className="modal-body">
                        <p style={{ fontSize: 13, marginBottom: 12 }}>File: <strong>{pendingFile?.name}</strong></p>
                        <div style={{ fontSize: 12, color: '#6b7280', background: '#f9fafb', borderRadius: 8, padding: '10px 14px', lineHeight: 1.8 }}>
                            <strong>Cấu trúc file Excel:</strong><br />
                            Cột A: Nhóm (group1) — VD: Vật tư, Nhân công<br />
                            Cột B: Nhóm con (group2) — VD: Gỗ, Sơn<br />
                            Cột C: Tên hạng mục<br />
                            Cột D: ĐVT &nbsp;|&nbsp; Cột E: SL dự toán &nbsp;|&nbsp; Cột F: Đơn giá DT<br />
                            Cột G: Loại CP (Vật tư / Nhân công / Thầu phụ / Khác)
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button className="btn btn-ghost" onClick={() => { setShowImportModal(false); setPendingFile(null); }}>Hủy</button>
                        <button className="btn btn-primary" disabled={importing} onClick={() => handleImportExcel(pendingFile)}>
                            {importing ? 'Đang nhập...' : 'Nhập dữ liệu'}
                        </button>
                    </div>
                </div>
            </div>
        )}
        {showCopyModal && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
                onClick={() => setShowCopyModal(false)}>
                <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 460, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', overflow: 'hidden' }}
                    onClick={e => e.stopPropagation()}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, fontSize: 16 }}>📋 Sao chép bảng theo dõi</span>
                        <button onClick={() => setShowCopyModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#9ca3af' }}>×</button>
                    </div>
                    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
                            Chọn dự án đích để sao chép toàn bộ hạng mục dự toán sang. Dữ liệu thực tế (SLTT, ĐG TT) sẽ được đặt về 0.
                        </p>
                        <div>
                            <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Dự án đích *</label>
                            <select className="form-select" value={copyTarget} onChange={e => setCopyTarget(e.target.value)} style={{ width: '100%' }}>
                                <option value="">-- Chọn dự án --</option>
                                {copyProjects.map(p => (
                                    <option key={p.id} value={p.id}>{p.code ? `[${p.code}] ` : ''}{p.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div style={{ padding: '12px 20px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        <button onClick={() => setShowCopyModal(false)} style={{ padding: '7px 16px', fontSize: 13, borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer' }}>Hủy</button>
                        <button
                            disabled={!copyTarget || copying}
                            onClick={async () => {
                                setCopying(true);
                                const res = await fetch('/api/material-plans/copy', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ fromProjectId: projectId, toProjectId: copyTarget }),
                                });
                                const d = await res.json();
                                setCopying(false);
                                setShowCopyModal(false);
                                if (res.ok) alert(`Đã sao chép ${d.copied} hạng mục sang dự án đích.`);
                                else alert(d.error || 'Lỗi sao chép');
                            }}
                            style={{ padding: '7px 18px', fontSize: 13, fontWeight: 700, borderRadius: 8, border: 'none', cursor: copyTarget && !copying ? 'pointer' : 'not-allowed',
                                background: copyTarget && !copying ? '#6d28d9' : '#d1d5db', color: '#fff' }}>
                            {copying ? 'Đang sao chép...' : 'Sao chép'}
                        </button>
                    </div>
                </div>
            </div>
        )}
        </>
    );
}
