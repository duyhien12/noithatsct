'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
const pct = (a, b) => b > 0 ? Math.round((a / b) * 100) : 0;

export default function PaymentsPage() {
    const router = useRouter();
    const [tab, setTab] = useState('overview');
    const [contracts, setContracts] = useState([]);
    const [receivables, setReceivables] = useState({ payments: [], summary: {} });
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [filterProject, setFilterProject] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [search, setSearch] = useState('');
    const [confirmModal, setConfirmModal] = useState(null);
    const [uploading, setUploading] = useState(false);
    const proofRef = useRef();

    const fetchAll = async () => {
        setLoading(true);
        const [cRes, rRes] = await Promise.all([
            fetch('/api/contracts?limit=1000').then(r => r.json()).then(d => d.data || []),
            fetch('/api/finance/receivables').then(r => r.json()),
        ]);
        setContracts(cRes);
        setReceivables(rRes);
        setLoading(false);
    };
    useEffect(() => { fetchAll(); }, []);

    // === Stats ===
    const totalValue = contracts.reduce((s, c) => s + (c.contractValue || 0), 0);
    const totalPaid = contracts.reduce((s, c) => s + (c.paidAmount || 0), 0);
    const totalDebt = totalValue - totalPaid;
    const overallRate = pct(totalPaid, totalValue);

    // === Filter contracts overview ===
    const filteredContracts = contracts.filter(c => {
        if (filter === 'paid' && pct(c.paidAmount, c.contractValue) < 100) return false;
        if (filter === 'partial' && (pct(c.paidAmount, c.contractValue) === 0 || pct(c.paidAmount, c.contractValue) >= 100)) return false;
        if (filter === 'unpaid' && pct(c.paidAmount, c.contractValue) > 0) return false;
        if (search && !c.code?.toLowerCase().includes(search.toLowerCase()) && !c.name?.toLowerCase().includes(search.toLowerCase()) && !c.customer?.name?.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    // === Filter receivable payments ===
    const projects = [...new Set(receivables.payments.map(p => p.contract?.project?.name).filter(Boolean))];
    const filteredPayments = receivables.payments.filter(p => {
        if (filterProject && p.contract?.project?.name !== filterProject) return false;
        if (filterStatus && p.status !== filterStatus) return false;
        if (search && !p.contract?.code?.toLowerCase().includes(search.toLowerCase()) && !p.contract?.customer?.name?.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    // === Thu tiền ===
    const startCollect = (payment) => {
        setConfirmModal({ payment, file: null, amount: (payment.amount || 0) - (payment.paidAmount || 0) });
    };
    const handleProofUpload = (e) => {
        const file = e.target.files?.[0];
        if (file) setConfirmModal(prev => ({ ...prev, file, preview: URL.createObjectURL(file) }));
    };
    const handlePaste = (e) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        for (const item of items) {
            if (item.type.startsWith('image/')) {
                const file = item.getAsFile();
                if (file) setConfirmModal(prev => ({ ...prev, file, preview: URL.createObjectURL(file) }));
                break;
            }
        }
    };
    const handleDrop = (e) => {
        e.preventDefault();
        const file = e.dataTransfer?.files?.[0];
        if (file && file.type.startsWith('image/')) setConfirmModal(prev => ({ ...prev, file, preview: URL.createObjectURL(file) }));
    };
    const confirmCollect = async () => {
        if (!confirmModal) return;
        const { payment, file, amount } = confirmModal;
        if (!file) return alert('Bắt buộc tải lên ảnh xác nhận thanh toán!');
        if (!amount || amount <= 0) return alert('Nhập số tiền hợp lệ!');

        setUploading(true);
        let proofUrl = payment.proofUrl || '';
        const reader = new FileReader();
        reader.onload = async () => {
            proofUrl = reader.result;
            const p = payment;
            const newPaid = (p.paidAmount || 0) + Number(amount);
            await fetch(`/api/contracts/${p.contractId}/payments`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    paymentId: p.id,
                    paidAmount: newPaid,
                    status: newPaid >= p.amount ? 'Đã thu' : 'Thu một phần',
                    proofUrl,
                    paidDate: new Date().toISOString(),
                }),
            });
            setUploading(false);
            setConfirmModal(null);
            fetchAll();
        };
        reader.readAsDataURL(file);
    };

    // === In phiếu thu ===
    const printReceipt = (payment) => {
        const c = payment.contract;
        const today = new Date().toLocaleDateString('vi-VN');
        const cv = c?.contractValue || 0;
        const receiptPct = cv > 0 ? Math.round((payment.amount || 0) / cv * 100) : 0;
        const amountText = fmt(payment.paidAmount || payment.amount);

        const w = window.open('', '_blank', 'width=800,height=900');
        w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Phiếu thu - ${c?.code || ''}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Times New Roman',serif;font-size:14px;color:#000;background:#fff}
.page{width:100%;padding:20px 30px;page-break-after:always}
.mn-header{display:flex;align-items:center;border-bottom:3px solid #1a3a5c;padding-bottom:14px;margin-bottom:10px;gap:16px}
.mn-logo{display:flex;flex-direction:column;align-items:center;min-width:120px}
.mn-logo-icon{font-size:28px;font-weight:900;color:#1a3a5c;line-height:1;letter-spacing:-1px}
.mn-logo-sub{font-size:7px;text-transform:uppercase;color:#c8a555;letter-spacing:3px;font-weight:600;margin-top:2px}
.mn-brand{flex:1}
.mn-brand-name{font-size:11px;font-weight:800;color:#1a3a5c;text-transform:uppercase;letter-spacing:1px}
.mn-brand-web{font-size:9px;color:#666;margin-top:1px}
.mn-info{text-align:right;font-size:9px;line-height:1.6;color:#555}
.mn-info b{color:#1a3a5c}
.receipt-title{text-align:center;margin:14px 0 10px}
.receipt-title h1{font-size:22px;font-weight:bold;text-transform:uppercase;letter-spacing:3px;color:#1a3a5c}
.receipt-title .date{font-size:12px;color:#888;margin-top:4px}
.copy-label{text-align:center;font-style:italic;color:#c8a555;margin-bottom:10px;font-size:11px;font-weight:600;letter-spacing:1px}
.info{margin:14px 0}
.info .row{display:flex;padding:5px 0;border-bottom:1px dotted #ddd;font-size:13px}
.info .row .label{width:150px;color:#555;flex-shrink:0}
.info .row .value{flex:1;font-weight:600}
.amount-box{margin:18px 0;padding:16px;border:2px solid #1a3a5c;text-align:center;background:linear-gradient(135deg,#f8f6f0,#fff);border-radius:4px}
.amount-box .label{font-size:12px;color:#555;text-transform:uppercase;letter-spacing:2px;margin-bottom:4px}
.amount-box .value{font-size:24px;font-weight:bold;color:#1a3a5c;letter-spacing:1px}
.sign-area{display:flex;justify-content:space-between;margin-top:40px;text-align:center}
.sign-area div{width:40%}
.sign-area .role{font-weight:bold;font-size:13px;margin-bottom:60px;color:#1a3a5c}
.sign-area .hint{font-size:10px;font-style:italic;color:#999}
.proof-img{max-width:180px;max-height:100px;margin-top:8px;border:1px solid #ddd;border-radius:4px}
.footer-note{text-align:center;font-size:9px;color:#aaa;margin-top:16px;font-style:italic}
.no-print{position:fixed;top:10px;right:10px;z-index:9999}
.no-print button{padding:10px 24px;font-size:14px;cursor:pointer;background:#1a3a5c;color:#fff;border:none;border-radius:6px;font-weight:600}
@media print{.no-print{display:none!important}}
</style></head><body>
<div class="no-print"><button onclick="window.print()">🖨️ In phiếu thu</button></div>
${[1, 2].map(copy => `
<div class="page">
    <div class="copy-label">Liên ${copy}: ${copy === 1 ? 'LƯU SỔ KẾ TOÁN' : 'GIAO KHÁCH HÀNG'}</div>
    <div class="mn-header">
        <div class="mn-logo"><div class="mn-logo-icon">MỘT NHÀ</div><div class="mn-logo-sub">Design & Build</div></div>
        <div class="mn-brand"><div class="mn-brand-name">CÔNG TY TNHH THIẾT KẾ & XÂY DỰNG MỘT NHÀ</div><div class="mn-brand-web">🌐 motnha.vn &nbsp;|&nbsp; 📞 0944 886 989</div></div>
        <div class="mn-info"><div><b>Trụ sở:</b> R6 Royal City, Thanh Xuân, HN</div><div><b>Showroom HN:</b> 10 Chương Dương Độ, Hoàn Kiếm</div><div><b>Showroom SL:</b> 105C Tô Hiệu, Sơn La</div><div><b>Nhà máy SX:</b> KĐT Picenza, Chiềng An, Sơn La</div></div>
    </div>
    <div class="receipt-title"><h1>Phiếu Thu Tiền</h1><div class="date">Ngày ${today} — Mã HĐ: ${c?.code || '...'}</div></div>
    <div class="info">
        <div class="row"><span class="label">Người nộp tiền:</span><span class="value" contenteditable="true">${c?.customer?.name || '...'}</span></div>
        <div class="row"><span class="label">Hợp đồng:</span><span class="value">${c?.code || ''} — ${c?.name || ''}</span></div>
        <div class="row"><span class="label">Dự án:</span><span class="value">${c?.project?.name || '—'}</span></div>
        <div class="row"><span class="label">Loại HĐ:</span><span class="value">${c?.type || ''}</span></div>
        <div class="row"><span class="label">Đợt thanh toán:</span><span class="value">${payment.phase}</span></div>
        <div class="row"><span class="label">Tỷ lệ:</span><span class="value">${receiptPct}% giá trị HĐ</span></div>
        <div class="row"><span class="label">Lý do thu:</span><span class="value" contenteditable="true">Thanh toán đợt "${payment.phase}" theo HĐ ${c?.code || ''}</span></div>
    </div>
    <div class="amount-box"><div class="label">SỐ TIỀN THU</div><div class="value">${amountText}</div></div>
    ${payment.proofUrl ? `<div style="text-align:center;margin:10px 0"><div style="font-size:10px;color:#888;margin-bottom:4px">Ảnh xác nhận:</div><img class="proof-img" src="${payment.proofUrl}" /></div>` : ''}
    <div class="sign-area"><div><div class="role">Người nộp tiền</div><div class="hint">(Ký, ghi rõ họ tên)</div></div><div><div class="role">Người thu tiền</div><div class="hint">(Ký, ghi rõ họ tên)</div></div></div>
    <div class="footer-note">MỘT NHÀ DESIGN & BUILD — motnha.vn — 0944 886 989</div>
</div>`).join('')}
</body></html>`);
        w.document.close();
    };

    const TABS = [
        { key: 'overview', label: '📊 Tổng quan thu tiền' },
        { key: 'phases', label: '💵 Đợt thanh toán' },
    ];

    return (
        <div>
            <div className="stats-grid" style={{ marginBottom: 24 }}>
                <div className="stat-card"><div className="stat-icon">📝</div><div><div className="stat-value">{contracts.length}</div><div className="stat-label">Tổng HĐ</div></div></div>
                <div className="stat-card"><div className="stat-icon">💰</div><div><div className="stat-value">{fmt(totalValue)}</div><div className="stat-label">Giá trị HĐ</div></div></div>
                <div className="stat-card"><div className="stat-icon">✅</div><div><div className="stat-value" style={{ color: 'var(--status-success)' }}>{fmt(totalPaid)}</div><div className="stat-label">Đã thu ({overallRate}%)</div></div></div>
                <div className="stat-card"><div className="stat-icon">⚠️</div><div><div className="stat-value" style={{ color: totalDebt > 0 ? 'var(--status-danger)' : 'var(--status-success)' }}>{fmt(totalDebt)}</div><div className="stat-label">Còn nợ</div></div></div>
            </div>

            <div className="card" style={{ marginBottom: 24, padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>Tỷ lệ thu tiền toàn công ty</span>
                    <span style={{ fontWeight: 700, color: 'var(--text-accent)' }}>{overallRate}%</span>
                </div>
                <div className="progress-bar" style={{ height: 12 }}><div className="progress-fill" style={{ width: `${overallRate}%` }}></div></div>
            </div>

            <div className="card">
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
                    {TABS.map(t => (
                        <button key={t.key} onClick={() => setTab(t.key)}
                            style={{ padding: '12px 20px', fontWeight: 600, fontSize: 13, cursor: 'pointer', border: 'none', background: tab === t.key ? 'var(--bg-primary)' : 'transparent', color: tab === t.key ? 'var(--text-accent)' : 'var(--text-muted)', borderBottom: tab === t.key ? '2px solid var(--accent-primary)' : '2px solid transparent' }}>
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* TAB: Tổng quan theo HĐ */}
                {tab === 'overview' && (
                    <>
                        <div className="filter-bar" style={{ borderBottom: '1px solid var(--border)' }}>
                            <input className="form-input" placeholder="🔍 Tìm HĐ, khách hàng..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 0 }} />
                            <select className="form-select" value={filter} onChange={e => setFilter(e.target.value)}>
                                <option value="">Tất cả</option><option value="paid">Đã thu đủ</option><option value="partial">Đang thu</option><option value="unpaid">Chưa thu</option>
                            </select>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{filteredContracts.length} HĐ</div>
                        </div>
                        {loading ? <div style={{ padding: 40, textAlign: 'center' }}>Đang tải...</div> : (<>
                            <div className="desktop-table-view">
                                <div className="table-container"><table className="data-table" style={{ margin: 0 }}>
                                    <thead><tr><th>Mã HĐ</th><th>Tên</th><th>Khách hàng</th><th>Dự án</th><th>Loại</th><th>Giá trị</th><th>Đã thu</th><th>Còn nợ</th><th>Tỷ lệ</th></tr></thead>
                                    <tbody>{filteredContracts.map(c => {
                                        const rate = pct(c.paidAmount, c.contractValue);
                                        const debt = (c.contractValue || 0) - (c.paidAmount || 0);
                                        return (
                                            <tr key={c.id} onClick={() => router.push(`/contracts/${c.id}`)} style={{ cursor: 'pointer' }}>
                                                <td className="accent">{c.code}</td>
                                                <td className="primary">{c.name}</td>
                                                <td style={{ fontSize: 12 }}>{c.customer?.name}</td>
                                                <td><span className="badge info">{c.project?.code}</span></td>
                                                <td><span className="badge badge-default" style={{ fontSize: 10 }}>{c.type}</span></td>
                                                <td className="amount">{fmt(c.contractValue)}</td>
                                                <td style={{ color: 'var(--status-success)', fontWeight: 600 }}>{fmt(c.paidAmount)}</td>
                                                <td style={{ color: debt > 0 ? 'var(--status-danger)' : 'var(--status-success)', fontWeight: 600 }}>{fmt(debt)}</td>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        <div className="progress-bar" style={{ flex: 1, maxWidth: 60 }}><div className="progress-fill" style={{ width: `${rate}%` }}></div></div>
                                                        <span style={{ fontSize: 12, fontWeight: 600 }}>{rate}%</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}</tbody>
                                </table></div>
                            </div>
                            <div className="mobile-card-list">
                                {filteredContracts.map(c => {
                                    const rate = pct(c.paidAmount, c.contractValue);
                                    const debt = (c.contractValue || 0) - (c.paidAmount || 0);
                                    return (
                                        <div key={c.id} className="mobile-card-item" onClick={() => router.push(`/contracts/${c.id}`)}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div className="card-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                                                    <div className="card-subtitle">{c.code} · {c.customer?.name}</div>
                                                </div>
                                                <span className="badge badge-default" style={{ fontSize: 10 }}>{c.type}</span>
                                            </div>
                                            <div className="card-row">
                                                <div><span className="card-label">Giá trị</span><div className="card-value">{fmt(c.contractValue)}</div></div>
                                                <div><span className="card-label">Đã thu</span><div style={{ color: 'var(--status-success)', fontWeight: 600, fontSize: 12 }}>{fmt(c.paidAmount)}</div></div>
                                                <div><span className="card-label">Còn nợ</span><div style={{ color: debt > 0 ? 'var(--status-danger)' : 'var(--status-success)', fontWeight: 600, fontSize: 12 }}>{fmt(debt)}</div></div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                                                <div className="progress-bar" style={{ flex: 1, height: 6 }}><div className="progress-fill" style={{ width: `${rate}%` }}></div></div>
                                                <span style={{ fontSize: 11, fontWeight: 600 }}>{rate}%</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>)}
                    </>
                )}

                {/* TAB: Đợt thanh toán */}
                {tab === 'phases' && (
                    <>
                        <div className="filter-bar" style={{ borderBottom: '1px solid var(--border)' }}>
                            <input className="form-input" placeholder="🔍 Tìm HĐ..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 0 }} />
                            <select className="form-select" value={filterProject} onChange={e => setFilterProject(e.target.value)}>
                                <option value="">Tất cả DA</option>
                                {projects.map(p => <option key={p}>{p}</option>)}
                            </select>
                            <select className="form-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                                <option value="">Tất cả TT</option>
                                <option>Chưa thu</option><option>Thu một phần</option><option>Đã thu</option>
                            </select>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                {filteredPayments.length} đợt
                            </div>
                        </div>
                        {loading ? <div style={{ padding: 40, textAlign: 'center' }}>Đang tải...</div> : filteredPayments.length === 0 ? (
                            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Không có đợt thanh toán nào</div>
                        ) : (<>
                            <div className="desktop-table-view">
                                <div className="table-container">
                                    <table className="data-table" style={{ margin: 0 }}>
                                        <thead><tr>
                                            <th>Dự án</th><th>Hợp đồng</th><th>Khách hàng</th><th>Loại HĐ</th><th>Đợt TT</th><th>Giá trị</th><th>Đã thu</th><th>Còn lại</th><th>Trạng thái</th><th>Thao tác</th>
                                        </tr></thead>
                                        <tbody>{filteredPayments.map(p => {
                                            const remaining = (p.amount || 0) - (p.paidAmount || 0);
                                            return (
                                                <tr key={p.id} style={{ opacity: p.status === 'Đã thu' ? 0.6 : 1 }}>
                                                    <td style={{ fontSize: 12 }}>{p.contract?.project?.name || '—'}</td>
                                                    <td><a href={`/contracts/${p.contractId}`} className="accent" style={{ fontWeight: 600 }}>{p.contract?.code}</a></td>
                                                    <td style={{ fontSize: 12 }}>{p.contract?.customer?.name || '—'}</td>
                                                    <td><span className="badge info" style={{ fontSize: 10 }}>{p.contract?.type}</span></td>
                                                    <td style={{ fontWeight: 600 }}>{p.phase}</td>
                                                    <td className="amount">{fmt(p.amount)}</td>
                                                    <td style={{ color: 'var(--status-success)', fontWeight: 600 }}>{fmt(p.paidAmount)}</td>
                                                    <td style={{ color: remaining > 0 ? 'var(--status-danger)' : 'var(--text-muted)', fontWeight: 600 }}>{fmt(remaining)}</td>
                                                    <td>
                                                        <span className={`badge ${p.status === 'Đã thu' ? 'success' : p.status === 'Thu một phần' ? 'warning' : 'muted'}`}>{p.status}</span>
                                                        {p.proofUrl && <a href={p.proofUrl} target="_blank" rel="noreferrer" title="Xem ảnh xác nhận" style={{ marginLeft: 4 }}>📸</a>}
                                                    </td>
                                                    <td>
                                                        <div style={{ display: 'flex', gap: 4 }}>
                                                            {p.status !== 'Đã thu' && (
                                                                <button className="btn btn-primary btn-sm" style={{ fontSize: 11 }} onClick={() => startCollect(p)}>💵 Thu tiền</button>
                                                            )}
                                                            {(p.paidAmount || 0) > 0 && (
                                                                <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => printReceipt(p)}>🧾 Phiếu thu</button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}</tbody>
                                    </table>
                                </div>
                            </div>
                            <div className="mobile-card-list">
                                {filteredPayments.map(p => {
                                    const remaining = (p.amount || 0) - (p.paidAmount || 0);
                                    return (
                                        <div key={p.id} className="mobile-card-item" style={{ opacity: p.status === 'Đã thu' ? 0.6 : 1 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div className="card-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.phase}</div>
                                                    <div className="card-subtitle">{p.contract?.code} · {p.contract?.customer?.name || '—'}</div>
                                                </div>
                                                <span className={`badge ${p.status === 'Đã thu' ? 'success' : p.status === 'Thu một phần' ? 'warning' : 'muted'}`}>{p.status}</span>
                                            </div>
                                            <div className="card-row">
                                                <div><span className="card-label">Giá trị</span><div className="card-value">{fmt(p.amount)}</div></div>
                                                <div><span className="card-label">Đã thu</span><div style={{ color: 'var(--status-success)', fontWeight: 600, fontSize: 12 }}>{fmt(p.paidAmount)}</div></div>
                                                <div><span className="card-label">Còn lại</span><div style={{ color: remaining > 0 ? 'var(--status-danger)' : 'var(--text-muted)', fontWeight: 600, fontSize: 12 }}>{fmt(remaining)}</div></div>
                                            </div>
                                            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                                                {p.status !== 'Đã thu' && (
                                                    <button className="btn btn-primary btn-sm" style={{ fontSize: 11 }} onClick={() => startCollect(p)}>💵 Thu tiền</button>
                                                )}
                                                {(p.paidAmount || 0) > 0 && (
                                                    <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => printReceipt(p)}>🧾 Phiếu thu</button>
                                                )}
                                                {p.proofUrl && <a href={p.proofUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11 }}>📸</a>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>)}
                    </>
                )}
            </div>

            {/* Modal xác nhận thu tiền */}
            {confirmModal && (
                <div className="modal-overlay" onClick={() => !uploading && setConfirmModal(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
                        <div className="modal-header">
                            <h3>💵 Xác nhận thu tiền</h3>
                            <button className="modal-close" onClick={() => !uploading && setConfirmModal(null)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div style={{ padding: 12, background: 'var(--bg-secondary)', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
                                <div><strong>HĐ:</strong> {confirmModal.payment.contract?.code} — {confirmModal.payment.contract?.name}</div>
                                <div><strong>Đợt:</strong> {confirmModal.payment.phase}</div>
                                <div><strong>Giá trị đợt:</strong> {fmt(confirmModal.payment.amount)}</div>
                                <div><strong>Đã thu:</strong> {fmt(confirmModal.payment.paidAmount)}</div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Số tiền thu *</label>
                                <input className="form-input" type="number" value={confirmModal.amount} onChange={e => setConfirmModal(prev => ({ ...prev, amount: e.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">📸 Ảnh xác nhận thanh toán * <span style={{ color: 'var(--status-danger)', fontSize: 11 }}>(Bắt buộc)</span></label>
                                <div
                                    onPaste={handlePaste}
                                    onDrop={handleDrop}
                                    onDragOver={e => e.preventDefault()}
                                    tabIndex={0}
                                    style={{ border: '2px dashed var(--border)', borderRadius: 8, padding: 20, textAlign: 'center', cursor: 'pointer', background: confirmModal.file ? 'var(--bg-secondary)' : 'transparent', outline: 'none', transition: 'border-color 0.2s' }}
                                    onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'}
                                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                                    onClick={() => proofRef.current?.click()}
                                >
                                    <input ref={proofRef} type="file" accept="image/*" onChange={handleProofUpload} style={{ display: 'none' }} />
                                    {confirmModal.preview ? (
                                        <div>
                                            <img src={confirmModal.preview} alt="preview" style={{ maxWidth: '100%', maxHeight: 160, borderRadius: 6, marginBottom: 8 }} />
                                            <div style={{ fontSize: 12, color: 'var(--status-success)' }}>✅ {confirmModal.file?.name || 'Ảnh từ clipboard'}</div>
                                        </div>
                                    ) : (
                                        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                                            📋 <strong>Ctrl+V</strong> paste ảnh &nbsp;|&nbsp; 📁 Click chọn file &nbsp;|&nbsp; 🖱️ Kéo thả ảnh vào đây
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setConfirmModal(null)} disabled={uploading}>Hủy</button>
                            <button className="btn btn-primary" onClick={confirmCollect} disabled={uploading || !confirmModal.file}>
                                {uploading ? '⏳ Đang xử lý...' : '✅ Xác nhận thu tiền'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
