'use client';
import { useSession } from 'next-auth/react';
import { useState, useEffect, useCallback } from 'react';

const MONTHS = [1,2,3,4,5,6,7,8,9,10,11,12];

const CATEGORIES = [
    { group: 'Lương & Phụ cấp', items: [
        { key: 'labor_salary',       label: 'Lương nhân viên KD' },
        { key: 'labor_bonus',        label: 'Thưởng & Phúc lợi KD' },
        { key: 'direct_design_dept', label: 'Lương & Phúc lợi Phòng Thiết kế' },
        { key: 'mgmt_salary',        label: 'Lương NVQL' },
        { key: 'mgmt_bonus',         label: 'Thưởng doanh số NVQL' },
        { key: 'labor_insurance',    label: 'BHXH / BHYT / BHTN' },
    ]},
    { group: 'Chi phí cố định', items: [
        { key: 'indirect_general',    label: 'Chi phí chung (điện, thuê nhà, xăng...)' },
        { key: 'indirect_equipment',  label: 'Máy móc & CCDC' },
        { key: 'indirect_renovation', label: 'Sửa chữa & Nâng cấp showroom' },
        { key: 'indirect_marketing',  label: 'Marketing & Quảng cáo' },
        { key: 'indirect_other',      label: 'Chi phí khác' },
    ]},
];

const ALL_ITEMS   = CATEGORIES.flatMap(c => c.items);
const KEY_TO_LABEL = Object.fromEntries(ALL_ITEMS.map(i => [i.key, i.label]));

const fmt      = n => n ? Math.round(n).toLocaleString('vi-VN') + ' đ' : '—';
const parseAmt = s => parseFloat(String(s).replace(/[^\d.-]/g, '')) || 0;

const EMPTY = { id: null, month: new Date().getMonth() + 1, rowKey: 'labor_salary', amount: '', description: '' };

const currentYear = new Date().getFullYear();
const YEAR_OPTS   = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

export default function LuongChiPhiPage() {
    const { data: session } = useSession();
    const canEdit = ['giam_doc', 'pho_gd', 'ban_gd', 'ke_toan', 'hanh_chinh_kt', 'kinh_doanh'].includes(session?.user?.role);

    const [year,      setYear]     = useState(currentYear);
    const [filterM,   setFilterM]  = useState(0);
    const [entries,   setEntries]  = useState([]);
    const [loading,   setLoading]  = useState(true);
    const [showModal, setModal]    = useState(false);
    const [form,      setForm]     = useState(EMPTY);
    const [errors,    setErrors]   = useState({});
    const [saving,    setSaving]   = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const r = await fetch(`/api/finance/monthly-fixed-costs?year=${year}`);
            const j = await r.json();
            setEntries(j.entries || []);
        } catch {}
        setLoading(false);
    }, [year]);

    useEffect(() => { load(); }, [load]);

    function openAdd() {
        setForm({ ...EMPTY, month: filterM || new Date().getMonth() + 1 });
        setErrors({});
        setModal(true);
    }
    function openEdit(e) {
        setForm({ id: e.id, month: e.month, rowKey: e.rowKey, amount: e.amount, description: e.description || '' });
        setErrors({});
        setModal(true);
    }

    function validate() {
        const e = {};
        if (!form.month)                               e.month  = 'Chọn tháng';
        if (!form.rowKey)                              e.rowKey = 'Chọn loại';
        if (!form.amount || parseAmt(form.amount) <= 0) e.amount = 'Nhập số tiền > 0';
        setErrors(e);
        return !Object.keys(e).length;
    }

    async function handleSave() {
        if (!validate()) return;
        setSaving(true);
        const body = {
            year, month: Number(form.month), rowKey: form.rowKey,
            amount: parseAmt(form.amount),
            description: form.description?.trim() || null,
        };
        await fetch('/api/finance/monthly-fixed-costs', {
            method: form.id ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form.id ? { ...body, id: form.id } : body),
        });
        setSaving(false);
        setModal(false);
        load();
    }

    async function handleDelete(id) {
        if (!confirm('Xoá phiếu này?')) return;
        await fetch(`/api/finance/monthly-fixed-costs?id=${id}`, { method: 'DELETE' });
        load();
    }

    const filtered  = filterM ? entries.filter(e => e.month === filterM) : entries;
    const totalAmt  = filtered.reduce((s, e) => s + (e.amount || 0), 0);

    const MONTH_TABS = [
        { key: 0, label: 'Tất cả', count: entries.length },
        ...MONTHS.map(m => ({ key: m, label: `T${m}`, count: entries.filter(e => e.month === m).length })),
    ];

    return (
        <div>
            {/* Breadcrumb */}
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16, display: 'flex', gap: 6 }}>
                <span>Tài chính</span><span style={{ color: 'var(--border)' }}>›</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Lương & Chi phí cố định</span>
            </div>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Lương & Chi phí cố định</h1>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>
                        Dữ liệu được tổng hợp vào <strong>Chi phí Kinh doanh</strong> khi đồng bộ
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <select value={year} onChange={e => { setYear(Number(e.target.value)); setFilterM(0); }} className="form-select" style={{ width: 120 }}>
                        {YEAR_OPTS.map(y => <option key={y} value={y}>Năm {y}</option>)}
                    </select>
                    {canEdit && (
                        <button className="btn btn-primary" onClick={openAdd} style={{ fontWeight: 600 }}>
                            + Thêm phiếu
                        </button>
                    )}
                </div>
            </div>

            {/* Card: tabs + table */}
            <div className="card" style={{ borderRadius: 12, overflow: 'hidden' }}>
                {/* Month tabs */}
                <div className="tab-bar-scroll" style={{ padding: '0 8px' }}>
                    {MONTH_TABS.map(tab => {
                        const active = filterM === tab.key;
                        return (
                            <button key={tab.key} onClick={() => setFilterM(tab.key)} style={{
                                padding: '14px 14px', border: 'none', background: 'transparent', cursor: 'pointer',
                                fontSize: 13, fontWeight: active ? 600 : 400,
                                color: active ? 'var(--accent-primary)' : 'var(--text-muted)',
                                borderBottom: active ? '2px solid var(--accent-primary)' : '2px solid transparent',
                                marginBottom: -1, whiteSpace: 'nowrap',
                                display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.15s',
                            }}>
                                {tab.label}
                                {tab.count > 0 && (
                                    <span style={{
                                        background: active ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                                        color: active ? '#fff' : 'var(--text-muted)',
                                        borderRadius: 10, fontSize: 10, padding: '1px 6px', fontWeight: 600,
                                    }}>{tab.count}</span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Table */}
                {loading ? (
                    <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>Đang tải...</div>
                ) : filtered.length === 0 ? (
                    <div style={{ padding: 52, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
                        {canEdit
                            ? <>Chưa có phiếu nào · <button className="btn btn-ghost" onClick={openAdd} style={{ fontSize: 13 }}>+ Thêm phiếu</button></>
                            : 'Chưa có dữ liệu'}
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                            <thead>
                                <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                                    <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: 12, width: 60 }}>Tháng</th>
                                    <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: 12 }}>Loại chi phí</th>
                                    <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--text-muted)', fontSize: 12 }}>Số tiền</th>
                                    <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: 12 }}>Mô tả</th>
                                    <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: 12, width: 100 }}>Ngày nhập</th>
                                    {canEdit && <th style={{ width: 72 }} />}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((e, idx) => (
                                    <tr key={e.id} style={{ borderBottom: '1px solid var(--border)', background: idx % 2 === 1 ? 'var(--bg-secondary)' : 'transparent' }}>
                                        <td style={{ padding: '11px 16px' }}>
                                            <span style={{ display: 'inline-block', background: 'var(--accent-primary)', color: '#fff', borderRadius: 6, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>
                                                T{e.month}
                                            </span>
                                        </td>
                                        <td style={{ padding: '11px 16px', fontWeight: 500, color: 'var(--text-primary)' }}>
                                            {KEY_TO_LABEL[e.rowKey] || e.rowKey}
                                        </td>
                                        <td style={{ padding: '11px 16px', textAlign: 'right', fontWeight: 700, color: 'var(--accent-primary)', whiteSpace: 'nowrap' }}>
                                            {fmt(e.amount)}
                                        </td>
                                        <td style={{ padding: '11px 16px', color: 'var(--text-muted)', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {e.description || '—'}
                                        </td>
                                        <td style={{ padding: '11px 16px', color: 'var(--text-muted)', fontSize: 12, whiteSpace: 'nowrap' }}>
                                            {new Date(e.createdAt).toLocaleDateString('vi-VN')}
                                        </td>
                                        {canEdit && (
                                            <td style={{ padding: '11px 12px' }}>
                                                <div style={{ display: 'flex', gap: 2 }}>
                                                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(e)}>✏️</button>
                                                    <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(e.id)} style={{ color: 'var(--status-danger)' }}>🗑️</button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr style={{ background: 'var(--bg-secondary)', borderTop: '2px solid var(--border)', fontWeight: 700 }}>
                                    <td colSpan={2} style={{ padding: '10px 16px', fontSize: 13 }}>
                                        Tổng {filterM > 0 ? `tháng ${filterM}` : `năm ${year}`} · {filtered.length} phiếu
                                    </td>
                                    <td style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--accent-primary)', fontSize: 14 }}>
                                        {fmt(totalAmt)}
                                    </td>
                                    <td colSpan={canEdit ? 3 : 2} />
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
                        <div className="modal-header">
                            <h3>{form.id ? '✏️ Sửa phiếu' : '+ Thêm phiếu chi phí'}</h3>
                            <button className="modal-close" onClick={() => setModal(false)}>×</button>
                        </div>
                        <div className="modal-body">

                            {/* Năm + Tháng */}
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Năm</label>
                                    <select className="form-select" value={year} onChange={e => setYear(Number(e.target.value))}>
                                        {YEAR_OPTS.map(y => <option key={y} value={y}>{y}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Tháng *</label>
                                    <select className="form-select" value={form.month} onChange={e => setForm(f => ({ ...f, month: Number(e.target.value) }))}>
                                        {MONTHS.map(m => <option key={m} value={m}>Tháng {m}</option>)}
                                    </select>
                                    {errors.month && <span style={{ fontSize: 12, color: 'var(--status-danger)' }}>{errors.month}</span>}
                                </div>
                            </div>

                            {/* Loại chi phí */}
                            <div className="form-group">
                                <label className="form-label">Loại chi phí *</label>
                                <select className="form-select" value={form.rowKey} onChange={e => setForm(f => ({ ...f, rowKey: e.target.value }))}>
                                    {CATEGORIES.map(cat => (
                                        <optgroup key={cat.group} label={cat.group}>
                                            {cat.items.map(item => (
                                                <option key={item.key} value={item.key}>{item.label}</option>
                                            ))}
                                        </optgroup>
                                    ))}
                                </select>
                                {errors.rowKey && <span style={{ fontSize: 12, color: 'var(--status-danger)' }}>{errors.rowKey}</span>}
                            </div>

                            {/* Số tiền */}
                            <div className="form-group">
                                <label className="form-label">Số tiền (VNĐ) *</label>
                                <input className="form-input" type="text"
                                    value={form.amount}
                                    onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                                    placeholder="VD: 5000000"
                                />
                                {form.amount && parseAmt(form.amount) > 0 && (
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                                        = {Math.round(parseAmt(form.amount)).toLocaleString('vi-VN')} đồng
                                    </div>
                                )}
                                {errors.amount && <span style={{ fontSize: 12, color: 'var(--status-danger)' }}>{errors.amount}</span>}
                            </div>

                            {/* Mô tả */}
                            <div className="form-group">
                                <label className="form-label">Mô tả <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(tuỳ chọn)</span></label>
                                <input className="form-input"
                                    value={form.description}
                                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                    placeholder="VD: Lương tháng 3 — nhân viên A, B, C"
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setModal(false)}>Huỷ</button>
                            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                                {saving ? 'Đang lưu...' : form.id ? 'Cập nhật' : 'Lưu phiếu'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
