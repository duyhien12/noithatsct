'use client';
import { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '@/lib/fetchClient';
import { useToast } from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';
import { isDesignStaff } from '@/lib/designStaff';
import {
    ALLOWED_TRANSITIONS, NOTE_REQUIRED, ASSIGNABLE_STATUSES,
    canTransition, canAssignDesigner, transitionLabel, splitRevenue,
} from '@/lib/designOrderStatus';

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Math.round(n || 0));
const fmtDateTime = (d) => d ? new Date(d).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : '';

const STEPS = [
    { key: 'Nháp', label: 'KD lập phiếu' },
    { key: 'Đã gửi thiết kế', label: 'Gửi phòng TK' },
    { key: 'Phòng thiết kế đã tiếp nhận', label: 'TK xác nhận' },
    { key: 'Đang thiết kế', label: 'Đang thiết kế' },
    { key: 'Chờ nghiệm thu', label: 'Chờ nghiệm thu' },
    { key: 'Hoàn thành', label: 'KD nghiệm thu' },
];

// Ai chịu trách nhiệm bước tiếp theo ở mỗi trạng thái
const NEXT_STEP = {
    'Nháp': { who: 'Kinh doanh', what: 'kiểm tra phiếu và bấm “Gửi phòng thiết kế”' },
    'Đã gửi thiết kế': { who: 'Phòng Thiết kế', what: 'phân công nhân sự + chia % doanh số, rồi bấm “Xác nhận đơn hàng” (hoặc trả lại KD nếu thiếu thông tin)' },
    'Phòng thiết kế đã tiếp nhận': { who: 'Phòng Thiết kế', what: 'bấm “Bắt đầu thiết kế”' },
    'Đang thiết kế': { who: 'Phòng Thiết kế', what: 'hoàn thành, đính kèm file và bấm “Bàn giao, chờ nghiệm thu”' },
    'Chờ bổ sung thông tin': { who: 'Kinh doanh', what: 'sửa / bổ sung phiếu rồi bấm “Gửi lại phòng thiết kế”' },
    'Chờ nghiệm thu': { who: 'Kinh doanh', what: 'kiểm tra hồ sơ bàn giao, bấm “Nghiệm thu đạt” để chốt doanh số hoặc “Yêu cầu chỉnh sửa”' },
    'Hoàn thành': { who: 'Ban Giám đốc', what: 'chỉ mở lại phiếu khi cần điều chỉnh (doanh số sẽ bị tính lại)' },
};

function Stepper({ status }) {
    // "Chờ bổ sung thông tin" đứng ở bước Gửi phòng TK (đang chờ KD bổ sung)
    const idx = status === 'Chờ bổ sung thông tin' ? 1 : STEPS.findIndex(s => s.key === status);
    const cancelled = status === 'Hủy';
    return (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {STEPS.map((s, i) => {
                const done = !cancelled && (i < idx || status === 'Hoàn thành');
                const current = !cancelled && i === idx && status !== 'Hoàn thành';
                return (
                    <div key={s.key} style={{
                        flex: '1 1 110px', padding: '6px 8px', borderRadius: 6, fontSize: 12, textAlign: 'center',
                        background: done ? 'var(--color-success-bg)' : current ? 'var(--color-warning-bg)' : 'var(--surface-alt)',
                        color: done ? 'var(--status-success)' : current ? 'var(--accent-primary)' : 'var(--text-muted)',
                        fontWeight: current ? 700 : 500,
                        border: current ? '1px solid currentColor' : '1px solid transparent',
                    }}>
                        {done ? '✓ ' : `${i + 1}. `}{s.label}
                    </div>
                );
            })}
            {status === 'Chờ bổ sung thông tin' && <div style={{ width: '100%', fontSize: 12, color: 'var(--status-warning)' }}>⚠ Phòng TK đã trả lại — chờ Kinh doanh bổ sung thông tin</div>}
            {cancelled && <div style={{ width: '100%', fontSize: 12, color: 'var(--status-danger)' }}>Phiếu đã hủy</div>}
        </div>
    );
}

function AssignForm({ order, onSaved }) {
    const toast = useToast();
    const [users, setUsers] = useState([]);
    const [rows, setRows] = useState(() => order.designers.map(d => ({ userId: d.userId, sharePercent: d.sharePercent })));
    const [deadline, setDeadline] = useState(order.confirmedDeadline ? new Date(order.confirmedDeadline).toISOString().slice(0, 10) : '');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        apiFetch('/api/users').then(list => setUsers(list || [])).catch(() => {});
    }, []);

    // Nhân sự thiết kế (xem lib/designStaff.js), vẫn giữ người đã được phân công trước đó
    const options = useMemo(() => {
        const assigned = new Set(order.designers.map(d => d.userId));
        return users.filter(u => isDesignStaff(u) || assigned.has(u.id));
    }, [users, order.designers]);

    const total = rows.reduce((s, r) => s + (Number(r.sharePercent) || 0), 0);
    const setRow = (i, patch) => setRows(rs => rs.map((r, j) => j === i ? { ...r, ...patch } : r));
    const splitEvenly = () => setRows(rs => {
        if (!rs.length) return rs;
        const base = Math.floor((100 / rs.length) * 100) / 100;
        return rs.map((r, i) => ({ ...r, sharePercent: i === rs.length - 1 ? +(100 - base * (rs.length - 1)).toFixed(2) : base }));
    });

    const save = async () => {
        if (rows.some(r => !r.userId)) return toast.error('Chọn nhân viên cho từng dòng');
        if (Math.abs(total - 100) >= 0.01) return toast.error(`Tổng tỷ lệ phải bằng 100% (đang ${total}%)`);
        setBusy(true);
        try {
            await apiFetch(`/api/design-orders/${order.id}/assign`, {
                method: 'PATCH',
                body: JSON.stringify({
                    designers: rows.map(r => ({ userId: r.userId, sharePercent: Number(r.sharePercent) })),
                    confirmedDeadline: deadline,
                }),
            });
            toast.success('Đã lưu phân công');
            onSaved();
        } catch (e) {
            toast.error(e.message);
        }
        setBusy(false);
    };

    return (
        <div>
            <div className="form-label">Phân công nhân sự thiết kế & chia % doanh số</div>
            <div style={{ display: 'grid', gap: 6 }}>
                {rows.map((r, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <select className="form-select" value={r.userId} onChange={e => setRow(i, { userId: e.target.value })} style={{ minWidth: 220, flex: 1 }}>
                            <option value="">— Chọn nhân viên —</option>
                            {options.map(u => (
                                <option key={u.id} value={u.id} disabled={rows.some((x, j) => j !== i && x.userId === u.id)}>{u.name}</option>
                            ))}
                        </select>
                        <input className="form-input" type="number" min="0" max="100" step="0.01" value={r.sharePercent}
                            onChange={e => setRow(i, { sharePercent: e.target.value })} style={{ width: 90 }} />
                        <span>%</span>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 110 }}>
                            ≈ {fmt(order.totalAfterDiscount * (Number(r.sharePercent) || 0) / 100)}
                        </span>
                        <button className="btn btn-ghost" onClick={() => setRows(rs => rs.filter((_, j) => j !== i))} title="Bỏ">✕</button>
                    </div>
                ))}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap', marginTop: 8 }}>
                <button className="btn btn-ghost" onClick={() => setRows(rs => [...rs, { userId: '', sharePercent: rs.length ? 0 : 100 }])}>+ Thêm người</button>
                {rows.length > 1 && <button className="btn btn-ghost" onClick={splitEvenly}>Chia đều</button>}
                <span style={{ fontSize: 12, fontWeight: 600, color: Math.abs(total - 100) < 0.01 ? 'var(--status-success)' : 'var(--status-danger)' }}>
                    Tổng: {+total.toFixed(2)}%
                </span>
                <div style={{ marginLeft: 'auto' }}>
                    <label className="form-label" style={{ fontSize: 11 }}>Deadline xác nhận</label>
                    <input className="form-input" type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
                </div>
                <button className="btn btn-primary" disabled={busy} onClick={save}>Lưu phân công</button>
            </div>
        </div>
    );
}

function TransitionModal({ order, target, onClose, onDone }) {
    const toast = useToast();
    const [note, setNote] = useState('');
    const [files, setFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [busy, setBusy] = useState(false);

    const key = `${order.status}>${target}`;
    const noteRequired = NOTE_REQUIRED.has(key);
    const isHandover = key === 'Đang thiết kế>Chờ nghiệm thu';
    const isComplete = target === 'Hoàn thành';
    const isReopen = order.status === 'Hoàn thành';
    const splits = isComplete ? splitRevenue(order.totalAfterDiscount, order.designers) : [];

    const upload = async (e) => {
        const list = Array.from(e.target.files || []);
        setUploading(true);
        for (const file of list) {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('type', 'documents');
            try {
                const res = await fetch('/api/upload', { method: 'POST', body: fd });
                if (res.ok) {
                    const r = await res.json();
                    setFiles(f => [...f, { url: r.url, name: file.name, type: file.type }]);
                } else toast.error(`Không tải được ${file.name}`);
            } catch { toast.error(`Không tải được ${file.name}`); }
        }
        setUploading(false);
        e.target.value = '';
    };

    const submit = async () => {
        if (noteRequired && !note.trim()) return toast.error('Vui lòng nhập lý do / ghi chú');
        setBusy(true);
        try {
            await apiFetch(`/api/design-orders/${order.id}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ status: target, note, ...(isHandover ? { files } : {}) }),
            });
            toast.success(transitionLabel(order.status, target));
            onDone();
        } catch (e) {
            toast.error(e.message);
            setBusy(false);
        }
    };

    return (
        <Modal isOpen onClose={onClose} title={transitionLabel(order.status, target)} closeOnOverlayClick={false} maxWidth={520}
            footer={<>
                <button className="btn btn-ghost" onClick={onClose}>Hủy bỏ</button>
                <button className="btn btn-primary" disabled={busy || uploading} onClick={submit}>Xác nhận</button>
            </>}>
            <div style={{ display: 'grid', gap: 12 }}>
                <div style={{ fontSize: 13 }}>Chuyển phiếu <strong>{order.code}</strong> từ “{order.status}” sang “{target}”.</div>
                {isComplete && (
                    <div style={{ background: 'var(--surface-alt)', borderRadius: 6, padding: 10, fontSize: 13 }}>
                        <div>Doanh số ghi nhận (trước VAT): <strong>{fmt(order.totalAfterDiscount)}</strong></div>
                        {splits.map(d => (
                            <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>• {d.userName} ({d.sharePercent}%)</span><span>{fmt(d.amount)}</span>
                            </div>
                        ))}
                        <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4 }}>Ghi nhận vào tháng nghiệm thu (tháng hiện tại).</div>
                    </div>
                )}
                {isReopen && (
                    <div style={{ fontSize: 13, color: 'var(--status-danger)' }}>
                        Mở lại sẽ hủy doanh số đã chốt ({fmt(order.revenueAmount)} – tháng {order.revenueMonth}). Doanh số được tính lại khi KD nghiệm thu lần nữa.
                    </div>
                )}
                {isHandover && (
                    <div>
                        <label className="form-label">File bàn giao (bản vẽ, phối cảnh...)</label>
                        {files.map((f, i) => (
                            <div key={i} style={{ fontSize: 12, display: 'flex', gap: 6 }}>
                                📎 <a href={f.url} target="_blank" rel="noreferrer">{f.name}</a>
                                <button className="btn btn-ghost" style={{ padding: '0 4px' }} onClick={() => setFiles(fs => fs.filter((_, j) => j !== i))}>✕</button>
                            </div>
                        ))}
                        <input type="file" multiple onChange={upload} disabled={uploading} />
                        {uploading && <span style={{ fontSize: 12, marginLeft: 8 }}>Đang tải lên...</span>}
                    </div>
                )}
                <div>
                    <label className="form-label">{noteRequired ? 'Lý do / ghi chú *' : 'Ghi chú (không bắt buộc)'}</label>
                    <textarea className="form-input" rows={3} value={note} onChange={e => setNote(e.target.value)} style={{ width: '100%' }} />
                </div>
            </div>
        </Modal>
    );
}

export default function WorkflowPanel({ order, role, onChanged }) {
    const [target, setTarget] = useState(null);

    const next = (ALLOWED_TRANSITIONS[order.status] || []).filter(s => canTransition(role, order.status, s));
    const showAssign = canAssignDesigner(role) && ASSIGNABLE_STATUSES.includes(order.status);
    const completed = order.status === 'Hoàn thành';
    const handoverFiles = Array.isArray(order.handoverFiles) ? order.handoverFiles : [];

    return (
        <div className="no-print card" style={{ maxWidth: 820, margin: '16px auto' }}>
            <div className="card-body" style={{ display: 'grid', gap: 16 }}>
                <Stepper status={order.status} />

                {NEXT_STEP[order.status] && (
                    <div style={{ fontSize: 13, padding: '8px 10px', borderRadius: 6, background: 'var(--surface-alt)' }}>
                        <strong>Bước tiếp theo — {NEXT_STEP[order.status].who}:</strong> {NEXT_STEP[order.status].what}.
                        {next.every(s => s === 'Hủy') && order.status !== 'Hoàn thành' && <span style={{ color: 'var(--text-muted)' }}> (Vai trò hiện tại của bạn không thực hiện bước này.)</span>}
                    </div>
                )}

                {next.length > 0 && (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {next.map(s => (
                            <button key={s} className={`btn ${s === 'Hủy' ? 'btn-ghost' : s === 'Hoàn thành' || order.status === 'Nháp' ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => setTarget(s)}>
                                {transitionLabel(order.status, s)}
                            </button>
                        ))}
                    </div>
                )}

                {/* Nhân sự & doanh số */}
                <div style={{ fontSize: 13 }}>
                    <div className="form-label">{completed ? 'Doanh số đã chốt (trước VAT)' : 'Doanh số dự kiến (trước VAT)'}</div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{fmt(completed ? order.revenueAmount : order.totalAfterDiscount)}</div>
                    {completed && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tháng {order.revenueMonth} · Nghiệm thu bởi {order.acceptedBy} lúc {fmtDateTime(order.acceptedAt)}</div>}
                    {order.designers.length > 0 ? (
                        <div style={{ marginTop: 6 }}>
                            {order.designers.map(d => (
                                <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', maxWidth: 420 }}>
                                    <span>• {d.userName} ({d.sharePercent}%)</span>
                                    <span>{fmt(completed ? d.amount : order.totalAfterDiscount * d.sharePercent / 100)}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Chưa phân công nhân sự thiết kế</div>
                    )}
                </div>

                {showAssign && <AssignForm key={order.updatedAt} order={order} onSaved={onChanged} />}

                {order.handedOverAt && (
                    <div style={{ fontSize: 13 }}>
                        <div className="form-label">Bàn giao thiết kế</div>
                        <div>{order.handedOverBy} · {fmtDateTime(order.handedOverAt)}</div>
                        {order.handoverNote && <div style={{ whiteSpace: 'pre-wrap' }}>{order.handoverNote}</div>}
                        {handoverFiles.map((f, i) => (
                            <div key={i}>📎 <a href={f.url} target="_blank" rel="noreferrer">{f.name || f.url}</a></div>
                        ))}
                    </div>
                )}

                {order.logs?.length > 0 && (
                    <details>
                        <summary className="form-label" style={{ cursor: 'pointer' }}>Lịch sử xử lý ({order.logs.length})</summary>
                        <div style={{ display: 'grid', gap: 6, marginTop: 8, fontSize: 12.5 }}>
                            {order.logs.map(l => (
                                <div key={l.id} style={{ borderLeft: '2px solid var(--border)', paddingLeft: 8 }}>
                                    <div><strong>{l.action}</strong> — {l.userName} <span style={{ color: 'var(--text-muted)' }}>{fmtDateTime(l.createdAt)}</span></div>
                                    {l.fromStatus !== l.toStatus && <div style={{ color: 'var(--text-muted)' }}>{l.fromStatus} → {l.toStatus}</div>}
                                    {l.note && <div style={{ whiteSpace: 'pre-wrap' }}>{l.note}</div>}
                                </div>
                            ))}
                        </div>
                    </details>
                )}
            </div>

            {target && (
                <TransitionModal order={order} target={target} onClose={() => setTarget(null)}
                    onDone={() => { setTarget(null); onChanged(); }} />
            )}
        </div>
    );
}
