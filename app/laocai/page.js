'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LaoCaiRoot() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/laocai/dashboard');
    }, [router]);
    return null;
}
