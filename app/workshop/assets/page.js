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

    // Tự tính lũy kế theo số tháng đã sử dụng
    let accumulated = 0;
    if (a.startUseDate && annualTotal > 0) {
        const start = new Date(a.startUseDate);
        const end = a.disposalDate ? new Date(a.disposalDate) : new Date();
        const months = Math.max(0, (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()));
        accumulated = Math.min(a.originalCost, (annualTotal / 12) * months);
    }

    const remaining = Math.max(0, a.originalCost - accumulated);
    return { depAmt, wearAmt, annualTotal, accumulated, remaining };
}

const EMPTY_FORM = {
    name: '', assetType: 'Máy móc - Thiết bị', origin: '', startUseDate: '',
    originalCost: '', depreciationRate: '', wearRate: '', notes: '',
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
    const [showAccModal, setShowAccModal] = useState(false);
    const [accTarget, setAccTarget] = useState(null);
    const [accValue, setAccValue] = useState('');
    const [inlineEdit, setInlineEdit] = useState({ id: '', field: '' });
    const [inlineValue, setInlineValue] = useState('');

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

    /* ── KPI ── */
    const totalCost = filtered.reduce((s, a) => s + a.originalCost, 0);
    const totalAccDep = filtered.reduce((s, a) => s + calcFields(a).accumulated, 0);
    const totalRemaining = filtered.reduce((s, a) => s + calcFields(a).remaining, 0);

    /* ── CRUD ── */
    function openCreate() {
        setEditItem(null);
        setForm(EMPTY_FORM);
        setShowModal(true);
    }
    function openEdit(a) {
        setEditItem(a);
        setForm({
            name: a.name,
            assetType: a.assetType,
            origin: a.origin,
            startUseDate: a.startUseDate ? a.startUseDate.slice(0, 10) : '',
            originalCost: a.originalCost,
            depreciationRate: a.depreciationRate,
            wearRate: a.wearRate,
            notes: a.notes,
        });
        setShowModal(true);
    }
    async function saveAsset() {
        setSaving(true);
        const method = editItem ? 'PUT' : 'POST';
        const body = editItem ? { id: editItem.id, ...form } : form;
        await fetch('/api/workshop/assets', {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        setSaving(false);
        setShowModal(false);
        fetchAssets();
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
        const { remaining } = calcFields(disposalTarget);
        await fetch('/api/workshop/assets', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: disposalTarget.id,
                status: 'Đã thanh lý',
                disposalDate: disposalForm.disposalDate,
                disposalReason: disposalForm.disposalReason,
                accumulatedDepreciation: disposalTarget.originalCost,
            }),
        });
        setShowDisposalModal(false);
        fetchAssets();
    }

    function openAcc(a) {
        setAccTarget(a);
        setAccValue(a.accumulatedDepreciation);
        setShowAccModal(true);
    }
    async function saveAcc() {
        await fetch('/api/workshop/assets', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: accTarget.id, accumulatedDepreciation: accValue }),
        });
        setShowAccModal(false);
        fetchAssets();
    }

    function startInline(id, field, currentValue) {
        setInlineEdit({ id, field });
        setInlineValue(currentValue || '');
    }
    async function saveInline(id, field, value) {
        setInlineEdit({ id: '', field: '' });
        await fetch('/api/workshop/assets', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, [field]: value }),
        });
        fetchAssets();
    }

    function printLedger() {
        const typeName = filterType || 'Tất cả loại';
        const rows = filtered.map((a, i) => {
            const { depAmt, wearAmt, annualTotal, accumulated, remaining } = calcFields(a);
            return `<tr>
              <td>${i + 1}</td>
              <td>${fmtDate(a.createdAt)}</td>
              <td><strong>${a.code}</strong><br/>${a.name}</td>
              <td>${a.origin || '—'}</td>
              <td>${fmtMonth(a.startUseDate)}</td>
              <td>${a.originalCost.toLocaleString('vi-VN')}</td>
              <td>${a.depreciationRate}%</td>
              <td>${depAmt.toLocaleString('vi-VN')}</td>
              <td>${a.wearRate}%</td>
              <td>${wearAmt.toLocaleString('vi-VN')}</td>
              <td>${annualTotal.toLocaleString('vi-VN')}</td>
              <td>${accumulated.toLocaleString('vi-VN')}</td>
              <td>${a.disposalDate ? fmtDate(a.disposalDate) : ''}</td>
              <td>${a.disposalReason || ''}</td>
              <td>${remaining.toLocaleString('vi-VN')}</td>
            </tr>`;
        }).join('');
        const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
        <style>
          body { font-family: Times New Roman, serif; font-size: 11px; margin: 20px; }
          h2 { text-align: center; font-size: 14px; text-transform: uppercase; margin-bottom: 4px; }
          .subtitle { text-align: center; font-style: italic; margin-bottom: 2px; font-size: 12px; }
          table { border-collapse: collapse; width: 100%; margin-top: 12px; }
          th, td { border: 1px solid #000; padding: 3px 5px; text-align: center; vertical-align: middle; font-size: 10px; }
          th { background: #f0f0f0; font-weight: bold; }
          .th-group { background: #ddd; }
          tfoot td { font-weight: bold; background: #f9f9f9; }
          @media print { @page { size: A3 landscape; margin: 10mm; } }
        </style></head><body>
        <h2>Sổ theo dõi tài sản cố định</h2>
        <div class="subtitle">Loại tài sản cố định: ${typeName}</div>
        <div class="subtitle">Dùng cho Xưởng nội thất — In ngày ${new Date().toLocaleDateString('vi-VN')}</div>
        <table>
          <thead>
            <tr>
              <th rowSpan="3">STT</th>
              <th colspan="5" class="th-group">Ghi tăng tài sản cố định</th>
              <th colspan="6" class="th-group">Khấu hao (hao mòn) tài sản cố định</th>
              <th colspan="3" class="th-group">Giảm tài sản cố định</th>
            </tr>
            <tr>
              <th rowSpan="2">Ngày, tháng</th>
              <th rowSpan="2">Tên, đặc điểm, ký hiệu TSCĐ</th>
              <th rowSpan="2">Nước sản xuất</th>
              <th rowSpan="2">Tháng, năm đưa vào sử dụng</th>
              <th rowSpan="2">Nguyên giá TSCĐ</th>
              <th colspan="2">Khấu hao</th>
              <th colspan="2">Hao mòn</th>
              <th rowSpan="2">Tổng số KH/HM phát sinh trong năm (6=3+5)</th>
              <th rowSpan="2">Lũy kế KH/HM đến khi ghi giảm</th>
              <th rowSpan="2">Ngày, tháng</th>
              <th rowSpan="2">Lý do ghi giảm</th>
              <th rowSpan="2">Giá trị còn lại</th>
            </tr>
            <tr>
              <th>Tỷ lệ %</th><th>Số tiền</th>
              <th>Tỷ lệ %</th><th>Số tiền</th>
            </tr>
            <tr style="font-weight:bold;background:#eee;">
              <td>A</td><td>C</td><td>D</td><td>C</td><td>E</td><td>1</td>
              <td>2</td><td>3</td><td>4</td><td>5</td><td>6=3+5</td><td>7</td>
              <td>G</td><td>E</td><td>8</td>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr>
              <td colspan="5" style="text-align:right">Cộng:</td>
              <td>${totalCost.toLocaleString('vi-VN')}</td>
              <td></td><td></td><td></td><td></td>
              <td></td>
              <td>${totalAccDep.toLocaleString('vi-VN')}</td>
              <td></td><td></td>
              <td>${totalRemaining.toLocaleString('vi-VN')}</td>
            </tr>
          </tfoot>
        </table>
        </body></html>`;
        const win = window.open('', '_blank');
        win.document.write(html);
        win.document.close();
        win.print();
    }

    /* ─────────────────────────── RENDER ─────────────────────────── */
    return (
        <div>
            {/* Breadcrumb */}
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>Xưởng Nội Thất</span>
                <span style={{ color: 'var(--border)' }}>›</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Tài sản cố định</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: -0.5 }}>Sổ Theo Dõi Tài Sản Cố Định</h2>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-ghost" onClick={printLedger} style={{ fontWeight: 600 }}>🖨️ In sổ</button>
                    <button className="btn btn-primary" onClick={openCreate} style={{ fontWeight: 600 }}>+ Thêm tài sản</button>
                </div>
            </div>

            {/* ── KPI cards ── */}
            <div className="workshop-finance-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
                <div style={{ background: '#eff6ff', borderRadius: 12, padding: '20px 22px', borderLeft: '5px solid #2563eb' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#1d4ed8', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.8 }}>🏭 Tổng tài sản</div>
                    <div style={{ fontSize: 32, fontWeight: 800, color: '#1d4ed8', lineHeight: 1 }}>{filtered.length}</div>
                    <div style={{ fontSize: 12, color: '#374151', marginTop: 10 }}>Đơn vị (tài sản)</div>
                </div>
                <div style={{ background: '#f0fdf4', borderRadius: 12, padding: '20px 22px', borderLeft: '5px solid #16a34a' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#15803d', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.8 }}>💰 Tổng nguyên giá</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#15803d', lineHeight: 1 }}>{fmt(totalCost)}</div>
                    <div style={{ fontSize: 12, color: '#374151', marginTop: 10 }}>Giá trị mua vào</div>
                </div>
                <div style={{ background: '#fff7ed', borderRadius: 12, padding: '20px 22px', borderLeft: '5px solid #ea580c' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#c2410c', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.8 }}>📉 Lũy kế khấu hao</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#c2410c', lineHeight: 1 }}>{fmt(totalAccDep)}</div>
                    <div style={{ fontSize: 12, color: '#374151', marginTop: 10 }}>Đã khấu hao/hao mòn</div>
                </div>
                <div style={{ background: '#faf5ff', borderRadius: 12, padding: '20px 22px', borderLeft: '5px solid #7c3aed' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#6d28d9', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.8 }}>💎 Giá trị còn lại</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#6d28d9', lineHeight: 1 }}>{fmt(totalRemaining)}</div>
                    <div style={{ fontSize: 12, color: '#374151', marginTop: 10 }}>Nguyên giá - lũy kế</div>
                </div>
            </div>

            {/* ── Filter bar ── */}
            <div className="card" style={{ marginBottom: 16, padding: '14px 20px' }}>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                    <input
                        className="form-input"
                        placeholder="Tìm mã, tên tài sản..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ flex: 1, minWidth: 200 }}
                    />
                    <select className="form-select" value={filterType} onChange={e => setFilterType(e.target.value)} style={{ minWidth: 200 }}>
                        <option value="">Tất cả loại TSCĐ</option>
                        {ASSET_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                    <select className="form-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ minWidth: 150 }}>
                        <option value="">Tất cả trạng thái</option>
                        <option value="Đang dùng">Đang dùng</option>
                        <option value="Đã thanh lý">Đã thanh lý</option>
                    </select>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {filtered.length} tài sản
                    </span>
                </div>
            </div>

            {/* ── Table ── */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
                ) : filtered.length === 0 ? (
                    <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
                        <div style={{ fontSize: 40, marginBottom: 12 }}>🏭</div>
                        <div style={{ fontWeight: 600 }}>Chưa có tài sản cố định</div>
                        <div style={{ fontSize: 13, marginTop: 6 }}>Nhấn <strong>+ Thêm tài sản</strong> để bắt đầu</div>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                            <thead>
                                <tr>
                                    <th rowSpan={3} style={thStyle()}>STT</th>
                                    {/* Ghi tăng */}
                                    <th colSpan={5} style={thStyle('#dbeafe', true)}>Ghi tăng tài sản cố định</th>
                                    {/* Khấu hao */}
                                    <th colSpan={6} style={thStyle('#fef9c3', true)}>Khấu hao (hao mòn) tài sản cố định</th>
                                    {/* Giảm */}
                                    <th colSpan={3} style={thStyle('#fce7f3', true)}>Giảm tài sản cố định</th>
                                    <th rowSpan={3} style={thStyle()}>Thao tác</th>
                                </tr>
                                <tr>
                                    <th rowSpan={2} style={thStyle('#eff6ff')}>Ngày ghi</th>
                                    <th rowSpan={2} style={thStyle('#eff6ff', false, 200)}>Tên, ký hiệu TSCĐ</th>
                                    <th rowSpan={2} style={thStyle('#eff6ff')}>Nước SX</th>
                                    <th rowSpan={2} style={thStyle('#eff6ff')}>T/năm SD</th>
                                    <th rowSpan={2} style={thStyle('#eff6ff')}>Nguyên giá</th>
                                    <th colSpan={2} style={thStyle('#fefce8')}>Khấu hao</th>
                                    <th colSpan={2} style={thStyle('#fefce8')}>Hao mòn</th>
                                    <th rowSpan={2} style={thStyle('#fefce8', false, 90)}>Tổng KH/HM/năm (6=3+5)</th>
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
                                    {['A','C','D','C','E','1','2','3','4','5','6=3+5','7','G','E','8',''].map((h,i)=>(
                                        <td key={i} style={{ border: '1px solid #d1d5db', padding: '4px 6px', textAlign: 'center', fontWeight: 700, fontSize: 11 }}>{h}</td>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((a, idx) => {
                                    const { depAmt, wearAmt, annualTotal, accumulated, remaining } = calcFields(a);
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
                                            <td style={{ ...tdStyle('right'), fontWeight: 700 }}>{a.originalCost > 0 ? a.originalCost.toLocaleString('vi-VN') : '—'}</td>
                                            <td style={tdStyle('center')}>{a.depreciationRate > 0 ? `${a.depreciationRate}%` : '—'}</td>
                                            <td style={tdStyle('right')}>{depAmt > 0 ? depAmt.toLocaleString('vi-VN') : '—'}</td>
                                            <td style={tdStyle('center')}>{a.wearRate > 0 ? `${a.wearRate}%` : '—'}</td>
                                            <td style={tdStyle('right')}>{wearAmt > 0 ? wearAmt.toLocaleString('vi-VN') : '—'}</td>
                                            <td style={{ ...tdStyle('right'), fontWeight: 600, color: '#92400e' }}>{annualTotal > 0 ? annualTotal.toLocaleString('vi-VN') : '—'}</td>
                                            <td style={{ ...tdStyle('right'), fontWeight: 700, color: '#dc2626' }}>
                                                {accumulated > 0 ? accumulated.toLocaleString('vi-VN') : '0'}
                                                {a.startUseDate && annualTotal > 0 && (
                                                    <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400, marginTop: 2 }}>
                                                        {(() => {
                                                            const start = new Date(a.startUseDate);
                                                            const end = a.disposalDate ? new Date(a.disposalDate) : new Date();
                                                            const months = Math.max(0, (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()));
                                                            return `${months} tháng`;
                                                        })()}
                                                    </div>
                                                )}
                                            </td>
                                            <td
                                                style={{ ...tdStyle('center'), cursor: 'pointer', minWidth: 110 }}
                                                title="Nhấn để sửa ngày giảm"
                                                onClick={() => inlineEdit.id !== a.id || inlineEdit.field !== 'disposalDate' ? startInline(a.id, 'disposalDate', a.disposalDate ? a.disposalDate.slice(0, 10) : '') : null}
                                            >
                                                {inlineEdit.id === a.id && inlineEdit.field === 'disposalDate' ? (
                                                    <input
                                                        type="date"
                                                        autoFocus
                                                        value={inlineValue}
                                                        onChange={e => setInlineValue(e.target.value)}
                                                        onBlur={() => saveInline(a.id, 'disposalDate', inlineValue || null)}
                                                        onKeyDown={e => { if (e.key === 'Enter') saveInline(a.id, 'disposalDate', inlineValue || null); if (e.key === 'Escape') setInlineEdit({ id: '', field: '' }); }}
                                                        style={{ width: 110, fontSize: 11, border: '1.5px solid var(--accent-primary)', borderRadius: 4, padding: '2px 4px' }}
                                                        onClick={e => e.stopPropagation()}
                                                    />
                                                ) : (
                                                    <span>
                                                        {fmtDate(a.disposalDate)}
                                                        <span style={{ fontSize: 9, marginLeft: 3, opacity: 0.5 }}>✏️</span>
                                                    </span>
                                                )}
                                            </td>
                                            <td
                                                style={{ ...tdStyle(), fontSize: 11, cursor: 'pointer', minWidth: 140 }}
                                                title="Nhấn để sửa lý do giảm"
                                                onClick={() => inlineEdit.id !== a.id || inlineEdit.field !== 'disposalReason' ? startInline(a.id, 'disposalReason', a.disposalReason || '') : null}
                                            >
                                                {inlineEdit.id === a.id && inlineEdit.field === 'disposalReason' ? (
                                                    <input
                                                        type="text"
                                                        autoFocus
                                                        value={inlineValue}
                                                        onChange={e => setInlineValue(e.target.value)}
                                                        onBlur={() => saveInline(a.id, 'disposalReason', inlineValue)}
                                                        onKeyDown={e => { if (e.key === 'Enter') saveInline(a.id, 'disposalReason', inlineValue); if (e.key === 'Escape') setInlineEdit({ id: '', field: '' }); }}
                                                        placeholder="Nhập lý do..."
                                                        style={{ width: '100%', fontSize: 11, border: '1.5px solid var(--accent-primary)', borderRadius: 4, padding: '2px 4px' }}
                                                        onClick={e => e.stopPropagation()}
                                                    />
                                                ) : (
                                                    <span>
                                                        {a.disposalReason || <span style={{ color: 'var(--text-muted)' }}>—</span>}
                                                        <span style={{ fontSize: 9, marginLeft: 3, opacity: 0.5 }}>✏️</span>
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ ...tdStyle('right'), fontWeight: 700, color: remaining > 0 ? '#15803d' : 'var(--text-muted)' }}>
                                                {remaining.toLocaleString('vi-VN')}
                                            </td>
                                            <td style={{ ...tdStyle('center'), whiteSpace: 'nowrap', minWidth: 120 }}>
                                                <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                                                    <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => openEdit(a)}>✏️</button>
                                                    {!isDisposed && (
                                                        <button
                                                            className="btn btn-sm"
                                                            style={{ fontSize: 11, padding: '3px 8px', background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' }}
                                                            onClick={() => openDisposal(a)}
                                                        >
                                                            📤 Thanh lý
                                                        </button>
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
                                    <td style={{ ...tdStyle('right'), fontSize: 13 }}>{totalCost.toLocaleString('vi-VN')}</td>
                                    <td style={tdStyle()}></td>
                                    <td style={tdStyle()}></td>
                                    <td style={tdStyle()}></td>
                                    <td style={tdStyle()}></td>
                                    <td style={tdStyle()}></td>
                                    <td style={{ ...tdStyle('right'), fontSize: 13, color: '#dc2626' }}>{totalAccDep.toLocaleString('vi-VN')}</td>
                                    <td style={tdStyle()}></td>
                                    <td style={tdStyle()}></td>
                                    <td style={{ ...tdStyle('right'), fontSize: 13, color: '#15803d' }}>{totalRemaining.toLocaleString('vi-VN')}</td>
                                    <td style={tdStyle()}></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </div>

            {/* ── Modal thêm/sửa ── */}
            {showModal && (
                <div style={overlayStyle}>
                    <div style={modalStyle(560)}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
                                {editItem ? '✏️ Sửa tài sản cố định' : '+ Thêm tài sản cố định'}
                            </h3>
                            <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
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
                                <label style={labelStyle}>Tháng, năm đưa vào sử dụng</label>
                                <input type="date" className="form-input" value={form.startUseDate} onChange={e => setForm(f => ({ ...f, startUseDate: e.target.value }))} />
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
                            {form.originalCost > 0 && (form.depreciationRate > 0 || form.wearRate > 0) && (
                                <div style={{ gridColumn: '1 / -1', background: '#f0fdf4', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
                                    <span style={{ fontWeight: 600, color: '#15803d' }}>Dự tính/năm: </span>
                                    Khấu hao {((form.originalCost * form.depreciationRate) / 100).toLocaleString('vi-VN')}₫ +
                                    Hao mòn {((form.originalCost * form.wearRate) / 100).toLocaleString('vi-VN')}₫ =
                                    <strong> {((form.originalCost * (parseFloat(form.depreciationRate) + parseFloat(form.wearRate || 0))) / 100).toLocaleString('vi-VN')}₫/năm</strong>
                                </div>
                            )}
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label style={labelStyle}>Ghi chú</label>
                                <textarea className="form-input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Thông tin bổ sung..." />
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                            <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Hủy</button>
                            <button className="btn btn-primary" onClick={saveAsset} disabled={saving || !form.name}>
                                {saving ? 'Đang lưu...' : editItem ? 'Cập nhật' : 'Thêm tài sản'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal thanh lý ── */}
            {showDisposalModal && disposalTarget && (
                <div style={overlayStyle}>
                    <div style={modalStyle(420)}>
                        <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>📤 Ghi giảm / Thanh lý TSCĐ</h3>
                        <div style={{ background: '#fef3c7', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
                            <strong>{disposalTarget.code}</strong> — {disposalTarget.name}<br />
                            Nguyên giá: <strong>{fmt(disposalTarget.originalCost)}</strong> | Còn lại: <strong>{fmt(calcFields(disposalTarget).remaining)}</strong>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div>
                                <label style={labelStyle}>Ngày thanh lý</label>
                                <input type="date" className="form-input" value={disposalForm.disposalDate} onChange={e => setDisposalForm(f => ({ ...f, disposalDate: e.target.value }))} />
                            </div>
                            <div>
                                <label style={labelStyle}>Lý do ghi giảm</label>
                                <textarea className="form-input" value={disposalForm.disposalReason} onChange={e => setDisposalForm(f => ({ ...f, disposalReason: e.target.value }))} rows={3} placeholder="Vd: Thanh lý do hỏng, bán lại, hết khấu hao..." />
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                            <button className="btn btn-ghost" onClick={() => setShowDisposalModal(false)}>Hủy</button>
                            <button className="btn btn-primary" style={{ background: '#dc2626' }} onClick={saveDisposal}>Xác nhận thanh lý</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal cập nhật lũy kế ── */}
            {showAccModal && accTarget && (
                <div style={overlayStyle}>
                    <div style={modalStyle(380)}>
                        <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>✏️ Cập nhật lũy kế khấu hao</h3>
                        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
                            Tài sản: <strong>{accTarget.name}</strong> | Nguyên giá: <strong>{fmt(accTarget.originalCost)}</strong>
                        </div>
                        <label style={labelStyle}>Lũy kế khấu hao / hao mòn đã tính (₫)</label>
                        <input type="number" className="form-input" value={accValue} onChange={e => setAccValue(e.target.value)} style={{ marginBottom: 8 }} />
                        {accTarget.originalCost > 0 && (
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                Giá trị còn lại: <strong style={{ color: '#15803d' }}>
                                    {Math.max(0, accTarget.originalCost - parseFloat(accValue || 0)).toLocaleString('vi-VN')}₫
                                </strong>
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                            <button className="btn btn-ghost" onClick={() => setShowAccModal(false)}>Hủy</button>
                            <button className="btn btn-primary" onClick={saveAcc}>Lưu</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ── Style helpers ── */
function thStyle(bg = '#f3f4f6', center = true, minW) {
    return {
        border: '1px solid #d1d5db',
        padding: '8px 10px',
        background: bg,
        textAlign: center ? 'center' : 'left',
        fontWeight: 700,
        fontSize: 11,
        whiteSpace: 'normal',
        verticalAlign: 'middle',
        ...(minW ? { minWidth: minW } : {}),
    };
}
function tdStyle(align = 'left') {
    return {
        border: '1px solid #e5e7eb',
        padding: '8px 10px',
        textAlign: align,
        verticalAlign: 'middle',
        fontSize: 12,
    };
}
const overlayStyle = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
};
function modalStyle(w) {
    return {
        background: 'var(--bg-card)', borderRadius: 16, padding: 28,
        width: '100%', maxWidth: w, maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    };
}
const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 5 };
