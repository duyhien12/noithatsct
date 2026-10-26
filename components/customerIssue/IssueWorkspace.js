'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Plus, KanbanSquare, List, MessagesSquare } from 'lucide-react';
import {
    PageContainer, PageHeader, Card, Button, Select, EmptyState, NoResultsState, ErrorState, ForbiddenState,
    SkeletonCard, useToast,
} from '@/components/ui';
import { formatNumber } from '@/lib/format';
import { ISSUE_STATUS, ISSUE_STATUS_LABELS, TRANSITION_ACTION_LABELS } from '@/lib/customerIssue/constants';
import { isIssueParticipant, PARTICIPANT_KEYS } from '@/lib/customerIssue/permissions';
import { boardColumnOf } from '@/lib/customerIssue/workflow';
import IssueKpis from './IssueKpis';
import IssueFilters, { EMPTY_FILTERS, filtersToParams, countActiveFilters } from './IssueFilters';
import IssueKanban from './IssueKanban';
import IssueList from './IssueList';
import IssueDetailPanel from './IssueDetailPanel';
import IssueFormModal from './IssueFormModal';
import TransitionDialog, { needsDialog } from './TransitionDialog';
import { issueApi } from './api';
import s from './dh360.module.css';

const VIEWS = { KANBAN: 'kanban', LIST: 'list' };
const PAGE_SIZE = 20;
const SORTS = [
    { value: 'lastActivity', label: 'Cập nhật gần nhất' },
    { value: 'dueDate', label: 'Hạn xử lý gần nhất' },
    { value: 'newest', label: 'Mới ghi nhận' },
    { value: 'code', label: 'Mã vấn đề' },
];

// Ghi nhớ chế độ xem theo từng tài khoản (hệ thống chưa có bảng tuỳ chọn người dùng)
const viewKey = (userId) => `dh360:view:${userId || 'anon'}`;
function readView(userId) {
    try { return localStorage.getItem(viewKey(userId)) === VIEWS.LIST ? VIEWS.LIST : VIEWS.KANBAN; } catch { return VIEWS.KANBAN; }
}
function saveView(userId, view) {
    try { localStorage.setItem(viewKey(userId), view); } catch { /* trình duyệt chặn lưu trữ */ }
}

function readIssueParam() {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('issue');
}
function writeIssueParam(id) {
    const url = new URL(window.location.href);
    if (id) url.searchParams.set('issue', id); else url.searchParams.delete('issue');
    window.history.replaceState(window.history.state, '', url);
}

/**
 * Không gian làm việc Đồng hành 360 — một nguồn dữ liệu (API /api/customer-issues)
 * cho trang chính, tab Khách hàng và tab Dự án.
 *
 * variant: 'page' (trang /dong-hanh-360, có PageHeader + đồng bộ ?issue= trên URL)
 *        | 'embedded' (tab trong trang chi tiết)
 * scope:   { customerId?, customer?: {id,label}, projectId?, project?: {id,label} }
 */
export default function IssueWorkspace({ variant = 'page', scope = {} }) {
    const toast = useToast();
    const { data: session, status: sessionStatus } = useSession();
    const me = useMemo(() => ({
        id: session?.user?.id || '',
        name: session?.user?.name || '',
        role: session?.user?.role || '',
        department: session?.user?.department || '',
    }), [session?.user?.id, session?.user?.name, session?.user?.role, session?.user?.department]);
    const isPage = variant === 'page';
    const scopeKey = `${scope.customerId || ''}|${scope.projectId || ''}`;

    const [view, setView] = useState(null);
    const [filters, setFilters] = useState(EMPTY_FILTERS);
    const [sort, setSort] = useState('lastActivity');
    const [page, setPage] = useState(1);
    const [data, setData] = useState(null); // { columns } | { rows, pagination }
    const [rolePerms, setRolePerms] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [stats, setStats] = useState(null);
    const [statsLoading, setStatsLoading] = useState(true);
    const [users, setUsers] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [panelKey, setPanelKey] = useState(0);
    const [form, setForm] = useState({ open: false, issue: null });
    const [transition, setTransition] = useState(null);
    const requestSeq = useRef(0);

    useEffect(() => {
        if (sessionStatus !== 'authenticated') return;
        setView(readView(me.id));
        if (isPage) setSelectedId(readIssueParam());
    }, [sessionStatus, me.id, isPage]);

    // eslint-disable-next-line react-hooks/exhaustive-deps -- scope so sánh theo scopeKey
    const params = useMemo(() => filtersToParams(filters, scope), [filters, scopeKey]);
    const paramsKey = JSON.stringify(params);

    const loadData = useCallback(async () => {
        if (!view) return;
        const seq = ++requestSeq.current; // bỏ kết quả của lần tải cũ hơn (đổi bộ lọc liên tục)
        setLoading(true);
        try {
            const res = view === VIEWS.KANBAN
                ? await issueApi.kanban({ ...params, sort })
                : await issueApi.list({ ...params, sort, page, limit: PAGE_SIZE });
            if (seq !== requestSeq.current) return;
            setData(view === VIEWS.KANBAN ? { columns: res.columns } : { rows: res.data, pagination: res.pagination });
            setRolePerms(res.permissions);
            setError(null);
        } catch (e) {
            if (seq === requestSeq.current) setError(e);
        } finally {
            if (seq === requestSeq.current) setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- params theo paramsKey
    }, [view, paramsKey, sort, page]);

    const loadStats = useCallback(async () => {
        setStatsLoading(true);
        try { setStats(await issueApi.stats(params)); } catch { setStats(null); } finally { setStatsLoading(false); }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- params theo paramsKey
    }, [paramsKey]);

    useEffect(() => { loadData(); }, [loadData]);
    useEffect(() => { if (view) loadStats(); }, [loadStats, view]);
    useEffect(() => { setPage(1); }, [paramsKey, sort, view]);

    useEffect(() => {
        if (!rolePerms?.view) return;
        issueApi.lookup('users').then(r => setUsers(r.data || [])).catch(() => {});
    }, [rolePerms?.view]);

    const refreshAll = useCallback(() => {
        loadData();
        loadStats();
        setPanelKey(k => k + 1);
    }, [loadData, loadStats]);

    const permsFor = useCallback((issue) => {
        const p = { ...(rolePerms || {}) };
        if (isIssueParticipant(me, issue)) PARTICIPANT_KEYS.forEach(k => { p[k] = true; });
        return p;
    }, [rolePerms, me]);

    const changeView = (v) => {
        if (v === view) return;
        setData(null);
        setView(v);
        saveView(me.id, v);
    };

    const openIssue = (issue) => {
        setSelectedId(issue.id);
        if (isPage) writeIssueParam(issue.id);
    };
    const closeIssue = () => {
        setSelectedId(null);
        if (isPage) writeIssueParam(null);
    };

    // Kanban: đưa thẻ sang cột mới ngay khi thả; trả về dữ liệu cũ để hoàn tác nếu API từ chối
    const moveCardLocally = (issue, to) => {
        if (!data?.columns) return null;
        const snapshot = data;
        const moved = { ...issue, status: to };
        const target = boardColumnOf(moved);
        setData({
            ...data,
            columns: data.columns.map(c => {
                const rest = c.items.filter(i => i.id !== issue.id);
                const had = rest.length !== c.items.length;
                if (c.key === target) return { ...c, items: [moved, ...rest], total: c.total + (had ? 0 : 1) };
                return had ? { ...c, items: rest, total: c.total - 1 } : c;
            }),
        });
        return snapshot;
    };

    const move = async (issue, to) => {
        if (needsDialog(issue.status, to)) {
            setTransition({ issue, to });
            return;
        }
        const snapshot = moveCardLocally(issue, to);
        try {
            await issueApi.transition(issue.id, { toStatus: to });
            toast.success(`${issue.code}: ${TRANSITION_ACTION_LABELS[`${issue.status}>${to}`] || ISSUE_STATUS_LABELS[to]}.`);
        } catch (e) {
            if (snapshot) setData(snapshot);
            toast.error(e.message, 'Không chuyển được trạng thái');
        }
        refreshAll();
    };

    const openEdit = async (issue) => {
        // Form sửa cần chi tiết (số phiếu công việc, người phản ánh…) — thẻ danh sách không đủ
        try {
            const detail = issue.workOrders ? issue : await issueApi.get(issue.id);
            setForm({ open: true, issue: detail });
        } catch (e) {
            toast.error(e.message);
        }
    };

    const formScope = { customer: scope.customer, project: scope.project };
    const activeFilters = countActiveFilters(filters, scope);
    const canCreate = !!rolePerms?.create;
    const total = view === VIEWS.LIST
        ? data?.pagination?.total
        : data?.columns?.reduce((sum, c) => sum + c.total, 0);
    const createButton = canCreate && (
        <Button variant="primary" icon={Plus} onClick={() => setForm({ open: true, issue: null })}>Ghi nhận vấn đề</Button>
    );

    const emptyState = activeFilters
        ? <NoResultsState keyword={filters.search.trim()} onClear={() => setFilters(EMPTY_FILTERS)} />
        : (
            <EmptyState
                icon={MessagesSquare}
                title="Chưa có vấn đề nào"
                description={scope.customerId || scope.projectId
                    ? 'Khách hàng chưa có phản ánh nào được ghi nhận.'
                    : 'Ghi nhận phản ánh đầu tiên của khách hàng để bắt đầu theo dõi xử lý.'}
                action={createButton}
            />
        );

    let content;
    if (error) {
        content = <Card><ErrorState description={error.message} onRetry={loadData} /></Card>;
    } else if (!data || !view) {
        content = view === VIEWS.LIST
            ? <Card flush><IssueList rows={[]} loading permsFor={permsFor} onOpen={openIssue} onEdit={openEdit} onMove={move} /></Card>
            : <div className={s.board}>{[0, 1, 2, 3].map(i => <SkeletonCard key={i} lines={4} />)}</div>;
    } else if (rolePerms && !rolePerms.view && !total) {
        content = <Card><ForbiddenState title="Bạn không có quyền xem Đồng hành 360" /></Card>;
    } else if (view === VIEWS.KANBAN) {
        content = (
            <>
                {filters.status === ISSUE_STATUS.CANCELLED && (
                    <div className={s.notice}>Vấn đề đã huỷ không hiện trên Kanban — chuyển sang chế độ Danh sách để xem.</div>
                )}
                {total === 0 && !loading ? <Card>{emptyState}</Card> : (
                    <IssueKanban
                        columns={data.columns}
                        permsFor={permsFor}
                        selectedId={selectedId}
                        onOpen={openIssue}
                        onMove={move}
                        onReject={reason => toast.error(reason, 'Không chuyển được trạng thái')}
                    />
                )}
            </>
        );
    } else {
        content = (
            <Card flush>
                <IssueList
                    rows={data.rows}
                    loading={loading && !data.rows?.length}
                    pagination={data.pagination}
                    onPageChange={setPage}
                    permsFor={permsFor}
                    onOpen={openIssue}
                    onEdit={openEdit}
                    onMove={move}
                    hideCustomer={!!scope.customerId || !!scope.projectId}
                    hideProject={!!scope.projectId}
                    empty={emptyState}
                />
            </Card>
        );
    }

    const toolbar = (
        <div className={s.toolbar} style={{ marginTop: 'var(--space-3)' }}>
            <div className={s.viewSwitch} role="group" aria-label="Chế độ xem">
                <button type="button" aria-pressed={view === VIEWS.KANBAN} onClick={() => changeView(VIEWS.KANBAN)}>
                    <KanbanSquare size={16} aria-hidden="true" />Kanban
                </button>
                <button type="button" aria-pressed={view === VIEWS.LIST} onClick={() => changeView(VIEWS.LIST)}>
                    <List size={16} aria-hidden="true" />Danh sách
                </button>
            </div>
            <Select value={sort} onChange={e => setSort(e.target.value)} aria-label="Sắp xếp" style={{ width: 'auto' }}>
                {SORTS.map(o => <option key={o.value} value={o.value}>Sắp xếp: {o.label}</option>)}
            </Select>
            <span className="ui-caption">
                {total != null && `${formatNumber(total)} vấn đề`}
            </span>
            <span className={s.toolbarSpacer} />
            {!isPage && createButton}
        </div>
    );

    const body = (
        <>
            <IssueKpis stats={stats} loading={statsLoading} onPick={patch => setFilters(f => ({ ...f, ...patch }))} />
            <Card>
                <IssueFilters value={filters} onChange={setFilters} users={users} scope={scope} onReset={() => setFilters(EMPTY_FILTERS)} />
                {toolbar}
            </Card>
            {content}
        </>
    );

    return (
        <>
            {isPage ? (
                <PageContainer>
                    <PageHeader
                        title="Đồng hành 360"
                        description="Ghi nhận và theo dõi xử lý phản ánh của khách hàng đến khi khách xác nhận hoàn thành"
                        breadcrumbs={[{ label: 'Trang chủ', href: '/' }, { label: 'Dự án & Thi công' }, { label: 'Đồng hành 360' }]}
                        actions={createButton}
                    />
                    {body}
                </PageContainer>
            ) : (
                <div className="ui-stack">{body}</div>
            )}

            {selectedId && (
                <IssueDetailPanel
                    issueId={selectedId}
                    me={me}
                    rolePerms={rolePerms}
                    refreshKey={panelKey}
                    onClose={closeIssue}
                    onChanged={() => { loadData(); loadStats(); }}
                    onEdit={openEdit}
                    onMove={move}
                />
            )}

            <IssueFormModal
                isOpen={form.open}
                issue={form.issue}
                scope={formScope}
                permissions={rolePerms || {}}
                onClose={() => setForm({ open: false, issue: null })}
                onSaved={(saved) => {
                    setForm({ open: false, issue: null });
                    refreshAll();
                    if (saved?.id && !form.issue) openIssue(saved);
                }}
            />

            {transition && (
                <TransitionDialog
                    issue={transition.issue}
                    toStatus={transition.to}
                    onClose={() => setTransition(null)}
                    onDone={() => { setTransition(null); refreshAll(); }}
                />
            )}
        </>
    );
}
