'use client';
import { useState, useEffect, useRef } from 'react';

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
const pct = (a, b) => b > 0 ? Math.round((a / b) * 100) : 0;
const currentMonth = () => new Date().toISOString().slice(0, 7);

/* ───── Chi phí constants ───── */
const WORKSHOP_CATEGORIES = ['Vật tư gỗ & ván', 'Phụ kiện nội thất', 'Công thợ xưởng', 'Chi phí vận chuyển', 'Điện nước xưởng', 'Thuê máy móc', 'Sơn & hoàn thiện', 'Chi phí chung', 'Khác'];

const EXP_STATUS_STYLE = {
    'Chờ duyệt': { bg: '#fef3c7', color: '#92400e' },
    'Đã duyệt':  { bg: '#dbeafe', color: '#1e40af' },
    'Đã chi':    { bg: '#dcfce7', color: '#166534' },
    'Hoàn thành':{ bg: '#d1fae5', color: '#065f46' },
    'Từ chối':   { bg: '#fee2e2', color: '#991b1b' },
};

const EXP_TABS = [
    { key: '', label: 'Tất cả' }, { key: 'Chờ duyệt', label: 'Chờ duyệt' },
    { key: 'Đã duyệt', label: 'Đã duyệt' }, { key: 'Đã chi', label: 'Đã chi' },
    { key: 'Hoàn thành', label: 'Hoàn thành' }, { key: 'Từ chối', label: 'Từ chối' },
];

const emptyForm = { description: '', amount: '', category: 'Vật tư gỗ & ván', submittedBy: '', date: new Date().toISOString().split('T')[0], notes: '', projectId: '', recipientType: '', recipientId: '', recipientName: '' };

/* ───── Thu tiền constants ───── */
const THU_STATUS_STYLE = {
    'Chưa thu':     { bg: '#fee2e2', color: '#991b1b' },
    'Thu một phần': { bg: '#fef3c7', color: '#92400e' },
    'Đã thu':       { bg: '#d1fae5', color: '#065f46' },
};

export default function WorkshopFinancePage() {
    /* ── Main tab ── */
    const [mainTab, setMainTab] = useState('chi_phi');

    /* ── Chi phí state ── */
    const [expenses, setExpenses] = useState([]);
    const [projects, setProjects] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [workshopUsers, setWorkshopUsers] = useState([]);
    const [loadingExp, setLoadingExp] = useState(true);
    const [expTab, setExpTab] = useState('');
    const [search, setSearch] = useState('');
    const [filterProject, setFilterProject] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [proofModal, setProofModal] = useState(null);
    const [proofFile, setProofFile] = useState(null);
    const [proofPreview, setProofPreview] = useState(null);
    const [uploading, setUploading] = useState(false);
    const proofRef = useRef();

    /* ── Thu tiền state ── */
    const [payments, setPayments] = useState([]);
    const [standaloneIncomes, setStandaloneIncomes] = useState([]);
    const [loadingPay, setLoadingPay] = useState(true);
    const [filterPayStatus, setFilterPayStatus] = useState('');
    const [filterPayProject, setFilterPayProject] = useState('');
    const [showCreatePayModal, setShowCreatePayModal] = useState(false);
    const [createPayForm, setCreatePayForm] = useState({ noidung: '', amount: '', dueDate: '', notes: '', category: 'Nội thất' });
    const [savingPay, setSavingPay] = useState(false);
    const [collectModal, setCollectModal] = useState(null);
    const [collectFile, setCollectFile] = useState(null);
    const [collectPreview, setCollectPreview] = useState(null);
    const [collectAmount, setCollectAmount] = useState('');
    const [collectUploading, setCollectUploading] = useState(false);
    const collectRef = useRef();

    /* ── Lương & Tăng ca state ── */
    const [payrollMonth, setPayrollMonth] = useState(currentMonth);
    const [allWorkers, setAllWorkers] = useState([]);
    const [payrollAttendance, setPayrollAttendance] = useState([]);
    const [payrollOvertimes, setPayrollOvertimes] = useState([]);
    const [loadingPayroll, setLoadingPayroll] = useState(false);
    const [expandedWorker, setExpandedWorker] = useState(null);
    const [payrollFilter, setPayrollFilter] = useState('');

    /* ── Fetch ── */
    const fetchExpenses = async () => {
        setLoadingExp(true);
        const [eRes, pRes, sRes, uRes] = await Promise.all([
            fetch('/api/project-expenses?limit=1000&department=xuong&expenseType=X%C6%B0%E1%BB%9Fng').then(r => r.json()).then(d => d.data || []).catch(() => []),
            fetch('/api/projects?limit=500&type=Thi%20c%C3%B4ng%20n%E1%BB%99i%20th%E1%BA%A5t').then(r => r.json()).then(d => d.data || []).catch(() => []),
            fetch('/api/suppliers?limit=500').then(r => r.json()).then(d => d.data || []).catch(() => []),
            fetch('/api/users').then(r => r.json()).then(d => (d || []).filter(u => u.role === 'xuong')).catch(() => []),
        ]);
        setExpenses(eRes); setProjects(pRes); setSuppliers(sRes); setWorkshopUsers(uRes);
        setLoadingExp(false);
    };

    const fetchPayments = async () => {
        setLoadingPay(true);
        const [res, incRes] = await Promise.all([
            fetch('/api/finance/receivables?projectType=Thi%20c%C3%B4ng%20n%E1%BB%99i%20th%E1%BA%A5t').then(r => r.json()).catch(() => ({ payments: [] })),
            fetch('/api/project-expenses?expenseType=Thu%20ti%E1%BB%81n&department=xuong&limit=1000').then(r => r.json()).then(d => d.data || []).catch(() => []),
        ]);
        setPayments(res.payments || []);
        setStandaloneIncomes(incRes);
        setLoadingPay(false);
    };

    useEffect(() => { fetchExpenses(); fetchPayments(); }, []);

    /* ── Fetch workers once ── */
    useEffect(() => {
        fetch('/api/workshop/workers').then(r => r.json()).then(d => setAllWorkers(Array.isArray(d) ? d : []));
    }, []);

    const fetchPayroll = async (month) => {
        setLoadingPayroll(true);
        const [attRes, otRes] = await Promise.all([
            fetch(`/api/workshop/attendance?month=${month}`).then(r => r.json()).catch(() => []),
            fetch(`/api/workshop/overtimes?month=${month}`).then(r => r.json()).catch(() => []),
        ]);
        setPayrollAttendance(Array.isArray(attRes) ? attRes : []);
        setPayrollOvertimes(Array.isArray(otRes) ? otRes : []);
        setLoadingPayroll(false);
    };

    useEffect(() => { fetchPayroll(payrollMonth); }, [payrollMonth]);

    /* ══════════════════════════════
       CHI PHÍ logic
    ══════════════════════════════ */
    const expTotal = expenses.length;
    const expValue = expenses.reduce((s, e) => s + (e.amount || 0), 0);
    const expPaid  = expenses.filter(e => ['Đã chi', 'Hoàn thành'].includes(e.status)).reduce((s, e) => s + (e.amount || 0), 0);
    const expPendingCount   = expenses.filter(e => e.status === 'Chờ duyệt').length;
    const expApprovedCount  = expenses.filter(e => e.status === 'Đã duyệt').length;
    const expProjects = [...new Set(expenses.map(e => e.project?.name).filter(Boolean))];

    const filteredExp = expenses.filter(e => {
        if (expTab && e.status !== expTab) return false;
        if (filterProject && e.project?.name !== filterProject) return false;
        if (search && !e.code?.toLowerCase().includes(search.toLowerCase()) && !e.description?.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    const openCreate = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
    const openEdit = (e) => {
        setEditing(e);
        setForm({ description: e.description || '', amount: e.amount || '', category: e.category || 'Vật tư gỗ & ván', submittedBy: e.submittedBy || '', date: e.date ? new Date(e.date).toISOString().split('T')[0] : '', notes: e.notes || '', projectId: e.projectId || '', recipientType: e.recipientType || '', recipientId: e.recipientId || '', recipientName: e.recipientName || '' });
        setShowModal(true);
    };
    const handleSubmit = async () => {
        if (!form.description.trim()) return alert('Nhập mô tả chi phí!');
        if (!form.amount || Number(form.amount) <= 0) return alert('Nhập số tiền!');
        setSaving(true);
        const recipientName = form.recipientType === 'NCC' ? (suppliers.find(s => s.id === form.recipientId)?.name || form.recipientName) : form.recipientName;
        const payload = { ...form, amount: Number(form.amount), projectId: form.projectId || null, recipientName: recipientName || '', department: 'xuong', expenseType: 'Xưởng' };
        const res = editing
            ? await fetch('/api/project-expenses', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editing.id, ...payload }) })
            : await fetch('/api/project-expenses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        setSaving(false);
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            return alert('Lỗi: ' + (err.error || res.statusText));
        }
        setShowModal(false);
        await fetchExpenses();
    };
    const handleDelete = async (id) => { if (!confirm('Xóa lệnh chi này?')) return; await fetch(`/api/project-expenses?id=${id}`, { method: 'DELETE' }); fetchExpenses(); };
    const updateStatus = async (id, status, extra = {}) => { await fetch('/api/project-expenses', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status, ...extra }) }); fetchExpenses(); };

    const openProofModal = (e) => { setProofModal(e); setProofFile(null); setProofPreview(null); };
    const handleProofFile = (file) => { if (file?.type.startsWith('image/')) { setProofFile(file); setProofPreview(URL.createObjectURL(file)); } };
    const confirmPay = async () => {
        if (!proofFile) return alert('Bắt buộc upload chứng từ chi!');
        setUploading(true);
        const fd = new FormData(); fd.append('file', proofFile); fd.append('type', 'proofs');
        const { url: proofUrl } = await fetch('/api/upload', { method: 'POST', body: fd }).then(r => r.json());
        if (!proofUrl) { setUploading(false); return alert('Upload thất bại!'); }
        await updateStatus(proofModal.id, 'Đã chi', { proofUrl, paidAmount: proofModal.amount });
        setUploading(false); setProofModal(null);
    };

    /* ══════════════════════════════
       THU TIỀN logic
    ══════════════════════════════ */
    const payTotal    = payments.reduce((s, p) => s + (p.amount || 0), 0);
    const payReceived = payments.reduce((s, p) => s + (p.paidAmount || 0), 0);
    const payRemain   = payTotal - payReceived;
    const payPending  = payments.filter(p => p.status !== 'Đã thu').length;
    const payProjects = [...new Set(payments.map(p => p.contract?.project?.name).filter(Boolean))];

    const filteredPay = payments.filter(p => {
        if (filterPayStatus && p.status !== filterPayStatus) return false;
        if (filterPayProject && p.contract?.project?.name !== filterPayProject) return false;
        return true;
    });

    const openCreatePay = () => {
        setCreatePayForm({ noidung: '', amount: '', dueDate: '', notes: '', category: 'Nội thất' });
        setShowCreatePayModal(true);
    };
    const handleCreatePay = async () => {
        if (!createPayForm.noidung.trim()) return alert('Nhập nội dung thu!');
        if (!createPayForm.amount || Number(createPayForm.amount) <= 0) return alert('Nhập số tiền!');
        setSavingPay(true);
        await fetch('/api/project-expenses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                description: createPayForm.noidung.trim(),
                amount: Number(createPayForm.amount),
                category: createPayForm.category,
                date: createPayForm.dueDate || new Date().toISOString().split('T')[0],
                notes: createPayForm.notes.trim(),
                expenseType: 'Thu tiền',
                department: 'xuong',
                status: 'Chờ duyệt',
                submittedBy: '',
            }),
        });
        setSavingPay(false);
        setShowCreatePayModal(false);
        fetchPayments();
    };

    const openCollect = (p) => {
        setCollectModal(p);
        setCollectFile(null); setCollectPreview(null);
        setCollectAmount(String((p.amount || 0) - (p.paidAmount || 0)));
    };
    const handleCollectFile = (file) => { if (file?.type.startsWith('image/')) { setCollectFile(file); setCollectPreview(URL.createObjectURL(file)); } };
    const confirmCollect = async () => {
        if (!collectFile) return alert('Bắt buộc upload ảnh chuyển khoản hoặc chữ ký!');
        setCollectUploading(true);
        const fd = new FormData(); fd.append('file', collectFile); fd.append('type', 'proofs');
        const { url: proofUrl } = await fetch('/api/upload', { method: 'POST', body: fd }).then(r => r.json());
        if (!proofUrl) { setCollectUploading(false); return alert('Upload thất bại!'); }
        const p = collectModal;
        const newPaid = (p.paidAmount || 0) + Number(collectAmount);
        await fetch(`/api/contracts/${p.contractId}/payments/${p.id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paidAmount: newPaid, status: newPaid >= p.amount ? 'Đã thu' : 'Thu một phần', proofUrl, paidDate: new Date().toISOString() }),
        });
        setCollectUploading(false); setCollectModal(null); fetchPayments();
    };

    const printReceipt = (p) => {
        const c = p.contract;
        const today = new Date().toLocaleDateString('vi-VN');
        const w = window.open('', '_blank', 'width=820,height=900');
        w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Phiếu thu</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Times New Roman',serif;font-size:14px}
.page{max-width:780px;margin:0 auto;padding:24px 32px}
.header{border-bottom:4px solid #ea580c;padding-bottom:14px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center}
.co-name{font-size:15px;font-weight:900;color:#1C3A6B;text-transform:uppercase}
.co-info{font-size:9px;color:#555;line-height:1.8;text-align:right}
.title{text-align:center;margin:16px 0;font-size:24px;font-weight:900;text-transform:uppercase;letter-spacing:4px;color:#1C3A6B}
.info{border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;margin:14px 0}
.row{display:flex;padding:7px 12px;border-bottom:1px solid #f0f0f0;font-size:13px}
.row:last-child{border-bottom:none}.row:nth-child(even){background:#fafafa}
.lbl{width:160px;color:#666;font-size:12px;flex-shrink:0}.val{flex:1;font-weight:700;color:#1C3A6B}
.amount-box{margin:18px 0;padding:20px;border:2px solid #ea580c;text-align:center;background:#fff7ed;border-radius:8px}
.amount-box .lbl{font-size:11px;color:#ea580c;text-transform:uppercase;letter-spacing:3px;margin-bottom:6px;font-weight:700;width:auto}
.amount-box .val{font-size:28px;font-weight:900;color:#1C3A6B;width:auto}
.signs{display:flex;justify-content:space-between;margin-top:40px}
.sign{width:45%;text-align:center;border:1px dashed #ddd;border-radius:6px;padding:10px}
.sign .role{font-weight:700;font-size:13px;margin-bottom:55px;color:#1C3A6B}
.sign .hint{font-size:10px;font-style:italic;color:#999}
.footer{border-top:2px solid #ea580c;margin-top:16px;padding-top:10px;text-align:center;font-size:9px;color:#888}
.no-print{position:fixed;top:12px;right:12px}.no-print button{padding:10px 24px;background:#ea580c;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer}
@media print{.no-print{display:none!important}}
</style></head><body>
<div class="no-print"><button onclick="window.print()">🖨️ In phiếu thu</button></div>
<div class="page">
  <div class="header">
    <div><div class="co-name">Kiến Trúc Đô Thị SCT — Xưởng Nội Thất</div><div style="font-size:9px;color:#555;margin-top:4px">📞 0914 998 822 | kientrucsct.com</div></div>
    <div class="co-info"><div><b>Ngày:</b> ${today}</div><div><b>Dự án:</b> ${c?.project?.name || '—'}</div></div>
  </div>
  <div class="title">Phiếu Thu Tiền</div>
  <div class="info">
    <div class="row"><span class="lbl">Hợp đồng</span><span class="val">${c?.code} — ${c?.name || ''}</span></div>
    <div class="row"><span class="lbl">Khách hàng</span><span class="val">${c?.customer?.name || '—'}</span></div>
    <div class="row"><span class="lbl">Đợt thanh toán</span><span class="val">${p.phase}</span></div>
    <div class="row"><span class="lbl">Lý do thu</span><span class="val">Thanh toán đợt "${p.phase}" – ${c?.code}</span></div>
  </div>
  <div class="amount-box">
    <div class="lbl">Số tiền thu</div>
    <div class="val">${fmt(p.paidAmount || p.amount)}</div>
  </div>
  ${p.proofUrl ? `<div style="text-align:center;margin:10px 0"><img src="${p.proofUrl}" style="max-width:200px;max-height:120px;border:1px solid #ddd;border-radius:4px"/></div>` : ''}
  <div class="signs">
    <div class="sign"><div class="role">Người nộp tiền</div><div class="hint">(Ký, ghi rõ họ tên)</div></div>
    <div class="sign"><div class="role">Người thu tiền</div><div class="hint">(Ký, ghi rõ họ tên)</div></div>
  </div>
  <div class="footer">Kiến Trúc Đô Thị SCT · Xưởng Nội Thất · kientrucsct.com · 0914 998 822</div>
</div></body></html>`);
        w.document.close();
    };

    /* ══════════════════════════════
       LƯƠNG & TĂNG CA logic
    ══════════════════════════════ */
    const payrollRows = allWorkers.map(w => {
        const att = payrollAttendance.filter(a => a.workerId === w.id);
        const ot  = payrollOvertimes.filter(o => o.workerId === w.id);
        const dailyRate = w.hourlyRate || 0;
        const totalDays = att.reduce((s, a) => s + (a.hoursWorked || 8) / 8, 0);
        const baseSalary = att.reduce((s, a) => s + ((a.hoursWorked || 8) / 8) * dailyRate, 0);
        const otPay = ot.reduce((s, o) => s + (o.totalPay || 0), 0);
        const total = baseSalary + otPay;
        return { worker: w, att, ot, totalDays, baseSalary, otPay, total };
    }).filter(r => payrollFilter === '' || r.worker.name.toLowerCase().includes(payrollFilter.toLowerCase()) || r.worker.workerType === payrollFilter);

    const payrollTotalBase = payrollRows.reduce((s, r) => s + r.baseSalary, 0);
    const payrollTotalOT   = payrollRows.reduce((s, r) => s + r.otPay, 0);
    const payrollGrandTotal = payrollRows.reduce((s, r) => s + r.total, 0);

    const printPayslip = (row) => {
        const [y, m] = payrollMonth.split('-');
        const w = window.open('', '_blank', 'width=820,height=900');
        w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Phiếu lương</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Times New Roman',serif;font-size:13px}
.page{max-width:760px;margin:0 auto;padding:24px 32px}
.header{border-bottom:4px solid #d35400;padding-bottom:12px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center}
.co-name{font-size:14px;font-weight:900;color:#1C3A6B;text-transform:uppercase}
.title{text-align:center;margin:14px 0 10px;font-size:22px;font-weight:900;text-transform:uppercase;letter-spacing:4px;color:#1C3A6B}
.sub{text-align:center;font-size:11px;color:#888;margin-bottom:14px}
.info{display:grid;grid-template-columns:1fr 1fr;gap:0;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;margin-bottom:14px}
.row{padding:7px 12px;border-bottom:1px solid #f0f0f0;font-size:12px;display:flex;justify-content:space-between}
.lbl{color:#666}.val{font-weight:700;color:#1C3A6B}
.table{width:100%;border-collapse:collapse;margin-bottom:14px}
.table th{background:#fdf6f0;padding:7px 10px;font-size:11px;color:#888;border:1px solid #f0ebe5;text-align:center}
.table td{padding:7px 10px;font-size:12px;border:1px solid #f0ebe5;text-align:center}
.table td:first-child{text-align:left}
.total-row{background:#fff7ed;font-weight:900}
.amount-box{margin:10px 0;padding:14px;border:2px solid #d35400;text-align:center;background:#fff7ed;border-radius:6px}
.signs{display:flex;justify-content:space-between;margin-top:32px}
.sign{width:45%;text-align:center;border:1px dashed #ddd;border-radius:6px;padding:10px}
.sign .role{font-weight:700;font-size:12px;margin-bottom:48px;color:#1C3A6B}
.sign .hint{font-size:10px;font-style:italic;color:#999}
.footer{border-top:2px solid #d35400;margin-top:14px;padding-top:8px;text-align:center;font-size:9px;color:#888}
.no-print{position:fixed;top:12px;right:12px}.no-print button{padding:10px 24px;background:#d35400;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer}
@media print{.no-print{display:none!important}}
</style></head><body>
<div class="no-print"><button onclick="window.print()">🖨️ In phiếu lương</button></div>
<div class="page">
<div class="header">
  <div><div class="co-name">Kiến Trúc Đô Thị SCT — Xưởng Nội Thất</div><div style="font-size:9px;color:#555;margin-top:4px">📞 0914 998 822 | kientrucsct.com</div></div>
  <div style="text-align:right;font-size:9px;color:#888;line-height:2"><div><b>Tháng:</b> ${m}/${y}</div></div>
</div>
<div class="title">Phiếu Tính Lương</div>
<div class="sub">Tháng ${m} năm ${y} — Xưởng Nội Thất</div>
<div class="info">
  <div class="row"><span class="lbl">Họ và tên</span><span class="val">${row.worker.name}</span></div>
  <div class="row"><span class="lbl">Loại thợ</span><span class="val">${row.worker.workerType}</span></div>
  <div class="row"><span class="lbl">Chuyên môn</span><span class="val">${row.worker.skill || '—'}</span></div>
  <div class="row"><span class="lbl">Lương ngày</span><span class="val">${new Intl.NumberFormat('vi-VN').format(row.worker.hourlyRate)} đ</span></div>
</div>
<table class="table">
<thead><tr><th>Khoản mục</th><th>Số ngày / Giờ</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead>
<tbody>
<tr><td>Lương cơ bản (${row.totalDays.toFixed(1)} ngày)</td><td>${row.totalDays.toFixed(1)} ngày</td><td>${new Intl.NumberFormat('vi-VN').format(row.worker.hourlyRate)}/ngày</td><td><b>${new Intl.NumberFormat('vi-VN').format(Math.round(row.baseSalary))} đ</b></td></tr>
${row.ot.length > 0 ? row.ot.map(o => `<tr><td>Tăng ca — ${new Date(o.date).toLocaleDateString('vi-VN')} (×${o.rateMultiplier})</td><td>${o.hours}h</td><td>${new Intl.NumberFormat('vi-VN').format(Math.round(o.totalPay / o.hours))}/h</td><td>${new Intl.NumberFormat('vi-VN').format(Math.round(o.totalPay))} đ</td></tr>`).join('') : ''}
<tr class="total-row"><td colspan="3" style="text-align:right">TỔNG CỘNG</td><td style="color:#d35400;font-size:15px">${new Intl.NumberFormat('vi-VN').format(Math.round(row.total))} đ</td></tr>
</tbody>
</table>
<div class="amount-box">
  <div style="font-size:10px;color:#d35400;text-transform:uppercase;letter-spacing:3px;margin-bottom:6px;font-weight:700">Tổng lương tháng ${m}/${y}</div>
  <div style="font-size:26px;font-weight:900;color:#1C3A6B">${new Intl.NumberFormat('vi-VN').format(Math.round(row.total))} <span style="font-size:18px">đ</span></div>
</div>
<div class="signs">
  <div class="sign"><div class="role">Quản lý xưởng</div><div class="hint">(Ký, ghi rõ họ tên)</div></div>
  <div class="sign"><div class="role">Người nhận lương</div><div class="hint">(Ký, ghi rõ họ tên)</div></div>
</div>
<div class="footer">Kiến Trúc Đô Thị SCT · Xưởng Nội Thất · kientrucsct.com · 0914 998 822</div>
</div></body></html>`);
        w.document.close();
    };

    const printPayrollSheet = () => {
        const [y, m] = payrollMonth.split('-');
        const activeRows = payrollRows.filter(r => r.totalDays > 0 || r.otPay > 0);
        const w = window.open('', '_blank', 'width=1100,height=900');
        w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Bảng lương tháng ${m}/${y}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:12px}
.page{max-width:1040px;margin:0 auto;padding:20px 24px}
.header{border-bottom:3px solid #d35400;padding-bottom:10px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center}
.co-name{font-size:13px;font-weight:900;color:#1C3A6B;text-transform:uppercase}
.title{text-align:center;margin:12px 0;font-size:18px;font-weight:900;text-transform:uppercase;letter-spacing:3px;color:#1C3A6B}
table{width:100%;border-collapse:collapse;margin-bottom:14px}
th{background:#1C3A6B;color:#fff;padding:8px 10px;font-size:11px;border:1px solid #1C3A6B}
td{padding:7px 10px;font-size:11px;border:1px solid #e5e7eb;text-align:right}
td:first-child,td:nth-child(2){text-align:left}
tr:nth-child(even){background:#f9fafb}
.total{background:#fff7ed;font-weight:900;border-top:2px solid #d35400}
.signs{display:flex;justify-content:space-around;margin-top:32px}
.sign{text-align:center;width:30%}.sign .role{font-weight:700;font-size:11px;margin-bottom:44px}
.sign .hint{font-size:9px;font-style:italic;color:#999;border-top:1px solid #ddd;padding-top:4px}
.no-print{position:fixed;top:12px;right:12px}.no-print button{padding:8px 20px;background:#d35400;color:#fff;border:none;border-radius:6px;font-weight:700;cursor:pointer}
@media print{.no-print{display:none!important}}
</style></head><body>
<div class="no-print"><button onclick="window.print()">🖨️ In bảng lương</button></div>
<div class="page">
<div class="header"><div class="co-name">Kiến Trúc Đô Thị SCT — Xưởng Nội Thất</div><div style="font-size:9px;color:#888">Ngày in: ${new Date().toLocaleDateString('vi-VN')}</div></div>
<div class="title">Bảng Lương Tháng ${m}/${y}</div>
<table>
<thead><tr><th>STT</th><th>Họ tên</th><th>Loại</th><th>Số ngày</th><th>Lương cơ bản</th><th>Tăng ca</th><th>Tổng lương</th><th>Ký nhận</th></tr></thead>
<tbody>
${activeRows.map((r, i) => `<tr><td style="text-align:center">${i + 1}</td><td>${r.worker.name}</td><td>${r.worker.workerType}</td><td style="text-align:center">${r.totalDays.toFixed(1)}</td><td>${new Intl.NumberFormat('vi-VN').format(Math.round(r.baseSalary))}</td><td>${r.otPay > 0 ? new Intl.NumberFormat('vi-VN').format(Math.round(r.otPay)) : '—'}</td><td style="font-weight:700;color:#d35400">${new Intl.NumberFormat('vi-VN').format(Math.round(r.total))}</td><td></td></tr>`).join('')}
<tr class="total"><td colspan="4" style="text-align:right">Tổng cộng</td><td>${new Intl.NumberFormat('vi-VN').format(Math.round(payrollTotalBase))}</td><td>${new Intl.NumberFormat('vi-VN').format(Math.round(payrollTotalOT))}</td><td style="color:#d35400;font-size:13px">${new Intl.NumberFormat('vi-VN').format(Math.round(payrollGrandTotal))}</td><td></td></tr>
</tbody>
</table>
<div class="signs">
  <div class="sign"><div class="role">Người lập bảng</div><div class="hint">(Ký, ghi rõ họ tên)</div></div>
  <div class="sign"><div class="role">Kế toán</div><div class="hint">(Ký, ghi rõ họ tên)</div></div>
  <div class="sign"><div class="role">Giám đốc</div><div class="hint">(Ký, ghi rõ họ tên)</div></div>
</div>
</div></body></html>`);
        w.document.close();
    };

    /* ══════════════════════════════
       Print expense voucher
    ══════════════════════════════ */
    const printVoucher = (e) => {
        const today = new Date().toLocaleDateString('vi-VN');
        const amountText = new Intl.NumberFormat('vi-VN').format(e.amount);
        const w = window.open('', '_blank', 'width=860,height=800');
        w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Phiếu chi - ${e.code}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:13px;color:#1a1a1a;background:#f5f5f5;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{max-width:800px;margin:20px auto;background:#fff;box-shadow:0 4px 24px rgba(0,0,0,.12)}.top-bar{height:8px;background:#F47920}
.header{display:flex;align-items:center;justify-content:space-between;padding:20px 36px 16px;border-bottom:1px solid #f0ebe5}
.co-name{font-size:15px;font-weight:900;color:#1a1a1a;text-transform:uppercase;letter-spacing:.8px;line-height:1.2}
.co-tagline{font-size:9px;color:#F47920;font-style:italic;margin-top:2px}.co-info{font-size:8.5px;color:#666;margin-top:6px;line-height:1.8}
.title-banner{background:#F47920;padding:18px 36px;display:flex;align-items:center;justify-content:space-between}
.title-banner h1{font-size:26px;font-weight:900;color:#fff;text-transform:uppercase;letter-spacing:6px}
.code-badge{background:rgba(255,255,255,.2);border:1.5px solid rgba(255,255,255,.6);border-radius:24px;padding:6px 20px;color:#fff;font-weight:900;font-size:14px;letter-spacing:2px}
.body{padding:28px 36px}.info-grid{display:grid;grid-template-columns:180px 1fr;gap:0;margin-bottom:20px;border:1px solid #f0ebe5;border-radius:8px;overflow:hidden}
.info-row{display:contents}.info-row .lbl{background:#fdf6f0;padding:10px 14px;font-size:11.5px;color:#888;border-bottom:1px solid #f0ebe5;font-style:italic}
.info-row .val{background:#fff;padding:10px 14px;font-size:12px;font-weight:700;color:#1a1a1a;border-bottom:1px solid #f0ebe5}
.amount-wrap{margin:0 0 20px;border-radius:10px;overflow:hidden;border:2px solid #F47920}
.amount-head{background:#F47920;padding:8px 20px;font-size:9px;text-transform:uppercase;letter-spacing:3px;color:#fff;font-weight:800;text-align:center}
.amount-body{padding:18px 20px;text-align:center;background:linear-gradient(135deg,#fff9f5,#fff)}
.amount-val{font-size:34px;font-weight:900;color:#1a1a1a;letter-spacing:1px}.amount-val em{color:#F47920;font-style:normal;font-size:26px}
.sign-section{display:flex;justify-content:space-between;margin:8px 0 24px;gap:12px}
.sign-col{flex:1;text-align:center;border:1px solid #f0ebe5;border-radius:8px;padding:14px 10px}
.sign-col .role{font-weight:900;font-size:10.5px;color:#1a1a1a;text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px}
.sign-col .role-sub{font-size:8.5px;color:#aaa;margin-bottom:52px}.sign-col .sign-line{border-top:1px solid #ddd;padding-top:6px;font-size:8.5px;font-style:italic;color:#bbb}
.bottom-bar{background:#F47920;padding:10px 36px;display:flex;justify-content:space-between;align-items:center}
.bottom-brand{font-size:9.5px;font-weight:900;color:#fff;text-transform:uppercase}.bottom-tagline{font-size:8.5px;color:rgba(255,255,255,.8);font-style:italic}
.no-print{position:fixed;top:16px;right:16px;z-index:9999}.no-print button{padding:10px 22px;font-size:13px;cursor:pointer;background:#F47920;color:#fff;border:none;border-radius:6px;font-weight:700}
@media print{.no-print{display:none!important}body{background:#fff}.page{box-shadow:none;margin:0}}
</style></head><body>
<div class="no-print"><button onclick="window.print()">🖨️ In phiếu chi</button></div>
<div class="page"><div class="top-bar"></div>
<div class="header"><div><div class="co-name">Kiến Trúc Đô Thị SCT — Xưởng Nội Thất</div><div class="co-tagline">Cùng bạn xây dựng ước mơ</div><div class="co-info">📍 149 Nguyễn Tất Thành, Tp. Yên Bái &nbsp;|&nbsp; 📞 0914 998 822</div></div>
<div style="text-align:right;font-size:9px;color:#888;line-height:2"><div><strong>Ngày:</strong> ${today}</div><div><strong>Hạng mục:</strong> ${e.category || '—'}</div></div></div>
<div class="title-banner"><div><h1>Phiếu Chi Tiền</h1><div style="font-size:10px;color:rgba(255,255,255,.75);letter-spacing:3px;text-transform:uppercase;margin-top:4px">Xưởng Nội Thất</div></div><div class="code-badge">Số: ${e.code}</div></div>
<div class="body">
<div class="info-grid">
  <div class="info-row"><div class="lbl">Người nhận tiền</div><div class="val">${e.recipientName || e.submittedBy || '...'}</div></div>
  ${e.project ? `<div class="info-row"><div class="lbl">Dự án</div><div class="val">${e.project.code} — ${e.project.name}</div></div>` : ''}
  <div class="info-row"><div class="lbl">Nội dung chi</div><div class="val">${e.description}</div></div>
  ${e.notes ? `<div class="info-row"><div class="lbl">Ghi chú</div><div class="val">${e.notes}</div></div>` : ''}
</div>
<div class="amount-wrap"><div class="amount-head">Số tiền chi</div><div class="amount-body"><div class="amount-val">${amountText} <em>đ</em></div></div></div>
${e.proofUrl ? `<div style="text-align:center;margin-bottom:20px"><img src="${e.proofUrl}" style="max-width:220px;max-height:140px;border:1px solid #eee;border-radius:6px"/></div>` : ''}
<div class="sign-section">
  <div class="sign-col"><div class="role">Người lập phiếu</div><div class="role-sub">Ngày ${today}</div><div class="sign-line">(Ký, ghi rõ họ tên)</div></div>
  <div class="sign-col"><div class="role">Quản lý xưởng</div><div class="role-sub">Ngày &nbsp;&nbsp; tháng &nbsp;&nbsp; năm 2026</div><div class="sign-line">(Ký, ghi rõ họ tên)</div></div>
  <div class="sign-col"><div class="role">Người nhận tiền</div><div class="role-sub">Ngày ${today}</div><div class="sign-line">(Ký, ghi rõ họ tên)</div></div>
</div></div>
<div class="bottom-bar"><div><div class="bottom-brand">Kiến Trúc Đô Thị SCT</div><div class="bottom-tagline">Xưởng Nội Thất</div></div><div style="font-size:8.5px;color:rgba(255,255,255,.8)">Mã: ${e.code} | ${today}</div></div>
</div></body></html>`);
        w.document.close();
    };

    /* ══════════════════════════════
       RENDER
    ══════════════════════════════ */
    return (
        <div>
            {/* Breadcrumb */}
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>Xưởng Nội Thất</span>
                <span style={{ color: 'var(--border)' }}>›</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Tài chính Xưởng</span>
            </div>
            <h2 style={{ margin: '0 0 20px', fontSize: 22, fontWeight: 700 }}>Tài chính Xưởng Nội Thất</h2>

            {/* ── Dashboard tổng quan ── */}
            {(() => {
                const totalIncome = payReceived + standaloneIncomes.filter(i => ['Đã duyệt', 'Đã chi'].includes(i.status)).reduce((s, i) => s + (i.amount || 0), 0);
                const totalChi = expPaid + payrollGrandTotal;
                const canDoi = totalIncome - totalChi;
                const monthLabel = new Date(payrollMonth + '-01').toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
                return (
                    <div className="card" style={{ marginBottom: 16, padding: '16px 20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Tổng quan tài chính xưởng</span>
                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Lương: {monthLabel}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                            {/* Thu tiền */}
                            <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '14px 16px', borderLeft: '4px solid #16a34a' }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: '#15803d', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>💰 Thu tiền</div>
                                <div style={{ fontSize: 18, fontWeight: 800, color: '#15803d', marginBottom: 6 }}>{fmt(payReceived)}</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                    <div style={{ fontSize: 11, color: '#374151' }}>Phải thu: <strong>{fmt(payTotal)}</strong></div>
                                    <div style={{ fontSize: 11, color: '#dc2626' }}>Còn lại: <strong>{fmt(payRemain)}</strong></div>
                                </div>
                            </div>
                            {/* Chi phí */}
                            <div style={{ background: '#fff7ed', borderRadius: 10, padding: '14px 16px', borderLeft: '4px solid #ea580c' }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: '#c2410c', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>📉 Chi phí</div>
                                <div style={{ fontSize: 18, fontWeight: 800, color: '#c2410c', marginBottom: 6 }}>{fmt(expPaid)}</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                    <div style={{ fontSize: 11, color: '#374151' }}>Tổng giá trị: <strong>{fmt(expValue)}</strong></div>
                                    <div style={{ fontSize: 11, color: '#92400e' }}>Chờ duyệt: <strong>{expPendingCount} lệnh</strong></div>
                                </div>
                            </div>
                            {/* Lương */}
                            <div style={{ background: '#eff6ff', borderRadius: 10, padding: '14px 16px', borderLeft: '4px solid #2563eb' }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: '#1d4ed8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>👷 Lương tháng</div>
                                <div style={{ fontSize: 18, fontWeight: 800, color: '#1d4ed8', marginBottom: 6 }}>{fmt(payrollGrandTotal)}</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                    <div style={{ fontSize: 11, color: '#374151' }}>Cơ bản: <strong>{fmt(payrollTotalBase)}</strong></div>
                                    <div style={{ fontSize: 11, color: '#92400e' }}>Tăng ca: <strong>{fmt(payrollTotalOT)}</strong></div>
                                </div>
                            </div>
                            {/* Cân đối */}
                            <div style={{ background: canDoi >= 0 ? '#f0fdf4' : '#fef2f2', borderRadius: 10, padding: '14px 16px', borderLeft: `4px solid ${canDoi >= 0 ? '#16a34a' : '#dc2626'}` }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: canDoi >= 0 ? '#15803d' : '#b91c1c', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>💵 Cân đối</div>
                                <div style={{ fontSize: 18, fontWeight: 800, color: canDoi >= 0 ? '#15803d' : '#b91c1c', marginBottom: 6 }}>{canDoi >= 0 ? '+' : ''}{fmt(canDoi)}</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                    <div style={{ fontSize: 11, color: '#374151' }}>Đã thu: <strong>{fmt(totalIncome)}</strong></div>
                                    <div style={{ fontSize: 11, color: '#374151' }}>Đã chi + lương: <strong>{fmt(totalChi)}</strong></div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* ── Main tabs ── */}
            <div className="card" style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 4px' }}>
                    {[
                        { key: 'thu_tien', label: '📈 Thu tiền' },
                        { key: 'chi_phi',  label: '📉 Chi phí' },
                        { key: 'luong',    label: '👷 Lương & Tăng ca' },
                    ].map(t => (
                        <button key={t.key} onClick={() => setMainTab(t.key)} style={{
                            padding: '14px 22px', border: 'none', background: 'none', cursor: 'pointer',
                            fontSize: 14, fontWeight: mainTab === t.key ? 700 : 400,
                            color: mainTab === t.key ? 'var(--accent-primary)' : 'var(--text-muted)',
                            borderBottom: mainTab === t.key ? '2px solid var(--accent-primary)' : '2px solid transparent',
                            marginBottom: -1,
                        }}>{t.label}</button>
                    ))}
                </div>

                {/* ════════════════════
                    TAB: THU TIỀN
                ════════════════════ */}
                {mainTab === 'thu_tien' && (
                    <div style={{ padding: 20 }}>
                        {/* KPI */}
                        <div className="stats-grid" style={{ marginBottom: 20 }}>
                            <div className="stat-card">
                                <div className="stat-icon">💰</div>
                                <div><div className="stat-value" style={{ fontSize: 16 }}>{fmt(payTotal)}</div><div className="stat-label">Tổng phải thu</div></div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon">✅</div>
                                <div><div className="stat-value" style={{ color: 'var(--status-success)', fontSize: 16 }}>{fmt(payReceived)}</div><div className="stat-label">Đã thu</div></div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon">⏳</div>
                                <div><div className="stat-value" style={{ color: 'var(--status-danger)', fontSize: 16 }}>{fmt(payRemain)}</div><div className="stat-label">Còn phải thu</div></div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon">🔔</div>
                                <div><div className="stat-value" style={{ color: 'var(--status-warning)' }}>{payPending}</div><div className="stat-label">Đợt chưa thu đủ</div></div>
                            </div>
                        </div>

                        {/* Filter */}
                        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                            <select className="form-select" value={filterPayStatus} onChange={e => setFilterPayStatus(e.target.value)} style={{ minWidth: 150 }}>
                                <option value="">Tất cả trạng thái</option>
                                <option>Chưa thu</option>
                                <option>Thu một phần</option>
                                <option>Đã thu</option>
                            </select>
                            <select className="form-select" value={filterPayProject} onChange={e => setFilterPayProject(e.target.value)} style={{ flex: 1, minWidth: 160 }}>
                                <option value="">Tất cả dự án</option>
                                {payProjects.map(p => <option key={p}>{p}</option>)}
                            </select>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', alignSelf: 'center', whiteSpace: 'nowrap' }}>
                                {filteredPay.length} đợt — {fmt(filteredPay.reduce((s, p) => s + ((p.amount || 0) - (p.paidAmount || 0)), 0))} còn lại
                            </div>
                            <button className="btn btn-primary" onClick={openCreatePay} style={{ whiteSpace: 'nowrap', fontWeight: 600, marginLeft: 'auto' }}>
                                + Tạo lệnh thu
                            </button>
                        </div>

                        {/* Table */}
                        {loadingPay ? (
                            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
                        ) : filteredPay.length === 0 ? (
                            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Không có dữ liệu</div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table className="data-table" style={{ margin: 0 }}>
                                    <thead>
                                        <tr>
                                            <th>Hợp đồng</th>
                                            <th>Khách hàng</th>
                                            <th>Dự án</th>
                                            <th>Đợt</th>
                                            <th>Giá trị</th>
                                            <th>Đã thu</th>
                                            <th>Còn lại</th>
                                            <th>Hạn</th>
                                            <th>Trạng thái</th>
                                            <th>Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredPay.map(p => {
                                            const remaining = (p.amount || 0) - (p.paidAmount || 0);
                                            const isDone = p.status === 'Đã thu';
                                            const st = THU_STATUS_STYLE[p.status] || { bg: '#f3f4f6', color: '#374151' };
                                            const rate = pct(p.paidAmount || 0, p.amount || 0);
                                            return (
                                                <tr key={p.id} style={{ opacity: isDone ? 0.65 : 1 }}>
                                                    <td>
                                                        <a href={`/contracts/${p.contractId}`} style={{ fontWeight: 700, color: 'var(--accent-primary)', fontSize: 13 }}>
                                                            {p.contract?.code}
                                                        </a>
                                                    </td>
                                                    <td style={{ fontSize: 12 }}>{p.contract?.customer?.name || '—'}</td>
                                                    <td style={{ fontSize: 12 }}>{p.contract?.project?.name || '—'}</td>
                                                    <td style={{ fontSize: 12, fontWeight: 500 }}>{p.phase}</td>
                                                    <td style={{ fontWeight: 600, fontSize: 13 }}>{fmt(p.amount)}</td>
                                                    <td>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                            <div style={{ width: 40, height: 6, background: 'var(--bg-secondary)', borderRadius: 3, overflow: 'hidden' }}>
                                                                <div style={{ height: '100%', width: `${rate}%`, background: isDone ? '#10b981' : '#f59e0b', borderRadius: 3 }} />
                                                            </div>
                                                            <span style={{ fontSize: 12, color: isDone ? 'var(--status-success)' : 'inherit' }}>{fmt(p.paidAmount || 0)}</span>
                                                        </div>
                                                    </td>
                                                    <td style={{ fontSize: 13, fontWeight: remaining > 0 ? 600 : 400, color: remaining > 0 ? 'var(--status-danger)' : 'var(--text-muted)' }}>
                                                        {remaining > 0 ? fmt(remaining) : '—'}
                                                    </td>
                                                    <td style={{ fontSize: 12 }}>{fmtDate(p.dueDate)}</td>
                                                    <td>
                                                        <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 12, background: st.bg, color: st.color }}>
                                                            {p.status}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                                            {!isDone && (
                                                                <button className="btn btn-sm btn-primary" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => openCollect(p)}>
                                                                    💵 Thu tiền
                                                                </button>
                                                            )}
                                                            {(p.paidAmount || 0) > 0 && (
                                                                <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => printReceipt(p)} title="In phiếu thu">
                                                                    🧾
                                                                </button>
                                                            )}
                                                            {p.proofUrl && (
                                                                <a href={p.proofUrl} target="_blank" rel="noreferrer" title="Xem chứng từ" style={{ fontSize: 14 }}>📎</a>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* ── Lệnh thu thủ công ── */}
                        {standaloneIncomes.length > 0 && (
                            <div style={{ marginTop: 24 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                                    <span style={{ fontSize: 13, fontWeight: 700 }}>📋 Lệnh thu thủ công</span>
                                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>({standaloneIncomes.length} lệnh — {fmt(standaloneIncomes.reduce((s, i) => s + (i.amount || 0), 0))})</span>
                                </div>
                                <div style={{ overflowX: 'auto' }}>
                                    <table className="data-table" style={{ margin: 0 }}>
                                        <thead>
                                            <tr><th>Mã</th><th>Nội dung</th><th>Hạng mục</th><th>Số tiền</th><th>Ngày</th><th>Trạng thái</th><th>Thao tác</th></tr>
                                        </thead>
                                        <tbody>
                                            {standaloneIncomes.map(inc => {
                                                const st = { 'Chờ duyệt': { bg: '#fef3c7', color: '#92400e' }, 'Đã duyệt': { bg: '#dbeafe', color: '#1e40af' }, 'Đã chi': { bg: '#dcfce7', color: '#166534' } }[inc.status] || { bg: '#f3f4f6', color: '#374151' };
                                                return (
                                                    <tr key={inc.id}>
                                                        <td><span style={{ fontWeight: 700, color: 'var(--accent-primary)', fontSize: 13 }}>{inc.code}</span></td>
                                                        <td>
                                                            <div style={{ fontWeight: 500, fontSize: 13 }}>{inc.description}</div>
                                                            {inc.notes && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{inc.notes}</div>}
                                                        </td>
                                                        <td><span className="badge badge-default" style={{ fontSize: 11 }}>{inc.category}</span></td>
                                                        <td style={{ fontWeight: 700, fontSize: 13 }}>{fmt(inc.amount)}</td>
                                                        <td style={{ fontSize: 12 }}>{fmtDate(inc.date)}</td>
                                                        <td><span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 12, background: st.bg, color: st.color }}>{inc.status}</span></td>
                                                        <td>
                                                            <div style={{ display: 'flex', gap: 4 }}>
                                                                {inc.status === 'Chờ duyệt' && (
                                                                    <button className="btn btn-sm" style={{ background: '#16a34a', color: '#fff', fontSize: 11, padding: '4px 8px' }}
                                                                        onClick={() => fetch('/api/project-expenses', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: inc.id, status: 'Đã duyệt' }) }).then(fetchPayments)}>
                                                                        ✓ Duyệt
                                                                    </button>
                                                                )}
                                                                {inc.status === 'Đã duyệt' && (
                                                                    <button className="btn btn-sm btn-primary" style={{ fontSize: 11, padding: '4px 8px' }}
                                                                        onClick={() => fetch('/api/project-expenses', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: inc.id, status: 'Đã chi' }) }).then(fetchPayments)}>
                                                                        ✅ Đã thu
                                                                    </button>
                                                                )}
                                                                <button className="btn btn-ghost btn-sm" style={{ fontSize: 12, color: 'var(--status-danger)' }}
                                                                    onClick={() => { if (confirm('Xóa lệnh thu này?')) fetch(`/api/project-expenses?id=${inc.id}`, { method: 'DELETE' }).then(fetchPayments); }}>
                                                                    🗑️
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ════════════════════
                    TAB: LƯƠNG & TĂNG CA
                ════════════════════ */}
                {mainTab === 'luong' && (
                    <div style={{ padding: 20 }}>
                        {/* Controls */}
                        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <label style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>Tháng:</label>
                                <input type="month" className="form-input" value={payrollMonth} onChange={e => setPayrollMonth(e.target.value)} style={{ width: 150 }} />
                            </div>
                            <input className="form-input" placeholder="Tìm tên thợ..." value={payrollFilter} onChange={e => setPayrollFilter(e.target.value)} style={{ flex: 1, minWidth: 160 }} />
                            <button className="btn btn-ghost" onClick={printPayrollSheet} style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                                🖨️ In bảng lương
                            </button>
                        </div>

                        {/* KPI */}
                        <div className="stats-grid" style={{ marginBottom: 20 }}>
                            <div className="stat-card">
                                <div className="stat-icon">👷</div>
                                <div><div className="stat-value">{payrollRows.filter(r => r.totalDays > 0 || r.otPay > 0).length}</div><div className="stat-label">Thợ có công tháng này</div></div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon">📅</div>
                                <div><div className="stat-value">{payrollRows.reduce((s, r) => s + r.totalDays, 0).toFixed(1)}</div><div className="stat-label">Tổng ngày công</div></div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon">💵</div>
                                <div><div className="stat-value" style={{ fontSize: 15 }}>{fmt(payrollTotalBase)}</div><div className="stat-label">Lương cơ bản</div></div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon">⏰</div>
                                <div><div className="stat-value" style={{ fontSize: 15, color: 'var(--status-warning)' }}>{fmt(payrollTotalOT)}</div><div className="stat-label">Tăng ca</div></div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon">💰</div>
                                <div><div className="stat-value" style={{ fontSize: 15, color: 'var(--status-danger)' }}>{fmt(payrollGrandTotal)}</div><div className="stat-label">Tổng chi lương</div></div>
                            </div>
                        </div>

                        {loadingPayroll ? (
                            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table className="data-table" style={{ margin: 0 }}>
                                    <thead>
                                        <tr>
                                            <th>Thợ</th>
                                            <th>Loại</th>
                                            <th>Lương ngày</th>
                                            <th>Ngày công</th>
                                            <th>Lương cơ bản</th>
                                            <th>Tăng ca</th>
                                            <th>Tổng lương</th>
                                            <th>Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {payrollRows.map(row => {
                                            const isEmpty = row.totalDays === 0 && row.otPay === 0;
                                            const isExpanded = expandedWorker === row.worker.id;
                                            return [
                                                <tr key={row.worker.id} style={{ opacity: isEmpty ? 0.4 : 1, background: isExpanded ? 'var(--bg-secondary)' : '' }}>
                                                    <td>
                                                        <div style={{ fontWeight: 600, fontSize: 13 }}>{row.worker.name}</div>
                                                        {row.worker.skill && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{row.worker.skill}</div>}
                                                    </td>
                                                    <td>
                                                        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: row.worker.workerType === 'Thợ chính' ? '#dbeafe' : '#ede9fe', color: row.worker.workerType === 'Thợ chính' ? '#1e40af' : '#6d28d9' }}>
                                                            {row.worker.workerType}
                                                        </span>
                                                    </td>
                                                    <td style={{ fontSize: 12 }}>{fmt(row.worker.hourlyRate)}/ngày</td>
                                                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{row.totalDays.toFixed(1)}</td>
                                                    <td style={{ fontWeight: 600 }}>{row.baseSalary > 0 ? fmt(row.baseSalary) : '—'}</td>
                                                    <td style={{ color: row.otPay > 0 ? 'var(--status-warning)' : 'var(--text-muted)', fontWeight: row.otPay > 0 ? 700 : 400 }}>
                                                        {row.otPay > 0 ? fmt(row.otPay) : '—'}
                                                        {row.ot.length > 0 && <span style={{ marginLeft: 4, fontSize: 10, background: '#fef3c7', color: '#92400e', padding: '1px 5px', borderRadius: 4 }}>{row.ot.length} ca</span>}
                                                    </td>
                                                    <td style={{ fontWeight: 700, fontSize: 14, color: row.total > 0 ? 'var(--status-danger)' : 'var(--text-muted)' }}>
                                                        {row.total > 0 ? fmt(row.total) : '—'}
                                                    </td>
                                                    <td>
                                                        <div style={{ display: 'flex', gap: 4 }}>
                                                            {(row.att.length > 0 || row.ot.length > 0) && (
                                                                <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }}
                                                                    onClick={() => setExpandedWorker(isExpanded ? null : row.worker.id)}>
                                                                    {isExpanded ? '▲ Thu' : '▼ Chi tiết'}
                                                                </button>
                                                            )}
                                                            {row.total > 0 && (
                                                                <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => printPayslip(row)} title="In phiếu lương">
                                                                    🧾
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>,
                                                isExpanded && (
                                                    <tr key={`${row.worker.id}-detail`}>
                                                        <td colSpan={8} style={{ background: 'var(--bg-secondary)', padding: '12px 16px' }}>
                                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                                                {/* Chấm công */}
                                                                <div>
                                                                    <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 8, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                                                        Chấm công ({row.att.length} ngày)
                                                                    </div>
                                                                    {row.att.length === 0 ? (
                                                                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Chưa có dữ liệu</div>
                                                                    ) : (
                                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                                                            {row.att.map(a => (
                                                                                <span key={a.id} style={{ fontSize: 11, background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: 4 }}>
                                                                                    {new Date(a.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                                                                                    {a.hoursWorked !== 8 && ` (${a.hoursWorked}h)`}
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                {/* Tăng ca */}
                                                                <div>
                                                                    <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 8, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                                                        Tăng ca ({row.ot.length} lần — {fmt(row.otPay)})
                                                                    </div>
                                                                    {row.ot.length === 0 ? (
                                                                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Không có tăng ca</div>
                                                                    ) : (
                                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                                            {row.ot.map(o => (
                                                                                <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, background: '#fef3c7', padding: '3px 8px', borderRadius: 4 }}>
                                                                                    <span>{new Date(o.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })} — {o.hours}h ×{o.rateMultiplier}</span>
                                                                                    <span style={{ fontWeight: 700 }}>{fmt(o.totalPay)}</span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ),
                                            ];
                                        })}
                                    </tbody>
                                    <tfoot>
                                        <tr style={{ background: 'var(--bg-secondary)', fontWeight: 700 }}>
                                            <td colSpan={3} style={{ textAlign: 'right', fontSize: 12 }}>Tổng cộng:</td>
                                            <td style={{ textAlign: 'center' }}>{payrollRows.reduce((s, r) => s + r.totalDays, 0).toFixed(1)}</td>
                                            <td style={{ fontWeight: 700 }}>{fmt(payrollTotalBase)}</td>
                                            <td style={{ fontWeight: 700, color: 'var(--status-warning)' }}>{fmt(payrollTotalOT)}</td>
                                            <td style={{ fontWeight: 700, color: 'var(--status-danger)', fontSize: 15 }}>{fmt(payrollGrandTotal)}</td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* ════════════════════
                    TAB: CHI PHÍ
                ════════════════════ */}
                {mainTab === 'chi_phi' && (
                    <div style={{ padding: 20 }}>
                        {/* KPI */}
                        <div className="stats-grid" style={{ marginBottom: 20 }}>
                            <div className="stat-card"><div className="stat-icon">📑</div><div><div className="stat-value">{expTotal}</div><div className="stat-label">Tổng lệnh chi</div></div></div>
                            <div className="stat-card"><div className="stat-icon">💰</div><div><div className="stat-value" style={{ fontSize: 16 }}>{fmt(expValue)}</div><div className="stat-label">Tổng giá trị</div></div></div>
                            <div className="stat-card"><div className="stat-icon">✅</div><div><div className="stat-value" style={{ color: 'var(--status-success)', fontSize: 16 }}>{fmt(expPaid)}</div><div className="stat-label">Đã chi</div></div></div>
                            <div className="stat-card"><div className="stat-icon">⏳</div><div><div className="stat-value" style={{ color: 'var(--status-warning)' }}>{expPendingCount}</div><div className="stat-label">Chờ duyệt</div></div></div>
                            <div className="stat-card"><div className="stat-icon">🔔</div><div><div className="stat-value" style={{ color: 'var(--status-info)' }}>{expApprovedCount}</div><div className="stat-label">Đã duyệt (chờ chi)</div></div></div>
                        </div>

                        {/* Quy trình */}
                        <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 500 }}>Quy trình xử lý lệnh chi</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                {[
                                    { label: 'Tạo lệnh chi', color: '#f59e0b' }, null,
                                    { label: 'Duyệt lệnh', color: '#3b82f6' }, null,
                                    { label: 'KT upload chứng từ & chi', color: '#8b5cf6', bold: true }, null,
                                    { label: 'Hoàn thành', color: '#10b981' },
                                ].map((s, i) => s === null
                                    ? <span key={i} style={{ color: 'var(--text-muted)', fontSize: 14 }}>→</span>
                                    : <span key={i} style={{ background: s.color + '22', color: s.color, border: `1.5px solid ${s.color}55`, borderRadius: 20, padding: '3px 12px', fontSize: 11, fontWeight: s.bold ? 700 : 500 }}>{s.label}</span>
                                )}
                            </div>
                        </div>

                        {/* Filter + Create */}
                        <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                            <input className="form-input" placeholder="Tìm kiếm mã, mô tả..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 180 }} />
                            <select className="form-select" value={expTab} onChange={e => setExpTab(e.target.value)}>
                                {EXP_TABS.map(t => {
                                    const cnt = t.key ? expenses.filter(x => x.status === t.key).length : expenses.length;
                                    return <option key={t.key} value={t.key}>{t.label}{cnt > 0 ? ` (${cnt})` : ''}</option>;
                                })}
                            </select>
                            <select className="form-select" value={filterProject} onChange={e => setFilterProject(e.target.value)}>
                                <option value="">Tất cả DA</option>
                                {expProjects.map(p => <option key={p}>{p}</option>)}
                            </select>
                            <button className="btn btn-primary" onClick={openCreate} style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>+ Tạo lệnh chi</button>
                        </div>

                        {/* Table */}
                        {loadingExp ? (
                            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
                        ) : filteredExp.length === 0 ? (
                            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Không có dữ liệu</div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table className="data-table" style={{ margin: 0 }}>
                                    <thead>
                                        <tr><th>Mã</th><th>Mô tả</th><th>Dự án / Người nhận</th><th>Hạng mục</th><th>Số tiền</th><th>Ngày</th><th>Trạng thái</th><th style={{ minWidth: 180 }}>Thao tác</th></tr>
                                    </thead>
                                    <tbody>
                                        {filteredExp.map(e => {
                                            const st = EXP_STATUS_STYLE[e.status] || { bg: '#f3f4f6', color: '#374151' };
                                            return (
                                                <tr key={e.id} style={{ opacity: e.status === 'Hoàn thành' ? 0.65 : 1 }}>
                                                    <td><span style={{ fontWeight: 700, color: 'var(--accent-primary)', fontSize: 13 }}>{e.code}</span></td>
                                                    <td>
                                                        <div style={{ fontWeight: 500, fontSize: 13 }}>{e.description}</div>
                                                        {e.submittedBy && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Đề nghị: {e.submittedBy}</div>}
                                                    </td>
                                                    <td>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                                            {e.project && <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}><span className="badge badge-info" style={{ fontSize: 10 }}>{e.project.code}</span><span style={{ fontSize: 12 }}>{e.project.name}</span></span>}
                                                            {(e.recipientType || e.recipientName) && (
                                                                <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                                                                    {e.recipientType && <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: e.recipientType === 'NCC' ? '#dcfce7' : '#dbeafe', color: e.recipientType === 'NCC' ? '#166534' : '#1e40af' }}>{e.recipientType}</span>}
                                                                    {e.recipientName && <span style={{ fontSize: 12 }}>{e.recipientName}</span>}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td><span className="badge badge-default" style={{ fontSize: 11 }}>{e.category}</span></td>
                                                    <td style={{ fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>
                                                        {fmt(e.amount)}
                                                        {e.proofUrl && <span style={{ marginLeft: 4, fontSize: 10, background: '#dcfce7', color: '#166534', padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>TM</span>}
                                                    </td>
                                                    <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{fmtDate(e.date)}</td>
                                                    <td><span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 12, background: st.bg, color: st.color }}>{e.status}</span></td>
                                                    <td>
                                                        <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                                                            {e.status === 'Chờ duyệt' && (<>
                                                                <button className="btn btn-sm" style={{ background: '#16a34a', color: '#fff', fontSize: 11, padding: '4px 8px' }} onClick={() => updateStatus(e.id, 'Đã duyệt')}>✓ Duyệt</button>
                                                                <button className="btn btn-sm" style={{ background: '#ef4444', color: '#fff', fontSize: 11, padding: '4px 8px' }} onClick={() => updateStatus(e.id, 'Từ chối')}>✗</button>
                                                            </>)}
                                                            {e.status === 'Đã duyệt' && <button className="btn btn-sm btn-primary" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => openProofModal(e)}>💸 Chi</button>}
                                                            {e.status === 'Đã chi' && <button className="btn btn-sm" style={{ background: '#10b981', color: '#fff', fontSize: 11, padding: '4px 8px' }} onClick={() => updateStatus(e.id, 'Hoàn thành')}>✅</button>}
                                                            {e.status === 'Từ chối' && <button className="btn btn-sm" style={{ background: '#f59e0b', color: '#fff', fontSize: 11, padding: '4px 8px' }} onClick={() => updateStatus(e.id, 'Chờ duyệt')}>↩</button>}
                                                            {e.proofUrl && <a href={e.proofUrl} target="_blank" rel="noreferrer" style={{ fontSize: 14 }}>📎</a>}
                                                            {['Đã chi', 'Hoàn thành'].includes(e.status) && <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => printVoucher(e)}>🧾</button>}
                                                            <button className="btn btn-ghost btn-sm" style={{ fontSize: 12 }} onClick={() => openEdit(e)}>✏️</button>
                                                            <button className="btn btn-ghost btn-sm" style={{ fontSize: 12, color: 'var(--status-danger)' }} onClick={() => handleDelete(e.id)}>🗑️</button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ════════ Modal tạo lệnh thu ════════ */}
            {showCreatePayModal && (
                <div className="modal-overlay" onClick={() => !savingPay && setShowCreatePayModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
                        <div className="modal-header">
                            <h3>+ Tạo lệnh thu — Xưởng Nội Thất</h3>
                            <button className="modal-close" onClick={() => setShowCreatePayModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Nội dung *</label>
                                <input className="form-input" value={createPayForm.noidung} onChange={e => setCreatePayForm({ ...createPayForm, noidung: e.target.value })} placeholder="VD: Thu cọc thiết kế, Đặt cọc nội thất anh A..." autoFocus />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Số tiền *</label>
                                    <input className="form-input" type="number" value={createPayForm.amount} onChange={e => setCreatePayForm({ ...createPayForm, amount: e.target.value })} placeholder="0" />
                                    {createPayForm.amount > 0 && <div style={{ fontSize: 12, color: 'var(--accent-primary)', marginTop: 4, fontWeight: 600 }}>{fmt(Number(createPayForm.amount))}</div>}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Hạng mục</label>
                                    <select className="form-select" value={createPayForm.category} onChange={e => setCreatePayForm({ ...createPayForm, category: e.target.value })}>
                                        <option>Nội thất</option>
                                        <option>Hợp đồng</option>
                                        <option>Thi công</option>
                                        <option>Thiết kế</option>
                                        <option>Khác</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Ngày thu / Hạn thu</label>
                                    <input className="form-input" type="date" value={createPayForm.dueDate} onChange={e => setCreatePayForm({ ...createPayForm, dueDate: e.target.value })} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Ghi chú</label>
                                <textarea className="form-input" rows={2} value={createPayForm.notes} onChange={e => setCreatePayForm({ ...createPayForm, notes: e.target.value })} placeholder="Khách hàng, dự án, lý do..." />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowCreatePayModal(false)} disabled={savingPay}>Hủy</button>
                            <button className="btn btn-primary" onClick={handleCreatePay} disabled={savingPay}>{savingPay ? 'Đang lưu...' : '+ Tạo lệnh thu'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ════════ Modal tạo/sửa lệnh chi ════════ */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 540 }}>
                        <div className="modal-header">
                            <h3>{editing ? `✏️ Sửa ${editing.code}` : '+ Tạo lệnh chi — Xưởng'}</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Mô tả chi phí *</label>
                                <input className="form-input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="VD: Mua ván MDF, công thợ lắp tủ..." autoFocus />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Số tiền *</label>
                                    <input className="form-input" type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0" />
                                    {form.amount > 0 && <div style={{ fontSize: 12, color: 'var(--accent-primary)', marginTop: 4, fontWeight: 600 }}>{fmt(Number(form.amount))}</div>}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Hạng mục</label>
                                    <select className="form-select" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                                        {WORKSHOP_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Chi cho</label>
                                    <select className="form-select" value={form.recipientType} onChange={e => setForm({ ...form, recipientType: e.target.value, recipientId: '', recipientName: '' })}>
                                        <option value="">— Không chọn —</option>
                                        <option value="NCC">Nhà cung cấp</option>
                                        <option value="Thợ">Thợ xưởng</option>
                                        <option value="Khác">Khác</option>
                                    </select>
                                </div>
                                {form.recipientType === 'NCC' ? (
                                    <div className="form-group">
                                        <label className="form-label">NCC</label>
                                        <select className="form-select" value={form.recipientId} onChange={e => setForm({ ...form, recipientId: e.target.value })}>
                                            <option value="">— Chọn NCC —</option>
                                            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </div>
                                ) : form.recipientType ? (
                                    <div className="form-group">
                                        <label className="form-label">Tên người nhận</label>
                                        <input className="form-input" value={form.recipientName} onChange={e => setForm({ ...form, recipientName: e.target.value })} placeholder="Tên thợ / người nhận..." />
                                    </div>
                                ) : null}
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Dự án (không bắt buộc)</label>
                                    <select className="form-select" value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })}>
                                        <option value="">— Không gắn DA —</option>
                                        {projects.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Ngày</label>
                                    <input className="form-input" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Người đề nghị</label>
                                <select className="form-select" value={form.submittedBy} onChange={e => setForm({ ...form, submittedBy: e.target.value })}>
                                    <option value="">— Chọn người đề nghị —</option>
                                    {workshopUsers.map(u => <option key={u.id} value={u.name}>{u.name}{u.department ? ` · ${u.department}` : ''}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Ghi chú</label>
                                <textarea className="form-input" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Ghi chú thêm..." />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Hủy</button>
                            <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>{saving ? 'Đang lưu...' : editing ? 'Cập nhật' : 'Tạo lệnh chi'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ════════ Modal upload chứng từ chi ════════ */}
            {proofModal && (
                <div className="modal-overlay" onClick={() => !uploading && setProofModal(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
                        <div className="modal-header">
                            <h3>💸 Chi tiền — Upload chứng từ</h3>
                            <button className="modal-close" onClick={() => !uploading && setProofModal(null)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div style={{ padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span style={{ color: 'var(--text-muted)' }}>Mã</span><strong>{proofModal.code}</strong></div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span style={{ color: 'var(--text-muted)' }}>Mô tả</span><strong style={{ textAlign: 'right', maxWidth: 260 }}>{proofModal.description}</strong></div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Số tiền</span><strong style={{ color: 'var(--status-danger)', fontSize: 15 }}>{fmt(proofModal.amount)}</strong></div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">📎 Chứng từ chi * <span style={{ color: 'var(--status-danger)', fontSize: 11 }}>(Bắt buộc)</span></label>
                                <div onDrop={e => { e.preventDefault(); handleProofFile(e.dataTransfer?.files?.[0]); }} onDragOver={e => e.preventDefault()}
                                    onPaste={e => { const f = e.clipboardData?.items; if (f) for (const i of f) if (i.type.startsWith('image/')) { handleProofFile(i.getAsFile()); break; } }}
                                    tabIndex={0} style={{ border: `2px dashed ${proofFile ? 'var(--status-success)' : 'var(--border)'}`, borderRadius: 8, padding: 20, textAlign: 'center', cursor: 'pointer' }}
                                    onClick={() => proofRef.current?.click()}>
                                    <input ref={proofRef} type="file" accept="image/*" onChange={e => handleProofFile(e.target.files?.[0])} style={{ display: 'none' }} />
                                    {proofPreview ? (<div><img src={proofPreview} alt="preview" style={{ maxWidth: '100%', maxHeight: 160, borderRadius: 6, marginBottom: 8 }} /><div style={{ fontSize: 12, color: 'var(--status-success)' }}>✅ {proofFile?.name}</div></div>)
                                        : <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>📋 <strong>Ctrl+V</strong> paste ảnh &nbsp;|&nbsp; 📁 Click chọn file &nbsp;|&nbsp; 🖱️ Kéo thả</div>}
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setProofModal(null)} disabled={uploading}>Hủy</button>
                            <button className="btn btn-primary" onClick={confirmPay} disabled={uploading || !proofFile}>{uploading ? '⏳ Đang xử lý...' : '💸 Xác nhận chi tiền'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ════════ Modal Thu tiền ════════ */}
            {collectModal && (
                <div className="modal-overlay" onClick={() => !collectUploading && setCollectModal(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
                        <div className="modal-header">
                            <h3>💵 Xác nhận thu tiền</h3>
                            <button className="modal-close" onClick={() => !collectUploading && setCollectModal(null)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div style={{ padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span style={{ color: 'var(--text-muted)' }}>Hợp đồng</span><strong>{collectModal.contract?.code}</strong></div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span style={{ color: 'var(--text-muted)' }}>Khách hàng</span><strong>{collectModal.contract?.customer?.name || '—'}</strong></div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span style={{ color: 'var(--text-muted)' }}>Đợt</span><strong>{collectModal.phase}</strong></div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span style={{ color: 'var(--text-muted)' }}>Giá trị đợt</span><strong>{fmt(collectModal.amount)}</strong></div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Đã thu</span><strong style={{ color: 'var(--status-success)' }}>{fmt(collectModal.paidAmount || 0)}</strong></div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Số tiền thu lần này *</label>
                                <input className="form-input" type="number" value={collectAmount} onChange={e => setCollectAmount(e.target.value)} />
                                {collectAmount > 0 && <div style={{ fontSize: 12, color: 'var(--accent-primary)', marginTop: 4, fontWeight: 600 }}>{fmt(Number(collectAmount))}</div>}
                            </div>
                            <div className="form-group">
                                <label className="form-label">📸 Ảnh chuyển khoản / Chữ ký KH * <span style={{ color: 'var(--status-danger)', fontSize: 11 }}>(Bắt buộc)</span></label>
                                <div onDrop={e => { e.preventDefault(); handleCollectFile(e.dataTransfer?.files?.[0]); }} onDragOver={e => e.preventDefault()}
                                    onPaste={e => { const f = e.clipboardData?.items; if (f) for (const i of f) if (i.type.startsWith('image/')) { handleCollectFile(i.getAsFile()); break; } }}
                                    tabIndex={0} style={{ border: `2px dashed ${collectFile ? 'var(--status-success)' : 'var(--status-danger)'}`, borderRadius: 8, padding: 20, textAlign: 'center', cursor: 'pointer' }}
                                    onClick={() => collectRef.current?.click()}>
                                    <input ref={collectRef} type="file" accept="image/*" onChange={e => handleCollectFile(e.target.files?.[0])} style={{ display: 'none' }} />
                                    {collectPreview ? (<div><img src={collectPreview} alt="proof" style={{ maxWidth: '100%', maxHeight: 160, borderRadius: 6, marginBottom: 8 }} /><div style={{ fontSize: 12, color: 'var(--status-success)' }}>✅ {collectFile?.name}</div></div>)
                                        : <div style={{ color: 'var(--text-muted)', fontSize: 13 }}><div style={{ fontSize: 24, marginBottom: 6 }}>📸</div>📋 <strong>Ctrl+V</strong> paste &nbsp;|&nbsp; 📁 Click chọn &nbsp;|&nbsp; 🖱️ Kéo thả</div>}
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setCollectModal(null)} disabled={collectUploading}>Hủy</button>
                            <button className="btn btn-primary" onClick={confirmCollect} disabled={collectUploading || !collectFile || !collectAmount}>
                                {collectUploading ? '⏳ Đang xử lý...' : '✅ Xác nhận thu tiền'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
