'use client';
import { useEffect, useState } from 'react';

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);

export default function MigrationPage() {
    const [scan, setScan] = useState(null);
    const [decisions, setDecisions] = useState({}); // legacyProductId -> {decision, targetMaterialId}
    const [materials, setMaterials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [reconciliation, setReconciliation] = useState([]);
    const [committing, setCommitting] = useState(false);
    const [log, setLog] = useState('');

    useEffect(() => {
        Promise.all([
            fetch('/api/inventory-v2/migration/legacy-scan').then(r => r.json()),
            fetch('/api/inventory-v2/materials?limit=2000').then(r => r.json()),
        ]).then(([s, m]) => { setScan(s); setMaterials(m.data || []); setLoading(false); });
    }, []);

    const flagsByProduct = (scan?.flags || []).reduce((acc, f) => { (acc[f.productId] = acc[f.productId] || []).push(f); return acc; }, {});

    const setDecision = (productId, patch) => setDecisions(d => ({ ...d, [productId]: { ...d[productId], ...patch } }));

    const confirmAll = async () => {
        setSaving(true); setLog('');
        const mappings = Object.entries(decisions)
            .filter(([, v]) => v.decision)
            .map(([legacyProductId, v]) => ({ legacyProductId, decision: v.decision, targetMaterialId: v.decision === 'MERGE_INTO_EXISTING' ? v.targetMaterialId : undefined }));
        if (mappings.length === 0) { setLog('Chưa chọn quyết định nào'); setSaving(false); return; }
        const res = await fetch('/api/inventory-v2/migration/mappings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mappings }) });
        const d = await res.json();
        setLog(`Đã xác nhận ${d.data?.length || 0} quyết định.`);
        const r = await fetch('/api/inventory-v2/migration/reconciliation').then(r => r.json());
        setReconciliation(r.data || []);
        setSaving(false);
    };

    const commitConfirmed = async () => {
        if (!confirm('Commit sẽ tạo vật tư mới / cộng tồn đầu kỳ vào Kho 2.0. Tiếp tục?')) return;
        setCommitting(true); setLog('');
        const res = await fetch('/api/inventory-v2/migration/mappings').then(r => r.json());
        const confirmedIds = (res.data || []).filter(m => m.status === 'CONFIRMED').map(m => m.id);
        if (confirmedIds.length === 0) { setLog('Chưa có mapping nào ở trạng thái CONFIRMED'); setCommitting(false); return; }
        const commitRes = await fetch('/api/inventory-v2/migration/commit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mappingIds: confirmedIds }) });
        const d = await commitRes.json();
        setLog(`Commit xong: ${d.results?.length || 0} thành công, ${d.errors?.length || 0} lỗi.` + (d.errors?.length ? ' ' + d.errors.map(e => e.message).join('; ') : ''));
        const r = await fetch('/api/inventory-v2/migration/reconciliation').then(r => r.json());
        setReconciliation(r.data || []);
        setCommitting(false);
    };

    if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang quét dữ liệu kho cũ...</div>;

    return (
        <div>
            <div className="card" style={{ marginBottom: 16 }}>
                <div className="card-header">
                    <h3 style={{ margin: 0 }}>Di trú dữ liệu kho cũ → Kho 2.0</h3>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-ghost" disabled={saving} onClick={confirmAll}>1️⃣ Xác nhận quyết định đã chọn</button>
                        <button className="btn btn-primary" disabled={committing} onClick={commitConfirmed}>2️⃣ Commit (ghi dữ liệu)</button>
                    </div>
                </div>
                {log && <div style={{ padding: '10px 20px', fontSize: 13, color: 'var(--text-muted)' }}>{log}</div>}
                <div style={{ padding: '0 20px 16px', fontSize: 13, color: 'var(--text-muted)' }}>
                    Dữ liệu kho cũ ({scan.products.length} mã) chỉ ĐỌC — không xóa/sửa. Với mỗi mã, chọn &quot;Tạo mã mới&quot; hoặc &quot;Gộp vào vật tư đã có&quot; trong Kho 2.0, rồi xác nhận và commit.
                </div>
            </div>

            <div className="card">
                <div className="table-container">
                    <table className="data-table">
                        <thead><tr><th>Mã cũ</th><th>Tên</th><th style={{ textAlign: 'right' }}>Tồn</th><th>Cảnh báo</th><th>Quyết định</th><th>Gộp vào vật tư</th></tr></thead>
                        <tbody>
                            {scan.products.map(p => {
                                const flags = flagsByProduct[p.id] || [];
                                const decision = decisions[p.id] || {};
                                return (
                                    <tr key={p.id}>
                                        <td className="accent">{p.code}</td>
                                        <td className="primary">{p.name}</td>
                                        <td style={{ textAlign: 'right' }}>{p.stock} {p.unit}</td>
                                        <td style={{ fontSize: 11, color: '#dc2626' }}>{flags.map(f => f.message).join('; ')}</td>
                                        <td>
                                            <select className="form-select" style={{ minWidth: 160 }} value={decision.decision || ''} onChange={e => setDecision(p.id, { decision: e.target.value })}>
                                                <option value="">— Chưa chọn —</option>
                                                <option value="CREATE_NEW">Tạo mã mới</option>
                                                <option value="MERGE_INTO_EXISTING">Gộp vào vật tư có sẵn</option>
                                                <option value="SKIPPED">Bỏ qua</option>
                                            </select>
                                        </td>
                                        <td>
                                            {decision.decision === 'MERGE_INTO_EXISTING' && (
                                                <select className="form-select" style={{ minWidth: 200 }} value={decision.targetMaterialId || ''} onChange={e => setDecision(p.id, { targetMaterialId: e.target.value })}>
                                                    <option value="">— Chọn vật tư —</option>
                                                    {materials.map(m => <option key={m.id} value={m.id}>{m.sku} — {m.name}</option>)}
                                                </select>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {reconciliation.length > 0 && (
                <div className="card" style={{ marginTop: 16 }}>
                    <div className="card-header"><h3 style={{ margin: 0 }}>Bảng đối chiếu tồn cũ vs tồn mới</h3></div>
                    <div className="table-container">
                        <table className="data-table">
                            <thead><tr><th>Mã cũ</th><th>SKU mới</th><th style={{ textAlign: 'right' }}>Tồn cũ</th><th style={{ textAlign: 'right' }}>Tồn mới</th><th style={{ textAlign: 'right' }}>Giá trị cũ</th><th style={{ textAlign: 'right' }}>Giá trị mới</th><th style={{ textAlign: 'right' }}>Chênh lệch</th></tr></thead>
                            <tbody>
                                {reconciliation.map(r => (
                                    <tr key={r.mappingId}>
                                        <td>{r.legacyCode}</td><td className="accent">{r.newSku || '—'}</td>
                                        <td style={{ textAlign: 'right' }}>{r.legacyStock}</td><td style={{ textAlign: 'right' }}>{r.newStock}</td>
                                        <td style={{ textAlign: 'right' }}>{fmt(r.legacyValue)}</td><td style={{ textAlign: 'right' }}>{fmt(r.newValue)}</td>
                                        <td style={{ textAlign: 'right', color: Math.abs(r.delta) > 1 ? '#dc2626' : '#16a34a' }}>{fmt(r.delta)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
