'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
    Plus, Download, Upload, Trash2, Eye, ClipboardList, X,
} from 'lucide-react';
import {
    PageContainer, PageHeader, Card, Button, IconButton, Badge,
    Table, Modal, ConfirmDialog, EmptyState, useToast,
    Field, Input, Select, Textarea, FormGrid,
} from '@/components/ui';
import { formatDate } from '@/lib/format';

const TYPES = ['Xây thô', 'Hoàn thiện', 'Nội thất', 'Thiết kế'];
const COLORS = ['', '#EF4444', '#F59E0B', '#22C55E', '#3B82F6', '#8B5CF6', '#EC4899'];

const TYPE_TONES = {
    'Xây thô': 'neutral',
    'Hoàn thiện': 'info',
    'Nội thất': 'primary',
    'Thiết kế': 'purple',
};

export default function ScheduleTemplatesPage() {
    const toast = useToast();
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [modal, setModal] = useState(null);
    const [form, setForm] = useState({ name: '', type: 'Nội thất', description: '' });
    const [formError, setFormError] = useState({});
    const [saving, setSaving] = useState(false);
    const [items, setItems] = useState([]);
    const [detail, setDetail] = useState(null);
    const [toDelete, setToDelete] = useState(null);
    const [importing, setImporting] = useState(false);
    const importRef = useRef();

    const fetchTemplates = useCallback(() => {
        setLoading(true);
        setFailed(false);
        fetch('/api/schedule-templates')
            .then(r => r.json())
            .then(d => { setTemplates(Array.isArray(d) ? d : []); setLoading(false); })
            .catch(() => { setFailed(true); setLoading(false); });
    }, []);

    useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

    const openCreate = () => {
        setForm({ name: '', type: 'Nội thất', description: '' });
        setFormError({});
        setItems([]);
        setModal('create');
    };

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
        const errors = {};
        if (!form.name.trim()) errors.name = 'Vui lòng nhập tên mẫu.';
        if (items.length === 0) errors.items = 'Cần ít nhất một hạng mục.';
        setFormError(errors);
        if (Object.keys(errors).length > 0) {
            toast.error('Vui lòng kiểm tra các trường bắt buộc.');
            return;
        }

        setSaving(true);
        try {
            const res = await fetch('/api/schedule-templates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, items }),
            });
            if (!res.ok) {
                await res.json().catch(() => ({}));
                toast.error('Không thể lưu mẫu tiến độ. Vui lòng kiểm tra lại dữ liệu đã nhập.');
                return;
            }
            setModal(null);
            setForm({ name: '', type: 'Nội thất', description: '' });
            setItems([]);
            fetchTemplates();
            toast.success('Đã lưu mẫu tiến độ.');
        } catch {
            toast.error('Không kết nối được máy chủ. Vui lòng thử lại.');
        } finally {
            setSaving(false);
        }
    };

    const deleteTemplate = async (tpl) => {
        try {
            const res = await fetch(`/api/schedule-templates/${tpl.id}`, { method: 'DELETE' });
            if (!res.ok) {
                toast.error(`Không thể xóa mẫu "${tpl.name}".`);
                return;
            }
            fetchTemplates();
            toast.success(`Đã xóa mẫu "${tpl.name}".`);
        } catch {
            toast.error('Không kết nối được máy chủ. Vui lòng thử lại.');
        }
    };

    const viewDetail = async (id) => {
        try {
            const res = await fetch(`/api/schedule-templates/${id}`);
            setDetail(await res.json());
        } catch {
            toast.error('Không tải được chi tiết mẫu tiến độ.');
        }
    };

    const downloadTemplate = async () => {
        const mod = await import('xlsx');
        const XLSX = mod.default || mod;
        const wb = XLSX.utils.book_new();

        // Metadata ở đầu sheet
        const metaRows = [
            ['Tên mẫu *', 'Nhập tên mẫu tiến độ vào đây'],
            ['Loại', 'Nội thất'],
            ['Mô tả', ''],
            [],
        ];
        const header = [['STT', 'Hạng mục *', 'Ngày BĐ', 'Ngày KT', 'Tổng số ngày']];
        const sample = [
            [1, 'Phần thô', '01/04/2025', '30/04/2025', 30],
            [2, 'Đào móng', '01/04/2025', '07/04/2025', 7],
            [3, 'Đổ bê tông móng', '08/04/2025', '17/04/2025', 10],
            [4, 'Xây tường', '18/04/2025', '30/04/2025', 13],
            [5, 'Phần hoàn thiện', '01/05/2025', '14/06/2025', 45],
            [6, 'Trát tường', '01/05/2025', '15/05/2025', 15],
            [7, 'Sơn nước', '16/05/2025', '25/05/2025', 10],
            [8, 'Lắp đặt nội thất', '26/05/2025', '14/06/2025', 20],
        ];
        const notes = [
            [],
            ['--- HƯỚNG DẪN ---'],
            ['Dòng 1-2', 'Tên mẫu và Loại - BẮT BUỘC điền trước khi nhập'],
            ['Cột A (STT)', 'Số thứ tự (tự động, có thể để trống)'],
            ['Cột B (Hạng mục)', 'Tên hạng mục - BẮT BUỘC'],
            ['Cột C (Ngày BĐ)', 'Ngày bắt đầu định dạng DD/MM/YYYY (có thể để trống)'],
            ['Cột D (Ngày KT)', 'Ngày kết thúc định dạng DD/MM/YYYY (có thể để trống)'],
            ['Cột E (Tổng số ngày)', 'Số ngày thực hiện - nếu để trống sẽ tính từ Ngày BĐ và Ngày KT'],
            ['Loại hợp lệ:', 'Xây thô, Hoàn thiện, Nội thất, Thiết kế'],
        ];
        const ws = XLSX.utils.aoa_to_sheet([...metaRows, ...header, ...sample, ...notes]);
        ws['!cols'] = [{ wch: 8 }, { wch: 36 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];
        XLSX.utils.book_append_sheet(wb, ws, 'Tiến độ');
        XLSX.writeFile(wb, 'mau_tien_do_SCT.xlsx');
    };

    const handleImportExcel = async (file) => {
        setImporting(true);
        try {
            const mod = await import('xlsx');
            const XLSX = mod.default || mod;
            const buf = await file.arrayBuffer();
            const wb = XLSX.read(buf, { type: 'array', cellDates: true });

            const ws = wb.Sheets[wb.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

            // Đọc metadata từ dòng 1-3, dữ liệu từ dòng 6
            // Nếu file không có metadata (nhập thẳng không theo mẫu), thử đọc từ dòng 2
            let templateName = String(rows[0]?.[1] || '').trim();
            let templateType = String(rows[1]?.[1] || '').trim();
            const templateDesc = String(rows[2]?.[1] || '').trim();
            let dataStartRow = 5;

            const isPlaceholder = !templateName || templateName === 'Nhập tên mẫu tiến độ vào đây';
            const knownTypes = TYPES;

            // Nếu không có metadata → thử đọc như file thuần (không có phần header meta)
            if (isPlaceholder) {
                // Tìm dòng header thực sự (có chứa "Hạng mục" hoặc "STT")
                const headerIdx = rows.findIndex(r => String(r[0]).includes('STT') || String(r[1]).toLowerCase().includes('hạng mục'));
                dataStartRow = headerIdx >= 0 ? headerIdx + 1 : 1;
                const entered = window.prompt('Nhập tên cho mẫu tiến độ này:');
                if (!entered?.trim()) { setImporting(false); return; }
                templateName = entered.trim();
            }
            if (!knownTypes.includes(templateType)) templateType = 'Nội thất';

            const dataRows = rows.slice(dataStartRow).filter(r => r[1] && String(r[1]).trim());
            if (!dataRows.length) {
                toast.error('File không có hạng mục nào (dữ liệu bắt đầu từ dòng 6).');
                setImporting(false);
                return;
            }

            const parseDMY = (val) => {
                if (!val) return null;
                if (val instanceof Date) return val;
                const s = String(val).trim();
                const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
                if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
                return null;
            };

            const parsedItems = dataRows.map((r, idx) => {
                const start = parseDMY(r[2]);
                const end = parseDMY(r[3]);
                let duration = Number(r[4]) || 0;
                if (!duration && start && end) {
                    duration = Math.max(1, Math.round((end - start) / 86400000) + 1);
                }
                if (!duration) duration = 1;
                return { name: String(r[1] || '').trim(), duration, order: idx, level: 0, wbs: '', weight: 1, color: '' };
            });

            const res = await fetch('/api/schedule-templates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: templateName, type: templateType, description: templateDesc, items: parsedItems }),
            });
            if (!res.ok) {
                await res.json().catch(() => ({}));
                toast.error('Không thể tạo mẫu từ file Excel. Vui lòng kiểm tra lại nội dung file.');
                setImporting(false);
                return;
            }
            fetchTemplates();
            toast.success(`Đã tạo mẫu "${templateName}" với ${parsedItems.length} hạng mục.`);
        } catch {
            toast.error('Không đọc được file Excel. Vui lòng dùng đúng mẫu tải về.');
        }
        setImporting(false);
    };

    const columns = [
        {
            key: 'name',
            header: 'Tên mẫu',
            strong: true,
            truncate: true,
            render: (name, row) => (
                <span style={{ display: 'block' }}>
                    <span style={{ display: 'block' }}>{name}</span>
                    <span className="ui-caption ui-truncate" style={{ display: 'block' }}>
                        {row.description || 'Không có mô tả'}
                    </span>
                </span>
            ),
        },
        {
            key: 'type',
            header: 'Loại',
            nowrap: true,
            width: 140,
            render: v => <Badge tone={TYPE_TONES[v] || 'neutral'} size="sm">{v}</Badge>,
        },
        {
            key: '_count',
            header: 'Số hạng mục',
            align: 'num',
            width: 120,
            render: v => v?.items ?? 0,
        },
        {
            key: 'createdAt',
            header: 'Ngày tạo',
            align: 'num',
            nowrap: true,
            width: 120,
            render: v => formatDate(v, { fallback: '—' }),
        },
    ];

    const rowActions = (row) => [
        { label: 'Xem chi tiết', icon: Eye, onClick: () => viewDetail(row.id) },
        { label: 'Xóa mẫu', icon: Trash2, danger: true, separatorBefore: true, onClick: () => setToDelete(row) },
    ];

    return (
        <PageContainer>
            <PageHeader
                title="Mẫu tiến độ"
                description="Thư viện mẫu tiến độ dùng chung để nhập nhanh vào dự án"
                breadcrumbs={[{ label: 'Trang chủ', href: '/' }, { label: 'Mẫu tiến độ' }]}
                actions={
                    <>
                        <Button variant="outline" icon={Download} onClick={downloadTemplate}>
                            Tải mẫu Excel
                        </Button>
                        <Button
                            variant="outline"
                            icon={Upload}
                            loading={importing}
                            onClick={() => importRef.current?.click()}
                        >
                            {importing ? 'Đang nhập…' : 'Nhập từ Excel'}
                        </Button>
                        <Button variant="primary" icon={Plus} onClick={openCreate}>
                            Tạo mẫu mới
                        </Button>
                        <input
                            ref={importRef}
                            type="file"
                            accept=".xlsx,.xls"
                            className="ui-sr-only"
                            aria-label="Chọn file Excel mẫu tiến độ"
                            onChange={e => {
                                if (e.target.files?.[0]) { handleImportExcel(e.target.files[0]); e.target.value = ''; }
                            }}
                        />
                    </>
                }
            />

            <Card flush>
                <Table
                    columns={columns}
                    data={templates}
                    loading={loading}
                    error={failed}
                    onRetry={fetchTemplates}
                    onRowClick={(row) => viewDetail(row.id)}
                    rowActions={rowActions}
                    stickyHeader
                    caption="Danh sách mẫu tiến độ"
                    empty={
                        <EmptyState
                            icon={ClipboardList}
                            title="Chưa có mẫu tiến độ"
                            description="Tạo mẫu đầu tiên để quản lý dự án có thể nhập nhanh tiến độ chuẩn vào dự án mới."
                            action={<Button variant="primary" icon={Plus} onClick={openCreate}>Tạo mẫu đầu tiên</Button>}
                        />
                    }
                />
            </Card>

            {/* Chi tiết mẫu */}
            <Modal
                isOpen={!!detail}
                onClose={() => setDetail(null)}
                title={detail?.name}
                maxWidth={720}
                footer={<Button variant="outline" onClick={() => setDetail(null)}>Đóng</Button>}
            >
                {detail && (
                    <>
                        <div className="ui-row" style={{ marginBottom: 'var(--space-3)' }}>
                            <Badge tone={TYPE_TONES[detail.type] || 'neutral'} size="sm">{detail.type}</Badge>
                            <Badge tone="neutral" size="sm">{detail.items?.length || 0} hạng mục</Badge>
                        </div>
                        {detail.description && (
                            <p className="ui-secondary" style={{ marginBottom: 'var(--space-4)' }}>{detail.description}</p>
                        )}
                        <div className="ui-table-wrap">
                            <table className="ui-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: 40 }} className="is-center">#</th>
                                        <th>Hạng mục</th>
                                        <th style={{ width: 70 }}>WBS</th>
                                        <th style={{ width: 70 }} className="is-num">Số ngày</th>
                                        <th style={{ width: 70 }} className="is-num">Trọng số</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(detail.items || []).map((item, i) => (
                                        <tr key={item.id}>
                                            <td className="is-center ui-caption">{i + 1}</td>
                                            <td style={{ paddingLeft: item.level * 20 + 16, fontWeight: item.level === 0 ? 600 : 400 }}>
                                                {item.color && (
                                                    <span
                                                        aria-hidden="true"
                                                        style={{
                                                            display: 'inline-block', width: 4, height: 14, borderRadius: 2,
                                                            background: item.color, marginRight: 6, verticalAlign: 'middle',
                                                        }}
                                                    />
                                                )}
                                                {item.name}
                                            </td>
                                            <td className="ui-caption">{item.wbs}</td>
                                            <td className="is-num">{item.duration}</td>
                                            <td className="is-num">{item.weight}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </Modal>

            {/* Tạo mẫu mới */}
            <Modal
                isOpen={modal === 'create'}
                onClose={() => setModal(null)}
                title="Tạo mẫu tiến độ"
                description="Khai báo thông tin chung rồi thêm từng hạng mục của tiến độ."
                maxWidth={880}
                closeOnOverlayClick={false}
                footer={
                    <>
                        <Button variant="outline" onClick={() => setModal(null)} disabled={saving}>Hủy</Button>
                        <Button variant="primary" onClick={createTemplate} loading={saving}>Lưu mẫu</Button>
                    </>
                }
            >
                <FormGrid>
                    <Field label="Tên mẫu" required error={formError.name}>
                        {({ id, ...a11y }) => (
                            <Input
                                id={id}
                                {...a11y}
                                value={form.name}
                                onChange={e => setForm({ ...form, name: e.target.value })}
                                placeholder="VD: Thi công nội thất tiêu chuẩn"
                            />
                        )}
                    </Field>

                    <Field label="Loại">
                        {({ id }) => (
                            <Select id={id} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </Select>
                        )}
                    </Field>
                </FormGrid>

                <div style={{ marginTop: 'var(--space-4)' }}>
                    <Field label="Mô tả" hint="Ghi chú ngắn giúp người khác biết mẫu này dùng cho loại công trình nào.">
                        {({ id }) => (
                            <Textarea
                                id={id}
                                rows={2}
                                value={form.description}
                                onChange={e => setForm({ ...form, description: e.target.value })}
                            />
                        )}
                    </Field>
                </div>

                <section style={{ marginTop: 'var(--space-6)' }}>
                    <div className="ui-row ui-row--between" style={{ marginBottom: 'var(--space-2)' }}>
                        <h3 className="ui-form-section__title">Danh sách hạng mục ({items.length})</h3>
                        <Button variant="outline" size="sm" icon={Plus} onClick={addItem}>Thêm hạng mục</Button>
                    </div>

                    {formError.items && (
                        <p className="ui-field__error" role="alert" style={{ marginBottom: 'var(--space-2)' }}>
                            {formError.items}
                        </p>
                    )}

                    <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                        {items.length === 0 ? (
                            <EmptyState
                                icon={ClipboardList}
                                title="Chưa có hạng mục nào"
                                description="Bấm “Thêm hạng mục” để bắt đầu xây dựng tiến độ mẫu."
                            />
                        ) : (
                            <div className="ui-table-wrap" style={{ maxHeight: 400, overflowY: 'auto' }}>
                                <table className="ui-table">
                                    <thead>
                                        <tr>
                                            <th style={{ width: 40 }} className="is-center">#</th>
                                            <th style={{ minWidth: 200 }}>Tên hạng mục</th>
                                            <th style={{ width: 80 }}>WBS</th>
                                            <th style={{ width: 100 }}>Cấp</th>
                                            <th style={{ width: 80 }}>Số ngày</th>
                                            <th style={{ width: 80 }}>Trọng số</th>
                                            <th style={{ width: 70 }}>Màu</th>
                                            <th style={{ width: 110 }}>Sau hạng mục</th>
                                            <th style={{ width: 110 }}>Thuộc nhóm</th>
                                            <th style={{ width: 48 }}><span className="ui-sr-only">Xóa</span></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map((item, idx) => (
                                            <tr key={idx}>
                                                <td className="is-center ui-caption">{idx + 1}</td>
                                                <td>
                                                    <Input
                                                        value={item.name}
                                                        onChange={e => updateItem(idx, 'name', e.target.value)}
                                                        placeholder="Tên hạng mục"
                                                        aria-label={`Tên hạng mục ${idx + 1}`}
                                                    />
                                                </td>
                                                <td>
                                                    <Input
                                                        value={item.wbs}
                                                        onChange={e => updateItem(idx, 'wbs', e.target.value)}
                                                        placeholder="1.1"
                                                        aria-label={`Mã WBS hạng mục ${idx + 1}`}
                                                    />
                                                </td>
                                                <td>
                                                    <Select
                                                        value={item.level}
                                                        onChange={e => updateItem(idx, 'level', Number(e.target.value))}
                                                        aria-label={`Cấp của hạng mục ${idx + 1}`}
                                                    >
                                                        <option value={0}>Nhóm</option>
                                                        <option value={1}>Con</option>
                                                    </Select>
                                                </td>
                                                <td>
                                                    <Input
                                                        type="number"
                                                        min="1"
                                                        numeric
                                                        value={item.duration}
                                                        onChange={e => updateItem(idx, 'duration', Number(e.target.value))}
                                                        aria-label={`Số ngày của hạng mục ${idx + 1}`}
                                                    />
                                                </td>
                                                <td>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        step="0.1"
                                                        numeric
                                                        value={item.weight}
                                                        onChange={e => updateItem(idx, 'weight', Number(e.target.value))}
                                                        aria-label={`Trọng số của hạng mục ${idx + 1}`}
                                                    />
                                                </td>
                                                <td>
                                                    <Select
                                                        value={item.color}
                                                        onChange={e => updateItem(idx, 'color', e.target.value)}
                                                        aria-label={`Màu của hạng mục ${idx + 1}`}
                                                        style={{ background: item.color || undefined }}
                                                    >
                                                        {COLORS.map(c => (
                                                            <option key={c || 'none'} value={c}>{c ? '■' : '—'}</option>
                                                        ))}
                                                    </Select>
                                                </td>
                                                <td>
                                                    <Select
                                                        value={item.predecessorIndex ?? ''}
                                                        onChange={e => updateItem(idx, 'predecessorIndex', e.target.value === '' ? null : Number(e.target.value))}
                                                        aria-label={`Hạng mục đứng trước hạng mục ${idx + 1}`}
                                                    >
                                                        <option value="">—</option>
                                                        {items.map((it, i) => i < idx ? <option key={i} value={i}>#{i + 1}</option> : null)}
                                                    </Select>
                                                </td>
                                                <td>
                                                    <Select
                                                        value={item.parentIndex ?? ''}
                                                        onChange={e => updateItem(idx, 'parentIndex', e.target.value === '' ? null : Number(e.target.value))}
                                                        aria-label={`Nhóm cha của hạng mục ${idx + 1}`}
                                                    >
                                                        <option value="">—</option>
                                                        {items.map((it, i) => i < idx && it.level === 0 ? <option key={i} value={i}>#{i + 1}</option> : null)}
                                                    </Select>
                                                </td>
                                                <td className="is-center">
                                                    <IconButton
                                                        icon={X}
                                                        label={`Xóa hạng mục ${idx + 1}`}
                                                        size="sm"
                                                        onClick={() => removeItem(idx)}
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </section>
            </Modal>

            <ConfirmDialog
                isOpen={!!toDelete}
                onClose={() => setToDelete(null)}
                onConfirm={() => deleteTemplate(toDelete)}
                title="Xóa mẫu tiến độ"
                itemName={`mẫu tiến độ “${toDelete?.name}”`}
                confirmText="Xóa mẫu"
            />
        </PageContainer>
    );
}
