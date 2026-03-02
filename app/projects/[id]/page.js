'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DocumentManager from '@/components/documents/DocumentManager';
import ScheduleManager from '@/components/schedule/ScheduleManager';
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
    const [data, setData] = useState(null);
    const [tab, setTab] = useState('overview');
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(null);
    const [financeSubTab, setFinanceSubTab] = useState('payments');
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
    const fetchData = () => { fetch(`/api/projects/${id}`).then(r => r.json()).then(d => { setData(d); setLoading(false); }); };
    useEffect(fetchData, [id]);

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

    // PO from materials
    const [poForm, setPoForm] = useState({ supplier: '', supplierId: '', deliveryDate: '', notes: '', deliveryType: 'Giao thẳng dự án', deliveryAddress: '' });
    const [poItems, setPoItems] = useState([]);
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
        setModal('po');
    };
    const printPO = (po) => {
        const sup = po.supplierRel || {};
        const fmtN = (n) => new Intl.NumberFormat('vi-VN').format(n || 0);
        const fmtD = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
        const rows = (po.items || []).map((it, i) => `
            <tr>
                <td class="center">${i + 1}</td>
                <td>${it.productName}</td>
                <td class="center">${it.unit}</td>
                <td class="num">${fmtN(it.quantity)}</td>
                <td class="num">${fmtN(it.unitPrice)}</td>
                <td class="num">${fmtN(it.amount)}</td>
            </tr>`).join('');
        const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Phiếu mua hàng ${po.code}</title>
<style>
  *{box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:13px;color:#000;margin:15mm 20mm}
  h2{text-align:center;font-size:17px;margin:0 0 2px;text-transform:uppercase}
  .sub{text-align:center;font-size:12px;color:#555;margin-bottom:16px}
  .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px}
  .info-box{border:1px solid #bbb;padding:8px 12px;border-radius:3px}
  .info-box h4{margin:0 0 6px;font-size:11px;text-transform:uppercase;color:#666;border-bottom:1px solid #ddd;padding-bottom:3px}
  .row{display:flex;gap:6px;margin-bottom:3px;font-size:12px}
  .lbl{font-weight:bold;min-width:80px;flex-shrink:0}
  table{width:100%;border-collapse:collapse;margin:10px 0}
  th{background:#e8e8e8;padding:7px 8px;text-align:left;border:1px solid #bbb;font-size:11px}
  td{padding:6px 8px;border:1px solid #ccc;font-size:12px}
  .center{text-align:center}.num{text-align:right}
  tfoot td{font-weight:bold;background:#f0f0f0}
  .sigs{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-top:36px;text-align:center}
  .sig h4{font-size:12px;margin:0 0 4px}.sig p{font-size:11px;color:#666;margin:0 0 50px}
  .notes-box{border:1px solid #ddd;padding:8px 12px;border-radius:3px;font-size:12px;margin-top:10px}
  .print-btn{display:block;margin:16px auto;padding:8px 24px;background:#1a3a8f;color:#fff;border:none;border-radius:4px;font-size:13px;cursor:pointer}
  @media print{.print-btn{display:none}body{margin:10mm 15mm}}
</style></head><body>
<h2>Phiếu Mua Hàng</h2>
<p class="sub">Số: <strong>${po.code}</strong> &nbsp;·&nbsp; Ngày đặt: <strong>${fmtD(po.orderDate)}</strong>${po.deliveryDate ? ` &nbsp;·&nbsp; Giao dự kiến: <strong>${fmtD(po.deliveryDate)}</strong>` : ''}</p>
<div class="info-grid">
  <div class="info-box"><h4>Nhà cung cấp</h4>
    <div class="row"><span class="lbl">Tên NCC:</span><strong>${po.supplier}</strong></div>
    ${sup.phone ? `<div class="row"><span class="lbl">Điện thoại:</span>${sup.phone}</div>` : ''}
    ${sup.address ? `<div class="row"><span class="lbl">Địa chỉ:</span>${sup.address}</div>` : ''}
    ${sup.taxCode ? `<div class="row"><span class="lbl">MST:</span>${sup.taxCode}</div>` : ''}
    ${sup.bankAccount ? `<div class="row"><span class="lbl">TK Ngân hàng:</span>${sup.bankAccount}${sup.bankName ? ` — ${sup.bankName}` : ''}</div>` : ''}
  </div>
  <div class="info-box"><h4>Thông tin giao hàng</h4>
    ${po.project ? `<div class="row"><span class="lbl">Dự án:</span>${po.project.name || ''}</div>` : ''}
    <div class="row"><span class="lbl">Hình thức:</span>${po.deliveryType}</div>
    ${po.deliveryAddress ? `<div class="row"><span class="lbl">Địa chỉ:</span>${po.deliveryAddress}</div>` : ''}
  </div>
</div>
<table>
  <thead><tr><th style="width:36px">#</th><th>Tên hàng hóa / Vật tư</th><th style="width:50px">ĐVT</th><th style="width:70px">SL</th><th style="width:110px">Đơn giá (VNĐ)</th><th style="width:120px">Thành tiền (VNĐ)</th></tr></thead>
  <tbody>${rows}</tbody>
  <tfoot><tr><td colspan="5" class="num">Tổng cộng:</td><td class="num">${fmtN(po.totalAmount)}</td></tr></tfoot>
</table>
${po.notes ? `<div class="notes-box"><strong>Ghi chú:</strong> ${po.notes}</div>` : ''}
<div class="sigs">
  <div class="sig"><h4>Người lập phiếu</h4><p>(Ký, ghi rõ họ tên)</p></div>
  <div class="sig"><h4>Giám đốc</h4><p>(Ký, đóng dấu)</p></div>
  <div class="sig"><h4>Đại diện NCC</h4><p>(Ký, ghi rõ họ tên)</p></div>
</div>
<button class="print-btn" onclick="window.print()">🖨 In phiếu mua hàng</button>
</body></html>`;
        const w = window.open('', '_blank', 'width=850,height=700');
        w.document.write(html);
        w.document.close();
    };
    const updatePOItem = (idx, field, value) => {
        setPoItems(prev => { const u = [...prev]; u[idx] = { ...u[idx], [field]: value }; if (field === 'quantity' || field === 'unitPrice') u[idx].amount = (Number(u[idx].quantity) || 0) * (Number(u[idx].unitPrice) || 0); return u; });
    };
    const removePOItem = (idx) => setPoItems(prev => prev.filter((_, i) => i !== idx));
    const createPO = async () => {
        if (!poForm.supplierId) return alert('Vui lòng chọn nhà cung cấp');
        if (poItems.length === 0) return alert('Không có vật tư nào để đặt');
        const totalAmount = poItems.reduce((s, i) => s + (Number(i.amount) || 0), 0);
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
        setModal(null); setPoItems([]); fetchData(); setTab('purchase');
    };

    // Add Material Plan
    const [mpForm, setMpForm] = useState({ productId: '', quantity: 1, unitPrice: 0, type: 'Chính', notes: '' });
    const [mpProducts, setMpProducts] = useState([]);
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
    const p = data;
    const pnl = p.pnl;
    const st = p.settlement;
    const pipelineIdx = STATUS_MAP[p.status] ?? 0;

    const tabs = [
        { key: 'overview', label: 'Tổng quan', icon: '📋' },
        { key: 'logs', label: 'Nhật ký', icon: '📒', count: p.trackingLogs?.length },
        { key: 'milestones', label: 'Tiến độ', icon: '📊', count: p.milestones?.length },
        { key: 'contracts', label: 'Hợp đồng', icon: '📝', count: p.contracts?.length },
        { key: 'workorders', label: 'Phiếu CV', icon: '📋', count: p.workOrders?.length },
        { key: 'materials', label: 'Vật tư', icon: '🧱', count: p.materialPlans?.length },
        { key: 'purchase', label: 'Mua hàng', icon: '🛒', count: p.purchaseOrders?.length },
        { key: 'contractors', label: 'Thầu phụ', icon: '👷', count: p.contractorPays?.length },
        { key: 'finance', label: 'Tài chính', icon: '💰' },
        { key: 'documents', label: 'Tài liệu', icon: '📁', count: p.documents?.length },
    ];

    return (
        <div>
            <button className="btn btn-secondary" onClick={() => router.push('/projects')} style={{ marginBottom: 16 }}>← Quay lại</button>

            {/* Project Header */}
            <div className="card" style={{ marginBottom: 24, padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
                            <span style={{ color: 'var(--text-accent)', fontSize: 14, fontWeight: 600 }}>{p.code}</span>
                            <span className={`badge ${p.status === 'Hoàn thành' ? 'success' : p.status === 'Đang thi công' ? 'warning' : 'info'}`}>{p.status}</span>
                            {p.phase && <span className="badge muted">{p.phase}</span>}
                            {/* Project Health Badge */}
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
                            {pnl.profit >= 0 ? <span className="badge success">📈 Lãi {fmt(pnl.profit)}</span> : <span className="badge danger">📉 Lỗ {fmt(Math.abs(pnl.profit))}</span>}
                        </div>
                        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{p.name}</h2>
                        <div style={{ color: 'var(--text-muted)', marginTop: 4, fontSize: 13 }}>{p.customer?.name} • {p.address}</div>
                        {/* PM + Team */}
                        <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 12, color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                            {p.manager && <span title="Quản lý dự án">👤 PM: <strong>{p.manager}</strong></span>}
                            {p.designer && <span title="Thiết kế">🎨 TK: {p.designer}</span>}
                            {p.supervisor && <span title="Giám sát">🔧 GS: {p.supervisor}</span>}
                        </div>
                        {/* Timeline */}
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
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 32, fontWeight: 700 }}>{p.progress}%</div>
                        <div className="progress-bar" style={{ width: 120 }}><div className="progress-fill" style={{ width: `${p.progress}%` }}></div></div>
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginTop: 8 }}>
                    {[
                        { v: `${p.area}m²`, l: 'Diện tích' }, { v: `${p.floors} tầng`, l: 'Số tầng' },
                        { v: fmt(p.contractValue), l: 'Giá trị HĐ' }, { v: fmt(p.paidAmount), l: 'Đã thu' },
                        { v: fmt(pnl.debtFromCustomer), l: 'KH còn nợ', c: pnl.debtFromCustomer > 0 ? 'var(--status-danger)' : 'var(--status-success)' }
                    ].map(s => (
                        <div key={s.l} style={{ textAlign: 'center', padding: '8px 0' }}>
                            <div style={{ fontWeight: 700, fontSize: 15, color: s.c || 'var(--text-primary)' }}>{s.v}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.l}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Tabs */}
            <div className="project-tabs">
                {tabs.map(t => (
                    <button key={t.key} className={`project-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
                        <span>{t.icon}</span> {t.label}
                        {t.count > 0 && <span className="tab-count">{t.count}</span>}
                    </button>
                ))}
            </div>

            {/* TAB: Nhật ký */}
            {tab === 'logs' && (
                <div className="card" style={{ padding: 24 }}>
                    <div className="card-header"><span className="card-title">📒 Nhật ký theo dõi</span><button className="btn btn-primary btn-sm" onClick={() => setModal('log')}>+ Ghi chú</button></div>
                    {p.trackingLogs.map(log => (
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
                    {p.trackingLogs.length === 0 && <div style={{ color: 'var(--text-muted)', padding: 24, textAlign: 'center' }}>Chưa có nhật ký theo dõi</div>}
                </div>
            )}

            {/* TAB: Tổng quan */}
            {tab === 'overview' && (
                <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                    <div className="card">
                        <div className="card-header"><span className="card-title">👥 Nhân sự</span></div>
                        {p.employees.map(e => (
                            <div key={e.employeeId} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-light)' }}>
                                <span style={{ fontWeight: 600, fontSize: 13 }}>{e.employee.name}</span>
                                <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{e.employee.position}</span>
                            </div>
                        ))}
                        {p.employees.length === 0 && <div style={{ color: 'var(--text-muted)', padding: 20, textAlign: 'center', fontSize: 13 }}>Chưa có nhân sự</div>}
                    </div>
                    <div className="card">
                        <div className="card-header"><span className="card-title">💰 Giao dịch gần đây</span></div>
                        {p.transactions.map(t => (
                            <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-light)' }}>
                                <div><span style={{ fontWeight: 600, fontSize: 13 }}>{t.description}</span><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtDate(t.date)}</div></div>
                                <span style={{ fontWeight: 700, fontSize: 13, color: t.type === 'Thu' ? 'var(--status-success)' : 'var(--status-danger)' }}>{t.type === 'Thu' ? '+' : '-'}{fmt(t.amount)}</span>
                            </div>
                        ))}
                        {p.transactions.length === 0 && <div style={{ color: 'var(--text-muted)', padding: 20, textAlign: 'center', fontSize: 13 }}>Chưa có giao dịch</div>}
                    </div>
                    <div className="card" style={{ gridColumn: '1 / -1' }}>
                        <div className="card-header"><span className="card-title">📝 Nhật ký theo dõi</span>{p.trackingLogs.length > 5 && <button className="btn btn-ghost btn-sm" onClick={() => setTab('logs')} style={{ fontSize: 12 }}>Xem tất cả ({p.trackingLogs.length}) →</button>}</div>
                        {p.trackingLogs.slice(0, 5).map(log => (
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
                    <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: 24 }}>
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
                    <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '2px solid var(--border-light)', paddingBottom: 0 }}>
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
                            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginBottom: 24 }}>
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
                    <div className="card-header">
                        <span className="card-title">📋 Phiếu công việc</span>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <span className="badge warning">{p.workOrders.filter(w => w.status === 'Chờ xử lý').length} chờ</span>
                            <span className="badge info">{p.workOrders.filter(w => w.status === 'Đang xử lý').length} đang làm</span>
                            <span className="badge success">{p.workOrders.filter(w => w.status === 'Hoàn thành').length} xong</span>
                            <button className="btn btn-primary btn-sm" onClick={() => setModal('workorder')}>+ Thêm phiếu</button>
                        </div>
                    </div>
                    <div className="table-container"><table className="data-table">
                        <thead><tr><th>Mã</th><th>Tiêu đề</th><th>Loại</th><th>Ưu tiên</th><th>Người thực hiện</th><th>Hạn</th><th>Trạng thái</th><th></th></tr></thead>
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
                </div>
            )}

            {/* TAB: Vật tư */}
            {tab === 'materials' && (
                <div>
                    <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', marginBottom: 24 }}>
                        <div className="stat-card"><div style={{ fontSize: 20, fontWeight: 700 }}>{p.materialPlans.length}</div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Loại vật tư</div></div>
                        <div className="stat-card"><div style={{ fontSize: 20, fontWeight: 700, color: 'var(--status-info)' }}>{fmt(p.materialPlans.reduce((s, m) => s + m.totalAmount, 0))}</div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tổng dự toán</div></div>
                        <div className="stat-card"><div style={{ fontSize: 20, fontWeight: 700, color: 'var(--status-warning)' }}>{p.materialPlans.filter(m => m.status === 'Chưa đặt' || m.status === 'Đặt một phần').length}</div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Cần đặt thêm</div></div>
                        <div className="stat-card"><div style={{ fontSize: 20, fontWeight: 700, color: 'var(--status-danger)' }}>{p.materialPlans.filter(m => m.receivedQty > m.quantity).length}</div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>⚠ Vượt dự toán</div></div>
                    </div>
                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 16px 0', gap: 8, flexWrap: 'wrap' }}>
                            <button className="btn btn-ghost btn-sm" onClick={openMPModal}>+ Thêm vật tư</button>
                            {p.materialPlans.filter(m => m.status === 'Chưa đặt' || m.status === 'Đặt một phần').length > 0 && (
                                <button className="btn btn-primary btn-sm" onClick={openPOModal}>🛒 Tạo PO ({p.materialPlans.filter(m => m.status === 'Chưa đặt' || m.status === 'Đặt một phần').length} vật tư)</button>
                            )}
                        </div>
                        <div className="table-container"><table className="data-table">
                            <thead><tr><th>Mã</th><th>Vật tư</th><th>SL cần</th><th>Đã đặt</th><th>Đã nhận</th><th>Còn thiếu</th><th title="Số lượng còn được yêu cầu = SL Cần - Đã Đặt">Được gọi</th><th>Đơn giá</th><th>TT</th><th></th></tr></thead>
                            <tbody>{p.materialPlans.map(m => {
                                const missing = m.quantity - m.receivedQty;
                                const canRequest = m.quantity - m.orderedQty;
                                const overReceived = m.receivedQty > m.quantity;
                                return (
                                    <tr key={m.id} style={{ background: overReceived ? 'rgba(239,68,68,0.08)' : '' }}>
                                        <td className="accent" style={{ fontSize: 11 }}>{m.product?.code}</td>
                                        <td>
                                            <div style={{ fontWeight: 600, fontSize: 13 }}>{m.product?.name}</div>
                                            {overReceived && <div style={{ fontSize: 11, color: 'var(--status-danger)', fontWeight: 600 }}>⚠ Nhận vượt {m.receivedQty - m.quantity} {m.product?.unit}</div>}
                                        </td>
                                        <td style={{ fontWeight: 600 }}>{m.quantity} <span style={{ fontSize: 11, opacity: 0.6 }}>{m.product?.unit}</span></td>
                                        <td style={{ color: 'var(--status-info)' }}>{m.orderedQty}</td>
                                        <td style={{ color: overReceived ? 'var(--status-danger)' : 'var(--status-success)', fontWeight: 600 }}>{m.receivedQty}</td>
                                        <td style={{ color: missing > 0 ? 'var(--status-danger)' : 'var(--status-success)', fontWeight: 700 }}>{missing > 0 ? missing : '✓'}</td>
                                        <td style={{ color: canRequest > 0 ? 'var(--text-secondary)' : 'var(--status-success)', fontSize: 12 }}>{canRequest > 0 ? canRequest : '—'}</td>
                                        <td style={{ fontSize: 12 }}>{fmt(m.unitPrice)}</td>
                                        <td><span className={`badge ${m.status === 'Đã đặt đủ' || m.status === 'Đã nhận đủ' ? 'success' : m.status === 'Đặt một phần' || m.status === 'Nhận một phần' ? 'warning' : 'danger'}`} style={{ fontSize: 11 }}>{m.status}</span></td>
                                        <td style={{ display: 'flex', gap: 4 }}>
                                            <button className="btn btn-ghost btn-sm" title="Lập phiếu yêu cầu vật tư" style={{ fontSize: 11 }} onClick={() => openReqModal(m)}>📋 YC</button>
                                            {m.orderedQty === 0 && <button className="btn btn-ghost btn-sm" title="Xóa" style={{ fontSize: 11, color: 'var(--status-danger)' }} onClick={() => deleteMaterialPlan(m.id)}>🗑</button>}
                                        </td>
                                    </tr>
                                );
                            })}</tbody>
                        </table></div>
                        {p.materialPlans.length === 0 && <div style={{ color: 'var(--text-muted)', padding: 24, textAlign: 'center' }}>Chưa có kế hoạch vật tư — bấm "+ Thêm vật tư" để bắt đầu</div>}
                    </div>
                </div>
            )}

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
                    <div className="card-header"><span className="card-title">👷 Thầu phụ & Công nợ</span><span className="badge warning">Tổng nợ thầu: {fmt(pnl.debtToContractors)}</span></div>
                    <div className="table-container"><table className="data-table">
                        <thead><tr><th>Thầu phụ</th><th>Loại</th><th>Mô tả</th><th>HĐ thầu</th><th>Đã TT</th><th>Còn nợ</th><th>TT</th></tr></thead>
                        <tbody>{p.contractorPays.map(cp => (
                            <tr key={cp.id}>
                                <td className="primary">{cp.contractor.name}<div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{cp.contractor.phone}</div></td>
                                <td><span className="badge muted">{cp.contractor.type}</span></td>
                                <td style={{ fontSize: 12 }}>{cp.description}</td>
                                <td className="amount">{fmt(cp.contractAmount)}</td>
                                <td style={{ color: 'var(--status-success)', fontWeight: 600 }}>{fmt(cp.paidAmount)}</td>
                                <td style={{ fontWeight: 700, color: cp.contractAmount - cp.paidAmount > 0 ? 'var(--status-danger)' : 'var(--status-success)' }}>{fmt(cp.contractAmount - cp.paidAmount)}</td>
                                <td><span className={`badge ${cp.status === 'Đã TT' ? 'success' : 'warning'}`}>{cp.status}</span></td>
                            </tr>
                        ))}</tbody>
                    </table></div>
                    {p.contractorPays.length === 0 && <div style={{ color: 'var(--text-muted)', padding: 24, textAlign: 'center' }}>Chưa có thầu phụ</div>}
                </div>
            )}

            {/* TAB: Tài liệu */}
            {tab === 'documents' && <DocumentManager projectId={id} onRefresh={fetchData} />}

            {/* MODALS */}
            {modal === 'contract' && (
                <div className="modal-overlay" onClick={() => setModal(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 720 }}>
                        <div className="modal-header"><h3>Thêm hợp đồng</h3><button className="modal-close" onClick={() => setModal(null)}>×</button></div>
                        <div className="modal-body">
                            {/* Type selector */}
                            <div className="form-group"><label className="form-label">Loại hợp đồng *</label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
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
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 550 }}>
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
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
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
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
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
                        <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
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
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 820 }}>
                        <div className="modal-header"><h3>🛒 Tạo đơn mua hàng</h3><button className="modal-close" onClick={() => setModal(null)}>×</button></div>
                        <div className="modal-body">
                            <div className="form-row">
                                <div className="form-group" style={{ flex: 2 }}>
                                    <label className="form-label">Nhà cung cấp *</label>
                                    {poForm.supplierId ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--bg-hover)', borderRadius: 6, border: '1px solid var(--border-color)' }}>
                                            <div style={{ flex: 1 }}>
                                                <strong style={{ fontSize: 13 }}>{poForm.supplier}</strong>
                                                {(() => { const s = suppliers.find(x => x.id === poForm.supplierId); return s ? <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>{s.code} · {s.phone}</span> : null; })()}
                                            </div>
                                            <button type="button" style={{ fontSize: 11, color: 'var(--status-danger)', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => { setPoForm(f => ({ ...f, supplierId: '', supplier: '' })); setSupplierSearch(''); }}>✕ Đổi</button>
                                        </div>
                                    ) : (
                                        <div>
                                            <input className="form-input" autoFocus placeholder="Tìm tên hoặc mã nhà cung cấp..." value={supplierSearch} onChange={e => setSupplierSearch(e.target.value)} />
                                            {supplierSearch && (
                                                <div style={{ border: '1px solid var(--border-color)', borderRadius: 6, maxHeight: 180, overflowY: 'auto', marginTop: 4, background: 'var(--bg-card)', position: 'relative', zIndex: 10 }}>
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
                                                    {suppliers.filter(s => { const q = supplierSearch.toLowerCase(); return s.name?.toLowerCase().includes(q) || s.code?.toLowerCase().includes(q); }).length === 0 && (
                                                        <div style={{ padding: '8px 12px', color: 'var(--text-muted)', fontSize: 13 }}>Không tìm thấy — kiểm tra danh sách NCC</div>
                                                    )}
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
                                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>📦 Danh sách vật tư ({poItems.length} mục)</div>
                                <div className="table-container"><table className="data-table">
                                    <thead><tr><th>Sản phẩm</th><th>ĐVT</th><th>SL đặt</th><th>Đơn giá</th><th>Thành tiền</th><th></th></tr></thead>
                                    <tbody>{poItems.map((item, idx) => (
                                        <tr key={idx}>
                                            <td className="primary">{item.productName}</td>
                                            <td>{item.unit}</td>
                                            <td><input type="number" className="form-input" style={{ width: 80, padding: '4px 8px' }} value={item.quantity} onChange={e => updatePOItem(idx, 'quantity', e.target.value)} /></td>
                                            <td><input type="number" className="form-input" style={{ width: 110, padding: '4px 8px' }} value={item.unitPrice} onChange={e => updatePOItem(idx, 'unitPrice', e.target.value)} /></td>
                                            <td className="amount">{fmt(item.amount)}</td>
                                            <td><button className="btn btn-ghost btn-sm" onClick={() => removePOItem(idx)} style={{ color: 'var(--status-danger)' }}>✕</button></td>
                                        </tr>
                                    ))}</tbody>
                                    <tfoot><tr><td colSpan={4} style={{ textAlign: 'right', fontWeight: 700, padding: '8px 12px' }}>Tổng cộng:</td><td className="amount" style={{ fontWeight: 700, color: 'var(--accent-primary)', fontSize: 15 }}>{fmt(poItems.reduce((s, i) => s + (Number(i.amount) || 0), 0))}</td><td></td></tr></tfoot>
                                </table></div>
                                {poItems.length === 0 && <div style={{ color: 'var(--text-muted)', padding: 16, textAlign: 'center' }}>Không có vật tư chưa đặt — vào Tab Vật tư để thêm vật tư trước</div>}
                            </div>
                        </div>
                        <div className="modal-footer"><button className="btn btn-ghost" onClick={() => setModal(null)}>Hủy</button><button className="btn btn-primary" onClick={createPO}>🛒 Tạo đơn mua hàng</button></div>
                    </div>
                </div>
            )}

            {/* MODAL: Yêu cầu vật tư */}
            {modal === 'req' && (() => {
                const plan = p.materialPlans.find(m => m.id === reqForm.materialPlanId);
                const remaining = plan ? plan.quantity - plan.orderedQty : 0;
                return (
                    <div className="modal-overlay" onClick={() => setModal(null)}>
                        <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
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
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
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
        </div>
    );
}
