'use client';

import { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LogIn, Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function LoginPage() {
    return (
        <Suspense>
            <LoginForm />
        </Suspense>
    );
}

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get('callbackUrl') || '/';
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const result = await signIn('credentials', {
            email,
            password,
            redirect: false,
        });

        setLoading(false);

        if (result?.error) {
            setError('Email hoặc mật khẩu không đúng');
        } else {
            router.push(callbackUrl);
            router.refresh();
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #1C3A6B 0%, #0F2341 100%)',
            padding: 16,
        }}>
            <div style={{
                background: 'white',
                borderRadius: 16,
                padding: '40px 24px',
                width: '100%',
                maxWidth: 420,
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}>
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div style={{
                        width: 64, height: 64, borderRadius: 16,
                        background: 'linear-gradient(135deg, #1C3A6B, #2A5298)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 16px', color: '#C9A84C', fontSize: 28, fontWeight: 700,
                    }}>H</div>
                    <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1C3A6B', margin: 0 }}>HomeERP</h1>
                    <p style={{ color: '#666', marginTop: 4, fontSize: 14 }}>Nội thất & Xây dựng</p>
                </div>

                <form onSubmit={handleSubmit}>
                    {error && (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            background: '#FEF2F2', border: '1px solid #FECACA',
                            borderRadius: 8, padding: '10px 14px', marginBottom: 20,
                            color: '#DC2626', fontSize: 14,
                        }}>
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    <div style={{ marginBottom: 16 }}>
                        <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
                            Email
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="admin@motnha.vn"
                            required
                            autoFocus
                            style={{
                                width: '100%', padding: '12px 14px', borderRadius: 8,
                                border: '1px solid #D1D5DB', fontSize: 16, outline: 'none',
                                boxSizing: 'border-box',
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: 24 }}>
                        <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
                            Mật khẩu
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="Nhập mật khẩu"
                                required
                                style={{
                                    width: '100%', padding: '12px 48px 12px 14px', borderRadius: 8,
                                    border: '1px solid #D1D5DB', fontSize: 16, outline: 'none',
                                    boxSizing: 'border-box',
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)',
                                    background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF',
                                    padding: 10, minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: '100%', padding: '12px 20px', borderRadius: 8,
                            background: loading ? '#9CA3AF' : 'linear-gradient(135deg, #1C3A6B, #2A5298)',
                            color: 'white', fontWeight: 600, fontSize: 15,
                            border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        }}
                    >
                        <LogIn size={18} />
                        {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                    </button>
                </form>
            </div>
        </div>
    );
}
