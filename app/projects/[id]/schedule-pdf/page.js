'use client';
import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

const BRAND = {
    orange: '#F47920',
    orangeDark: '#C94F12',
    white: '#ffffff',
    textDark: '#1e293b',
    textMid: '#475569',
    textLight: '#94a3b8',
    border: '#e2e8f0',
    bg: '#f8fafc',
};

const STATUS_COLORS = {
    'Hoàn thành': '#16a34a',
    'Đang thi công': '#2563eb',
    'Chưa bắt đầu': '#64748b',
    'Tạm dừng': '#d97706',
    'Hủy': '#dc2626',
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
const today = new Date().toLocaleDateString('vi-VN');

function flattenTasks(tasks, level = 0) {
    const result = [];
    for (const task of tasks) {
        result.push({ ...task, _level: level });
        if (task.children && task.children.length > 0) {
            result.push(...flattenTasks(task.children, level + 1));
        }
    }
    return result;
}

export default function SchedulePdfPage() {
    const { id } = useParams();
    const [project, setProject] = useState(null);
    const [flat, setFlat] = useState([]);
    const [totalProgress, setTotalProgress] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        Promise.all([
            fetch(`/api/projects/${id}`).then(r => r.json()),
            fetch(`/api/schedule-tasks?projectId=${id}`).then(r => r.json()),
        ]).then(([proj, schedule]) => {
            setProject(proj);
            const hierarchical = schedule.tasks || [];
            setFlat(flattenTasks(hierarchical));
            setTotalProgress(schedule.totalProgress || 0);
            setLoading(false);
        }).catch(err => {
            setError(err.message);
            setLoading(false);
        });
    }, [id]);

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'sans-serif', color: BRAND.textMid }}>
            Đang tải dữ liệu...
        </div>
    );
    if (error) return (
        <div style={{ padding: 40, textFamily: 'sans-serif', color: 'red' }}>Lỗi: {error}</div>
    );

    const doneCount = flat.filter(t => t.status === 'Hoàn thành').length;
    const inProgressCount = flat.filter(t => t.status === 'Đang thi công').length;
    const overdueCount = flat.filter(t => t.status !== 'Hoàn thành' && t.endDate && new Date(t.endDate) < new Date()).length;

    return (
        <>
            <style>{`
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body { font-family: 'Arial', sans-serif; background: #fff; color: ${BRAND.textDark}; font-size: 11px; }
                .no-print { }
                @media print {
                    .no-print { display: none !important; }
                    body { background: #fff; }
                    .page-break { page-break-before: always; }
                    table { page-break-inside: auto; }
                    tr { page-break-inside: avoid; }
                    @page {
                        size: A4 landscape;
                        margin: 12mm 10mm;
                    }
                }
                table { border-collapse: collapse; width: 100%; }
                th { background: ${BRAND.orange}; color: #fff; font-weight: 700; text-align: left; padding: 7px 8px; font-size: 10px; }
                td { padding: 5px 8px; border-bottom: 1px solid ${BRAND.border}; vertical-align: middle; font-size: 10px; }
                tr:nth-child(even) td { background: #fafafa; }
                .progress-bar-wrap { width: 70px; height: 8px; background: #e2e8f0; border-radius: 4px; display: inline-block; vertical-align: middle; }
                .progress-bar-fill { height: 8px; border-radius: 4px; background: ${BRAND.orange}; }
                .status-badge { display: inline-block; padding: 2px 7px; border-radius: 10px; font-size: 9px; font-weight: 700; color: #fff; }
                .header-section { background: linear-gradient(135deg, ${BRAND.orange} 0%, ${BRAND.orangeDark} 100%); color: #fff; padding: 16px 20px; margin-bottom: 16px; border-radius: 8px; }
                .info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 16px; }
                .info-card { border: 1px solid ${BRAND.border}; border-radius: 6px; padding: 10px 12px; }
                .info-label { font-size: 9px; color: ${BRAND.textLight}; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px; }
                .info-value { font-size: 12px; font-weight: 700; color: ${BRAND.textDark}; }
                .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 16px; }
                .kpi-card { border: 1px solid ${BRAND.border}; border-radius: 6px; padding: 10px 12px; text-align: center; }
                .kpi-val { font-size: 20px; font-weight: 800; }
                .kpi-label { font-size: 9px; color: ${BRAND.textLight}; margin-top: 2px; }
                .section-title { font-size: 12px; font-weight: 700; color: ${BRAND.orange}; margin-bottom: 8px; border-bottom: 2px solid ${BRAND.orange}; padding-bottom: 4px; }
                .print-btn { position: fixed; bottom: 24px; right: 24px; background: ${BRAND.orange}; color: #fff; border: none; border-radius: 8px; padding: 12px 24px; font-size: 14px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 12px rgba(244,121,32,0.4); z-index: 999; }
                .print-btn:hover { background: ${BRAND.orangeDark}; }
                .back-btn { position: fixed; bottom: 24px; right: 160px; background: #fff; color: ${BRAND.textDark}; border: 1px solid ${BRAND.border}; border-radius: 8px; padding: 12px 20px; font-size: 14px; cursor: pointer; z-index: 999; }
                .level-indent { display: inline-block; }
            `}</style>

            <div style={{ padding: '20px', maxWidth: 1100, margin: '0 auto' }}>

                {/* Header */}
                <div className="header-section">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: '7px 12px' }}>
                                    <svg width="28" height="28" viewBox="0 0 48 48" fill="none">
                                        <path d="M12 8 L12 40" stroke="white" strokeWidth="7" strokeLinecap="round"/>
                                        <path d="M12 24 L34 8" stroke="white" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
                                        <path d="M12 24 L34 40" stroke="white" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
                                        <path d="M20 16 L28 24" stroke="rgba(255,255,255,0.5)" strokeWidth="3.5" strokeLinecap="round"/>
                                        <path d="M20 32 L28 24" stroke="rgba(255,255,255,0.5)" strokeWidth="3.5" strokeLinecap="round"/>
                                    </svg>
                                    <div>
                                        <div style={{ fontSize: 17, fontWeight: 900, color: '#fff', letterSpacing: -0.5, lineHeight: 1 }}>
                                            Home<span style={{ color: '#ffe0b2' }}>SCT</span>
                                        </div>
                                        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.75)', letterSpacing: 0.5, marginTop: 1 }}>KIẾN TRÚC ĐÔ THỊ SCT</div>
                                    </div>
                                </div>
                            </div>
                            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 0.5 }}>
                                NHẬT KÝ TIẾN ĐỘ THI CÔNG
                            </div>
                            <div style={{ fontSize: 13, opacity: 0.9, marginTop: 2 }}>
                                {project?.name} {project?.code ? `(${project.code})` : ''}
                            </div>
                        </div>
                        <div style={{ textAlign: 'right', opacity: 0.85, fontSize: 10 }}>
                            <div>Ngày xuất: {today}</div>
                            <div style={{ marginTop: 4 }}>Địa chỉ: {project?.address || '—'}</div>
                        </div>
                    </div>
                </div>

                {/* Project Info */}
                <div className="info-grid">
                    <div className="info-card">
                        <div className="info-label">Khách hàng</div>
                        <div className="info-value">{project?.customer?.name || '—'}</div>
                        {project?.customer?.phone && <div style={{ fontSize: 10, color: BRAND.textMid, marginTop: 2 }}>{project.customer.phone}</div>}
                    </div>
                    <div className="info-card">
                        <div className="info-label">Ngày bắt đầu → Kết thúc</div>
                        <div className="info-value">{fmtDate(project?.startDate)} → {fmtDate(project?.endDate)}</div>
                    </div>
                    <div className="info-card">
                        <div className="info-label">Phụ trách / Thiết kế</div>
                        <div className="info-value">{project?.manager || '—'}</div>
                        {project?.designer && <div style={{ fontSize: 10, color: BRAND.textMid, marginTop: 2 }}>Thiết kế: {project.designer}</div>}
                    </div>
                </div>

                {/* KPIs */}
                <div className="kpi-grid">
                    <div className="kpi-card">
                        <div className="kpi-val" style={{ color: BRAND.orange }}>{totalProgress}%</div>
                        <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3, marginTop: 4, marginBottom: 4 }}>
                            <div style={{ width: `${totalProgress}%`, height: 6, background: BRAND.orange, borderRadius: 3 }}></div>
                        </div>
                        <div className="kpi-label">Tiến độ tổng thể</div>
                    </div>
                    <div className="kpi-card">
                        <div className="kpi-val">{flat.length}</div>
                        <div className="kpi-label">Tổng hạng mục</div>
                    </div>
                    <div className="kpi-card">
                        <div className="kpi-val" style={{ color: '#16a34a' }}>{doneCount}</div>
                        <div className="kpi-label">Hoàn thành</div>
                    </div>
                    <div className="kpi-card">
                        <div className="kpi-val" style={{ color: overdueCount > 0 ? '#dc2626' : '#16a34a' }}>{overdueCount}</div>
                        <div className="kpi-label">Quá hạn</div>
                    </div>
                </div>

                {/* Schedule Table */}
                <div className="section-title">BẢNG TIẾN ĐỘ CÁC HẠNG MỤC THI CÔNG</div>
                <table>
                    <thead>
                        <tr>
                            <th style={{ width: 40 }}>STT</th>
                            <th style={{ width: 50 }}>WBS</th>
                            <th>Hạng mục thi công</th>
                            <th style={{ width: 90 }}>Bắt đầu</th>
                            <th style={{ width: 90 }}>Kết thúc</th>
                            <th style={{ width: 50, textAlign: 'center' }}>Thời gian (ngày)</th>
                            <th style={{ width: 110, textAlign: 'center' }}>Tiến độ</th>
                            <th style={{ width: 100 }}>Trạng thái</th>
                            <th style={{ width: 100 }}>Phụ trách</th>
                        </tr>
                    </thead>
                    <tbody>
                        {flat.map((task, idx) => {
                            const statusColor = STATUS_COLORS[task.status] || '#64748b';
                            const isParent = task._level === 0;
                            const indent = task._level * 14;
                            return (
                                <tr key={task.id} style={isParent ? { background: '#fff7ed' } : {}}>
                                    <td style={{ color: BRAND.textLight, textAlign: 'center' }}>{idx + 1}</td>
                                    <td style={{ fontFamily: 'monospace', fontSize: 9, color: BRAND.textMid }}>{task.wbs || '—'}</td>
                                    <td>
                                        <span className="level-indent" style={{ width: indent, display: 'inline-block' }}></span>
                                        <span style={{ fontWeight: isParent ? 700 : 400, color: isParent ? BRAND.textDark : BRAND.textMid }}>
                                            {task.name}
                                        </span>
                                        {task.notes && <div style={{ fontSize: 9, color: BRAND.textLight, marginTop: 2, paddingLeft: indent }}>{task.notes}</div>}
                                    </td>
                                    <td style={{ color: BRAND.textMid }}>{fmtDate(task.startDate)}</td>
                                    <td style={{ color: task.endDate && new Date(task.endDate) < new Date() && task.status !== 'Hoàn thành' ? '#dc2626' : BRAND.textMid }}>
                                        {fmtDate(task.endDate)}
                                    </td>
                                    <td style={{ textAlign: 'center', color: BRAND.textMid }}>
                                        {task.duration || '—'}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'center' }}>
                                            <div className="progress-bar-wrap">
                                                <div className="progress-bar-fill" style={{ width: `${task.progress || 0}%`, background: task.progress >= 100 ? '#16a34a' : BRAND.orange }}></div>
                                            </div>
                                            <span style={{ fontSize: 10, fontWeight: 600, minWidth: 28, textAlign: 'right' }}>{task.progress || 0}%</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className="status-badge" style={{ background: statusColor }}>
                                            {task.status || 'Chưa bắt đầu'}
                                        </span>
                                    </td>
                                    <td style={{ color: BRAND.textMid }}>{task.assignee || '—'}</td>
                                </tr>
                            );
                        })}
                        {flat.length === 0 && (
                            <tr><td colSpan={9} style={{ textAlign: 'center', padding: 30, color: BRAND.textLight }}>Chưa có hạng mục thi công</td></tr>
                        )}
                    </tbody>
                </table>

                {/* Footer */}
                <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                    <div style={{ border: `1px solid ${BRAND.border}`, borderRadius: 6, padding: '12px 16px' }}>
                        <div style={{ fontWeight: 700, fontSize: 11, marginBottom: 6 }}>Ghi chú</div>
                        <div style={{ fontSize: 10, color: BRAND.textLight, lineHeight: 1.8 }}>
                            • Tiến độ được cập nhật theo báo cáo thực tế từ đội thi công<br />
                            • Ngày quá hạn được đánh dấu màu đỏ<br />
                            • Hạng mục cấp 1 (in đậm) là nhóm hạng mục chính<br />
                            • Tài liệu chỉ có giá trị tham khảo tại thời điểm xuất
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div style={{ textAlign: 'center', border: `1px solid ${BRAND.border}`, borderRadius: 6, padding: '12px 8px' }}>
                            <div style={{ fontSize: 10, fontWeight: 700, marginBottom: 40 }}>Chủ đầu tư</div>
                            <div style={{ fontSize: 10, color: BRAND.textLight }}>(Ký và ghi rõ họ tên)</div>
                        </div>
                        <div style={{ textAlign: 'center', border: `1px solid ${BRAND.border}`, borderRadius: 6, padding: '12px 8px' }}>
                            <div style={{ fontSize: 10, fontWeight: 700, marginBottom: 40 }}>Đại diện SCT</div>
                            <div style={{ fontSize: 10, color: BRAND.textLight }}>(Ký và ghi rõ họ tên)</div>
                        </div>
                    </div>
                </div>

                <div style={{ marginTop: 16, textAlign: 'center', fontSize: 9, color: BRAND.textLight, borderTop: `1px solid ${BRAND.border}`, paddingTop: 10 }}>
                    Kiến Trúc Đô Thị SCT — Cùng bạn xây dựng ước mơ | Xuất ngày {today}
                </div>
            </div>

            {/* Print buttons */}
            <button className="print-btn no-print" onClick={() => window.print()}>
                🖨️ In / Xuất PDF
            </button>
            <button className="back-btn no-print" onClick={() => window.history.back()}>
                ← Quay lại
            </button>
        </>
    );
}
