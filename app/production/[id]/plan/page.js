'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Factory, GitBranch } from 'lucide-react';
import ProductionPlanPanel from '../ProductionPlanPanel';

export default function ProductionPlanPage() {
    const router = useRouter();
    const { id } = useParams();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchOrder = useCallback(async () => {
        const res = await fetch(`/api/production/${id}`);
        const data = await res.json();
        setOrder(data);
        setLoading(false);
    }, [id]);

    useEffect(() => { fetchOrder(); }, [fetchOrder]);

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 12 }}>
            <div style={{ width: 36, height: 36, border: '3px solid #e5e7eb', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <span style={{ color: '#6b7280' }}>Đang tải...</span>
        </div>
    );

    if (!order) return (
        <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Không tìm thấy đơn sản xuất.</div>
    );

    return (
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '20px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
                <button onClick={() => router.push(`/production/${id}`)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 11px', borderRadius: 8, border: '1px solid #e5e7eb', background: 'white', color: '#374151', fontSize: 13, cursor: 'pointer', flexShrink: 0 }}>
                    <ArrowLeft size={14} /> Chi tiết đơn
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, flex: 1, minWidth: 0 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Factory size={17} color="white" />
                    </div>
                    <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 11, color: '#6b7280' }}>{order.project.code}</div>
                        <h1 style={{ fontSize: 17, fontWeight: 700, color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{order.project.name}</h1>
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 12 }}>
                <GitBranch size={14} /> Kế hoạch BC sản xuất
            </div>

            <ProductionPlanPanel projectId={order.project.id} />
        </div>
    );
}
