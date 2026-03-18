'use client';
import { useState, useEffect, useRef } from 'react';

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';

const PROJECT_CATEGORIES = ['Vật tư xây dựng', 'Nhân công', 'Vận chuyển', 'Thiết bị máy móc', 'Điện nước', 'Thuê ngoài', 'Sửa chữa', 'Bảo hiểm công trình', 'Khác'];
const COMPANY_CATEGORIES = ['Thuê văn phòng', 'Lương & Phú cấp', 'Điện nước VP', 'Văn phòng phẩm', 'Marketing & QC', 'Phí ngân hàng', 'Bảo hiểm xã hội', 'Tiếp khách', 'Công tác phí', 'Phần mềm & CNTT', 'Bảo trì & Sửa chữa', 'Thuế & Lệ phí', 'Khấu hao TSCD', 'Khác'];
const STATUS_FLOW = {
    'Chờ duyệt': { next: 'Đã duyệt', label: '✓ Duyệt', color: 'var(--status-success)', reject: true },
    'Đã duyệt': { next: 'Đã chi', label: '💸 Chi tiền', color: 'var(--accent-primary)', needProof: true },
    'Đã chi': { next: 'Hoàn thành', label: '✅ Hoàn thành', color: 'var(--status-success)' },
    'Hoàn thành': null,
    'Từ chối': { next: 'Chờ duyệt', label: '↩ Mở lại', color: 'var(--status-warning)' },
};

const emptyForm = { expenseType: 'Dự án', description: '', amount: 0, category: 'Vật tư xây dựng', submittedBy: '', date: new Date().toISOString().split('T')[0], notes: '', projectId: '', recipientType: '', recipientId: '' };

export default function ExpensesPage() {
    const [expenses, setExpenses] = useState([]);
    const [projects, setProjects] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [contractors, setContractors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [filterProject, setFilterProject] = useState('');
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [proofModal, setProofModal] = useState(null); // for upload proof on payment
    const [proofFile, setProofFile] = useState(null);
    const [proofPreview, setProofPreview] = useState(null);
    const [uploading, setUploading] = useState(false);
    const proofRef = useRef();

    const fetchData = async () => {
        setLoading(true);
        const [eRes, pRes, sRes, cRes] = await Promise.all([
            fetch('/api/project-expenses?limit=1000').then(r => r.json()).then(d => d.data || []).catch(() => []),
            fetch('/api/projects?limit=1000').then(r => r.json()).then(d => d.data || []).catch(() => []),
            fetch('/api/suppliers?limit=1000').then(r => r.json()).then(d => d.data || []).catch(() => []),
            fetch('/api/contractors?limit=1000').then(r => r.json()).then(d => d.data || []).catch(() => []),
        ]);
        setExpenses(eRes);
        setProjects(pRes);
        setSuppliers(sRes);
        setContractors(cRes);
        setLoading(false);
    };
    useEffect(() => { fetchData(); }, []);

    // === Stats ===
    const totalAmount = expenses.reduce((s, e) => s + (e.amount || 0), 0);
    const totalPaid = expenses.filter(e => e.status === 'Đã chi' || e.status === 'Hoàn thành').reduce((s, e) => s + (e.amount || 0), 0);
    const pending = expenses.filter(e => e.status === 'Chờ duyệt').length;
    const approved = expenses.filter(e => e.status === 'Đã duyệt').length;
    const cats = [...new Set(expenses.map(e => e.category))].filter(Boolean);
    const expProjects = [...new Set(expenses.map(e => e.project?.name).filter(Boolean))];

    // === Filter ===
    const filtered = expenses.filter(e => {
        if (filterStatus && e.status !== filterStatus) return false;
        if (filterCategory && e.category !== filterCategory) return false;
        if (filterProject && e.project?.name !== filterProject) return false;
        if (search && !e.code?.toLowerCase().includes(search.toLowerCase()) && !e.description?.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    // === CRUD ===
    const openCreate = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
    const openEdit = (e) => {
        if (e.status !== 'Chờ duyệt' && e.status !== 'Từ chối') return; // only edit when pending
        setEditing(e);
        setForm({ expenseType: e.expenseType || 'Dự án', description: e.description, amount: e.amount, category: e.category, submittedBy: e.submittedBy, date: e.date?.split('T')[0] || '', notes: e.notes, projectId: e.projectId || '', recipientType: e.recipientType || '', recipientId: e.recipientId || '' });
        setShowModal(true);
    };
    const handleSubmit = async () => {
        if (!form.description.trim()) return alert('Nhập mô tả chi phí!');
        if (form.expenseType === 'Dự án' && !form.projectId) return alert('Chọn dự án!');
        if (!form.amount || form.amount <= 0) return alert('Nhập số tiền!');
        const recipientName = form.recipientType === 'NCC' ? suppliers.find(s => s.id === form.recipientId)?.name : form.recipientType === 'Thầu phụ' ? contractors.find(c => c.id === form.recipientId)?.name : '';
        form.recipientName = recipientName || '';
        if (editing) {
            await fetch('/api/project-expenses', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editing.id, ...form, amount: Number(form.amount) }) });
        } else {
            await fetch('/api/project-expenses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
        }
        setShowModal(false);
        fetchData();
    };
    const handleDelete = async (id) => { if (!confirm('Xóa lệnh chi này?')) return; await fetch(`/api/project-expenses?id=${id}`, { method: 'DELETE' }); fetchData(); };

    // === Status update (simple) ===
    const updateStatus = async (id, status, extraData = {}) => {
        await fetch('/api/project-expenses', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status, ...extraData }) });
        fetchData();
    };

    // === Upload proof for payment ===
    const openProofModal = (expense) => { setProofModal(expense); setProofFile(null); setProofPreview(null); };
    const handleProofFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) { setProofFile(file); setProofPreview(URL.createObjectURL(file)); }
    };
    const handleExpPaste = (e) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        for (const item of items) {
            if (item.type.startsWith('image/')) {
                const file = item.getAsFile();
                if (file) { setProofFile(file); setProofPreview(URL.createObjectURL(file)); }
                break;
            }
        }
    };
    const handleExpDrop = (e) => {
        e.preventDefault();
        const file = e.dataTransfer?.files?.[0];
        if (file && file.type.startsWith('image/')) { setProofFile(file); setProofPreview(URL.createObjectURL(file)); }
    };
    const confirmPayWithProof = async () => {
        if (!proofFile) return alert('Bắt buộc upload chứng từ chi!');
        setUploading(true);
        const reader = new FileReader();
        reader.onload = async () => {
            await updateStatus(proofModal.id, 'Đã chi', { proofUrl: reader.result, paidAmount: proofModal.amount });
            setUploading(false);
            setProofModal(null);
        };
        reader.readAsDataURL(proofFile);
    };

    // === Print phiếu chi ===
    const printExpenseVoucher = (e) => {
        const today = new Date().toLocaleDateString('vi-VN');
        const amountText = new Intl.NumberFormat('vi-VN').format(e.amount);
        const w = window.open('', '_blank', 'width=820,height=750');
        w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Phiếu chi - ${e.code}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Times New Roman',serif;font-size:13px;color:#111;background:#fff}
.page{padding:28px 40px;max-width:780px;margin:0 auto}
/* ── HEADER ── */
.header{display:flex;align-items:stretch;margin-bottom:0}
.header-left{display:flex;align-items:center;gap:14px;flex:1;padding-right:20px;border-right:1px solid #C9A84C}
.logo-svg{flex-shrink:0}
.company-info{flex:1}
.company-name{font-size:10px;font-weight:800;color:#1C3A6B;text-transform:uppercase;letter-spacing:.5px;line-height:1.4}
.company-sub{font-size:8.5px;color:#555;margin-top:3px;line-height:1.5}
.header-right{padding-left:18px;font-size:8.5px;color:#444;line-height:1.7;text-align:right;min-width:200px;display:flex;flex-direction:column;justify-content:center}
.header-right b{color:#1C3A6B}
/* ── GOLD STRIPE ── */
.gold-stripe{height:4px;background:linear-gradient(90deg,#1C3A6B 0%,#C9A84C 50%,#1C3A6B 100%);margin:12px 0 18px}
/* ── TITLE ── */
.doc-title{text-align:center;margin-bottom:6px}
.doc-title h1{font-size:20px;font-weight:bold;text-transform:uppercase;letter-spacing:4px;color:#1C3A6B}
.doc-title .sub{font-size:11px;color:#777;margin-top:4px}
.doc-no{text-align:center;font-size:11px;color:#555;margin-bottom:16px}
.doc-no span{background:#f0f4fa;border:1px solid #c5d0e0;padding:2px 12px;border-radius:10px;color:#1C3A6B;font-weight:700}
/* ── INFO TABLE ── */
.info-table{width:100%;border-collapse:collapse;margin-bottom:18px}
.info-table tr td{padding:6px 10px;font-size:12.5px;border-bottom:1px dotted #dde3ee}
.info-table tr td:first-child{color:#555;width:160px;font-style:italic}
.info-table tr td:last-child{font-weight:600;color:#111}
/* ── AMOUNT BOX ── */
.amount-box{border:2px solid #1C3A6B;border-radius:6px;padding:14px 20px;text-align:center;background:linear-gradient(135deg,#f5f8ff,#eef2fa);margin:16px 0}
.amount-box .lbl{font-size:10px;text-transform:uppercase;letter-spacing:3px;color:#1C3A6B;margin-bottom:6px;font-weight:600}
.amount-box .val{font-size:26px;font-weight:bold;color:#1C3A6B;letter-spacing:1px}
.amount-box .val span{color:#C9A84C}
.amount-box .words{font-size:11px;color:#666;margin-top:6px;font-style:italic}
/* ── SIGNATURES ── */
.sign-row{display:flex;justify-content:space-between;margin-top:36px;text-align:center}
.sign-col{width:30%}
.sign-col .role{font-weight:700;font-size:12px;color:#1C3A6B;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px}
.sign-col .date-sign{font-size:10px;color:#888;margin-bottom:56px}
.sign-col .hint{font-size:9.5px;font-style:italic;color:#aaa;border-top:1px solid #bbb;padding-top:4px}
/* ── FOOTER ── */
.footer{margin-top:20px;border-top:1px solid #dde3ee;padding-top:10px;display:flex;justify-content:space-between;align-items:center}
.footer-brand{font-size:8.5px;color:#1C3A6B;font-weight:700;letter-spacing:.5px}
.footer-contact{font-size:8.5px;color:#888}
/* ── PRINT BUTTON ── */
.no-print{position:fixed;top:12px;right:12px;z-index:9999}
.no-print button{padding:10px 22px;font-size:13px;cursor:pointer;background:#1C3A6B;color:#fff;border:none;border-radius:6px;font-weight:700;box-shadow:0 2px 8px rgba(28,58,107,.3)}
@media print{.no-print{display:none!important}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>
<div class="no-print"><button onclick="window.print()">🖨️ In phiếu chi</button></div>
<div class="page">
  <div class="header">
    <div class="header-left">
      <svg class="logo-svg" width="64" height="64" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="120" height="120" rx="12" fill="#1C3A6B"/>
        <polygon points="60,18 100,55 100,95 20,95 20,55" fill="none" stroke="#C9A84C" stroke-width="5"/>
        <rect x="45" y="70" width="30" height="25" fill="#C9A84C"/>
        <polygon points="60,18 100,55 20,55" fill="#F47920" opacity=".9"/>
        <text x="60" y="52" text-anchor="middle" fill="#fff" font-size="13" font-weight="bold" font-family="Arial">SCT</text>
      </svg>
      <div class="company-info">
        <div class="company-name">Công ty TNHH Kiến Trúc Đô Thị SCT</div>
        <div class="company-sub">🌐 kientrucsct.com &nbsp;|&nbsp; 📞 0xxx xxx xxx</div>
        <div class="company-sub">📍 Địa chỉ công ty, Thành phố</div>
      </div>
    </div>
    <div class="header-right">
      <div><b>Mã phiếu:</b> ${e.code}</div>
      <div><b>Ngày:</b> ${today}</div>
      <div><b>Loại:</b> ${e.expenseType || 'Chi phí'}</div>
    </div>
  </div>

  <div class="gold-stripe"></div>

  <div class="doc-title">
    <h1>Phiếu Chi Tiền</h1>
    <div class="sub">PAYMENT VOUCHER</div>
  </div>
  <div class="doc-no">Số: <span>${e.code}</span></div>

  <table class="info-table">
    <tr><td>Người nhận tiền:</td><td>${e.recipientName || e.submittedBy || '...'}</td></tr>
    ${e.recipientType ? `<tr><td>Loại đối tượng:</td><td>${e.recipientType}</td></tr>` : ''}
    ${e.project ? `<tr><td>Dự án:</td><td>${e.project.code} — ${e.project.name}</td></tr>` : ''}
    <tr><td>Hạng mục:</td><td>${e.category || '—'}</td></tr>
    <tr><td>Nội dung chi:</td><td>${e.description}</td></tr>
    ${e.notes ? `<tr><td>Ghi chú:</td><td>${e.notes}</td></tr>` : ''}
    <tr><td>Trạng thái:</td><td>${e.status}</td></tr>
  </table>

  <div class="amount-box">
    <div class="lbl">Số tiền chi</div>
    <div class="val">${amountText} <span>đ</span></div>
    <div class="words">(Bằng chữ: _____________________________________________)</div>
  </div>

  ${e.proofUrl ? `<div style="text-align:center;margin:12px 0"><div style="font-size:10px;color:#888;margin-bottom:4px;font-style:italic">Chứng từ đính kèm:</div><img src="${e.proofUrl}" style="max-width:220px;max-height:140px;border:1px solid #dde3ee;border-radius:4px" /></div>` : ''}

  <div class="sign-row">
    <div class="sign-col">
      <div class="role">Người lập phiếu</div>
      <div class="date-sign">Ngày ${today}</div>
      <div class="hint">(Ký, ghi rõ họ tên)</div>
    </div>
    <div class="sign-col">
      <div class="role">Giám đốc</div>
      <div class="date-sign">Ngày &nbsp;&nbsp;&nbsp; tháng &nbsp;&nbsp;&nbsp; năm</div>
      <div class="hint">(Ký, ghi rõ họ tên)</div>
    </div>
    <div class="sign-col">
      <div class="role">Người nhận tiền</div>
      <div class="date-sign">Ngày ${today}</div>
      <div class="hint">(Ký, ghi rõ họ tên)</div>
    </div>
  </div>

  <div class="footer">
    <div class="footer-brand">KIẾN TRÚC ĐÔ THỊ SCT</div>
    <div class="footer-contact">kientrucsct.com &nbsp;|&nbsp; Mã: ${e.code} &nbsp;|&nbsp; ${today}</div>
  </div>
</div>
</body></html>`);
        w.document.close();
    };

    const statusBadge = (s) => {
        const map = { 'Chờ duyệt': 'warning', 'Đã duyệt': 'info', 'Đã chi': 'accent', 'Hoàn thành': 'success', 'Từ chối': 'danger', 'Chờ thanh toán': 'warning', 'Đã thanh toán': 'success' };
        return map[s] || 'muted';
    };

    return (
        <div>
            <div className="stats-grid" style={{ marginBottom: 24 }}>
                <div className="stat-card"><div className="stat-icon">📑</div><div><div className="stat-value">{expenses.length}</div><div className="stat-label">Tổng lệnh chi</div></div></div>
                <div className="stat-card"><div className="stat-icon">💵</div><div><div className="stat-value">{fmt(totalAmount)}</div><div className="stat-label">Tổng giá trị</div></div></div>
                <div className="stat-card"><div className="stat-icon">💸</div><div><div className="stat-value" style={{ color: 'var(--status-success)' }}>{fmt(totalPaid)}</div><div className="stat-label">Đã chi</div></div></div>
                <div className="stat-card"><div className="stat-icon">⏳</div><div><div className="stat-value" style={{ color: 'var(--status-warning)' }}>{pending}</div><div className="stat-label">Chờ duyệt</div></div></div>
                <div className="stat-card"><div className="stat-icon">✅</div><div><div className="stat-value" style={{ color: 'var(--status-info)' }}>{approved}</div><div className="stat-label">Đã duyệt (chờ chi)</div></div></div>
            </div>

            {/* Workflow guide */}
            <div className="card" style={{ marginBottom: 20, padding: '12px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-muted)' }}>
                    <strong style={{ color: 'var(--text-primary)' }}>Quy trình:</strong>
                    <span className="badge warning">Tạo lệnh chi</span> →
                    <span className="badge info">Duyệt lệnh</span> →
                    <span style={{ padding: '2px 8px', background: 'var(--accent-primary)', color: '#fff', borderRadius: 10, fontSize: 11 }}>KT upload chứng từ & chi</span> →
                    <span className="badge success">Hoàn thành</span>
                </div>
            </div>

            <div className="card">
                <div className="card-header">
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
                        <h3 style={{ margin: 0 }}>Danh sách lệnh chi</h3>
                    </div>
                </div>
                <div className="filter-bar">
                    <input className="form-input" placeholder="🔍 Tìm kiếm..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 0 }} />
                    <select className="form-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                        <option value="">Tất cả TT</option>
                        <option>Chờ duyệt</option><option>Đã duyệt</option><option>Đã chi</option><option>Hoàn thành</option><option>Từ chối</option><option>Chờ thanh toán</option><option>Đã thanh toán</option>
                    </select>
                    <select className="form-select" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                        <option value="">Tất cả HM</option>
                        {cats.map(c => <option key={c}>{c}</option>)}
                    </select>
                    <select className="form-select" value={filterProject} onChange={e => setFilterProject(e.target.value)}>
                        <option value="">Tất cả DA</option>
                        {expProjects.map(p => <option key={p}>{p}</option>)}
                    </select>
                    <button className="btn btn-primary" onClick={openCreate}>+ Tạo lệnh chi</button>
                </div>

                {loading ? <div style={{ padding: 40, textAlign: 'center' }}>Đang tải...</div> : (
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table" style={{ margin: 0 }}>
                            <thead><tr>
                                <th>Mã</th><th>Mô tả</th><th>Dự án</th><th>Người nhận</th><th>Hạng mục</th><th>Số tiền</th><th>Người nộp</th><th>Ngày</th><th>Trạng thái</th><th style={{ minWidth: 160 }}>Thao tác</th>
                            </tr></thead>
                            <tbody>{filtered.map(e => (
                                <tr key={e.id} style={{ opacity: e.status === 'Hoàn thành' ? 0.6 : 1 }}>
                                    <td className="accent">{e.code}</td>
                                    <td className="primary" style={{ cursor: (e.status === 'Chờ duyệt' || e.status === 'Từ chối') ? 'pointer' : 'default' }} onClick={() => openEdit(e)}>{e.description}</td>
                                    <td><span className="badge info" style={{ fontSize: 10 }}>{e.project?.code}</span> <span style={{ fontSize: 11 }}>{e.project?.name}</span></td>
                                    <td style={{ fontSize: 12 }}>{e.recipientType && <span className="badge" style={{ fontSize: 9, background: e.recipientType === 'NCC' ? '#e8f5e9' : '#fff3e0', color: e.recipientType === 'NCC' ? '#2e7d32' : '#e65100', marginRight: 4 }}>{e.recipientType}</span>}{e.recipientName || '—'}</td>
                                    <td><span className="badge muted">{e.category}</span></td>
                                    <td className="amount">{fmt(e.amount)}</td>
                                    <td style={{ fontSize: 12 }}>{e.submittedBy || '—'}</td>
                                    <td style={{ fontSize: 12 }}>{fmtDate(e.date)}</td>
                                    <td>
                                        <select
                                            value={e.status}
                                            onChange={ev => updateStatus(e.id, ev.target.value)}
                                            style={{
                                                fontSize: 11, padding: '3px 6px', borderRadius: 6, border: '1px solid var(--border)',
                                                background: 'var(--bg-secondary)', cursor: 'pointer', maxWidth: 140,
                                            }}
                                        >
                                            <option>Chờ duyệt</option>
                                            <option>Đã duyệt</option>
                                            <option>Đã chi</option>
                                            <option>Hoàn thành</option>
                                            <option>Từ chối</option>
                                            <option>Chờ thanh toán</option>
                                            <option>Đã thanh toán</option>
                                        </select>
                                        {e.proofUrl && <a href={e.proofUrl} target="_blank" rel="noreferrer" title="Xem chứng từ" style={{ marginLeft: 4 }}>📎</a>}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                            {/* Step 1→2: Duyệt / Từ chối */}
                                            {e.status === 'Chờ duyệt' && (<>
                                                <button className="btn btn-sm" style={{ background: 'var(--status-success)', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: 6, fontSize: 11, cursor: 'pointer' }} onClick={() => updateStatus(e.id, 'Đã duyệt')}>✓ Duyệt</button>
                                                <button className="btn btn-sm" style={{ background: 'var(--status-danger)', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: 6, fontSize: 11, cursor: 'pointer' }} onClick={() => updateStatus(e.id, 'Từ chối')}>✗ Từ chối</button>
                                            </>)}
                                            {/* Step 2→3: KT chi (upload proof) */}
                                            {e.status === 'Đã duyệt' && (
                                                <button className="btn btn-sm" style={{ background: 'var(--accent-primary)', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: 6, fontSize: 11, cursor: 'pointer' }} onClick={() => openProofModal(e)}>💸 Chi tiền</button>
                                            )}
                                            {/* Step 3→4: Hoàn thành */}
                                            {e.status === 'Đã chi' && (
                                                <button className="btn btn-sm" style={{ background: 'var(--status-success)', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: 6, fontSize: 11, cursor: 'pointer' }} onClick={() => updateStatus(e.id, 'Hoàn thành')}>✅ Hoàn thành</button>
                                            )}
                                            {/* Chờ thanh toán → Đã thanh toán */}
                                            {e.status === 'Chờ thanh toán' && (
                                                <button className="btn btn-sm" style={{ background: 'var(--status-success)', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: 6, fontSize: 11, cursor: 'pointer' }} onClick={() => updateStatus(e.id, 'Đã thanh toán')}>✓ Đã thanh toán</button>
                                            )}
                                            {/* Đã thanh toán → Chờ thanh toán (undo) */}
                                            {e.status === 'Đã thanh toán' && (
                                                <button className="btn btn-sm" style={{ background: 'var(--status-warning)', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: 6, fontSize: 11, cursor: 'pointer' }} onClick={() => updateStatus(e.id, 'Chờ thanh toán')}>↩ Chờ TT</button>
                                            )}
                                            {/* Mở lại từ chối */}
                                            {e.status === 'Từ chối' && (
                                                <button className="btn btn-sm" style={{ background: 'var(--status-warning)', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: 6, fontSize: 11, cursor: 'pointer' }} onClick={() => updateStatus(e.id, 'Chờ duyệt')}>↩ Mở lại</button>
                                            )}
                                            {/* In phiếu chi */}
                                            {(e.status === 'Đã chi' || e.status === 'Hoàn thành') && (
                                                <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => printExpenseVoucher(e)}>🧾 Phiếu chi</button>
                                            )}
                                            {/* Delete - only when pending */}
                                            {(e.status === 'Chờ duyệt' || e.status === 'Từ chối') && (
                                                <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(e.id)} style={{ color: 'var(--status-danger)', fontSize: 11 }}>🗑️</button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}</tbody>
                        </table>
                    </div>
                )}
                {!loading && filtered.length === 0 && <div style={{ color: 'var(--text-muted)', padding: 24, textAlign: 'center' }}>Không có dữ liệu</div>}
            </div>

            {/* Modal tạo/sửa lệnh chi */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
                        <div className="modal-header">
                            <h3>{editing ? '✏️ Sửa lệnh chi' : '+ Tạo lệnh chi tiền'}</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            {/* Loại chi */}
                            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                                {['Dự án', 'Công ty'].map(t => (
                                    <button key={t} onClick={() => setForm({ ...form, expenseType: t, projectId: t === 'Công ty' ? '' : form.projectId, recipientType: t === 'Công ty' ? '' : form.recipientType, recipientId: t === 'Công ty' ? '' : form.recipientId, category: t === 'Công ty' ? 'Thuê văn phòng' : 'Vật tư xây dựng' })}
                                        style={{ flex: 1, padding: '10px 16px', borderRadius: 8, border: form.expenseType === t ? '2px solid var(--accent-primary)' : '1px solid var(--border)', background: form.expenseType === t ? 'var(--accent-primary)' : 'transparent', color: form.expenseType === t ? '#fff' : 'var(--text-primary)', fontWeight: 600, cursor: 'pointer', fontSize: 13, transition: '0.2s' }}>
                                        {t === 'Dự án' ? '🏗️ Chi phí dự án' : '🏢 Chi phí chung'}
                                    </button>
                                ))}
                            </div>
                            {form.expenseType === 'Dự án' && (
                                <div className="form-group">
                                    <label className="form-label">Dự án *</label>
                                    <select className="form-select" value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })}>
                                        <option value="">— Chọn dự án —</option>
                                        {projects.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                                    </select>
                                </div>
                            )}
                            <div className="form-group">
                                <label className="form-label">Mô tả chi phí *</label>
                                <input className="form-input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="VD: Mua xi măng, thuê xe cẩu..." />
                            </div>
                            {form.expenseType === 'Dự án' && (
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Chi cho</label>
                                        <select className="form-select" value={form.recipientType} onChange={e => setForm({ ...form, recipientType: e.target.value, recipientId: '' })}>
                                            <option value="">— Không chọn —</option>
                                            <option value="NCC">Nhà cung cấp</option>
                                            <option value="Thầu phụ">Thầu phụ</option>
                                        </select>
                                    </div>
                                    {form.recipientType && (
                                        <div className="form-group">
                                            <label className="form-label">Người nhận</label>
                                            <select className="form-select" value={form.recipientId} onChange={e => setForm({ ...form, recipientId: e.target.value })}>
                                                <option value="">— Chọn {form.recipientType} —</option>
                                                {form.recipientType === 'NCC' && suppliers.map(s => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}
                                                {form.recipientType === 'Thầu phụ' && contractors.map(c => <option key={c.id} value={c.id}>{c.name} ({c.type})</option>)}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            )}
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Số tiền *</label>
                                    <input className="form-input" type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Hạng mục</label>
                                    <select className="form-select" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                                        {(form.expenseType === 'Công ty' ? COMPANY_CATEGORIES : PROJECT_CATEGORIES).map(c => <option key={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Người đề nghị</label>
                                    <input className="form-input" value={form.submittedBy} onChange={e => setForm({ ...form, submittedBy: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Ngày</label>
                                    <input className="form-input" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Ghi chú</label>
                                <textarea className="form-input" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Hủy</button>
                            <button className="btn btn-primary" onClick={handleSubmit}>{editing ? 'Cập nhật' : 'Tạo lệnh chi'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal upload chứng từ chi */}
            {proofModal && (
                <div className="modal-overlay" onClick={() => !uploading && setProofModal(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
                        <div className="modal-header">
                            <h3>💸 Chi tiền — Upload chứng từ</h3>
                            <button className="modal-close" onClick={() => !uploading && setProofModal(null)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div style={{ padding: 12, background: 'var(--bg-secondary)', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
                                <div><strong>Mã:</strong> {proofModal.code}</div>
                                <div><strong>Mô tả:</strong> {proofModal.description}</div>
                                <div><strong>Dự án:</strong> {proofModal.project?.name}</div>
                                <div><strong>Số tiền chi:</strong> <span style={{ fontWeight: 700, color: 'var(--status-danger)' }}>{fmt(proofModal.amount)}</span></div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">📎 Chứng từ chi * <span style={{ color: 'var(--status-danger)', fontSize: 11 }}>(Bắt buộc: ảnh UNC, biên lai, hóa đơn...)</span></label>
                                <div
                                    onPaste={handleExpPaste}
                                    onDrop={handleExpDrop}
                                    onDragOver={e => e.preventDefault()}
                                    tabIndex={0}
                                    style={{ border: '2px dashed var(--border)', borderRadius: 8, padding: 20, textAlign: 'center', cursor: 'pointer', background: proofFile ? 'var(--bg-secondary)' : 'transparent', outline: 'none', transition: 'border-color 0.2s' }}
                                    onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'}
                                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                                    onClick={() => proofRef.current?.click()}
                                >
                                    <input ref={proofRef} type="file" accept="image/*" onChange={handleProofFileChange} style={{ display: 'none' }} />
                                    {proofPreview ? (
                                        <div>
                                            <img src={proofPreview} alt="preview" style={{ maxWidth: '100%', maxHeight: 160, borderRadius: 6, marginBottom: 8 }} />
                                            <div style={{ fontSize: 12, color: 'var(--status-success)' }}>✅ {proofFile?.name || 'Ảnh từ clipboard'}</div>
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
                            <button className="btn btn-ghost" onClick={() => setProofModal(null)} disabled={uploading}>Hủy</button>
                            <button className="btn btn-primary" onClick={confirmPayWithProof} disabled={uploading || !proofFile}
                                style={{ background: uploading ? '#999' : 'var(--accent-primary)' }}>
                                {uploading ? '⏳ Đang xử lý...' : '💸 Xác nhận chi tiền'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
