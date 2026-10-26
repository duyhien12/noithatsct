'use client';
import { Select, SearchBar, Button } from '@/components/ui';
import {
    ISSUE_STATUSES, ISSUE_STATUS_LABELS, ISSUE_PRIORITIES, ISSUE_PRIORITY_LABELS,
    ISSUE_CATEGORIES, ISSUE_CATEGORY_LABELS, OPEN_STATUSES,
} from '@/lib/customerIssue/constants';
import LookupSelect from './LookupSelect';
import s from './dh360.module.css';

export const EMPTY_FILTERS = {
    search: '', customer: null, project: null, status: '', priority: '', category: '', assignee: '', due: '',
};

const DUE_OPTIONS = [
    { value: 'overdue', label: 'Quá hạn' },
    { value: 'today', label: 'Đến hạn hôm nay' },
    { value: 'week', label: 'Đến hạn trong 7 ngày' },
];

/** Bộ lọc của giao diện -> tham số của GET /api/customer-issues. */
export function filtersToParams(f, scope = {}) {
    return {
        search: f.search.trim(),
        customerId: scope.customerId || f.customer?.id,
        projectId: scope.projectId || f.project?.id,
        status: f.status === 'OPEN' ? OPEN_STATUSES : f.status ? [f.status] : [],
        priority: f.priority ? [f.priority] : [],
        category: f.category ? [f.category] : [],
        assigneeId: f.assignee,
        due: f.due,
    };
}

export function countActiveFilters(f, scope = {}) {
    return [
        f.search.trim(),
        !scope.customerId && !scope.projectId && f.customer,
        !scope.projectId && f.project,
        f.status, f.priority, f.category, f.assignee, f.due,
    ].filter(Boolean).length;
}

/**
 * Bộ lọc: tìm kiếm, khách hàng, dự án/công trình, trạng thái, ưu tiên, nhóm vấn đề,
 * người phụ trách, thời hạn. `scope` ẩn bộ lọc đã cố định (tab Khách hàng / Dự án).
 */
export default function IssueFilters({ value, onChange, users = [], scope = {}, onReset }) {
    const set = (patch) => onChange({ ...value, ...patch });
    const active = countActiveFilters(value, scope);

    return (
        <div>
            <SearchBar
                value={value.search}
                onChange={search => set({ search })}
                placeholder="Tìm mã, tiêu đề, nội dung, khách hàng, SĐT…"
                width="100%"
            />
            <div className={s.filterGrid}>
                {!scope.customerId && !scope.projectId && (
                    <LookupSelect
                        type="customers"
                        value={value.customer}
                        onChange={customer => set({ customer, project: customer && value.project?.customerId !== customer.id ? null : value.project })}
                        placeholder="Khách hàng"
                        aria-label="Lọc theo khách hàng"
                    />
                )}
                {!scope.projectId && (
                    <LookupSelect
                        type="projects"
                        params={{ customerId: scope.customerId || value.customer?.id }}
                        value={value.project}
                        onChange={(project, raw) => set({ project: project && { ...project, customerId: raw?.customerId } })}
                        placeholder="Dự án / công trình"
                        aria-label="Lọc theo dự án / công trình"
                    />
                )}
                <Select value={value.status} onChange={e => set({ status: e.target.value })} aria-label="Lọc theo trạng thái">
                    <option value="">Tất cả trạng thái</option>
                    <option value="OPEN">Đang mở (chưa hoàn thành)</option>
                    {ISSUE_STATUSES.map(st => <option key={st} value={st}>{ISSUE_STATUS_LABELS[st]}</option>)}
                </Select>
                <Select value={value.priority} onChange={e => set({ priority: e.target.value })} aria-label="Lọc theo mức ưu tiên">
                    <option value="">Mọi mức ưu tiên</option>
                    {ISSUE_PRIORITIES.map(p => <option key={p} value={p}>{ISSUE_PRIORITY_LABELS[p]}</option>)}
                </Select>
                <Select value={value.category} onChange={e => set({ category: e.target.value })} aria-label="Lọc theo nhóm vấn đề">
                    <option value="">Mọi nhóm vấn đề</option>
                    {ISSUE_CATEGORIES.map(c => <option key={c} value={c}>{ISSUE_CATEGORY_LABELS[c]}</option>)}
                </Select>
                <Select value={value.assignee} onChange={e => set({ assignee: e.target.value })} aria-label="Lọc theo người phụ trách">
                    <option value="">Mọi người phụ trách</option>
                    <option value="me">Tôi phụ trách</option>
                    <option value="none">Chưa phân công</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </Select>
                <Select value={value.due} onChange={e => set({ due: e.target.value })} aria-label="Lọc theo thời hạn">
                    <option value="">Mọi thời hạn</option>
                    {DUE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </Select>
            </div>
            {active > 0 && (
                <div className={s.activeFilters}>
                    <span>Đang áp dụng {active} bộ lọc</span>
                    <Button variant="ghost" size="sm" onClick={onReset}>Xoá bộ lọc</Button>
                </div>
            )}
        </div>
    );
}
