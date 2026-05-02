'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DocumentManager from '@/components/documents/DocumentManager';
import ScheduleManager from '@/components/schedule/ScheduleManager';
import JournalTab from '@/components/journal/JournalTab';
import BudgetLockBar from '@/components/budget/BudgetLockBar';
import VarianceTable from '@/components/budget/VarianceTable';
import ProfitabilityWidget from '@/components/budget/ProfitabilityWidget';
import BudgetQuickAdd from '@/components/budget/BudgetQuickAdd';
import SCurveChart from '@/components/budget/SCurveChart';
import BudgetEstimateForm from '@/components/budget/BudgetEstimateForm';
import BudgetEstimateTable from '@/components/budget/BudgetEstimateTable';
import ProductionCostTable from '@/components/budget/ProductionCostTable';
import MeasurementSheet, { MeasurementActions } from '@/components/contractor/MeasurementSheet';
import ProjectChatPanel from '@/components/ProjectChatPanel';
import { useSession } from 'next-auth/react';

// Banner chia sẻ link + QR cho khách hàng
function CustomerShareBanner({ projectCode }) {
    const [copied, setCopied] = useState(false);
    const [showQR, setShowQR] = useState(false);
    const link = typeof window !== 'undefined'
        ? `${window.location.origin}/progress/${projectCode}`
        : `/progress/${projectCode}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(link)}`;

    const copy = () => {
        navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const print = () => {
        const win = window.open('', '_blank');
        win.document.write(`
            <html><head><title>QR - ${projectCode}</title>
            <style>body{font-family:sans-serif;text-align:center;padding:40px} h2{color:#1C3A6B} p{color:#555;font-size:14px} img{margin:20px auto;display:block;border:1px solid #eee;border-radius:8px} .link{background:#f3f4f6;padding:10px 16px;border-radius:8px;font-size:13px;word-break:break-all;margin:16px auto;max-width:400px}</style>
            </head><body>
            <h2>Theo dõi tiến độ dự án</h2>
            <p>Mã dự án: <strong>${projectCode}</strong></p>
            <img src="${qrUrl}&size=250x250" width="250" height="250" />
            <div class="link">${link}</div>
            <p style="font-size:12px;color:#999">Quét mã QR hoặc truy cập đường link để xem tiến độ & chat với đội thi công</p>
            </body></html>
        `);
        win.document.close();
        win.print();
    };

    return (
        <div style={{ padding: '12px 16px', background: '#f0f9ff', borderBottom: '1px solid #bae6fd', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {/* QR nhỏ */}
            <img src={`${qrUrl}&size=64x64`} width={64} height={64} alt="QR" onClick={() => setShowQR(true)}
                style={{ borderRadius: 8, border: '2px solid #0ea5e9', cursor: 'zoom-in', flexShrink: 0 }} title="Bấm để phóng to" />

            {/* Link + buttons */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#0369a1', marginBottom: 4 }}>🔗 Link theo dõi dự án cho khách hàng</div>
                <div style={{ fontSize: 12, color: '#374151', background: '#fff', border: '1px solid #bae6fd', borderRadius: 8, padding: '5px 10px', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {link}
                </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button onClick={copy}
                    style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #0ea5e9', background: copied ? '#0ea5e9' : '#fff', color: copied ? '#fff' : '#0369a1', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
                    {copied ? '✓ Đã copy' : '📋 Copy link'}
                </button>
                <button onClick={() => setShowQR(true)}
                    style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #0ea5e9', background: '#fff', color: '#0369a1', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    🔍 Xem QR
                </button>
                <button onClick={print}
                    style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #0ea5e9', background: '#fff', color: '#0369a1', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    🖨️ In QR
                </button>
            </div>

            {/* QR lightbox */}
            {showQR && (
                <>
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9000 }} onClick={() => setShowQR(false)} />
                    <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 9001, background: '#fff', borderRadius: 20, padding: 32, textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', minWidth: 280 }}>
                        <div style={{ fontWeight: 700, fontSize: 15, color: '#1C3A6B', marginBottom: 4 }}>QR Code — Dự án {projectCode}</div>
                        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 16 }}>Khách hàng quét để xem tiến độ & chat</div>
                        <img src={`${qrUrl}&size=220x220`} width={220} height={220} alt="QR" style={{ borderRadius: 12, border: '1px solid #e5e7eb' }} />
                        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 12, padding: '6px 10px', background: '#f9fafb', borderRadius: 8, wordBreak: 'break-all' }}>{link}</div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'center' }}>
                            <button onClick={copy} style={{ padding: '8px 16px', borderRadius: 8, background: copied ? '#0ea5e9' : '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                                {copied ? '✓ Đã copy' : '📋 Copy link'}
                            </button>
                            <button onClick={print} style={{ padding: '8px 16px', borderRadius: 8, background: '#1C3A6B', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                                🖨️ In QR
                            </button>
                        </div>
                        <button onClick={() => setShowQR(false)} style={{ position: 'absolute', top: 12, right: 14, background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#9ca3af' }}>×</button>
                    </div>
                </>
            )}
        </div>
    );
}

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
const pct = (a, b) => b > 0 ? Math.round((a / b) * 100) : 0;

const PIPELINE = [
    { key: 'Khảo sát', label: 'CRM', icon: '📊' },
    { key: 'Thiết kế', label: 'Thiết kế', icon: '🎨' },
    { key: 'Ký HĐ', label: 'Ký HĐ', icon: '📝' },
    { key: 'Đang thi công', label: 'Thi công', icon: '🔨' },
    { key: 'Bảo hành', label: 'Bảo hành', icon: '🛡️' },
    { key: 'Hoàn thành', label: 'Hậu mãi', icon: '✅' },
];

const STATUS_MAP = { 'Khảo sát': 0, 'Báo giá': 0, 'Thiết kế': 1, 'Chuẩn bị thi công': 2, 'Đang thi công': 3, 'Bảo hành': 4, 'Hoàn thành': 5 };

export default function ProjectDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const { data: session } = useSession();
    const [data, setData] = useState(null);
    const [tab, setTab] = useState('overview');
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(null);
    const [msSheet, setMsSheet] = useState(null);
    const [financeSubTab, setFinanceSubTab] = useState('payments');
    const [isMobile, setIsMobile] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [editForm, setEditForm] = useState({});
    const [saving, setSaving] = useState(false);
    const [contractForm, setContractForm] = useState({ name: '', type: 'Thi công thô', contractValue: '', signDate: '', startDate: '', endDate: '', paymentTerms: '', notes: '' });
    const [paymentPhases, setPaymentPhases] = useState([]);

    const PAYMENT_TEMPLATES = {
        'Thiết kế': [
            { phase: 'Đặt cọc thiết kế', pct: 50, category: 'Thiết kế' },
            { phase: 'Nghiệm thu bản vẽ', pct: 50, category: 'Thiết kế' },
        ],
        'Thi công thô': [
            { phase: 'Đặt cọc thi công', pct: 30, category: 'Thi công' },
            { phase: 'Hoàn thiện móng + khung', pct: 30, category: 'Thi công' },
            { phase: 'Hoàn thiện xây thô', pct: 30, category: 'Thi công' },
            { phase: 'Nghiệm thu bàn giao thô', pct: 10, category: 'Thi công' },
        ],
        'Thi công hoàn thiện': [
            { phase: 'Đặt cọc hoàn thiện', pct: 30, category: 'Hoàn thiện' },
            { phase: 'Hoàn thiện trát + ốp lát', pct: 25, category: 'Hoàn thiện' },
            { phase: 'Hoàn thiện sơn + điện nước', pct: 25, category: 'Hoàn thiện' },
            { phase: 'Nghiệm thu bàn giao', pct: 20, category: 'Hoàn thiện' },
        ],
        'Nội thất': [
            { phase: 'Đặt cọc nội thất', pct: 50, category: 'Nội thất' },
            { phase: 'Giao hàng + lắp đặt', pct: 40, category: 'Nội thất' },
            { phase: 'Nghiệm thu hoàn thiện', pct: 10, category: 'Nội thất' },
        ],
    };

    // Auto-populate phases when type changes
    const setTypeAndPhases = (type) => {
        const template = PAYMENT_TEMPLATES[type] || [];
        const val = Number(contractForm.contractValue) || 0;
        setContractForm({ ...contractForm, type, name: '' });
        setPaymentPhases(template.map(t => ({ ...t, amount: Math.round(val * t.pct / 100) })));
    };

    // Recalculate amounts when value changes
    const setValueAndRecalc = (contractValue) => {
        const val = Number(contractValue) || 0;
        setContractForm({ ...contractForm, contractValue });
        setPaymentPhases(prev => prev.map(p => ({ ...p, amount: Math.round(val * p.pct / 100) })));
    };

    const updatePhase = (idx, field, value) => {
        setPaymentPhases(prev => {
            const updated = [...prev];
            updated[idx] = { ...updated[idx], [field]: value };
            if (field === 'pct') {
                const val = Number(contractForm.contractValue) || 0;
                updated[idx].amount = Math.round(val * Number(value) / 100);
            }
            return updated;
        });
    };
    const removePhase = (idx) => setPaymentPhases(prev => prev.filter((_, i) => i !== idx));
    const addPhase = () => setPaymentPhases(prev => [...prev, { phase: `Đợt ${prev.length + 1}`, pct: 0, amount: 0, category: contractForm.type }]);
    const [woForm, setWoForm] = useState({ title: '', category: 'Thi công', priority: 'Trung bình', assignee: '', dueDate: '', description: '' });
    const [expenseForm, setExpenseForm] = useState({ description: '', category: 'Vận chuyển', amount: '', submittedBy: '' });
    const [logForm, setLogForm] = useState({ type: 'Điện thoại', content: '', createdBy: '' });
    const [cpForm, setCpForm] = useState({ contractorId: '', contractorName: '', contractAmount: '', paidAmount: '0', description: '', dueDate: '', status: 'Chưa TT' });
    const [contractorList, setContractorList] = useState([]);
    const [editCp, setEditCp] = useState(null); // full edit modal state
    const [ntModal, setNtModal] = useState(null); // cp object being viewed for nghiem thu
    const [ntForm, setNtForm] = useState({ description: '', unit: 'm²', quantity: '', unitPrice: '', notes: '' });
    const [savingNt, setSavingNt] = useState(false);
    const [matSearch, setMatSearch] = useState('');
    const [matStatusFilter, setMatStatusFilter] = useState('');
    const [matPoFilter, setMatPoFilter] = useState('');
    const fetchData = () => { fetch(`/api/projects/${id}`).then(r => r.ok ? r.json() : r.json().then(e => { throw new Error(e.error || `HTTP ${r.status}`); })).then(d => { setData(d); setLoading(false); }).catch(e => { console.error('[ProjectDetail]', e); setData({ _error: e.message }); setLoading(false); }); };
    useEffect(fetchData, [id]);
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    const openEdit = () => {
        if (!data) return;
        setEditForm({
            name: data.name || '', address: data.address || '', status: data.status || '',
            phase: data.phase || '', area: data.area ?? '', floors: data.floors ?? '',
            manager: data.manager || '', designer: data.designer || '', supervisor: data.supervisor || '',
            startDate: data.startDate ? data.startDate.slice(0, 10) : '',
            endDate: data.endDate ? data.endDate.slice(0, 10) : '',
            budget: data.budget ?? '', notes: data.notes || '',
        });
        setEditMode(true);
    };
    const saveProject = async () => {
        setSaving(true);
        const payload = { ...editForm };
        if (payload.area !== '') payload.area = Number(payload.area); else delete payload.area;
        if (payload.floors !== '') payload.floors = Number(payload.floors); else delete payload.floors;
        if (payload.budget !== '') payload.budget = Number(payload.budget); else delete payload.budget;
        if (!payload.startDate) delete payload.startDate;
        if (!payload.endDate) delete payload.endDate;
        const res = await fetch(`/api/projects/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        setSaving(false);
        if (!res.ok) { const err = await res.json(); return alert(err.error || 'Lỗi lưu dự án'); }
        setEditMode(false); fetchData();
    };

    const updateMilestone = async (msId, progress) => {
        await fetch(`/api/milestones/${msId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ progress: Number(progress), status: Number(progress) === 100 ? 'Hoàn thành' : Number(progress) > 0 ? 'Đang làm' : 'Chưa bắt đầu' }) });
        fetchData();
    };

    const updateWorkOrder = async (woId, status) => {
        await fetch(`/api/work-orders/${woId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
        fetchData();
    };

    const CONTRACT_TYPES = ['Thiết kế', 'Thi công thô', 'Thi công hoàn thiện', 'Nội thất'];
    const createContract = async () => {
        const cName = contractForm.name.trim() || `HĐ ${contractForm.type} - ${p.name}`;
        const res = await fetch('/api/contracts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...contractForm, name: cName, contractValue: Number(contractForm.contractValue) || 0, projectId: id, customerId: data.customerId, paymentPhases }) });
        if (!res.ok) { const err = await res.json(); return alert(err.error || 'Lỗi tạo HĐ'); }
        setModal(null); setContractForm({ name: '', type: 'Thi công thô', contractValue: '', signDate: '', startDate: '', endDate: '', paymentTerms: '', notes: '' }); setPaymentPhases([]); fetchData();
    };
    const createWorkOrder = async () => {
        await fetch('/api/work-orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...woForm, projectId: id }) });
        setModal(null); setWoForm({ title: '', category: 'Thi công', priority: 'Trung bình', assignee: '', dueDate: '', description: '' }); fetchData();
    };
    const createExpense = async () => {
        await fetch('/api/project-expenses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...expenseForm, amount: Number(expenseForm.amount) || 0, projectId: id }) });
        setModal(null); setExpenseForm({ description: '', category: 'Vận chuyển', amount: '', submittedBy: '' }); fetchData();
    };
    const createTrackingLog = async () => {
        await fetch('/api/tracking-logs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...logForm, projectId: id }) });
        setModal(null); setLogForm({ type: 'Điện thoại', content: '', createdBy: '' }); fetchData();
    };

    const openCpModal = async () => {
        if (contractorList.length === 0) {
            const res = await fetch('/api/contractors?limit=500');
            const json = await res.json();
            setContractorList(json.data || []);
        }
        setCpForm({ contractorId: '', contractorName: '', contractAmount: '', paidAmount: '0', description: '', dueDate: '', status: 'Chưa TT' });
        setModal('contractor_pay');
    };
    const createContractorPayment = async () => {
        const name = cpForm.contractorName.trim();
        if (!name) return alert('Nhập tên thầu phụ!');
        if (!cpForm.contractAmount) return alert('Nhập giá trị hợp đồng!');

        // Tìm contractor khớp tên trong danh sách (không phân biệt hoa thường)
        let contractorId = cpForm.contractorId;
        if (!contractorId) {
            const match = contractorList.find(c => c.name.toLowerCase() === name.toLowerCase());
            if (match) {
                contractorId = match.id;
            } else {
                // Tạo mới contractor tự động
                const cr = await fetch('/api/contractors', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, type: 'Khác' }) });
                if (!cr.ok) return alert('Lỗi tạo thầu phụ mới');
                const newC = await cr.json();
                contractorId = newC.id;
                setContractorList(prev => [...prev, newC]);
            }
        }

        const res = await fetch('/api/contractor-payments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...cpForm, contractorId, projectId: id, contractAmount: Number(cpForm.contractAmount), paidAmount: Number(cpForm.paidAmount) || 0 }) });
        if (!res.ok) return alert('Lỗi tạo thầu phụ');
        setModal(null); fetchData();
    };
    const openEditCp = (cp) => {
        setEditCp({
            id: cp.id,
            contractorName: cp.contractor?.name || '',
            contractAmount: cp.contractAmount,
            paidAmount: cp.paidAmount,
            description: cp.description || '',
            dueDate: cp.dueDate ? cp.dueDate.split('T')[0] : '',
            status: cp.status,
        });
    };
    const updateCpPaid = async () => {
        if (!editCp) return;
        const res = await fetch(`/api/contractor-payments/${editCp.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contractAmount: Number(editCp.contractAmount),
                paidAmount: Number(editCp.paidAmount),
                description: editCp.description,
                dueDate: editCp.dueDate || null,
                status: editCp.status,
            }),
        });
        if (!res.ok) return alert('Lỗi cập nhật thầu phụ');
        setEditCp(null); fetchData();
    };
    const deleteCp = async (cpId) => {
        if (!confirm('Xóa thầu phụ này khỏi dự án?')) return;
        await fetch(`/api/contractor-payments/${cpId}`, { method: 'DELETE' });
        fetchData();
    };
    const openNtModal = (cp) => {
        setNtModal(cp);
        setNtForm({ description: '', unit: 'm²', quantity: '', unitPrice: '', notes: '' });
    };
    const refreshNtModal = async (cpId) => {
        const res = await fetch(`/api/contractor-payments/${cpId}`);
        if (res.ok) setNtModal(await res.json());
        fetchData();
    };
    const addNtItem = async () => {
        if (!ntForm.description.trim()) return alert('Nhập tên hạng mục!');
        if (!ntForm.quantity || !ntForm.unitPrice) return alert('Nhập khối lượng và đơn giá!');
        setSavingNt(true);
        await fetch(`/api/contractor-payments/${ntModal.id}/items`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...ntForm, quantity: Number(ntForm.quantity), unitPrice: Number(ntForm.unitPrice) }) });
        setSavingNt(false);
        setNtForm({ description: '', unit: 'm²', quantity: '', unitPrice: '', notes: '' });
        refreshNtModal(ntModal.id);
    };
    const deleteNtItem = async (itemId) => {
        if (!confirm('Xóa hạng mục này?')) return;
        await fetch(`/api/contractor-payments/${ntModal.id}/items/${itemId}`, { method: 'DELETE' });
        refreshNtModal(ntModal.id);
    };

    // PO from materials
    const [poForm, setPoForm] = useState({ supplier: '', supplierId: '', deliveryDate: '', notes: '', deliveryType: 'Giao thẳng dự án', deliveryAddress: '' });
    const [poItems, setPoItems] = useState([]);
    const [newPoItem, setNewPoItem] = useState({ productName: '', unit: '', quantity: '', unitPrice: '' });
    const [editingPoId, setEditingPoId] = useState(null);
    const [suppliers, setSuppliers] = useState([]);
    const [supplierSearch, setSupplierSearch] = useState('');
    const openPOModal = async () => {
        if (suppliers.length === 0) {
            const res = await fetch('/api/suppliers?limit=500');
            const json = await res.json();
            setSuppliers(json.data || json || []);
        }
        const unordered = (data?.materialPlans || []).filter(m => m.status === 'Chưa đặt' || m.status === 'Đặt một phần');
        setPoItems(unordered.map(m => ({ productName: m.product?.name || '', unit: m.product?.unit || '', quantity: m.quantity - m.orderedQty, unitPrice: m.unitPrice || 0, amount: (m.quantity - m.orderedQty) * (m.unitPrice || 0), productId: m.productId, _mpId: m.id })));
        setPoForm({ supplier: '', supplierId: '', deliveryDate: '', notes: '', deliveryType: 'Giao thẳng dự án', deliveryAddress: data?.address || '' });
        setSupplierSearch('');
        setNewPoItem({ productName: '', unit: '', quantity: '', unitPrice: '' });
        setEditingPoId(null);
        setModal('po');
    };
    const printPO = (po) => {
        const sup = po.supplierRel || {};
        const fmtN = (n) => new Intl.NumberFormat('vi-VN').format(n || 0);
        const fmtC = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Math.round(n || 0));
        const fmtD = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
        // Number to Vietnamese words
        const numToWords = (n) => {
            if (!n || n === 0) return 'Không đồng';
            const u = ['', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
            const rg = (num, lz) => { const h=Math.floor(num/100),t=Math.floor((num%100)/10),o=num%10; let s=''; if(h)s+=u[h]+' trăm '; if(t===0){if(o)s+=(h||lz?'lẻ ':'')+u[o]+' ';}else if(t===1){s+='mười '+(o===5?'lăm ':o?u[o]+' ':'');}else{s+=u[t]+' mươi '+(o===1?'mốt ':o===5?'lăm ':o?u[o]+' ':'');} return s; };
            const ty=Math.floor(n/1e9),tr=Math.floor((n%1e9)/1e6),ng=Math.floor((n%1e6)/1e3),rm=n%1e3;
            let r=''; if(ty)r+=rg(ty,false)+'tỷ '; if(tr)r+=rg(tr,!!ty)+'triệu '; if(ng)r+=rg(ng,!!(ty||tr))+'nghìn '; if(rm)r+=rg(rm,!!(ty||tr||ng));
            r=r.trim(); return r.charAt(0).toUpperCase()+r.slice(1)+' đồng';
        };
        const logoSvg = `<svg width="52" height="52" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" rx="10" fill="#E05B0A"/><rect x="20" y="18" width="18" height="64" rx="2" fill="white"/><polygon points="38,50 72,18 88,18 55,50" fill="white"/><polygon points="38,50 72,82 88,82 55,50" fill="white"/><polygon points="38,50 55,40 55,60" fill="#E05B0A"/></svg>`;
        const rows = (po.items || []).map((it, i) => `
            <tr class="${i % 2 === 1 ? 'alt' : ''}">
                <td class="center">${i + 1}</td>
                <td>${it.productName || ''}</td>
                <td class="center">${it.unit || ''}</td>
                <td class="num">${fmtN(it.quantity)}</td>
                <td class="num">${fmtN(it.unitPrice)}</td>
                <td class="num bold">${fmtN(it.amount)}</td>
            </tr>`).join('');
        const statusColors = { 'Nháp':'#94a3b8','Chờ duyệt':'#f59e0b','Đang giao':'#3b82f6','Đã giao':'#10b981','Đã thanh toán':'#6366f1','Huỷ':'#ef4444' };
        const stColor = statusColors[po.status] || '#64748b';
        const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Phiếu mua hàng ${po.code}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@300;400;500;600;700;800&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Be Vietnam Pro',Arial,sans-serif;font-size:12.5px;color:#1e293b;background:#fff}
  .page{max-width:820px;margin:0 auto;padding:0}
  /* HEADER */
  .header{background:#1e3a5f;color:#fff;padding:18px 28px;display:flex;align-items:center;gap:18px;position:relative;overflow:hidden}
  .header::after{content:'SCT  ·  SCT  ·  SCT  ·  SCT  ·  SCT  ·  SCT  ·  SCT  ·  SCT  ·  SCT  ·  SCT';position:absolute;right:-10px;bottom:6px;font-size:9px;color:rgba(255,255,255,0.08);letter-spacing:4px;white-space:nowrap;text-transform:uppercase;font-weight:700}
  .logo-wrap{flex-shrink:0}
  .company-info{flex:1}
  .company-name{font-size:15px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;line-height:1.2}
  .company-name span{color:#E05B0A}
  .company-sub{font-size:10.5px;color:rgba(255,255,255,0.65);margin-top:3px}
  .doc-badge{flex-shrink:0;text-align:right}
  .doc-badge .doc-type{font-size:11px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1px}
  /* ORANGE ACCENT STRIP */
  .accent-strip{background:#E05B0A;height:4px}
  /* DOC TITLE SECTION */
  .title-section{background:#f8fafc;border-bottom:1px solid #e2e8f0;padding:16px 28px;display:flex;align-items:center;justify-content:space-between}
  .doc-title{font-size:20px;font-weight:800;color:#1e3a5f;text-transform:uppercase;letter-spacing:1px}
  .doc-meta{text-align:right;font-size:11.5px;color:#64748b;line-height:1.8}
  .doc-meta strong{color:#1e3a5f;font-weight:600}
  .status-pill{display:inline-block;padding:3px 10px;border-radius:20px;font-size:10.5px;font-weight:700;color:#fff;background:${stColor};margin-top:4px}
  /* BODY */
  .body{padding:18px 28px}
  /* INFO GRID */
  .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px}
  .info-card{border:1.5px solid #e2e8f0;border-radius:6px;overflow:hidden}
  .info-card-head{background:#1e3a5f;color:#fff;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;padding:6px 12px}
  .info-card-body{padding:10px 12px}
  .info-row{display:flex;gap:8px;margin-bottom:5px;font-size:12px;align-items:flex-start}
  .info-row:last-child{margin-bottom:0}
  .lbl{font-weight:600;color:#64748b;min-width:90px;flex-shrink:0;font-size:11px}
  .val{color:#1e293b;font-weight:500}
  .val.accent{color:#E05B0A;font-weight:700}
  /* TABLE */
  table{width:100%;border-collapse:collapse;margin-bottom:12px}
  thead tr{background:#1e3a5f}
  thead th{color:#fff;padding:9px 10px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.3px;border:none}
  thead th.center{text-align:center}
  thead th.num{text-align:right}
  tbody tr{border-bottom:1px solid #f1f5f9}
  tbody tr.alt{background:#f8fafc}
  tbody td{padding:8px 10px;font-size:12.5px;color:#1e293b;border:none}
  .center{text-align:center}.num{text-align:right}.bold{font-weight:700}
  /* TOTAL ROW */
  .total-row{background:#1e3a5f;color:#fff}
  .total-row td{padding:10px 10px;font-weight:700;font-size:13px;border:none}
  .total-row .num{color:#fff}
  .total-row .total-label{text-align:right;letter-spacing:0.5px;text-transform:uppercase;font-size:11px}
  .total-row .total-amt{font-size:15px;color:#fff}
  /* AMOUNT IN WORDS */
  .amt-words{background:#fff7ed;border:1.5px solid #fed7aa;border-radius:6px;padding:8px 14px;font-size:12px;color:#9a3412;margin-bottom:14px}
  .amt-words strong{font-weight:700}
  /* NOTES */
  .notes-box{border:1.5px solid #e2e8f0;border-radius:6px;padding:10px 14px;font-size:12px;color:#475569;margin-bottom:16px;background:#f8fafc}
  .notes-box strong{color:#1e3a5f;font-weight:700}
  /* SIGNATURES */
  .sig-section{margin-top:20px;margin-bottom:10px}
  .sig-date{text-align:right;font-size:11.5px;color:#64748b;margin-bottom:16px;font-style:italic}
  .sigs{display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;text-align:center}
  .sig-box{border:1.5px solid #e2e8f0;border-radius:6px;padding:12px 8px 8px;background:#fafafa}
  .sig-box h4{font-size:11.5px;font-weight:700;color:#1e3a5f;text-transform:uppercase;margin-bottom:3px}
  .sig-box p{font-size:10.5px;color:#94a3b8;margin-bottom:52px}
  .sig-box .sig-name{font-size:11px;color:#64748b;border-top:1px solid #e2e8f0;padding-top:6px;min-height:22px}
  /* FOOTER */
  .footer{background:#1e3a5f;color:rgba(255,255,255,0.55);font-size:10px;text-align:center;padding:10px 28px;display:flex;justify-content:space-between;align-items:center}
  .footer .footer-brand{color:#E05B0A;font-weight:700;font-size:11px}
  /* PRINT BUTTON */
  .print-btn{display:block;margin:20px auto 8px;padding:10px 32px;background:#E05B0A;color:#fff;border:none;border-radius:6px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;letter-spacing:0.5px}
  .print-btn:hover{background:#c74d08}
  @media print{
    .print-btn{display:none}
    body{font-size:11.5px}
    .header{-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .accent-strip,.total-row,thead tr,.info-card-head,.footer{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  }
</style></head><body>
<div class="page">
  <div class="header">
    <div class="logo-wrap">${logoSvg}</div>
    <div class="company-info">
      <div class="company-name">Kiến Trúc Đô Thị <span>SCT</span></div>
      <div class="company-sub">Thiết kế · Thi công · Nội thất trọn gói</div>
      <div class="company-sub" style="margin-top:2px">📞 (028) 6686 8888 &nbsp;|&nbsp; ✉ info@sct.vn &nbsp;|&nbsp; 🌐 www.sct.vn</div>
    </div>
    <div class="doc-badge">
      <div class="doc-type">Tài liệu nội bộ</div>
    </div>
  </div>
  <div class="accent-strip"></div>
  <div class="title-section">
    <div class="doc-title">Phiếu Mua Hàng</div>
    <div class="doc-meta">
      <div>Số phiếu: <strong>${po.code}</strong></div>
      <div>Ngày đặt: <strong>${fmtD(po.orderDate)}</strong></div>
      ${po.deliveryDate ? `<div>Giao dự kiến: <strong>${fmtD(po.deliveryDate)}</strong></div>` : ''}
      <div><span class="status-pill">${po.status || 'Nháp'}</span></div>
    </div>
  </div>
  <div class="body">
    <div class="info-grid">
      <div class="info-card">
        <div class="info-card-head">Nhà cung cấp</div>
        <div class="info-card-body">
          <div class="info-row"><span class="lbl">Tên NCC</span><span class="val accent">${po.supplier || '—'}</span></div>
          ${sup.phone ? `<div class="info-row"><span class="lbl">Điện thoại</span><span class="val">${sup.phone}</span></div>` : ''}
          ${sup.address ? `<div class="info-row"><span class="lbl">Địa chỉ</span><span class="val">${sup.address}</span></div>` : ''}
          ${sup.taxCode ? `<div class="info-row"><span class="lbl">MST</span><span class="val">${sup.taxCode}</span></div>` : ''}
          ${sup.bankAccount ? `<div class="info-row"><span class="lbl">TK Ngân hàng</span><span class="val">${sup.bankAccount}${sup.bankName ? ` — ${sup.bankName}` : ''}</span></div>` : ''}
        </div>
      </div>
      <div class="info-card">
        <div class="info-card-head">Thông tin giao hàng</div>
        <div class="info-card-body">
          ${po.project ? `<div class="info-row"><span class="lbl">Dự án</span><span class="val accent">${po.project.name || ''}</span></div>` : ''}
          <div class="info-row"><span class="lbl">Hình thức</span><span class="val">${po.deliveryType || '—'}</span></div>
          ${po.deliveryAddress ? `<div class="info-row"><span class="lbl">Địa chỉ GH</span><span class="val">${po.deliveryAddress}</span></div>` : ''}
          ${po.receivedDate ? `<div class="info-row"><span class="lbl">Ngày nhận</span><span class="val">${fmtD(po.receivedDate)}</span></div>` : ''}
        </div>
      </div>
    </div>
    <table>
      <thead><tr>
        <th class="center" style="width:36px">#</th>
        <th>Tên hàng hóa / Vật tư</th>
        <th class="center" style="width:52px">ĐVT</th>
        <th class="num" style="width:68px">Số lượng</th>
        <th class="num" style="width:115px">Đơn giá (VNĐ)</th>
        <th class="num" style="width:125px">Thành tiền (VNĐ)</th>
      </tr></thead>
      <tbody>${rows}</tbody>
      <tr class="total-row">
        <td colspan="5" class="total-label">Tổng cộng</td>
        <td class="num total-amt">${fmtC(po.totalAmount)}</td>
      </tr>
    </table>
    <div class="amt-words"><strong>Bằng chữ:</strong> ${numToWords(Math.round(po.totalAmount || 0))}</div>
    ${po.notes ? `<div class="notes-box"><strong>Ghi chú:</strong> ${po.notes}</div>` : ''}
    <div class="sig-section">
      <div class="sig-date">TP. Hồ Chí Minh, ngày ${new Date().getDate()} tháng ${new Date().getMonth() + 1} năm ${new Date().getFullYear()}</div>
      <div class="sigs">
        <div class="sig-box"><h4>Người lập phiếu</h4><p>(Ký, ghi rõ họ tên)</p><div class="sig-name"></div></div>
        <div class="sig-box"><h4>Giám đốc</h4><p>(Ký, đóng dấu)</p><div class="sig-name"></div></div>
        <div class="sig-box"><h4>Đại diện NCC</h4><p>(Ký, ghi rõ họ tên)</p><div class="sig-name"></div></div>
      </div>
    </div>
    <button class="print-btn" onclick="window.print()">🖨&nbsp; In phiếu mua hàng</button>
  </div>
  <div class="footer">
    <span class="footer-brand">KIẾN TRÚC ĐÔ THỊ SCT</span>
    <span>Phiếu mua hàng ${po.code} &nbsp;|&nbsp; Ngày in: ${new Date().toLocaleDateString('vi-VN')}</span>
    <span>Tài liệu nội bộ — không phát hành ra ngoài</span>
  </div>
</div>
</body></html>`;
        const w = window.open('', '_blank', 'width=900,height=750');
        w.document.write(html);
        w.document.close();
    };
    const updatePOItem = (idx, field, value) => {
        setPoItems(prev => { const u = [...prev]; u[idx] = { ...u[idx], [field]: value }; if (field === 'quantity' || field === 'unitPrice') u[idx].amount = (Number(u[idx].quantity) || 0) * (Number(u[idx].unitPrice) || 0); return u; });
    };
    const removePOItem = (idx) => setPoItems(prev => prev.filter((_, i) => i !== idx));
    const addNewPoItem = () => {
        setPoItems(prev => [...prev, { productName: '', unit: '', quantity: 0, unitPrice: 0, amount: 0, productId: null, _mpId: null }]);
    };
    const createPO = async () => {
        if (!poForm.supplier?.trim()) return alert('Vui lòng nhập nhà cung cấp');
        if (poItems.length === 0) return alert('Không có vật tư nào để đặt');
        const totalAmount = poItems.reduce((s, i) => s + (Number(i.amount) || 0), 0);
        if (editingPoId) {
            // UPDATE existing PO
            const res = await fetch(`/api/purchase-orders/${editingPoId}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...poForm,
                    items: poItems.map(({ _mpId, id: _id, purchaseOrderId: _pid, ...rest }) => ({ ...rest, quantity: Number(rest.quantity), unitPrice: Number(rest.unitPrice), amount: Number(rest.amount), materialPlanId: _mpId || undefined })),
                }),
            });
            if (!res.ok) { const err = await res.json(); return alert(err.error || 'Lỗi cập nhật PO'); }
            setModal(null); setPoItems([]); setNewPoItem({ productName: '', unit: '', quantity: '', unitPrice: '' }); setEditingPoId(null); fetchData();
            return;
        }
        const res = await fetch('/api/purchase-orders', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...poForm, projectId: id, totalAmount,
                items: poItems.map(({ _mpId, ...rest }) => ({ ...rest, quantity: Number(rest.quantity), unitPrice: Number(rest.unitPrice), amount: Number(rest.amount), materialPlanId: _mpId || undefined })),
            }),
        });
        if (!res.ok) { const err = await res.json(); return alert(err.error || 'Lỗi tạo PO'); }
        // Update material plan ordered quantities
        for (const item of poItems) {
            if (item._mpId) {
                const plan = data.materialPlans.find(m => m.id === item._mpId);
                const newOrdered = (plan?.orderedQty || 0) + Number(item.quantity);
                const newStatus = newOrdered >= (plan?.quantity || 0) ? 'Đã đặt đủ' : 'Đặt một phần';
                await fetch(`/api/material-plans/${item._mpId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderedQty: newOrdered, status: newStatus }) }).catch(() => { });
            }
        }
        setModal(null); setPoItems([]); setNewPoItem({ productName: '', unit: '', quantity: '', unitPrice: '' }); fetchData(); setTab('purchase');
    };
    const openEditPO = async (po) => {
        if (suppliers.length === 0) {
            const res = await fetch('/api/suppliers?limit=500');
            if (res.ok) setSuppliers((await res.json()).data || []);
        }
        setEditingPoId(po.id);
        setPoForm({
            supplier: po.supplier || '',
            supplierId: po.supplierId || '',
            deliveryDate: po.deliveryDate ? po.deliveryDate.slice(0, 10) : '',
            notes: po.notes || '',
            deliveryType: po.deliveryType || 'Giao thẳng dự án',
            deliveryAddress: po.deliveryAddress || '',
        });
        setPoItems((po.items || []).map(i => ({ ...i, _mpId: i.materialPlanId || null })));
        setSupplierSearch(po.supplier || '');
        setNewPoItem({ productName: '', unit: '', quantity: '', unitPrice: '' });
        setModal('po');
    };

    // Add Material Plan
    const [mpForm, setMpForm] = useState({ productId: '', quantity: 1, unitPrice: 0, type: 'Chính', notes: '' });
    const [mpProducts, setMpProducts] = useState([]);
    const [varianceKey, setVarianceKey] = useState(0);
    const [mpSearch, setMpSearch] = useState('');
    const openMPModal = async () => {
        if (mpProducts.length === 0) {
            const res = await fetch('/api/products?limit=500');
            const json = await res.json();
            setMpProducts(json.data || json || []);
        }
        setMpForm({ productId: '', quantity: 1, unitPrice: 0, type: 'Chính', notes: '' });
        setMpSearch('');
        setModal('mp');
    };
    const saveMaterialPlan = async () => {
        if (!mpForm.productId) return alert('Chọn sản phẩm');
        if (!mpForm.quantity || mpForm.quantity <= 0) return alert('Số lượng phải > 0');
        const res = await fetch('/api/material-plans', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...mpForm, projectId: id, quantity: Number(mpForm.quantity), unitPrice: Number(mpForm.unitPrice) || 0 }),
        });
        if (!res.ok) { const err = await res.json(); return alert(err.error || 'Lỗi thêm vật tư'); }
        setModal(null); fetchData();
    };
    const deleteMaterialPlan = async (planId) => {
        if (!confirm('Xóa kế hoạch vật tư này?')) return;
        await fetch(`/api/material-plans/${planId}`, { method: 'DELETE' });
        fetchData();
    };
    const deleteAllMaterialPlans = async () => {
        if (!confirm(`Xóa toàn bộ ${p.materialPlans.length} kế hoạch vật tư của dự án này? Hành động không thể hoàn tác.`)) return;
        await fetch(`/api/material-plans?projectId=${id}`, { method: 'DELETE' });
        fetchData();
    };

    const [quotationImportRows, setQuotationImportRows] = useState(null);
    const [liveBudgetTotal, setLiveBudgetTotal] = useState(null);

    // Bulk import material plans from quotation items → open BudgetQuickAdd pre-filled
    const importMPFromQuotation = async () => {
        const quotations = data?.quotations || [];
        if (quotations.length === 0) return alert('Dự án chưa có báo giá nào');

        // Fetch products for name matching
        let allProducts = mpProducts;
        if (allProducts.length === 0) {
            const res = await fetch('/api/products?limit=2000');
            const json = await res.json();
            allProducts = json.data || json || [];
            setMpProducts(allProducts);
        }
        const productByName = {};
        allProducts.forEach(p => { productByName[p.name.toLowerCase().trim()] = p; });

        const seen = new Set();
        const rows = [];
        for (const q of quotations) {
            const allItems = [...(q.items || [])];
            for (const cat of (q.categories || [])) {
                for (const item of (cat.items || [])) {
                    if (!allItems.find(i => i.id === item.id)) allItems.push(item);
                }
            }
            for (const item of allItems) {
                if (item.parentItemId) continue;
                if (!item.name) continue;
                const key = item.productId || item.name;
                if (seen.has(key)) continue;
                seen.add(key);

                let productId = item.productId || '';
                let productName = item.name || '';
                let unit = item.unit || '';
                // Try name match
                if (!productId) {
                    const match = productByName[item.name.toLowerCase().trim()];
                    if (match) { productId = match.id; unit = match.unit || unit; }
                }
                rows.push({
                    productId,
                    productName,
                    unit,
                    quantity: item.volume || item.quantity || 1,
                    unitPrice: item.unitPrice || 0,
                    actualCost: 0,
                    actualUnitPrice: 0,
                    notes: `Từ ${q.code || 'Báo giá'}`,
                    category: '',
                    costType: 'Tháo dỡ',
                    group1: '',
                    group2: '',
                    supplierTag: '',
                    _key: Date.now() + Math.random(),
                });
            }
        }
        if (rows.length === 0) return alert('Báo giá không có hạng mục nào');
        setQuotationImportRows(rows);
        setModal('budget_quick');
    };

    // Material Requisition
    const [reqForm, setReqForm] = useState({ materialPlanId: '', requestedQty: '', requestedDate: '', notes: '', createdBy: '' });
    const openReqModal = (plan) => {
        const remaining = plan.quantity - plan.orderedQty;
        setReqForm({ materialPlanId: plan.id, requestedQty: remaining > 0 ? remaining : 1, requestedDate: '', notes: '', createdBy: '' });
        setModal('req');
    };
    const createRequisition = async () => {
        if (!reqForm.requestedQty || reqForm.requestedQty <= 0) return alert('Số lượng không hợp lệ');
        const res = await fetch('/api/material-requisitions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...reqForm, requestedQty: Number(reqForm.requestedQty), projectId: id }) });
        if (!res.ok) { const err = await res.json(); return alert(err.error || 'Lỗi tạo phiếu yêu cầu'); }
        const result = await res.json();
        if (result.overBudget) alert('⚠️ Yêu cầu vượt dự toán! Phiếu cần được PM phê duyệt trước khi Kế toán mua hàng.');
        setModal(null); fetchData();
    };

    // GRN - Goods Receipt Note (Nghiệm thu)
    const [grn, setGrn] = useState(null); // { po, items: [{...poItem, actualQty}] }
    const openGRN = (po) => {
        setGrn({ po, items: po.items.map(i => ({ ...i, actualQty: i.quantity - i.receivedQty })) });
        setModal('grn');
    };
    const updateGRNItem = (idx, val) => setGrn(g => { const items = [...g.items]; items[idx] = { ...items[idx], actualQty: val }; return { ...g, items }; });
    const confirmGRN = async () => {
        const itemsToReceive = grn.items.filter(i => Number(i.actualQty) > 0).map(i => ({ id: i.id, receivedQty: Number(i.actualQty) }));
        if (itemsToReceive.length === 0) return alert('Nhập số lượng thực nhận');
        const res = await fetch(`/api/purchase-orders/${grn.po.id}/receive`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: itemsToReceive, note: grn.note || '' }) });
        if (!res.ok) { const err = await res.json(); return alert(err.error || 'Lỗi nghiệm thu'); }
        setModal(null); setGrn(null); fetchData();
    };
    const approvePO = async (poId) => {
        await fetch(`/api/purchase-orders/${poId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'Đang giao' }) });
        fetchData();
    };

    if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>;
    if (!data || data._error) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--status-danger)' }}>Lỗi tải dự án: {data?._error || 'Không xác định'}. <button className="btn btn-ghost" onClick={fetchData}>Thử lại</button></div>;
    const p = data;
    const pnl = p.pnl;
    const st = p.settlement;
    const pipelineIdx = STATUS_MAP[p.status] ?? 0;

    const userRole = session?.user?.role || '';
    const isXuong = userRole === 'xuong';
    const isXuongOrBGD = ['xuong', 'ban_gd', 'giam_doc', 'pho_gd'].includes(userRole);

    const tabs = [
        { key: 'overview', label: 'Tổng quan', icon: '📋' },
        { key: 'logs', label: 'Nhật ký', icon: '📒', count: p.trackingLogs?.length },
        { key: 'milestones', label: 'Tiến độ', icon: '📊', count: p.milestones?.length },
        isXuongOrBGD && { key: 'hachtoan', label: 'Hạch toán', icon: '📊' },
        !isXuong && { key: 'budget', label: 'Dự trù kinh phí', icon: '💰' },
        { key: 'contracts', label: 'Hợp đồng', icon: '📝', count: p.contracts?.length },
        { key: 'workorders', label: 'Phiếu CV', icon: '📋', count: p.workOrders?.length },
        { key: 'materials', label: 'Vật tư', icon: '🧱', count: p.materialPlans?.length },
        { key: 'purchase', label: 'Mua hàng', icon: '🛒', count: p.purchaseOrders?.length },
        { key: 'contractors', label: 'Thầu phụ', icon: '👷', count: p.contractorPays?.length },
        { key: 'finance', label: 'Tài chính', icon: '💰' },
        { key: 'documents', label: 'Tài liệu', icon: '📁', count: p.documents?.length },
        { key: 'journal', label: 'Nhật ký AI', icon: '🤖' },
        { key: 'chat', label: 'Chat KH', icon: '💬' },
    ].filter(Boolean);

    return (
        <div>
            <button className="btn btn-secondary" onClick={() => router.push('/projects')} style={{ marginBottom: 16 }}>← Quay lại</button>

            {/* Project Header */}
            <div className="card project-detail-header" style={{ marginBottom: 24 }}>
                {editMode ? (
                    /* ===== EDIT FORM ===== */
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h3 style={{ margin: 0, fontWeight: 700 }}>Chỉnh sửa thông tin dự án</h3>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button className="btn btn-secondary btn-sm" onClick={() => setEditMode(false)}>Hủy</button>
                                <button className="btn btn-primary btn-sm" onClick={saveProject} disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu'}</button>
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                            <div className="form-group">
                                <label className="form-label">Tên dự án *</label>
                                <input className="form-input" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Địa chỉ</label>
                                <input className="form-input" value={editForm.address} onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Trạng thái</label>
                                <select className="form-input" value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}>
                                    {['Khảo sát', 'Báo giá', 'Thiết kế', 'Chuẩn bị thi công', 'Đang thi công', 'Bảo hành', 'Hoàn thành'].map(s => <option key={s}>{s}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Giai đoạn</label>
                                <input className="form-input" value={editForm.phase} onChange={e => setEditForm(f => ({ ...f, phase: e.target.value }))} placeholder="VD: Hoàn thiện nội thất" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Diện tích (m²)</label>
                                <input className="form-input" type="number" value={editForm.area} onChange={e => setEditForm(f => ({ ...f, area: e.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Số tầng</label>
                                <input className="form-input" type="number" value={editForm.floors} onChange={e => setEditForm(f => ({ ...f, floors: e.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Ngân sách (đ)</label>
                                <input className="form-input" type="number" value={editForm.budget} onChange={e => setEditForm(f => ({ ...f, budget: e.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Ngày bắt đầu</label>
                                <input className="form-input" type="date" value={editForm.startDate} onChange={e => setEditForm(f => ({ ...f, startDate: e.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Ngày kết thúc</label>
                                <input className="form-input" type="date" value={editForm.endDate} onChange={e => setEditForm(f => ({ ...f, endDate: e.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Quản lý dự án (PM)</label>
                                <input className="form-input" value={editForm.manager} onChange={e => setEditForm(f => ({ ...f, manager: e.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Thiết kế</label>
                                <input className="form-input" value={editForm.designer} onChange={e => setEditForm(f => ({ ...f, designer: e.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Giám sát</label>
                                <input className="form-input" value={editForm.supervisor} onChange={e => setEditForm(f => ({ ...f, supervisor: e.target.value }))} />
                            </div>
                            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                <label className="form-label">Ghi chú</label>
                                <textarea className="form-input" rows={3} value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} />
                            </div>
                        </div>
                    </div>
                ) : (
                    /* ===== VIEW MODE ===== */
                    <>
                        <div className="project-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
                                    <span style={{ color: 'var(--text-accent)', fontSize: 14, fontWeight: 600 }}>{p.code}</span>
                                    <span className={`badge ${p.status === 'Hoàn thành' ? 'success' : p.status === 'Đang thi công' ? 'warning' : 'info'}`}>{p.status}</span>
                                    {p.phase && <span className="badge muted">{p.phase}</span>}
                                    {(() => {
                                        const now = new Date();
                                        const end = p.endDate ? new Date(p.endDate) : null;
                                        const overdueDays = end ? Math.ceil((now - end) / 86400000) : 0;
                                        const budgetRate = p.budget > 0 ? (p.spent / p.budget) * 100 : 0;
                                        const isDone = p.status === 'Hoàn thành';
                                        let health = 'success', healthLabel = '🟢 Bình thường', healthTitle = 'Dự án đang đúng tiến độ & ngân sách';
                                        if (!isDone && (overdueDays > 30 || budgetRate > 100)) {
                                            health = 'danger'; healthLabel = '🔴 Rủi ro cao'; healthTitle = overdueDays > 30 ? `Trễ ${overdueDays} ngày` : `Chi phí vượt ${Math.round(budgetRate)}% ngân sách`;
                                        } else if (!isDone && (overdueDays > 0 || budgetRate > 80)) {
                                            health = 'warning'; healthLabel = '🟡 Cần theo dõi'; healthTitle = overdueDays > 0 ? `Trễ ${overdueDays} ngày` : `Chi phí đạt ${Math.round(budgetRate)}% ngân sách`;
                                        }
                                        return <span className={`badge ${health}`} title={healthTitle}>{healthLabel}</span>;
                                    })()}
                                    {pnl?.profit != null && (pnl.profit >= 0 ? <span className="badge success">📈 Lãi {fmt(pnl.profit)}</span> : <span className="badge danger">📉 Lỗ {fmt(Math.abs(pnl.profit))}</span>)}
                                </div>
                                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{p.name}</h2>
                                <div style={{ color: 'var(--text-muted)', marginTop: 4, fontSize: 13 }}>{p.customer?.name} • {p.address}</div>
                                <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 12, color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                                    {p.manager && <span title="Quản lý dự án">👤 PM: <strong>{p.manager}</strong></span>}
                                    {p.designer && <span title="Thiết kế">🎨 TK: {p.designer}</span>}
                                    {p.supervisor && <span title="Giám sát">🔧 GS: {p.supervisor}</span>}
                                </div>
                                {(p.startDate || p.endDate) && (() => {
                                    const now = new Date();
                                    const end = p.endDate ? new Date(p.endDate) : null;
                                    const overdue = end && now > end && p.status !== 'Hoàn thành';
                                    const overdueDays = overdue ? Math.ceil((now - end) / 86400000) : 0;
                                    return (
                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6, fontSize: 12 }}>
                                            <span style={{ color: 'var(--text-muted)' }}>📅 {fmtDate(p.startDate)} → {fmtDate(p.endDate)}</span>
                                            {overdue && <span className="badge danger" style={{ fontSize: 11, animation: 'pulse 2s infinite' }}>⚠ Trễ {overdueDays} ngày</span>}
                                        </div>
                                    );
                                })()}
                            </div>
                            <div className="project-header-progress" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                                <button className="btn btn-secondary btn-sm" onClick={openEdit}>✏️ Chỉnh sửa</button>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{ fontSize: 28, fontWeight: 700 }}>{p.progress}%</div>
                                    <div className="progress-bar" style={{ width: 80 }}><div className="progress-fill" style={{ width: `${p.progress}%` }}></div></div>
                                </div>
                            </div>
                        </div>

                        {/* Pipeline */}
                        <div className="pipeline">
                            {PIPELINE.map((stage, i) => (
                                <div className="pipeline-step" key={stage.key}>
                                    <div className={`pipeline-node ${i === pipelineIdx ? 'active' : i < pipelineIdx ? 'completed' : ''}`}>
                                        <div className="pipeline-dot">{i < pipelineIdx ? '✓' : stage.icon}</div>
                                        <span className="pipeline-label">{stage.label}</span>
                                    </div>
                                    {i < PIPELINE.length - 1 && <div className={`pipeline-line ${i < pipelineIdx ? 'completed' : ''}`}></div>}
                                </div>
                            ))}
                        </div>

                        {/* Quick Stats */}
                        <div className="project-quick-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 8, marginTop: 8 }}>
                            {[
                                { v: p.area ? `${p.area}m²` : '—', l: 'Diện tích' }, { v: p.floors ? `${p.floors} tầng` : '—', l: 'Số tầng' },
                                { v: fmt(p.contractValue || 0), l: 'Giá trị HĐ' }, { v: fmt(p.paidAmount || 0), l: 'Đã thu' },
                                { v: fmt(pnl?.debtFromCustomer), l: 'KH còn nợ', c: (pnl?.debtFromCustomer ?? 0) > 0 ? 'var(--status-danger)' : 'var(--status-success)' }
                            ].map(s => (
                                <div key={s.l} style={{ textAlign: 'center', padding: '8px 0' }}>
                                    <div style={{ fontWeight: 700, fontSize: 15, color: s.c || 'var(--text-primary)' }}>{s.v}</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.l}</div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Tabs */}
            <div className="project-tabs">
                {tabs.map(t => (
                    <button key={t.key} className={`project-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
                        <span>{t.icon}</span><span className="tab-label">{t.label}</span>
                        {t.count > 0 && <span className="tab-count">{t.count}</span>}
                    </button>
                ))}
            </div>

            {/* TAB: Nhật ký */}
            {tab === 'logs' && (
                <div className="card" style={{ padding: 24 }}>
                    <div className="card-header"><span className="card-title">📒 Nhật ký theo dõi</span><button className="btn btn-primary btn-sm" onClick={() => setModal('log')}>+ Ghi chú</button></div>
                    {(p.trackingLogs || []).map(log => (
                        <div key={log.id} style={{ display: 'flex', gap: 14, padding: '14px 0', borderBottom: '1px solid var(--border-light)' }}>
                            <div style={{ width: 42, height: 42, borderRadius: 10, background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                                {log.type === 'Điện thoại' ? '📞' : log.type === 'Gặp mặt' ? '🤝' : log.type === 'Email' ? '📧' : '💬'}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 14, fontWeight: 600 }}>{log.content}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, display: 'flex', gap: 12 }}>
                                    <span>{log.createdBy || 'N/A'}</span>
                                    <span>{fmtDate(log.createdAt)}</span>
                                    <span className="badge muted" style={{ fontSize: 10 }}>{log.type}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                    {!(p.trackingLogs?.length) && <div style={{ color: 'var(--text-muted)', padding: 24, textAlign: 'center' }}>Chưa có nhật ký theo dõi</div>}
                </div>
            )}

            {/* TAB: Nhật ký AI */}
            {tab === 'journal' && (
                <div className="card" style={{ padding: 24 }}>
                    <JournalTab projectId={id} />
                </div>
            )}

            {/* TAB: Chat KH */}
            {tab === 'chat' && (
                <div className="card" style={{ overflow: 'hidden' }}>
                    {/* Header */}
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: '#1C3A6B', color: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 20 }}>💬</span>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 14 }}>Chat với khách hàng</div>
                            <div style={{ fontSize: 11, opacity: 0.75 }}>Trao đổi giữa nội bộ &amp; khách hàng dự án {p.code}</div>
                        </div>
                    </div>

                    {/* Banner chia sẻ link */}
                    <CustomerShareBanner projectCode={p.code} />

                    <div style={{ height: 480 }}>
                        <ProjectChatPanel
                            apiBase={`/api/projects/${id}/chat`}
                            myId={session?.user?.name || session?.user?.email}
                            isCustomer={false}
                        />
                    </div>
                </div>
            )}

            {/* TAB: Hạch toán (xưởng + BGĐ) */}
            {tab === 'hachtoan' && (
                <div>
                    <div className="card" style={{ padding: 20 }}>
                        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>📊 Bảng hạch toán lãi/lỗ</h3>
                        <BudgetEstimateTable projectId={id} refreshKey={varianceKey} onRefresh={() => setVarianceKey(k => k + 1)} />
                    </div>
                    <div className="card" style={{ padding: 20, marginTop: 16 }}>
                        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>🪵 Bảng tính giá sản xuất</h3>
                        <ProductionCostTable projectId={id} />
                    </div>
                </div>
            )}

            {/* TAB: Dự toán & Chi phí */}
            {tab === 'budget' && (
                <div>
                    <BudgetLockBar
                        projectId={id}
                        budgetStatus={p.budgetStatus}
                        budgetTotal={liveBudgetTotal !== null ? liveBudgetTotal : p.budgetTotal}
                        budgetLockedAt={p.budgetLockedAt}
                        budgetLockedBy={p.budgetLockedBy}
                        onLocked={() => window.location.reload()}
                        onUnlocked={() => window.location.reload()}
                    />

                    <div className="card" style={{ padding: 20, marginTop: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>📊 Bảng theo dõi Chênh lệch Vật tư</h3>
                            <div style={{ display: 'flex', gap: 8 }}>
                                {p.quotations?.length > 0 && <button className="btn btn-ghost btn-sm" onClick={importMPFromQuotation}>📄 Từ Báo giá</button>}
                            </div>
                        </div>
                        <VarianceTable key={`v-${varianceKey}`} projectId={id} onTotalBudgetLoaded={setLiveBudgetTotal} project={p} />
                    </div>
                    <div className="card" style={{ padding: 20, marginTop: 16 }}>
                        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>📋 Bảng dự trù kinh phí</h3>
                        <BudgetEstimateForm projectId={id} />
                    </div>
                    <div className="card" style={{ padding: 20, marginTop: 16 }}>
                        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>📈 S-Curve — Tiến độ Chi phí</h3>
                        <SCurveChart projectId={id} />
                    </div>
                </div>
            )}

            {/* TAB: Tổng quan */}
            {tab === 'overview' && (
                <div>
                    <ProfitabilityWidget projectId={id} />
                    <div className="dashboard-grid overview-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
                        <div className="card">
                            <div className="card-header"><span className="card-title">👥 Nhân sự</span></div>
                            {(p.employees || []).map(e => (
                                <div key={e.employeeId} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-light)' }}>
                                    <span style={{ fontWeight: 600, fontSize: 13 }}>{e.employee?.name}</span>
                                    <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{e.employee?.position}</span>
                                </div>
                            ))}
                            {!(p.employees?.length) && <div style={{ color: 'var(--text-muted)', padding: 20, textAlign: 'center', fontSize: 13 }}>Chưa có nhân sự</div>}
                        </div>
                        <div className="card">
                            <div className="card-header"><span className="card-title">💰 Giao dịch gần đây</span></div>
                            {(p.transactions || []).map(t => (
                                <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-light)' }}>
                                    <div><span style={{ fontWeight: 600, fontSize: 13 }}>{t.description}</span><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtDate(t.date)}</div></div>
                                    <span style={{ fontWeight: 700, fontSize: 13, color: t.type === 'Thu' ? 'var(--status-success)' : 'var(--status-danger)' }}>{t.type === 'Thu' ? '+' : '-'}{fmt(t.amount)}</span>
                                </div>
                            ))}
                            {!(p.transactions?.length) && <div style={{ color: 'var(--text-muted)', padding: 20, textAlign: 'center', fontSize: 13 }}>Chưa có giao dịch</div>}
                        </div>
                        <div className="card" style={{ gridColumn: '1 / -1' }}>
                            <div className="card-header"><span className="card-title">📝 Nhật ký theo dõi</span>{(p.trackingLogs?.length || 0) > 5 && <button className="btn btn-ghost btn-sm" onClick={() => setTab('logs')} style={{ fontSize: 12 }}>Xem tất cả ({p.trackingLogs.length}) →</button>}</div>
                            {(p.trackingLogs || []).slice(0, 5).map(log => (
                                <div key={log.id} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border-light)' }}>
                                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                                        {log.type === 'Điện thoại' ? '📞' : log.type === 'Gặp mặt' ? '🤝' : log.type === 'Email' ? '📧' : '💬'}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 13, fontWeight: 600 }}>{log.content}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{log.createdBy} • {fmtDate(log.createdAt)} • {log.type}</div>
                                    </div>
                                </div>
                            ))}
                            {(!p.trackingLogs || p.trackingLogs.length === 0) && <div style={{ color: 'var(--text-muted)', padding: 20, textAlign: 'center', fontSize: 13 }}>Chưa có nhật ký</div>}
                        </div>
                    </div>
                </div>
            )}

            {/* TAB: Tiến độ */}
            {tab === 'milestones' && (
                <ScheduleManager
                    projectId={id}
                    projectCode={p.code}
                    projectStartDate={p.startDate}
                    onProgressUpdate={(prog) => setData(prev => ({ ...prev, progress: prog }))}
                />
            )}

            {/* TAB: Hợp đồng */}
            {tab === 'contracts' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}><h3 style={{ margin: 0 }}>📝 Hợp đồng</h3><button className="btn btn-primary btn-sm" onClick={() => setModal('contract')}>+ Thêm HĐ</button></div>
                    <div className="stats-grid" style={{ marginBottom: 24 }}>
                        <div className="stat-card"><div className="stat-card-header"><span className="stat-card-icon revenue">📝</span></div><div className="stat-card .stat-value" style={{ fontSize: 20, fontWeight: 700 }}>{p.contracts.length}</div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tổng HĐ</div></div>
                        <div className="stat-card"><div className="stat-card-header"><span className="stat-card-icon customers">💰</span></div><div style={{ fontSize: 20, fontWeight: 700, color: 'var(--status-success)' }}>{fmt(p.contracts.reduce((s, c) => s + c.contractValue, 0))}</div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tổng giá trị</div></div>
                        <div className="stat-card"><div className="stat-card-header"><span className="stat-card-icon projects">✅</span></div><div style={{ fontSize: 20, fontWeight: 700 }}>{fmt(p.contracts.reduce((s, c) => s + c.paidAmount, 0))}</div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Đã thu</div></div>
                    </div>
                    <div className="card">
                        <div className="table-container"><table className="data-table">
                            <thead><tr><th>Mã HĐ</th><th>Tên</th><th>Loại</th><th>Giá trị</th><th>Biến động</th><th>Đã thu</th><th>Tỷ lệ</th><th>Trạng thái</th></tr></thead>
                            <tbody>{p.contracts.map(c => {
                                const rate = pct(c.paidAmount, c.contractValue + c.variationAmount);
                                return (
                                    <tr key={c.id}>
                                        <td className="accent">{c.code}</td>
                                        <td className="primary">{c.name}<div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.quotation?.code ? `Từ ${c.quotation.code}` : ''} • Ký {fmtDate(c.signDate)}</div></td>
                                        <td><span className="badge info">{c.type}</span></td>
                                        <td className="amount">{fmt(c.contractValue)}</td>
                                        <td style={{ color: c.variationAmount > 0 ? 'var(--status-warning)' : '' }}>{c.variationAmount > 0 ? `+${fmt(c.variationAmount)}` : '—'}</td>
                                        <td style={{ color: 'var(--status-success)', fontWeight: 600 }}>{fmt(c.paidAmount)}</td>
                                        <td><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div className="progress-bar" style={{ flex: 1, maxWidth: 60 }}><div className="progress-fill" style={{ width: `${rate}%` }}></div></div><span style={{ fontSize: 12 }}>{rate}%</span></div></td>
                                        <td><span className={`badge ${c.status === 'Hoàn thành' ? 'success' : c.status === 'Đang thực hiện' ? 'warning' : c.status === 'Đã ký' ? 'info' : 'muted'}`}>{c.status}</span></td>
                                    </tr>
                                );
                            })}</tbody>
                        </table></div>
                        {p.contracts.length === 0 && <div style={{ color: 'var(--text-muted)', padding: 24, textAlign: 'center' }}>Chưa có hợp đồng</div>}
                    </div>
                </div>
            )}

            {/* TAB: Tài chính (gộp Thu/Chi/Quyết toán) */}
            {tab === 'finance' && (
                <div>
                    {/* Finance Sub-tabs */}
                    <div className="finance-sub-tabs" style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '2px solid var(--border-light)', paddingBottom: 0 }}>
                        {[{ key: 'payments', label: '💵 Thu tiền' }, { key: 'expenses', label: '💸 Chi phí' }, { key: 'settlement', label: '🧮 Lãi / Lỗ' }].map(st2 => (
                            <button key={st2.key} onClick={() => setFinanceSubTab(st2.key)}
                                style={{ padding: '10px 20px', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', borderRadius: '8px 8px 0 0', background: financeSubTab === st2.key ? 'var(--bg-card)' : 'transparent', color: financeSubTab === st2.key ? 'var(--accent-primary)' : 'var(--text-muted)', borderBottom: financeSubTab === st2.key ? '2px solid var(--accent-primary)' : '2px solid transparent', marginBottom: -2, transition: 'all 0.2s' }}>
                                {st2.label}
                            </button>
                        ))}
                    </div>

                    {/* Sub-tab: Thu tiền */}
                    {financeSubTab === 'payments' && (
                        <div>
                            {p.contracts.map(c => (
                                <div key={c.id} className="card" style={{ marginBottom: 20, padding: 24 }}>
                                    <div className="card-header">
                                        <span className="card-title">💵 {c.code} — {c.name}</span>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <span className="badge info">HĐ: {fmt(c.contractValue)}</span>
                                            <span className="badge success">Đã thu: {fmt(c.paidAmount)}</span>
                                            <span className="badge danger">Còn: {fmt(c.contractValue + c.variationAmount - c.paidAmount)}</span>
                                        </div>
                                    </div>
                                    <div className="table-container"><table className="data-table">
                                        <thead><tr><th>Đợt</th><th>Hạng mục</th><th>Kế hoạch</th><th>Đã thu</th><th>Còn lại</th><th>Trạng thái</th></tr></thead>
                                        <tbody>{c.payments.map(pay => (
                                            <tr key={pay.id}>
                                                <td className="primary">{pay.phase}</td>
                                                <td><span className="badge muted">{pay.category}</span></td>
                                                <td className="amount">{fmt(pay.amount)}</td>
                                                <td style={{ color: 'var(--status-success)', fontWeight: 600 }}>{fmt(pay.paidAmount)}</td>
                                                <td style={{ color: pay.amount - pay.paidAmount > 0 ? 'var(--status-danger)' : 'var(--status-success)', fontWeight: 600 }}>{fmt(pay.amount - pay.paidAmount)}</td>
                                                <td><span className={`badge ${pay.status === 'Đã thu' ? 'success' : pay.status === 'Thu một phần' ? 'warning' : 'danger'}`}>{pay.status}</span></td>
                                            </tr>
                                        ))}</tbody>
                                    </table></div>
                                    {c.payments.length === 0 && <div style={{ color: 'var(--text-muted)', padding: 16, textAlign: 'center', fontSize: 13 }}>Chưa có đợt thu</div>}
                                </div>
                            ))}
                            {p.contracts.length === 0 && <div className="card" style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có hợp đồng để thu tiền</div>}
                        </div>
                    )}

                    {/* Sub-tab: Chi phí */}
                    {financeSubTab === 'expenses' && (
                        <div>
                            <div className="stats-grid" style={{ marginBottom: 24 }}>
                                <div className="stat-card"><div style={{ fontSize: 20, fontWeight: 700 }}>{p.expenses.length}</div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tổng phiếu</div></div>
                                <div className="stat-card"><div style={{ fontSize: 20, fontWeight: 700, color: 'var(--status-danger)' }}>{fmt(p.expenses.reduce((s, e) => s + e.amount, 0))}</div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tổng CP</div></div>
                                <div className="stat-card"><div style={{ fontSize: 20, fontWeight: 700, color: 'var(--status-success)' }}>{fmt(p.expenses.reduce((s, e) => s + e.paidAmount, 0))}</div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Đã TT</div></div>
                                <div className="stat-card"><div style={{ fontSize: 20, fontWeight: 700, color: 'var(--status-warning)' }}>{p.expenses.filter(e => e.status === 'Chờ duyệt').length}</div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Chờ duyệt</div></div>
                            </div>
                            <div className="card">
                                <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 16px 0' }}><button className="btn btn-primary btn-sm" onClick={() => setModal('expense')}>+ Thêm chi phí</button></div>
                                <div className="table-container"><table className="data-table">
                                    <thead><tr><th>Mã</th><th>Mô tả</th><th>Hạng mục</th><th>Số tiền</th><th>Đã TT</th><th>Người nộp</th><th>Ngày</th><th>Trạng thái</th></tr></thead>
                                    <tbody>{p.expenses.map(e => (
                                        <tr key={e.id}>
                                            <td className="accent">{e.code}</td>
                                            <td className="primary">{e.description}</td>
                                            <td><span className="badge muted">{e.category}</span></td>
                                            <td className="amount">{fmt(e.amount)}</td>
                                            <td style={{ color: 'var(--status-success)', fontWeight: 600 }}>{fmt(e.paidAmount)}</td>
                                            <td style={{ fontSize: 12 }}>{e.submittedBy || '—'}</td>
                                            <td style={{ fontSize: 12 }}>{fmtDate(e.date)}</td>
                                            <td><span className={`badge ${e.status === 'Đã thanh toán' ? 'success' : e.status === 'Đã duyệt' ? 'info' : 'warning'}`}>{e.status}</span></td>
                                        </tr>
                                    ))}</tbody>
                                </table></div>
                                {p.expenses.length === 0 && <div style={{ color: 'var(--text-muted)', padding: 24, textAlign: 'center' }}>Chưa có chi phí phát sinh</div>}
                            </div>
                        </div>
                    )}

                    {/* Sub-tab: Lãi / Lỗ (Quyết toán) */}
                    {financeSubTab === 'settlement' && (
                        <div>
                            <div className="settlement-profit" style={{ marginBottom: 24 }}>
                                <div className="profit-value" style={{ color: st.profit >= 0 ? 'var(--status-success)' : 'var(--status-danger)' }}>{st.profit >= 0 ? '📈' : '📉'} {fmt(st.profit)}</div>
                                <div className="profit-label">{st.profit >= 0 ? 'Lợi nhuận dự án' : 'Lỗ dự án'}</div>
                                <div className="profit-rate" style={{ background: st.profit >= 0 ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)', color: st.profit >= 0 ? 'var(--status-success)' : 'var(--status-danger)' }}>Tỷ lệ: {st.profitRate}%</div>
                            </div>
                            <div className="settlement-grid">
                                <div className="settlement-card side-a">
                                    <h3>🏠 Bên A — Doanh thu (Khách hàng)</h3>
                                    <div className="settlement-row"><span className="label">Giá trị hợp đồng</span><span className="value">{fmt(st.sideA.contractValue)}</span></div>
                                    <div className="settlement-row"><span className="label">Phát sinh / Biến động</span><span className="value" style={{ color: st.sideA.variation > 0 ? 'var(--status-warning)' : '' }}>{st.sideA.variation > 0 ? '+' : ''}{fmt(st.sideA.variation)}</span></div>
                                    <div className="settlement-row total"><span className="label">Tổng doanh thu</span><span className="value">{fmt(st.sideA.total)}</span></div>
                                    <div className="settlement-row"><span className="label">Đã thu</span><span className="value" style={{ color: 'var(--status-success)' }}>{fmt(st.sideA.collected)}</span></div>
                                    <div className="settlement-row"><span className="label">Còn phải thu</span><span className="value" style={{ color: st.sideA.remaining > 0 ? 'var(--status-danger)' : '' }}>{fmt(st.sideA.remaining)}</span></div>
                                    <div className="settlement-row"><span className="label">Tỷ lệ thu</span><span className="value">{st.sideA.rate}%</span></div>
                                </div>
                                <div className="settlement-card side-b">
                                    <h3>🏗️ Bên B — Chi phí</h3>
                                    <div className="settlement-row"><span className="label">Mua sắm vật tư</span><span className="value">{fmt(st.sideB.purchase)}</span></div>
                                    <div className="settlement-row"><span className="label">Chi phí phát sinh</span><span className="value">{fmt(st.sideB.expenses)}</span></div>
                                    <div className="settlement-row"><span className="label">Thầu phụ</span><span className="value">{fmt(st.sideB.contractor)}</span></div>
                                    <div className="settlement-row total"><span className="label">Tổng chi phí</span><span className="value" style={{ color: 'var(--status-danger)' }}>{fmt(st.sideB.total)}</span></div>
                                    <div className="settlement-row"><span className="label">Đã thanh toán</span><span className="value">{fmt(st.sideB.paid)}</span></div>
                                    <div className="settlement-row"><span className="label">Còn phải trả</span><span className="value" style={{ color: st.sideB.remaining > 0 ? 'var(--status-warning)' : '' }}>{fmt(st.sideB.remaining)}</span></div>
                                </div>
                            </div>
                            <div className="card" style={{ padding: 24 }}>
                                <div className="card-header"><span className="card-title">📊 Định mức chi phí</span></div>
                                <div className="table-container"><table className="data-table">
                                    <thead><tr><th>Hạng mục</th><th>Định mức</th><th>Thực tế</th><th>Chênh lệch</th><th>%</th></tr></thead>
                                    <tbody>{p.budgets.map(b => {
                                        const diff = b.budgetAmount - b.actualAmount;
                                        const rate = pct(b.actualAmount, b.budgetAmount);
                                        return (
                                            <tr key={b.id}>
                                                <td className="primary">{b.category}</td>
                                                <td>{fmt(b.budgetAmount)}</td>
                                                <td>{fmt(b.actualAmount)}</td>
                                                <td style={{ color: diff >= 0 ? 'var(--status-success)' : 'var(--status-danger)', fontWeight: 600 }}>{diff >= 0 ? '+' : ''}{fmt(diff)}</td>
                                                <td><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div className="progress-bar" style={{ flex: 1, maxWidth: 80 }}><div className={`progress-fill ${rate > 100 ? '' : 'success'}`} style={{ width: `${Math.min(rate, 100)}%`, background: rate > 100 ? 'var(--status-danger)' : '' }}></div></div><span style={{ fontSize: 12 }}>{rate}%</span></div></td>
                                            </tr>
                                        );
                                    })}</tbody>
                                </table></div>
                                {p.budgets.length === 0 && <div style={{ color: 'var(--text-muted)', padding: 20, textAlign: 'center' }}>Chưa có định mức</div>}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* TAB: Phiếu công việc */}
            {tab === 'workorders' && (
                <div className="card">
                    <div className="card-header" style={{ flexWrap: 'wrap', gap: 8 }}>
                        <span className="card-title">📋 Phiếu công việc</span>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                            <span className="badge warning">{p.workOrders.filter(w => w.status === 'Chờ xử lý').length} chờ</span>
                            <span className="badge info">{p.workOrders.filter(w => w.status === 'Đang xử lý').length} đang làm</span>
                            <span className="badge success">{p.workOrders.filter(w => w.status === 'Hoàn thành').length} xong</span>
                            <button className="btn btn-primary btn-sm" onClick={() => setModal('workorder')}>+ Thêm phiếu</button>
                        </div>
                    </div>
                    {isMobile ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                            {p.workOrders.map(wo => (
                                <div key={wo.id} style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-light)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', marginBottom: 2 }}>{wo.title}</div>
                                            {wo.description && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{wo.description}</div>}
                                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                                                <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--accent-primary)', opacity: 0.7 }}>{wo.code}</span>
                                                <span className="badge muted" style={{ fontSize: 10 }}>{wo.category}</span>
                                                <span className={`badge ${wo.priority === 'Cao' ? 'danger' : wo.priority === 'Trung bình' ? 'warning' : 'muted'}`} style={{ fontSize: 10 }}>{wo.priority}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                            {wo.assignee && <span>👤 {wo.assignee}</span>}
                                            {wo.dueDate && <span style={{ marginLeft: 8 }}>📅 {fmtDate(wo.dueDate)}</span>}
                                        </div>
                                        <select value={wo.status} onChange={e => updateWorkOrder(wo.id, e.target.value)} className="form-select" style={{ padding: '6px 28px 6px 10px', fontSize: 12, minWidth: 120, borderRadius: 8 }}>
                                            <option>Chờ xử lý</option><option>Đang xử lý</option><option>Hoàn thành</option><option>Quá hạn</option>
                                        </select>
                                    </div>
                                </div>
                            ))}
                            {p.workOrders.length === 0 && <div style={{ color: 'var(--text-muted)', padding: 24, textAlign: 'center' }}>Chưa có phiếu công việc</div>}
                        </div>
                    ) : (
                        <>
                        <div className="table-container"><table className="data-table">
                            <thead><tr><th>Mã</th><th>Tiêu đề</th><th>Loại</th><th>Ưu tiên</th><th>Người thực hiện</th><th>Hạn</th><th>Trạng thái</th></tr></thead>
                            <tbody>{p.workOrders.map(wo => (
                                <tr key={wo.id}>
                                    <td className="accent">{wo.code}</td>
                                    <td className="primary">{wo.title}<div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{wo.description}</div></td>
                                    <td><span className="badge muted">{wo.category}</span></td>
                                    <td><span className={`badge ${wo.priority === 'Cao' ? 'danger' : wo.priority === 'Trung bình' ? 'warning' : 'muted'}`}>{wo.priority}</span></td>
                                    <td style={{ fontSize: 13 }}>{wo.assignee || '—'}</td>
                                    <td style={{ fontSize: 12 }}>{fmtDate(wo.dueDate)}</td>
                                    <td>
                                        <select value={wo.status} onChange={e => updateWorkOrder(wo.id, e.target.value)} className="form-select" style={{ padding: '4px 28px 4px 8px', fontSize: 12, minWidth: 110 }}>
                                            <option>Chờ xử lý</option><option>Đang xử lý</option><option>Hoàn thành</option><option>Quá hạn</option>
                                        </select>
                                    </td>
                                </tr>
                            ))}</tbody>
                        </table></div>
                        {p.workOrders.length === 0 && <div style={{ color: 'var(--text-muted)', padding: 24, textAlign: 'center' }}>Chưa có phiếu công việc</div>}
                        </>
                    )}
                </div>
            )}

            {/* TAB: Vật tư */}
            {tab === 'materials' && (() => {
                // Flatten all PO items with PO info
                const allPoItems = p.purchaseOrders.flatMap(po =>
                    (po.items || []).map(item => ({ ...item, po }))
                );
                const uniquePoStatuses = [...new Set(p.purchaseOrders.map(po => po.status))];
                const uniqueSuppliers = [...new Set(p.purchaseOrders.map(po => po.supplier).filter(Boolean))];
                const filteredItems = allPoItems.filter(item => {
                    const q = matSearch.toLowerCase();
                    const matchSearch = !q || item.productName?.toLowerCase().includes(q) || item.po?.supplier?.toLowerCase().includes(q);
                    const matchStatus = !matStatusFilter || item.po?.status === matStatusFilter;
                    const matchSupplier = !matPoFilter || item.po?.supplier === matPoFilter;
                    return matchSearch && matchStatus && matchSupplier;
                });
                const totalAmount = filteredItems.reduce((s, i) => s + (Number(i.amount) || 0), 0);
                const totalOrdered = filteredItems.reduce((s, i) => s + (Number(i.quantity) || 0), 0);
                const totalReceived = filteredItems.reduce((s, i) => s + (Number(i.receivedQty) || 0), 0);
                return (
                <div>
                    {/* Stats */}
                    <div className="stats-grid" style={{ marginBottom: 16 }}>
                        <div className="stat-card"><div style={{ fontSize: 20, fontWeight: 700 }}>{allPoItems.length}</div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Loại vật tư</div></div>
                        <div className="stat-card"><div style={{ fontSize: 20, fontWeight: 700, color: 'var(--status-info)' }}>{fmt(p.purchaseOrders.reduce((s, po) => s + (Number(po.totalAmount) || 0), 0))}</div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tổng đã đặt</div></div>
                        <div className="stat-card"><div style={{ fontSize: 20, fontWeight: 700, color: 'var(--status-success)' }}>{fmt(p.purchaseOrders.reduce((s, po) => s + (Number(po.paidAmount) || 0), 0))}</div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Đã thanh toán</div></div>
                        <div className="stat-card"><div style={{ fontSize: 20, fontWeight: 700, color: 'var(--status-danger)' }}>{fmt(p.purchaseOrders.reduce((s, po) => s + (Number(po.totalAmount) - Number(po.paidAmount) || 0), 0))}</div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Còn nợ NCC</div></div>
                    </div>

                    {/* Bảng Kế hoạch vật tư — dữ liệu từ Mua hàng */}
                    <div className="card">
                        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                                <span style={{ fontWeight: 700, fontSize: 14 }}>📦 Kế hoạch vật tư</span>
                                <button className="btn btn-primary btn-sm" onClick={openPOModal}>+ Tạo PO mới</button>
                            </div>
                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                                <div style={{ flex: '2 1 200px' }}>
                                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tên sản phẩm</div>
                                    <div style={{ position: 'relative' }}>
                                        <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--text-muted)', pointerEvents: 'none' }}>🔍</span>
                                        <input
                                            className="form-input"
                                            style={{ paddingLeft: 28, fontSize: 13 }}
                                            placeholder="Nhập tên sản phẩm..."
                                            value={matSearch}
                                            onChange={e => setMatSearch(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div style={{ flex: '1 1 150px' }}>
                                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Trạng thái PO</div>
                                    <select className="form-select" style={{ fontSize: 13 }} value={matStatusFilter} onChange={e => setMatStatusFilter(e.target.value)}>
                                        <option value="">Tất cả</option>
                                        {uniquePoStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div style={{ flex: '1 1 150px' }}>
                                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Nhà cung cấp</div>
                                    <select className="form-select" style={{ fontSize: 13 }} value={matPoFilter} onChange={e => setMatPoFilter(e.target.value)}>
                                        <option value="">Tất cả</option>
                                        {uniqueSuppliers.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                {(matSearch || matStatusFilter || matPoFilter) && (
                                    <div style={{ flex: '0 0 auto' }}>
                                        <div style={{ fontSize: 11, marginBottom: 4, opacity: 0 }}>x</div>
                                        <button className="btn btn-ghost btn-sm" style={{ fontSize: 12 }} onClick={() => { setMatSearch(''); setMatStatusFilter(''); setMatPoFilter(''); }}>✕ Xóa lọc</button>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="table-container"><table className="data-table">
                            <thead>
                                <tr>
                                    <th style={{ width: 40, textAlign: 'center' }}>STT</th>
                                    <th>Sản phẩm</th>
                                    <th>ĐVT</th>
                                    <th>SL Đặt</th>
                                    <th>Đơn giá</th>
                                    <th>Thành tiền</th>
                                    <th>NCC / PO</th>
                                    <th>TT</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredItems.map((item, idx) => {
                                    const statusColor = item.po?.status === 'Hoàn thành' ? 'success' : item.po?.status === 'Đang giao' ? 'info' : item.po?.status === 'Nhận một phần' ? 'warning' : 'muted';
                                    return (
                                        <tr key={`${item.id}-${idx}`}>
                                            <td style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>{idx + 1}</td>
                                            <td style={{ fontWeight: 600, fontSize: 13 }}>{item.productName}</td>
                                            <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.unit}</td>
                                            <td style={{ fontWeight: 600 }}>{item.quantity}</td>
                                            <td style={{ fontSize: 12 }}>{fmt(item.unitPrice)}</td>
                                            <td className="amount" style={{ fontWeight: 700 }}>{fmt(item.amount)}</td>
                                            <td>
                                                <div style={{ fontSize: 12, fontWeight: 600 }}>{item.po?.supplier}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{item.po?.code}</div>
                                            </td>
                                            <td><span className={`badge ${statusColor}`} style={{ fontSize: 11 }}>{item.po?.status}</span></td>
                                        </tr>
                                    );
                                })}
                                {filteredItems.length > 0 && (
                                    <tr style={{ background: 'var(--surface-alt)', fontWeight: 700 }}>
                                        <td></td>
                                        <td colSpan={2} style={{ textAlign: 'right', fontSize: 12 }}>Tổng cộng:</td>
                                        <td>{totalOrdered}</td>
                                        <td></td>
                                        <td className="amount" style={{ color: 'var(--accent-primary)' }}>{fmt(totalAmount)}</td>
                                        <td colSpan={2}></td>
                                    </tr>
                                )}
                            </tbody>
                        </table></div>
                        {filteredItems.length === 0 && (
                            <div style={{ color: 'var(--text-muted)', padding: 32, textAlign: 'center' }}>
                                {allPoItems.length === 0 ? 'Chưa có đơn mua hàng — bấm "+ Tạo PO mới" hoặc tạo PO từ Tab Mua hàng' : 'Không tìm thấy vật tư khớp bộ lọc'}
                            </div>
                        )}
                    </div>
                </div>
                );
            })()}

            {/* TAB: Mua hàng */}
            {tab === 'purchase' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                        <button className="btn btn-primary btn-sm" onClick={openPOModal}>+ Tạo PO mới</button>
                    </div>
                    {p.purchaseOrders.map(po => {
                        const isDirect = po.deliveryType === 'Giao thẳng dự án';
                        const canReceive = po.status === 'Đang giao' || po.status === 'Nhận một phần';
                        const canApprove = po.status === 'Chờ duyệt';
                        const statusColor = po.status === 'Hoàn thành' ? 'success' : po.status === 'Đang giao' ? 'info' : po.status === 'Nhận một phần' ? 'warning' : po.status === 'Chờ duyệt' ? 'warning' : 'muted';
                        return (
                            <div key={po.id} className="card" style={{ marginBottom: 16 }}>
                                <div className="card-header">
                                    <div>
                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                            <span className="card-title" style={{ fontSize: 14 }}>🛒 {po.code}</span>
                                            <strong style={{ fontSize: 14 }}>{po.supplier}</strong>
                                            <span className={`badge ${statusColor}`}>{po.status}</span>
                                            <span className={`badge ${isDirect ? 'info' : 'muted'}`} title={po.deliveryAddress}>{isDirect ? '🏗 Giao thẳng CT' : '🏢 Nhập kho'}</span>
                                        </div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                                            Đặt: {fmtDate(po.orderDate)} • Giao dự kiến: {fmtDate(po.deliveryDate)}
                                            {po.deliveryAddress && <span> • 📍 {po.deliveryAddress}</span>}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                                        <span className="badge purple">{fmt(po.totalAmount)}</span>
                                        <button className="btn btn-ghost btn-sm" title="In phiếu mua hàng" onClick={() => printPO(po)}>🖨 In phiếu</button>
                                        <button className="btn btn-ghost btn-sm" title="Chỉnh sửa phiếu" onClick={() => openEditPO(po)}>✏️ Sửa</button>
                                        {canApprove && <button className="btn btn-sm btn-info" onClick={() => approvePO(po.id)}>✓ Duyệt / Đặt hàng</button>}
                                        {canReceive && <button className="btn btn-sm btn-success" onClick={() => openGRN(po)}>📦 Nghiệm thu</button>}
                                    </div>
                                </div>
                                {/* PO status flow */}
                                <div style={{ padding: '8px 16px', display: 'flex', gap: 4, alignItems: 'center', fontSize: 11, color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>
                                    {['Chờ duyệt', 'Đang giao', 'Nhận một phần', 'Hoàn thành'].map((s, i, arr) => (
                                        <span key={s} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <span style={{ padding: '2px 8px', borderRadius: 10, background: po.status === s ? 'var(--primary)' : 'var(--surface-alt)', color: po.status === s ? '#fff' : 'var(--text-secondary)', fontWeight: po.status === s ? 600 : 400 }}>{s}</span>
                                            {i < arr.length - 1 && <span>→</span>}
                                        </span>
                                    ))}
                                </div>
                                <div className="table-container"><table className="data-table">
                                    <thead><tr><th>Sản phẩm</th><th>ĐVT</th><th>SL đặt</th><th>Đơn giá</th><th>Thành tiền</th><th>Đã nhận</th><th>Còn lại</th></tr></thead>
                                    <tbody>{po.items.map(item => (
                                        <tr key={item.id}>
                                            <td className="primary">{item.productName}</td>
                                            <td>{item.unit}</td>
                                            <td>{item.quantity}</td>
                                            <td style={{ fontSize: 12 }}>{fmt(item.unitPrice)}</td>
                                            <td className="amount">{fmt(item.amount)}</td>
                                            <td style={{ color: item.receivedQty >= item.quantity ? 'var(--status-success)' : 'var(--status-warning)', fontWeight: 600 }}>{item.receivedQty}</td>
                                            <td style={{ color: item.quantity - item.receivedQty > 0 ? 'var(--status-danger)' : 'var(--status-success)' }}>{item.quantity - item.receivedQty > 0 ? item.quantity - item.receivedQty : '✓'}</td>
                                        </tr>
                                    ))}</tbody>
                                </table></div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16, padding: '10px 16px', fontSize: 13, borderTop: '1px solid var(--border-color)' }}>
                                    <span>Tổng: <strong>{fmt(po.totalAmount)}</strong></span>
                                    <span>Đã TT: <strong style={{ color: 'var(--status-success)' }}>{fmt(po.paidAmount)}</strong></span>
                                    <span style={{ color: po.totalAmount - po.paidAmount > 0 ? 'var(--status-danger)' : '' }}>Còn nợ: <strong>{fmt(po.totalAmount - po.paidAmount)}</strong></span>
                                </div>
                            </div>
                        );
                    })}
                    {p.purchaseOrders.length === 0 && <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có đơn mua hàng — Tạo PO từ Tab Vật tư hoặc bấm "+ Tạo PO mới"</div>}
                </div>
            )}


            {/* TAB: Thầu phụ */}
            {tab === 'contractors' && (
                <div className="card">
                    <div className="card-header">
                        <span className="card-title">👷 Thầu phụ & Công nợ</span>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <span className="badge warning">Tổng nợ thầu: {fmt(pnl.debtToContractors)}</span>
                            <button className="btn btn-primary btn-sm" onClick={openCpModal}>+ Thêm thầu phụ</button>
                        </div>
                    </div>
                    <div className="table-container"><table className="data-table">
                        <thead><tr><th>Thầu phụ</th><th>Loại</th><th>Mô tả</th><th>HĐ thầu / NT</th><th>Đã TT</th><th>Còn nợ</th><th>TT</th><th style={{ width: 110 }}></th></tr></thead>
                        <tbody>{p.contractorPays.map(cp => {
                            const itemCount = cp.items?.length || 0;
                            return (
                                <tr key={cp.id}>
                                    <td className="primary">{cp.contractor?.name}<div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{cp.contractor?.phone}</div></td>
                                    <td><span className="badge muted">{cp.contractor?.type}</span></td>
                                    <td style={{ fontSize: 12 }}>{cp.description}</td>
                                    <td>
                                        <div style={{ fontSize: 13 }}>{fmt(cp.contractAmount)}</div>
                                        <button style={{ fontSize: 11, color: 'var(--accent-primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }} onClick={() => openNtModal(cp)}>
                                            📋 {itemCount > 0 ? `${itemCount} hạng mục NT` : 'Thêm nghiệm thu'}
                                        </button>
                                    </td>
                                    <td style={{ color: 'var(--status-success)', fontWeight: 600 }}>{fmt(cp.paidAmount)}</td>
                                    <td style={{ fontWeight: 700, color: cp.contractAmount - cp.paidAmount > 0 ? 'var(--status-danger)' : 'var(--status-success)' }}>{fmt(cp.contractAmount - cp.paidAmount)}</td>
                                    <td><span className={`badge ${cp.status === 'Hoàn thành' ? 'success' : cp.status === 'Tạm ứng' ? 'info' : 'warning'}`}>{cp.status}</span></td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 3 }}>
                                            <button className="btn btn-ghost btn-sm" title="Chỉnh sửa" onClick={() => openEditCp(cp)}>✏️</button>
                                            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--status-danger)' }} onClick={() => deleteCp(cp.id)}>🗑️</button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}</tbody>
                    </table></div>
                    {p.contractorPays.length === 0 && <div style={{ color: 'var(--text-muted)', padding: 24, textAlign: 'center' }}>Chưa có thầu phụ — <button className="btn btn-ghost btn-sm" onClick={openCpModal}>+ Thêm ngay</button></div>}
                </div>
            )}

            {/* TAB: Tài liệu */}
            {tab === 'documents' && <DocumentManager projectId={id} onRefresh={fetchData} />}

            {/* MODALS */}

            {/* MeasurementSheet modal */}
            {msSheet && (
                <MeasurementSheet
                    projectId={id}
                    contractorId={msSheet.contractorId}
                    contractorName={msSheet.contractorName}
                    onSaved={fetchData}
                    onClose={() => setMsSheet(null)}
                />
            )}

            {/* Modal: Nghiệm thu hạng mục */}
            {ntModal && (
                <div className="modal-overlay" onClick={() => setNtModal(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 780 }}>
                        <div className="modal-header">
                            <div>
                                <h3>📋 Nghiệm thu — {ntModal.contractor?.name}</h3>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{ntModal.description}</div>
                            </div>
                            <button className="modal-close" onClick={() => setNtModal(null)}>×</button>
                        </div>
                        <div className="modal-body" style={{ padding: 0 }}>
                            {/* Items table */}
                            <div style={{ overflowX: 'auto' }}>
                                <table className="data-table" style={{ margin: 0 }}>
                                    <thead><tr>
                                        <th>Hạng mục</th><th>ĐVT</th><th style={{ textAlign: 'right' }}>Khối lượng</th><th style={{ textAlign: 'right' }}>Đơn giá</th><th style={{ textAlign: 'right' }}>Thành tiền</th><th style={{ width: 40 }}></th>
                                    </tr></thead>
                                    <tbody>
                                        {(ntModal.items || []).length === 0 && (
                                            <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20, fontSize: 13 }}>Chưa có hạng mục nào</td></tr>
                                        )}
                                        {(ntModal.items || []).map(it => (
                                            <tr key={it.id}>
                                                <td style={{ fontSize: 13 }}>{it.description}</td>
                                                <td style={{ fontSize: 12 }}>{it.unit}</td>
                                                <td style={{ textAlign: 'right', fontSize: 12 }}>{new Intl.NumberFormat('vi-VN').format(it.quantity)}</td>
                                                <td style={{ textAlign: 'right', fontSize: 12 }}>{new Intl.NumberFormat('vi-VN').format(it.unitPrice)}</td>
                                                <td style={{ textAlign: 'right', fontSize: 13, fontWeight: 600 }}>{fmt(it.amount)}</td>
                                                <td><button className="btn btn-ghost btn-sm" style={{ color: 'var(--status-danger)', fontSize: 12 }} onClick={() => deleteNtItem(it.id)}>✕</button></td>
                                            </tr>
                                        ))}
                                        {/* Add row */}
                                        <tr style={{ background: 'var(--bg-secondary)' }}>
                                            <td><input className="form-input" style={{ fontSize: 12, padding: '4px 8px' }} value={ntForm.description} onChange={e => setNtForm({ ...ntForm, description: e.target.value })} placeholder="Tên hạng mục *" /></td>
                                            <td><input className="form-input" style={{ fontSize: 12, padding: '4px 6px', width: 60 }} value={ntForm.unit} onChange={e => setNtForm({ ...ntForm, unit: e.target.value })} /></td>
                                            <td><input className="form-input" type="number" min="0" style={{ fontSize: 12, padding: '4px 6px', textAlign: 'right' }} value={ntForm.quantity} onChange={e => setNtForm({ ...ntForm, quantity: e.target.value })} placeholder="KL" /></td>
                                            <td><input className="form-input" type="number" min="0" style={{ fontSize: 12, padding: '4px 6px', textAlign: 'right' }} value={ntForm.unitPrice} onChange={e => setNtForm({ ...ntForm, unitPrice: e.target.value })} placeholder="Đơn giá" /></td>
                                            <td style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-muted)' }}>
                                                {ntForm.quantity && ntForm.unitPrice ? fmt(Number(ntForm.quantity) * Number(ntForm.unitPrice)) : '—'}
                                            </td>
                                            <td><button className="btn btn-primary btn-sm" onClick={addNtItem} disabled={savingNt}>✅</button></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            {/* Summary */}
                            <div style={{ padding: '14px 20px', display: 'flex', gap: 24, borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)', flexWrap: 'wrap' }}>
                                <div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Tổng nghiệm thu</div><div style={{ fontWeight: 700, fontSize: 15 }}>{fmt((ntModal.items || []).reduce((s, it) => s + it.amount, 0))}</div></div>
                                <div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Giá trị HĐ</div><div style={{ fontWeight: 700, fontSize: 15 }}>{fmt(ntModal.contractAmount)}</div></div>
                                <div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Đã thanh toán</div><div style={{ fontWeight: 700, fontSize: 15, color: 'var(--status-success)' }}>{fmt(ntModal.paidAmount)}</div></div>
                                <div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Còn nợ</div><div style={{ fontWeight: 700, fontSize: 15, color: ntModal.contractAmount - ntModal.paidAmount > 0 ? 'var(--status-danger)' : 'var(--text-muted)' }}>{fmt(ntModal.contractAmount - ntModal.paidAmount)}</div></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Chỉnh sửa thầu phụ */}
            {editCp && (
                <div className="modal-overlay" onClick={() => setEditCp(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
                        <div className="modal-header">
                            <h3>✏️ Chỉnh sửa thầu phụ</h3>
                            <button className="modal-close" onClick={() => setEditCp(null)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Thầu phụ</label>
                                <input className="form-input" value={editCp.contractorName} disabled style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Mô tả hợp đồng</label>
                                <input className="form-input" value={editCp.description} onChange={e => setEditCp({ ...editCp, description: e.target.value })} placeholder="VD: Thầu xây thô, Thầu điện nước..." />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Giá trị hợp đồng *</label>
                                    <input className="form-input" type="number" min="0" value={editCp.contractAmount} onChange={e => setEditCp({ ...editCp, contractAmount: e.target.value })} placeholder="VNĐ" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Đã thanh toán</label>
                                    <input className="form-input" type="number" min="0" value={editCp.paidAmount} onChange={e => setEditCp({ ...editCp, paidAmount: e.target.value })} />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Hạn thanh toán</label>
                                    <input className="form-input" type="date" value={editCp.dueDate} onChange={e => setEditCp({ ...editCp, dueDate: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Trạng thái</label>
                                    <select className="form-select" value={editCp.status} onChange={e => setEditCp({ ...editCp, status: e.target.value })}>
                                        {['Chưa TT', 'Tạm ứng', 'Đang TT', 'Hoàn thành'].map(s => <option key={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setEditCp(null)}>Hủy</button>
                            <button className="btn btn-primary" onClick={updateCpPaid}>Lưu thay đổi</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Thêm thầu phụ */}
            {modal === 'contractor_pay' && (
                <div className="modal-overlay" onClick={() => setModal(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
                        <div className="modal-header">
                            <h3>👷 Thêm thầu phụ vào dự án</h3>
                            <button className="modal-close" onClick={() => setModal(null)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Thầu phụ *</label>
                                <input
                                    className="form-input"
                                    list="contractor-suggestions"
                                    autoFocus
                                    placeholder="Gõ tên hoặc chọn từ danh sách..."
                                    value={cpForm.contractorName}
                                    onChange={e => {
                                        const val = e.target.value;
                                        const match = contractorList.find(c => c.name === val);
                                        setCpForm({ ...cpForm, contractorName: val, contractorId: match ? match.id : '' });
                                    }}
                                />
                                <datalist id="contractor-suggestions">
                                    {contractorList.map(c => <option key={c.id} value={c.name}>{c.type}</option>)}
                                </datalist>
                                {cpForm.contractorName && !cpForm.contractorId && (
                                    <div style={{ fontSize: 11, color: '#f97316', marginTop: 4 }}>
                                        ✦ Thầu phụ mới — sẽ được tạo tự động khi lưu
                                    </div>
                                )}
                            </div>
                            <div className="form-group">
                                <label className="form-label">Mô tả hợp đồng</label>
                                <input className="form-input" value={cpForm.description} onChange={e => setCpForm({ ...cpForm, description: e.target.value })} placeholder="VD: Thầu xây thô, Thầu điện nước..." />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Giá trị hợp đồng *</label>
                                    <input className="form-input" type="number" min="0" value={cpForm.contractAmount} onChange={e => setCpForm({ ...cpForm, contractAmount: e.target.value })} placeholder="VNĐ" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Tạm ứng (nếu có)</label>
                                    <input className="form-input" type="number" min="0" value={cpForm.paidAmount} onChange={e => setCpForm({ ...cpForm, paidAmount: e.target.value })} />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Hạn thanh toán</label>
                                    <input className="form-input" type="date" value={cpForm.dueDate} onChange={e => setCpForm({ ...cpForm, dueDate: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Trạng thái</label>
                                    <select className="form-select" value={cpForm.status} onChange={e => setCpForm({ ...cpForm, status: e.target.value })}>
                                        {['Chưa TT', 'Tạm ứng', 'Đang TT', 'Hoàn thành'].map(s => <option key={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setModal(null)}>Hủy</button>
                            <button className="btn btn-primary" onClick={createContractorPayment}>Lưu</button>
                        </div>
                    </div>
                </div>
            )}

            {modal === 'contract' && (
                <div className="modal-overlay" onClick={() => setModal(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 720 }}>
                        <div className="modal-header"><h3>Thêm hợp đồng</h3><button className="modal-close" onClick={() => setModal(null)}>×</button></div>
                        <div className="modal-body">
                            {/* Type selector */}
                            <div className="form-group"><label className="form-label">Loại hợp đồng *</label>
                                <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                    {CONTRACT_TYPES.map(t => (
                                        <button key={t} type="button" onClick={() => setTypeAndPhases(t)} className={`btn ${contractForm.type === t ? 'btn-primary' : 'btn-ghost'}`} style={{ padding: '10px 12px', fontSize: 13, justifyContent: 'flex-start', textAlign: 'left' }}>
                                            {t === 'Thiết kế' && '🎨 '}{t === 'Thi công thô' && '🧱 '}{t === 'Thi công hoàn thiện' && '🏠 '}{t === 'Nội thất' && '🪑 '}{t}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="form-group"><label className="form-label">Tên HĐ</label><input className="form-input" value={contractForm.name} onChange={e => setContractForm({ ...contractForm, name: e.target.value })} placeholder={`HĐ ${contractForm.type} - ${p.name}`} /></div>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">Giá trị HĐ *</label><input className="form-input" type="number" value={contractForm.contractValue} onChange={e => setValueAndRecalc(e.target.value)} placeholder="VNĐ" /></div>
                                <div className="form-group"><label className="form-label">Ngày ký</label><input className="form-input" type="date" value={contractForm.signDate} onChange={e => setContractForm({ ...contractForm, signDate: e.target.value })} /></div>
                            </div>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">Ngày bắt đầu</label><input className="form-input" type="date" value={contractForm.startDate} onChange={e => setContractForm({ ...contractForm, startDate: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Ngày kết thúc</label><input className="form-input" type="date" value={contractForm.endDate} onChange={e => setContractForm({ ...contractForm, endDate: e.target.value })} /></div>
                            </div>

                            {/* Payment Phases Editor */}
                            <div style={{ marginTop: 16, border: '1px solid var(--border-color)', borderRadius: 8, overflow: 'hidden' }}>
                                <div style={{ background: 'var(--bg-elevated)', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: 600, fontSize: 13 }}>💰 Đợt thanh toán ({paymentPhases.length} đợt{paymentPhases.length > 0 ? ` — Tổng ${paymentPhases.reduce((s, p) => s + p.pct, 0)}%` : ''})</span>
                                    <button type="button" className="btn btn-ghost btn-sm" onClick={addPhase} style={{ fontSize: 12, padding: '4px 10px' }}>+ Thêm đợt</button>
                                </div>
                                {paymentPhases.length === 0 ? (
                                    <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Chọn loại HĐ để hiển thị đợt thanh toán mẫu</div>
                                ) : (
                                    <table className="data-table" style={{ marginBottom: 0 }}>
                                        <thead><tr><th style={{ width: 30 }}>#</th><th>Tên đợt</th><th style={{ width: 60 }}>%</th><th style={{ width: 130 }}>Số tiền</th><th style={{ width: 30 }}></th></tr></thead>
                                        <tbody>{paymentPhases.map((phase, idx) => (
                                            <tr key={idx}>
                                                <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{idx + 1}</td>
                                                <td><input className="form-input" value={phase.phase} onChange={e => updatePhase(idx, 'phase', e.target.value)} style={{ padding: '4px 8px', fontSize: 13 }} /></td>
                                                <td><input className="form-input" type="number" min="0" max="100" value={phase.pct} onChange={e => updatePhase(idx, 'pct', e.target.value)} style={{ padding: '4px 6px', fontSize: 13, textAlign: 'center' }} /></td>
                                                <td style={{ fontWeight: 600, fontSize: 13, color: 'var(--status-success)' }}>{fmt(phase.amount)}</td>
                                                <td><button type="button" onClick={() => removePhase(idx)} style={{ background: 'none', border: 'none', color: 'var(--status-danger)', cursor: 'pointer', fontSize: 16, padding: '2px 6px' }}>×</button></td>
                                            </tr>
                                        ))}</tbody>
                                        {paymentPhases.reduce((s, p) => s + p.pct, 0) !== 100 && (
                                            <tfoot><tr><td colSpan={5} style={{ background: 'rgba(255,180,0,0.1)', color: 'var(--status-warning)', fontSize: 12, fontWeight: 600 }}>⚠ Tổng {paymentPhases.reduce((s, p) => s + Number(p.pct), 0)}% — nên = 100%</td></tr></tfoot>
                                        )}
                                    </table>
                                )}
                            </div>

                            <div className="form-row" style={{ marginTop: 16 }}>
                                <div className="form-group"><label className="form-label">Điều khoản thanh toán</label><input className="form-input" value={contractForm.paymentTerms} onChange={e => setContractForm({ ...contractForm, paymentTerms: e.target.value })} placeholder="VD: Thanh toán theo tiến độ" /></div>
                            </div>
                            <div className="form-group"><label className="form-label">Ghi chú</label><textarea className="form-input" rows={2} value={contractForm.notes} onChange={e => setContractForm({ ...contractForm, notes: e.target.value })} /></div>
                        </div>
                        <div className="modal-footer"><button className="btn btn-ghost" onClick={() => setModal(null)}>Hủy</button><button className="btn btn-primary" onClick={createContract}>Tạo hợp đồng</button></div>
                    </div>
                </div>
            )}
            {modal === 'workorder' && (
                <div className="modal-overlay" onClick={() => setModal(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 550 }}>
                        <div className="modal-header"><h3>Thêm phiếu công việc</h3><button className="modal-close" onClick={() => setModal(null)}>×</button></div>
                        <div className="modal-body">
                            <div className="form-group"><label className="form-label">Tiêu đề *</label><input className="form-input" value={woForm.title} onChange={e => setWoForm({ ...woForm, title: e.target.value })} /></div>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">Loại</label><select className="form-select" value={woForm.category} onChange={e => setWoForm({ ...woForm, category: e.target.value })}><option>Thi công</option><option>Vật tư</option><option>Nội thất</option><option>Điện nước</option><option>Hoàn thiện</option><option>Khác</option></select></div>
                                <div className="form-group"><label className="form-label">Ưu tiên</label><select className="form-select" value={woForm.priority} onChange={e => setWoForm({ ...woForm, priority: e.target.value })}><option>Cao</option><option>Trung bình</option><option>Thấp</option></select></div>
                            </div>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">Người thực hiện</label><input className="form-input" value={woForm.assignee} onChange={e => setWoForm({ ...woForm, assignee: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Hạn</label><input className="form-input" type="date" value={woForm.dueDate} onChange={e => setWoForm({ ...woForm, dueDate: e.target.value })} /></div>
                            </div>
                            <div className="form-group"><label className="form-label">Mô tả</label><textarea className="form-input" rows={2} value={woForm.description} onChange={e => setWoForm({ ...woForm, description: e.target.value })} /></div>
                        </div>
                        <div className="modal-footer"><button className="btn btn-ghost" onClick={() => setModal(null)}>Hủy</button><button className="btn btn-primary" onClick={createWorkOrder}>Lưu</button></div>
                    </div>
                </div>
            )}
            {modal === 'expense' && (
                <div className="modal-overlay" onClick={() => setModal(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
                        <div className="modal-header"><h3>Thêm chi phí phát sinh</h3><button className="modal-close" onClick={() => setModal(null)}>×</button></div>
                        <div className="modal-body">
                            <div className="form-group"><label className="form-label">Mô tả *</label><input className="form-input" value={expenseForm.description} onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })} /></div>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">Hạng mục</label><select className="form-select" value={expenseForm.category} onChange={e => setExpenseForm({ ...expenseForm, category: e.target.value })}><option>Vận chuyển</option><option>Ăn uống</option><option>Xăng dầu</option><option>Dụng cụ</option><option>Sửa chữa</option><option>Khác</option></select></div>
                                <div className="form-group"><label className="form-label">Số tiền *</label><input className="form-input" type="number" value={expenseForm.amount} onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })} /></div>
                            </div>
                            <div className="form-group"><label className="form-label">Người nộp</label><input className="form-input" value={expenseForm.submittedBy} onChange={e => setExpenseForm({ ...expenseForm, submittedBy: e.target.value })} /></div>
                        </div>
                        <div className="modal-footer"><button className="btn btn-ghost" onClick={() => setModal(null)}>Hủy</button><button className="btn btn-primary" onClick={createExpense}>Lưu</button></div>
                    </div>
                </div>
            )}
            {modal === 'log' && (
                <div className="modal-overlay" onClick={() => setModal(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
                        <div className="modal-header"><h3>Thêm nhật ký</h3><button className="modal-close" onClick={() => setModal(null)}>×</button></div>
                        <div className="modal-body">
                            <div className="form-group"><label className="form-label">Loại</label><select className="form-select" value={logForm.type} onChange={e => setLogForm({ ...logForm, type: e.target.value })}><option>Điện thoại</option><option>Gặp mặt</option><option>Email</option><option>Zalo</option></select></div>
                            <div className="form-group"><label className="form-label">Nội dung *</label><textarea className="form-input" rows={3} value={logForm.content} onChange={e => setLogForm({ ...logForm, content: e.target.value })} /></div>
                            <div className="form-group"><label className="form-label">Người ghi</label><input className="form-input" value={logForm.createdBy} onChange={e => setLogForm({ ...logForm, createdBy: e.target.value })} /></div>
                        </div>
                        <div className="modal-footer"><button className="btn btn-ghost" onClick={() => setModal(null)}>Hủy</button><button className="btn btn-primary" onClick={createTrackingLog}>Lưu</button></div>
                    </div>
                </div>
            )}
            {modal === 'mp' && (() => {
                const filtered = mpProducts.filter(pr => {
                    const q = mpSearch.toLowerCase();
                    return !q || pr.name?.toLowerCase().includes(q) || pr.code?.toLowerCase().includes(q);
                });
                const selected = mpProducts.find(pr => pr.id === mpForm.productId);
                return (
                    <div className="modal-overlay" onClick={() => setModal(null)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
                            <div className="modal-header"><h3>+ Thêm kế hoạch vật tư</h3><button className="modal-close" onClick={() => setModal(null)}>×</button></div>
                            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                <div className="form-group">
                                    <label className="form-label">Tìm sản phẩm <span style={{ color: 'red' }}>*</span></label>
                                    <input className="form-input" placeholder="Tìm theo tên hoặc mã..." value={mpSearch} onChange={e => setMpSearch(e.target.value)} autoFocus />
                                    {mpSearch && !selected && (
                                        <div style={{ border: '1px solid var(--border)', borderRadius: 6, maxHeight: 200, overflowY: 'auto', marginTop: 4, background: 'var(--bg-card)' }}>
                                            {filtered.slice(0, 20).map(pr => (
                                                <div key={pr.id} onClick={() => { setMpForm(f => ({ ...f, productId: pr.id, unitPrice: pr.price || 0 })); setMpSearch(pr.name); }}
                                                    style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)', fontSize: 13 }}
                                                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                                                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                                                    <span style={{ fontWeight: 600 }}>{pr.name}</span>
                                                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>{pr.code} · {pr.unit}</span>
                                                </div>
                                            ))}
                                            {filtered.length === 0 && <div style={{ padding: '8px 12px', color: 'var(--text-muted)', fontSize: 13 }}>Không tìm thấy sản phẩm</div>}
                                        </div>
                                    )}
                                    {selected && <div style={{ marginTop: 6, padding: '6px 10px', background: 'var(--bg-hover)', borderRadius: 6, fontSize: 13 }}>
                                        ✓ <strong>{selected.name}</strong> <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{selected.code} · {selected.unit}</span>
                                        <button style={{ marginLeft: 8, fontSize: 11, color: 'var(--status-danger)', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => { setMpForm(f => ({ ...f, productId: '' })); setMpSearch(''); }}>✕ Bỏ chọn</button>
                                    </div>}
                                </div>
                                <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    <div className="form-group">
                                        <label className="form-label">Số lượng <span style={{ color: 'red' }}>*</span></label>
                                        <input className="form-input" type="number" min="0" step="any" value={mpForm.quantity} onChange={e => setMpForm(f => ({ ...f, quantity: e.target.value }))} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Đơn giá dự toán</label>
                                        <input className="form-input" type="number" min="0" step="1000" value={mpForm.unitPrice} onChange={e => setMpForm(f => ({ ...f, unitPrice: e.target.value }))} />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Loại</label>
                                    <select className="form-select" value={mpForm.type} onChange={e => setMpForm(f => ({ ...f, type: e.target.value }))}>
                                        <option>Chính</option>
                                        <option>Phụ</option>
                                        <option>Dự phòng</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Ghi chú</label>
                                    <input className="form-input" value={mpForm.notes} onChange={e => setMpForm(f => ({ ...f, notes: e.target.value }))} />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-ghost" onClick={() => setModal(null)}>Hủy</button>
                                <button className="btn btn-primary" onClick={saveMaterialPlan} disabled={!mpForm.productId}>+ Thêm vật tư</button>
                            </div>
                        </div>
                    </div>
                );
            })()}
            {modal === 'po' && (
                <div className="modal-overlay" onClick={() => setModal(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 820 }}>
                        <div className="modal-header"><h3>{editingPoId ? '✏️ Chỉnh sửa phiếu mua hàng' : '🛒 Tạo đơn mua hàng'}</h3><button className="modal-close" onClick={() => { setModal(null); setEditingPoId(null); }}>×</button></div>
                        <div className="modal-body">
                            <div className="form-row">
                                <div className="form-group" style={{ flex: 2 }}>
                                    <label className="form-label">Nhà cung cấp *</label>
                                    {poForm.supplier ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--bg-hover)', borderRadius: 6, border: '1px solid var(--border-color)' }}>
                                            <div style={{ flex: 1 }}>
                                                <strong style={{ fontSize: 13 }}>{poForm.supplier}</strong>
                                                {poForm.supplierId
                                                    ? (() => { const s = suppliers.find(x => x.id === poForm.supplierId); return s ? <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>{s.code} · {s.phone}</span> : null; })()
                                                    : <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>✏️ Nhập thủ công</span>
                                                }
                                            </div>
                                            <button type="button" style={{ fontSize: 11, color: 'var(--status-danger)', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => { setPoForm(f => ({ ...f, supplierId: '', supplier: '' })); setSupplierSearch(''); }}>✕ Đổi</button>
                                        </div>
                                    ) : (
                                        <div>
                                            <input className="form-input" autoFocus placeholder="Tìm hoặc nhập tên nhà cung cấp..." value={supplierSearch} onChange={e => setSupplierSearch(e.target.value)}
                                                onKeyDown={e => { if (e.key === 'Enter' && supplierSearch.trim()) { setPoForm(f => ({ ...f, supplierId: '', supplier: supplierSearch.trim() })); } }} />
                                            {supplierSearch && (
                                                <div style={{ border: '1px solid var(--border-color)', borderRadius: 6, maxHeight: 200, overflowY: 'auto', marginTop: 4, background: 'var(--bg-card)', position: 'relative', zIndex: 10 }}>
                                                    {/* Manual entry option at top */}
                                                    <div onClick={() => { setPoForm(f => ({ ...f, supplierId: '', supplier: supplierSearch.trim() })); }}
                                                        style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border-color)', fontSize: 13, background: 'rgba(35,64,147,0.04)', display: 'flex', alignItems: 'center', gap: 6 }}
                                                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                                                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(35,64,147,0.04)'}>
                                                        <span style={{ fontSize: 16 }}>✏️</span>
                                                        <span>Dùng: <strong>"{supplierSearch}"</strong></span>
                                                        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>(nhập thủ công)</span>
                                                    </div>
                                                    {suppliers.filter(s => { const q = supplierSearch.toLowerCase(); return s.name?.toLowerCase().includes(q) || s.code?.toLowerCase().includes(q); }).slice(0, 15).map(s => (
                                                        <div key={s.id} onClick={() => { setPoForm(f => ({ ...f, supplierId: s.id, supplier: s.name })); setSupplierSearch(s.name); }}
                                                            style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border-color)', fontSize: 13 }}
                                                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                                                            onMouseLeave={e => e.currentTarget.style.background = ''}>
                                                            <span style={{ fontWeight: 600 }}>{s.name}</span>
                                                            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>{s.code}</span>
                                                            {s.phone && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>· {s.phone}</span>}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="form-group"><label className="form-label">Ngày giao dự kiến</label><input type="date" className="form-input" value={poForm.deliveryDate} onChange={e => setPoForm({ ...poForm, deliveryDate: e.target.value })} /></div>
                            </div>
                            {/* Delivery type - core feature */}
                            <div className="form-group">
                                <label className="form-label">Điểm nhận hàng *</label>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    {[['Giao thẳng dự án', '🏗', 'Xe chở thẳng đến công trình — không qua kho công ty'], ['Nhập kho công ty', '🏢', 'Nhập vào kho tổng của công ty trước']].map(([val, icon, desc]) => (
                                        <button key={val} type="button" onClick={() => setPoForm(f => ({ ...f, deliveryType: val, deliveryAddress: val === 'Giao thẳng dự án' ? (p.address || '') : '' }))}
                                            style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: `2px solid ${poForm.deliveryType === val ? 'var(--primary)' : 'var(--border-color)'}`, background: poForm.deliveryType === val ? 'rgba(35,64,147,0.06)' : 'transparent', cursor: 'pointer', textAlign: 'left' }}>
                                            <div style={{ fontWeight: 600, fontSize: 13 }}>{icon} {val}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{desc}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {poForm.deliveryType === 'Giao thẳng dự án' && (
                                <div className="form-group">
                                    <label className="form-label">Địa chỉ công trình</label>
                                    <input className="form-input" value={poForm.deliveryAddress} onChange={e => setPoForm(f => ({ ...f, deliveryAddress: e.target.value }))} placeholder="Địa chỉ tự động lấy từ dự án" />
                                </div>
                            )}
                            <div className="form-group"><label className="form-label">Ghi chú</label><textarea className="form-input" rows={2} value={poForm.notes} onChange={e => setPoForm({ ...poForm, notes: e.target.value })} /></div>
                            <div style={{ marginTop: 8 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <span style={{ fontSize: 13, fontWeight: 600 }}>📦 Danh sách vật tư ({poItems.length} mục)</span>
                                    <button className="btn btn-ghost btn-sm" onClick={addNewPoItem} style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 600 }}>+ Thêm dòng</button>
                                </div>
                                <div className="table-container"><table className="data-table">
                                    <thead><tr><th>Tên hàng hóa / Vật tư</th><th style={{ width: 64 }}>ĐVT</th><th style={{ width: 90 }}>SL đặt</th><th style={{ width: 120 }}>Đơn giá</th><th style={{ width: 120 }}>Thành tiền</th><th style={{ width: 36 }}></th></tr></thead>
                                    <tbody>
                                        {poItems.map((item, idx) => (
                                            <tr key={idx}>
                                                <td><input className="form-input" style={{ padding: '4px 8px', fontSize: 13 }} placeholder="Tên hàng hóa..." value={item.productName} onChange={e => updatePOItem(idx, 'productName', e.target.value)} /></td>
                                                <td><input className="form-input" style={{ width: 60, padding: '4px 6px', fontSize: 13 }} placeholder="ĐVT" value={item.unit} onChange={e => updatePOItem(idx, 'unit', e.target.value)} /></td>
                                                <td><input type="number" className="form-input" style={{ width: 80, padding: '4px 8px' }} min="0" step="any" value={item.quantity} onChange={e => updatePOItem(idx, 'quantity', e.target.value)} /></td>
                                                <td><input type="number" className="form-input" style={{ width: 110, padding: '4px 8px' }} min="0" step="1000" value={item.unitPrice} onChange={e => updatePOItem(idx, 'unitPrice', e.target.value)} /></td>
                                                <td className="amount" style={{ fontWeight: 600 }}>{fmt(item.amount)}</td>
                                                <td><button className="btn btn-ghost btn-sm" onClick={() => removePOItem(idx)} style={{ color: 'var(--status-danger)', padding: '2px 6px' }}>✕</button></td>
                                            </tr>
                                        ))}
                                        {poItems.length === 0 && (
                                            <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '16px 12px', fontSize: 13 }}>
                                                Nhấn <strong>+ Thêm dòng</strong> để thêm vật tư
                                            </td></tr>
                                        )}
                                    </tbody>
                                    <tfoot><tr><td colSpan={4} style={{ textAlign: 'right', fontWeight: 700, padding: '8px 12px' }}>Tổng cộng:</td><td className="amount" style={{ fontWeight: 700, color: 'var(--accent-primary)', fontSize: 15 }}>{fmt(poItems.reduce((s, i) => s + (Number(i.amount) || 0), 0))}</td><td></td></tr></tfoot>
                                </table></div>
                            </div>
                        </div>
                        <div className="modal-footer"><button className="btn btn-ghost" onClick={() => { setModal(null); setEditingPoId(null); }}>Hủy</button><button className="btn btn-primary" onClick={createPO}>{editingPoId ? '💾 Lưu thay đổi' : '🛒 Tạo đơn mua hàng'}</button></div>
                    </div>
                </div>
            )}

            {/* MODAL: Yêu cầu vật tư */}
            {modal === 'req' && (() => {
                const plan = p.materialPlans.find(m => m.id === reqForm.materialPlanId);
                const remaining = plan ? plan.quantity - plan.orderedQty : 0;
                return (
                    <div className="modal-overlay" onClick={() => setModal(null)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
                            <div className="modal-header"><h3>📋 Phiếu Yêu cầu Vật tư</h3><button className="modal-close" onClick={() => setModal(null)}>×</button></div>
                            <div className="modal-body">
                                {plan && (
                                    <div style={{ padding: '10px 14px', background: 'var(--surface-alt)', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
                                        <div style={{ fontWeight: 700 }}>{plan.product?.name}</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                                            SL Cần: <strong>{plan.quantity}</strong> · Đã đặt: <strong>{plan.orderedQty}</strong> · Còn được gọi: <strong style={{ color: remaining > 0 ? 'var(--status-info)' : 'var(--status-success)' }}>{remaining}</strong> {plan.product?.unit}
                                        </div>
                                    </div>
                                )}
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Số lượng yêu cầu *</label>
                                        <input className="form-input" type="number" value={reqForm.requestedQty} onChange={e => setReqForm(f => ({ ...f, requestedQty: e.target.value }))} autoFocus />
                                        {Number(reqForm.requestedQty) > remaining && remaining > 0 && <div style={{ fontSize: 11, color: 'var(--status-danger)', marginTop: 4 }}>⚠ Vượt dự toán — cần PM phê duyệt</div>}
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Ngày cần hàng</label>
                                        <input className="form-input" type="datetime-local" value={reqForm.requestedDate} onChange={e => setReqForm(f => ({ ...f, requestedDate: e.target.value }))} />
                                    </div>
                                </div>
                                <div className="form-group"><label className="form-label">Người yêu cầu</label><input className="form-input" value={reqForm.createdBy} onChange={e => setReqForm(f => ({ ...f, createdBy: e.target.value }))} placeholder="Tên giám sát / QS" /></div>
                                <div className="form-group"><label className="form-label">Ghi chú cho tài xế / NCC</label><textarea className="form-input" rows={2} value={reqForm.notes} onChange={e => setReqForm(f => ({ ...f, notes: e.target.value }))} placeholder="VD: Đổ ở ngõ sau, xe 1.2 tấn mới vào được" /></div>
                            </div>
                            <div className="modal-footer"><button className="btn btn-ghost" onClick={() => setModal(null)}>Hủy</button><button className="btn btn-primary" onClick={createRequisition}>Gửi yêu cầu</button></div>
                        </div>
                    </div>
                );
            })()}

            {/* MODAL: Nghiệm thu (GRN) */}
            {modal === 'grn' && grn && (
                <div className="modal-overlay" onClick={() => setModal(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
                        <div className="modal-header"><h3>📦 Nghiệm thu hàng — {grn.po.code}</h3><button className="modal-close" onClick={() => setModal(null)}>×</button></div>
                        <div className="modal-body">
                            <div style={{ padding: '8px 14px', background: grn.po.deliveryType === 'Giao thẳng dự án' ? 'rgba(14,165,233,0.08)' : 'var(--surface-alt)', borderRadius: 8, marginBottom: 16, fontSize: 13, borderLeft: `3px solid ${grn.po.deliveryType === 'Giao thẳng dự án' ? 'var(--status-info)' : 'var(--border-color)'}` }}>
                                <strong>{grn.po.deliveryType === 'Giao thẳng dự án' ? '🏗 Giao thẳng công trình' : '🏢 Nhập kho công ty'}</strong>
                                {grn.po.deliveryType === 'Giao thẳng dự án' && <div style={{ fontSize: 12, marginTop: 2, color: 'var(--text-muted)' }}>Số lượng nhận sẽ cập nhật cột "Đã nhận" trong Tab Vật tư. Không ảnh hưởng tồn kho tổng.</div>}
                                <div style={{ marginTop: 4, fontSize: 12 }}>NCC: <strong>{grn.po.supplier}</strong> · {grn.po.deliveryAddress && <span>📍 {grn.po.deliveryAddress}</span>}</div>
                            </div>
                            <table className="data-table">
                                <thead><tr><th>Vật tư</th><th>ĐVT</th><th>SL đặt</th><th>Đã nhận</th><th>Thực nhận lần này</th></tr></thead>
                                <tbody>{grn.items.map((item, idx) => (
                                    <tr key={item.id}>
                                        <td className="primary">{item.productName}</td>
                                        <td>{item.unit}</td>
                                        <td>{item.quantity}</td>
                                        <td style={{ color: 'var(--status-success)' }}>{item.receivedQty}</td>
                                        <td><input type="number" className="form-input" style={{ width: 90, padding: '4px 8px' }} value={item.actualQty} min={0} max={item.quantity - item.receivedQty} onChange={e => updateGRNItem(idx, e.target.value)} /></td>
                                    </tr>
                                ))}</tbody>
                            </table>
                            <div className="form-group" style={{ marginTop: 12 }}>
                                <label className="form-label">Ghi chú nghiệm thu</label>
                                <input className="form-input" value={grn.note || ''} onChange={e => setGrn(g => ({ ...g, note: e.target.value }))} placeholder="VD: Thiếu 5 bao, hẹn bổ sung chiều mai" />
                            </div>
                            {grn.po.deliveryType === 'Giao thẳng dự án' && (
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 12px', background: 'rgba(16,185,129,0.06)', borderRadius: 6, marginTop: 8 }}>
                                    ✅ Sau khi xác nhận: Hệ thống tự động ghi nhận <strong>Chi phí trực tiếp</strong> vào Tab Tài chính dự án.
                                </div>
                            )}
                        </div>
                        <div className="modal-footer"><button className="btn btn-ghost" onClick={() => setModal(null)}>Hủy</button><button className="btn btn-primary btn-success" onClick={confirmGRN}>✓ Xác nhận đã nhận hàng</button></div>
                    </div>
                </div>
            )}

            {/* Modal: Budget Quick Add */}
            {modal === 'budget_quick' && (
                <BudgetQuickAdd
                    projectId={id}
                    products={mpProducts}
                    initialRows={quotationImportRows}
                    onClose={() => { setModal(null); setQuotationImportRows(null); }}
                    onDone={() => { setModal(null); setQuotationImportRows(null); fetchData(); setVarianceKey(k => k + 1); }}
                />
            )}
        </div>
    );
}
