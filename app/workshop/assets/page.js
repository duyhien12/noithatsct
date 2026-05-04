'use client';
import { useState, useEffect, useCallback } from 'react';

const ASSET_TYPES = [
    'Máy móc - Thiết bị',
    'Phương tiện vận tải',
    'Dụng cụ - Đồ nghề',
    'Thiết bị văn phòng',
    'Công cụ - Dụng cụ',
    'Khác',
];

const fmt = (n) =>
    n == null ? '—' : Number(n).toLocaleString('vi-VN', { style: 'currency', currency: 'VND', minimumFractionDigits: 0 });
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('vi-VN') : '—');
const fmtMonth = (d) => {
    if (!d) return '—';
    const dt = new Date(d);
    return `T${dt.getMonth() + 1}/${dt.getFullYear()}`;
};

function calcFields(a) {
    const depAmt = (a.originalCost * a.depreciationRate) / 100;
    const wearAmt = (a.originalCost * a.wearRate) / 100;
    const annualTotal = depAmt + wearAmt;
    let accumulated = 0;
    let months = 0;
    if (a.startUseDate && annualTotal > 0) {
        const start = new Date(a.startUseDate);
        const end = a.disposalDate ? new Date(a.disposalDate) : new Date();
        months = Math.max(0, (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()));
        accumulated = Math.min(a.originalCost, (annualTotal / 12) * months);
    }
    const remaining = Math.max(0, a.originalCost - accumulated);
    return { depAmt, wearAmt, annualTotal, accumulated, months, remaining };
}

const EMPTY_FORM = {
    name: '', assetType: 'Máy móc - Thiết bị', origin: '', startUseDate: '',
    quantity: 1, originalCost: '', depreciationRate: '', wearRate: '', notes: '',
};

export default function FixedAssetsPage() {
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState('');
    const [filterStatus, setFilterStatus] = useState('Đang dùng');
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [showDisposalModal, setShowDisposalModal] = useState(false);
    const [disposalTarget, setDisposalTarget] = useState(null);
    const [disposalForm, setDisposalForm] = useState({ disposalDate: '', disposalReason: '' });
    const [inlineEdit, setInlineEdit] = useState({ id: '', field: '' });
    const [inlineValue, setInlineValue] = useState('');
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    const fetchAssets = useCallback(async () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (filterType) params.set('assetType', filterType);
        const res = await fetch(`/api/workshop/assets?${params}`);
        const data = await res.json();
        setAssets(Array.isArray(data) ? data : []);
        setLoading(false);
    }, [filterType]);

    useEffect(() => { fetchAssets(); }, [fetchAssets]);

    const filtered = assets.filter(a => {
        if (filterStatus && a.status !== filterStatus) return false;
        if (search) {
            const s = search.toLowerCase();
            if (!a.name.toLowerCase().includes(s) && !a.code.toLowerCase().includes(s)) return false;
        }
        return true;
    });

    const totalCost    = filtered.reduce((s, a) => s + a.originalCost, 0);
    const totalAccDep  = filtered.reduce((s, a) => s + calcFields(a).accumulated, 0);
    const totalRemain  = filtered.reduce((s, a) => s + calcFields(a).remaining, 0);

    /* ── CRUD ── */
    function openCreate() { setEditItem(null); setForm(EMPTY_FORM); setShowModal(true); }
    function openEdit(a) {
        setEditItem(a);
        setForm({ name: a.name, assetType: a.assetType, origin: a.origin,
            startUseDate: a.startUseDate ? a.startUseDate.slice(0, 10) : '',
            quantity: a.quantity ?? 1, originalCost: a.originalCost, depreciationRate: a.depreciationRate,
            wearRate: a.wearRate, notes: a.notes });
        setShowModal(true);
    }
    async function saveAsset() {
        setSaving(true);
        const method = editItem ? 'PUT' : 'POST';
        const body   = editItem ? { id: editItem.id, ...form } : form;
        await fetch('/api/workshop/assets', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        setSaving(false); setShowModal(false); fetchAssets();
    }
    async function deleteAsset(id) {
        if (!confirm('Xóa tài sản này?')) return;
        await fetch(`/api/workshop/assets?id=${id}`, { method: 'DELETE' });
        fetchAssets();
    }
    function openDisposal(a) {
        setDisposalTarget(a);
        setDisposalForm({ disposalDate: new Date().toISOString().slice(0, 10), disposalReason: '' });
        setShowDisposalModal(true);
    }
    async function saveDisposal() {
        await fetch('/api/workshop/assets', { method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: disposalTarget.id, status: 'Đã thanh lý',
                disposalDate: disposalForm.disposalDate, disposalReason: disposalForm.disposalReason }) });
        setShowDisposalModal(false); fetchAssets();
    }
    function startInline(id, field, currentValue) { setInlineEdit({ id, field }); setInlineValue(currentValue || ''); }
    async function saveInline(id, field, value) {
        setInlineEdit({ id: '', field: '' });
        await fetch('/api/workshop/assets', { method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, [field]: value }) });
        fetchAssets();
    }

    function printLedger() {
        const typeName = filterType || 'Tất cả loại';
        const rows = filtered.map((a, i) => {
            const { depAmt, wearAmt, annualTotal, accumulated, remaining } = calcFields(a);
            return `<tr>
              <td>${i + 1}</td><td>${fmtDate(a.createdAt)}</td>
              <td><strong>${a.code}</strong><br/>${a.name}</td>
              <td>${a.origin || '—'}</td><td>${fmtMonth(a.startUseDate)}</td>
              <td>${a.quantity ?? 1}</td>
              <td>${a.originalCost.toLocaleString('vi-VN')}</td>
              <td>${a.depreciationRate}%</td><td>${depAmt.toLocaleString('vi-VN')}</td>
              <td>${a.wearRate}%</td><td>${wearAmt.toLocaleString('vi-VN')}</td>
              <td>${annualTotal.toLocaleString('vi-VN')}</td><td>${accumulated.toLocaleString('vi-VN')}</td>
              <td>${a.disposalDate ? fmtDate(a.disposalDate) : ''}</td>
              <td>${a.disposalReason || ''}</td><td>${remaining.toLocaleString('vi-VN')}</td></tr>`;
        }).join('');
        const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
        <style>body{font-family:'Times New Roman',serif;font-size:11px;margin:20px}
        h2{text-align:center;font-size:14px;text-transform:uppercase;margin-bottom:4px}
        .sub{text-align:center;font-style:italic;margin-bottom:2px;font-size:12px}
        table{border-collapse:collapse;width:100%;margin-top:12px}
        th,td{border:1px solid #000;padding:3px 5px;text-align:center;vertical-align:middle;font-size:10px}
        th{background:#f0f0f0;font-weight:bold}.th-group{background:#ddd}
        tfoot td{font-weight:bold;background:#f9f9f9}
        @media print{@page{size:A3 landscape;margin:10mm}}</style></head><body>
        <h2>Sổ theo dõi tài sản cố định</h2>
        <div class="sub">Loại tài sản cố định: ${typeName}</div>
        <div class="sub">Dùng cho Xưởng nội thất — In ngày ${new Date().toLocaleDateString('vi-VN')}</div>
        <table><thead>
          <tr><th rowSpan="3">STT</th>
            <th colspan="6" class="th-group">Ghi tăng tài sản cố định</th>
            <th colspan="6" class="th-group">Khấu hao (hao mòn) tài sản cố định</th>
            <th colspan="3" class="th-group">Giảm tài sản cố định</th></tr>
          <tr><th rowSpan="2">Ngày, tháng</th><th rowSpan="2">Tên, đặc điểm, ký hiệu TSCĐ</th>
            <th rowSpan="2">Nước sản xuất</th><th rowSpan="2">Tháng, năm đưa vào sử dụng</th>
            <th rowSpan="2">Số lượng</th>
            <th rowSpan="2">Nguyên giá TSCĐ</th>
            <th colspan="2">Khấu hao</th><th colspan="2">Hao mòn</th>
            <th rowSpan="2">Tổng số KH/HM phát sinh trong năm (6=3+5)</th>
            <th rowSpan="2">Lũy kế KH/HM</th>
            <th rowSpan="2">Ngày, tháng</th><th rowSpan="2">Lý do ghi giảm</th>
            <th rowSpan="2">Giá trị còn lại</th></tr>
          <tr><th>Tỷ lệ %</th><th>Số tiền</th><th>Tỷ lệ %</th><th>Số tiền</th></tr>
          <tr style="font-weight:bold;background:#eee;">
            <td>A</td><td>C</td><td>D</td><td>C</td><td>E</td><td>SL</td><td>1</td>
            <td>2</td><td>3</td><td>4</td><td>5</td><td>6=3+5</td><td>7</td>
            <td>G</td><td>E</td><td>8</td></tr>
        </thead><tbody>${rows}</tbody>
        <tfoot><tr>
          <td colspan="5" style="text-align:right">Cộng:</td>
          <td></td>
          <td>${totalCost.toLocaleString('vi-VN')}</td>
          <td></td><td></td><td></td><td></td><td></td>
          <td>${totalAccDep.toLocaleString('vi-VN')}</td>
          <td></td><td></td>
          <td>${totalRemain.toLocaleString('vi-VN')}</td>
        </tr></tfoot></table></body></html>`;
        const win = window.open('', '_blank');
        win.document.write(html); win.document.close(); win.print();
    }

    /* ─────────── RENDER ─────────── */
    return (
        <div>
            {/* ── Header ── */}
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>Xưởng Nội Thất</span><span style={{ color: 'var(--border)' }}>›</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Tài sản cố định</span>
            </div>
            <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between',
                flexDirection: isMobile ? 'column' : 'row', gap: 12, marginBottom: 20 }}>
                <h2 style={{ margin: 0, fontSize: isMobile ? 20 : 26, fontWeight: 800, letterSpacing: -0.5 }}>
                    Sổ Theo Dõi Tài Sản Cố Định
                </h2>
                <div style={{ display: 'flex', gap: 8, width: isMobile ? '100%' : 'auto' }}>
                    <button className="btn btn-ghost" onClick={printLedger}
                        style={{ fontWeight: 600, flex: isMobile ? 1 : 'none' }}>🖨️ In sổ</button>
                    <button className="btn btn-primary" onClick={openCreate}
                        style={{ fontWeight: 600, flex: isMobile ? 1 : 'none' }}>+ Thêm tài sản</button>
                </div>
            </div>

            {/* ── KPI cards ── */}
            <div className="workshop-finance-grid" style={{ display: 'grid',
                gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: isMobile ? 10 : 16, marginBottom: 16 }}>
                {[
                    { bg: '#eff6ff', border: '#2563eb', color: '#1d4ed8', icon: '🏭', label: 'Tổng tài sản',
                      value: filtered.length, sub: 'Đơn vị', big: true },
                    { bg: '#f0fdf4', border: '#16a34a', color: '#15803d', icon: '💰', label: 'Tổng nguyên giá',
                      value: fmt(totalCost), sub: 'Giá trị mua vào' },
                    { bg: '#fff7ed', border: '#ea580c', color: '#c2410c', icon: '📉', label: 'Lũy kế khấu hao',
                      value: fmt(totalAccDep), sub: 'Đã khấu hao/hao mòn' },
                    { bg: '#faf5ff', border: '#7c3aed', color: '#6d28d9', icon: '💎', label: 'Giá trị còn lại',
                      value: fmt(totalRemain), sub: 'Nguyên giá - lũy kế' },
                ].map((c, i) => (
                    <div key={i} style={{ background: c.bg, borderRadius: 12,
                        padding: isMobile ? '14px 16px' : '20px 22px', borderLeft: `5px solid ${c.border}` }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: c.color, marginBottom: 8,
                            textTransform: 'uppercase', letterSpacing: 0.8 }}>{c.icon} {c.label}</div>
                        <div style={{ fontSize: c.big ? (isMobile ? 28 : 32) : (isMobile ? 16 : 22),
                            fontWeight: 800, color: c.color, lineHeight: 1 }}>{c.value}</div>
                        <div style={{ fontSize: 11, color: '#374151', marginTop: 8 }}>{c.sub}</div>
                    </div>
                ))}
            </div>

            {/* ── Filter bar ── */}
            <div className="card" style={{ marginBottom: 14, padding: isMobile ? '12px 14px' : '14px 20px' }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <input className="form-input" placeholder="Tìm mã, tên tài sản..."
                        value={search} onChange={e => setSearch(e.target.value)}
                        style={{ flex: 1, minWidth: isMobile ? '100%' : 200 }} />
                    <select className="form-select" value={filterType} onChange={e => setFilterType(e.target.value)}
                        style={{ flex: isMobile ? 1 : 'none', minWidth: isMobile ? 0 : 200 }}>
                        <option value="">Tất cả loại TSCĐ</option>
                        {ASSET_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                    <select className="form-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                        style={{ flex: isMobile ? 1 : 'none', minWidth: isMobile ? 0 : 150 }}>
                        <option value="">Tất cả trạng thái</option>
                        <option value="Đang dùng">Đang dùng</option>
                        <option value="Đã thanh lý">Đã thanh lý</option>
                    </select>
                    {!isMobile && <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{filtered.length} tài sản</span>}
                </div>
            </div>

            {/* ── Content ── */}
            {loading ? (
                <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
            ) : filtered.length === 0 ? (
                <div className="card" style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>🏭</div>
                    <div style={{ fontWeight: 600 }}>Chưa có tài sản cố định</div>
                    <div style={{ fontSize: 13, marginTop: 6 }}>Nhấn <strong>+ Thêm tài sản</strong> để bắt đầu</div>
                </div>
            ) : isMobile ? (
                /* ══════════════ MOBILE: CARD LIST ══════════════ */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {filtered.map((a, idx) => {
                        const { depAmt, wearAmt, annualTotal, accumulated, months, remaining } = calcFields(a);
                        const isDisposed = a.status === 'Đã thanh lý';
                        return (
                            <div key={a.id} className="card" style={{ padding: '14px 16px',
                                borderLeft: `4px solid ${isDisposed ? '#dc2626' : '#2563eb'}`,
                                opacity: isDisposed ? 0.8 : 1 }}>
                                {/* Card header */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                            <span style={{ fontWeight: 700, color: 'var(--accent-primary)', fontSize: 13 }}>{a.code}</span>
                                            <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10,
                                                background: isDisposed ? '#fef2f2' : '#dbeafe',
                                                color: isDisposed ? '#dc2626' : '#1e40af' }}>{a.status}</span>
                                        </div>
                                        <div style={{ fontWeight: 700, fontSize: 15, marginTop: 2 }}>{a.name}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{a.assetType}{a.origin ? ` · ${a.origin}` : ''}{(a.quantity ?? 1) > 1 ? ` · SL: ${a.quantity}` : ''}</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        <button className="btn btn-ghost btn-sm" style={{ fontSize: 13, padding: '4px 8px' }} onClick={() => openEdit(a)}>✏️</button>
                                        <button className="btn btn-ghost btn-sm" style={{ fontSize: 13, color: 'var(--status-danger)', padding: '4px 8px' }} onClick={() => deleteAsset(a.id)}>🗑️</button>
                                    </div>
                                </div>

                                {/* Key numbers */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 10 }}>
                                    <div style={{ background: '#f9fafb', borderRadius: 8, padding: '8px 10px' }}>
                                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>Nguyên giá</div>
                                        <div style={{ fontSize: 13, fontWeight: 700 }}>{a.originalCost > 0 ? (a.originalCost / 1e6).toFixed(1) + 'tr' : '—'}</div>
                                    </div>
                                    <div style={{ background: '#fff7ed', borderRadius: 8, padding: '8px 10px' }}>
                                        <div style={{ fontSize: 10, color: '#c2410c', marginBottom: 3 }}>Lũy kế KH</div>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: '#c2410c' }}>
                                            {accumulated > 0 ? (accumulated / 1e6).toFixed(1) + 'tr' : '0'}
                                            {months > 0 && <span style={{ fontSize: 9, display: 'block', fontWeight: 400, color: 'var(--text-muted)' }}>{months} tháng</span>}
                                        </div>
                                    </div>
                                    <div style={{ background: '#f0fdf4', borderRadius: 8, padding: '8px 10px' }}>
                                        <div style={{ fontSize: 10, color: '#15803d', marginBottom: 3 }}>Còn lại</div>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: '#15803d' }}>{remaining > 0 ? (remaining / 1e6).toFixed(1) + 'tr' : '—'}</div>
                                    </div>
                                </div>

                                {/* Rates + dates */}
                                <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-muted)', flexWrap: 'wrap', marginBottom: 10 }}>
                                    {a.startUseDate && <span>📅 Sử dụng: <strong>{fmtMonth(a.startUseDate)}</strong></span>}
                                    {a.depreciationRate > 0 && <span>KH: <strong>{a.depreciationRate}%</strong>/năm</span>}
                                    {a.wearRate > 0 && <span>HM: <strong>{a.wearRate}%</strong>/năm</span>}
                                    {annualTotal > 0 && <span>Tổng: <strong>{(annualTotal / 1e6).toFixed(2)}tr/năm</strong></span>}
                                </div>

                                {/* Disposal info */}
                                {(a.disposalDate || a.disposalReason) && (
                                    <div style={{ background: '#fef2f2', borderRadius: 8, padding: '8px 10px', marginBottom: 10, fontSize: 12 }}>
                                        {a.disposalDate && <div>📤 Ngày giảm: <strong>{fmtDate(a.disposalDate)}</strong></div>}
                                        {a.disposalReason && <div>Lý do: {a.disposalReason}</div>}
                                    </div>
                                )}

                                {/* Actions */}
                                {!isDisposed && (
                                    <button className="btn btn-sm" style={{ width: '100%', background: '#fef3c7', color: '#92400e',
                                        border: '1px solid #fcd34d', fontWeight: 600, fontSize: 13 }}
                                        onClick={() => openDisposal(a)}>
                                        📤 Ghi giảm / Thanh lý
                                    </button>
                                )}
                            </div>
                        );
                    })}
                    <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', padding: '8px 0' }}>
                        {filtered.length} tài sản · Tổng còn lại: <strong>{fmt(totalRemain)}</strong>
                    </div>
                </div>
            ) : (
                /* ══════════════ DESKTOP: TABLE ══════════════ */
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                            <thead>
                                <tr>
                                    <th rowSpan={3} style={thStyle()}>STT</th>
                                    <th colSpan={6} style={thStyle('#dbeafe', true)}>Ghi tăng tài sản cố định</th>
                                    <th colSpan={6} style={thStyle('#fef9c3', true)}>Khấu hao (hao mòn) tài sản cố định</th>
                                    <th colSpan={3} style={thStyle('#fce7f3', true)}>Giảm tài sản cố định</th>
                                    <th rowSpan={3} style={thStyle()}>Thao tác</th>
                                </tr>
                                <tr>
                                    <th rowSpan={2} style={thStyle('#eff6ff')}>Ngày ghi</th>
                                    <th rowSpan={2} style={thStyle('#eff6ff', false, 200)}>Tên, ký hiệu TSCĐ</th>
                                    <th rowSpan={2} style={thStyle('#eff6ff')}>Nước SX</th>
                                    <th rowSpan={2} style={thStyle('#eff6ff')}>T/năm SD</th>
                                    <th rowSpan={2} style={thStyle('#eff6ff')}>SL</th>
                                    <th rowSpan={2} style={thStyle('#eff6ff')}>Nguyên giá</th>
                                    <th colSpan={2} style={thStyle('#fefce8')}>Khấu hao</th>
                                    <th colSpan={2} style={thStyle('#fefce8')}>Hao mòn</th>
                                    <th rowSpan={2} style={thStyle('#fefce8', false, 90)}>Tổng KH/HM/năm</th>
                                    <th rowSpan={2} style={thStyle('#fefce8', false, 100)}>Lũy kế KH/HM</th>
                                    <th rowSpan={2} style={thStyle('#fdf2f8')}>Ngày giảm</th>
                                    <th rowSpan={2} style={thStyle('#fdf2f8', false, 140)}>Lý do giảm</th>
                                    <th rowSpan={2} style={thStyle('#fdf2f8')}>Giá trị còn lại</th>
                                </tr>
                                <tr>
                                    <th style={thStyle('#fefce8')}>Tỷ lệ %</th>
                                    <th style={thStyle('#fefce8')}>Số tiền</th>
                                    <th style={thStyle('#fefce8')}>Tỷ lệ %</th>
                                    <th style={thStyle('#fefce8')}>Số tiền</th>
                                </tr>
                                <tr style={{ background: '#f3f4f6' }}>
                                    {['A','C','D','C','E','SL','1','2','3','4','5','6=3+5','7','G','E','8',''].map((h, i) => (
                                        <td key={i} style={{ border: '1px solid #d1d5db', padding: '4px 6px', textAlign: 'center', fontWeight: 700, fontSize: 11 }}>{h}</td>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((a, idx) => {
                                    const { depAmt, wearAmt, annualTotal, accumulated, months, remaining } = calcFields(a);
                                    const isDisposed = a.status === 'Đã thanh lý';
                                    return (
                                        <tr key={a.id} style={{ opacity: isDisposed ? 0.7 : 1, background: isDisposed ? '#fef2f2' : 'inherit' }}>
                                            <td style={tdStyle('center')}>{idx + 1}</td>
                                            <td style={tdStyle('center')}>{fmtDate(a.createdAt)}</td>
                                            <td style={{ ...tdStyle(), minWidth: 180 }}>
                                                <div style={{ fontWeight: 700, color: 'var(--accent-primary)', fontSize: 12 }}>{a.code}</div>
                                                <div style={{ fontWeight: 600 }}>{a.name}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.assetType}</div>
                                            </td>
                                            <td style={tdStyle('center')}>{a.origin || '—'}</td>
                                            <td style={tdStyle('center')}>{fmtMonth(a.startUseDate)}</td>
                                            <td style={tdStyle('center')}>{a.quantity ?? 1}</td>
                                            <td style={{ ...tdStyle('right'), fontWeight: 700 }}>{a.originalCost > 0 ? a.originalCost.toLocaleString('vi-VN') : '—'}</td>
                                            <td style={tdStyle('center')}>{a.depreciationRate > 0 ? `${a.depreciationRate}%` : '—'}</td>
                                            <td style={tdStyle('right')}>{depAmt > 0 ? depAmt.toLocaleString('vi-VN') : '—'}</td>
                                            <td style={tdStyle('center')}>{a.wearRate > 0 ? `${a.wearRate}%` : '—'}</td>
                                            <td style={tdStyle('right')}>{wearAmt > 0 ? wearAmt.toLocaleString('vi-VN') : '—'}</td>
                                            <td style={{ ...tdStyle('right'), fontWeight: 600, color: '#92400e' }}>{annualTotal > 0 ? annualTotal.toLocaleString('vi-VN') : '—'}</td>
                                            <td style={{ ...tdStyle('right'), fontWeight: 700, color: '#dc2626' }}>
                                                {accumulated > 0 ? accumulated.toLocaleString('vi-VN') : '0'}
                                                {months > 0 && <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400, marginTop: 2 }}>{months} tháng</div>}
                                            </td>
                                            <td style={{ ...tdStyle('center'), cursor: 'pointer', minWidth: 110 }}
                                                title="Nhấn để sửa ngày giảm"
                                                onClick={() => inlineEdit.id !== a.id || inlineEdit.field !== 'disposalDate' ? startInline(a.id, 'disposalDate', a.disposalDate ? a.disposalDate.slice(0, 10) : '') : null}>
                                                {inlineEdit.id === a.id && inlineEdit.field === 'disposalDate' ? (
                                                    <input type="date" autoFocus value={inlineValue}
                                                        onChange={e => setInlineValue(e.target.value)}
                                                        onBlur={() => saveInline(a.id, 'disposalDate', inlineValue || null)}
                                                        onKeyDown={e => { if (e.key === 'Enter') saveInline(a.id, 'disposalDate', inlineValue || null); if (e.key === 'Escape') setInlineEdit({ id: '', field: '' }); }}
                                                        style={{ width: 110, fontSize: 11, border: '1.5px solid var(--accent-primary)', borderRadius: 4, padding: '2px 4px' }}
                                                        onClick={e => e.stopPropagation()} />
                                                ) : (
                                                    <span>{fmtDate(a.disposalDate)}<span style={{ fontSize: 9, marginLeft: 3, opacity: 0.5 }}>✏️</span></span>
                                                )}
                                            </td>
                                            <td style={{ ...tdStyle(), fontSize: 11, cursor: 'pointer', minWidth: 140 }}
                                                title="Nhấn để sửa lý do giảm"
                                                onClick={() => inlineEdit.id !== a.id || inlineEdit.field !== 'disposalReason' ? startInline(a.id, 'disposalReason', a.disposalReason || '') : null}>
                                                {inlineEdit.id === a.id && inlineEdit.field === 'disposalReason' ? (
                                                    <input type="text" autoFocus value={inlineValue}
                                                        onChange={e => setInlineValue(e.target.value)}
                                                        onBlur={() => saveInline(a.id, 'disposalReason', inlineValue)}
                                                        onKeyDown={e => { if (e.key === 'Enter') saveInline(a.id, 'disposalReason', inlineValue); if (e.key === 'Escape') setInlineEdit({ id: '', field: '' }); }}
                                                        placeholder="Nhập lý do..."
                                                        style={{ width: '100%', fontSize: 11, border: '1.5px solid var(--accent-primary)', borderRadius: 4, padding: '2px 4px' }}
                                                        onClick={e => e.stopPropagation()} />
                                                ) : (
                                                    <span>{a.disposalReason || <span style={{ color: 'var(--text-muted)' }}>—</span>}<span style={{ fontSize: 9, marginLeft: 3, opacity: 0.5 }}>✏️</span></span>
                                                )}
                                            </td>
                                            <td style={{ ...tdStyle('right'), fontWeight: 700, color: remaining > 0 ? '#15803d' : 'var(--text-muted)' }}>
                                                {remaining.toLocaleString('vi-VN')}
                                            </td>
                                            <td style={{ ...tdStyle('center'), whiteSpace: 'nowrap', minWidth: 120 }}>
                                                <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                                                    <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => openEdit(a)}>✏️</button>
                                                    {!isDisposed && (
                                                        <button className="btn btn-sm"
                                                            style={{ fontSize: 11, padding: '3px 8px', background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' }}
                                                            onClick={() => openDisposal(a)}>📤 Thanh lý</button>
                                                    )}
                                                    <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, color: 'var(--status-danger)', padding: '3px 8px' }} onClick={() => deleteAsset(a.id)}>🗑️</button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot>
                                <tr style={{ background: '#f9fafb', fontWeight: 700 }}>
                                    <td colSpan={5} style={{ ...tdStyle('right'), fontSize: 13 }}>Cộng:</td>
                                    <td style={tdStyle()} />
                                    <td style={{ ...tdStyle('right'), fontSize: 13 }}>{totalCost.toLocaleString('vi-VN')}</td>
                                    <td style={tdStyle()} /><td style={tdStyle()} /><td style={tdStyle()} /><td style={tdStyle()} /><td style={tdStyle()} />
                                    <td style={{ ...tdStyle('right'), fontSize: 13, color: '#dc2626' }}>{totalAccDep.toLocaleString('vi-VN')}</td>
                                    <td style={tdStyle()} /><td style={tdStyle()} />
                                    <td style={{ ...tdStyle('right'), fontSize: 13, color: '#15803d' }}>{totalRemain.toLocaleString('vi-VN')}</td>
                                    <td style={tdStyle()} />
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}

            {/* ══ Modal thêm/sửa ══ */}
            {showModal && (
                <div style={overlayStyle}>
                    <div style={modalStyle(isMobile)}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>
                                {editItem ? '✏️ Sửa tài sản cố định' : '+ Thêm tài sản cố định'}
                            </h3>
                            <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text-muted)', lineHeight: 1 }}>×</button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label style={labelStyle}>Tên tài sản <span style={{ color: 'red' }}>*</span></label>
                                <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Vd: Máy CNC, Xe tải..." />
                            </div>
                            <div>
                                <label style={labelStyle}>Loại TSCĐ</label>
                                <select className="form-select" value={form.assetType} onChange={e => setForm(f => ({ ...f, assetType: e.target.value }))}>
                                    {ASSET_TYPES.map(t => <option key={t}>{t}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={labelStyle}>Nước sản xuất</label>
                                <input className="form-input" value={form.origin} onChange={e => setForm(f => ({ ...f, origin: e.target.value }))} placeholder="Vd: Việt Nam, Trung Quốc..." />
                            </div>
                            <div>
                                <label style={labelStyle}>Ngày đưa vào sử dụng</label>
                                <input type="date" className="form-input" value={form.startUseDate} onChange={e => setForm(f => ({ ...f, startUseDate: e.target.value }))} />
                            </div>
                            <div>
                                <label style={labelStyle}>Số lượng</label>
                                <input type="number" className="form-input" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} placeholder="1" min="1" step="1" />
                            </div>
                            <div>
                                <label style={labelStyle}>Nguyên giá TSCĐ (₫)</label>
                                <input type="number" className="form-input" value={form.originalCost} onChange={e => setForm(f => ({ ...f, originalCost: e.target.value }))} placeholder="0" />
                            </div>
                            <div>
                                <label style={labelStyle}>Tỷ lệ khấu hao (%/năm)</label>
                                <input type="number" className="form-input" value={form.depreciationRate} onChange={e => setForm(f => ({ ...f, depreciationRate: e.target.value }))} placeholder="0" step="0.1" />
                            </div>
                            <div>
                                <label style={labelStyle}>Tỷ lệ hao mòn (%/năm)</label>
                                <input type="number" className="form-input" value={form.wearRate} onChange={e => setForm(f => ({ ...f, wearRate: e.target.value }))} placeholder="0" step="0.1" />
                            </div>
                            {Number(form.originalCost) > 0 && (Number(form.depreciationRate) > 0 || Number(form.wearRate) > 0) && (
                                <div style={{ gridColumn: '1 / -1', background: '#f0fdf4', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
                                    <span style={{ fontWeight: 600, color: '#15803d' }}>Dự tính/năm: </span>
                                    KH {((form.originalCost * form.depreciationRate) / 100).toLocaleString('vi-VN')}₫ + HM {((form.originalCost * (form.wearRate || 0)) / 100).toLocaleString('vi-VN')}₫ =
                                    <strong> {((form.originalCost * (parseFloat(form.depreciationRate || 0) + parseFloat(form.wearRate || 0))) / 100).toLocaleString('vi-VN')}₫/năm</strong>
                                </div>
                            )}
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label style={labelStyle}>Ghi chú</label>
                                <textarea className="form-input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Thông tin bổ sung..." />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                            <button className="btn btn-ghost" onClick={() => setShowModal(false)} style={{ flex: 1 }}>Hủy</button>
                            <button className="btn btn-primary" onClick={saveAsset} disabled={saving || !form.name} style={{ flex: 2 }}>
                                {saving ? 'Đang lưu...' : editItem ? 'Cập nhật' : 'Thêm tài sản'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══ Modal thanh lý ══ */}
            {showDisposalModal && disposalTarget && (
                <div style={overlayStyle}>
                    <div style={modalStyle(isMobile)}>
                        <h3 style={{ margin: '0 0 14px', fontSize: 17, fontWeight: 700 }}>📤 Ghi giảm / Thanh lý TSCĐ</h3>
                        <div style={{ background: '#fef3c7', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13 }}>
                            <strong>{disposalTarget.code}</strong> — {disposalTarget.name}<br />
                            Nguyên giá: <strong>{fmt(disposalTarget.originalCost)}</strong> · Còn lại: <strong>{fmt(calcFields(disposalTarget).remaining)}</strong>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div>
                                <label style={labelStyle}>Ngày thanh lý</label>
                                <input type="date" className="form-input" value={disposalForm.disposalDate} onChange={e => setDisposalForm(f => ({ ...f, disposalDate: e.target.value }))} />
                            </div>
                            <div>
                                <label style={labelStyle}>Lý do ghi giảm</label>
                                <textarea className="form-input" value={disposalForm.disposalReason} onChange={e => setDisposalForm(f => ({ ...f, disposalReason: e.target.value }))} rows={3} placeholder="Vd: Hỏng, bán lại, hết khấu hao..." />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                            <button className="btn btn-ghost" onClick={() => setShowDisposalModal(false)} style={{ flex: 1 }}>Hủy</button>
                            <button className="btn btn-primary" style={{ flex: 2, background: '#dc2626' }} onClick={saveDisposal}>Xác nhận thanh lý</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function thStyle(bg = '#f3f4f6', center = true, minW) {
    return { border: '1px solid #d1d5db', padding: '8px 10px', background: bg,
        textAlign: center ? 'center' : 'left', fontWeight: 700, fontSize: 11,
        whiteSpace: 'normal', verticalAlign: 'middle', ...(minW ? { minWidth: minW } : {}) };
}
function tdStyle(align = 'left') {
    return { border: '1px solid #e5e7eb', padding: '8px 10px', textAlign: align, verticalAlign: 'middle', fontSize: 12 };
}
const overlayStyle = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
};
function modalStyle(isMobile) {
    return { background: 'var(--bg-card)', borderRadius: isMobile ? 12 : 16,
        padding: isMobile ? '20px 16px' : 28, width: '100%',
        maxWidth: isMobile ? '100%' : 560, maxHeight: '92vh', overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)' };
}
const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 5 };
