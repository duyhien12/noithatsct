'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRole } from '@/contexts/RoleContext';
import { apiFetch } from '@/lib/fetchClient';
import { useToast } from '@/components/ui/Toast';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

const MANAGE_ROLES = ['ban_gd', 'giam_doc', 'pho_gd', 'admin'];

export default function DesignPriceListSettingsPage() {
    const { role } = useRole();
    const router = useRouter();
    const toast = useToast();

    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newItem, setNewItem] = useState({ name: '', unit: '', defaultUnitPrice: 0 });
    const [deleteTarget, setDeleteTarget] = useState(null);

    const canManage = MANAGE_ROLES.includes(role);

    const load = () => {
        apiFetch('/api/design-orders/price-list').then(setItems).catch(e => toast.error(e.message)).finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    if (!loading && !canManage) {
        return (
            <div className="card" style={{ padding: 40, textAlign: 'center' }}>
                <p>Bạn không có quyền quản lý bảng đơn giá.</p>
                <button className="btn btn-ghost" onClick={() => router.push('/design-orders')}>← Quay lại</button>
            </div>
        );
    }

    const updateItem = async (id, patch) => {
        try {
            const updated = await apiFetch(`/api/design-orders/price-list/${id}`, { method: 'PUT', body: JSON.stringify(patch) });
            setItems(prev => prev.map(it => (it.id === id ? updated : it)));
        } catch (e) {
            toast.error(e.message);
        }
    };

    const addItem = async () => {
        if (!newItem.name.trim()) return toast.error('Nhập tên hạng mục!');
        try {
            const created = await apiFetch('/api/design-orders/price-list', { method: 'POST', body: JSON.stringify(newItem) });
            setItems(prev => [...prev, created]);
            setNewItem({ name: '', unit: '', defaultUnitPrice: 0 });
            toast.success('Đã thêm dòng đơn giá');
        } catch (e) {
            toast.error(e.message);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await apiFetch(`/api/design-orders/price-list/${deleteTarget.id}`, { method: 'DELETE' });
            setItems(prev => prev.filter(it => it.id !== deleteTarget.id));
            toast.success('Đã xóa');
        } catch (e) {
            toast.error(e.message);
        }
        setDeleteTarget(null);
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ margin: 0 }}>⚙️ Bảng đơn giá mẫu — Phiếu đặt hàng thiết kế</h2>
                <button className="btn btn-ghost" onClick={() => router.push('/design-orders')}>← Quay lại</button>
            </div>

            <div className="card">
                <div className="card-header"><h3>Danh sách hạng mục & đơn giá</h3></div>
                {loading ? (
                    <div style={{ padding: 40, textAlign: 'center' }}>Đang tải...</div>
                ) : (
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr><th>Tên hạng mục</th><th style={{ width: 100 }}>Đơn vị</th><th style={{ width: 160 }}>Đơn giá mặc định</th><th style={{ width: 80 }}>Hiển thị</th><th style={{ width: 60 }}></th></tr>
                            </thead>
                            <tbody>
                                {items.map(it => (
                                    <tr key={it.id}>
                                        <td><input className="form-input form-input-compact" defaultValue={it.name} onBlur={e => e.target.value !== it.name && updateItem(it.id, { name: e.target.value })} style={{ width: '100%' }} /></td>
                                        <td><input className="form-input form-input-compact" defaultValue={it.unit} onBlur={e => e.target.value !== it.unit && updateItem(it.id, { unit: e.target.value })} style={{ width: '100%' }} /></td>
                                        <td><input className="form-input form-input-compact" type="number" min="0" defaultValue={it.defaultUnitPrice} onBlur={e => Number(e.target.value) !== it.defaultUnitPrice && updateItem(it.id, { defaultUnitPrice: Number(e.target.value) || 0 })} style={{ width: '100%', textAlign: 'right' }} /></td>
                                        <td style={{ textAlign: 'center' }}><input type="checkbox" checked={it.active} onChange={e => updateItem(it.id, { active: e.target.checked })} /></td>
                                        <td><button className="btn btn-ghost" style={{ padding: '2px 6px', fontSize: 11, color: 'var(--status-danger)' }} onClick={() => setDeleteTarget(it)}>✕</button></td>
                                    </tr>
                                ))}
                                <tr style={{ background: 'var(--bg-hover)' }}>
                                    <td><input className="form-input form-input-compact" placeholder="Tên hạng mục mới" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} style={{ width: '100%' }} /></td>
                                    <td><input className="form-input form-input-compact" placeholder="ĐVT" value={newItem.unit} onChange={e => setNewItem({ ...newItem, unit: e.target.value })} style={{ width: '100%' }} /></td>
                                    <td><input className="form-input form-input-compact" type="number" min="0" placeholder="0" value={newItem.defaultUnitPrice || ''} onChange={e => setNewItem({ ...newItem, defaultUnitPrice: Number(e.target.value) || 0 })} style={{ width: '100%', textAlign: 'right' }} /></td>
                                    <td></td>
                                    <td><button className="btn btn-primary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={addItem}>+ Thêm</button></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <ConfirmDialog
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
                title="Xóa dòng đơn giá"
                message={`Xác nhận xóa "${deleteTarget?.name}"?`}
            />
        </div>
    );
}
