'use client';
import { Fragment, useState, useMemo, useEffect } from 'react';
import { AlertTriangle, CheckCircle2, Clock, Info } from 'lucide-react';
import { Modal, Button, Input, Select, Checkbox, useToast } from '@/components/ui';
import s from './schedule.module.css';

// Nhãn tiếng Việt cho trạng thái và chẩn đoán của bộ xếp lịch
export const STATUS_LABEL = {
    on_time: { text: 'Kịp hạn', cls: 'ok' },
    late: { text: 'Trễ hạn', cls: 'bad' },
    unfinished: { text: 'Chưa xếp xong', cls: 'bad' },
    blocked: { text: 'Bị chặn', cls: 'bad' },
};
export const DIAG_LABEL = {
    PROVEN_INFEASIBLE: 'Đã chứng minh: không có phương án với cấu hình hiện tại',
    NOT_FOUND_WITH_CONFIG: 'Chưa tìm được phương án với cấu hình hiện tại (chưa chứng minh là vô phương án)',
    BLOCKED: 'Không xếp được do phụ thuộc vòng tròn',
};
const WARN_LABEL = {
    PROVEN_INFEASIBLE: 'Không khả thi',
    NO_TEAM: 'Thiếu đội / người',
    MISSING_DATA: 'Thiếu dữ liệu',
    WAITING_MATERIAL: 'Chờ hàng',
    WAITING_SITE: 'Chờ mặt bằng',
    WAITING_DEP: 'Chờ việc trước',
    LATE_RISK: 'Nguy cơ trễ',
    LOCK_CONFLICT: 'Trùng lịch khóa',
    CYCLE: 'Vòng tròn phụ thuộc',
    OVERTIME_USED: 'Có tăng ca',
};
const fmt = (iso) => (iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) : '—');
const fmtTime = (t) => (t ? new Date(t).toLocaleString('vi-VN') : '');

export function ScheduleRunModal({ isOpen, onClose, run, runs, onSelectRun, onApply, onDeleteDraft, onRecalc, busy }) {
    const toast = useToast();
    const [expanded, setExpanded] = useState(null);
    const [confirmApply, setConfirmApply] = useState(false);
    useEffect(() => { setConfirmApply(false); setExpanded(null); }, [run?.id]);

    const result = run?.result;
    const jobs = useMemo(() => result?.jobs || [], [result]);
    const warnings = useMemo(() => result?.issues || [], [result]);
    const sum = result?.summary || {};
    const canApply = run?.status === 'draft';
    const hasRisk = (sum.late || 0) + (sum.unfinished || 0) > 0;

    const missingData = useMemo(() => warnings.filter(w => w.type === 'MISSING_DATA'), [warnings]);

    const warnByType = useMemo(() => {
        const m = {};
        for (const w of warnings) m[w.type] = (m[w.type] || 0) + 1;
        return m;
    }, [warnings]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Kết quả xếp lịch thi công" maxWidth={1080} closeOnOverlayClick={false}
            footer={
                <div className={s.footerRow}>
                    <div className={s.footerLeft}>
                        {run?.status === 'draft' && <Button variant="ghost" onClick={() => onDeleteDraft(run.id)} disabled={busy}>Xóa bản nháp</Button>}
                        <Button variant="secondary" onClick={onRecalc} disabled={busy}>Tính lại lịch</Button>
                    </div>
                    <div className={s.footerLeft}>
                        {canApply && !confirmApply && (
                            <Button variant="primary" onClick={() => setConfirmApply(true)} disabled={busy || !result}>Chốt kế hoạch</Button>
                        )}
                        {canApply && confirmApply && (
                            <>
                                <span className={s.confirmText}>
                                    {hasRisk ? 'Còn việc trễ hoặc chưa xếp xong. Vẫn chốt?' : 'Chốt lịch này làm kế hoạch chính thức?'}
                                </span>
                                <Button variant="ghost" onClick={() => setConfirmApply(false)} disabled={busy}>Chưa</Button>
                                <Button variant="primary" onClick={() => onApply(run.id)} loading={busy}>Có, chốt</Button>
                            </>
                        )}
                        {run?.status === 'applied' && <span className={s.okText}>Đã chốt lúc {fmtTime(run.appliedAt)}</span>}
                        {run?.status === 'superseded' && <span className={s.muted}>Bản này đã được thay bằng bản chốt mới</span>}
                    </div>
                </div>
            }>
            {!run || !result ? (
                <div className={s.empty}>Chưa có bản tính lịch. Bấm “Tự động xếp lịch” để tạo bản nháp.</div>
            ) : (
                <div className={s.body}>
                    {/* Chọn phiên bản để so sánh */}
                    {runs?.length > 0 && (
                        <div className={s.runPicker}>
                            <span className={s.muted}>Phiên bản:</span>
                            <Select value={run.id} onChange={e => onSelectRun(e.target.value)} aria-label="Chọn phiên bản">
                                {runs.map(r => (
                                    <option key={r.id} value={r.id}>
                                        {fmtTime(r.createdAt)} · {r.label} · {statusText(r.status)}
                                        {r.summary?.onTime != null ? ` · kịp ${r.summary.onTime}/${r.summary.total}` : ''}
                                    </option>
                                ))}
                            </Select>
                        </div>
                    )}

                    <div className={s.summaryGrid}>
                        <SummaryCard tone="ok" icon={CheckCircle2} label="Kịp hạn" value={sum.onTime ?? 0} of={sum.total} />
                        <SummaryCard tone="bad" icon={AlertTriangle} label="Trễ hạn" value={sum.late ?? 0} of={sum.total} />
                        <SummaryCard tone="warn" icon={Clock} label="Chưa xếp xong" value={sum.unfinished ?? 0} of={sum.total} />
                        <SummaryCard tone="bad" icon={Info} label="Đã chứng minh không khả thi" value={sum.provenInfeasible ?? 0} />
                    </div>

                    {missingData.length > 0 && (
                        <div className={s.missingBanner} role="alert">
                            <AlertTriangle size={18} aria-hidden="true" />
                            <div>
                                <b>{missingData.length} công việc chưa được xếp vì thiếu dữ liệu.</b>
                                <div className={s.muted}>
                                    Vào “Kế hoạch lắp đặt”, cập nhật ngày bắt đầu/kết thúc hoặc khối lượng (giờ-người) cho từng việc dưới đây, rồi bấm “Tính lại lịch”.
                                </div>
                                <ul className={s.missingList}>
                                    {missingData.map((w, i) => <li key={i}>{w.message}</li>)}
                                </ul>
                            </div>
                        </div>
                    )}

                    <div className={s.chips}>
                        {Object.entries(warnByType).map(([type, n]) => (
                            <span key={type} className={s.chip}>{WARN_LABEL[type] || type}: {n}</span>
                        ))}
                        {Object.keys(warnByType).length === 0 && <span className={s.okText}>Không có cảnh báo</span>}
                    </div>

                    <div className={s.tableWrap}>
                        <table className={s.table}>
                            <thead>
                                <tr>
                                    <th>Công việc</th>
                                    <th>Đội</th>
                                    <th>Bắt đầu</th>
                                    <th>Dự kiến xong</th>
                                    <th>Hạn bàn giao</th>
                                    <th>Giờ thường / tăng ca</th>
                                    <th>Kết quả</th>
                                </tr>
                            </thead>
                            <tbody>
                                {jobs.map(j => {
                                    const st = STATUS_LABEL[j.status] || { text: j.status, cls: 'warn' };
                                    const open = expanded === j.id;
                                    return (
                                        <Fragment key={j.id}>
                                            <tr className={s.rowClick} onClick={() => setExpanded(open ? null : j.id)}>
                                                <td><b>{j.name}</b><div className={s.muted}>{j.projectName}{j.effortEstimated ? ' · khối lượng ước tính theo khung ngày' : ''}</div></td>
                                                <td>{teamNames(result, j) || <span className={s.muted}>chưa có</span>}</td>
                                                <td>{fmt(j.plannedStart)}</td>
                                                <td>{fmt(j.plannedEnd)}</td>
                                                <td>{fmt(j.deadline)}{j.lateDays ? <span className={s.bad}> (+{j.lateDays} ngày)</span> : null}</td>
                                                <td>{round1(j.normalHours)} / {round1(j.otHours)} giờ</td>
                                                <td><span className={`${s.badge} ${s[st.cls]}`}>{st.text}</span></td>
                                            </tr>
                                            {open && (
                                                <tr className={s.detailRow}>
                                                    <td colSpan={7}>
                                                        <JobDetail job={j} result={result} />
                                                    </td>
                                                </tr>
                                            )}
                                        </Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {warnings.length > 0 && (
                        <div className={s.warnList}>
                            <h4>Cảnh báo</h4>
                            {warnings.map((w, i) => (
                                <div key={i} className={`${s.warnItem} ${s['sev_' + w.severity]}`}>
                                    <span className={s.warnType}>{WARN_LABEL[w.type] || w.type}</span> {w.message}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </Modal>
    );
}

function statusText(st) {
    return { draft: 'Nháp', applied: 'Đã chốt', superseded: 'Đã thay thế' }[st] || st;
}
const round1 = (x) => Math.round((x || 0) * 10) / 10;

// Gom tên đội của một công việc từ các đoạn làm việc
function teamNames(result, job) {
    const names = new Map((result.teams || []).map(t => [t.id, t.name]));
    return job.teamIds.map(id => names.get(id) || id).join(', ');
}

function SummaryCard({ tone, icon: Icon, label, value, of }) {
    return (
        <div className={`${s.summaryCard} ${s['tone_' + tone]}`}>
            <Icon size={22} aria-hidden="true" />
            <div>
                <div className={s.summaryLabel}>{label}</div>
                <div className={s.summaryValue}>{value}{of != null && <span> / {of}</span>}</div>
            </div>
        </div>
    );
}

// Chi tiết một công việc: đội, giờ, lý do phân công, chẩn đoán và đề xuất
function JobDetail({ job, result }) {
    const teams = (result.teams || []).filter(t => job.teamIds.includes(t.id));
    const segs = result.segments.filter(x => x.jobId === job.id);
    return (
        <div className={s.detail}>
            <div className={s.detailGrid}>
                <div>
                    <div className={s.detailTitle}>Đội và thành viên</div>
                    {teams.length ? teams.map(t => <div key={t.id}>{t.name} · {t.memberCount} người</div>) : <div className={s.muted}>Chưa gán đội</div>}
                </div>
                <div>
                    <div className={s.detailTitle}>Khối lượng</div>
                    <div>Yêu cầu: {round1(job.effortHours)} giờ-người</div>
                    <div>Giờ thường: {round1(job.normalHours)} · Tăng ca: {round1(job.otHours)}</div>
                    <div>Số ngày làm việc: {new Set(segs.map(x => x.date)).size}</div>
                </div>
                <div>
                    <div className={s.detailTitle}>Vì sao phân công</div>
                    {job.explain.length ? job.explain.map((e, i) => <div key={i}>• {e}</div>) : <div className={s.muted}>—</div>}
                </div>
            </div>
            {job.diagnosis && (
                <div className={s.diag}>
                    <b>{DIAG_LABEL[job.diagnosis.kind] || 'Chẩn đoán'}</b>
                    <div>{job.diagnosis.message}</div>
                    {job.diagnosis.missingHours > 0 && <div>Còn thiếu: <b>{round1(job.diagnosis.missingHours)} giờ-người</b></div>}
                </div>
            )}
            {job.suggestions?.length > 0 && (
                <div className={s.suggest}>
                    <div className={s.detailTitle}>Phương án bổ sung</div>
                    {job.suggestions.map((x, i) => <div key={i}>• {x}</div>)}
                </div>
            )}
            <div className={s.muted}>
                Lý do chờ: hàng {job.reasons.waitMaterial} ngày · mặt bằng {job.reasons.waitSite} ngày · việc trước {job.reasons.waitDep} ngày ·
                thiếu đội {job.reasons.noTeam} ngày · di chuyển {job.reasons.travel} ngày
            </div>
        </div>
    );
}

// Cấu hình giờ làm và tăng ca: lưu vào ScheduleSettings
export function ScheduleSettingsModal({ isOpen, onClose, settings, onSaved }) {
    const toast = useToast();
    const [form, setForm] = useState(null);
    const [saving, setSaving] = useState(false);
    useEffect(() => {
        if (isOpen && settings) setForm({ ...settings, otWeekdays: [...settings.otWeekdays] });
    }, [isOpen, settings]);
    if (!form) return null;
    const num = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
    const toggleDay = (d) => setForm(f => ({
        ...f,
        otWeekdays: f.otWeekdays.includes(d) ? f.otWeekdays.filter(x => x !== d) : [...f.otWeekdays, d],
    }));
    const save = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/workshop/schedule/settings', {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    hoursPerDay: Number(form.hoursPerDay), otMaxPerDay: Number(form.otMaxPerDay),
                    otMaxPerMonth: Number(form.otMaxPerMonth), otMaxPerYear: Number(form.otMaxPerYear),
                    otWeekdays: form.otWeekdays,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Lưu không thành công');
            toast.success('', 'Đã lưu cấu hình giờ làm');
            onSaved(data);
            onClose();
        } catch (e) {
            toast.error(e.message);
        } finally {
            setSaving(false);
        }
    };
    const DAYS = [[1, 'T2'], [2, 'T3'], [3, 'T4'], [4, 'T5'], [5, 'T6'], [6, 'T7'], [0, 'CN']];
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Cấu hình giờ làm và tăng ca" maxWidth={560} closeOnOverlayClick={false}
            footer={<div className={s.footerRow}><span /><div className={s.footerLeft}>
                <Button variant="ghost" onClick={onClose}>Hủy</Button>
                <Button variant="primary" onClick={save} loading={saving}>Lưu</Button>
            </div></div>}>
            <div className={s.settingsGrid}>
                <label>Giờ thường (giờ/người/ngày)<Input type="number" min={1} max={12} numeric value={form.hoursPerDay} onChange={num('hoursPerDay')} /></label>
                <label>Tăng ca tối đa (giờ/người/ngày, tối đa 3)<Input type="number" min={0} max={3} numeric value={form.otMaxPerDay} onChange={num('otMaxPerDay')} /></label>
                <label>Trần tăng ca tháng (giờ/người)<Input type="number" min={0} max={200} numeric value={form.otMaxPerMonth} onChange={num('otMaxPerMonth')} /></label>
                <label>Trần tăng ca năm (giờ/người)<Input type="number" min={0} max={2400} numeric value={form.otMaxPerYear} onChange={num('otMaxPerYear')} /></label>
            </div>
            <div className={s.dayPick}>
                <span className={s.muted}>Ngày được phép tăng ca:</span>
                {DAYS.map(([d, label]) => (
                    <Checkbox key={d} label={label} checked={form.otWeekdays.includes(d)} onChange={() => toggleDay(d)} />
                ))}
            </div>
        </Modal>
    );
}

// Dòng thời gian theo đội: mỗi đội một hàng, mỗi đoạn làm việc liên tiếp của cùng một công việc là một thanh
export function TeamTimeline({ result }) {
    const DAY = 26;
    const model = useMemo(() => {
        if (!result) return null;
        const start = new Date(result.horizon.start);
        const endPlanned = Math.max(
            ...result.jobs.filter(j => j.plannedEnd).map(j => new Date(j.plannedEnd)),
            start.getTime(),
        );
        const days = Math.min(120, Math.round((endPlanned - start) / 86400000) + 2);
        const dayIso = (i) => new Date(start.getTime() + i * 86400000).toISOString().slice(0, 10);
        const jobsById = new Map(result.jobs.map(j => [j.id, j]));
        const rows = (result.teams || []).map((t, idx) => {
            const segs = result.segments.filter(x => x.teamId === t.id).sort((a, b) => a.date.localeCompare(b.date));
            const bars = [];
            for (const sg of segs) {
                const i = Math.round((new Date(sg.date) - start) / 86400000);
                const last = bars[bars.length - 1];
                if (last && last.jobId === sg.jobId && last.end === i - 1) last.end = i;
                else bars.push({ jobId: sg.jobId, start: i, end: i, ot: sg.otHours > 0 });
                if (sg.otHours > 0) bars[bars.length - 1].ot = true;
            }
            return { team: t, idx, bars };
        });
        return { days, dayIso, rows, jobsById };
    }, [result]);

    if (!model) return <div className={s.empty}>Chưa có bản tính lịch để xem theo đội.</div>;
    if (model.rows.length === 0) return <div className={s.empty}>Chưa đội nào được xếp việc trong bản này.</div>;

    return (
        <div className={s.timeline}>
            <div className={s.tlHead} style={{ gridTemplateColumns: `170px repeat(${model.days}, ${DAY}px)` }}>
                <div>Đội</div>
                {Array.from({ length: model.days }, (_, i) => (
                    <div key={i} className={s.tlDay}>{model.dayIso(i).slice(8, 10)}</div>
                ))}
            </div>
            {model.rows.map(({ team, idx, bars }) => (
                <div key={team.id} className={s.tlRow} style={{ gridTemplateColumns: `170px ${model.days * DAY}px` }}>
                    <div className={s.tlName}>
                        <span className={s.swatch} style={{ background: teamColor(idx) }} />
                        {team.name} <em>{team.memberCount} người</em>
                    </div>
                    <div className={s.tlTrack} style={{ width: model.days * DAY }}>
                        {bars.map((b, k) => {
                            const job = model.jobsById.get(b.jobId);
                            const label = job ? job.name : b.jobId;
                            return (
                                <div key={k} className={`${s.tlBar} ${b.ot ? s.tlOt : ''}`}
                                    style={{ left: b.start * DAY + 2, width: (b.end - b.start + 1) * DAY - 4, background: teamColor(idx) }}
                                    title={`${label}\n${model.dayIso(b.start)} → ${model.dayIso(b.end)}${b.ot ? '\nCó tăng ca' : ''}`}>
                                    {(b.end - b.start + 1) * DAY >= 90 && <span>{label}</span>}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}

// Màu cố định cho từng đội (theo thứ tự), bảng màu lấy từ tông cam–xanh–nâu để khác nhau rõ
const PALETTE = ['#e8590c', '#1c7ed6', '#2f9e44', '#9c36b5', '#c2255c', '#0b7285', '#a61e4d', '#5c7cfa'];
export const teamColor = (idx) => PALETTE[idx % PALETTE.length];
