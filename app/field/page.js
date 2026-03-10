'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE = 'https://api.kientrucsct.com';

export default function FieldLogin() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const token = localStorage.getItem('field_token');
        if (token) router.replace('/field/dashboard');
    }, [router]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${API_BASE}/api/auth/mobile`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Lỗi đăng nhập');
            localStorage.setItem('field_token', data.token);
            localStorage.setItem('field_user', JSON.stringify(data.user));
            router.replace('/field/dashboard');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <style>{`
                * { box-sizing: border-box; }
                input { -webkit-appearance: none; appearance: none; border-radius: 12px; }
                input:focus { outline: none; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                .card { animation: fadeIn 0.4s ease; }
            `}</style>
            <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'linear-gradient(160deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)' }}>
                {/* Logo / Brand */}
                <div style={{ marginBottom: 36, textAlign: 'center' }}>
                    <div style={{ width: 72, height: 72, borderRadius: 20, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 32 }}>
                        🏗️
                    </div>
                    <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#f8fafc' }}>Nội Thất SCT</h1>
                    <p style={{ margin: '6px 0 0', fontSize: 13, color: '#64748b' }}>Ứng dụng xưởng & công trình</p>
                </div>

                {/* Login Card */}
                <div className="card" style={{ width: '100%', maxWidth: 380, background: 'rgba(255,255,255,0.04)', borderRadius: 20, padding: '28px 24px', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <form onSubmit={handleLogin}>
                        <div style={{ marginBottom: 16 }}>
                            <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6, fontWeight: 500 }}>Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="ten@kientrucsct.com"
                                required
                                autoComplete="email"
                                style={{ width: '100%', padding: '14px 16px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#f8fafc', fontSize: 16, transition: 'border 0.2s' }}
                                onFocus={e => e.target.style.borderColor = '#3b82f6'}
                                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                            />
                        </div>
                        <div style={{ marginBottom: 20 }}>
                            <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6, fontWeight: 500 }}>Mật khẩu</label>
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                autoComplete="current-password"
                                style={{ width: '100%', padding: '14px 16px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#f8fafc', fontSize: 16, transition: 'border 0.2s' }}
                                onFocus={e => e.target.style.borderColor = '#3b82f6'}
                                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                            />
                        </div>

                        {error && (
                            <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#f87171' }}>
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            style={{ width: '100%', padding: '15px', borderRadius: 12, border: 'none', background: loading ? '#334155' : 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: '#fff', fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', transition: 'opacity 0.2s' }}
                        >
                            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                        </button>
                    </form>
                </div>

                <p style={{ marginTop: 24, fontSize: 11, color: '#334155' }}>Phiên bản 1.0 • Nội Thất SCT</p>
            </div>
        </>
    );
}
