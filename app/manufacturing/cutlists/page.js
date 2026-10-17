'use client';
import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Scissors, Plus, Search, X, ChevronRight } from 'lucide-react';
import { useRole } from '@/contexts/RoleContext';
import { getCutlistPermissions, CUTLIST_STATUS_LABELS, CUTLIST_STATUS_STYLE } from '@/lib/manufacturing/cutlist';
import { useToast } from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';

const fmtDateTime = (d) => d ? new Date(d).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : '—';
const EMPTY_FORM = { mfgOrderId: '', title: '', drawingRef: '', drawingRevision: '', wastePercent: '', purGramPerMeter: '' };

function CutlistsPageInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const toast = useToast();
    const { role, email, department } = useRole();
    const perms = getCutlistPermissions({ role, email, department });

    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ search: '', status: '' });
    const [orders, setOrders] = useState([]);
    const [showCreate, setShowCreate] = useState(false);
    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);

    // Đi từ trang lệnh sản xuất: /manufacturing/cutlists?mfgOrderId=... → chỉ hiện bảng của lệnh đó
    const presetOrderId = searchParams.get('mfgOrderId') || '';

    const load = useCallback(() => {
        setLoading(true);
        const qs = new URLSearchParams();
        if (filters.search) qs.set('search', filters.search);
        if (filters.status) qs.set('status', filters.status);
        if (presetOrderId) qs.set('mfgOrderId', presetOrderId);
        fetch(`/api/manufacturing/cutlists?${qs}`)
            .then(r => r.json())
            .then(d => { setRows(d.data || []); setLoading(false); })
            .catch(() => setLoading(false));
    }, [filters, presetOrderId]);
    useEffect(load, [load]);

    // Lệnh chưa có bảng nào → mở sẵn form tạo cho lệnh đó
    const [autoOpened, setAutoOpened] = useState(false);
    useEffect(() => {
        if (!presetOrderId || !perms.edit || loading || autoOpened || rows.length > 0) return;
        setAutoOpened(true);
        setForm({ ...EMPTY_FORM, mfgOrderId: presetOrderId });
        setShowCreate(true);
    }, [presetOrderId, perms.edit, loading, autoOpened, rows.length]);

    useEffect(() => {
        if (!showCreate || orders.length > 0) return;
        fetch('/api/manufacturing/orders?limit=300').then(r => r.json())
            .then(d => setOrders((d.data || []).filter(o => o.status !== 'CANCELLED')));
    }, [showCreate, orders.length]);

    async function handleCreate() {
        if (!form.mfgOrderId) { toast.error('Chọn lệnh sản xuất'); return; }
        setCreating(true);
        try {
            const res = await fetch('/api/manufacturing/cutlists', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
            });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error || 'Lỗi tạo bảng bóc tách');
            toast.success(`Đã tạo ${d.code}`);
            router.push(`/manufacturing/cutlists/${d.id}`);
        } catch (e) {
            toast.error(e.message);
        } finally {
            setCreating(false);
        }
    }

    const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

    return (
        <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 10, background: 'var(--color-primary-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Scissors size={22} color="white" />
                    </div>
                    <div>
                        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Bóc tách & cutlist</h1>
                        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
                            Ván, chỉ cạnh, keo PUR, phụ kiện, kính, kim loại theo lệnh sản xuất — kiểm tra trước khi cắt
                        </p>
                    </div>
                </div>
                {perms.edit && (
                    <button className="btn btn-primary" onClick={() => { setForm({ ...EMPTY_FORM, mfgOrderId: presetOrderId }); setShowCreate(true); }}><Plus size={15} /> Lập bảng bóc tách</button>
                )}
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
                    <Search size={14} color="var(--color-text-muted)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
                    <input className="form-input" style={{ paddingLeft: 32 }} placeholder="Tìm mã, lệnh SX, công trình, bản vẽ..."
                        value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} />
                </div>
                <select className="form-input" style={{ width: 210 }} value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
                    <option value="">Tất cả trạng thái</option>
                    {Object.entries(CUTLIST_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                {presetOrderId && (
                    <button className="btn btn-ghost btn-sm" onClick={() => router.push('/manufacturing/cutlists')}><X size={13} /> Đang lọc theo 1 lệnh SX — xem tất cả</button>
                )}
                {(filters.search || filters.status) && (
                    <button className="btn btn-ghost btn-sm" onClick={() => setFilters({ search: '', status: '' })}><X size={13} /> Xoá lọc</button>
                )}
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
                ) : rows.length === 0 ? (
                    <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có bảng bóc tách nào.</div>
                ) : (
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr><th>Mã</th><th>Lệnh SX</th><th>Công trình</th><th>Bản vẽ / revision</th><th>Số dòng</th><th>Trạng thái</th><th>Cập nhật</th><th /></tr>
                            </thead>
                            <tbody>
                                {rows.map(c => (
                                    <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/manufacturing/cutlists/${c.id}`)}>
                                        <td style={{ fontWeight: 600, color: 'var(--text-accent)' }}>{c.code}{c.title && <div style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)' }}>{c.title}</div>}</td>
                                        <td>{c.mfgOrder?.code}<div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.mfgOrder?.title}</div></td>
                                        <td>{c.project?.code} — {c.project?.name}</td>
                                        <td>{c.drawingRef || <span style={{ color: 'var(--color-danger)' }}>Chưa ghi nguồn</span>}{c.drawingRevision && <span style={{ color: 'var(--text-muted)' }}> · {c.drawingRevision}</span>}</td>
                                        <td>{c._count?.lines ?? 0}</td>
                                        <td><span className={`badge ${CUTLIST_STATUS_STYLE[c.status] || ''}`}>{CUTLIST_STATUS_LABELS[c.status] || c.status}</span></td>
                                        <td style={{ fontSize: 12.5 }}>{fmtDateTime(c.updatedAt)}</td>
                                        <td><ChevronRight size={14} color="var(--color-text-muted)" /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Lập bảng bóc tách / cutlist" closeOnOverlayClick={false}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div className="form-group">
                        <label className="form-label">Lệnh sản xuất *</label>
                        <select className="form-input" value={form.mfgOrderId} onChange={set('mfgOrderId')}>
                            <option value="">-- Chọn lệnh sản xuất --</option>
                            {orders.map(o => <option key={o.id} value={o.id}>{o.code} — {o.title} ({o.project?.code})</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Tên bảng (tuỳ chọn)</label>
                        <input className="form-input" value={form.title} onChange={set('title')} placeholder="VD: Tủ bếp + tủ áo phòng ngủ master" />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                        <div className="form-group">
                            <label className="form-label">Nguồn bản vẽ / file cutlist</label>
                            <input className="form-input" value={form.drawingRef} onChange={set('drawingRef')} placeholder="VD: KD03.06.26_TuBep.pdf" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Revision bản vẽ</label>
                            <input className="form-input" value={form.drawingRevision} onChange={set('drawingRevision')} placeholder="VD: R2 – 12/10" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Hao hụt ván & chỉ (%)</label>
                            <input type="number" min="0" step="any" className="form-input" value={form.wastePercent} onChange={set('wastePercent')} placeholder="Theo định mức xưởng" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Keo PUR (g/m chỉ)</label>
                            <input type="number" min="0" step="any" className="form-input" value={form.purGramPerMeter} onChange={set('purGramPerMeter')} placeholder="Chưa có" />
                        </div>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                        Hao hụt và định mức keo do xưởng quy định — để trống nếu chưa có, hệ thống sẽ ghi “chưa có dữ liệu” thay vì tự giả định.
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        <button className="btn btn-ghost" onClick={() => setShowCreate(false)}>Huỷ</button>
                        <button className="btn btn-primary" onClick={handleCreate} disabled={creating}>{creating ? 'Đang tạo...' : 'Tạo & nhập chi tiết'}</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

export default function CutlistsPage() {
    return <Suspense fallback={null}><CutlistsPageInner /></Suspense>;
}
