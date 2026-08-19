'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/fetchClient';
import { useToast } from '@/components/ui/Toast';
import LessonForm from '@/components/lessons-learned/LessonForm';
import { GraduationCap } from 'lucide-react';

export default function EditLessonPage() {
    const { id } = useParams();
    const router = useRouter();
    const toast = useToast();
    const [lesson, setLesson] = useState(null);
    const [customers, setCustomers] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const load = useCallback(() => {
        apiFetch(`/api/lessons-learned/${id}`).then(setLesson).catch(e => toast.error(e.message)).finally(() => setLoading(false));
    }, [id, toast]);

    useEffect(() => { load(); }, [load]);
    useEffect(() => {
        fetch('/api/customers?limit=1000').then(r => r.json()).then(d => setCustomers(d.data || []));
        fetch('/api/projects?limit=1000').then(r => r.json()).then(d => setProjects(d.data || []));
    }, []);

    const handleSubmit = async (form, err) => {
        if (err) return toast.error(err);
        setSaving(true);
        try {
            await apiFetch(`/api/lessons-learned/${id}`, { method: 'PUT', body: JSON.stringify(form) });
            toast.success('Đã cập nhật bài học');
            router.push(`/lessons-learned/${id}`);
        } catch (e) {
            toast.error(e.message);
        }
        setSaving(false);
    };

    if (loading) return <div style={{ padding: 60, textAlign: 'center' }}>Đang tải...</div>;
    if (!lesson) return <div style={{ padding: 60, textAlign: 'center', color: 'var(--status-danger)' }}>Không tìm thấy bài học</div>;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><GraduationCap size={22} /> Sửa bài học {lesson.code}</h2>
                <button className="btn btn-ghost" onClick={() => router.back()}>← Quay lại</button>
            </div>
            <LessonForm initial={lesson} customers={customers} projects={projects} onSubmit={handleSubmit} saving={saving} submitLabel="Lưu thay đổi" canEditStatus={false} />
        </div>
    );
}
