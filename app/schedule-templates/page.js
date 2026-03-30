'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';

export default function ScheduleTemplatesPage() {
    const router = useRouter();
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(null);
    const [form, setForm] = useState({ name: '', type: 'Nội thất', description: '' });
    const [items, setItems] = useState([]);
    const [detail, setDetail] = useState(null);
    const [importing, setImporting] = useState(false);
    const importRef = useRef();

    const fetchTemplates = () => {
        fetch('/api/schedule-templates').then(r => r.json()).then(d => { setTemplates(d); setLoading(false); });
    };
    useEffect(fetchTemplates, []);

    const addItem = () => {
        setItems(prev => [...prev, {
            name: '', order: prev.length, level: 0, wbs: '', duration: 1, weight: 1, color: '',
            parentIndex: null, predecessorIndex: null,
        }]);
    };

    const updateItem = (idx, field, value) => {
        setItems(prev => { const u = [...prev]; u[idx] = { ...u[idx], [field]: value }; return u; });
    };

    const removeItem = (idx) => setItems(prev => prev.filter((_, i) => i !== idx));

    const createTemplate = async () => {
        if (!form.name.trim()) return alert('Tên mẫu bắt buộc');
        if (items.length === 0) return alert('Cần ít nhất 1 hạng mục');
        const res = await fetch('/api/schedule-templates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...form, items }),
        });
        if (!res.ok) { const err = await res.json(); return alert(err.error || 'Lỗi tạo mẫu'); }
        setModal(null);
        setForm({ name: '', type: 'Nội thất', description: '' });
        setItems([]);
        fetchTemplates();
    };

    const deleteTemplate = async (id) => {
        if (!confirm('Xóa mẫu tiến độ này?')) return;
        await fetch(`/api/schedule-templates/${id}`, { method: 'DELETE' });
        fetchTemplates();
    };

    const viewDetail = async (id) => {
        const res = await fetch(`/api/schedule-templates/${id}`);
        const d = await res.json();
        setDetail(d);
    };

    const downloadTemplate = async () => {
        const XLSX = (await import('xlsx')).default;
        const wb = XLSX.utils.book_new();

        // Sheet 1: Data
        const header = [['Tên hạng mục *', 'WBS', 'Cấp (0=Nhóm / 1=Con)', 'Số ngày', 'Trọng lượng', 'Màu (hex)', 'Sau HM số (STT)', 'Thuộc nhóm số (STT)']];
        const sample = [
            ['Phần thô', '1', 0, 30, 1, '#3b82f6', '', ''],
            ['Đào móng', '1.1', 1, 7, 0.2, '', '', 1],
            ['Đổ bê tông móng', '1.2', 1, 10, 0.3, '', 2, 1],
            ['Xây tường', '1.3', 1, 13, 0.5, '', 3, 1],
            ['Phần hoàn thiện', '2', 0, 45, 1, '#22c55e', 1, ''],
            ['Trát tường', '2.1', 1, 15, 0.3, '', 4, 5],
            ['Sơn nước', '2.2', 1, 10, 0.2, '', 6, 5],
            ['Lắp đặt nội thất', '2.3', 1, 20, 0.5, '', 7, 5],
        ];
        const notes = [
            [],
            ['--- HƯỚNG DẪN ---'],
            ['Cột A', 'Tên hạng mục - BẮT BUỘC'],
            ['Cột B', 'Mã WBS (VD: 1, 1.1, 1.2...)'],
            ['Cột C', '0 = Nhóm (đầu mục), 1 = Con (hạng mục con)'],
            ['Cột D', 'Số ngày thực hiện (mặc định 1)'],
            ['Cột E', 'Trọng lượng tính % tiến độ (mặc định 1)'],
            ['Cột F', 'Màu hex VD: #ef4444 (đỏ), #22c55e (xanh), #3b82f6 (xanh dương), để trống = không màu'],
            ['Cột G', 'STT của hạng mục đi trước (Finish-to-Start), để trống = không phụ thuộc'],
            ['Cột H', 'STT của nhóm cha, để trống = không có nhóm'],
            [],
            ['Lưu ý:', 'Dòng 1 là tiêu đề, dữ liệu bắt đầu từ dòng 2. STT tính từ 1.'],
        ];
        const ws = XLSX.utils.aoa_to_sheet([...header, ...sample, ...notes]);
        ws['!cols'] = [{ wch: 30 }, { wch: 10 }, { wch: 22 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 20 }];
        XLSX.utils.book_append_sheet(wb, ws, 'Tiến độ');

        // Sheet 2: Metadata
        const metaWs = XLSX.utils.aoa_to_sheet([
            ['Tên mẫu *', 'Nhập tên mẫu tiến độ vào đây'],
            ['Loại', 'Nội thất'],
            ['Mô tả', ''],
            [],
            ['Các loại hợp lệ:', 'Xây thô, Hoàn thiện, Nội thất, Thiết kế'],
        ]);
        metaWs['!cols'] = [{ wch: 16 }, { wch: 40 }];
        XLSX.utils.book_append_sheet(wb, metaWs, 'Thông tin mẫu');

        XLSX.writeFile(wb, 'mau_tien_do_SCT.xlsx');
    };

    const handleImportExcel = async (file) => {
        setImporting(true);
        try {
            const XLSX = (await import('xlsx')).default;
            const buf = await file.arrayBuffer();
            const wb = XLSX.read(buf, { type: 'array' });

            // Read metadata from sheet 2
            const metaSheet = wb.Sheets['Thông tin mẫu'];
            const metaRows = metaSheet ? XLSX.utils.sheet_to_json(metaSheet, { header: 1, defval: '' }) : [];
            const templateName = String(metaRows[0]?.[1] || '').trim();
            const templateType = String(metaRows[1]?.[1] || 'Nội thất').trim();
            const templateDesc = String(metaRows[2]?.[1] || '').trim();

            if (!templateName || templateName === 'Nhập tên mẫu tiến độ vào đây') {
                alert('Vui lòng điền Tên mẫu vào sheet "Thông tin mẫu" (ô B1)');
                setImporting(false);
                return;
            }

            // Read items from sheet 1
            const dataSheet = wb.Sheets[wb.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(dataSheet, { header: 1, defval: '' });
            const dataRows = rows.slice(1).filter(r => r[0] && String(r[0]).trim());

            if (!dataRows.length) {
                alert('Không có hạng mục nào trong file');
                setImporting(false);
                return;
            }

            const parsedItems = dataRows.map((r, idx) => ({
                name: String(r[0] || '').trim(),
                wbs: String(r[1] || '').trim(),
                level: Number(r[2]) || 0,
                duration: Number(r[3]) || 1,
                weight: Number(r[4]) || 1,
                color: String(r[5] || '').trim(),
                predecessorIndex: r[6] !== '' && r[6] !== null ? Number(r[6]) - 1 : null,
                parentIndex: r[7] !== '' && r[7] !== null ? Number(r[7]) - 1 : null,
                order: idx,
            }));

            const res = await fetch('/api/schedule-templates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: templateName, type: templateType, description: templateDesc, items: parsedItems }),
            });
            if (!res.ok) { const err = await res.json(); alert(err.error || 'Lỗi tạo mẫu'); setImporting(false); return; }
            fetchTemplates();
            alert(`Đã tạo mẫu "${templateName}" với ${parsedItems.length} hạng mục`);
        } catch (err) {
            alert('Lỗi đọc file: ' + err.message);
        }
        setImporting(false);
    };

    if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>;

    const TYPES = ['Xây thô', 'Hoàn thiện', 'Nội thất', 'Thiết kế'];
    const COLORS = ['', '#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>📋 Mẫu tiến độ</h2>
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>Quản lý thư viện mẫu tiến độ dùng cho các dự án</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-ghost btn-sm" onClick={downloadTemplate} style={{ border: '1px solid #16a34a', color: '#15803d', background: '#f0fdf4' }}>📥 Tải mẫu Excel</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => importRef.current?.click()} disabled={importing} style={{ border: '1px solid #2563eb', color: '#1d4ed8', background: '#eff6ff' }}>
                        {importing ? 'Đang nhập...' : '📊 Nhập từ Excel'}
                    </button>
                    <input ref={importRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) { handleImportExcel(e.target.files[0]); e.target.value = ''; } }} />
                    <button className="btn btn-primary" onClick={() => { setModal('create'); setItems([]); }}>+ Tạo mẫu mới</button>
                </div>
            </div>

            {/* Templates Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                {templates.map(t => (
                    <div key={t.id} className="card" style={{ padding: 20, cursor: 'pointer', transition: 'all 0.2s' }}
                        onClick={() => viewDetail(t.id)}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 15 }}>{t.name}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{t.description || 'Không có mô tả'}</div>
                            </div>
                            <span className="badge info" style={{ flexShrink: 0 }}>{t.type}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                📊 {t._count?.items || 0} hạng mục • {fmtDate(t.createdAt)}
                            </span>
                            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--status-danger)', fontSize: 12 }}
                                onClick={(e) => { e.stopPropagation(); deleteTemplate(t.id); }}>🗑️</button>
                        </div>
                    </div>
                ))}
            </div>

            {templates.length === 0 && (
                <div className="card" style={{ padding: 40, textAlign: 'center' }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
                    <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>Chưa có mẫu tiến độ</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>
                        Tạo mẫu để PM có thể import nhanh vào dự án
                    </div>
                    <button className="btn btn-primary" onClick={() => { setModal('create'); setItems([]); }}>+ Tạo mẫu đầu tiên</button>
                </div>
            )}

            {/* Detail Modal */}
            {detail && (
                <div className="modal-overlay" onClick={() => setDetail(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 700 }}>
                        <div className="modal-header">
                            <h3>{detail.name}</h3>
                            <button className="modal-close" onClick={() => setDetail(null)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
                                <span className="badge info">{detail.type}</span>
                                <span className="badge muted">{detail.items?.length || 0} hạng mục</span>
                            </div>
                            {detail.description && <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>{detail.description}</p>}
                            <div className="table-container"><table className="data-table">
                                <thead><tr><th style={{ width: 30 }}>#</th><th>Hạng mục</th><th style={{ width: 50 }}>WBS</th><th style={{ width: 60 }}>Ngày</th><th style={{ width: 50 }}>TL</th></tr></thead>
                                <tbody>{(detail.items || []).map((item, i) => (
                                    <tr key={item.id} style={{ background: item.level === 0 ? 'var(--bg-elevated)' : 'transparent' }}>
                                        <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{i + 1}</td>
                                        <td style={{ paddingLeft: item.level * 20 + 8, fontWeight: item.level === 0 ? 700 : 400 }}>
                                            {item.color && <span style={{ display: 'inline-block', width: 4, height: 14, borderRadius: 2, background: item.color, marginRight: 6, verticalAlign: 'middle' }}></span>}
                                            {item.name}
                                        </td>
                                        <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.wbs}</td>
                                        <td style={{ fontSize: 12 }}>{item.duration}d</td>
                                        <td style={{ fontSize: 12 }}>{item.weight}</td>
                                    </tr>
                                ))}</tbody>
                            </table></div>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Modal */}
            {modal === 'create' && (
                <div className="modal-overlay" onClick={() => setModal(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 800 }}>
                        <div className="modal-header"><h3>Tạo mẫu tiến độ</h3><button className="modal-close" onClick={() => setModal(null)}>×</button></div>
                        <div className="modal-body">
                            <div className="form-row">
                                <div className="form-group" style={{ flex: 2 }}><label className="form-label">Tên mẫu *</label><input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="VD: Thi công nội thất tiêu chuẩn" /></div>
                                <div className="form-group"><label className="form-label">Loại</label>
                                    <select className="form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                                        {TYPES.map(t => <option key={t}>{t}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="form-group"><label className="form-label">Mô tả</label><textarea className="form-input" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>

                            {/* Items Editor */}
                            <div style={{ marginTop: 16, border: '1px solid var(--border-color)', borderRadius: 8, overflow: 'hidden' }}>
                                <div style={{ background: 'var(--bg-elevated)', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: 600, fontSize: 13 }}>📊 Danh sách hạng mục ({items.length})</span>
                                    <button type="button" className="btn btn-ghost btn-sm" onClick={addItem} style={{ fontSize: 12 }}>+ Thêm</button>
                                </div>
                                {items.length === 0 ? (
                                    <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Bấm "+ Thêm" để thêm hạng mục</div>
                                ) : (
                                    <div style={{ maxHeight: 400, overflow: 'auto' }}>
                                        <table className="data-table" style={{ marginBottom: 0 }}>
                                            <thead><tr>
                                                <th style={{ width: 30 }}>#</th>
                                                <th>Tên</th>
                                                <th style={{ width: 50 }}>WBS</th>
                                                <th style={{ width: 50 }}>Cấp</th>
                                                <th style={{ width: 55 }}>Ngày</th>
                                                <th style={{ width: 45 }}>TL</th>
                                                <th style={{ width: 40 }}>Màu</th>
                                                <th style={{ width: 70 }}>Sau hạng mục</th>
                                                <th style={{ width: 70 }}>Thuộc nhóm</th>
                                                <th style={{ width: 30 }}></th>
                                            </tr></thead>
                                            <tbody>{items.map((item, idx) => (
                                                <tr key={idx}>
                                                    <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{idx + 1}</td>
                                                    <td><input className="form-input" value={item.name} onChange={e => updateItem(idx, 'name', e.target.value)} style={{ padding: '3px 6px', fontSize: 12 }} placeholder="Tên hạng mục" /></td>
                                                    <td><input className="form-input" value={item.wbs} onChange={e => updateItem(idx, 'wbs', e.target.value)} style={{ padding: '3px 4px', fontSize: 11, textAlign: 'center' }} placeholder="1.1" /></td>
                                                    <td><select className="form-select" value={item.level} onChange={e => updateItem(idx, 'level', Number(e.target.value))} style={{ padding: '3px 4px', fontSize: 11 }}>
                                                        <option value={0}>Nhóm</option><option value={1}>Con</option>
                                                    </select></td>
                                                    <td><input type="number" className="form-input" min="1" value={item.duration} onChange={e => updateItem(idx, 'duration', Number(e.target.value))} style={{ padding: '3px 4px', fontSize: 11, textAlign: 'center' }} /></td>
                                                    <td><input type="number" className="form-input" min="0" step="0.1" value={item.weight} onChange={e => updateItem(idx, 'weight', Number(e.target.value))} style={{ padding: '3px 4px', fontSize: 11, textAlign: 'center' }} /></td>
                                                    <td><select value={item.color} onChange={e => updateItem(idx, 'color', e.target.value)} style={{ width: 30, height: 24, border: '1px solid var(--border-color)', borderRadius: 4, background: item.color || 'var(--bg-card)', cursor: 'pointer' }}>
                                                        {COLORS.map(c => <option key={c || 'none'} value={c} style={{ background: c || '#fff' }}>{c ? '■' : '—'}</option>)}
                                                    </select></td>
                                                    <td><select className="form-select" value={item.predecessorIndex ?? ''} onChange={e => updateItem(idx, 'predecessorIndex', e.target.value === '' ? null : Number(e.target.value))} style={{ padding: '3px 4px', fontSize: 10 }}>
                                                        <option value="">—</option>
                                                        {items.map((it, i) => i < idx ? <option key={i} value={i}>#{i + 1}</option> : null)}
                                                    </select></td>
                                                    <td><select className="form-select" value={item.parentIndex ?? ''} onChange={e => updateItem(idx, 'parentIndex', e.target.value === '' ? null : Number(e.target.value))} style={{ padding: '3px 4px', fontSize: 10 }}>
                                                        <option value="">—</option>
                                                        {items.map((it, i) => i < idx && it.level === 0 ? <option key={i} value={i}>#{i + 1}</option> : null)}
                                                    </select></td>
                                                    <td><button onClick={() => removeItem(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--status-danger)', fontSize: 14, padding: 2 }}>×</button></td>
                                                </tr>
                                            ))}</tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="modal-footer"><button className="btn btn-ghost" onClick={() => setModal(null)}>Hủy</button><button className="btn btn-primary" onClick={createTemplate}>💾 Lưu mẫu</button></div>
                    </div>
                </div>
            )}
        </div>
    );
}
