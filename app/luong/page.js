'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

// Roles thuộc phòng xây dựng / thiết kế kiến trúc
const DESIGN_ROLES = ['xay_dung', 'thiet_ke', 'ky_thuat'];

const ALLOWED_EMAIL = 'ngocbinh@kientrucsct.com';

const STAGES = [
    { key: 'ks_do_dac',       label: 'KS đo đạc biên trạng',              pct: 2  },
    { key: 'len_pa_mb',       label: 'Lên PA MB kiến trúc',               pct: 4  },
    { key: 'duyet_kh',        label: 'Duyệt KH',                          pct: 3  },
    { key: 'bao_gia_ky_hd',   label: 'Báo giá & ký HĐ',                  pct: 3  },
    { key: 'dinh_huong',      label: 'Định hướng phong cách kiến trúc',   pct: 4  },
    { key: 'chot_kh',         label: 'Chốt khách hàng',                   pct: 2  },
    { key: 'chot_pa',         label: 'Chốt PA thiết kế',                  pct: 3  },
    { key: 'thiet_ke_3d',     label: 'Thiết kế 3D',                       pct: 13 },
    { key: 'duyet_3d_nb',     label: 'Duyệt 3D nội bộ',                   pct: 5  },
    { key: 'chot_3d_kh',      label: 'Chốt 3D khách hàng',               pct: 2  },
    { key: 'bo_ban_ve',       label: 'Bổ bản vẽ kiến trúc',               pct: 15 },
    { key: 'ket_cau',         label: 'Thiết kế kết cấu',                  pct: 32 },
    { key: 'dien_nuoc',       label: 'Thiết kế điện nước',                pct: 10 },
    { key: 'kiem_soat_hs',    label: 'Kiểm soát hồ sơ',                   pct: 2  },
    { key: 'in_ban_ve',       label: 'In bản vẽ & bàn giao hồ sơ',       pct: 1  },
];

const STATUS_LABELS = {
    'Đang thi công': { color: '#2563eb' },
    'Đang thiết kế': { color: '#7c3aed' },
    'Hoàn thành':    { color: '#16a34a' },
    'Tạm dừng':      { color: '#d97706' },
    'Hủy':           { color: '#dc2626' },
};

const AVATAR_COLORS = ['#2563eb','#7c3aed','#16a34a','#d97706','#dc2626','#0891b2','#be185d','#65a30d'];

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);
const parseJSON = (raw) => { try { return JSON.parse(raw || '{}'); } catch { return {}; } };

// Chuẩn hoá về [{name, pct, startDate, estEndDate, endDate}] — tương thích dữ liệu cũ
const toEntries = (val) => {
    const norm = (e) => ({ name: e.name || '', pct: e.pct ?? 100, startDate: e.startDate || '', estEndDate: e.estEndDate || '', endDate: e.endDate || '' });
    if (!val) return [norm({})];
    if (typeof val === 'string') return [norm({ name: val, pct: 100 })];
    if (Array.isArray(val)) {
        if (val.length === 0) return [norm({})];
        if (typeof val[0] === 'string') {
            const share = Math.round(100 / val.length);
            return val.map((name, i) => norm({ name, pct: i === val.length - 1 ? 100 - share * (val.length - 1) : share }));
        }
        return val.map(norm);
    }
    return [norm({})];
};
// vẫn giữ toList để không lỗi nếu còn dùng chỗ khác
const toList = (val) => toEntries(val).map(e => e.name);

// Chuẩn hoá progress[key] — tương thích dữ liệu cũ (number) và mới ({pct, startDate, endDate})
const toStageData = (val) => {
    if (val == null || val === '') return { pct: 0, startDate: '', endDate: '' };
    if (typeof val === 'number') return { pct: val, startDate: '', endDate: '' };
    if (typeof val === 'object') return { pct: val.pct ?? 0, startDate: val.startDate || '', endDate: val.endDate || '' };
    return { pct: Number(val) || 0, startDate: '', endDate: '' };
};

const initials = (name) => name ? name.trim().split(' ').slice(-2).map(w => w[0]).join('').toUpperCase() : '?';
const avatarColor = (name) => AVATAR_COLORS[(name || '').length % AVATAR_COLORS.length];

// ───────── Hook lấy danh sách nhân viên phòng xây dựng ─────────
function useDesignUsers() {
    const [users, setUsers] = useState([]);
    useEffect(() => {
        fetch('/api/users')
            .then(r => r.json())
            .then(list => {
                const filtered = (Array.isArray(list) ? list : [])
                    .filter(u => u.active && DESIGN_ROLES.includes(u.role))
                    .sort((a, b) => a.name.localeCompare(b.name, 'vi'));
                setUsers(filtered);
            })
            .catch(() => {});
    }, []);
    return users;
}

// ───────── Bảng tổng hợp lương theo người ─────────
function SummaryTable({ items }) {
    // items: [{ amount: số tiền stage, entries: [{name, pct}] }]
    const map = {};
    items.forEach(({ entries, amount }) => {
        (entries || []).forEach(({ name, pct }) => {
            const n = (name || '').trim();
            if (!n) return;
            map[n] = (map[n] || 0) + amount * (pct || 0) / 100;
        });
    });
    const rows = Object.entries(map).sort((a, b) => b[1] - a[1]);
    if (!rows.length) return null;

    return (
        <div style={{ marginTop: 20 }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10, color: 'var(--text-primary)' }}>
                Tổng hợp lương theo người thực hiện
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {rows.map(([name, total], i) => (
                    <div key={name} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 16px', borderRadius: 10,
                        background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                        minWidth: 220,
                    }}>
                        <div style={{
                            width: 36, height: 36, borderRadius: '50%',
                            background: avatarColor(name), color: '#fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 13, fontWeight: 700, flexShrink: 0,
                        }}>{initials(name)}</div>
                        <div>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{name}</div>
                            <div style={{ fontSize: 14, color: '#16a34a', fontWeight: 700 }}>{fmt(total)}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ───────── DateField helper ─────────
function DateField({ label, value, onChange, color }) {
    return (
        <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 9, fontWeight: 600, color: color || 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 3 }}>{label}</div>
            <input
                type="date"
                value={value}
                onChange={onChange}
                onClick={e => e.stopPropagation()}
                style={{
                    width: '100%', padding: '4px 6px', borderRadius: 5, fontSize: 11,
                    border: `1.5px solid ${value ? (color === '#15803d' ? '#16a34a66' : color === '#d97706' ? '#f59e0b66' : 'var(--border)') : 'var(--border)'}`,
                    background: value ? (color === '#15803d' ? 'rgba(22,163,74,0.05)' : color === '#d97706' ? 'rgba(245,158,11,0.05)' : 'var(--bg-primary)') : 'var(--bg-primary)',
                    outline: 'none', color: value ? (color || 'var(--text-primary)') : 'var(--text-muted)',
                    fontWeight: value ? 500 : 400,
                }}
            />
        </div>
    );
}

// ───────── Stage list với người thực hiện ─────────
function StageList({ base, stages, assignees, progress, users, onToggle, onAssigneeChange, onAssigneePctChange, onAssigneeDateChange, onAssigneeAdd, onAssigneeRemove, onProgressChange }) {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 10 }}>
            {STAGES.map(stage => {
                const done = !!stages[stage.key];
                const amount = base * stage.pct / 100;
                const list = toEntries(assignees[stage.key]);
                const totalPct = list.reduce((s, e) => s + (Number(e.pct) || 0), 0);
                const pctOk = list.length === 1 || totalPct === 100;
                const stageData = toStageData(progress[stage.key] ?? (done ? 100 : 0));
                const stageProg = stageData.pct;

                return (
                    <div key={stage.key} style={{
                        borderRadius: 10,
                        background: done ? 'rgba(22,163,74,0.05)' : 'var(--bg-secondary)',
                        border: `1.5px solid ${done ? '#16a34a55' : stageProg > 0 ? '#F4792055' : 'var(--border)'}`,
                        overflow: 'hidden', transition: 'border-color 0.2s',
                    }}>
                        {/* Header hạng mục */}
                        <div style={{ padding: '10px 12px 8px', borderBottom: `1px solid ${done ? '#16a34a22' : 'var(--border-light)'}`, background: done ? 'rgba(22,163,74,0.07)' : 'transparent' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                <input type="checkbox" checked={done} onChange={() => onToggle(stage.key)}
                                    style={{ width: 15, height: 15, cursor: 'pointer', flexShrink: 0, accentColor: '#16a34a' }} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 12, fontWeight: 600, color: done ? '#15803d' : 'var(--text-primary)', lineHeight: 1.3 }}>{stage.label}</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                                        <span style={{ color: '#F47920', fontWeight: 600 }}>{stage.pct}%</span>
                                        <span style={{ margin: '0 4px' }}>→</span>
                                        <span style={{ fontWeight: 600 }}>{fmt(amount)}</span>
                                        {!pctOk && <span style={{ marginLeft: 6, color: '#dc2626', fontSize: 10 }}>⚠ {totalPct}%/100%</span>}
                                    </div>
                                </div>
                                {done && <span style={{ color: '#16a34a', fontSize: 16, flexShrink: 0 }}>✓</span>}
                            </label>

                            {/* Tiến độ */}
                            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>Tiến độ</span>
                                <div style={{ flex: 1, background: '#e5e7eb', borderRadius: 6, height: 8, overflow: 'hidden', cursor: 'pointer' }}
                                    onClick={e => e.stopPropagation()}>
                                    <div style={{ width: `${stageProg}%`, height: '100%', background: stageProg === 100 ? '#16a34a' : stageProg >= 50 ? '#F47920' : '#fb923c', borderRadius: 6, transition: 'width 0.4s' }} />
                                </div>
                                <input type="number" min={0} max={100} value={stageProg}
                                    onChange={e => onProgressChange(stage.key, 'pct', e.target.value)}
                                    onClick={e => e.stopPropagation()}
                                    style={{ width: 44, padding: '3px 4px', borderRadius: 5, fontSize: 12, fontWeight: 600, border: '1.5px solid var(--border)', background: 'var(--bg-primary)', textAlign: 'center', outline: 'none' }} />
                                <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>%</span>
                            </div>
                        </div>

                        {/* Danh sách người */}
                        <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {list.map((entry, idx) => {
                                const personAmt = amount * (Number(entry.pct) || 0) / 100;
                                return (
                                    <div key={idx} style={{
                                        borderRadius: 8, border: '1px solid var(--border-light)',
                                        background: 'var(--bg-primary)', overflow: 'hidden',
                                    }}>
                                        {/* Hàng 1: Avatar + Tên + % + Xóa */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px', borderBottom: '1px solid var(--border-light)', background: entry.name ? 'rgba(0,0,0,0.02)' : 'transparent' }}>
                                            {entry.name
                                                ? <div style={{ width: 26, height: 26, borderRadius: '50%', background: avatarColor(entry.name), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{initials(entry.name)}</div>
                                                : <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--border)', flexShrink: 0 }} />
                                            }
                                            <select value={entry.name} onChange={e => onAssigneeChange(stage.key, idx, e.target.value)}
                                                onClick={e => e.stopPropagation()}
                                                style={{ flex: 1, minWidth: 0, padding: '4px 8px', borderRadius: 6, fontSize: 12, border: '1.5px solid var(--border)', background: 'var(--bg-primary)', color: entry.name ? 'var(--text-primary)' : 'var(--text-muted)', outline: 'none', cursor: 'pointer' }}>
                                                <option value="">— Chọn người thực hiện —</option>
                                                {users.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                                            </select>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                                                <input type="number" min={0} max={100} value={entry.pct}
                                                    onChange={e => onAssigneePctChange(stage.key, idx, e.target.value)}
                                                    onClick={e => e.stopPropagation()}
                                                    title={entry.name ? `Tiền: ${fmt(personAmt)}` : ''}
                                                    style={{ width: 46, padding: '4px 4px', borderRadius: 6, fontSize: 12, fontWeight: 600, border: `1.5px solid ${pctOk ? 'var(--border)' : '#f97316'}`, background: 'var(--bg-primary)', textAlign: 'center', outline: 'none', color: pctOk ? 'var(--text-primary)' : '#ea580c' }} />
                                                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>%</span>
                                            </div>
                                            {list.length > 1 &&
                                                <button onClick={e => { e.stopPropagation(); onAssigneeRemove(stage.key, idx); }}
                                                    style={{ width: 22, height: 22, borderRadius: '50%', border: 'none', background: '#fee2e2', color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0, lineHeight: 1 }}>×</button>
                                            }
                                        </div>
                                        {/* Hàng 2: Số tiền + 3 ngày */}
                                        <div style={{ padding: '7px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                                            {entry.name && (
                                                <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 700 }}>
                                                    Lương: {fmt(personAmt)}
                                                </div>
                                            )}
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                                                <DateField label="Bắt đầu" value={entry.startDate} color="#0284c7"
                                                    onChange={e => onAssigneeDateChange(stage.key, idx, 'startDate', e.target.value)} />
                                                <DateField label="Dự kiến HT" value={entry.estEndDate} color="#d97706"
                                                    onChange={e => onAssigneeDateChange(stage.key, idx, 'estEndDate', e.target.value)} />
                                                <DateField label="Hoàn thành" value={entry.endDate} color="#15803d"
                                                    onChange={e => onAssigneeDateChange(stage.key, idx, 'endDate', e.target.value)} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {list.length < 3 && (
                                <button onClick={e => { e.stopPropagation(); onAssigneeAdd(stage.key); }}
                                    style={{ padding: '6px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer', border: '1.5px dashed var(--border)', background: 'transparent', color: 'var(--text-muted)', width: '100%', transition: 'all 0.15s' }}>
                                    + Thêm người thực hiện
                                </button>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ───────── Modal sửa (Tab 1) ─────────
function EditModal({ project, onClose, onSaved }) {
    const sp = project.salaryProgress || {};
    const [contractValueOverride, setContractValueOverride] = useState(
        sp.contractValueOverride != null ? sp.contractValueOverride : (project.contractValue || '')
    );
    const [notes, setNotes]   = useState(sp.notes || '');
    const [saving, setSaving] = useState(false);

    const save = async () => {
        setSaving(true);
        const res = await fetch(`/api/salary/${project.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                stages: parseJSON(sp.stages),
                assignees: parseJSON(sp.assignees),
                notes,
                contractValueOverride: contractValueOverride === '' ? null : parseFloat(contractValueOverride) || null,
            }),
        });
        onSaved(await res.json());
        setSaving(false);
        onClose();
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
            <div style={{ background: 'var(--bg-primary)', borderRadius: 12, padding: 24, width: 480, maxWidth: '95vw', boxShadow: '0 8px 32px rgba(0,0,0,0.25)' }} onClick={e => e.stopPropagation()}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Chỉnh sửa — {project.code}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 18 }}>{project.name}</div>
                <div style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                        Giá trị HĐ dùng để tính lương
                        <span style={{ fontStyle: 'italic', marginLeft: 4 }}>— mặc định: {fmt(project.contractValue)}</span>
                    </label>
                    <input className="form-input" type="number" value={contractValueOverride} onChange={e => setContractValueOverride(e.target.value)} placeholder={`Để trống = ${fmt(project.contractValue)}`} />
                </div>
                <div style={{ marginBottom: 20 }}>
                    <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Ghi chú</label>
                    <textarea className="form-input" rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ghi chú..." style={{ resize: 'vertical' }} />
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button className="btn btn-secondary" onClick={onClose}>Hủy</button>
                    <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu'}</button>
                </div>
            </div>
        </div>
    );
}

// ───────── Xuất PDF với bộ nhận diện SCT ─────────
function printSalaryPDF({ code, name, base, stages, assignees, progress, notes, contractValue }) {
    const fmtVN = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);
    const fmtDateVN = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('vi-VN') : '—';
    const stageRows = STAGES.map(s => {
        const done = !!stages[s.key];
        const amount = base * s.pct / 100;
        const sd = toStageData(progress[s.key] ?? (done ? 100 : 0));
        const pct = sd.pct;
        const entries = toEntries(assignees[s.key]);
        const personRows = entries.filter(e => e.name).map(e => {
            const dateStr = [e.startDate ? '▶ ' + fmtDateVN(e.startDate) : '', e.endDate ? '✓ ' + fmtDateVN(e.endDate) : ''].filter(Boolean).join(' → ');
            return `<div style="font-size:11px;color:#374151;margin-bottom:2px;">
                <span style="font-weight:600">${e.name}</span> <span style="color:#F47920;font-weight:600">${e.pct}%</span> → <b>${fmtVN(amount * e.pct / 100)}</b>
                ${dateStr ? `<div style="font-size:10px;color:#6b7280;margin-top:1px">${dateStr}</div>` : ''}
            </div>`;
        }).join('');
        return `
        <tr style="border-bottom:1px solid #e5e7eb;">
          <td style="padding:7px 10px;font-size:12px;font-weight:500;color:${done?'#15803d':'#111827'}">${s.label}</td>
          <td style="padding:7px 10px;font-size:12px;text-align:center;color:#F47920;font-weight:600">${s.pct}%</td>
          <td style="padding:7px 10px;font-size:12px;text-align:right;font-weight:600">${fmtVN(amount)}</td>
          <td style="padding:7px 10px;font-size:12px">${personRows || '<span style="color:#9ca3af;font-size:11px">—</span>'}</td>
          <td style="padding:7px 10px;min-width:110px;font-size:10px;color:#6b7280;line-height:1.6;">
            ${sd.startDate ? `<div>▶ ${fmtDateVN(sd.startDate)}</div>` : ''}
            ${sd.endDate ? `<div style="color:#16a34a">✓ ${fmtDateVN(sd.endDate)}</div>` : (!sd.startDate ? '<span style="color:#d1d5db">—</span>' : '')}
          </td>
        </tr>`;
    }).join('');

    // Bảng tổng theo người
    const personMap = {};
    STAGES.forEach(s => {
        const amount = base * s.pct / 100;
        toEntries(assignees[s.key]).forEach(({ name, pct }) => {
            if (!name) return;
            personMap[name] = (personMap[name] || 0) + amount * pct / 100;
        });
    });
    const personSummary = Object.entries(personMap).sort((a, b) => b[1] - a[1]).map(([n, v]) =>
        `<tr><td style="padding:6px 10px;font-size:12px;font-weight:600">${n}</td><td style="padding:6px 10px;font-size:12px;text-align:right;color:#16a34a;font-weight:700">${fmtVN(v)}</td></tr>`
    ).join('');

    const now = new Date().toLocaleDateString('vi-VN');
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Bảng lương — ${code}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Be Vietnam Pro', 'Segoe UI', sans-serif; background: #fff; color: #111827; }
        @page { margin: 18mm 16mm; size: A4 landscape; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        table { width: 100%; border-collapse: collapse; }
        th { background: #F47920; color: #fff; padding: 8px 10px; font-size: 12px; font-weight: 600; text-align: left; }
    </style></head><body>
    <!-- Header -->
    <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:14px;border-bottom:3px solid #F47920;margin-bottom:18px;">
        <div style="display:flex;align-items:center;gap:12px;">
            <svg width="44" height="44" viewBox="0 0 48 48" fill="none">
                <path d="M12 8 L12 40" stroke="#F47920" stroke-width="7" stroke-linecap="round"/>
                <path d="M12 24 L34 8" stroke="#F47920" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M12 24 L34 40" stroke="#F47920" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M20 16 L28 24" stroke="#1e293b" stroke-width="3.5" stroke-linecap="round"/>
                <path d="M20 32 L28 24" stroke="#1e293b" stroke-width="3.5" stroke-linecap="round"/>
            </svg>
            <div>
                <div style="font-size:16px;font-weight:700;color:#1e293b;letter-spacing:0.3px">KIẾN TRÚC ĐÔ THỊ SCT</div>
                <div style="font-size:11px;color:#6b7280">Cùng bạn xây dựng ước mơ</div>
            </div>
        </div>
        <div style="text-align:right;">
            <div style="font-size:18px;font-weight:700;color:#F47920">BẢNG TÍNH LƯƠNG</div>
            <div style="font-size:11px;color:#6b7280">Phòng Thiết Kế Kiến Trúc — ${now}</div>
        </div>
    </div>

    <!-- Project info -->
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:18px;background:#fef9f5;border:1px solid #fed7aa;border-radius:8px;padding:14px;">
        <div><div style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px">Mã dự án</div><div style="font-size:14px;font-weight:700;color:#F47920">${code}</div></div>
        <div><div style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px">Tên dự án</div><div style="font-size:13px;font-weight:600">${name}</div></div>
        <div><div style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px">Quỹ lương (50% DT)</div><div style="font-size:14px;font-weight:700;color:#16a34a">${fmtVN(base)}</div></div>
        ${notes ? `<div style="grid-column:span 3;font-size:11px;color:#6b7280;font-style:italic">Ghi chú: ${notes}</div>` : ''}
    </div>

    <!-- Stage table -->
    <table style="margin-bottom:20px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
        <thead><tr>
            <th>Hạng mục</th>
            <th style="text-align:center;width:60px">% Quỹ</th>
            <th style="text-align:right;width:120px">Số tiền</th>
            <th>Người thực hiện</th>
            <th style="width:100px">Tiến độ</th>
        </tr></thead>
        <tbody>${stageRows}</tbody>
    </table>

    <!-- Person summary -->
    ${personSummary ? `
    <div style="display:flex;gap:24px;align-items:flex-start;">
        <div style="flex:1;">
            <div style="font-size:13px;font-weight:700;margin-bottom:8px;color:#1e293b;border-bottom:2px solid #F47920;padding-bottom:4px;">Tổng hợp lương theo người thực hiện</div>
            <table style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
                <thead><tr><th>Họ tên</th><th style="text-align:right;width:160px">Tổng lương</th></tr></thead>
                <tbody>${personSummary}</tbody>
            </table>
        </div>
        <div style="width:180px;background:#fef9f5;border:1px solid #fed7aa;border-radius:8px;padding:14px;text-align:center;">
            <div style="font-size:11px;color:#9ca3af;margin-bottom:4px">Tổng đã phân bổ</div>
            <div style="font-size:18px;font-weight:700;color:#F47920">${fmtVN(Object.values(personMap).reduce((a,b)=>a+b,0))}</div>
            <div style="font-size:11px;color:#6b7280;margin-top:4px">/ ${fmtVN(base)}</div>
        </div>
    </div>` : ''}

    <div style="margin-top:30px;font-size:10px;color:#9ca3af;text-align:center;border-top:1px solid #e5e7eb;padding-top:10px;">
        Tài liệu nội bộ — Kiến Trúc Đô Thị SCT — Xuất ngày ${now}
    </div>
    </body></html>`;

    const win = window.open('', '_blank', 'width=1100,height=800');
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 600);
}

// ─────────────────────────── TAB 1: DỰ ÁN ───────────────────────────
function TabDuAn() {
    const users = useDesignUsers();
    const [projects, setProjects]       = useState([]);
    const [loading, setLoading]         = useState(true);
    const [search, setSearch]           = useState('');
    const [expanded, setExpanded]       = useState({});
    const [statusFilter, setStatusFilter] = useState('all');
    const [editProject, setEditProject] = useState(null);
    const [deleting, setDeleting]       = useState({});
    const [localAssignees, setLocalAssignees] = useState({});
    const [localProgress, setLocalProgress]   = useState({});
    const [saveStatus, setSaveStatus] = useState('');  // '' | 'saving' | 'saved'
    const saveTimers = useRef({});
    const saveStatusTimer = useRef(null);

    const load = useCallback(() => {
        setLoading(true);
        fetch('/api/salary')
            .then(r => r.json())
            .then(d => {
                const list = d.data || [];
                setProjects(list);
                const initA = {}, initP = {};
                list.forEach(p => {
                    initA[p.id] = parseJSON(p.salaryProgress?.assignees);
                    initP[p.id] = parseJSON(p.salaryProgress?.progress);
                });
                setLocalAssignees(initA);
                setLocalProgress(initP);
                setLoading(false);
            });
    }, []);

    useEffect(() => { load(); }, [load]);

    const getStages    = (p) => parseJSON(p.salaryProgress?.stages);
    const getAssignees = (p) => localAssignees[p.id] || parseJSON(p.salaryProgress?.assignees);
    const getProgress  = (p) => localProgress[p.id]  || parseJSON(p.salaryProgress?.progress);

    const getContractValue = (p) =>
        p.salaryProgress?.contractValueOverride != null
            ? p.salaryProgress.contractValueOverride
            : (p.contractValue || 0);

    const saveFull = useCallback(async (project, newStages, newAssignees, newProgress) => {
        setSaveStatus('saving');
        await fetch(`/api/salary/${project.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                stages: newStages,
                assignees: newAssignees,
                progress: newProgress,
                notes: project.salaryProgress?.notes || '',
                contractValueOverride: project.salaryProgress?.contractValueOverride ?? null,
            }),
        });
        setSaveStatus('saved');
        clearTimeout(saveStatusTimer.current);
        saveStatusTimer.current = setTimeout(() => setSaveStatus(''), 2000);
    }, []);

    const toggleStage = async (project, stageKey) => {
        const current = getStages(project);
        const updated = { ...current, [stageKey]: !current[stageKey] };
        setProjects(prev => prev.map(p => p.id === project.id
            ? { ...p, salaryProgress: { ...(p.salaryProgress || {}), stages: JSON.stringify(updated) } }
            : p
        ));
        await saveFull(project, updated, getAssignees(project), getProgress(project));
    };

    const _saveAssignees = (project, updated) => {
        setLocalAssignees(prev => ({ ...prev, [project.id]: updated }));
        clearTimeout(saveTimers.current[project.id]);
        saveTimers.current[project.id] = setTimeout(() => {
            saveFull(project, getStages(project), updated, getProgress(project));
        }, 800);
    };

    const handleProgressChange = (project, stageKey, field, value) => {
        const cur = toStageData(getProgress(project)[stageKey]);
        const updated = { ...getProgress(project), [stageKey]: { ...cur, [field]: field === 'pct' ? (value === '' ? 0 : Math.min(100, Math.max(0, Number(value)))) : value } };
        setLocalProgress(prev => ({ ...prev, [project.id]: updated }));
        clearTimeout(saveTimers.current[project.id + '_p']);
        saveTimers.current[project.id + '_p'] = setTimeout(() => {
            saveFull(project, getStages(project), getAssignees(project), updated);
        }, 800);
    };

    const handleAssigneeChange = (project, stageKey, idx, value) => {
        const cur = toEntries(getAssignees(project)[stageKey]);
        const newList = cur.map((e, i) => i === idx ? { ...e, name: value } : e);
        _saveAssignees(project, { ...getAssignees(project), [stageKey]: newList });
    };

    const handleAssigneePctChange = (project, stageKey, idx, value) => {
        const cur = toEntries(getAssignees(project)[stageKey]);
        const newList = cur.map((e, i) => i === idx ? { ...e, pct: value === '' ? '' : Number(value) } : e);
        _saveAssignees(project, { ...getAssignees(project), [stageKey]: newList });
    };

    const handleAssigneeDateChange = (project, stageKey, idx, field, value) => {
        const cur = toEntries(getAssignees(project)[stageKey]);
        const newList = cur.map((e, i) => i === idx ? { ...e, [field]: value } : e);
        _saveAssignees(project, { ...getAssignees(project), [stageKey]: newList });
    };

    const handleAssigneeAdd = (project, stageKey) => {
        const cur = toEntries(getAssignees(project)[stageKey]);
        if (cur.length >= 3) return;
        // Chia đều lại % khi thêm người
        const n = cur.length + 1;
        const share = Math.floor(100 / n);
        const newList = [...cur.map((e, i) => ({ ...e, pct: i === cur.length - 1 ? 100 - share * (n - 1) : share })), { name: '', pct: share }];
        _saveAssignees(project, { ...getAssignees(project), [stageKey]: newList });
    };

    const handleAssigneeRemove = (project, stageKey, idx) => {
        const cur = toEntries(getAssignees(project)[stageKey]);
        const newList = cur.filter((_, i) => i !== idx);
        const result = newList.length ? newList : [{ name: '', pct: 100 }];
        // Nếu chỉ còn 1 người, set lại 100%
        if (result.length === 1) result[0] = { ...result[0], pct: 100 };
        _saveAssignees(project, { ...getAssignees(project), [stageKey]: result });
    };

    // Khi thu lại row: flush debounce và lưu ngay
    const toggleExpand = (project) => {
        const isOpen = expanded[project.id];
        if (isOpen) {
            clearTimeout(saveTimers.current[project.id]);
            clearTimeout(saveTimers.current[project.id + '_p']);
            saveFull(project, getStages(project), getAssignees(project), getProgress(project));
        }
        setExpanded(e => ({ ...e, [project.id]: !e[project.id] }));
    };

    const handleSaved = (data) => {
        setProjects(prev => prev.map(p => p.id === data.projectId
            ? { ...p, salaryProgress: { ...p.salaryProgress, ...data } }
            : p
        ));
        setLocalAssignees(prev => ({ ...prev, [data.projectId]: parseJSON(data.assignees) }));
    };

    const deleteProgress = async (project) => {
        if (!confirm(`Xóa toàn bộ tiến độ lương của "${project.code}"?`)) return;
        setDeleting(d => ({ ...d, [project.id]: true }));
        await fetch(`/api/salary/${project.id}`, { method: 'DELETE' });
        setProjects(prev => prev.map(p => p.id === project.id ? { ...p, salaryProgress: null } : p));
        setLocalAssignees(prev => ({ ...prev, [project.id]: {} }));
        setLocalProgress(prev => ({ ...prev, [project.id]: {} }));
        setDeleting(d => ({ ...d, [project.id]: false }));
    };

    const getSalaryInfo = (project) => {
        const revenue = getContractValue(project);
        const base = revenue * 0.5;
        const stages = getStages(project);
        const earned = STAGES.reduce((sum, s) => sum + (stages[s.key] ? base * s.pct / 100 : 0), 0);
        const pctDone = STAGES.reduce((sum, s) => sum + (stages[s.key] ? s.pct : 0), 0);
        return { revenue, base, earned, pctDone };
    };

    const filtered = projects.filter(p => {
        const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase());
        const matchStatus = statusFilter === 'all' || p.status === statusFilter;
        return matchSearch && matchStatus;
    });

    const totalEarned = filtered.reduce((s, p) => s + getSalaryInfo(p).earned, 0);
    const totalBase   = filtered.reduce((s, p) => s + getSalaryInfo(p).base, 0);

    // Tổng hợp lương tất cả dự án theo người
    const allItems = filtered.flatMap(p => {
        const base = getContractValue(p) * 0.5;
        const stages = getStages(p);
        const assignees = getAssignees(p);
        return STAGES
            .filter(s => stages[s.key])
            .map(s => ({ entries: toEntries(assignees[s.key]), amount: base * s.pct / 100 }));
    });

    return (
        <div>
            {editProject && <EditModal project={editProject} onClose={() => setEditProject(null)} onSaved={handleSaved} />}

            {/* KPI */}
            <div className="stats-grid" style={{ marginBottom: 20 }}>
                <div className="stat-card"><div className="stat-icon">📁</div><div><div className="stat-value">{filtered.length}</div><div className="stat-label">Tổng dự án</div></div></div>
                <div className="stat-card"><div className="stat-icon">💰</div><div><div className="stat-value" style={{ fontSize: 14, color: 'var(--text-muted)' }}>{fmt(totalBase)}</div><div className="stat-label">Quỹ lương (50% DT)</div></div></div>
                <div className="stat-card"><div className="stat-icon">✅</div><div><div className="stat-value" style={{ fontSize: 14, color: 'var(--accent-primary)' }}>{fmt(totalEarned)}</div><div className="stat-label">Đã tích lũy</div></div></div>
            </div>

            {/* Bảng tổng hợp theo người */}
            <SummaryTable items={allItems} />

            <div className="card" style={{ marginTop: 20 }}>
                <div className="card-header" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                    <input className="form-input" placeholder="🔍 Tìm dự án..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 260 }} />
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {['all', ...Object.keys(STATUS_LABELS)].map(st => (
                            <button key={st} onClick={() => setStatusFilter(st)} style={{
                                padding: '4px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer', border: '1px solid',
                                background: statusFilter === st ? 'var(--accent-primary)' : 'transparent',
                                color: statusFilter === st ? '#fff' : 'var(--text-secondary)',
                                borderColor: statusFilter === st ? 'var(--accent-primary)' : 'var(--border)',
                            }}>{st === 'all' ? 'Tất cả' : st}</button>
                        ))}
                    </div>
                    {saveStatus && (
                        <span style={{ marginLeft: 'auto', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4,
                            color: saveStatus === 'saved' ? '#16a34a' : '#F47920', transition: 'opacity 0.3s' }}>
                            {saveStatus === 'saving' ? '⏳ Đang lưu...' : '✓ Đã lưu'}
                        </span>
                    )}
                </div>

                {loading ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
                ) : filtered.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có dự án</div>
                ) : (
                    <div style={{ padding: '0 0 16px' }}>
                        {filtered.map(project => {
                            const { revenue, base, earned, pctDone } = getSalaryInfo(project);
                            const stages = getStages(project);
                            const assignees = getAssignees(project);
                            const progress = getProgress(project);
                            const isExpanded = expanded[project.id];
                            const statusInfo = STATUS_LABELS[project.status] || {};
                            const hasOverride = project.salaryProgress?.contractValueOverride != null;

                            // Tổng hợp lương trong dự án này
                            const projectItems = STAGES
                                .filter(s => stages[s.key])
                                .map(s => ({ entries: toEntries(assignees[s.key]), amount: base * s.pct / 100 }));

                            return (
                                <div key={project.id} style={{ borderBottom: '1px solid var(--border)', margin: '0 16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0' }}>
                                        <span style={{ fontSize: 16, cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleExpand(project)}>{isExpanded ? '▾' : '▸'}</span>
                                        <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => toggleExpand(project)}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--accent-primary)' }}>{project.code}</span>
                                                {project.status && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: `${statusInfo.color}22`, color: statusInfo.color, border: `1px solid ${statusInfo.color}44` }}>{project.status}</span>}
                                                {hasOverride && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: '#f59e0b22', color: '#d97706', border: '1px solid #f59e0b44' }}>GT tùy chỉnh</span>}
                                            </div>
                                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.name}</div>
                                            {project.salaryProgress?.notes && <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>{project.salaryProgress.notes}</div>}
                                        </div>
                                        <div style={{ textAlign: 'right', minWidth: 110 }}><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Doanh thu</div><div style={{ fontSize: 12, fontWeight: 600 }}>{fmt(revenue)}</div></div>
                                        <div style={{ textAlign: 'right', minWidth: 110 }}><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Quỹ lương (50%)</div><div style={{ fontSize: 12, fontWeight: 600 }}>{fmt(base)}</div></div>
                                        <div style={{ textAlign: 'right', minWidth: 130 }}><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Đã tích lũy ({pctDone}%)</div><div style={{ fontSize: 13, fontWeight: 700, color: earned > 0 ? '#16a34a' : 'var(--text-muted)' }}>{fmt(earned)}</div></div>
                                        <div style={{ width: 70 }}><div style={{ height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}><div style={{ height: '100%', background: '#16a34a', width: `${pctDone}%`, borderRadius: 3, transition: 'width 0.3s' }} /></div></div>
                                        <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                                            <button onClick={e => { e.stopPropagation(); printSalaryPDF({ code: project.code, name: project.name, base, stages, assignees, progress, notes: project.salaryProgress?.notes || '', contractValue: revenue }); }} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer', border: '1px solid #F47920', background: 'transparent', color: '#F47920' }}>📄 PDF</button>
                                            <button onClick={e => { e.stopPropagation(); setEditProject(project); }} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)' }}>Sửa</button>
                                            <button onClick={e => { e.stopPropagation(); deleteProgress(project); }} disabled={deleting[project.id] || !project.salaryProgress} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer', border: '1px solid #dc2626', background: 'transparent', color: '#dc2626', opacity: !project.salaryProgress ? 0.35 : 1 }}>{deleting[project.id] ? '...' : 'Xóa'}</button>
                                        </div>
                                    </div>

                                    {isExpanded && (
                                        <div style={{ padding: '8px 0 16px 28px' }}>
                                            <StageList
                                                base={base}
                                                stages={stages}
                                                assignees={assignees}
                                                progress={progress}
                                                users={users}
                                                onToggle={(key) => toggleStage(project, key)}
                                                onAssigneeChange={(key, idx, val) => handleAssigneeChange(project, key, idx, val)}
                                                onAssigneePctChange={(key, idx, val) => handleAssigneePctChange(project, key, idx, val)}
                                                onAssigneeDateChange={(key, idx, field, val) => handleAssigneeDateChange(project, key, idx, field, val)}
                                                onAssigneeAdd={(key) => handleAssigneeAdd(project, key)}
                                                onAssigneeRemove={(key, idx) => handleAssigneeRemove(project, key, idx)}
                                                onProgressChange={(key, field, val) => handleProgressChange(project, key, field, val)}
                                            />
                                            {/* Mini bảng tổng hợp trong dự án */}
                                            <SummaryTable items={projectItems} />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─────────────────────── TAB 2: MỤC LƯƠNG THỦ CÔNG ───────────────────────
const EMPTY_FORM = { code: '', name: '', contractValue: '', notes: '' };

function TabThuCong() {
    const users = useDesignUsers();
    const [entries, setEntries]   = useState([]);
    const [loading, setLoading]   = useState(true);
    const [expanded, setExpanded] = useState({});
    const [showForm, setShowForm] = useState(false);
    const [form, setForm]         = useState(EMPTY_FORM);
    const [editId, setEditId]     = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [deleting, setDeleting] = useState({});
    const [localAssignees, setLocalAssignees] = useState({});
    const [localProgress2, setLocalProgress2] = useState({});
    const [saveStatus, setSaveStatus] = useState('');
    const saveTimers = useRef({});
    const saveStatusTimer = useRef(null);

    const load = useCallback(() => {
        fetch('/api/salary/entries').then(r => r.json()).then(d => {
            const list = d.data || [];
            setEntries(list);
            const initA = {}, initP = {};
            list.forEach(e => {
                initA[e.id] = parseJSON(e.assignees);
                initP[e.id] = parseJSON(e.progress);
            });
            setLocalAssignees(initA);
            setLocalProgress2(initP);
            setLoading(false);
        });
    }, []);

    useEffect(() => { load(); }, [load]);

    const getStages    = (e) => parseJSON(e.stages);
    const getAssignees = (e) => localAssignees[e.id] || parseJSON(e.assignees);
    const getProgress2 = (e) => localProgress2[e.id]  || parseJSON(e.progress);

    const getSalaryInfo = (entry) => {
        const revenue = entry.contractValue || 0;
        const base = revenue * 0.5;
        const stages = getStages(entry);
        const earned = STAGES.reduce((sum, s) => sum + (stages[s.key] ? base * s.pct / 100 : 0), 0);
        const pctDone = STAGES.reduce((sum, s) => sum + (stages[s.key] ? s.pct : 0), 0);
        return { revenue, base, earned, pctDone };
    };

    const saveFull = useCallback(async (entry, newStages, newAssignees, newProgress) => {
        setSaveStatus('saving');
        await fetch(`/api/salary/entries/${entry.id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: entry.code, name: entry.name, contractValue: entry.contractValue, notes: entry.notes, stages: newStages, assignees: newAssignees, progress: newProgress }),
        });
        setSaveStatus('saved');
        clearTimeout(saveStatusTimer.current);
        saveStatusTimer.current = setTimeout(() => setSaveStatus(''), 2000);
    }, []);

    const toggleStage = async (entry, stageKey) => {
        const current = getStages(entry);
        const updated = { ...current, [stageKey]: !current[stageKey] };
        setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, stages: JSON.stringify(updated) } : e));
        await saveFull(entry, updated, getAssignees(entry), getProgress2(entry));
    };

    const _saveAssignees2 = (entry, updated) => {
        setLocalAssignees(prev => ({ ...prev, [entry.id]: updated }));
        clearTimeout(saveTimers.current[entry.id]);
        saveTimers.current[entry.id] = setTimeout(() => {
            saveFull(entry, getStages(entry), updated, getProgress2(entry));
        }, 800);
    };

    const handleAssigneeChange = (entry, stageKey, idx, value) => {
        const cur = toEntries(getAssignees(entry)[stageKey]);
        const newList = cur.map((e, i) => i === idx ? { ...e, name: value } : e);
        _saveAssignees2(entry, { ...getAssignees(entry), [stageKey]: newList });
    };

    const handleAssigneePctChange = (entry, stageKey, idx, value) => {
        const cur = toEntries(getAssignees(entry)[stageKey]);
        const newList = cur.map((e, i) => i === idx ? { ...e, pct: value === '' ? '' : Number(value) } : e);
        _saveAssignees2(entry, { ...getAssignees(entry), [stageKey]: newList });
    };

    const handleAssigneeDateChange = (entry, stageKey, idx, field, value) => {
        const cur = toEntries(getAssignees(entry)[stageKey]);
        const newList = cur.map((e, i) => i === idx ? { ...e, [field]: value } : e);
        _saveAssignees2(entry, { ...getAssignees(entry), [stageKey]: newList });
    };

    const handleAssigneeAdd = (entry, stageKey) => {
        const cur = toEntries(getAssignees(entry)[stageKey]);
        if (cur.length >= 3) return;
        const n = cur.length + 1;
        const share = Math.floor(100 / n);
        const newList = [...cur.map((e, i) => ({ ...e, pct: i === cur.length - 1 ? 100 - share * (n - 1) : share })), { name: '', pct: share }];
        _saveAssignees2(entry, { ...getAssignees(entry), [stageKey]: newList });
    };

    const handleAssigneeRemove = (entry, stageKey, idx) => {
        const cur = toEntries(getAssignees(entry)[stageKey]);
        const newList = cur.filter((_, i) => i !== idx);
        const result = newList.length ? newList : [{ name: '', pct: 100 }];
        if (result.length === 1) result[0] = { ...result[0], pct: 100 };
        _saveAssignees2(entry, { ...getAssignees(entry), [stageKey]: result });
    };

    const handleProgressChange2 = (entry, stageKey, field, value) => {
        const cur = toStageData(getProgress2(entry)[stageKey]);
        const updated = { ...getProgress2(entry), [stageKey]: { ...cur, [field]: field === 'pct' ? (value === '' ? 0 : Math.min(100, Math.max(0, Number(value)))) : value } };
        setLocalProgress2(prev => ({ ...prev, [entry.id]: updated }));
        clearTimeout(saveTimers.current[entry.id + '_p']);
        saveTimers.current[entry.id + '_p'] = setTimeout(() => {
            saveFull(entry, getStages(entry), getAssignees(entry), updated);
        }, 800);
    };

    // Khi thu lại row: flush debounce và lưu ngay
    const toggleExpand = (entry) => {
        const isOpen = expanded[entry.id];
        if (isOpen) {
            clearTimeout(saveTimers.current[entry.id]);
            clearTimeout(saveTimers.current[entry.id + '_p']);
            saveFull(entry, getStages(entry), getAssignees(entry), getProgress2(entry));
        }
        setExpanded(e => ({ ...e, [entry.id]: !e[entry.id] }));
    };

    const openEdit = (entry) => {
        setForm({ code: entry.code, name: entry.name, contractValue: entry.contractValue, notes: entry.notes || '' });
        setEditId(entry.id);
        setShowForm(true);
    };

    const closeForm = () => { setShowForm(false); setForm(EMPTY_FORM); setEditId(null); };

    const submit = async () => {
        if (!form.code || !form.name) return;
        setSubmitting(true);
        const body = { ...form, contractValue: parseFloat(form.contractValue) || 0 };
        if (editId) {
            const entry = entries.find(e => e.id === editId);
            body.stages = parseJSON(entry?.stages);
            body.assignees = getAssignees(entry || {});
            await fetch(`/api/salary/entries/${editId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        } else {
            await fetch('/api/salary/entries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        }
        setSubmitting(false);
        closeForm();
        load();
    };

    const deleteEntry = async (id) => {
        if (!confirm('Xóa mục này?')) return;
        setDeleting(d => ({ ...d, [id]: true }));
        await fetch(`/api/salary/entries/${id}`, { method: 'DELETE' });
        setEntries(prev => prev.filter(e => e.id !== id));
    };

    const totalEarned = entries.reduce((s, e) => s + getSalaryInfo(e).earned, 0);
    const totalBase   = entries.reduce((s, e) => s + getSalaryInfo(e).base, 0);

    const allItems = entries.flatMap(entry => {
        const base = (entry.contractValue || 0) * 0.5;
        const stages = getStages(entry);
        const assignees = getAssignees(entry);
        return STAGES.filter(s => stages[s.key]).map(s => ({ assignee: assignees[s.key] || '', amount: base * s.pct / 100 }));
    });

    return (
        <div>
            <div className="stats-grid" style={{ marginBottom: 20 }}>
                <div className="stat-card"><div className="stat-icon">📋</div><div><div className="stat-value">{entries.length}</div><div className="stat-label">Mục thủ công</div></div></div>
                <div className="stat-card"><div className="stat-icon">💰</div><div><div className="stat-value" style={{ fontSize: 14, color: 'var(--text-muted)' }}>{fmt(totalBase)}</div><div className="stat-label">Quỹ lương (50% DT)</div></div></div>
                <div className="stat-card"><div className="stat-icon">✅</div><div><div className="stat-value" style={{ fontSize: 14, color: 'var(--accent-primary)' }}>{fmt(totalEarned)}</div><div className="stat-label">Đã tích lũy</div></div></div>
            </div>

            <SummaryTable items={allItems} />

            <div className="card" style={{ marginTop: 20 }}>
                <div className="card-header" style={{ justifyContent: 'flex-end', gap: 12 }}>
                    {saveStatus && (
                        <span style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4,
                            color: saveStatus === 'saved' ? '#16a34a' : '#F47920' }}>
                            {saveStatus === 'saving' ? '⏳ Đang lưu...' : '✓ Đã lưu'}
                        </span>
                    )}
                    <button className="btn btn-primary" onClick={() => { setForm(EMPTY_FORM); setEditId(null); setShowForm(true); }}>+ Thêm mục</button>
                </div>

                {showForm && (
                    <div style={{ margin: '0 16px 16px', padding: 16, borderRadius: 10, background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                        <div style={{ fontWeight: 600, marginBottom: 12 }}>{editId ? 'Sửa mục lương' : 'Thêm mục lương'}</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: 10, marginBottom: 10 }}>
                            <div><div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Mã *</div><input className="form-input" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="VD: HDB-01" /></div>
                            <div><div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Tên *</div><input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Tên dự án" /></div>
                            <div><div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Giá trị HĐ (VND)</div><input className="form-input" type="number" value={form.contractValue} onChange={e => setForm(f => ({ ...f, contractValue: e.target.value }))} placeholder="0" /></div>
                        </div>
                        <div style={{ marginBottom: 10 }}><div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Ghi chú</div><input className="form-input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Ghi chú..." /></div>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button className="btn btn-secondary" onClick={closeForm}>Hủy</button>
                            <button className="btn btn-primary" onClick={submit} disabled={submitting || !form.code || !form.name}>{submitting ? 'Đang lưu...' : (editId ? 'Cập nhật' : 'Thêm')}</button>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
                ) : entries.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có mục lương thủ công</div>
                ) : (
                    <div style={{ padding: '0 0 16px' }}>
                        {entries.map(entry => {
                            const { revenue, base, earned, pctDone } = getSalaryInfo(entry);
                            const stages = getStages(entry);
                            const assignees = getAssignees(entry);
                            const progress = getProgress2(entry);
                            const isExpanded = expanded[entry.id];
                            const projectItems = STAGES.filter(s => stages[s.key]).map(s => ({ entries: toEntries(assignees[s.key]), amount: base * s.pct / 100 }));

                            return (
                                <div key={entry.id} style={{ borderBottom: '1px solid var(--border)', margin: '0 16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0' }}>
                                        <span style={{ fontSize: 16, cursor: 'pointer' }} onClick={() => toggleExpand(entry)}>{isExpanded ? '▾' : '▸'}</span>
                                        <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => toggleExpand(entry)}>
                                            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--accent-primary)' }}>{entry.code}</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{entry.name}</div>
                                            {entry.notes && <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>{entry.notes}</div>}
                                        </div>
                                        <div style={{ textAlign: 'right', minWidth: 110 }}><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Doanh thu</div><div style={{ fontSize: 12, fontWeight: 600 }}>{fmt(revenue)}</div></div>
                                        <div style={{ textAlign: 'right', minWidth: 110 }}><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Quỹ lương (50%)</div><div style={{ fontSize: 12, fontWeight: 600 }}>{fmt(base)}</div></div>
                                        <div style={{ textAlign: 'right', minWidth: 130 }}><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Đã tích lũy ({pctDone}%)</div><div style={{ fontSize: 13, fontWeight: 700, color: earned > 0 ? '#16a34a' : 'var(--text-muted)' }}>{fmt(earned)}</div></div>
                                        <div style={{ width: 70 }}><div style={{ height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}><div style={{ height: '100%', background: '#16a34a', width: `${pctDone}%`, borderRadius: 3, transition: 'width 0.3s' }} /></div></div>
                                        <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                                            <button onClick={() => printSalaryPDF({ code: entry.code, name: entry.name, base, stages, assignees, progress, notes: entry.notes || '', contractValue: revenue })} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer', border: '1px solid #F47920', background: 'transparent', color: '#F47920' }}>📄 PDF</button>
                                            <button onClick={() => openEdit(entry)} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)' }}>Sửa</button>
                                            <button onClick={() => deleteEntry(entry.id)} disabled={deleting[entry.id]} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer', border: '1px solid #dc2626', background: 'transparent', color: '#dc2626' }}>{deleting[entry.id] ? '...' : 'Xóa'}</button>
                                        </div>
                                    </div>

                                    {isExpanded && (
                                        <div style={{ padding: '8px 0 16px 28px' }}>
                                            <StageList
                                                base={base}
                                                stages={stages}
                                                assignees={assignees}
                                                progress={progress}
                                                users={users}
                                                onToggle={(key) => toggleStage(entry, key)}
                                                onAssigneeChange={(key, idx, val) => handleAssigneeChange(entry, key, idx, val)}
                                                onAssigneePctChange={(key, idx, val) => handleAssigneePctChange(entry, key, idx, val)}
                                                onAssigneeDateChange={(key, idx, field, val) => handleAssigneeDateChange(entry, key, idx, field, val)}
                                                onAssigneeAdd={(key) => handleAssigneeAdd(entry, key)}
                                                onAssigneeRemove={(key, idx) => handleAssigneeRemove(entry, key, idx)}
                                                onProgressChange={(key, field, val) => handleProgressChange2(entry, key, field, val)}
                                            />
                                            <SummaryTable items={projectItems} />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─────────────────────────── ROOT PAGE ───────────────────────────
export default function LuongPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [tab, setTab] = useState('du_an');

    useEffect(() => {
        if (status === 'loading') return;
        if (status === 'unauthenticated' || session?.user?.email !== ALLOWED_EMAIL) router.replace('/');
    }, [status, session, router]);

    if (status === 'loading' || session?.user?.email !== ALLOWED_EMAIL) {
        return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>;
    }

    return (
        <div>
            <div className="page-header" style={{ marginBottom: 20 }}>
                <h1 style={{ fontSize: 22, fontWeight: 700 }}>Bảng tính lương — Phòng Thiết Kế Kiến Trúc</h1>
            </div>
            <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '2px solid var(--border)' }}>
                {[{ key: 'du_an', label: 'Dự án trong hệ thống' }, { key: 'thu_cong', label: 'Mục thủ công' }].map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)} style={{
                        padding: '8px 18px', fontSize: 13, fontWeight: 500, cursor: 'pointer', border: 'none', background: 'none',
                        borderBottom: tab === t.key ? '2px solid var(--accent-primary)' : '2px solid transparent',
                        color: tab === t.key ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        marginBottom: -2, transition: 'all 0.15s',
                    }}>{t.label}</button>
                ))}
            </div>
            {tab === 'du_an'    && <TabDuAn />}
            {tab === 'thu_cong' && <TabThuCong />}
        </div>
    );
}
