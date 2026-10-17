'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, Save, ClipboardPaste, FileSpreadsheet, CheckCircle2, AlertTriangle, XCircle, GitBranch, Undo2, Copy } from 'lucide-react';
import { useRole } from '@/contexts/RoleContext';
import {
    getCutlistPermissions, checkCutlist, summarizeCutlist, panelAreaM2, panelEdgeMeters, edgeLabel, parseEdgeSpec,
    PANEL_CATEGORY_CODES, EDGE_CATEGORY_CODES, CUTLIST_STATUS_LABELS, CUTLIST_STATUS_STYLE,
} from '@/lib/manufacturing/cutlist';
import { materialFullName } from '@/lib/inventoryV2/materialLabel';
import { useToast } from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';
import CutlistSummary from '@/components/manufacturing/CutlistSummary';

const fmt = (n, d = 3) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: d }).format(n || 0);
const fmtDateTime = (d) => d ? new Date(d).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : '';
const optionLabel = (m) => `${m.sku} — ${materialFullName(m)}`;
const cell = { padding: '4px 6px', fontSize: 12.5 };

let keySeq = 0;
const newKey = () => `k${++keySeq}`;
const newLine = (lineType, base = {}) => ({
    _key: newKey(), lineType, mfgItemId: null, productName: '', partName: '', materialId: null, materialText: '',
    length: '', width: '', thickness: '', quantity: lineType === 'PANEL' ? '1' : '', unit: '',
    grainLocked: false, edgeMaterialId: null, edgeL1: false, edgeL2: false, edgeW1: false, edgeW2: false,
    drawingPage: '', note: '', ...base,
});

// Cột khi dán từ Excel (tab-separated), theo thứ tự
const PASTE_COLUMNS = {
    PANEL: ['Sản phẩm', 'Tên chi tiết', 'Mã ván (SKU)', 'Dài', 'Rộng', 'Dày', 'SL', 'Cạnh (VD: D1 D2 R1 / 2D1R / 4)', 'Mã chỉ (SKU)', 'Theo vân (x)', 'Trang BV', 'Ghi chú'],
    ITEM: ['Sản phẩm', 'Mã vật tư (SKU) hoặc tên', 'SL', 'Đơn vị', 'Trang BV', 'Ghi chú'],
};
const toNumStr = (v) => String(v ?? '').trim().replace(/\s/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');

/** Ô nhập mã có gợi ý (datalist). Gõ đúng SKU hoặc chọn gợi ý thì gắn id; khác thì để trống id. */
function CodeInput({ listId, value, options, onPick, placeholder, invalid, disabled }) {
    const [text, setText] = useState(value || '');
    // Chỉ đồng bộ khi đã khớp mã — gõ dở (chưa khớp) thì giữ nguyên chữ đang gõ
    useEffect(() => { if (value) setText(value); }, [value]);
    return (
        <input className="form-input" list={listId} style={{ ...cell, minWidth: 130, borderColor: invalid ? 'var(--color-danger)' : undefined }}
            value={text} placeholder={placeholder} disabled={disabled}
            onChange={e => {
                const v = e.target.value; setText(v);
                const sku = v.split(' — ')[0].trim().toLowerCase();
                const hit = options.find(o => o.sku.toLowerCase() === sku);
                onPick(hit || null, v);
            }} />
    );
}

export default function CutlistDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const toast = useToast();
    const { role, email, department } = useRole();
    const perms = getCutlistPermissions({ role, email, department });

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [header, setHeader] = useState({});
    const [lines, setLines] = useState([]);
    const [materials, setMaterials] = useState([]);
    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    const [tab, setTab] = useState('PANEL');
    const [paste, setPaste] = useState(null); // { type, text }
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        const res = await fetch(`/api/manufacturing/cutlists/${id}`);
        const d = await res.json();
        if (!res.ok) { toast.error(d.error || 'Không tải được'); setLoading(false); return; }
        setData(d);
        setHeader({
            title: d.title, drawingRef: d.drawingRef, drawingRevision: d.drawingRevision, note: d.note,
            wastePercent: d.wastePercent ? String(d.wastePercent) : '',
            purGramPerMeter: d.purGramPerMeter == null ? '' : String(d.purGramPerMeter),
        });
        setLines(d.lines.map(l => ({
            ...l, _key: newKey(),
            length: l.length ? String(l.length) : '', width: l.width ? String(l.width) : '',
            thickness: l.thickness ? String(l.thickness) : '', quantity: l.quantity ? String(l.quantity) : '',
        })));
        setDirty(false);
        setLoading(false);
    }, [id, toast]);
    useEffect(() => { load(); }, [load]);
    useEffect(() => {
        fetch('/api/inventory-v2/materials?limit=500&status=Đang sử dụng').then(r => r.json()).then(d => setMaterials(d.data || []));
    }, []);

    // Cảnh báo khi rời trang còn thay đổi chưa lưu
    useEffect(() => {
        if (!dirty) return;
        const h = (e) => { e.preventDefault(); e.returnValue = ''; };
        window.addEventListener('beforeunload', h);
        return () => window.removeEventListener('beforeunload', h);
    }, [dirty]);

    const editable = !!data && data.status === 'DRAFT' && perms.edit;
    const matById = useMemo(() => Object.fromEntries(materials.map(m => [m.id, m])), [materials]);
    const panelMaterials = useMemo(() => materials.filter(m => PANEL_CATEGORY_CODES.includes(m.category?.code)), [materials]);
    const edgeMaterials = useMemo(() => materials.filter(m => EDGE_CATEGORY_CODES.includes(m.category?.code)), [materials]);
    const itemMaterials = useMemo(() => materials.filter(m => !PANEL_CATEGORY_CODES.includes(m.category?.code)), [materials]);
    const orderItems = data?.mfgOrder?.items || [];

    // Dòng kèm object vật tư (ưu tiên danh mục mới tải; dòng đã lưu có sẵn material từ server)
    const hydrated = useMemo(() => lines.map(l => ({
        ...l,
        material: l.materialId ? (matById[l.materialId] || (l.material?.id === l.materialId ? l.material : null)) : null,
        edgeMaterial: l.edgeMaterialId ? (matById[l.edgeMaterialId] || (l.edgeMaterial?.id === l.edgeMaterialId ? l.edgeMaterial : null)) : null,
    })), [lines, matById]);
    const parsedHeader = { ...header, purGramPerMeter: header.purGramPerMeter === '' || header.purGramPerMeter == null ? null : Number(header.purGramPerMeter) };
    const issues = useMemo(() => checkCutlist(parsedHeader, hydrated), [hydrated, header]); // eslint-disable-line react-hooks/exhaustive-deps
    const summary = useMemo(() => summarizeCutlist(parsedHeader, hydrated), [hydrated, header]); // eslint-disable-line react-hooks/exhaustive-deps
    const errorCount = issues.filter(i => i.severity === 'error').length;
    const issuesByLine = useMemo(() => {
        const m = {};
        issues.forEach(i => { if (i.lineIndex != null) (m[i.lineIndex] ||= []).push(i); });
        return m;
    }, [issues]);

    const indexed = hydrated.map((l, idx) => ({ ...l, _idx: idx }));
    const panelRows = indexed.filter(l => l.lineType === 'PANEL');
    const itemRows = indexed.filter(l => l.lineType === 'ITEM');

    const setHeaderField = (k) => (e) => { setHeader(h => ({ ...h, [k]: e.target.value })); setDirty(true); };
    const updateLine = (key, patch) => { setLines(ls => ls.map(l => l._key === key ? { ...l, ...patch } : l)); setDirty(true); };
    const removeLine = (key) => { setLines(ls => ls.filter(l => l._key !== key)); setDirty(true); };
    const duplicateLine = (key) => {
        setLines(ls => {
            const i = ls.findIndex(l => l._key === key);
            const { id: _id, ...rest } = ls[i];
            return [...ls.slice(0, i + 1), { ...rest, _key: newKey() }, ...ls.slice(i + 1)];
        });
        setDirty(true);
    };
    const addLine = (type) => {
        // Dòng mới kế thừa sản phẩm + vật tư của dòng cùng loại cuối cùng để nhập nhanh
        const last = [...lines].reverse().find(l => l.lineType === type);
        const base = last ? { mfgItemId: last.mfgItemId, productName: last.productName, drawingPage: last.drawingPage, ...(type === 'PANEL' ? { materialId: last.materialId, edgeMaterialId: last.edgeMaterialId } : {}) } : {};
        setLines(ls => [...ls, newLine(type, base)]);
        setDirty(true);
    };

    function productPick(line) {
        return (item, text) => updateLine(line._key, item ? { mfgItemId: item.id, productName: '' } : { mfgItemId: null, productName: text });
    }
    const productValue = (l) => {
        const it = orderItems.find(i => i.id === l.mfgItemId);
        return it ? `${it.code} — ${it.name}` : l.productName;
    };
    const productOptions = orderItems.map(i => ({ ...i, sku: i.code }));

    async function save() {
        setSaving(true);
        try {
            const res = await fetch(`/api/manufacturing/cutlists/${id}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...header, lines }),
            });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error || 'Lỗi lưu');
            toast.success('Đã lưu bảng bóc tách');
            await load();
            return true;
        } catch (e) { toast.error(e.message); return false; } finally { setSaving(false); }
    }

    async function runAction(action, extra = {}) {
        if (dirty && action === 'check' && !(await save())) return;
        setBusy(true);
        try {
            const res = await fetch(`/api/manufacturing/cutlists/${id}/actions`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...extra }),
            });
            const d = await res.json();
            if (!res.ok) { if (d.issues) setTab('CHECK'); throw new Error(d.error || 'Lỗi thao tác'); }
            if (action === 'revise') { toast.success(`Đã tạo bản sửa đổi ${d.code}`); router.push(`/manufacturing/cutlists/${d.id}`); return; }
            toast.success({ check: 'Đã chốt kiểm tra — chờ duyệt', reopen: 'Đã mở lại để sửa', approve: 'Đã duyệt bảng bóc tách', cancel: 'Đã hủy' }[action]);
            load();
        } catch (e) { toast.error(e.message); } finally { setBusy(false); }
    }

    async function handleDelete() {
        if (!confirm(`Xóa bản dự thảo ${data.code}?`)) return;
        const res = await fetch(`/api/manufacturing/cutlists/${id}`, { method: 'DELETE' });
        const d = await res.json();
        if (!res.ok) { toast.error(d.error || 'Lỗi xóa'); return; }
        setDirty(false);
        router.push('/manufacturing/cutlists');
    }

    function applyPaste() {
        const bySku = Object.fromEntries(materials.map(m => [m.sku.toLowerCase(), m]));
        const itemByText = (t) => orderItems.find(i => i.code.toLowerCase() === t.toLowerCase() || i.name.toLowerCase() === t.toLowerCase());
        const rows = paste.text.split(/\r?\n/).map(r => r.split('\t').map(c => c.trim())).filter(r => r.some(Boolean));
        // Bỏ dòng tiêu đề nếu cột số lượng không phải số
        const qtyCol = paste.type === 'PANEL' ? 6 : 2;
        const body = rows.filter(r => r[qtyCol] !== undefined && !Number.isNaN(Number(toNumStr(r[qtyCol]))));
        let unknown = 0;
        const added = body.map(r => {
            const item = itemByText(r[0] || '');
            const product = item ? { mfgItemId: item.id } : { productName: r[0] || '' };
            if (paste.type === 'PANEL') {
                const mat = bySku[(r[2] || '').toLowerCase()]; const edge = bySku[(r[8] || '').toLowerCase()];
                if ((r[2] && !mat) || (r[8] && !edge)) unknown++;
                return newLine('PANEL', {
                    ...product, partName: r[1] || '', materialId: mat?.id || null,
                    length: toNumStr(r[3]), width: toNumStr(r[4]), thickness: toNumStr(r[5]), quantity: toNumStr(r[6]),
                    ...parseEdgeSpec(r[7]), edgeMaterialId: edge?.id || null,
                    grainLocked: /^(x|có|co|1|v|y)$/i.test(r[9] || ''), drawingPage: r[10] || '', note: r[11] || '',
                });
            }
            const mat = bySku[(r[1] || '').toLowerCase()];
            return newLine('ITEM', {
                ...product, materialId: mat?.id || null, materialText: mat ? '' : (r[1] || ''),
                quantity: toNumStr(r[2]), unit: r[3] || mat?.stockUnit?.code || '', drawingPage: r[4] || '', note: r[5] || '',
            });
        });
        if (added.length === 0) { toast.error('Không đọc được dòng nào — kiểm tra thứ tự cột'); return; }
        setLines(ls => [...ls, ...added]);
        setDirty(true);
        setTab(paste.type);
        setPaste(null);
        toast.success(`Đã thêm ${added.length} dòng${unknown ? ` · ${unknown} dòng có mã không có trong danh mục — chọn lại` : ''}`);
    }

    async function exportExcel() {
        const XLSX = await import('xlsx');
        const prod = (l) => productValue(l);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(panelRows.map((l, i) => ({
            'STT': i + 1, 'Sản phẩm': prod(l), 'Chi tiết': l.partName, 'Mã ván': l.material?.sku || '', 'Tên ván': l.material ? materialFullName(l.material) : '',
            'Dài (mm)': Number(l.length) || 0, 'Rộng (mm)': Number(l.width) || 0, 'Dày (mm)': Number(l.thickness) || Number(l.material?.thickness) || 0,
            'SL': Number(l.quantity) || 0, 'Theo vân': l.grainLocked ? 'x' : '', 'Cạnh dán': edgeLabel(l), 'Mã chỉ': l.edgeMaterial?.sku || '',
            'm²': Number(panelAreaM2(l).toFixed(4)), 'm chỉ': Number(panelEdgeMeters(l).toFixed(3)), 'Trang BV': l.drawingPage, 'Ghi chú': l.note,
        }))), 'Cutlist');
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(itemRows.map((l, i) => ({
            'STT': i + 1, 'Sản phẩm': prod(l), 'Mã vật tư': l.material?.sku || '', 'Vật tư': l.material ? materialFullName(l.material) : l.materialText,
            'SL': Number(l.quantity) || 0, 'Đơn vị': l.unit, 'Trang BV': l.drawingPage, 'Ghi chú': l.note,
        }))), 'Phu kien - vat tu khac');
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([
            ...summary.panels.map(p => ({ 'Loại': 'Ván', 'Mã': p.material?.sku, 'Tên': p.material ? materialFullName(p.material) : '', 'Số lượng': p.areaWithWaste, 'Đơn vị': 'm² (gồm hao hụt)', 'Ghi chú': p.sheetsEstimate != null ? `~${p.sheetsEstimate} tấm (ước tính theo diện tích)` : 'CHƯA CÓ khổ tấm' })),
            ...summary.edges.map(e => ({ 'Loại': 'Chỉ cạnh', 'Mã': e.material?.sku || '', 'Tên': e.material ? materialFullName(e.material) : 'CHƯA CHỌN MÃ', 'Số lượng': e.metersWithWaste, 'Đơn vị': 'm (gồm hao hụt)', 'Ghi chú': '' })),
            { 'Loại': 'Keo PUR', 'Mã': '', 'Tên': '', 'Số lượng': summary.pur.kg ?? '', 'Đơn vị': 'kg', 'Ghi chú': summary.pur.kg == null ? 'CHƯA CÓ định mức g/m' : `${summary.pur.edgeMeters} m × ${summary.pur.gramPerMeter} g/m` },
            ...summary.items.map(i => ({ 'Loại': 'Vật tư khác', 'Mã': i.material?.sku || '', 'Tên': i.material ? materialFullName(i.material) : i.materialText, 'Số lượng': i.quantity, 'Đơn vị': i.unit, 'Ghi chú': '' })),
        ]), 'Tong hop');
        XLSX.writeFile(wb, `${data.code}_${data.mfgOrder?.code || ''}.xlsx`);
    }

    if (loading && !data) return <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>;
    if (!data) return <div style={{ padding: 60, textAlign: 'center' }}>Không tìm thấy bảng bóc tách</div>;

    const lineIssueBadge = (l) => {
        const li = issuesByLine[l._idx] || [];
        if (li.length === 0) return null;
        const err = li.some(i => i.severity === 'error');
        return <span title={li.map(i => i.message).join('\n')} style={{ color: err ? 'var(--color-danger)' : 'var(--color-warning)', cursor: 'help' }}>{err ? <XCircle size={14} /> : <AlertTriangle size={14} />}</span>;
    };
    const rowActions = (l) => editable && (
        <td style={{ whiteSpace: 'nowrap' }}>
            <button className="btn btn-ghost btn-sm" title="Nhân bản dòng" onClick={() => duplicateLine(l._key)}><Copy size={13} /></button>
            <button className="btn btn-ghost btn-sm" title="Xóa dòng" style={{ color: 'var(--color-danger)' }} onClick={() => removeLine(l._key)}><Trash2 size={13} /></button>
        </td>
    );
    const tabs = [
        { key: 'PANEL', label: `Tấm cắt (${panelRows.length})` },
        { key: 'ITEM', label: `Phụ kiện · kính · kim loại (${itemRows.length})` },
        { key: 'CHECK', label: `Kiểm tra (${errorCount} lỗi · ${issues.length - errorCount} cảnh báo)` },
        { key: 'SUMMARY', label: 'Tổng hợp & đối chiếu tồn' },
    ];

    return (
        <div style={{ padding: 24, maxWidth: 1600, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <datalist id="dl-panel">{panelMaterials.map(m => <option key={m.id} value={optionLabel(m)} />)}</datalist>
            <datalist id="dl-edge">{edgeMaterials.map(m => <option key={m.id} value={optionLabel(m)} />)}</datalist>
            <datalist id="dl-item">{itemMaterials.map(m => <option key={m.id} value={optionLabel(m)} />)}</datalist>
            <datalist id="dl-product">{orderItems.map(i => <option key={i.id} value={`${i.code} — ${i.name}`} />)}</datalist>

            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => router.push('/manufacturing/cutlists')}><ArrowLeft size={16} /></button>
                    <div>
                        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
                            {data.code} <span className={`badge ${CUTLIST_STATUS_STYLE[data.status] || ''}`} style={{ verticalAlign: 3 }}>{CUTLIST_STATUS_LABELS[data.status]}</span>
                        </h1>
                        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                            <Link href={`/manufacturing/orders/${data.mfgOrder.id}`} style={{ color: 'var(--text-accent)' }}>{data.mfgOrder.code}</Link> — {data.mfgOrder.title} · {data.project.code} {data.project.name} · Bản R{data.revision}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            {data.checkedAt && <>Kiểm tra: {data.checkedByName} {fmtDateTime(data.checkedAt)}. </>}
                            {data.approvedAt && <>Duyệt: {data.approvedByName} {fmtDateTime(data.approvedAt)}.</>}
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button className="btn btn-ghost btn-sm" onClick={exportExcel}><FileSpreadsheet size={14} /> Xuất Excel</button>
                    {editable && <button className="btn btn-secondary btn-sm" onClick={save} disabled={saving || !dirty}><Save size={14} /> {saving ? 'Đang lưu...' : dirty ? 'Lưu' : 'Đã lưu'}</button>}
                    {editable && <button className="btn btn-primary btn-sm" onClick={() => runAction('check')} disabled={busy || saving || errorCount > 0} title={errorCount > 0 ? 'Sửa hết lỗi trước khi chốt' : ''}><CheckCircle2 size={14} /> Chốt kiểm tra</button>}
                    {data.status === 'CHECKED' && perms.edit && <button className="btn btn-ghost btn-sm" onClick={() => runAction('reopen')} disabled={busy}><Undo2 size={14} /> Mở lại sửa</button>}
                    {data.status === 'CHECKED' && perms.approve && <button className="btn btn-primary btn-sm" onClick={() => runAction('approve')} disabled={busy}><CheckCircle2 size={14} /> Duyệt</button>}
                    {data.status === 'APPROVED' && perms.edit && <button className="btn btn-secondary btn-sm" onClick={() => { const r = prompt('Lý do sửa đổi (tuỳ chọn):'); if (r !== null) runAction('revise', { reason: r }); }} disabled={busy}><GitBranch size={14} /> Tạo bản sửa đổi</button>}
                    {['DRAFT', 'CHECKED', 'APPROVED'].includes(data.status) && (data.status === 'APPROVED' ? perms.approve : perms.edit) && (
                        data.status === 'DRAFT'
                            ? <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }} onClick={handleDelete}><Trash2 size={14} /> Xóa</button>
                            : <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => { const r = prompt('Lý do hủy:'); if (r?.trim()) runAction('cancel', { reason: r }); }} disabled={busy}><XCircle size={14} /> Hủy</button>
                    )}
                </div>
            </div>

            {data.status !== 'DRAFT' && (
                <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--color-info-bg)', border: '1px solid var(--color-info-br)', fontSize: 13 }}>
                    {data.status === 'APPROVED' ? 'Bản đã duyệt không sửa trực tiếp — dùng “Tạo bản sửa đổi” để lập revision mới, bản này giữ nguyên làm căn cứ.'
                        : data.status === 'CHECKED' ? 'Đã chốt kiểm tra, đang chờ Quản đốc duyệt. Cần sửa thì bấm “Mở lại sửa”.'
                            : 'Bản này đã đóng, chỉ xem.'}
                </div>
            )}

            <div className="card">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                    <div className="form-group"><label className="form-label">Tên bảng</label><input className="form-input" value={header.title || ''} onChange={setHeaderField('title')} disabled={!editable} /></div>
                    <div className="form-group"><label className="form-label">Nguồn bản vẽ / file cutlist *</label><input className="form-input" value={header.drawingRef || ''} onChange={setHeaderField('drawingRef')} disabled={!editable} style={{ borderColor: !header.drawingRef?.trim() ? 'var(--color-danger)' : undefined }} /></div>
                    <div className="form-group"><label className="form-label">Revision bản vẽ</label><input className="form-input" value={header.drawingRevision || ''} onChange={setHeaderField('drawingRevision')} disabled={!editable} /></div>
                    <div className="form-group"><label className="form-label">Hao hụt ván & chỉ (%)</label><input type="number" min="0" step="any" className="form-input" value={header.wastePercent} onChange={setHeaderField('wastePercent')} disabled={!editable} placeholder="Chưa nhập" /></div>
                    <div className="form-group"><label className="form-label">Định mức keo PUR (g/m chỉ)</label><input type="number" min="0" step="any" className="form-input" value={header.purGramPerMeter} onChange={setHeaderField('purGramPerMeter')} disabled={!editable} placeholder="Chưa có dữ liệu" /></div>
                    <div className="form-group"><label className="form-label">Ghi chú</label><input className="form-input" value={header.note || ''} onChange={setHeaderField('note')} disabled={!editable} /></div>
                </div>
                {data.revisions?.length > 1 && (
                    <div style={{ marginTop: 10, fontSize: 12.5, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Các bảng của lệnh này:</span>
                        {data.revisions.map(r => (
                            <Link key={r.id} href={`/manufacturing/cutlists/${r.id}`} className={`badge ${r.id === data.id ? 'info' : 'muted'}`}>
                                {r.code} · {CUTLIST_STATUS_LABELS[r.status]}
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {[
                    ['Chi tiết tấm', fmt(summary.totals.panelPieces, 0)],
                    ['Diện tích ván', `${fmt(summary.totals.panelAreaM2)} m²`],
                    ['Chỉ cạnh', `${fmt(summary.pur.edgeMeters, 2)} m`],
                    ['Keo PUR', summary.pur.kg != null ? `${fmt(summary.pur.kg)} kg` : 'Chưa có định mức'],
                    ['Lỗi / cảnh báo', `${errorCount} / ${issues.length - errorCount}`],
                ].map(([k, v]) => (
                    <div key={k} className="card" style={{ padding: '10px 16px', flex: '1 1 150px' }}>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{k}</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: k === 'Lỗi / cảnh báo' && errorCount > 0 ? 'var(--color-danger)' : undefined }}>{v}</div>
                    </div>
                ))}
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="card-header" style={{ padding: '10px 14px', flexWrap: 'wrap', gap: 8 }}>
                    <div className="tab-bar">
                        {tabs.map(t => <button key={t.key} className={`tab-item ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>{t.label}</button>)}
                    </div>
                    {editable && (tab === 'PANEL' || tab === 'ITEM') && (
                        <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => setPaste({ type: tab, text: '' })}><ClipboardPaste size={14} /> Dán từ Excel</button>
                            <button className="btn btn-secondary btn-sm" onClick={() => addLine(tab)}><Plus size={14} /> Thêm dòng</button>
                        </div>
                    )}
                </div>

                {tab === 'PANEL' && (
                    <div className="table-container">
                        <table className="data-table" style={{ fontSize: 12.5 }}>
                            <thead>
                                <tr>
                                    <th />
                                    <th>#</th><th>Sản phẩm</th><th>Chi tiết</th><th>Mã ván</th>
                                    <th>Dài</th><th>Rộng</th><th>Dày</th><th>SL</th>
                                    <th title="Theo vân: không được xoay chi tiết khi xếp tấm">Vân</th>
                                    <th title="D = cạnh dài, R = cạnh rộng">Cạnh D1 D2 R1 R2</th><th>Mã chỉ</th>
                                    <th>Trang BV</th><th>Ghi chú</th>
                                    <th style={{ textAlign: 'right' }}>m²</th><th style={{ textAlign: 'right' }}>m chỉ</th>
                                    {editable && <th />}
                                </tr>
                            </thead>
                            <tbody>
                                {panelRows.length === 0 && <tr><td colSpan={17} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 30 }}>Chưa có chi tiết — bấm “Thêm dòng” hoặc “Dán từ Excel”</td></tr>}
                                {panelRows.map((l, i) => editable ? (
                                    <tr key={l._key}>
                                        <td>{lineIssueBadge(l)}</td>
                                        <td>{i + 1}</td>
                                        <td><CodeInput listId="dl-product" value={productValue(l)} options={productOptions} onPick={productPick(l)} placeholder="Sản phẩm" /></td>
                                        <td><input className="form-input" style={{ ...cell, minWidth: 120 }} value={l.partName} onChange={e => updateLine(l._key, { partName: e.target.value })} placeholder="VD: Hông trái" /></td>
                                        <td><CodeInput listId="dl-panel" value={l.material ? optionLabel(l.material) : ''} options={materials} onPick={m => updateLine(l._key, { materialId: m?.id || null })} placeholder="SKU ván" invalid={!l.materialId} /></td>
                                        {['length', 'width', 'thickness', 'quantity'].map(k => (
                                            <td key={k}><input type="number" min="0" step="any" className="form-input" style={{ ...cell, width: k === 'quantity' || k === 'thickness' ? 56 : 72 }}
                                                value={l[k]} placeholder={k === 'thickness' && l.material?.thickness ? String(l.material.thickness) : ''}
                                                onChange={e => updateLine(l._key, { [k]: e.target.value })} /></td>
                                        ))}
                                        <td style={{ textAlign: 'center' }}><input type="checkbox" checked={!!l.grainLocked} onChange={e => updateLine(l._key, { grainLocked: e.target.checked })} /></td>
                                        <td style={{ whiteSpace: 'nowrap' }}>
                                            {['edgeL1', 'edgeL2', 'edgeW1', 'edgeW2'].map(k => (
                                                <input key={k} type="checkbox" title={k.replace('edgeL', 'Dài ').replace('edgeW', 'Rộng ')} checked={!!l[k]} onChange={e => updateLine(l._key, { [k]: e.target.checked })} style={{ marginRight: 6 }} />
                                            ))}
                                        </td>
                                        <td><CodeInput listId="dl-edge" value={l.edgeMaterial ? optionLabel(l.edgeMaterial) : ''} options={materials} onPick={m => updateLine(l._key, { edgeMaterialId: m?.id || null })} placeholder="SKU chỉ" invalid={(l.edgeL1 || l.edgeL2 || l.edgeW1 || l.edgeW2) && !l.edgeMaterialId} /></td>
                                        <td><input className="form-input" style={{ ...cell, width: 80 }} value={l.drawingPage} onChange={e => updateLine(l._key, { drawingPage: e.target.value })} placeholder="VD: T3/A" /></td>
                                        <td><input className="form-input" style={{ ...cell, minWidth: 100 }} value={l.note} onChange={e => updateLine(l._key, { note: e.target.value })} /></td>
                                        <td style={{ textAlign: 'right' }}>{fmt(panelAreaM2(l))}</td>
                                        <td style={{ textAlign: 'right' }}>{fmt(panelEdgeMeters(l), 2)}</td>
                                        {rowActions(l)}
                                    </tr>
                                ) : (
                                    <tr key={l._key}>
                                        <td>{lineIssueBadge(l)}</td>
                                        <td>{i + 1}</td><td>{productValue(l) || '—'}</td><td className="primary">{l.partName}</td>
                                        <td>{l.material ? optionLabel(l.material) : '—'}</td>
                                        <td>{l.length}</td><td>{l.width}</td><td>{l.thickness || l.material?.thickness || ''}</td><td>{l.quantity}</td>
                                        <td>{l.grainLocked ? '✓' : ''}</td><td>{edgeLabel(l)}</td><td>{l.edgeMaterial?.sku || ''}</td>
                                        <td>{l.drawingPage}</td><td>{l.note}</td>
                                        <td style={{ textAlign: 'right' }}>{fmt(panelAreaM2(l))}</td><td style={{ textAlign: 'right' }}>{fmt(panelEdgeMeters(l), 2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {tab === 'ITEM' && (
                    <div className="table-container">
                        <table className="data-table" style={{ fontSize: 12.5 }}>
                            <thead><tr><th /><th>#</th><th>Sản phẩm</th><th>Vật tư (mã hoặc tên)</th><th>Nhóm</th><th>SL</th><th>Đơn vị</th><th>Trang BV</th><th>Ghi chú</th>{editable && <th />}</tr></thead>
                            <tbody>
                                {itemRows.length === 0 && <tr><td colSpan={10} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 30 }}>Chưa có phụ kiện / kính / kim loại / keo</td></tr>}
                                {itemRows.map((l, i) => editable ? (
                                    <tr key={l._key}>
                                        <td>{lineIssueBadge(l)}</td>
                                        <td>{i + 1}</td>
                                        <td><CodeInput listId="dl-product" value={productValue(l)} options={productOptions} onPick={productPick(l)} placeholder="Sản phẩm" /></td>
                                        <td><CodeInput listId="dl-item" value={l.material ? optionLabel(l.material) : l.materialText} options={materials}
                                            onPick={(m, text) => updateLine(l._key, m ? { materialId: m.id, materialText: '', unit: l.unit || m.stockUnit?.code || '' } : { materialId: null, materialText: text })}
                                            placeholder="SKU hoặc tên vật tư" /></td>
                                        <td style={{ fontSize: 12 }}>{l.material?.category?.name || <span style={{ color: 'var(--color-warning)' }}>chưa có mã</span>}</td>
                                        <td><input type="number" min="0" step="any" className="form-input" style={{ ...cell, width: 70 }} value={l.quantity} onChange={e => updateLine(l._key, { quantity: e.target.value })} /></td>
                                        <td><input className="form-input" style={{ ...cell, width: 70 }} value={l.unit} onChange={e => updateLine(l._key, { unit: e.target.value })} placeholder={l.material?.stockUnit?.code || 'cái'} /></td>
                                        <td><input className="form-input" style={{ ...cell, width: 80 }} value={l.drawingPage} onChange={e => updateLine(l._key, { drawingPage: e.target.value })} /></td>
                                        <td><input className="form-input" style={{ ...cell, minWidth: 120 }} value={l.note} onChange={e => updateLine(l._key, { note: e.target.value })} /></td>
                                        {rowActions(l)}
                                    </tr>
                                ) : (
                                    <tr key={l._key}>
                                        <td>{lineIssueBadge(l)}</td>
                                        <td>{i + 1}</td><td>{productValue(l) || '—'}</td>
                                        <td className="primary">{l.material ? optionLabel(l.material) : l.materialText}</td>
                                        <td>{l.material?.category?.name || '—'}</td><td>{l.quantity}</td><td>{l.unit}</td><td>{l.drawingPage}</td><td>{l.note}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {tab === 'CHECK' && (
                    <div style={{ padding: 16 }}>
                        {issues.length === 0 ? (
                            <div style={{ color: 'var(--color-success)', fontWeight: 600 }}><CheckCircle2 size={16} style={{ verticalAlign: -3 }} /> Không phát hiện lỗi hay cảnh báo.</div>
                        ) : (
                            <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {issues.map((it, i) => (
                                    <li key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13, cursor: it.lineIndex != null ? 'pointer' : 'default' }}
                                        onClick={() => it.lineIndex != null && setTab(hydrated[it.lineIndex]?.lineType || 'PANEL')}>
                                        {it.severity === 'error'
                                            ? <XCircle size={15} style={{ color: 'var(--color-danger)', flexShrink: 0, marginTop: 1 }} />
                                            : <AlertTriangle size={15} style={{ color: 'var(--color-warning)', flexShrink: 0, marginTop: 1 }} />}
                                        <span>{it.message}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 14, marginBottom: 0 }}>
                            Lỗi (đỏ) chặn “Chốt kiểm tra”. Cảnh báo (vàng) cần xem lại nhưng không chặn. Kiểm tra gồm: nguồn bản vẽ, thiếu mã/kích thước/số lượng,
                            vượt khổ tấm (tính cả chiều vân), độ dày lệch mã ván, cạnh dán thiếu mã chỉ, sai nhóm vật tư, dòng trùng, đơn vị khác đơn vị kho.
                        </p>
                    </div>
                )}

                {tab === 'SUMMARY' && (
                    <div style={{ padding: 16 }}>
                        <CutlistSummary summary={summary} available={data.available} stockAsOf={data.stockAsOf} wastePercent={header.wastePercent} dirty={dirty} />
                    </div>
                )}
            </div>

            <Modal isOpen={!!paste} onClose={() => setPaste(null)} title={paste?.type === 'ITEM' ? 'Dán phụ kiện / vật tư khác từ Excel' : 'Dán cutlist tấm từ Excel'} maxWidth={760} closeOnOverlayClick={false}>
                {paste && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                            Copy các ô trong Excel theo đúng thứ tự cột rồi dán vào đây (dòng tiêu đề tự bỏ qua):
                            <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                {PASTE_COLUMNS[paste.type].map((c, i) => <span key={c} className="badge muted">{i + 1}. {c}</span>)}
                            </div>
                        </div>
                        <textarea className="form-input" rows={12} style={{ fontFamily: 'monospace', fontSize: 12 }} value={paste.text}
                            onChange={e => setPaste(p => ({ ...p, text: e.target.value }))} placeholder="Dán dữ liệu tại đây..." autoFocus />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                            <button className="btn btn-ghost" onClick={() => setPaste(null)}>Huỷ</button>
                            <button className="btn btn-primary" onClick={applyPaste} disabled={!paste.text.trim()}>Thêm vào bảng</button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
