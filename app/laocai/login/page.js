'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const C = {
    primary: '#0f766e',
    primaryDark: '#0d5c56',
    primaryLight: '#14b8a6',
    bg: '#f0fdfa',
    white: '#ffffff',
    gray: '#64748b',
    grayLight: '#f1f5f9',
    border: '#e2e8f0',
    error: '#ef4444',
};

export default function LaoCaiLogin() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setLoading(true);
        // TODO: thay bằng API thật /api/laocai/auth/login
        await new Promise(r => setTimeout(r, 800));
        if (email === 'admin@laocai.com' && password === '123456') {
            localStorage.setItem('lc_token', 'demo-token-laocai');
            localStorage.setItem('lc_user', JSON.stringify({ name: 'Admin LC', email, role: 'admin' }));
            router.push('/laocai/dashboard');
        } else {
            setError('Email hoặc mật khẩu không đúng');
        }
        setLoading(false);
    }

    return (
        <div style={{ minHeight: '100vh', background: `linear-gradient(135deg, ${C.primaryDark} 0%, ${C.primary} 50%, ${C.primaryLight} 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <div style={{ width: '100%', maxWidth: 420 }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div style={{ width: 72, height: 72, borderRadius: 20, background: C.white, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
                        <span style={{ fontSize: 26, fontWeight: 800, color: C.primary, letterSpacing: -1 }}>LC</span>
                    </div>
                    <h1 style={{ color: C.white, fontSize: 22, fontWeight: 700, margin: 0 }}>Nội Thất SCT</h1>
                    <p style={{ color: 'rgba(255,255,255,0.8)', margin: '6px 0 0', fontSize: 14 }}>Chi Nhánh Lào Cai</p>
                </div>

                {/* Card */}
                <div style={{ background: C.white, borderRadius: 20, padding: '36px 32px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
                    <h2 style={{ margin: '0 0 24px', fontSize: 18, fontWeight: 700, color: '#1e293b' }}>Đăng nhập</h2>

                    {error && (
                        <div style={{ background: '#fef2f2', border: `1px solid #fecaca`, borderRadius: 10, padding: '10px 14px', marginBottom: 16, color: C.error, fontSize: 14 }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: 16 }}>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="email@laocai.com"
                                required
                                style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 14, outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                                onFocus={e => e.target.style.borderColor = C.primary}
                                onBlur={e => e.target.style.borderColor = C.border}
                            />
                        </div>
                        <div style={{ marginBottom: 24 }}>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Mật khẩu</label>
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 14, outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                                onFocus={e => e.target.style.borderColor = C.primary}
                                onBlur={e => e.target.style.borderColor = C.border}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            style={{ width: '100%', padding: '13px', borderRadius: 10, border: 'none', background: loading ? C.gray : `linear-gradient(135deg, ${C.primaryDark}, ${C.primary})`, color: C.white, fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s', boxShadow: loading ? 'none' : '0 4px 15px rgba(15,118,110,0.4)' }}
                        >
                            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                        </button>
                    </form>

                    <p style={{ textAlign: 'center', margin: '20px 0 0', fontSize: 12, color: C.gray }}>
                        Demo: admin@laocai.com / 123456
                    </p>
                </div>
            </div>
        </div>
    );
}
