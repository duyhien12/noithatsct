'use client';
import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';

const daysPending = (e) => {
    if (['Hoàn thành', 'Từ chối', 'Đã thanh toán'].includes(e.status)) return null;
    const base = e.createdAt || e.date;
    if (!base) return null;
    return Math.floor((Date.now() - new Date(base).getTime()) / 86400000);
};

const computePriority = (e) => {
    if (e.priority && e.priority !== 'Thường') return e.priority;
    const days = daysPending(e);
    if ((days != null && days > 10) || (e.amount > 100_000_000)) return 'Khẩn';
    if ((days != null && days > 5) || (e.amount > 30_000_000)) return 'Cao';
    return 'Thường';
};

const isOverdue = (e) => {
    const d = daysPending(e);
    return d !== null && d > 5;
};

const HOLDER_BY_STATUS = {
    'Chờ duyệt':      'KT trưởng / GĐ',
    'Đã duyệt':       'KT thực hiện chi',
    'Đã chi':         'KT xác nhận',
    'Chờ thanh toán': 'Bên nhận tiền',
    'Đã thanh toán':  'KT đối soát',
    'Hoàn thành':     '—',
    'Từ chối':        'Người đề nghị',
};

const STATUS_SORT = { 'Chờ duyệt': 0, 'Đã duyệt': 1, 'Chờ thanh toán': 2, 'Từ chối': 3, 'Đã chi': 4, 'Đã thanh toán': 5, 'Hoàn thành': 6 };

const STATUS_STYLE = {
    'Chờ duyệt':      { bg: '#FFF3E0', color: '#BF360C', border: '#FF9800' },
    'Đã duyệt':       { bg: '#E3F2FD', color: '#0D47A1', border: '#42A5F5' },
    'Đã chi':         { bg: '#E8F5E9', color: '#1B5E20', border: '#66BB6A' },
    'Chờ thanh toán': { bg: '#EDE7F6', color: '#311B92', border: '#7E57C2' },
    'Đã thanh toán':  { bg: '#E8F5E9', color: '#1B5E20', border: '#43A047' },
    'Hoàn thành':     { bg: '#F5F5F5', color: '#616161', border: '#BDBDBD' },
    'Từ chối':        { bg: '#FFEBEE', color: '#B71C1C', border: '#EF5350' },
};

const PRIORITY_STYLE = {
    'Khẩn':   { bg: '#FFEBEE', color: '#C62828', border: '#EF5350' },
    'Cao':    { bg: '#FFF8E1', color: '#E65100', border: '#FFA726' },
    'Thường': { bg: 'var(--bg-secondary)', color: 'var(--text-muted)', border: 'var(--border)' },
};

const PROJECT_CATEGORIES = ['Vật tư xây dựng', 'Nhân công', 'Vận chuyển', 'Thiết bị máy móc', 'Điện nước', 'Thuê ngoài', 'Sửa chữa', 'Bảo hiểm công trình', 'Khác'];
const COMPANY_CATEGORIES = ['Thuê văn phòng', 'Lương & Phụ cấp', 'Điện nước VP', 'Văn phòng phẩm', 'Marketing & QC', 'Phí ngân hàng', 'Bảo hiểm xã hội', 'Tiếp khách', 'Công tác phí', 'Phần mềm & CNTT', 'Bảo trì & Sửa chữa', 'Thuế & Lệ phí', 'Khấu hao TSCĐ', 'Khác'];
const FUND_SOURCES = ['Tiền mặt', 'Chuyển khoản', 'Quỹ dự án', 'Quỹ công ty', 'Vay nội bộ', 'Khác'];

const emptyForm = {
    expenseType: 'Dự án', description: '', amount: 0,
    category: 'Vật tư xây dựng', submittedBy: '',
    date: new Date().toISOString().split('T')[0],
    notes: '', projectId: '', recipientType: '', recipientId: '',
    priority: 'Thường', fundSource: '',
};

const TABS = [
    { key: '', label: 'Tất cả' },
    { key: 'Chờ duyệt', label: 'Chờ duyệt' },
    { key: 'Đã duyệt', label: 'Đã duyệt' },
    { key: 'Đã chi', label: 'Đã chi' },
    { key: 'Chờ thanh toán', label: 'Chờ TT' },
    { key: 'Đã thanh toán', label: 'Đã TT' },
    { key: 'Hoàn thành', label: 'Hoàn thành' },
    { key: 'Từ chối', label: 'Từ chối' },
];

const QUICK_FILTERS = [
    { key: 'canduyet', label: 'Cần duyệt', dot: '#FF9800' },
    { key: 'cuatoi',  label: 'Của tôi',   dot: '#42A5F5' },
    { key: 'khan',    label: 'Khẩn',      dot: '#EF5350' },
    { key: 'quahan',  label: 'Quá hạn',   dot: '#C62828' },
    { key: 'homnay',  label: 'Hôm nay',   dot: '#43A047' },
];

export default function ExpensesPage() {
    const { data: session } = useSession();
    const [expenses, setExpenses] = useState([]);
    const [projects, setProjects] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [contractors, setContractors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('');
    const [quickFilter, setQuickFilter] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [filterProject, setFilterProject] = useState('');
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [proofModal, setProofModal] = useState(null);
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

    // --- Derived stats ---
    const totalAmount  = expenses.reduce((s, e) => s + (e.amount || 0), 0);
    const totalPaid    = expenses.filter(e => ['Đã chi', 'Hoàn thành', 'Đã thanh toán'].includes(e.status)).reduce((s, e) => s + (e.amount || 0), 0);
    const pendingList  = expenses.filter(e => e.status === 'Chờ duyệt');
    const approvedList = expenses.filter(e => e.status === 'Đã duyệt');
    const waitingList  = expenses.filter(e => e.status === 'Chờ thanh toán');
    const overdueList  = expenses.filter(e => isOverdue(e));
    const cats        = [...new Set(expenses.map(e => e.category))].filter(Boolean);
    const expProjects = [...new Set(expenses.map(e => e.project?.name).filter(Boolean))];

    const TODAY_STR = new Date().toDateString();

    const applyQuickFilter = (e) => {
        if (!quickFilter) return true;
        if (quickFilter === 'canduyet') return e.status === 'Chờ duyệt';
        if (quickFilter === 'cuatoi')  return e.submittedBy === session?.user?.name;
        if (quickFilter === 'khan')    return computePriority(e) === 'Khẩn';
        if (quickFilter === 'quahan')  return isOverdue(e);
        if (quickFilter === 'homnay')  return new Date(e.date || e.createdAt).toDateString() === TODAY_STR;
        return true;
    };

    const filtered = expenses.filter(e => {
        if (activeTab && e.status !== activeTab) return false;
        if (!applyQuickFilter(e)) return false;
        if (filterCategory && e.category !== filterCategory) return false;
        if (filterProject && e.project?.name !== filterProject) return false;
        if (search && !e.code?.toLowerCase().includes(search.toLowerCase()) && !e.description?.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    // Default view: sort by urgency (Chờ duyệt first, then Đã duyệt, …), then days pending desc
    const sortedFiltered = [...filtered].sort((a, b) => {
        if (!activeTab && !quickFilter) {
            const pA = STATUS_SORT[a.status] ?? 99;
            const pB = STATUS_SORT[b.status] ?? 99;
            if (pA !== pB) return pA - pB;
        }
        const dA = daysPending(a) ?? -1;
        const dB = daysPending(b) ?? -1;
        return dB - dA;
    });

    // --- Handlers ---
    const setActionFilter = (tab, qf = '') => {
        setActiveTab(tab); setQuickFilter(qf);
        setSearch(''); setFilterCategory(''); setFilterProject('');
    };
    const openCreate = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
    const openEdit = (e) => {
        setEditing(e);
        setForm({
            expenseType: e.expenseType || 'Dự án',
            description: e.description,
            amount: e.amount,
            category: e.category,
            submittedBy: e.submittedBy,
            date: e.date?.split('T')[0] || '',
            notes: e.notes,
            projectId: e.projectId || '',
            recipientType: e.recipientType || '',
            recipientId: e.recipientId || '',
            priority: e.priority || 'Thường',
            fundSource: e.fundSource || '',
        });
        setShowModal(true);
    };
    const handleSubmit = async () => {
        if (!form.description.trim()) return alert('Nhập mô tả chi phí!');
        if (form.expenseType === 'Dự án' && !form.projectId) return alert('Chọn dự án!');
        if (!form.amount || form.amount <= 0) return alert('Nhập số tiền!');
        const recipientName = form.recipientType === 'NCC'
            ? suppliers.find(s => s.id === form.recipientId)?.name
            : form.recipientType === 'Thầu phụ'
                ? contractors.find(c => c.id === form.recipientId)?.name
                : '';
        const payload = { ...form, recipientName: recipientName || '', amount: Number(form.amount) };
        if (editing) {
            await fetch('/api/project-expenses', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editing.id, ...payload }) });
        } else {
            await fetch('/api/project-expenses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        }
        setShowModal(false);
        fetchData();
    };
    const handleDelete = async (id) => {
        if (!confirm('Xóa lệnh chi này?')) return;
        await fetch(`/api/project-expenses?id=${id}`, { method: 'DELETE' });
        fetchData();
    };
    const updateStatus = async (id, status, extraData = {}) => {
        await fetch('/api/project-expenses', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status, ...extraData }) });
        fetchData();
    };

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

    const printExpenseVoucher = (e) => {
        const today = new Date().toLocaleDateString('vi-VN');
        const amountText = new Intl.NumberFormat('vi-VN').format(e.amount);
        const w = window.open('', '_blank', 'width=860,height=800');
        w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Phiếu chi - ${e.code}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,sans-serif;font-size:13px;color:#1a1a1a;background:#f5f5f5;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{max-width:800px;margin:20px auto;background:#fff;box-shadow:0 4px 24px rgba(0,0,0,.12)}
.top-bar{height:8px;background:#F47920}
.header{display:flex;align-items:center;justify-content:space-between;padding:20px 36px 16px;border-bottom:1px solid #f0ebe5}
.logo-area{display:flex;align-items:center;gap:14px}
.co-name{font-size:15px;font-weight:900;color:#1a1a1a;text-transform:uppercase;letter-spacing:.8px;line-height:1.2}
.co-tagline{font-size:9px;color:#F47920;font-style:italic;margin-top:2px;letter-spacing:.3px}
.co-info{font-size:8.5px;color:#666;margin-top:6px;line-height:1.8}
.co-info span{margin-right:14px}
.header-right{text-align:right;font-size:9px;color:#888;line-height:2}
.header-right strong{color:#1a1a1a;font-size:10px}
.title-banner{background:#F47920;padding:18px 36px;display:flex;align-items:center;justify-content:space-between}
.title-banner h1{font-size:26px;font-weight:900;color:#fff;text-transform:uppercase;letter-spacing:6px}
.title-banner .sub{font-size:10px;color:rgba(255,255,255,.75);letter-spacing:3px;text-transform:uppercase;margin-top:4px}
.code-badge{background:rgba(255,255,255,.2);border:1.5px solid rgba(255,255,255,.6);border-radius:24px;padding:6px 20px;color:#fff;font-weight:900;font-size:14px;letter-spacing:2px;white-space:nowrap}
.body{padding:28px 36px}
.info-grid{display:grid;grid-template-columns:180px 1fr;gap:0;margin-bottom:20px;border:1px solid #f0ebe5;border-radius:8px;overflow:hidden}
.info-row{display:contents}
.info-row .lbl{background:#fdf6f0;padding:10px 14px;font-size:11.5px;color:#888;border-bottom:1px solid #f0ebe5;font-style:italic}
.info-row .val{background:#fff;padding:10px 14px;font-size:12px;font-weight:700;color:#1a1a1a;border-bottom:1px solid #f0ebe5}
.info-row:last-child .lbl,.info-row:last-child .val{border-bottom:none}
.amount-wrap{margin:0 0 20px;border-radius:10px;overflow:hidden;border:2px solid #F47920}
.amount-head{background:#F47920;padding:8px 20px;font-size:9px;text-transform:uppercase;letter-spacing:3px;color:#fff;font-weight:800;text-align:center}
.amount-body{padding:18px 20px;text-align:center;background:linear-gradient(135deg,#fff9f5,#fff)}
.amount-val{font-size:34px;font-weight:900;color:#1a1a1a;letter-spacing:1px}
.amount-val em{color:#F47920;font-style:normal;font-size:26px}
.amount-words{margin-top:10px;font-size:11px;color:#999;font-style:italic;border-top:1px dashed #f0ebe5;padding-top:10px}
.amount-words span{display:inline-block;min-width:320px;border-bottom:1px dotted #ccc;height:18px}
.proof-section{margin-bottom:20px;text-align:center}
.proof-section img{max-width:220px;max-height:140px;border:1px solid #eee;border-radius:6px}
.proof-label{font-size:9px;color:#aaa;margin-bottom:6px;font-style:italic}
.sign-section{display:flex;justify-content:space-between;margin:8px 0 24px;gap:12px}
.sign-col{flex:1;text-align:center;border:1px solid #f0ebe5;border-radius:8px;padding:14px 10px}
.sign-col .role{font-weight:900;font-size:10.5px;color:#1a1a1a;text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px}
.sign-col .role-sub{font-size:8.5px;color:#aaa;margin-bottom:52px}
.sign-col .sign-line{border-top:1px solid #ddd;padding-top:6px;font-size:8.5px;font-style:italic;color:#bbb}
.bottom-bar{background:#F47920;padding:10px 36px;display:flex;justify-content:space-between;align-items:center}
.bottom-brand{font-size:9.5px;font-weight:900;color:#fff;letter-spacing:.5px;text-transform:uppercase}
.bottom-tagline{font-size:8.5px;color:rgba(255,255,255,.8);font-style:italic}
.bottom-code{font-size:8.5px;color:rgba(255,255,255,.8)}
.no-print{position:fixed;top:16px;right:16px;z-index:9999}
.no-print button{padding:10px 22px;font-size:13px;cursor:pointer;background:#F47920;color:#fff;border:none;border-radius:6px;font-weight:700;letter-spacing:.3px;box-shadow:0 3px 12px rgba(244,121,32,.45)}
@media print{.no-print{display:none!important}body{background:#fff}.page{box-shadow:none;margin:0}}
</style></head><body>
<div class="no-print"><button onclick="window.print()">🖨️ In phiếu chi</button></div>
<div class="page">
  <div class="top-bar"></div>
  <div class="header">
    <div class="logo-area">
      <svg width="62" height="62" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g transform="translate(80,80) rotate(45) translate(-54,-54)"><rect width="108" height="108" rx="6" fill="#F47920"/></g>
        <text x="80" y="100" text-anchor="middle" fill="#fff" font-size="86" font-weight="900" font-family="Arial Black,Arial,sans-serif" letter-spacing="-4">K</text>
      </svg>
      <div>
        <div class="co-name">Kiến Trúc Đô Thị SCT</div>
        <div class="co-tagline">Cùng bạn xây dựng ước mơ</div>
        <div class="co-info"><span>📍 149 Nguyễn Tất Thành, Tp. Yên Bái, Tỉnh Yên Bái</span><br><span>📞 0914 998 822</span><span>🌐 kientrucsct.com</span></div>
      </div>
    </div>
    <div class="header-right">
      <div><strong>Ngày lập:</strong> ${today}</div>
      <div><strong>Hạng mục:</strong> ${e.category || '—'}</div>
      <div><strong>Trạng thái:</strong> ${e.status}</div>
    </div>
  </div>
  <div class="title-banner">
    <div><h1>Phiếu Chi Tiền</h1><div class="sub">Payment Voucher</div></div>
    <div class="code-badge">Số: ${e.code}</div>
  </div>
  <div class="body">
    <div class="info-grid">
      <div class="info-row"><div class="lbl">Người nhận tiền</div><div class="val">${e.recipientName || e.submittedBy || '...'}</div></div>
      ${e.recipientType ? `<div class="info-row"><div class="lbl">Loại đối tượng</div><div class="val">${e.recipientType}</div></div>` : ''}
      ${e.project ? `<div class="info-row"><div class="lbl">Công trình / Dự án</div><div class="val">${e.project.code} — ${e.project.name}</div></div>` : ''}
      <div class="info-row"><div class="lbl">Nội dung chi</div><div class="val">${e.description}</div></div>
      ${e.fundSource ? `<div class="info-row"><div class="lbl">Nguồn tiền</div><div class="val">${e.fundSource}</div></div>` : ''}
      ${e.notes ? `<div class="info-row"><div class="lbl">Ghi chú</div><div class="val">${e.notes}</div></div>` : ''}
    </div>
    <div class="amount-wrap">
      <div class="amount-head">Số tiền chi</div>
      <div class="amount-body">
        <div class="amount-val">${amountText} <em>đ</em></div>
        <div class="amount-words">Bằng chữ: <span></span></div>
      </div>
    </div>
    ${e.proofUrl ? `<div class="proof-section"><div class="proof-label">Chứng từ đính kèm</div><img src="${e.proofUrl}" alt="Chứng từ"/></div>` : ''}
    <div class="sign-section">
      <div class="sign-col"><div class="role">Người lập phiếu</div><div class="role-sub">Ngày ${today}</div><div class="sign-line">(Ký, ghi rõ họ tên)</div></div>
      <div class="sign-col"><div class="role">Giám đốc</div><div class="role-sub">Ngày &nbsp;&nbsp;&nbsp; tháng &nbsp;&nbsp;&nbsp; năm 2026</div><div class="sign-line">(Ký, ghi rõ họ tên)</div></div>
      <div class="sign-col"><div class="role">Người nhận tiền</div><div class="role-sub">Ngày ${today}</div><div class="sign-line">(Ký, ghi rõ họ tên)</div></div>
    </div>
  </div>
  <div class="bottom-bar">
    <div><div class="bottom-brand">Kiến Trúc Đô Thị SCT</div><div class="bottom-tagline">Cùng bạn xây dựng ước mơ</div></div>
    <div class="bottom-code">Mã: ${e.code} &nbsp;|&nbsp; ${today}</div>
  </div>
</div></body></html>`);
        w.document.close();
    };

    // --- Status badge helper ---
    const StatusBadge = ({ status }) => {
        const s = STATUS_STYLE[status] || {};
        return (
            <span style={{
                display: 'inline-block', fontSize: 11, fontWeight: 600,
                padding: '3px 10px', borderRadius: 20,
                background: s.bg || 'var(--bg-secondary)',
                color: s.color || 'var(--text-muted)',
                border: `1.5px solid ${s.border || 'var(--border)'}`,
                whiteSpace: 'nowrap',
            }}>{status}</span>
        );
    };

    const PriorityBadge = ({ priority }) => {
        const s = PRIORITY_STYLE[priority] || PRIORITY_STYLE['Thường'];
        if (priority === 'Thường') return null;
        return (
            <span style={{
                display: 'inline-block', fontSize: 10, fontWeight: 700,
                padding: '2px 8px', borderRadius: 20,
                background: s.bg, color: s.color,
                border: `1.5px solid ${s.border}`,
                whiteSpace: 'nowrap',
            }}>{priority === 'Khẩn' ? '⚡ Khẩn' : '↑ Cao'}</span>
        );
    };

    return (
        <div>
            {/* Breadcrumb */}
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>Tài chính</span>
                <span style={{ color: 'var(--border)' }}>›</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Chi phí</span>
            </div>

            {/* Action cards - clickable workflow status cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
                {/* Cần duyệt ngay */}
                <div
                    className="card"
                    onClick={() => setActionFilter('Chờ duyệt')}
                    style={{
                        padding: '14px 18px', borderRadius: 12, cursor: 'pointer',
                        border: pendingList.length > 0 ? '2px solid #FF9800' : '1px solid var(--border)',
                        transition: 'box-shadow 0.15s',
                        background: pendingList.length > 0 ? '#FFFBF0' : undefined,
                    }}
                    onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(255,152,0,.25)'}
                    onMouseLeave={e => e.currentTarget.style.boxShadow = ''}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#E65100', textTransform: 'uppercase', letterSpacing: 0.5 }}>Cần duyệt ngay</div>
                        {pendingList.length > 0 && (
                            <span style={{ background: '#FF9800', color: '#fff', borderRadius: 20, padding: '1px 8px', fontSize: 11, fontWeight: 700 }}>{pendingList.length}</span>
                        )}
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: pendingList.length > 0 ? '#BF360C' : 'var(--text-muted)' }}>{pendingList.length} lệnh</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{fmt(pendingList.reduce((s, e) => s + e.amount, 0))}</div>
                    <div style={{ fontSize: 11, color: '#FF9800', marginTop: 6, fontWeight: 500 }}>→ Chờ KT trưởng / GĐ duyệt</div>
                </div>

                {/* Chờ chi tiền */}
                <div
                    className="card"
                    onClick={() => setActionFilter('Đã duyệt')}
                    style={{
                        padding: '14px 18px', borderRadius: 12, cursor: 'pointer',
                        border: approvedList.length > 0 ? '2px solid #42A5F5' : '1px solid var(--border)',
                        transition: 'box-shadow 0.15s',
                        background: approvedList.length > 0 ? '#F0F8FF' : undefined,
                    }}
                    onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(66,165,245,.25)'}
                    onMouseLeave={e => e.currentTarget.style.boxShadow = ''}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#0D47A1', textTransform: 'uppercase', letterSpacing: 0.5 }}>Chờ chi tiền</div>
                        {approvedList.length > 0 && (
                            <span style={{ background: '#42A5F5', color: '#fff', borderRadius: 20, padding: '1px 8px', fontSize: 11, fontWeight: 700 }}>{approvedList.length}</span>
                        )}
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: approvedList.length > 0 ? '#0D47A1' : 'var(--text-muted)' }}>{approvedList.length} lệnh</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{fmt(approvedList.reduce((s, e) => s + e.amount, 0))}</div>
                    <div style={{ fontSize: 11, color: '#42A5F5', marginTop: 6, fontWeight: 500 }}>→ Đã duyệt, KT thực hiện chi</div>
                </div>

                {/* Chờ thanh toán */}
                <div
                    className="card"
                    onClick={() => setActionFilter('Chờ thanh toán')}
                    style={{
                        padding: '14px 18px', borderRadius: 12, cursor: 'pointer',
                        border: waitingList.length > 0 ? '2px solid #7E57C2' : '1px solid var(--border)',
                        transition: 'box-shadow 0.15s',
                        background: waitingList.length > 0 ? '#F3F0FF' : undefined,
                    }}
                    onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(126,87,194,.25)'}
                    onMouseLeave={e => e.currentTarget.style.boxShadow = ''}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#311B92', textTransform: 'uppercase', letterSpacing: 0.5 }}>Chờ thanh toán</div>
                        {waitingList.length > 0 && (
                            <span style={{ background: '#7E57C2', color: '#fff', borderRadius: 20, padding: '1px 8px', fontSize: 11, fontWeight: 700 }}>{waitingList.length}</span>
                        )}
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: waitingList.length > 0 ? '#311B92' : 'var(--text-muted)' }}>{waitingList.length} lệnh</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{fmt(waitingList.reduce((s, e) => s + e.amount, 0))}</div>
                    <div style={{ fontSize: 11, color: '#7E57C2', marginTop: 6, fontWeight: 500 }}>→ Đang chờ bên nhận thanh toán</div>
                </div>

                {/* Quá hạn */}
                <div
                    className="card"
                    onClick={() => setActionFilter('', 'quahan')}
                    style={{
                        padding: '14px 18px', borderRadius: 12, cursor: 'pointer',
                        border: overdueList.length > 0 ? '2px solid #EF5350' : '1px solid var(--border)',
                        transition: 'box-shadow 0.15s',
                        background: overdueList.length > 0 ? '#FFF5F5' : undefined,
                    }}
                    onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(239,83,80,.25)'}
                    onMouseLeave={e => e.currentTarget.style.boxShadow = ''}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#B71C1C', textTransform: 'uppercase', letterSpacing: 0.5 }}>Quá hạn xử lý</div>
                        {overdueList.length > 0 && (
                            <span style={{ background: '#EF5350', color: '#fff', borderRadius: 20, padding: '1px 8px', fontSize: 11, fontWeight: 700 }}>{overdueList.length}</span>
                        )}
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: overdueList.length > 0 ? '#B71C1C' : 'var(--text-muted)' }}>{overdueList.length} lệnh</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{fmt(overdueList.reduce((s, e) => s + e.amount, 0))}</div>
                    <div style={{ fontSize: 11, color: '#EF5350', marginTop: 6, fontWeight: 500 }}>→ Pending &gt; 5 ngày, cần đôn đốc</div>
                </div>
            </div>

            {/* Action buttons + Quick filter pills */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
                <button className="btn btn-primary" onClick={openCreate} style={{ fontWeight: 600 }}>+ Chi phí dự án</button>
                <button className="btn btn-ghost" onClick={() => { setForm({ ...emptyForm, expenseType: 'Công ty', category: 'Thuê văn phòng' }); setEditing(null); setShowModal(true); }} style={{ fontWeight: 600 }}>+ Chi phí chung</button>
                <div style={{ flex: 1 }} />
                {/* Quick filter pills */}
                {QUICK_FILTERS.map(qf => {
                    const active = quickFilter === qf.key;
                    return (
                        <button
                            key={qf.key}
                            onClick={() => { setQuickFilter(active ? '' : qf.key); setActiveTab(''); }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 5,
                                padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                                border: active ? `2px solid ${qf.dot}` : '1.5px solid var(--border)',
                                background: active ? `${qf.dot}18` : 'var(--bg-primary)',
                                color: active ? qf.dot : 'var(--text-muted)',
                                cursor: 'pointer', transition: 'all 0.15s',
                            }}
                        >
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: qf.dot, display: 'inline-block', flexShrink: 0 }} />
                            {qf.label}
                        </button>
                    );
                })}
            </div>

            {/* Main card with tabs + table */}
            <div className="card" style={{ borderRadius: 12, overflow: 'hidden' }}>
                {/* Tabs */}
                <div className="tab-bar-scroll" style={{ padding: '0 8px' }}>
                    {TABS.map(tab => {
                        const count = tab.key ? expenses.filter(e => e.status === tab.key).length : expenses.length;
                        const isActive = activeTab === tab.key && !quickFilter;
                        const needsAttention = (tab.key === 'Chờ duyệt' && pendingList.length > 0) || (tab.key === 'Chờ thanh toán' && waitingList.length > 0);
                        return (
                            <button
                                key={tab.key}
                                onClick={() => { setActiveTab(tab.key); setQuickFilter(''); }}
                                style={{
                                    padding: '14px 16px',
                                    border: 'none',
                                    background: 'transparent',
                                    cursor: 'pointer',
                                    fontSize: 13,
                                    fontWeight: isActive ? 600 : 400,
                                    color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)',
                                    borderBottom: isActive ? '2px solid var(--accent-primary)' : '2px solid transparent',
                                    marginBottom: -1,
                                    whiteSpace: 'nowrap',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 5,
                                    transition: 'all 0.15s',
                                }}
                            >
                                {tab.label}
                                {count > 0 && (
                                    <span style={{
                                        background: needsAttention ? '#FF9800' : isActive ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                                        color: (needsAttention || isActive) ? '#fff' : 'var(--text-muted)',
                                        borderRadius: 10,
                                        fontSize: 10,
                                        padding: '1px 6px',
                                        fontWeight: 700,
                                        minWidth: 18,
                                        textAlign: 'center',
                                    }}>
                                        {count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Filter bar */}
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                        className="form-input"
                        placeholder="Tìm kiếm mã, mô tả..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ flex: 1, minWidth: 180 }}
                    />
                    <select className="form-select" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                        <option value="">Tất cả hạng mục</option>
                        {cats.map(c => <option key={c}>{c}</option>)}
                    </select>
                    <select className="form-select" value={filterProject} onChange={e => setFilterProject(e.target.value)}>
                        <option value="">Tất cả dự án</option>
                        {expProjects.map(p => <option key={p}>{p}</option>)}
                    </select>
                    {(activeTab || quickFilter || filterCategory || filterProject || search) && (
                        <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => { setActiveTab(''); setQuickFilter(''); setFilterCategory(''); setFilterProject(''); setSearch(''); }}
                            style={{ fontSize: 11, whiteSpace: 'nowrap' }}
                        >
                            ✕ Xóa filter
                        </button>
                    )}
                </div>

                {/* Summary bar */}
                <div style={{ padding: '8px 16px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ fontSize: 12 }}>
                        <span style={{ color: 'var(--text-muted)' }}>Hiển thị: </span>
                        <strong>{sortedFiltered.length}</strong>
                        <span style={{ color: 'var(--text-muted)' }}> / {expenses.length} lệnh</span>
                    </div>
                    <div style={{ fontSize: 12 }}>
                        <span style={{ color: 'var(--text-muted)' }}>Tổng: </span>
                        <strong style={{ color: 'var(--accent-primary)' }}>{fmt(sortedFiltered.reduce((s, e) => s + (e.amount || 0), 0))}</strong>
                    </div>
                    {quickFilter && (
                        <span style={{ fontSize: 11, padding: '2px 10px', borderRadius: 20, background: 'var(--accent-primary)', color: '#fff', fontWeight: 600 }}>
                            Filter: {QUICK_FILTERS.find(q => q.key === quickFilter)?.label}
                        </span>
                    )}
                </div>

                {/* Table */}
                {loading ? (
                    <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table" style={{ margin: 0 }}>
                            <thead>
                                <tr>
                                    <th style={{ minWidth: 64 }}>Mã</th>
                                    <th style={{ minWidth: 180 }}>Mô tả / Người đề nghị</th>
                                    <th style={{ minWidth: 120 }}>Dự án</th>
                                    <th style={{ minWidth: 110 }}>Hạng mục</th>
                                    <th style={{ minWidth: 120 }}>Số tiền</th>
                                    <th style={{ minWidth: 130 }}>Trạng thái</th>
                                    <th style={{ minWidth: 130 }}>Người giữ bước</th>
                                    <th style={{ minWidth: 80 }}>Pending</th>
                                    <th style={{ minWidth: 72 }}>Ưu tiên</th>
                                    <th style={{ minWidth: 100 }}>Nguồn tiền</th>
                                    <th style={{ minWidth: 84 }}>Ngày</th>
                                    <th style={{ minWidth: 160 }}>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedFiltered.map(e => {
                                    const days = daysPending(e);
                                    const priority = computePriority(e);
                                    const overdue = isOverdue(e);
                                    const rowBg = overdue && !['Hoàn thành', 'Từ chối', 'Đã thanh toán'].includes(e.status)
                                        ? 'rgba(239,83,80,.05)'
                                        : e.status === 'Chờ duyệt'
                                            ? 'rgba(255,152,0,.04)'
                                            : undefined;
                                    return (
                                        <tr key={e.id} style={{ opacity: e.status === 'Hoàn thành' ? 0.55 : 1, background: rowBg }}>
                                            {/* Mã */}
                                            <td className="accent" style={{ fontWeight: 700, fontSize: 12 }}>{e.code}</td>

                                            {/* Mô tả + người nộp */}
                                            <td style={{ cursor: (e.status === 'Chờ duyệt' || e.status === 'Từ chối') ? 'pointer' : 'default' }} onClick={() => openEdit(e)}>
                                                <div className="primary" style={{ fontWeight: 500, fontSize: 13 }}>{e.description}</div>
                                                {e.submittedBy && (
                                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                                        {e.recipientType && <span style={{ marginRight: 4, padding: '1px 5px', background: e.recipientType === 'NCC' ? '#e8f5e9' : '#fff3e0', color: e.recipientType === 'NCC' ? '#2e7d32' : '#e65100', borderRadius: 4, fontSize: 9, fontWeight: 600 }}>{e.recipientType}</span>}
                                                        {e.recipientName ? e.recipientName : e.submittedBy}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Dự án */}
                                            <td>
                                                {e.project ? (
                                                    <>
                                                        <span className="badge info" style={{ fontSize: 9, marginRight: 4 }}>{e.project.code}</span>
                                                        <span style={{ fontSize: 11 }}>{e.project.name}</span>
                                                    </>
                                                ) : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>}
                                            </td>

                                            {/* Hạng mục */}
                                            <td><span className="badge muted" style={{ fontSize: 11 }}>{e.category}</span></td>

                                            {/* Số tiền */}
                                            <td className="amount" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{fmt(e.amount)}</td>

                                            {/* Trạng thái — sát Số tiền */}
                                            <td>
                                                <select
                                                    value={e.status}
                                                    onChange={ev => updateStatus(e.id, ev.target.value)}
                                                    style={{
                                                        fontSize: 11, fontWeight: 600,
                                                        padding: '3px 8px', borderRadius: 20,
                                                        border: `1.5px solid ${STATUS_STYLE[e.status]?.border || 'var(--border)'}`,
                                                        background: STATUS_STYLE[e.status]?.bg || 'var(--bg-secondary)',
                                                        color: STATUS_STYLE[e.status]?.color || 'var(--text-primary)',
                                                        cursor: 'pointer', maxWidth: 150,
                                                        appearance: 'none', paddingRight: 20,
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
                                                {e.proofUrl && <a href={e.proofUrl} target="_blank" rel="noreferrer" title="Xem chứng từ" style={{ marginLeft: 4, fontSize: 14 }}>📎</a>}
                                            </td>

                                            {/* Người giữ bước */}
                                            <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                                {HOLDER_BY_STATUS[e.status] || '—'}
                                            </td>

                                            {/* Số ngày pending */}
                                            <td>
                                                {days !== null ? (
                                                    <span style={{
                                                        display: 'inline-block', fontSize: 11, fontWeight: 700,
                                                        padding: '2px 8px', borderRadius: 20,
                                                        background: days > 10 ? '#FFEBEE' : days > 5 ? '#FFF8E1' : 'var(--bg-secondary)',
                                                        color: days > 10 ? '#C62828' : days > 5 ? '#E65100' : 'var(--text-muted)',
                                                        border: `1px solid ${days > 10 ? '#EF5350' : days > 5 ? '#FFA726' : 'var(--border)'}`,
                                                    }}>
                                                        {days}d
                                                    </span>
                                                ) : (
                                                    <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>
                                                )}
                                            </td>

                                            {/* Mức ưu tiên */}
                                            <td>
                                                <PriorityBadge priority={priority} />
                                            </td>

                                            {/* Nguồn tiền */}
                                            <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                                {e.fundSource || '—'}
                                            </td>

                                            {/* Ngày */}
                                            <td style={{ fontSize: 11 }}>{fmtDate(e.date)}</td>

                                            {/* Thao tác */}
                                            <td>
                                                <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                                                    <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => openEdit(e)} title="Chỉnh sửa">✏️</button>
                                                    {e.status === 'Chờ duyệt' && (<>
                                                        <button className="btn btn-sm" style={{ background: 'var(--status-success)', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: 6, fontSize: 11, cursor: 'pointer' }} onClick={() => updateStatus(e.id, 'Đã duyệt')}>✓ Duyệt</button>
                                                        <button className="btn btn-sm" style={{ background: 'var(--status-danger)', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: 6, fontSize: 11, cursor: 'pointer' }} onClick={() => updateStatus(e.id, 'Từ chối')}>✗</button>
                                                    </>)}
                                                    {e.status === 'Đã duyệt' && (
                                                        <button className="btn btn-sm" style={{ background: 'var(--accent-primary)', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: 6, fontSize: 11, cursor: 'pointer' }} onClick={() => openProofModal(e)}>💸 Chi</button>
                                                    )}
                                                    {e.status === 'Đã chi' && (
                                                        <button className="btn btn-sm" style={{ background: 'var(--status-success)', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: 6, fontSize: 11, cursor: 'pointer' }} onClick={() => updateStatus(e.id, 'Hoàn thành')}>✅</button>
                                                    )}
                                                    {e.status === 'Chờ thanh toán' && (
                                                        <button className="btn btn-sm" style={{ background: 'var(--status-success)', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: 6, fontSize: 11, cursor: 'pointer' }} onClick={() => updateStatus(e.id, 'Đã thanh toán')}>✓ TT</button>
                                                    )}
                                                    {e.status === 'Đã thanh toán' && (
                                                        <button className="btn btn-sm" style={{ background: 'var(--status-success)', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: 6, fontSize: 11, cursor: 'pointer' }} onClick={() => updateStatus(e.id, 'Hoàn thành')}>✅</button>
                                                    )}
                                                    {e.status === 'Từ chối' && (
                                                        <button className="btn btn-sm" style={{ background: 'var(--status-warning)', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: 6, fontSize: 11, cursor: 'pointer' }} onClick={() => updateStatus(e.id, 'Chờ duyệt')}>↩</button>
                                                    )}
                                                    {(e.status === 'Đã chi' || e.status === 'Hoàn thành' || e.status === 'Đã thanh toán') && (
                                                        <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => printExpenseVoucher(e)}>🧾</button>
                                                    )}
                                                    <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(e.id)} style={{ color: 'var(--status-danger)', fontSize: 11 }}>🗑️</button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
                {!loading && sortedFiltered.length === 0 && (
                    <div style={{ color: 'var(--text-muted)', padding: 40, textAlign: 'center', fontSize: 14 }}>Không có dữ liệu</div>
                )}
            </div>

            {/* Modal tạo/sửa lệnh chi */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 580 }}>
                        <div className="modal-header">
                            <h3>{editing ? '✏️ Sửa lệnh chi' : '+ Tạo lệnh chi tiền'}</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            {/* Loại chi phí */}
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
                                    <label className="form-label">Nguồn tiền</label>
                                    <select className="form-select" value={form.fundSource} onChange={e => setForm({ ...form, fundSource: e.target.value })}>
                                        <option value="">— Chọn nguồn —</option>
                                        {FUND_SOURCES.map(f => <option key={f}>{f}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Mức ưu tiên</label>
                                    <select className="form-select" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                                        <option value="Thường">Thường</option>
                                        <option value="Cao">Cao</option>
                                        <option value="Khẩn">Khẩn</option>
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
                                <div><strong>Dự án:</strong> {proofModal.project?.name || '—'}</div>
                                <div><strong>Số tiền chi:</strong> <span style={{ fontWeight: 700, color: 'var(--status-danger)' }}>{fmt(proofModal.amount)}</span></div>
                                {proofModal.fundSource && <div><strong>Nguồn tiền:</strong> {proofModal.fundSource}</div>}
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
