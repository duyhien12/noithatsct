'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
const fmtNum = (n) => new Intl.NumberFormat('vi-VN').format(n || 0);
const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);

export default function PrintDocumentPage() {
    const { id } = useParams();
    const [doc, setDoc] = useState(null);

    useEffect(() => { fetch(`/api/inventory-v2/documents/${id}`).then(r => r.json()).then(setDoc); }, [id]);

    if (!doc || doc.error) return <div style={{ padding: 40 }}>Đang tải...</div>;
    const canViewCost = doc.totalAmount !== undefined;

    return (
        <div className="ai-doc-print-sheet" style={{ maxWidth: 800, margin: '0 auto', padding: 24, fontFamily: 'inherit' }}>
            <div className="xxx-print-toolbar" style={{ textAlign: 'right', marginBottom: 16 }}>
                <button className="btn btn-primary" onClick={() => window.print()}>🖨 In phiếu</button>
            </div>
            <h2 style={{ textAlign: 'center', marginBottom: 4 }}>Kiến Trúc Đô Thị SCT — Kho vật tư xưởng 2.0</h2>
            <h3 style={{ textAlign: 'center', marginTop: 0 }}>PHIẾU {doc.docType}</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', margin: '16px 0', fontSize: 14 }}>
                <div>Số phiếu: <strong>{doc.code}</strong></div>
                <div>Ngày: <strong>{fmtDate(doc.docDate)}</strong></div>
            </div>
            <div style={{ fontSize: 14, marginBottom: 16 }}>
                <div>Kho: <strong>{doc.warehouse?.name}</strong>{doc.targetWarehouse ? ` → ${doc.targetWarehouse.name}` : ''}</div>
                {doc.project && <div>Công trình: <strong>{doc.project.name}</strong></div>}
                {doc.supplier && <div>Nhà cung cấp: <strong>{doc.supplier.name}</strong></div>}
                {doc.delivererName && <div>Người giao: <strong>{doc.delivererName}</strong></div>}
                {doc.receiverName && <div>Người nhận: <strong>{doc.receiverName}</strong></div>}
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                    <tr style={{ borderBottom: '2px solid #333' }}>
                        <th style={{ textAlign: 'left', padding: 6 }}>Vật tư</th>
                        <th style={{ textAlign: 'right', padding: 6 }}>SL</th>
                        <th style={{ textAlign: 'left', padding: 6 }}>ĐVT</th>
                        {canViewCost && <><th style={{ textAlign: 'right', padding: 6 }}>Đơn giá</th><th style={{ textAlign: 'right', padding: 6 }}>Thành tiền</th></>}
                    </tr>
                </thead>
                <tbody>
                    {doc.lines.map(l => (
                        <tr key={l.id} style={{ borderBottom: '1px solid #ddd' }}>
                            <td style={{ padding: 6 }}>{l.material?.sku} — {l.material?.name}</td>
                            <td style={{ textAlign: 'right', padding: 6 }}>{fmtNum(l.enteredQuantity)}</td>
                            <td style={{ padding: 6 }}>{l.enteredUnit?.code}</td>
                            {canViewCost && <><td style={{ textAlign: 'right', padding: 6 }}>{fmt(l.unitPrice)}</td><td style={{ textAlign: 'right', padding: 6 }}>{fmt(l.amount)}</td></>}
                        </tr>
                    ))}
                </tbody>
                {canViewCost && (
                    <tfoot><tr><td colSpan={4} style={{ textAlign: 'right', fontWeight: 700, padding: 6 }}>Tổng cộng</td><td style={{ textAlign: 'right', fontWeight: 700, padding: 6 }}>{fmt(doc.totalAmount)}</td></tr></tfoot>
                )}
            </table>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 48, fontSize: 13, textAlign: 'center' }}>
                <div>Người lập phiếu<br /><br /><br />______________</div>
                <div>Người giao hàng<br /><br /><br />______________</div>
                <div>Người nhận hàng<br /><br /><br />______________</div>
                <div>Người duyệt<br /><br /><br />______________</div>
            </div>
        </div>
    );
}
