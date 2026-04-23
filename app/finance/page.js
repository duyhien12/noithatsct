'use client';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';

export default function FinancePage() {
    return <Suspense><FinanceContent /></Suspense>;
}

function FinanceContent() {
    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');
    const [summary, setSummary] = useState({});
    const [receivables, setReceivables] = useState({ payments: [], summary: {} });
    const [transactions, setTransactions] = useState([]);
    const [larkEntries, setLarkEntries] = useState([]);
    const [larkSummary, setLarkSummary] = useState({});
    const [larkDept, setLarkDept] = useState('');
    const [loading, setLoading] = useState(true);
    const [filterProject, setFilterProject] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterType, setFilterType] = useState('');
    const [showTxModal, setShowTxModal] = useState(false);
    const [txForm, setTxForm] = useState({ type: 'Thu', description: '', amount: 0, category: '', date: new Date().toISOString().split('T')[0] });
    const [confirmModal, setConfirmModal] = useState(null); // { payment, file }
    const [uploading, setUploading] = useState(false);
    const proofRef = useRef();

    const fetchAll = async () => {
        setLoading(true);
        const [finRes, recRes, larkRes] = await Promise.all([
            fetch('/api/finance').then(r => r.json()),
            fetch('/api/finance/receivables').then(r => r.json()),
            fetch('/api/finance/lark-entries').then(r => r.json()).catch(e => { console.error('lark-entries error:', e); return {}; }),
        ]);
        if (larkRes.error) console.error('lark-entries API error:', larkRes);
        setSummary(finRes.summary || {});
        setTransactions(finRes.transactions?.data || []);
        setReceivables(recRes);
        setLarkEntries(larkRes.entries || []);
        setLarkSummary(larkRes.summary || {});
        setLoading(false);
    };

    useEffect(() => { fetchAll(); }, []);

    // === Thu tiền — bắt buộc upload proof ===
    const startCollect = (payment) => {
        setConfirmModal({ payment, file: null, amount: payment.amount - (payment.paidAmount || 0) });
    };

    const handleProofUpload = (e) => {
        const file = e.target.files?.[0];
        if (file) setConfirmModal(prev => ({ ...prev, file }));
    };

    const confirmCollect = async () => {
        if (!confirmModal?.file) return alert('Vui lòng upload ảnh chuyển khoản hoặc chữ ký KH!');
        setUploading(true);

        // Upload proof image
        const fd = new FormData();
        fd.append('file', confirmModal.file);
        fd.append('type', 'proofs');
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: fd });
        const { url: proofUrl } = await uploadRes.json();

        if (!proofUrl) { setUploading(false); return alert('Upload thất bại!'); }

        // Update payment
        const p = confirmModal.payment;
        const newPaid = (p.paidAmount || 0) + Number(confirmModal.amount);
        await fetch(`/api/contracts/${p.contractId}/payments/${p.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
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

    // === In phiếu thu 2 liên — Kiến Trúc Đô Thị SCT ===
    const printReceipt = (payment) => {
        const c = payment.contract;
        const today = new Date().toLocaleDateString('vi-VN');
        const cv = c?.contractValue || 0;
        const pct = cv > 0 ? Math.round((payment.amount || 0) / cv * 100) : 0;
        const amountText = fmt(payment.paidAmount || payment.amount);

        const w = window.open('', '_blank', 'width=820,height=900');
        w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Phiếu thu - ${c?.code || ''}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Times New Roman',serif;font-size:14px;color:#222;background:#fff}
.page{width:100%;max-width:780px;margin:0 auto;padding:24px 32px;page-break-after:always}
/* === Header SCT === */
.sct-header{display:flex;align-items:stretch;border-bottom:4px solid #ea580c;padding-bottom:14px;margin-bottom:12px;gap:0}
.sct-logo-block{display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:110px;padding-right:16px;border-right:2px solid #ea580c}
.sct-logo-circle{width:68px;height:68px;border-radius:50%;background:linear-gradient(135deg,#1C3A6B,#2A5298);display:flex;flex-direction:column;align-items:center;justify-content:center;border:3px solid #ea580c}
.sct-logo-text{font-size:20px;font-weight:900;color:#fff;line-height:1;letter-spacing:1px}
.sct-logo-sub{font-size:6px;color:#ea580c;font-weight:700;letter-spacing:2px;margin-top:1px;text-transform:uppercase}
.sct-brand{flex:1;padding:0 16px;display:flex;flex-direction:column;justify-content:center}
.sct-brand-name{font-size:13px;font-weight:900;color:#1C3A6B;text-transform:uppercase;letter-spacing:1px;line-height:1.3}
.sct-brand-tag{font-size:9px;color:#ea580c;font-style:italic;margin-top:3px;font-weight:600}
.sct-brand-web{font-size:9px;color:#666;margin-top:4px}
.sct-info{text-align:right;font-size:8.5px;line-height:1.8;color:#555;min-width:200px;display:flex;flex-direction:column;justify-content:center}
.sct-info b{color:#1C3A6B}
/* === Copy label === */
.copy-label{text-align:center;font-style:italic;color:#ea580c;margin-bottom:10px;font-size:11px;font-weight:700;letter-spacing:1px;padding:4px 0;border-bottom:1px dashed #f0c090}
/* === Title === */
.receipt-title{text-align:center;margin:14px 0 12px}
.receipt-title h1{font-size:24px;font-weight:900;text-transform:uppercase;letter-spacing:4px;color:#1C3A6B;position:relative;display:inline-block}
.receipt-title h1::after{content:'';display:block;height:3px;background:linear-gradient(90deg,#ea580c,#1C3A6B);border-radius:2px;margin-top:4px}
.receipt-title .date{font-size:12px;color:#888;margin-top:6px}
/* === Info rows === */
.info{margin:14px 0;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden}
.info .row{display:flex;padding:6px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;align-items:baseline}
.info .row:last-child{border-bottom:none}
.info .row:nth-child(even){background:#fafafa}
.info .row .label{width:160px;color:#666;flex-shrink:0;font-size:12px}
.info .row .value{flex:1;font-weight:700;color:#1C3A6B}
/* === Amount box === */
.amount-box{margin:18px 0;padding:20px;border:2px solid #ea580c;text-align:center;background:linear-gradient(135deg,#fff7ed,#fff);border-radius:8px;box-shadow:0 2px 8px rgba(234,88,12,0.1)}
.amount-box .label{font-size:11px;color:#ea580c;text-transform:uppercase;letter-spacing:3px;margin-bottom:6px;font-weight:700}
.amount-box .value{font-size:28px;font-weight:900;color:#1C3A6B;letter-spacing:1px}
/* === Sign === */
.sign-area{display:flex;justify-content:space-between;margin-top:40px;text-align:center}
.sign-area .sign-box{width:42%;padding:10px;border:1px dashed #ddd;border-radius:6px}
.sign-area .role{font-weight:700;font-size:13px;margin-bottom:55px;color:#1C3A6B}
.sign-area .hint{font-size:10px;font-style:italic;color:#999}
/* === Footer === */
.footer-bar{display:flex;align-items:center;justify-content:center;gap:10px;margin-top:16px;padding-top:10px;border-top:2px solid #ea580c}
.footer-bar .dot{color:#ea580c;font-size:10px}
.footer-bar span{font-size:9px;color:#888;font-style:italic}
.footer-bar .brand{font-size:9px;font-weight:700;color:#1C3A6B}
.proof-img{max-width:200px;max-height:120px;margin-top:8px;border:1px solid #ddd;border-radius:4px;box-shadow:0 1px 4px rgba(0,0,0,0.1)}
.no-print{position:fixed;top:12px;right:12px;z-index:9999}
.no-print button{padding:10px 24px;font-size:14px;cursor:pointer;background:#ea580c;color:#fff;border:none;border-radius:8px;margin-left:8px;font-weight:700;box-shadow:0 2px 6px rgba(234,88,12,0.4)}
.no-print button:hover{background:#c2410c}
@media print{.no-print{display:none!important}}
</style></head><body>
<div class="no-print">
    <button onclick="window.print()">🖨️ In phiếu thu</button>
</div>
${[1, 2].map(copy => `
<div class="page">
    <div class="copy-label">Liên ${copy}: ${copy === 1 ? 'LƯU SỔ KẾ TOÁN' : 'GIAO KHÁCH HÀNG'}</div>
    <div class="sct-header">
        <div class="sct-logo-block">
            <div class="sct-logo-circle">
                <div class="sct-logo-text">SCT</div>
                <div class="sct-logo-sub">kiến trúc</div>
            </div>
        </div>
        <div class="sct-brand">
            <div class="sct-brand-name">Công ty TNHH Kiến Trúc Đô Thị SCT</div>
            <div class="sct-brand-tag">Cùng bạn xây dựng ước mơ</div>
            <div class="sct-brand-web">🌐 kientrucsct.com &nbsp;|&nbsp; 📞 0914 998 822</div>
        </div>
        <div class="sct-info">
            <div><b>Địa chỉ:</b> 149 Nguyễn Tất Thành, P. Văn Phú, Lào Cai</div>
            <div><b>Hotline:</b> 0914 998 822</div>
            <div><b>Website:</b> kientrucsct.com</div>
        </div>
    </div>
    <div class="receipt-title">
        <h1>Phiếu Thu Tiền</h1>
        <div class="date">Ngày ${today} &nbsp;—&nbsp; Mã HĐ: <b>${c?.code || '...'}</b></div>
    </div>
    <div class="info">
        <div class="row"><span class="label">Người nộp tiền:</span><span class="value" contenteditable="true">${c?.customer?.name || '...'}</span></div>
        <div class="row"><span class="label">Hợp đồng:</span><span class="value">${c?.code || ''} — ${c?.name || ''}</span></div>
        <div class="row"><span class="label">Dự án:</span><span class="value">${c?.project?.name || '—'}</span></div>
        <div class="row"><span class="label">Loại hợp đồng:</span><span class="value">${c?.type || ''}</span></div>
        <div class="row"><span class="label">Đợt thanh toán:</span><span class="value">${payment.phase}</span></div>
        <div class="row"><span class="label">Tỷ lệ:</span><span class="value">${pct}% giá trị HĐ</span></div>
        <div class="row"><span class="label">Giá trị đợt:</span><span class="value">${fmt(payment.amount)}</span></div>
        <div class="row"><span class="label">Lý do thu:</span><span class="value" contenteditable="true">Thanh toán đợt "${payment.phase}" theo hợp đồng ${c?.code || ''}</span></div>
    </div>
    <div class="amount-box">
        <div class="label">Số tiền thu</div>
        <div class="value">${amountText}</div>
    </div>
    ${payment.proofUrl ? `<div style="text-align:center;margin:10px 0"><div style="font-size:10px;color:#888;margin-bottom:4px">Ảnh xác nhận chuyển khoản:</div><img class="proof-img" src="${payment.proofUrl}" /></div>` : ''}
    <div class="sign-area">
        <div class="sign-box"><div class="role">Người nộp tiền</div><div class="hint">(Ký, ghi rõ họ tên)</div></div>
        <div class="sign-box"><div class="role">Người thu tiền</div><div class="hint">(Ký, ghi rõ họ tên)</div></div>
    </div>
    <div class="footer-bar">
        <span class="brand">KIẾN TRÚC ĐÔ THỊ SCT</span>
        <span class="dot">●</span>
        <span>kientrucsct.com</span>
        <span class="dot">●</span>
        <span>0914 998 822</span>
        <span class="dot">●</span>
        <span>149 Nguyễn Tất Thành, P. Văn Phú, Lào Cai</span>
    </div>
</div>`).join('')}
</body></html>`);
        w.document.close();
    };

    // === Thêm giao dịch thu chi khác ===
    const handleSubmitTx = async () => {
        await fetch('/api/finance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...txForm, amount: Number(txForm.amount), date: new Date(txForm.date) }),
        });
        setShowTxModal(false);
        setTxForm({ type: 'Thu', description: '', amount: 0, category: '', date: new Date().toISOString().split('T')[0] });
        fetchAll();
    };

    // === Filter receivables ===
    const projects = [...new Set(receivables.payments.map(p => p.contract?.project?.name).filter(Boolean))];
    const filteredPayments = receivables.payments.filter(p => {
        if (filterProject && p.contract?.project?.name !== filterProject) return false;
        if (filterStatus && p.status !== filterStatus) return false;
        return true;
    });

    const TABS = [
        { key: 'overview', label: '📊 Tổng quan', icon: '' },
        { key: 'receivables', label: '📈 Công nợ phải thu', icon: '' },
        { key: 'payables', label: '📉 Công nợ phải trả', icon: '' },
        { key: 'transactions', label: '💳 Thu chi khác', icon: '' },
        { key: 'lark', label: '📒 Nhật ký Lark', icon: '' },
    ];

    const DEPTS = [...new Set(larkEntries.map(e => e.department).filter(Boolean))];
    const filteredLark = larkDept ? larkEntries.filter(e => e.department === larkDept) : larkEntries;

    const bulkSyncLark = async () => {
        if (!confirm('Đồng bộ toàn bộ dữ liệu từ Lark Base? Có thể mất 1-2 phút.')) return;
        const res = await fetch('/api/finance/lark-bulk-sync', { method: 'POST' });
        const data = await res.json();
        if (data.synced !== undefined) {
            alert(`Đã đồng bộ ${data.synced}/${data.total} giao dịch từ Lark!`);
            fetchAll();
        } else {
            alert('Lỗi: ' + (data.error || JSON.stringify(data)));
        }
    };

    return (
        <div>
            {/* KPI Cards */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon">📈</div>
                    <div>
                        <div className="stat-value" style={{ color: 'var(--status-success)' }}>{fmt(summary.totalReceived)}</div>
                        <div className="stat-label">Đã thu từ HĐ</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">🔴</div>
                    <div>
                        <div className="stat-value" style={{ color: 'var(--status-danger)' }}>{fmt(summary.receivableOutstanding)}</div>
                        <div className="stat-label">Công nợ phải thu</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">💸</div>
                    <div>
                        <div className="stat-value" style={{ color: 'var(--status-warning)' }}>{fmt(summary.totalExpensePaid)}</div>
                        <div className="stat-label">Đã chi (DA+CT)</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">📉</div>
                    <div>
                        <div className="stat-value" style={{ color: 'var(--status-warning)' }}>{fmt(summary.payableOutstanding)}</div>
                        <div className="stat-label">Công nợ nhà thầu</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">💵</div>
                    <div>
                        <div className="stat-value" style={{ color: (summary.netCashflow || 0) >= 0 ? 'var(--status-success)' : 'var(--status-danger)' }}>{fmt(summary.netCashflow)}</div>
                        <div className="stat-label">Dòng tiền ròng</div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="card" style={{ marginTop: 16 }}>
                <div style={{ borderBottom: '1px solid var(--border)', padding: '0 16px' }}>
                    <div style={{ display: 'flex', overflowX: 'auto', gap: 0, WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
                        {TABS.map(t => (
                            <button key={t.key}
                                onClick={() => setActiveTab(t.key)}
                                style={{
                                    flexShrink: 0, padding: '12px 14px', border: 'none', background: 'none',
                                    fontSize: 13, fontWeight: activeTab === t.key ? 700 : 400,
                                    color: activeTab === t.key ? 'var(--accent-primary)' : 'var(--text-muted)',
                                    borderBottom: activeTab === t.key ? '2px solid var(--accent-primary)' : '2px solid transparent',
                                    cursor: 'pointer', whiteSpace: 'nowrap',
                                }}>{t.label}</button>
                        ))}
                    </div>
                </div>
                {activeTab === 'transactions' && (
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                        <button className="btn btn-primary btn-sm" onClick={() => setShowTxModal(true)}>+ Thêm giao dịch</button>
                    </div>
                )}

                {/* TAB: Tổng quan */}
                {activeTab === 'overview' && (
                    <div className="card-body">
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
                            {/* Phải thu */}
                            <div className="card" style={{ border: '1px solid var(--border)', margin: 0 }}>
                                <div className="card-header"><h3>📈 Công nợ phải thu</h3></div>
                                <div className="card-body">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                        <span>Tổng phải thu</span><span style={{ fontWeight: 700 }}>{fmt(summary.totalReceivable)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                        <span>Đã thu</span><span style={{ fontWeight: 700, color: 'var(--status-success)' }}>{fmt(summary.totalReceived)}</span>
                                    </div>
                                    <div className="progress-bar" style={{ height: 8, marginBottom: 8 }}>
                                        <div className="progress-fill" style={{ width: `${summary.totalReceivable > 0 ? Math.round((summary.totalReceived || 0) / summary.totalReceivable * 100) : 0}%` }}></div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: 'var(--status-danger)' }}>
                                        <span>Còn phải thu</span><span>{fmt(summary.receivableOutstanding)}</span>
                                    </div>
                                </div>
                            </div>
                            {/* Phải trả */}
                            <div className="card" style={{ border: '1px solid var(--border)', margin: 0 }}>
                                <div className="card-header"><h3>📉 Công nợ nhà thầu</h3></div>
                                <div className="card-body">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                        <span>Tổng phải trả</span><span style={{ fontWeight: 700 }}>{fmt(summary.totalPayable)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                        <span>Đã trả</span><span style={{ fontWeight: 700, color: 'var(--status-success)' }}>{fmt(summary.totalPaid)}</span>
                                    </div>
                                    <div className="progress-bar" style={{ height: 8, marginBottom: 8 }}>
                                        <div className="progress-fill" style={{ width: `${summary.totalPayable > 0 ? Math.round((summary.totalPaid || 0) / summary.totalPayable * 100) : 0}%`, background: 'var(--status-warning)' }}></div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: 'var(--status-warning)' }}>
                                        <span>Còn phải trả</span><span>{fmt(summary.payableOutstanding)}</span>
                                    </div>
                                </div>
                            </div>
                            {/* Chi phí dự án + công ty */}
                            <div className="card" style={{ border: '1px solid var(--border)', margin: 0 }}>
                                <div className="card-header"><h3>💸 Chi phí (DA + Công ty)</h3></div>
                                <div className="card-body">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                        <span>Tổng phải chi</span><span style={{ fontWeight: 700 }}>{fmt(summary.totalExpenseApproved)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                        <span>Đã chi</span><span style={{ fontWeight: 700, color: 'var(--status-success)' }}>{fmt(summary.totalExpensePaid)}</span>
                                    </div>
                                    <div className="progress-bar" style={{ height: 8, marginBottom: 8 }}>
                                        <div className="progress-fill" style={{ width: `${summary.totalExpenseApproved > 0 ? Math.round((summary.totalExpensePaid || 0) / summary.totalExpenseApproved * 100) : 0}%`, background: 'var(--status-danger)' }}></div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)' }}>
                                        <span>Chờ duyệt</span><span style={{ fontWeight: 600, color: 'var(--status-warning)' }}>{fmt(summary.totalExpensePending)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Thu chi khác */}
                        <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: 14, background: 'var(--bg-secondary)', borderRadius: 8 }}>
                                <span style={{ fontSize: 13 }}>Thu khác</span><span style={{ fontWeight: 700, color: 'var(--status-success)', fontSize: 13 }}>{fmt(summary.manualIncome)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: 14, background: 'var(--bg-secondary)', borderRadius: 8 }}>
                                <span style={{ fontSize: 13 }}>Chi khác</span><span style={{ fontWeight: 700, color: 'var(--status-danger)', fontSize: 13 }}>{fmt(summary.manualExpense)}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB: Công nợ phải thu */}
                {activeTab === 'receivables' && (
                    <>
                        <div style={{ display: 'flex', gap: 8, padding: '12px 16px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', alignItems: 'center' }}>
                            <select className="form-select" style={{ flex: 1, minWidth: 120 }} value={filterProject} onChange={e => setFilterProject(e.target.value)}>
                                <option value="">Tất cả DA</option>
                                {projects.map(p => <option key={p}>{p}</option>)}
                            </select>
                            <select className="form-select" style={{ flex: 1, minWidth: 120 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                                <option value="">Tất cả TT</option>
                                <option>Chưa thu</option>
                                <option>Thu một phần</option>
                                <option>Đã thu</option>
                            </select>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{filteredPayments.length} đợt</div>
                        </div>
                        {loading ? (
                            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
                        ) : filteredPayments.length === 0 ? (
                            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Không có đợt thanh toán nào</div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                                {filteredPayments.map(p => {
                                    const remaining = (p.amount || 0) - (p.paidAmount || 0);
                                    const isDone = p.status === 'Đã thu';
                                    return (
                                        <div key={p.id} style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', opacity: isDone ? 0.65 : 1 }}>
                                            {/* Row 1: Dự án + trạng thái */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                                <div style={{ fontSize: 12, color: 'var(--text-muted)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {p.contract?.project?.name || '—'}
                                                </div>
                                                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                                                    <span className={`badge ${isDone ? 'success' : p.status === 'Thu một phần' ? 'warning' : 'muted'}`} style={{ fontSize: 11 }}>{p.status}</span>
                                                    {p.proofUrl && <a href={p.proofUrl} target="_blank" rel="noreferrer">📸</a>}
                                                </div>
                                            </div>
                                            {/* Row 2: HĐ + đợt */}
                                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                                                <a href={`/contracts/${p.contractId}`} style={{ fontWeight: 700, color: 'var(--accent-primary)', fontSize: 14 }}>{p.contract?.code}</a>
                                                <span className="badge info" style={{ fontSize: 10 }}>{p.contract?.type}</span>
                                                <span style={{ fontSize: 13, fontWeight: 600 }}>{p.phase}</span>
                                            </div>
                                            {/* Row 3: Số tiền */}
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
                                                <div style={{ textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: 6, padding: '6px 4px' }}>
                                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Giá trị</div>
                                                    <div style={{ fontWeight: 700, fontSize: 13 }}>{fmt(p.amount)}</div>
                                                </div>
                                                <div style={{ textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: 6, padding: '6px 4px' }}>
                                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Đã thu</div>
                                                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--status-success)' }}>{fmt(p.paidAmount)}</div>
                                                </div>
                                                <div style={{ textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: 6, padding: '6px 4px' }}>
                                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Còn lại</div>
                                                    <div style={{ fontWeight: 700, fontSize: 13, color: remaining > 0 ? 'var(--status-danger)' : 'var(--text-muted)' }}>{fmt(remaining)}</div>
                                                </div>
                                            </div>
                                            {/* Row 4: Actions */}
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                {!isDone && (
                                                    <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => startCollect(p)}>💵 Thu tiền</button>
                                                )}
                                                {(p.paidAmount || 0) > 0 && (
                                                    <button className="btn btn-ghost btn-sm" style={{ flex: isDone ? 1 : 'unset' }} onClick={() => printReceipt(p)}>🧾 Phiếu thu</button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}

                {/* TAB: Công nợ phải trả */}
                {activeTab === 'payables' && (
                    <div className="card-body">
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
                            {/* Công nợ nhà thầu */}
                            <div className="card" style={{ border: '1px solid var(--border)', margin: 0 }}>
                                <div className="card-header"><h3>👷 Công nợ nhà thầu</h3></div>
                                <div className="card-body">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                        <span>Tổng HĐ thầu phụ</span><span style={{ fontWeight: 700 }}>{fmt(summary.totalPayable)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                        <span>Đã trả</span><span style={{ fontWeight: 700, color: 'var(--status-success)' }}>{fmt(summary.totalPaid)}</span>
                                    </div>
                                    <div className="progress-bar" style={{ height: 8, marginBottom: 8 }}>
                                        <div className="progress-fill" style={{ width: `${summary.totalPayable > 0 ? Math.round((summary.totalPaid || 0) / summary.totalPayable * 100) : 0}%`, background: 'var(--status-warning)' }}></div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: 'var(--status-warning)' }}>
                                        <span>Còn nợ</span><span>{fmt(summary.payableOutstanding)}</span>
                                    </div>
                                </div>
                            </div>
                            {/* Chi phí dự án + công ty */}
                            <div className="card" style={{ border: '1px solid var(--border)', margin: 0 }}>
                                <div className="card-header"><h3>💸 Chi phí dự án + Công ty</h3></div>
                                <div className="card-body">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                        <span>Tổng chi đã duyệt</span><span style={{ fontWeight: 700 }}>{fmt(summary.totalExpenseApproved)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                        <span>Đã chi</span><span style={{ fontWeight: 700, color: 'var(--status-success)' }}>{fmt(summary.totalExpensePaid)}</span>
                                    </div>
                                    <div className="progress-bar" style={{ height: 8, marginBottom: 8 }}>
                                        <div className="progress-fill" style={{ width: `${summary.totalExpenseApproved > 0 ? Math.round((summary.totalExpensePaid || 0) / summary.totalExpenseApproved * 100) : 0}%`, background: 'var(--status-danger)' }}></div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                                        <span style={{ color: 'var(--text-muted)' }}>Chờ duyệt</span><span style={{ fontWeight: 600, color: 'var(--status-warning)' }}>{fmt(summary.totalExpensePending)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div style={{ marginTop: 16, textAlign: 'center' }}>
                            <a href="/expenses" style={{ color: 'var(--accent-primary)', fontWeight: 600, fontSize: 13 }}>📋 Xem chi tiết chi phí →</a>
                        </div>
                    </div>
                )}

                {/* TAB: Thu chi khác */}
                {activeTab === 'transactions' && (
                    <>
                        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                            <select className="form-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
                                <option value="">Tất cả</option>
                                <option>Thu</option>
                                <option>Chi</option>
                            </select>
                        </div>
                        {loading ? (
                            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                                {transactions
                                    .filter(t => !filterType || t.type === filterType)
                                    .map(t => (
                                        <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                                            <span className={`badge ${t.type === 'Thu' ? 'success' : 'danger'}`} style={{ flexShrink: 0 }}>{t.type}</span>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.description || t.code}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                                    {t.category && <span className="badge muted" style={{ fontSize: 10, marginRight: 6 }}>{t.category}</span>}
                                                    {fmtDate(t.date)}
                                                </div>
                                            </div>
                                            <div style={{ fontWeight: 700, fontSize: 14, color: t.type === 'Thu' ? 'var(--status-success)' : 'var(--status-danger)', flexShrink: 0, textAlign: 'right' }}>
                                                {t.type === 'Thu' ? '+' : '-'}{fmt(t.amount)}
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        )}
                    </>
                )}
                {/* TAB: Nhật ký Lark */}
                {activeTab === 'lark' && (
                    <>
                        {/* Summary cards */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                            {[
                                { label: 'Thu TM', value: larkSummary.totalCashIn, color: 'var(--status-success)' },
                                { label: 'Chi TM', value: larkSummary.totalCashOut, color: 'var(--status-danger)' },
                                { label: 'Thu TGNH', value: larkSummary.totalBankIn, color: 'var(--status-success)' },
                                { label: 'Chi TGNH', value: larkSummary.totalBankOut, color: 'var(--status-danger)' },
                            ].map(s => (
                                <div key={s.label} style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{s.label}</div>
                                    <div style={{ fontWeight: 700, fontSize: 13, color: s.color }}>{fmt(s.value)}</div>
                                </div>
                            ))}
                        </div>
                        {/* Filter + Sync button */}
                        <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'center' }}>
                            <button className="btn btn-primary btn-sm" onClick={bulkSyncLark}>🔄 Đồng bộ từ Lark</button>
                            <select className="form-select" style={{ maxWidth: 160 }} value={larkDept} onChange={e => setLarkDept(e.target.value)}>
                                <option value="">Tất cả phòng ban</option>
                                {DEPTS.map(d => <option key={d}>{d}</option>)}
                            </select>
                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{filteredLark.length} giao dịch</span>
                        </div>
                        {/* Table */}
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                <thead>
                                    <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                                        {['Ngày', 'Danh mục', 'Mô tả', 'Phòng ban', 'Thu TM', 'Chi TM', 'Thu NH', 'Chi NH'].map(h => (
                                            <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredLark.length === 0 ? (
                                        <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có dữ liệu từ Lark</td></tr>
                                    ) : filteredLark.map(e => (
                                        <tr key={e.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                            <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>{fmtDate(e.entryDate)}</td>
                                            <td style={{ padding: '8px 12px' }}>
                                                {e.category && <span className="badge muted" style={{ fontSize: 11 }}>{e.category}</span>}
                                            </td>
                                            <td style={{ padding: '8px 12px', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.description || '—'}</td>
                                            <td style={{ padding: '8px 12px' }}>
                                                {e.department && <span className="badge info" style={{ fontSize: 11 }}>{e.department}</span>}
                                            </td>
                                            <td style={{ padding: '8px 12px', color: 'var(--status-success)', fontWeight: e.cashIn ? 600 : 400 }}>{e.cashIn ? fmt(e.cashIn) : '—'}</td>
                                            <td style={{ padding: '8px 12px', color: 'var(--status-danger)', fontWeight: e.cashOut ? 600 : 400 }}>{e.cashOut ? fmt(e.cashOut) : '—'}</td>
                                            <td style={{ padding: '8px 12px', color: 'var(--status-success)', fontWeight: e.bankIn ? 600 : 400 }}>{e.bankIn ? fmt(e.bankIn) : '—'}</td>
                                            <td style={{ padding: '8px 12px', color: 'var(--status-danger)', fontWeight: e.bankOut ? 600 : 400 }}>{e.bankOut ? fmt(e.bankOut) : '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>

            {/* Modal: Xác nhận thu tiền (BẮT BUỘC upload proof) */}
            {confirmModal && (
                <div className="modal-overlay" onClick={() => setConfirmModal(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
                        <div className="modal-header">
                            <h3>💵 Xác nhận thu tiền</h3>
                            <button className="modal-close" onClick={() => setConfirmModal(null)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div style={{ marginBottom: 16 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                                    <span style={{ color: 'var(--text-muted)' }}>HĐ:</span>
                                    <span style={{ fontWeight: 600 }}>{confirmModal.payment.contract?.code} — {confirmModal.payment.contract?.name}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Đợt:</span>
                                    <span style={{ fontWeight: 600 }}>{confirmModal.payment.phase}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Giá trị đợt:</span>
                                    <span style={{ fontWeight: 700 }}>{fmt(confirmModal.payment.amount)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Đã thu:</span>
                                    <span style={{ fontWeight: 600, color: 'var(--status-success)' }}>{fmt(confirmModal.payment.paidAmount)}</span>
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Số tiền thu lần này *</label>
                                <input className="form-input" type="number" value={confirmModal.amount}
                                    onChange={e => setConfirmModal(prev => ({ ...prev, amount: e.target.value }))} />
                                {confirmModal.amount > 0 && (
                                    <div style={{ fontSize: 12, color: 'var(--primary)', marginTop: 4, fontWeight: 600 }}>{fmt(confirmModal.amount)}</div>
                                )}
                            </div>

                            <div className="form-group" style={{ marginTop: 14 }}>
                                <label className="form-label">📸 Ảnh chuyển khoản / Chữ ký KH * <span style={{ color: 'var(--status-danger)' }}>(Bắt buộc)</span></label>
                                {confirmModal.file ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--status-success)' }}>
                                        <img src={URL.createObjectURL(confirmModal.file)} alt="proof"
                                            style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 6 }} />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 600, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{confirmModal.file.name}</div>
                                            <div style={{ fontSize: 11, color: 'var(--status-success)' }}>✅ Đã chọn file</div>
                                        </div>
                                        <button className="btn btn-ghost" style={{ fontSize: 11 }}
                                            onClick={() => setConfirmModal(prev => ({ ...prev, file: null }))}>Đổi</button>
                                    </div>
                                ) : (
                                    <div onClick={() => proofRef.current?.click()}
                                        style={{ padding: 20, border: '2px dashed var(--status-danger)', borderRadius: 8, textAlign: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}>
                                        <div style={{ fontSize: 28 }}>📸</div>
                                        <div style={{ fontSize: 12, marginTop: 6 }}>Bấm để chọn ảnh chuyển khoản hoặc chữ ký</div>
                                        <div style={{ fontSize: 11, color: 'var(--status-danger)', marginTop: 4 }}>⚠️ Bắt buộc upload để xác nhận thanh toán</div>
                                    </div>
                                )}
                                <input ref={proofRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleProofUpload} />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setConfirmModal(null)}>Hủy</button>
                            <button className="btn btn-primary" onClick={confirmCollect} disabled={uploading || !confirmModal.file}>
                                {uploading ? '⏳ Đang xử lý...' : '✅ Xác nhận thu tiền'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Thêm giao dịch thủ công */}
            {showTxModal && (
                <div className="modal-overlay" onClick={() => setShowTxModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h3>Thêm giao dịch</h3><button className="modal-close" onClick={() => setShowTxModal(false)}>×</button></div>
                        <div className="modal-body">
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">Loại</label>
                                    <select className="form-select" value={txForm.type} onChange={e => setTxForm({ ...txForm, type: e.target.value })}>
                                        <option>Thu</option><option>Chi</option>
                                    </select>
                                </div>
                                <div className="form-group"><label className="form-label">Số tiền</label>
                                    <input className="form-input" type="number" value={txForm.amount} onChange={e => setTxForm({ ...txForm, amount: e.target.value })} />
                                </div>
                            </div>
                            <div className="form-group"><label className="form-label">Mô tả</label>
                                <input className="form-input" value={txForm.description} onChange={e => setTxForm({ ...txForm, description: e.target.value })} />
                            </div>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">Danh mục</label>
                                    <input className="form-input" value={txForm.category} onChange={e => setTxForm({ ...txForm, category: e.target.value })} />
                                </div>
                                <div className="form-group"><label className="form-label">Ngày</label>
                                    <input className="form-input" type="date" value={txForm.date} onChange={e => setTxForm({ ...txForm, date: e.target.value })} />
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowTxModal(false)}>Hủy</button>
                            <button className="btn btn-primary" onClick={handleSubmitTx}>Lưu</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
