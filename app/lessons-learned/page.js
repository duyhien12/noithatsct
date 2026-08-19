'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/fetchClient';
import { useToast } from '@/components/ui/Toast';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Pagination from '@/components/ui/Pagination';
import StatusBadge from '@/components/ui/StatusBadge';
import KPICard from '@/components/ui/KPICard';
import { useRole } from '@/contexts/RoleContext';
import { useSession } from 'next-auth/react';
import {
    BookOpen, Clock, CheckCircle2, ShieldCheck, Plus, ArrowUpDown, Download, GraduationCap,
} from 'lucide-react';
import {
    CATEGORIES, SEVERITIES, STATUSES, STATUS_COLORS, SEVERITY_COLORS, getLessonPermissions, canEditLesson,
} from '@/lib/lessonLearned';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
const truncate = (s, n = 60) => !s ? '—' : (s.length > n ? s.slice(0, n) + '…' : s);

export default function LessonsLearnedPage() {
    const router = useRouter();
    const toast = useToast();
    const { role, department } = useRole();
    const { data: session } = useSession();
    const perms = useMemo(() => getLessonPermissions({ role, department }), [role, department]);

    const [lessons, setLessons] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState(null);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('');
    const [severity, setSeverity] = useState('');
    const [status, setStatus] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [sortBy, setSortBy] = useState('occurredAt');
    const [sortDir, setSortDir] = useState('desc');
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [exporting, setExporting] = useState(false);

    const buildParams = useCallback((extra = {}) => {
        const params = new URLSearchParams({ sortBy, sortDir, ...extra });
        if (search.trim()) params.set('search', search.trim());
        if (category) params.set('category', category);
        if (severity) params.set('severity', severity);
        if (status) params.set('status', status);
        if (fromDate) params.set('fromDate', fromDate);
        if (toDate) params.set('toDate', toDate);
        return params;
    }, [search, category, severity, status, fromDate, toDate, sortBy, sortDir]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params = buildParams({ page, limit: 20 });
            const d = await apiFetch(`/api/lessons-learned?${params}`);
            setLessons(d.data || []);
            setPagination(d.pagination || null);
        } catch (e) {
            toast.error(e.message);
        }
        setLoading(false);
    }, [page, buildParams, toast]);

    const fetchStats = useCallback(async () => {
        try {
            const s = await apiFetch('/api/lessons-learned/stats');
            setStats(s);
        } catch { /* ignore */ }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);
    useEffect(() => { fetchStats(); }, [fetchStats]);
    useEffect(() => { setPage(1); }, [search, category, severity, status, fromDate, toDate]);

    const toggleSort = (field) => {
        if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortBy(field); setSortDir('desc'); }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await apiFetch(`/api/lessons-learned/${deleteTarget.id}`, { method: 'DELETE' });
            toast.success(`Đã xóa bài học ${deleteTarget.code}`);
            fetchData();
            fetchStats();
        } catch (e) {
            toast.error(e.message);
        }
        setDeleteTarget(null);
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            const XLSX = await import('xlsx');
            const params = buildParams({ page: 1, limit: 10000 });
            const d = await apiFetch(`/api/lessons-learned?${params}`);
            const rows = (d.data || []).map((l, i) => ({
                'STT': i + 1,
                'Mã': l.code,
                'Ngày': fmtDate(l.occurredAt),
                'Dự án': l.projectName || l.project?.name || '',
                'Khách hàng': l.customerName || l.customer?.name || '',
                'Hạng mục': l.category,
                'Mức độ': l.severity,
                'Nội dung sự việc': l.issueContent,
                'Nguyên nhân': l.cause,
                'Giải pháp': l.solution,
                'Biện pháp phòng ngừa': l.prevention,
                'Trạng thái': l.status,
                'Người phụ trách': l.assignee,
                'Người nhập': l.createdBy,
            }));
            const ws = XLSX.utils.json_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Bài học dự án');
            XLSX.writeFile(wb, `bai-hoc-du-an-${new Date().toISOString().slice(0, 10)}.xlsx`);
        } catch (e) {
            toast.error(e.message || 'Xuất Excel thất bại');
        }
        setExporting(false);
    };

    const SortTh = ({ field, children }) => (
        <th onClick={() => toggleSort(field)} style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                {children}
                <ArrowUpDown size={12} style={{ opacity: sortBy === field ? 1 : 0.35 }} />
            </span>
        </th>
    );

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <GraduationCap size={24} /> Bài học dự án
                </h2>
                {perms.canCreate && (
                    <button className="btn btn-primary" onClick={() => router.push('/lessons-learned/new')}>
                        <Plus size={16} /> Thêm bài học
                    </button>
                )}
            </div>

            {stats && (
                <>
                    <div className="stats-grid">
                        <KPICard icon={BookOpen} value={stats.total} label="Tổng số bài học" color="#1C3A6B" />
                        <KPICard icon={Clock} value={stats.byStatus['Đang xử lý'] || 0} label="Đang xử lý" color="#EA580C" />
                        <KPICard icon={CheckCircle2} value={stats.byStatus['Đã xử lý'] || 0} label="Đã xử lý" color="#2563EB" />
                        <KPICard icon={ShieldCheck} value={stats.byStatus['Đã cập nhật quy trình'] || 0} label="Đã cập nhật quy trình" color="#059669" />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 20 }}>
                        <div className="card">
                            <div className="card-header"><h3 className="card-title">Top 5 hạng mục xảy ra nhiều lỗi nhất</h3></div>
                            {stats.topCategories.length === 0 ? (
                                <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Chưa có dữ liệu</div>
                            ) : (
                                <div style={{ display: 'grid', gap: 10 }}>
                                    {stats.topCategories.map((c, i) => {
                                        const max = stats.topCategories[0].count || 1;
                                        return (
                                            <div key={c.category}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}>
                                                    <span>{i + 1}. {c.category}</span>
                                                    <strong>{c.count}</strong>
                                                </div>
                                                <div style={{ height: 6, borderRadius: 4, background: 'var(--bg-hover)', overflow: 'hidden' }}>
                                                    <div style={{ height: '100%', width: `${(c.count / max) * 100}%`, background: '#1C3A6B', borderRadius: 4 }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="card">
                            <div className="card-header"><h3 className="card-title">Top 10 nguyên nhân phổ biến</h3></div>
                            {stats.topCauses.length === 0 ? (
                                <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Chưa có dữ liệu</div>
                            ) : (
                                <ol style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 6, fontSize: 12.5 }}>
                                    {stats.topCauses.map((c, i) => (
                                        <li key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                                            <span>{truncate(c.cause, 60)}</span>
                                            <strong style={{ flexShrink: 0 }}>{c.count}</strong>
                                        </li>
                                    ))}
                                </ol>
                            )}
                        </div>

                        <div className="card">
                            <div className="card-header"><h3 className="card-title">Số bài học theo tháng</h3></div>
                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 100 }}>
                                {stats.monthly.map(m => {
                                    const max = Math.max(...stats.monthly.map(x => x.count), 1);
                                    return (
                                        <div key={m.month} title={`${m.month}: ${m.count}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                                            <div style={{ width: '100%', height: Math.max((m.count / max) * 80, m.count > 0 ? 4 : 1), background: m.count > 0 ? '#E05B0A' : 'var(--bg-hover)', borderRadius: '3px 3px 0 0' }} />
                                            <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{m.month.slice(5)}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </>
            )}

            <div className="card">
                <div className="card-header">
                    <h3>Danh sách bài học</h3>
                    <button className="btn btn-ghost" onClick={handleExport} disabled={exporting}>
                        <Download size={15} /> {exporting ? 'Đang xuất...' : 'Xuất Excel'}
                    </button>
                </div>

                <div className="filter-bar" style={{ flexWrap: 'wrap' }}>
                    <input type="text" className="form-input" placeholder="🔍 Tìm mã, dự án, khách hàng, nội dung..."
                        value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 220 }} />
                    <select className="form-select" value={category} onChange={e => setCategory(e.target.value)}>
                        <option value="">Tất cả hạng mục</option>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select className="form-select" value={severity} onChange={e => setSeverity(e.target.value)}>
                        <option value="">Tất cả mức độ</option>
                        {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select className="form-select" value={status} onChange={e => setStatus(e.target.value)}>
                        <option value="">Tất cả trạng thái</option>
                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <input type="date" className="form-input" value={fromDate} onChange={e => setFromDate(e.target.value)} style={{ maxWidth: 160 }} />
                    <input type="date" className="form-input" value={toDate} onChange={e => setToDate(e.target.value)} style={{ maxWidth: 160 }} />
                </div>

                {loading ? (
                    <div style={{ padding: 40, textAlign: 'center' }}>Đang tải...</div>
                ) : lessons.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có bài học nào được ghi nhận</div>
                ) : (
                    <>
                        <div className="desktop-table-view">
                            <div className="table-container">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>STT</th>
                                            <SortTh field="occurredAt">Ngày</SortTh>
                                            <th>Dự án</th>
                                            <th>Khách hàng</th>
                                            <SortTh field="category">Hạng mục</SortTh>
                                            <SortTh field="severity">Mức độ</SortTh>
                                            <th>Nội dung sự việc</th>
                                            <th>Nguyên nhân</th>
                                            <th>Giải pháp</th>
                                            <SortTh field="status">Trạng thái</SortTh>
                                            <th>Người nhập</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {lessons.map((l, idx) => (
                                            <tr key={l.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/lessons-learned/${l.id}`)}>
                                                <td>{(pagination?.page - 1) * pagination?.limit + idx + 1}</td>
                                                <td>{fmtDate(l.occurredAt)}</td>
                                                <td className="accent">{l.projectName || l.project?.name || '—'}</td>
                                                <td>{l.customerName || l.customer?.name || '—'}</td>
                                                <td>{l.category}</td>
                                                <td><StatusBadge status={l.severity} colorMap={SEVERITY_COLORS} /></td>
                                                <td title={l.issueContent}>{truncate(l.issueContent, 50)}</td>
                                                <td title={l.cause}>{truncate(l.cause, 40)}</td>
                                                <td title={l.solution}>{truncate(l.solution, 40)}</td>
                                                <td><StatusBadge status={l.status} colorMap={STATUS_COLORS} /></td>
                                                <td>{l.createdBy}</td>
                                                <td onClick={e => e.stopPropagation()}>
                                                    <div style={{ display: 'flex', gap: 6 }}>
                                                        <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => router.push(`/lessons-learned/${l.id}`)}>Xem</button>
                                                        {canEditLesson({ id: session?.user?.id, name: session?.user?.name, role, department }, l) && (
                                                            <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => router.push(`/lessons-learned/${l.id}/edit`)}>Sửa</button>
                                                        )}
                                                        {perms.canDelete && (
                                                            <button className="btn btn-danger" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => setDeleteTarget(l)}>Xóa</button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="mobile-card-list">
                            {lessons.map(l => (
                                <div key={l.id} className="mobile-card-item" onClick={() => router.push(`/lessons-learned/${l.id}`)}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                        <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                                            <div className="card-title">{l.code} · {l.category}</div>
                                            <div className="card-subtitle" style={{ marginTop: 2 }}>{l.projectName || l.project?.name || '—'}</div>
                                        </div>
                                        <StatusBadge status={l.status} colorMap={STATUS_COLORS} />
                                    </div>
                                    <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginBottom: 8 }}>{truncate(l.issueContent, 90)}</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                        <div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Mức độ</div>
                                            <StatusBadge status={l.severity} colorMap={SEVERITY_COLORS} />
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Ngày</div>
                                            <div style={{ fontSize: 13, fontWeight: 700 }}>{fmtDate(l.occurredAt)}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div style={{ padding: '0 16px' }}>
                            <Pagination pagination={pagination} onPageChange={setPage} />
                        </div>
                    </>
                )}
            </div>

            <ConfirmDialog
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
                title="Xóa bài học dự án"
                message={`Xác nhận xóa bài học ${deleteTarget?.code}? Thao tác này không thể hoàn tác.`}
            />
        </div>
    );
}
