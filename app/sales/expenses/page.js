'use client';
import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
const pct = (a, b) => b > 0 ? Math.round((a / b) * 100) : 0;

const SALES_CATEGORIES = [
    'Marketing & Quảng cáo', 'Tiếp khách', 'Công tác phí', 'Quà tặng khách hàng',
    'Hoa hồng sales', 'Văn phòng phẩm', 'Triển lãm / Hội chợ', 'Đi lại',
    'Chi phí in ấn', 'Phí phần mềm', 'Chi phí chung', 'Khác',
];

const EXP_STATUS_STYLE = {
    'Chờ duyệt': { bg: '#fef3c7', color: '#92400e' },
    'Đã duyệt':  { bg: '#dbeafe', color: '#1e40af' },
    'Đã chi':    { bg: '#dcfce7', color: '#166534' },
    'Hoàn thành':{ bg: '#d1fae5', color: '#065f46' },
    'Từ chối':   { bg: '#fee2e2', color: '#991b1b' },
};

const THU_STATUS_STYLE = {
    'Chưa thu':     { bg: '#fee2e2', color: '#991b1b' },
    'Thu một phần': { bg: '#fef3c7', color: '#92400e' },
    'Đã thu':       { bg: '#d1fae5', color: '#065f46' },
};

const EXP_TABS = [
    { key: '', label: 'Tất cả' }, { key: 'Chờ duyệt', label: 'Chờ duyệt' },
    { key: 'Đã duyệt', label: 'Đã duyệt' }, { key: 'Đã chi', label: 'Đã chi' },
    { key: 'Hoàn thành', label: 'Hoàn thành' }, { key: 'Từ chối', label: 'Từ chối' },
];

const todayStr = () => new Date().toISOString().split('T')[0];
const fmtDateVN = (str) => { if (!str) return ''; const d = new Date(str); return d.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }); };
const SW_TYPES = ['Nhân viên KD', 'Quản lý'];
const SW_TYPE_BG = { 'Nhân viên KD': '#dbeafe', 'Quản lý': '#d1fae5' };
const SW_TYPE_COLOR = { 'Nhân viên KD': '#1d4ed8', 'Quản lý': '#065f46' };
const SW_STATUS_BG = { 'Hoạt động': '#dcfce7', 'Tạm nghỉ': '#fef3c7', 'Nghỉ việc': '#f3f4f6' };
const SW_STATUS_COLOR = { 'Hoạt động': '#16a34a', 'Tạm nghỉ': '#d97706', 'Nghỉ việc': '#6b7280' };
const EMPTY_CC_FORM = { name: '', workerType: 'Nhân viên KD', position: '', phone: '', birthdate: '', dailyRate: '', status: 'Hoạt động', notes: '' };

const emptyForm = {
    description: '', amount: '', category: 'Marketing & Quảng cáo',
    submittedBy: '', date: new Date().toISOString().split('T')[0],
    notes: '', projectId: '', recipientType: '', recipientId: '', recipientName: '',
};

export default function SalesExpensesPage() {
    const { data: session } = useSession();
    const userName = session?.user?.name || '';
    const userRole = session?.user?.role || '';
    const canApprove = ['giam_doc', 'pho_gd', 'ban_gd', 'ke_toan', 'hanh_chinh_kt'].includes(userRole);

    /* ── Main tab ── */
    const [mainTab, setMainTab] = useState('thu_tien');

    /* ── Chi phí state ── */
    const [expenses, setExpenses] = useState([]);
    const [projects, setProjects] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [salesUsers, setSalesUsers] = useState([]);
    const [loadingExp, setLoadingExp] = useState(true);
    const [expTab, setExpTab] = useState('');
    const [search, setSearch] = useState('');
    const [filterProject, setFilterProject] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
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
    const [createPayForm, setCreatePayForm] = useState({ noidung: '', amount: '', dueDate: '', notes: '', category: 'Hợp đồng' });
    const [savingPay, setSavingPay] = useState(false);
    const [collectModal, setCollectModal] = useState(null);
    const [collectFile, setCollectFile] = useState(null);
    const [collectPreview, setCollectPreview] = useState(null);
    const [collectAmount, setCollectAmount] = useState('');
    const [collectUploading, setCollectUploading] = useState(false);
    const collectRef = useRef();

    /* ── Chấm công state ── */
    const [ccWorkers, setCcWorkers] = useState([]);
    const [ccAttendance, setCcAttendance] = useState([]);
    const [ccLoading, setCcLoading] = useState(false);
    const [ccDate, setCcDate] = useState(() => todayStr());
    const [ccSearch, setCcSearch] = useState('');
    const [ccShowModal, setCcShowModal] = useState(false);
    const [ccEditing, setCcEditing] = useState(null);
    const [ccForm, setCcForm] = useState(EMPTY_CC_FORM);
    const [ccSaving, setCcSaving] = useState(false);
    const [ccDeleteTarget, setCcDeleteTarget] = useState(null);
    const [ccAttendTarget, setCcAttendTarget] = useState(null);
    const [ccAttendForm, setCcAttendForm] = useState({ hoursWorked: 8, notes: '' });
    const [ccShowSummary, setCcShowSummary] = useState(false);
    const [ccSummaryMonth, setCcSummaryMonth] = useState(() => new Date().toISOString().slice(0, 7));
    const [ccSummaryData, setCcSummaryData] = useState([]);
    const [ccLoadingSummary, setCcLoadingSummary] = useState(false);
    const [ccUserList, setCcUserList] = useState([]);
    const [ccSuggest, setCcSuggest] = useState([]);
    const [ccShowSuggest, setCcShowSuggest] = useState(false);

    /* ── Fetch ── */
    const fetchExpenses = async () => {
        setLoadingExp(true);
        const [eRes, pRes, sRes, uRes] = await Promise.all([
            fetch('/api/project-expenses?limit=1000&department=kinh_doanh').then(r => r.json()).then(d => d.data || []).catch(() => []),
            fetch('/api/projects?limit=500').then(r => r.json()).then(d => d.data || []).catch(() => []),
            fetch('/api/suppliers?limit=500').then(r => r.json()).then(d => d.data || []).catch(() => []),
            fetch('/api/users').then(r => r.json()).then(d => (d || []).filter(u => ['kinh_doanh', 'ban_gd', 'giam_doc'].includes(u.role))).catch(() => []),
        ]);
        setExpenses(eRes); setProjects(pRes); setSuppliers(sRes); setSalesUsers(uRes);
        setLoadingExp(false);
    };

    const fetchPayments = async () => {
        setLoadingPay(true);
        const [res, incRes] = await Promise.all([
            fetch('/api/finance/receivables').then(r => r.json()).catch(() => ({ payments: [] })),
            fetch('/api/project-expenses?expenseType=Thu%20ti%E1%BB%81n&department=kinh_doanh&limit=1000').then(r => r.json()).then(d => d.data || []).catch(() => []),
        ]);
        setPayments(res.payments || []);
        setStandaloneIncomes(incRes);
        setLoadingPay(false);
    };

    useEffect(() => { fetchExpenses(); fetchPayments(); fetchCcSummary(ccSummaryMonth); }, []);

    /* ── Chấm công fetch ── */
    const fetchCcWorkers = async () => {
        setCcLoading(true);
        const [wRes, aRes] = await Promise.all([
            fetch('/api/sales/workers').then(r => r.json()).catch(() => []),
            fetch(`/api/sales/attendance?date=${ccDate}`).then(r => r.json()).catch(() => []),
        ]);
        setCcWorkers(Array.isArray(wRes) ? wRes : []);
        setCcAttendance(Array.isArray(aRes) ? aRes : []);
        setCcLoading(false);
    };
    const fetchCcAttendance = async (date) => {
        const data = await fetch(`/api/sales/attendance?date=${date}`).then(r => r.json()).catch(() => []);
        setCcAttendance(Array.isArray(data) ? data : []);
    };
    const fetchCcSummary = async (month) => {
        setCcLoadingSummary(true);
        const data = await fetch(`/api/sales/attendance?month=${month}`).then(r => r.json()).catch(() => []);
        setCcSummaryData(Array.isArray(data) ? data : []);
        setCcLoadingSummary(false);
    };
    useEffect(() => {
        fetch('/api/users').then(r => r.json()).then(d => {
            const list = Array.isArray(d) ? d.filter(u => ['kinh_doanh', 'ban_gd', 'giam_doc', 'pho_gd', 'hanh_chinh_kt'].includes(u.role)) : [];
            setCcUserList(list);
        }).catch(() => {});
    }, []);
    useEffect(() => { if (mainTab === 'cham_cong') fetchCcWorkers(); }, [mainTab]);
    useEffect(() => { if (mainTab === 'cham_cong') fetchCcAttendance(ccDate); }, [ccDate]);
    useEffect(() => { if (ccShowSummary) fetchCcSummary(ccSummaryMonth); }, [ccSummaryMonth, ccShowSummary]);

    /* ── Chấm công actions ── */
    const ccOnNameChange = (val) => {
        setCcForm(f => ({ ...f, name: val }));
        if (val.trim().length >= 1) {
            const matches = ccUserList.filter(u => u.name.toLowerCase().includes(val.toLowerCase()));
            setCcSuggest(matches);
            setCcShowSuggest(matches.length > 0);
        } else {
            setCcShowSuggest(false);
        }
    };
    const ccSelectUser = (u) => {
        setCcForm(f => ({
            ...f,
            name: u.name,
            phone: u.phone || f.phone,
            position: u.department || f.position,
        }));
        setCcShowSuggest(false);
        setCcSuggest([]);
    };
    const ccOpenAdd = () => { setCcEditing(null); setCcForm(EMPTY_CC_FORM); setCcShowModal(true); setCcShowSuggest(false); };
    const ccOpenEdit = (w) => {
        setCcEditing(w);
        setCcForm({
            name: w.name, workerType: w.workerType, position: w.position,
            phone: w.phone, birthdate: w.birthdate ? new Date(w.birthdate).toISOString().split('T')[0] : '',
            dailyRate: w.dailyRate, status: w.status, notes: w.notes,
        });
        setCcShowModal(true);
        setCcShowSuggest(false);
    };
    const ccHandleSubmit = async () => {
        if (!ccForm.name.trim()) return alert('Nhập tên nhân viên!');
        setCcSaving(true);
        const payload = { ...ccForm, dailyRate: Number(ccForm.dailyRate) || 0, birthdate: ccForm.birthdate || null };
        if (ccEditing) {
            await fetch(`/api/sales/workers/${ccEditing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        } else {
            await fetch('/api/sales/workers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        }
        setCcSaving(false); setCcShowModal(false); fetchCcWorkers();
    };
    const ccHandleDelete = async () => {
        await fetch(`/api/sales/workers/${ccDeleteTarget.id}`, { method: 'DELETE' });
        setCcDeleteTarget(null); fetchCcWorkers();
    };
    const ccOpenAttend = (w) => {
        const existing = ccAttendance.find(a => a.workerId === w.id);
        setCcAttendTarget(w);
        setCcAttendForm({ hoursWorked: existing?.hoursWorked ?? 8, notes: existing?.notes ?? '' });
    };
    const ccHandleAttend = async () => {
        await fetch('/api/sales/attendance', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ workerId: ccAttendTarget.id, date: ccDate, ...ccAttendForm }),
        });
        setCcAttendTarget(null); fetchCcAttendance(ccDate);
    };
    const ccBulkAttend = async () => {
        const active = ccWorkers.filter(w => w.status === 'Hoạt động');
        if (!active.length) return;
        if (!confirm(`Chấm công ${active.length} nhân viên với 8 giờ cho ngày ${fmtDateVN(ccDate)}?`)) return;
        await Promise.all(active.map(w =>
            fetch('/api/sales/attendance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workerId: w.id, date: ccDate, hoursWorked: 8, notes: '' }) })
        ));
        fetchCcAttendance(ccDate);
    };

    /* ══ CHI PHÍ stats ══ */
    const expTotal         = expenses.length;
    const expValue         = expenses.reduce((s, e) => s + (e.amount || 0), 0);
    const expPaid          = expenses.filter(e => ['Đã chi', 'Hoàn thành'].includes(e.status)).reduce((s, e) => s + (e.amount || 0), 0);
    const expPendingCount  = expenses.filter(e => e.status === 'Chờ duyệt').length;
    const expApprovedCount = expenses.filter(e => e.status === 'Đã duyệt').length;
    const expProjects      = [...new Set(expenses.map(e => e.project?.name).filter(Boolean))];

    const byCat = SALES_CATEGORIES.map(cat => ({
        cat,
        total: expenses.filter(e => e.category === cat).reduce((s, e) => s + (e.amount || 0), 0),
        count: expenses.filter(e => e.category === cat).length,
    })).filter(r => r.count > 0).sort((a, b) => b.total - a.total);

    const filteredExp = expenses.filter(e => {
        if (expTab && e.status !== expTab) return false;
        if (filterProject && e.project?.name !== filterProject) return false;
        if (filterCategory && e.category !== filterCategory) return false;
        if (search && !e.code?.toLowerCase().includes(search.toLowerCase()) && !e.description?.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    /* ══ THU TIỀN stats ══ */
    const noithatPayments = payments.filter(p => (p.contract?.project?.type || '').toLowerCase().includes('nội thất'));
    const payTotal    = noithatPayments.reduce((s, p) => s + (p.amount || 0), 0);
    const payReceived = noithatPayments.reduce((s, p) => s + (p.paidAmount || 0), 0);
    const payRemain   = payTotal - payReceived;
    const payPending  = noithatPayments.filter(p => p.status !== 'Đã thu').length;
    const payProjects = [...new Set(noithatPayments.map(p => p.contract?.project?.name).filter(Boolean))];

    const filteredPay = payments.filter(p => {
        const projectType = p.contract?.project?.type || '';
        if (!projectType.toLowerCase().includes('nội thất')) return false;
        if (filterPayStatus && p.status !== filterPayStatus) return false;
        if (filterPayProject && p.contract?.project?.name !== filterPayProject) return false;
        return true;
    });

    /* ══ CHI PHÍ actions ══ */
    const openCreate = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
    const openEdit = (e) => {
        setEditing(e);
        setForm({
            description: e.description || '', amount: e.amount || '',
            category: e.category || 'Marketing & Quảng cáo', submittedBy: e.submittedBy || '',
            date: e.date ? new Date(e.date).toISOString().split('T')[0] : '',
            notes: e.notes || '', projectId: e.projectId || '',
            recipientType: e.recipientType || '', recipientId: e.recipientId || '', recipientName: e.recipientName || '',
        });
        setShowModal(true);
    };
    const handleSubmit = async () => {
        if (!form.description.trim()) return alert('Nhập mô tả chi phí!');
        if (!form.amount || Number(form.amount) <= 0) return alert('Nhập số tiền!');
        setSaving(true);
        const recipientName = form.recipientType === 'NCC'
            ? (suppliers.find(s => s.id === form.recipientId)?.name || form.recipientName)
            : form.recipientName;
        const payload = { ...form, amount: Number(form.amount), projectId: form.projectId || null, recipientName: recipientName || '', department: 'kinh_doanh', expenseType: 'Kinh doanh' };
        const res = editing
            ? await fetch('/api/project-expenses', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editing.id, ...payload }) })
            : await fetch('/api/project-expenses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        setSaving(false);
        if (!res.ok) { const err = await res.json().catch(() => ({})); return alert('Lỗi: ' + (err.error || res.statusText)); }
        setShowModal(false); fetchExpenses();
    };
    const handleDelete = async (id) => { if (!confirm('Xóa lệnh chi này?')) return; await fetch(`/api/project-expenses?id=${id}`, { method: 'DELETE' }); fetchExpenses(); };
    const updateStatus = async (id, status, extra = {}) => {
        await fetch('/api/project-expenses', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status, ...extra }) });
        fetchExpenses();
    };
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

    /* ══ THU TIỀN actions ══ */
    const openCreatePay = () => { setCreatePayForm({ noidung: '', amount: '', dueDate: '', notes: '', category: 'Hợp đồng' }); setShowCreatePayModal(true); };
    const handleCreatePay = async () => {
        if (!createPayForm.noidung.trim()) return alert('Nhập nội dung thu!');
        if (!createPayForm.amount || Number(createPayForm.amount) <= 0) return alert('Nhập số tiền!');
        setSavingPay(true);
        await fetch('/api/project-expenses', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ description: createPayForm.noidung.trim(), amount: Number(createPayForm.amount), category: createPayForm.category, date: createPayForm.dueDate || new Date().toISOString().split('T')[0], notes: createPayForm.notes.trim(), expenseType: 'Thu tiền', department: 'kinh_doanh', status: 'Chờ duyệt', submittedBy: '' }),
        });
        setSavingPay(false); setShowCreatePayModal(false); fetchPayments();
    };

    const openCollect = (p) => { setCollectModal(p); setCollectFile(null); setCollectPreview(null); setCollectAmount(String((p.amount || 0) - (p.paidAmount || 0))); };
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

    /* ══ Print ══ */
    const printReceipt = (p) => {
        const c = p.contract;
        const today = new Date().toLocaleDateString('vi-VN');
        const w = window.open('', '_blank', 'width=820,height=900');
        w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Phiếu thu</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Times New Roman',serif;font-size:14px}
.page{max-width:780px;margin:0 auto;padding:24px 32px}
.header{border-bottom:4px solid #8e44ad;padding-bottom:14px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center}
.co-name{font-size:15px;font-weight:900;color:#1C3A6B;text-transform:uppercase}
.co-info{font-size:9px;color:#555;line-height:1.8;text-align:right}
.title{text-align:center;margin:16px 0;font-size:24px;font-weight:900;text-transform:uppercase;letter-spacing:4px;color:#1C3A6B}
.info{border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;margin:14px 0}
.row{display:flex;padding:7px 12px;border-bottom:1px solid #f0f0f0;font-size:13px}
.row:last-child{border-bottom:none}.row:nth-child(even){background:#fafafa}
.lbl{width:160px;color:#666;font-size:12px;flex-shrink:0}.val{flex:1;font-weight:700;color:#1C3A6B}
.amount-box{margin:18px 0;padding:20px;border:2px solid #8e44ad;text-align:center;background:#fdf4ff;border-radius:8px}
.amount-box .lbl{font-size:11px;color:#8e44ad;text-transform:uppercase;letter-spacing:3px;margin-bottom:6px;font-weight:700;width:auto}
.amount-box .val{font-size:28px;font-weight:900;color:#1C3A6B;width:auto}
.signs{display:flex;justify-content:space-between;margin-top:40px}
.sign{width:45%;text-align:center;border:1px dashed #ddd;border-radius:6px;padding:10px}
.sign .role{font-weight:700;font-size:13px;margin-bottom:55px;color:#1C3A6B}
.sign .hint{font-size:10px;font-style:italic;color:#999}
.footer{border-top:2px solid #8e44ad;margin-top:16px;padding-top:10px;text-align:center;font-size:9px;color:#888}
.no-print{position:fixed;top:12px;right:12px}.no-print button{padding:10px 24px;background:#8e44ad;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer}
@media print{.no-print{display:none!important}}
</style></head><body>
<div class="no-print"><button onclick="window.print()">🖨️ In phiếu thu</button></div>
<div class="page">
  <div class="header">
    <div><div class="co-name">Kiến Trúc Đô Thị SCT — Phòng Kinh Doanh</div><div style="font-size:9px;color:#555;margin-top:4px">📞 0914 998 822 | kientrucsct.com</div></div>
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
  <div class="footer">Kiến Trúc Đô Thị SCT · Phòng Kinh Doanh · kientrucsct.com · 0914 998 822</div>
</div></body></html>`);
        w.document.close();
    };

    const printManualReceipt = (inc) => {
        const today = new Date().toLocaleDateString('vi-VN');
        const w = window.open('', '_blank', 'width=820,height=900');
        w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Phiếu thu - ${inc.code}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Times New Roman',serif;font-size:14px}
.page{max-width:780px;margin:0 auto;padding:24px 32px}
.header{border-bottom:4px solid #8e44ad;padding-bottom:14px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center}
.co-name{font-size:15px;font-weight:900;color:#1C3A6B;text-transform:uppercase}
.title{text-align:center;margin:16px 0;font-size:24px;font-weight:900;text-transform:uppercase;letter-spacing:4px;color:#1C3A6B}
.info{border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;margin:14px 0}
.row{display:flex;padding:7px 12px;border-bottom:1px solid #f0f0f0;font-size:13px}
.row:last-child{border-bottom:none}.row:nth-child(even){background:#fafafa}
.lbl{width:160px;color:#666;font-size:12px;flex-shrink:0}.val{flex:1;font-weight:700;color:#1C3A6B}
.amount-box{margin:18px 0;padding:20px;border:2px solid #8e44ad;text-align:center;background:#fdf4ff;border-radius:8px}
.amount-box .lbl{font-size:11px;color:#8e44ad;text-transform:uppercase;letter-spacing:3px;margin-bottom:6px;font-weight:700;width:auto}
.amount-box .val{font-size:28px;font-weight:900;color:#1C3A6B;width:auto}
.signs{display:flex;justify-content:space-between;margin-top:40px}
.sign{width:45%;text-align:center;border:1px dashed #ddd;border-radius:6px;padding:10px}
.sign .role{font-weight:700;font-size:13px;margin-bottom:55px;color:#1C3A6B}
.sign .hint{font-size:10px;font-style:italic;color:#999}
.footer{border-top:2px solid #8e44ad;margin-top:16px;padding-top:10px;text-align:center;font-size:9px;color:#888}
.no-print{position:fixed;top:12px;right:12px}.no-print button{padding:10px 24px;background:#8e44ad;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer}
@media print{.no-print{display:none!important}}
</style></head><body>
<div class="no-print"><button onclick="window.print()">🖨️ In phiếu thu</button></div>
<div class="page">
  <div class="header">
    <div><div class="co-name">Kiến Trúc Đô Thị SCT — Phòng Kinh Doanh</div><div style="font-size:9px;color:#555;margin-top:4px">📞 0914 998 822 | kientrucsct.com</div></div>
    <div class="co-info"><div><b>Ngày in:</b> ${today}</div><div><b>Số phiếu:</b> ${inc.code}</div></div>
  </div>
  <div class="title">Phiếu Thu Tiền</div>
  <div class="info">
    <div class="row"><span class="lbl">Mã phiếu</span><span class="val">${inc.code}</span></div>
    <div class="row"><span class="lbl">Nội dung</span><span class="val">${inc.description || '—'}</span></div>
    <div class="row"><span class="lbl">Hạng mục</span><span class="val">${inc.category || '—'}</span></div>
    <div class="row"><span class="lbl">Ngày</span><span class="val">${new Date(inc.date).toLocaleDateString('vi-VN')}</span></div>
    <div class="row"><span class="lbl">Trạng thái</span><span class="val">${inc.status}</span></div>
    <div class="row"><span class="lbl">Người duyệt</span><span class="val">${inc.approvedBy || '—'}</span></div>
    ${inc.notes ? `<div class="row"><span class="lbl">Ghi chú</span><span class="val">${inc.notes}</span></div>` : ''}
  </div>
  <div class="amount-box"><div class="lbl">Số tiền thu</div><div class="val">${fmt(inc.amount)}</div></div>
  <div class="signs">
    <div class="sign"><div class="role">Người nộp tiền</div><div class="hint">(Ký, ghi rõ họ tên)</div></div>
    <div class="sign"><div class="role">Người thu tiền</div><div class="hint">(Ký, ghi rõ họ tên)</div></div>
  </div>
  <div class="footer">Kiến Trúc Đô Thị SCT · Phòng Kinh Doanh · kientrucsct.com · 0914 998 822</div>
</div></body></html>`);
        w.document.close();
    };

    const printVoucher = (e) => {
        const today = new Date().toLocaleDateString('vi-VN');
        const amountText = new Intl.NumberFormat('vi-VN').format(e.amount);
        const w = window.open('', '_blank', 'width=860,height=800');
        w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Phiếu chi - ${e.code}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:13px;color:#1a1a1a;background:#f5f5f5;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{max-width:800px;margin:20px auto;background:#fff;box-shadow:0 4px 24px rgba(0,0,0,.12)}.top-bar{height:8px;background:#8e44ad}
.header{display:flex;align-items:center;justify-content:space-between;padding:20px 36px 16px;border-bottom:1px solid #f0ebe5}
.co-name{font-size:15px;font-weight:900;color:#1a1a1a;text-transform:uppercase;letter-spacing:.8px;line-height:1.2}
.co-tagline{font-size:9px;color:#8e44ad;font-style:italic;margin-top:2px}.co-info{font-size:8.5px;color:#666;margin-top:6px;line-height:1.8}
.title-banner{background:#8e44ad;padding:18px 36px;display:flex;align-items:center;justify-content:space-between}
.title-banner h1{font-size:26px;font-weight:900;color:#fff;text-transform:uppercase;letter-spacing:6px}
.code-badge{background:rgba(255,255,255,.2);border:1.5px solid rgba(255,255,255,.6);border-radius:24px;padding:6px 20px;color:#fff;font-weight:900;font-size:14px;letter-spacing:2px}
.body{padding:28px 36px}.info-grid{display:grid;grid-template-columns:180px 1fr;gap:0;margin-bottom:20px;border:1px solid #f0ebe5;border-radius:8px;overflow:hidden}
.info-row{display:contents}.info-row .lbl{background:#fdf4ff;padding:10px 14px;font-size:11.5px;color:#888;border-bottom:1px solid #f0ebe5;font-style:italic}
.info-row .val{background:#fff;padding:10px 14px;font-size:12px;font-weight:700;color:#1a1a1a;border-bottom:1px solid #f0ebe5}
.amount-wrap{margin:0 0 20px;border-radius:10px;overflow:hidden;border:2px solid #8e44ad}
.amount-head{background:#8e44ad;padding:8px 20px;font-size:9px;text-transform:uppercase;letter-spacing:3px;color:#fff;font-weight:800;text-align:center}
.amount-body{padding:18px 20px;text-align:center;background:#fdf4ff}
.amount-val{font-size:34px;font-weight:900;color:#1a1a1a;letter-spacing:1px}.amount-val em{color:#8e44ad;font-style:normal;font-size:26px}
.sign-section{display:flex;justify-content:space-between;margin:8px 0 24px;gap:12px}
.sign-col{flex:1;text-align:center;border:1px solid #f0ebe5;border-radius:8px;padding:14px 10px}
.sign-col .role{font-weight:900;font-size:10.5px;color:#1a1a1a;text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px}
.sign-col .role-sub{font-size:8.5px;color:#aaa;margin-bottom:52px}.sign-col .sign-line{border-top:1px solid #ddd;padding-top:6px;font-size:8.5px;font-style:italic;color:#bbb}
.bottom-bar{background:#8e44ad;padding:10px 36px;display:flex;justify-content:space-between;align-items:center}
.bottom-brand{font-size:9.5px;font-weight:900;color:#fff;text-transform:uppercase}.bottom-tagline{font-size:8.5px;color:rgba(255,255,255,.8);font-style:italic}
.no-print{position:fixed;top:16px;right:16px;z-index:9999}.no-print button{padding:10px 22px;font-size:13px;cursor:pointer;background:#8e44ad;color:#fff;border:none;border-radius:6px;font-weight:700}
@media print{.no-print{display:none!important}body{background:#fff}.page{box-shadow:none;margin:0}}
</style></head><body>
<div class="no-print"><button onclick="window.print()">🖨️ In phiếu chi</button></div>
<div class="page"><div class="top-bar"></div>
<div class="header"><div><div class="co-name">Kiến Trúc Đô Thị SCT — Phòng Kinh Doanh</div><div class="co-tagline">Cùng bạn xây dựng ước mơ</div><div class="co-info">📍 149 Nguyễn Tất Thành, Tp. Yên Bái &nbsp;|&nbsp; 📞 0914 998 822</div></div>
<div style="text-align:right;font-size:9px;color:#888;line-height:2"><div><strong>Ngày:</strong> ${today}</div><div><strong>Hạng mục:</strong> ${e.category || '—'}</div></div></div>
<div class="title-banner"><div><h1>Phiếu Chi Tiền</h1><div style="font-size:10px;color:rgba(255,255,255,.75);letter-spacing:3px;text-transform:uppercase;margin-top:4px">Phòng Kinh Doanh</div></div><div class="code-badge">Số: ${e.code}</div></div>
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
  <div class="sign-col"><div class="role">Trưởng phòng KD</div><div class="role-sub">Ngày &nbsp;&nbsp; tháng &nbsp;&nbsp; năm 2026</div><div class="sign-line">(Ký, ghi rõ họ tên)</div></div>
  <div class="sign-col"><div class="role">Người nhận tiền</div><div class="role-sub">Ngày ${today}</div><div class="sign-line">(Ký, ghi rõ họ tên)</div></div>
</div></div>
<div class="bottom-bar"><div><div class="bottom-brand">Kiến Trúc Đô Thị SCT</div><div class="bottom-tagline">Phòng Kinh Doanh</div></div><div style="font-size:8.5px;color:rgba(255,255,255,.8)">Mã: ${e.code} | ${today}</div></div>
</div></body></html>`);
        w.document.close();
    };

    /* ══════════════════════════════
       RENDER
    ══════════════════════════════ */
    return (
        <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>Phòng Kinh Doanh</span>
                <span style={{ color: 'var(--border)' }}>›</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Tài chính Kinh doanh</span>
            </div>
            <h2 style={{ margin: '0 0 20px', fontSize: 22, fontWeight: 700 }}>Tài chính Phòng Kinh Doanh</h2>

            {/* ── Dashboard tổng quan ── */}
            {(() => {
                const siTotal    = standaloneIncomes.reduce((s, i) => s + (i.amount || 0), 0);
                const siReceived = standaloneIncomes.filter(i => i.status === 'Đã chi').reduce((s, i) => s + (i.amount || 0), 0);
                const totalThuPhai   = payTotal + siTotal;
                const totalThuDuoc   = payReceived + siReceived;
                const totalThuConLai = totalThuPhai - totalThuDuoc;
                const salaryTotal    = ccSummaryData.reduce((s, a) => s + (a.hoursWorked / 8) * (a.worker?.dailyRate || 0), 0);
                const totalChi       = expPaid + salaryTotal;
                const canDoi         = totalThuDuoc - totalChi;
                const monthLabel     = new Date(ccSummaryMonth + '-01').toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
                return (
                    <div className="card" style={{ marginBottom: 16, padding: '16px 20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Tổng quan tài chính kinh doanh</span>
                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Lương: {monthLabel}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
                            {/* Thu tiền */}
                            <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '14px 16px', borderLeft: '4px solid #16a34a' }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: '#15803d', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>💰 Thu tiền</div>
                                <div style={{ fontSize: 18, fontWeight: 800, color: '#15803d', marginBottom: 6 }}>{fmt(totalThuDuoc)}</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                    <div style={{ fontSize: 11, color: '#374151' }}>Phải thu: <strong>{fmt(totalThuPhai)}</strong></div>
                                    <div style={{ fontSize: 11, color: '#dc2626' }}>Còn lại: <strong>{fmt(totalThuConLai)}</strong></div>
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
                            {/* Lương tháng */}
                            <div style={{ background: '#eff6ff', borderRadius: 10, padding: '14px 16px', borderLeft: '4px solid #2563eb' }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: '#1d4ed8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>👤 Lương tháng</div>
                                <div style={{ fontSize: 18, fontWeight: 800, color: '#1d4ed8', marginBottom: 6 }}>{fmt(salaryTotal)}</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                    <div style={{ fontSize: 11, color: '#374151' }}>Nhân viên KD: <strong>{ccSummaryData.filter((a, i, arr) => arr.findIndex(x => x.workerId === a.workerId) === i).length} người</strong></div>
                                    <div style={{ fontSize: 11, color: '#374151' }}>Số công: <strong>{ccSummaryData.reduce((s, a) => s + (a.hoursWorked / 8), 0).toFixed(1)} ngày</strong></div>
                                </div>
                            </div>
                            {/* Cân đối */}
                            <div style={{ background: canDoi >= 0 ? '#f0fdf4' : '#fef2f2', borderRadius: 10, padding: '14px 16px', borderLeft: `4px solid ${canDoi >= 0 ? '#16a34a' : '#dc2626'}` }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: canDoi >= 0 ? '#15803d' : '#b91c1c', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>💵 Cân đối</div>
                                <div style={{ fontSize: 18, fontWeight: 800, color: canDoi >= 0 ? '#15803d' : '#b91c1c', marginBottom: 6 }}>{canDoi >= 0 ? '+' : ''}{fmt(canDoi)}</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                    <div style={{ fontSize: 11, color: '#374151' }}>Đã thu: <strong>{fmt(totalThuDuoc)}</strong></div>
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
                        { key: 'thu_tien',   label: '📈 Thu tiền' },
                        { key: 'chi_phi',    label: '📉 Chi phí' },
                        { key: 'cham_cong',  label: '🕐 Chấm công' },
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

                {/* ════ TAB: THU TIỀN ════ */}
                {mainTab === 'thu_tien' && (
                    <div style={{ padding: 20 }}>
                        {/* KPI */}
                        <div className="stats-grid" style={{ marginBottom: 20 }}>
                            <div className="stat-card"><div className="stat-icon">💰</div><div><div className="stat-value" style={{ fontSize: 16 }}>{fmt(payTotal)}</div><div className="stat-label">Tổng phải thu</div></div></div>
                            <div className="stat-card"><div className="stat-icon">✅</div><div><div className="stat-value" style={{ color: 'var(--status-success)', fontSize: 16 }}>{fmt(payReceived)}</div><div className="stat-label">Đã thu</div></div></div>
                            <div className="stat-card"><div className="stat-icon">⏳</div><div><div className="stat-value" style={{ color: 'var(--status-danger)', fontSize: 16 }}>{fmt(payRemain)}</div><div className="stat-label">Còn phải thu</div></div></div>
                            <div className="stat-card"><div className="stat-icon">🔔</div><div><div className="stat-value" style={{ color: 'var(--status-warning)' }}>{payPending}</div><div className="stat-label">Đợt chưa thu đủ</div></div></div>
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

                        {/* Bảng thu theo hợp đồng */}
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
                                            <tr><th>Mã</th><th>Nội dung</th><th>Hạng mục</th><th>Số tiền</th><th>Ngày</th><th>Trạng thái</th><th>Người duyệt</th><th>Thao tác</th></tr>
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
                                                        <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                                                            {inc.approvedBy ? (
                                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                                    <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#dbeafe', color: '#1e40af', fontSize: 10, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                        {inc.approvedBy.charAt(0).toUpperCase()}
                                                                    </span>
                                                                    <span style={{ color: 'var(--text-primary)' }}>{inc.approvedBy}</span>
                                                                </span>
                                                            ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                                                        </td>
                                                        <td>
                                                            <div style={{ display: 'flex', gap: 4 }}>
                                                                {inc.status === 'Chờ duyệt' && (canApprove
                                                                    ? <button className="btn btn-sm" style={{ background: '#16a34a', color: '#fff', fontSize: 11, padding: '4px 8px' }}
                                                                        onClick={() => fetch('/api/project-expenses', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: inc.id, status: 'Đã duyệt', approvedBy: userName }) }).then(fetchPayments)}>
                                                                        ✓ Duyệt
                                                                      </button>
                                                                    : <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>Chờ duyệt</span>
                                                                )}
                                                                {inc.status === 'Đã duyệt' && canApprove && (
                                                                    <button className="btn btn-sm btn-primary" style={{ fontSize: 11, padding: '4px 8px' }}
                                                                        onClick={() => fetch('/api/project-expenses', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: inc.id, status: 'Đã chi' }) }).then(fetchPayments)}>
                                                                        ✅ Đã thu
                                                                    </button>
                                                                )}
                                                                <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => printManualReceipt(inc)} title="In phiếu thu">
                                                                    🖨️
                                                                </button>
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

                {/* ════ TAB: CHI PHÍ ════ */}
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

                        {/* Biểu đồ hạng mục */}
                        {byCat.length > 0 && (
                            <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Chi tiêu theo hạng mục</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                                    {byCat.map(r => {
                                        const p = expValue > 0 ? Math.round((r.total / expValue) * 100) : 0;
                                        return (
                                            <div key={r.cat} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div style={{ width: 150, fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.cat}</div>
                                                <div style={{ flex: 1, height: 7, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                                                    <div style={{ height: '100%', width: `${p}%`, background: '#8e44ad', borderRadius: 4 }} />
                                                </div>
                                                <div style={{ width: 110, fontSize: 12, fontWeight: 600, textAlign: 'right', whiteSpace: 'nowrap' }}>{fmt(r.total)}</div>
                                                <div style={{ width: 32, fontSize: 11, color: 'var(--text-muted)', textAlign: 'right' }}>{p}%</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

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
                            <select className="form-select" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                                <option value="">Tất cả hạng mục</option>
                                {SALES_CATEGORIES.map(c => <option key={c}>{c}</option>)}
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
                            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                                {expenses.length === 0 ? 'Chưa có lệnh chi nào. Nhấn "+ Tạo lệnh chi" để bắt đầu.' : 'Không có dữ liệu phù hợp'}
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table className="data-table" style={{ margin: 0 }}>
                                    <thead>
                                        <tr><th>Mã</th><th>Mô tả</th><th>Dự án / Người nhận</th><th>Hạng mục</th><th>Số tiền</th><th>Ngày</th><th>Trạng thái</th><th>Người duyệt</th><th style={{ minWidth: 180 }}>Thao tác</th></tr>
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
                                                    <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                                                        {e.approvedBy ? (
                                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                                <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#dbeafe', color: '#1e40af', fontSize: 10, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{e.approvedBy.charAt(0).toUpperCase()}</span>
                                                                <span style={{ color: 'var(--text-primary)' }}>{e.approvedBy}</span>
                                                            </span>
                                                        ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                                                    </td>
                                                    <td>
                                                        <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                                                            {e.status === 'Chờ duyệt' && (canApprove ? (<>
                                                                <button className="btn btn-sm" style={{ background: '#16a34a', color: '#fff', fontSize: 11, padding: '4px 8px' }} onClick={() => updateStatus(e.id, 'Đã duyệt', { approvedBy: userName })}>✓ Duyệt</button>
                                                                <button className="btn btn-sm" style={{ background: '#ef4444', color: '#fff', fontSize: 11, padding: '4px 8px' }} onClick={() => updateStatus(e.id, 'Từ chối')}>✗</button>
                                                            </>) : <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>Chờ duyệt</span>)}
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

                {/* ════ TAB: CHẤM CÔNG ════ */}
                {mainTab === 'cham_cong' && (() => {
                    const ccIsToday = ccDate === todayStr();
                    const ccActive = ccWorkers.filter(w => w.status === 'Hoạt động');
                    const ccAttendedCount = ccAttendance.length;
                    const ccTotalHours = ccAttendance.reduce((s, a) => s + (a.hoursWorked || 0), 0);
                    const ccTotalCost = ccAttendance.reduce((s, a) => {
                        const rate = a.worker?.dailyRate || ccWorkers.find(w => w.id === a.workerId)?.dailyRate || 0;
                        return s + (a.hoursWorked / 8) * rate;
                    }, 0);
                    const ccMonthlyFund = ccWorkers.filter(w => w.status === 'Hoạt động').reduce((s, w) => s + (w.dailyRate || 0), 0) * 26;
                    const ccFiltered = ccWorkers.filter(w => !ccSearch || w.name.toLowerCase().includes(ccSearch.toLowerCase()) || (w.position || '').toLowerCase().includes(ccSearch.toLowerCase()));

                    return (
                        <div style={{ padding: 20 }}>
                            {/* KPI */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, marginBottom: 20 }}>
                                <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #2563eb' }}>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>👤 Nhân viên hoạt động</div>
                                    <div style={{ fontSize: 26, fontWeight: 800, color: '#2563eb' }}>{ccActive.length}</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>/ {ccWorkers.length} tổng</div>
                                </div>
                                <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #16a34a' }}>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>✅ Chấm công{ccIsToday ? ' hôm nay' : ''}</div>
                                    <div style={{ fontSize: 26, fontWeight: 800, color: '#16a34a' }}>{ccAttendedCount}</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{ccTotalHours} giờ làm việc</div>
                                </div>
                                <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #f59e0b' }}>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>💵 Chi phí{ccIsToday ? ' hôm nay' : ''}</div>
                                    <div style={{ fontSize: 18, fontWeight: 800, color: '#f59e0b' }}>{new Intl.NumberFormat('vi-VN').format(Math.round(ccTotalCost / 1000))}k</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Theo ngày × đơn giá</div>
                                </div>
                                <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #8b5cf6' }}>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>📅 Quỹ lương/tháng</div>
                                    <div style={{ fontSize: 18, fontWeight: 800, color: '#8b5cf6' }}>{new Intl.NumberFormat('vi-VN').format(Math.round(ccMonthlyFund / 1e6))}tr</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>× 26 ngày/tháng</div>
                                </div>
                            </div>

                            {/* Filter bar */}
                            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center', background: 'var(--bg-secondary)', borderRadius: 8, padding: '10px 12px' }}>
                                <input className="form-input" placeholder="🔍 Tìm theo tên, vị trí..." value={ccSearch} onChange={e => setCcSearch(e.target.value)} style={{ flex: 1, minWidth: 160 }} />
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <button className="btn btn-ghost btn-sm" onClick={() => { const d = new Date(ccDate); d.setDate(d.getDate() - 1); setCcDate(d.toISOString().split('T')[0]); }}>◀</button>
                                    <input type="date" value={ccDate} onChange={e => setCcDate(e.target.value)} style={{ padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, color: 'var(--text-primary)', background: 'var(--bg-card)', cursor: 'pointer' }} />
                                    <button className="btn btn-ghost btn-sm" onClick={() => { const d = new Date(ccDate); d.setDate(d.getDate() + 1); setCcDate(d.toISOString().split('T')[0]); }}>▶</button>
                                    {!ccIsToday && <button className="btn btn-ghost btn-sm" style={{ color: '#2563eb', fontWeight: 600 }} onClick={() => setCcDate(todayStr())}>Hôm nay</button>}
                                </div>
                                <button className="btn btn-sm" style={{ background: '#dcfce7', color: '#15803d', border: 'none', fontWeight: 600 }} onClick={ccBulkAttend}>✅ Chấm tất cả 8h</button>
                                <button className="btn btn-sm" style={{ background: '#ede9fe', color: '#6d28d9', border: 'none', fontWeight: 600 }} onClick={() => { setCcShowSummary(true); fetchCcSummary(ccSummaryMonth); }}>📊 Tổng hợp tháng</button>
                                <button className="btn btn-primary btn-sm" onClick={ccOpenAdd}>+ Thêm nhân viên</button>
                            </div>

                            {/* Header ngày */}
                            <div style={{ padding: '8px 14px', background: ccIsToday ? '#eff6ff' : '#fef9c3', border: '1px solid var(--border)', borderRadius: 6, marginBottom: 12, fontSize: 12, color: ccIsToday ? '#1d4ed8' : '#92400e', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                                📅 {ccIsToday ? 'Hôm nay — ' : ''}{fmtDateVN(ccDate)}
                                <span style={{ marginLeft: 'auto', fontWeight: 400, color: 'var(--text-muted)' }}>
                                    {ccAttendedCount}/{ccActive.length} đã chấm · {ccTotalHours}h · {new Intl.NumberFormat('vi-VN').format(Math.round(ccTotalCost / 1000))}k
                                </span>
                            </div>

                            {/* Table */}
                            {ccLoading ? (
                                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
                            ) : ccFiltered.length === 0 ? (
                                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                                    {ccWorkers.length === 0 ? 'Chưa có nhân viên nào. Nhấn "+ Thêm nhân viên" để bắt đầu.' : 'Không có kết quả phù hợp'}
                                </div>
                            ) : (
                                <div style={{ overflowX: 'auto' }}>
                                    <table className="data-table" style={{ margin: 0 }}>
                                        <thead>
                                            <tr>
                                                <th>Họ tên</th>
                                                <th>Vị trí</th>
                                                <th>SĐT · Ngày sinh</th>
                                                <th>Đơn giá/ngày</th>
                                                <th>Chấm công</th>
                                                <th>Trạng thái</th>
                                                <th style={{ textAlign: 'right' }}>Thao tác</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {ccFiltered.map(w => {
                                                const rec = ccAttendance.find(a => a.workerId === w.id);
                                                return (
                                                    <tr key={w.id}>
                                                        <td>
                                                            <div style={{ fontWeight: 600, fontSize: 13 }}>{w.name}</div>
                                                            <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 8, background: SW_TYPE_BG[w.workerType] || '#f3f4f6', color: SW_TYPE_COLOR[w.workerType] || '#374151', fontWeight: 600 }}>{w.workerType}</span>
                                                        </td>
                                                        <td style={{ fontSize: 12 }}>{w.position || '—'}</td>
                                                        <td style={{ fontSize: 12 }}>
                                                            <div>{w.phone || '—'}</div>
                                                            {w.birthdate && <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>🎂 {new Date(w.birthdate).toLocaleDateString('vi-VN')}</div>}
                                                        </td>
                                                        <td style={{ fontWeight: 600, fontSize: 13 }}>{w.dailyRate > 0 ? `${new Intl.NumberFormat('vi-VN').format(w.dailyRate)}đ` : '—'}</td>
                                                        <td>
                                                            {rec ? (
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                    <span style={{ padding: '2px 10px', borderRadius: 20, background: '#dcfce7', color: '#15803d', fontSize: 12, fontWeight: 700 }}>✓ {rec.hoursWorked}h</span>
                                                                    {w.dailyRate > 0 && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Intl.NumberFormat('vi-VN').format(Math.round((rec.hoursWorked / 8) * w.dailyRate))}đ</span>}
                                                                </div>
                                                            ) : (
                                                                w.status === 'Hoạt động'
                                                                    ? <span style={{ color: '#dc2626', fontSize: 12 }}>Chưa chấm</span>
                                                                    : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                                                            )}
                                                        </td>
                                                        <td>
                                                            <span style={{ padding: '3px 9px', borderRadius: 20, background: SW_STATUS_BG[w.status] || '#f3f4f6', color: SW_STATUS_COLOR[w.status] || '#6b7280', fontSize: 12, fontWeight: 600 }}>{w.status}</span>
                                                        </td>
                                                        <td>
                                                            <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                                                                {w.status === 'Hoạt động' && (
                                                                    <button className="btn btn-sm" style={{ background: rec ? '#dcfce7' : '#dbeafe', color: rec ? '#15803d' : '#1d4ed8', border: 'none', fontWeight: 600 }} onClick={() => ccOpenAttend(w)}>
                                                                        {rec ? '✓ Sửa' : '+ Chấm'}
                                                                    </button>
                                                                )}
                                                                <button className="btn btn-ghost btn-sm" onClick={() => ccOpenEdit(w)}>✏️</button>
                                                                <button className="btn btn-ghost btn-sm" onClick={() => setCcDeleteTarget(w)} style={{ color: 'var(--status-danger)' }}>🗑️</button>
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
                    );
                })()}

                {/* ════ MODAL Tổng hợp tháng chấm công ════ */}
                {ccShowSummary && (() => {
                    const [y, m] = ccSummaryMonth.split('-').map(Number);
                    const daysInMonth = new Date(y, m, 0).getDate();
                    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
                    const activeWorkers = ccWorkers.filter(w => w.status !== 'Nghỉ việc');
                    return (
                        <div className="modal-overlay" onClick={() => setCcShowSummary(false)}>
                            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 960, width: '95vw', maxHeight: '90vh', overflow: 'auto' }}>
                                <div className="modal-header">
                                    <h3>📊 Tổng hợp công tháng — Phòng Kinh Doanh</h3>
                                    <button className="modal-close" onClick={() => setCcShowSummary(false)}>×</button>
                                </div>
                                <div className="modal-body">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                                        <input type="month" value={ccSummaryMonth} onChange={e => setCcSummaryMonth(e.target.value)} style={{ padding: '6px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14 }} />
                                        {ccLoadingSummary && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Đang tải...</span>}
                                    </div>
                                    {!ccLoadingSummary && (
                                        <div style={{ overflowX: 'auto' }}>
                                            <table className="data-table" style={{ fontSize: 11, margin: 0, minWidth: 700 }}>
                                                <thead>
                                                    <tr>
                                                        <th style={{ minWidth: 120 }}>Nhân viên</th>
                                                        {days.map(d => <th key={d} style={{ minWidth: 28, textAlign: 'center', padding: '4px 2px' }}>{d}</th>)}
                                                        <th style={{ minWidth: 60, textAlign: 'right' }}>Tổng giờ</th>
                                                        <th style={{ minWidth: 90, textAlign: 'right' }}>Thành tiền</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {activeWorkers.map(w => {
                                                        const wAtt = ccSummaryData.filter(a => a.workerId === w.id);
                                                        const totalHrs = wAtt.reduce((s, a) => s + (a.hoursWorked || 0), 0);
                                                        const totalPay = wAtt.reduce((s, a) => s + (a.hoursWorked / 8) * (w.dailyRate || 0), 0);
                                                        return (
                                                            <tr key={w.id}>
                                                                <td>
                                                                    <div style={{ fontWeight: 600 }}>{w.name}</div>
                                                                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{w.position || w.workerType}</div>
                                                                </td>
                                                                {days.map(d => {
                                                                    const dateStr = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                                                                    const rec = wAtt.find(a => new Date(a.date).toISOString().split('T')[0] === dateStr);
                                                                    const h = rec?.hoursWorked || 0;
                                                                    const bg = h === 0 ? 'transparent' : h >= 8 ? '#dcfce7' : h >= 4 ? '#fef3c7' : '#fee2e2';
                                                                    const col = h === 0 ? 'var(--text-muted)' : h >= 8 ? '#15803d' : h >= 4 ? '#92400e' : '#991b1b';
                                                                    return (
                                                                        <td key={d} style={{ textAlign: 'center', padding: '3px 2px' }}>
                                                                            {h > 0 && <span style={{ display: 'inline-block', minWidth: 22, padding: '1px 2px', borderRadius: 4, background: bg, color: col, fontWeight: 700, fontSize: 10 }}>{h}</span>}
                                                                        </td>
                                                                    );
                                                                })}
                                                                <td style={{ textAlign: 'right', fontWeight: 700 }}>{totalHrs}h</td>
                                                                <td style={{ textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>{new Intl.NumberFormat('vi-VN').format(Math.round(totalPay / 1000))}k</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                                <tfoot>
                                                    <tr style={{ fontWeight: 700, background: 'var(--bg-secondary)' }}>
                                                        <td>Tổng ngày</td>
                                                        {days.map(d => {
                                                            const dateStr = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                                                            const cnt = ccSummaryData.filter(a => new Date(a.date).toISOString().split('T')[0] === dateStr).length;
                                                            return <td key={d} style={{ textAlign: 'center', fontSize: 10, color: cnt > 0 ? '#2563eb' : 'var(--text-muted)' }}>{cnt > 0 ? cnt : ''}</td>;
                                                        })}
                                                        <td style={{ textAlign: 'right' }}>{ccSummaryData.reduce((s, a) => s + (a.hoursWorked || 0), 0)}h</td>
                                                        <td style={{ textAlign: 'right', color: '#16a34a' }}>
                                                            {new Intl.NumberFormat('vi-VN').format(Math.round(ccSummaryData.reduce((s, a) => {
                                                                const w = ccWorkers.find(w => w.id === a.workerId);
                                                                return s + (a.hoursWorked / 8) * (w?.dailyRate || 0);
                                                            }, 0) / 1000))}k
                                                        </td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })()}
            </div>

            {/* ════════ Modal tạo lệnh thu ════════ */}
            {showCreatePayModal && (
                <div className="modal-overlay" onClick={() => !savingPay && setShowCreatePayModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
                        <div className="modal-header">
                            <h3>+ Tạo lệnh thu — Kinh Doanh</h3>
                            <button className="modal-close" onClick={() => setShowCreatePayModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Nội dung *</label>
                                <input className="form-input" value={createPayForm.noidung} onChange={e => setCreatePayForm({ ...createPayForm, noidung: e.target.value })} placeholder="VD: Thu cọc hợp đồng, Thu tiền thiết kế anh A..." autoFocus />
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
                                        <option>Hợp đồng</option>
                                        <option>Cọc thiết kế</option>
                                        <option>Cọc thi công</option>
                                        <option>Thanh lý hợp đồng</option>
                                        <option>Khác</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Ngày thu / Hạn thu</label>
                                <input className="form-input" type="date" value={createPayForm.dueDate} onChange={e => setCreatePayForm({ ...createPayForm, dueDate: e.target.value })} />
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

            {/* ════════ Modal thu tiền hợp đồng ════════ */}
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
                                    {collectPreview
                                        ? (<div><img src={collectPreview} alt="proof" style={{ maxWidth: '100%', maxHeight: 160, borderRadius: 6, marginBottom: 8 }} /><div style={{ fontSize: 12, color: 'var(--status-success)' }}>✅ {collectFile?.name}</div></div>)
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

            {/* ════════ Modal tạo/sửa lệnh chi ════════ */}
            {showModal && (
                <div className="modal-overlay" onClick={() => !saving && setShowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 540 }}>
                        <div className="modal-header">
                            <h3>{editing ? `✏️ Sửa ${editing.code}` : '+ Tạo lệnh chi — Kinh Doanh'}</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Mô tả chi phí *</label>
                                <input className="form-input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="VD: Chi phí marketing tháng 4, Tiếp khách đối tác..." autoFocus />
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
                                        {SALES_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Chi cho</label>
                                    <select className="form-select" value={form.recipientType} onChange={e => setForm({ ...form, recipientType: e.target.value, recipientId: '', recipientName: '' })}>
                                        <option value="">— Không chọn —</option>
                                        <option value="NCC">Nhà cung cấp</option>
                                        <option value="Sales">Nhân viên Sales</option>
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
                                        <input className="form-input" value={form.recipientName} onChange={e => setForm({ ...form, recipientName: e.target.value })} placeholder="Tên nhân viên / người nhận..." />
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
                                    {salesUsers.map(u => <option key={u.id} value={u.name}>{u.name}{u.department ? ` · ${u.department}` : ''}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Ghi chú</label>
                                <textarea className="form-input" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Ghi chú thêm..." />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowModal(false)} disabled={saving}>Hủy</button>
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
                                    {proofPreview
                                        ? (<div><img src={proofPreview} alt="preview" style={{ maxWidth: '100%', maxHeight: 160, borderRadius: 6, marginBottom: 8 }} /><div style={{ fontSize: 12, color: 'var(--status-success)' }}>✅ {proofFile?.name}</div></div>)
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

            {/* ════════ Modal thêm/sửa nhân viên chấm công ════════ */}
            {ccShowModal && (
                <div className="modal-overlay" onClick={() => !ccSaving && setCcShowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
                        <div className="modal-header">
                            <h3>{ccEditing ? '✏️ Sửa nhân viên' : '+ Thêm nhân viên chấm công'}</h3>
                            <button className="modal-close" onClick={() => setCcShowModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            {/* Name with autocomplete */}
                            <div className="form-group" style={{ position: 'relative' }}>
                                <label className="form-label">Họ tên *</label>
                                <input className="form-input" value={ccForm.name}
                                    onChange={e => ccOnNameChange(e.target.value)}
                                    onBlur={() => setTimeout(() => setCcShowSuggest(false), 150)}
                                    placeholder="Nhập tên hoặc chọn từ nhân viên KD..." autoFocus />
                                {ccShowSuggest && ccSuggest.length > 0 && (
                                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', maxHeight: 220, overflowY: 'auto' }}>
                                        {ccSuggest.map(u => (
                                            <div key={u.id} onMouseDown={() => ccSelectUser(u)}
                                                style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: 2 }}
                                                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                <div style={{ fontWeight: 600, fontSize: 13 }}>{u.name}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 8 }}>
                                                    {u.phone && <span>📞 {u.phone}</span>}
                                                    {u.department && <span>🏢 {u.department}</span>}
                                                    {u.email && <span>✉️ {u.email}</span>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Loại</label>
                                    <select className="form-select" value={ccForm.workerType} onChange={e => setCcForm({ ...ccForm, workerType: e.target.value })}>
                                        {SW_TYPES.map(t => <option key={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Trạng thái</label>
                                    <select className="form-select" value={ccForm.status} onChange={e => setCcForm({ ...ccForm, status: e.target.value })}>
                                        <option>Hoạt động</option>
                                        <option>Tạm nghỉ</option>
                                        <option>Nghỉ việc</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Vị trí / Phòng ban</label>
                                    <input className="form-input" value={ccForm.position} onChange={e => setCcForm({ ...ccForm, position: e.target.value })} placeholder="VD: Kinh doanh, Thiết kế..." />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Số điện thoại</label>
                                    <input className="form-input" value={ccForm.phone} onChange={e => setCcForm({ ...ccForm, phone: e.target.value })} placeholder="09xx..." />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Ngày sinh</label>
                                    <input className="form-input" type="date" value={ccForm.birthdate} onChange={e => setCcForm({ ...ccForm, birthdate: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Đơn giá / ngày (đ)</label>
                                    <input className="form-input" type="number" value={ccForm.dailyRate} onChange={e => setCcForm({ ...ccForm, dailyRate: e.target.value })} placeholder="0" />
                                    {Number(ccForm.dailyRate) > 0 && <div style={{ fontSize: 12, color: 'var(--accent-primary)', marginTop: 4, fontWeight: 600 }}>{fmt(Number(ccForm.dailyRate))}/ngày</div>}
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Ghi chú</label>
                                <textarea className="form-input" rows={2} value={ccForm.notes} onChange={e => setCcForm({ ...ccForm, notes: e.target.value })} placeholder="Ghi chú thêm..." />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setCcShowModal(false)} disabled={ccSaving}>Hủy</button>
                            <button className="btn btn-primary" onClick={ccHandleSubmit} disabled={ccSaving}>{ccSaving ? 'Đang lưu...' : ccEditing ? 'Cập nhật' : 'Thêm nhân viên'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ════════ Modal chấm công ════════ */}
            {ccAttendTarget && (
                <div className="modal-overlay" onClick={() => setCcAttendTarget(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 380 }}>
                        <div className="modal-header">
                            <h3>✅ Chấm công — {ccAttendTarget.name}</h3>
                            <button className="modal-close" onClick={() => setCcAttendTarget(null)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>📅 Ngày: <strong>{fmtDateVN(ccDate)}</strong></div>
                            <div className="form-group">
                                <label className="form-label">Số giờ làm việc</label>
                                <input className="form-input" type="number" min="0" max="24" step="0.5" value={ccAttendForm.hoursWorked} onChange={e => setCcAttendForm({ ...ccAttendForm, hoursWorked: Number(e.target.value) })} autoFocus />
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Nhập 0 để xóa chấm công</div>
                            </div>
                            {ccAttendTarget.dailyRate > 0 && ccAttendForm.hoursWorked > 0 && (
                                <div style={{ background: '#dcfce7', borderRadius: 6, padding: '8px 12px', fontSize: 13, color: '#15803d', fontWeight: 600 }}>
                                    💵 Thành tiền: {fmt(Math.round((ccAttendForm.hoursWorked / 8) * ccAttendTarget.dailyRate))}
                                </div>
                            )}
                            <div className="form-group" style={{ marginTop: 10 }}>
                                <label className="form-label">Ghi chú</label>
                                <input className="form-input" value={ccAttendForm.notes} onChange={e => setCcAttendForm({ ...ccAttendForm, notes: e.target.value })} placeholder="VD: Về sớm, đi muộn..." />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setCcAttendTarget(null)}>Hủy</button>
                            <button className="btn btn-primary" onClick={ccHandleAttend}>Lưu chấm công</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ════════ Modal xác nhận xóa nhân viên ════════ */}
            {ccDeleteTarget && (
                <div className="modal-overlay" onClick={() => setCcDeleteTarget(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 380 }}>
                        <div className="modal-header">
                            <h3 style={{ color: 'var(--status-danger)' }}>🗑️ Xóa nhân viên</h3>
                            <button className="modal-close" onClick={() => setCcDeleteTarget(null)}>×</button>
                        </div>
                        <div className="modal-body">
                            <p>Xóa nhân viên <strong>{ccDeleteTarget.name}</strong>? Toàn bộ lịch sử chấm công cũng sẽ bị xóa.</p>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setCcDeleteTarget(null)}>Hủy</button>
                            <button className="btn btn-danger" onClick={ccHandleDelete}>Xóa</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
