'use client';
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import {
    Modal, Button, IconButton, Field, Input, Select, Textarea, FormSection, FormGrid, useToast,
} from '@/components/ui';
import {
    ISSUE_CATEGORIES, ISSUE_CATEGORY_LABELS, ISSUE_PRIORITIES, ISSUE_PRIORITY_LABELS, PRIORITY_DUE_DAYS,
    ISSUE_SOURCES, ISSUE_SOURCE_LABELS,
} from '@/lib/customerIssue/constants';
import LookupSelect from './LookupSelect';
import { Avatar } from './IssueBadges';
import { issueApi } from './api';
import s from './dh360.module.css';

const pad = (n) => String(n).padStart(2, '0');
const toDateInput = (d) => {
    if (!d) return '';
    const x = new Date(d);
    return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
};
const toDateTimeInput = (d) => {
    const x = d ? new Date(d) : new Date();
    return `${toDateInput(x)}T${pad(x.getHours())}:${pad(x.getMinutes())}`;
};
// Hạn xử lý chọn theo ngày -> cuối ngày đó (giờ máy người dùng)
const dueToIso = (v) => (v ? new Date(`${v}T23:59:00`).toISOString() : null);
const localToIso = (v) => (v ? new Date(v).toISOString() : undefined);

const opt = (o) => (o ? { id: o.id, label: o.name, sub: o.code } : null);

function initialForm(issue, scope) {
    return {
        customer: opt(issue?.customer) || scope.customer || null,
        project: opt(issue?.project) || scope.project || null,
        title: issue?.title || '',
        area: issue?.area || '',
        category: issue?.category || '',
        description: issue?.description || '',
        priority: issue?.priority || 'MEDIUM',
        dueDate: toDateInput(issue?.dueDate),
        source: issue?.source || '',
        reporterName: issue?.reporterName || '',
        reporterPhone: issue?.reporterPhone || '',
        reportedAt: toDateTimeInput(issue?.reportedAt),
        assignee: null,
        collaborators: [],
    };
}

/**
 * Form ghi nhận / chỉnh sửa vấn đề.
 * - Tạo mới: POST /api/customer-issues (có thể kèm phân công + phối hợp nếu có quyền).
 * - Sửa: PATCH /api/customer-issues/[id] (khách hàng cố định; trạng thái/phân công làm ở panel).
 * scope: { customer?, project? } — khoá sẵn khi mở từ tab Khách hàng / Dự án.
 */
export default function IssueFormModal({ isOpen, issue, scope = {}, permissions = {}, onClose, onSaved }) {
    const toast = useToast();
    const editing = !!issue;
    const [form, setForm] = useState(() => initialForm(issue, scope));
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen) { setForm(initialForm(issue, scope)); setErrors({}); }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ khởi tạo lại khi mở form
    }, [isOpen, issue?.id]);

    const set = (patch) => {
        setForm(f => ({ ...f, ...patch }));
        // Sửa ô nào thì bỏ lỗi của ô đó; chọn dự án cũng tự điền khách hàng
        const keys = Object.keys(patch).map(k => (k === 'project' ? 'projectId' : k));
        if (patch.project || patch.customer) keys.push('customer');
        setErrors(e => (keys.some(k => e[k]) ? Object.fromEntries(Object.entries(e).filter(([k]) => !keys.includes(k))) : e));
    };
    const projectLocked = !!scope.project || (editing && (issue.workOrders?.length || 0) > 0);

    const validate = () => {
        const e = {};
        if (!form.customer && !form.project) e.customer = 'Chọn khách hàng hoặc dự án';
        if (!form.title.trim()) e.title = 'Nhập tiêu đề vấn đề';
        if (!form.category) e.category = 'Chọn nhóm vấn đề';
        if (!form.description.trim()) e.description = 'Nhập nội dung vấn đề';
        setErrors(e);
        return !Object.keys(e).length;
    };

    const submit = async (ev) => {
        ev?.preventDefault();
        if (!validate()) {
            toast.error('Vui lòng kiểm tra các trường bắt buộc.');
            return;
        }
        const common = {
            projectId: form.project?.id || null,
            title: form.title.trim(),
            area: form.area.trim(),
            category: form.category,
            description: form.description.trim(),
            priority: form.priority,
            source: form.source,
            reporterName: form.reporterName.trim(),
            reporterPhone: form.reporterPhone.trim(),
            reportedAt: localToIso(form.reportedAt),
            dueDate: dueToIso(form.dueDate),
        };
        setSaving(true);
        try {
            let saved;
            if (editing) {
                saved = await issueApi.update(issue.id, common);
                toast.success(`Đã lưu thay đổi cho ${issue.code}.`);
            } else {
                const body = {
                    ...common,
                    customerId: form.customer?.id,
                    ...(form.assignee && { assigneeId: form.assignee.id }),
                    ...(form.collaborators.length && { collaboratorIds: form.collaborators.map(c => c.id) }),
                };
                if (!body.projectId) delete body.projectId;
                saved = await issueApi.create(body);
                toast.success(`Đã ghi nhận vấn đề ${saved.code}.`);
            }
            onSaved?.(saved);
        } catch (e) {
            const map = {};
            (e.details || []).forEach(d => { if (d.path) map[d.path === 'customerId' ? 'customer' : d.path] = d.message; });
            setErrors(map);
            toast.error(e.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={editing ? `Chỉnh sửa ${issue.code}` : 'Ghi nhận vấn đề mới'}
            description={editing ? issue.title : 'Ghi nhận phản ánh của khách hàng để theo dõi xử lý đến khi khách xác nhận'}
            maxWidth={760}
            closeOnOverlayClick={false}
            footer={(
                <>
                    <Button variant="outline" onClick={onClose} disabled={saving}>Huỷ</Button>
                    <Button variant="primary" loading={saving} onClick={submit}>
                        {editing ? 'Lưu thay đổi' : 'Ghi nhận vấn đề'}
                    </Button>
                </>
            )}
        >
            <form onSubmit={submit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
                <FormSection title="Khách hàng & công trình">
                    <FormGrid>
                        <Field label="Khách hàng" required error={errors.customer}
                            hint={editing ? 'Không đổi được khách hàng của vấn đề đã ghi nhận'
                                : scope.customer ? 'Theo khách hàng đang xem'
                                    : 'Chọn dự án trước thì khách hàng được lấy tự động'}>
                            {props => (
                                <LookupSelect
                                    {...props}
                                    type="customers"
                                    value={form.customer}
                                    locked={editing || !!scope.customer}
                                    invalid={!!errors.customer}
                                    placeholder="Tìm tên, mã hoặc SĐT khách hàng"
                                    onChange={customer => set({
                                        customer,
                                        project: customer && form.project?.customerId && form.project.customerId !== customer.id ? null : form.project,
                                    })}
                                />
                            )}
                        </Field>
                        <Field label="Dự án / công trình" error={errors.projectId}
                            hint={projectLocked && editing && !scope.project ? 'Đã có phiếu công việc — không đổi được dự án' : 'Không bắt buộc; cần có để tạo phiếu công việc'}>
                            {props => (
                                <LookupSelect
                                    {...props}
                                    type="projects"
                                    params={{ customerId: form.customer?.id }}
                                    value={form.project}
                                    locked={projectLocked}
                                    placeholder="Tìm tên hoặc mã dự án"
                                    onChange={(project, raw) => set({
                                        project: project && { ...project, customerId: raw?.customerId },
                                        ...(raw?.customer && !form.customer && { customer: opt(raw.customer) }),
                                    })}
                                />
                            )}
                        </Field>
                    </FormGrid>
                </FormSection>

                <FormSection title="Nội dung vấn đề">
                    <Field label="Tiêu đề" required error={errors.title}>
                        {props => <Input {...props} value={form.title} maxLength={200} onChange={e => set({ title: e.target.value })} placeholder="VD: Cánh tủ bếp bị lệch" />}
                    </Field>
                    <FormGrid>
                        <Field label="Khu vực / hạng mục" error={errors.area}>
                            {props => <Input {...props} value={form.area} onChange={e => set({ area: e.target.value })} placeholder="VD: Phòng ngủ 2 / Tủ áo" />}
                        </Field>
                        <Field label="Nhóm vấn đề" required error={errors.category}>
                            {props => (
                                <Select {...props} value={form.category} invalid={!!errors.category} onChange={e => set({ category: e.target.value })}>
                                    <option value="">— Chọn nhóm vấn đề —</option>
                                    {ISSUE_CATEGORIES.map(c => <option key={c} value={c}>{ISSUE_CATEGORY_LABELS[c]}</option>)}
                                </Select>
                            )}
                        </Field>
                    </FormGrid>
                    <Field label="Nội dung vấn đề" required error={errors.description}>
                        {props => (
                            <Textarea {...props} rows={4} value={form.description} invalid={!!errors.description}
                                onChange={e => set({ description: e.target.value })}
                                placeholder="Mô tả cụ thể hiện trạng, khách hàng phản ánh điều gì" />
                        )}
                    </Field>
                    <FormGrid>
                        <Field label="Mức độ ưu tiên">
                            {props => (
                                <Select {...props} value={form.priority} onChange={e => set({ priority: e.target.value })}>
                                    {ISSUE_PRIORITIES.map(p => <option key={p} value={p}>{ISSUE_PRIORITY_LABELS[p]} — hạn mặc định {PRIORITY_DUE_DAYS[p]} ngày</option>)}
                                </Select>
                            )}
                        </Field>
                        <Field label="Hạn xử lý" error={errors.dueDate}
                            hint={editing ? 'Để trống nếu chưa có hạn' : `Để trống: tự tính ${PRIORITY_DUE_DAYS[form.priority]} ngày theo mức ưu tiên`}>
                            {props => <Input {...props} type="date" value={form.dueDate} onChange={e => set({ dueDate: e.target.value })} />}
                        </Field>
                    </FormGrid>
                </FormSection>

                <FormSection title="Tiếp nhận">
                    <FormGrid>
                        <Field label="Kênh tiếp nhận">
                            {props => (
                                <Select {...props} value={form.source} onChange={e => set({ source: e.target.value })}>
                                    <option value="">— Không rõ —</option>
                                    {ISSUE_SOURCES.map(x => <option key={x} value={x}>{ISSUE_SOURCE_LABELS[x]}</option>)}
                                </Select>
                            )}
                        </Field>
                        <Field label="Thời điểm ghi nhận" error={errors.reportedAt}>
                            {props => <Input {...props} type="datetime-local" value={form.reportedAt} onChange={e => set({ reportedAt: e.target.value })} />}
                        </Field>
                        <Field label="Người phản ánh">
                            {props => <Input {...props} value={form.reporterName} onChange={e => set({ reporterName: e.target.value })} placeholder="Tên người báo" />}
                        </Field>
                        <Field label="SĐT người phản ánh">
                            {props => <Input {...props} type="tel" inputMode="tel" value={form.reporterPhone} onChange={e => set({ reporterPhone: e.target.value })} />}
                        </Field>
                    </FormGrid>
                </FormSection>

                {!editing && (permissions.assign || permissions.collaborators) && (
                    <FormSection title="Phân công" description="Có thể để trống và phân công sau trong panel chi tiết">
                        <FormGrid>
                            {permissions.assign && (
                                <Field label="Người phụ trách">
                                    {props => (
                                        <LookupSelect {...props} type="users" value={form.assignee}
                                            exclude={form.collaborators.map(c => c.id)}
                                            onChange={assignee => set({ assignee })} placeholder="Tìm tên nhân viên" />
                                    )}
                                </Field>
                            )}
                            {permissions.collaborators && (
                                <Field label="Người phối hợp">
                                    {props => (
                                        <LookupSelect {...props} type="users" value={null}
                                            exclude={[form.assignee?.id, ...form.collaborators.map(c => c.id)].filter(Boolean)}
                                            onChange={u => u && set({ collaborators: [...form.collaborators, u] })}
                                            placeholder="Thêm người phối hợp" />
                                    )}
                                </Field>
                            )}
                        </FormGrid>
                        {form.collaborators.length > 0 && (
                            <div className={s.chips}>
                                {form.collaborators.map(c => (
                                    <span key={c.id} className={s.chip}>
                                        <Avatar name={c.label} />
                                        <span>{c.label}</span>
                                        <IconButton icon={X} size="sm" label={`Bỏ ${c.label}`}
                                            onClick={() => set({ collaborators: form.collaborators.filter(x => x.id !== c.id) })} />
                                    </span>
                                ))}
                            </div>
                        )}
                    </FormSection>
                )}
            </form>
        </Modal>
    );
}
