'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/fetchClient';
import { useToast } from '@/components/ui/Toast';
import LessonForm from '@/components/lessons-learned/LessonForm';
import { GraduationCap } from 'lucide-react';

export default function NewLessonPage() {
    const router = useRouter();
    const toast = useToast();
    const [customers, setCustomers] = useState([]);
    const [projects, setProjects] = useState([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetch('/api/customers?limit=1000').then(r => r.json()).then(d => setCustomers(d.data || []));
        fetch('/api/projects?limit=1000').then(r => r.json()).then(d => setProjects(d.data || []));
    }, []);

    const handleSubmit = async (form, err) => {
        if (err) return toast.error(err);
        setSaving(true);
        try {
            const saved = await apiFetch('/api/lessons-learned', { method: 'POST', body: JSON.stringify(form) });
            toast.success(`Đã tạo bài học ${saved.code}`);
            router.push(`/lessons-learned/${saved.id}`);
        } catch (e) {
            toast.error(e.message);
        }
        setSaving(false);
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><GraduationCap size={22} /> Thêm bài học dự án</h2>
                <button className="btn btn-ghost" onClick={() => router.back()}>← Quay lại</button>
            </div>
            <LessonForm customers={customers} projects={projects} onSubmit={handleSubmit} saving={saving} submitLabel="Tạo bài học" canEditStatus={false} />
        </div>
    );
}
