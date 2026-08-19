'use client';
import { useEffect, useRef, useState } from 'react';

const EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const DEBOUNCE_MS = 3000;

export default function useAutoSaveDraft({ key, data, onRestore, enabled = true }) {
    const [restored, setRestored] = useState(false);
    const timerRef = useRef(null);
    const initialRef = useRef(true);

    // On mount: check for draft and offer restore
    useEffect(() => {
        if (!key || restored) return;
        try {
            const raw = localStorage.getItem(key);
            if (!raw) { setRestored(true); return; }
            const draft = JSON.parse(raw);
            if (!draft || !draft._savedAt) { setRestored(true); return; }
            // Check expiry
            if (Date.now() - draft._savedAt > EXPIRY_MS) {
                localStorage.removeItem(key);
                setRestored(true);
                return;
            }
            // Restore
            const { _savedAt, ...draftData } = draft;
            onRestore(draftData);
        } catch {
            // ignore parse errors
        }
        setRestored(true);
    }, [key, onRestore, restored]);

    // Debounced save
    useEffect(() => {
        if (!key || !enabled || !restored) return;
        // Skip saving on initial mount
        if (initialRef.current) {
            initialRef.current = false;
            return;
        }
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            try {
                localStorage.setItem(key, JSON.stringify({ ...data, _savedAt: Date.now() }));
            } catch {
                // quota exceeded or other error, silently ignore
            }
        }, DEBOUNCE_MS);

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [key, data, enabled, restored]);

    const clearDraft = () => {
        try { localStorage.removeItem(key); } catch {}
    };

    return { clearDraft };
}
