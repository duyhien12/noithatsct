'use client';
import { useState } from 'react';
import { Plus, Link2, Wrench } from 'lucide-react';
import { Badge, Button, Modal, Field, Input, Textarea, FormGrid, useToast } from '@/components/ui';
import { formatDate } from '@/lib/format';
import { ISSUE_STATUS, WORK_ORDER_DONE_STATUS } from '@/lib/customerIssue/constants';
import LookupSelect from './LookupSelect';
import { issueApi } from './api';
import s from './dh360.module.css';

const CLOSED = [ISSUE_STATUS.DONE, ISSUE_STATUS.CANCELLED];

function CreateWorkOrderModal({ issue, onClose, onSaved }) {
    const toast = useToast();
    const [form, setForm] = useState({ title: issue.title, description: '', assignee: '', dueDate: '' });
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const set = (patch) => setForm(f => ({ ...f, ...patch }));

    const submit = async () => {
        if (!form.title.trim()) { setError('Nhập tiêu đề phiếu'); return; }
        setSaving(true);
        try {
            const wo = await issueApi.workOrder(issue.id, {
                mode: 'create',
                title: form.title.trim(),
                description: form.description.trim(),
                assignee: form.assignee.trim(),
                ...(form.dueDate && { dueDate: new Date(`${form.dueDate}T23:59:00`).toISOString() }),
            });
            toast.success(`Đã tạo phiếu công việc ${wo.code}.`);
            onSaved();
        } catch (e) {
            toast.error(e.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            isOpen
            onClose={onClose}
            title="Tạo phiếu công việc"
            description={`Phiếu thuộc dự án ${issue.project?.name} và liên kết với ${issue.code}`}
            maxWidth={560}
            closeOnOverlayClick={false}
            footer={(
                <>
                    <Button variant="outline" onClick={onClose} disabled={saving}>Huỷ</Button>
                    <Button variant="primary" loading={saving} onClick={submit}>Tạo phiếu</Button>
                </>
            )}
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <Field label="Tiêu đề phiếu" required error={error}>
                    {props => <Input {...props} value={form.title} maxLength={200} onChange={e => { set({ title: e.target.value }); setError(''); }} />}
                </Field>
                <Field label="Mô tả công việc" hint="Để trống: dùng nội dung vấn đề">
                    {props => <Textarea {...props} rows={3} value={form.description} onChange={e => set({ description: e.target.value })} />}
                </Field>
                <FormGrid>
                    <Field label="Người thực hiện" hint="Tên người/đội nhận phiếu">
                        {props => <Input {...props} value={form.assignee} onChange={e => set({ assignee: e.target.value })} />}
                    </Field>
                    <Field label="Hạn hoàn thành" hint="Để trống: theo hạn của vấn đề">
                        {props => <Input {...props} type="date" value={form.dueDate} onChange={e => set({ dueDate: e.target.value })} />}
                    </Field>
                </FormGrid>
                <p className={s.placeholder} style={{ margin: 0 }}>
                    Khi mọi phiếu liên kết hoàn thành, vấn đề tự chuyển sang Chờ xác nhận.
                </p>
            </div>
        </Modal>
    );
}

/** Phiếu công việc liên kết với vấn đề (bảng WorkOrder dùng chung với module Phiếu công việc). */
export default function IssueWorkOrders({ issue, perms, onChanged }) {
    const toast = useToast();
    const [creating, setCreating] = useState(false);
    const [linking, setLinking] = useState(false);
    const canManage = perms.work_order && !CLOSED.includes(issue.status);
    const orders = issue.workOrders || [];
    const open = orders.filter(w => w.status !== WORK_ORDER_DONE_STATUS).length;

    const link = async (opt) => {
        if (!opt) return;
        try {
            await issueApi.workOrder(issue.id, { mode: 'link', workOrderId: opt.id });
            toast.success(`Đã liên kết phiếu ${opt.label.split(' — ')[0]}.`);
            setLinking(false);
            onChanged();
        } catch (e) {
            toast.error(e.message);
        }
    };

    return (
        <section className={s.section} aria-labelledby="dh360-wo">
            <div className={s.sectionHead}>
                <h3 className={s.sectionTitle} id="dh360-wo">
                    Phiếu công việc ({orders.length}{open ? `, ${open} chưa hoàn thành` : ''})
                </h3>
                {canManage && issue.projectId && (
                    <div className="ui-row">
                        <Button variant="outline" size="sm" icon={Link2} onClick={() => setLinking(v => !v)}>Liên kết</Button>
                        <Button variant="outline" size="sm" icon={Plus} onClick={() => setCreating(true)}>Tạo phiếu</Button>
                    </div>
                )}
            </div>

            {canManage && !issue.projectId && (
                <div className={s.notice}>Gắn dự án/công trình cho vấn đề (Chỉnh sửa) để tạo hoặc liên kết phiếu công việc.</div>
            )}

            {linking && (
                <Field label="Chọn phiếu có sẵn trong dự án" hint="Chỉ hiện phiếu chưa liên kết với vấn đề nào">
                    {props => (
                        <LookupSelect {...props} type="workOrders" params={{ projectId: issue.projectId }}
                            value={null} onChange={link} placeholder="Tìm mã hoặc tiêu đề phiếu" />
                    )}
                </Field>
            )}

            {orders.length ? (
                <div className={s.rowList}>
                    {orders.map(w => (
                        <div key={w.id} className={s.rowItem}>
                            <Wrench size={18} aria-hidden="true" style={{ color: 'var(--color-text-secondary)', flexShrink: 0 }} />
                            <div className={s.rowMain}>
                                <span className={s.rowTitle} title={w.title}>{w.code} — {w.title}</span>
                                <span className={s.rowSub}>
                                    {[w.assignee || 'Chưa giao người', w.dueDate && `Hạn ${formatDate(w.dueDate)}`, w.completedAt && `Xong ${formatDate(w.completedAt)}`].filter(Boolean).join(' · ')}
                                </span>
                            </div>
                            <Badge status={w.status} size="sm" />
                        </div>
                    ))}
                </div>
            ) : <span className={s.placeholder}>Chưa có phiếu công việc</span>}

            {creating && (
                <CreateWorkOrderModal issue={issue} onClose={() => setCreating(false)}
                    onSaved={() => { setCreating(false); onChanged(); }} />
            )}
        </section>
    );
}
