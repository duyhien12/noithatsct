'use client';

import { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LogIn, Eye, EyeOff, AlertCircle, UserPlus, KeyRound, CheckCircle } from 'lucide-react';

const SCT_ORANGE = '#F47920';
const SCT_DARK = '#E8621A';

const LogoIcon = () => (
    <div style={{
        width: 80, height: 80, borderRadius: 20,
        background: SCT_ORANGE,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 16px',
        boxShadow: '0 8px 24px rgba(244,121,32,0.4)',
    }}>
        <svg width="44" height="44" viewBox="0 0 48 48" fill="none">
            <path d="M12 8 L12 40" stroke="white" strokeWidth="7" strokeLinecap="round" />
            <path d="M12 24 L34 8" stroke="white" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M12 24 L34 40" stroke="white" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M20 16 L28 24" stroke={SCT_ORANGE} strokeWidth="3" strokeLinecap="round" />
            <path d="M20 32 L28 24" stroke={SCT_ORANGE} strokeWidth="3" strokeLinecap="round" />
        </svg>
    </div>
);

const inputStyle = {
    width: '100%', padding: '12px 14px', borderRadius: 8,
    border: '1.5px solid #E5E7EB', fontSize: 15, outline: 'none',
    boxSizing: 'border-box', transition: 'border-color 0.2s',
};

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
    const [tab, setTab] = useState('login'); // login | register | forgot
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    // Login state
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Register state
    const [regName, setRegName] = useState('');
    const [regEmail, setRegEmail] = useState('');
    const [regDept, setRegDept] = useState('');
    const [regPass, setRegPass] = useState('');
    const [regPassConfirm, setRegPassConfirm] = useState('');
    const [showRegPass, setShowRegPass] = useState(false);

    // Forgot state
    const [forgotEmail, setForgotEmail] = useState('');
    const [newPass, setNewPass] = useState('');
    const [showNewPass, setShowNewPass] = useState(false);

    const switchTab = (t) => { setTab(t); setError(''); setSuccess(''); };

    const handleLogin = async (e) => {
        e.preventDefault();
        setError(''); setLoading(true);
        const result = await signIn('credentials', { email, password, redirect: false });
        setLoading(false);
        if (result?.error) setError('Email hoặc mật khẩu không đúng');
        else { router.push(callbackUrl); router.refresh(); }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError(''); setSuccess('');
        if (regPass !== regPassConfirm) { setError('Mật khẩu xác nhận không khớp'); return; }
        setLoading(true);
        const res = await fetch('/api/auth/register', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: regName, email: regEmail, password: regPass, department: regDept }),
        });
        const data = await res.json();
        setLoading(false);
        if (!res.ok) { setError(data.error || 'Đăng ký thất bại'); return; }
        setSuccess('Đăng ký thành công! Hãy chuyển sang tab Đăng nhập để vào hệ thống.');
    };

    const handleForgot = async (e) => {
        e.preventDefault();
        setError(''); setSuccess('');
        if (!newPass) { setError('Vui lòng nhập mật khẩu mới'); return; }
        setLoading(true);
        const res = await fetch('/api/auth/reset-password', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: forgotEmail, newPassword: newPass }),
        });
        const data = await res.json();
        setLoading(false);
        if (!res.ok) { setError(data.error || 'Thất bại'); return; }
        setSuccess('Mật khẩu đã được cập nhật! Hãy đăng nhập lại.');
        setTimeout(() => switchTab('login'), 2000);
    };

    const tabs = [
        { key: 'login', label: 'Đăng nhập', icon: <LogIn size={14} /> },
        { key: 'register', label: 'Đăng ký', icon: <UserPlus size={14} /> },
        { key: 'forgot', label: 'Quên MK', icon: <KeyRound size={14} /> },
    ];

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `linear-gradient(160deg, ${SCT_ORANGE} 0%, ${SCT_DARK} 60%, #C94F12 100%)`,
            padding: 16,
        }}>
            <div style={{
                background: 'white', borderRadius: 20, padding: '40px 28px 32px',
                width: '100%', maxWidth: 420,
                boxShadow: '0 24px 80px rgba(0,0,0,0.25)',
            }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <LogoIcon />
                    <h1 style={{ fontSize: 26, fontWeight: 800, color: SCT_ORANGE, margin: 0, letterSpacing: '-0.5px' }}>HomeSCT</h1>
                    <p style={{ color: '#999', marginTop: 4, fontSize: 12 }}>Kiến Trúc Đô Thị SCT · Cùng bạn xây dựng ước mơ</p>
                </div>

                {/* Tab bar */}
                <div style={{
                    display: 'flex', background: '#F3F4F6', borderRadius: 10,
                    padding: 4, marginBottom: 24, gap: 2,
                }}>
                    {tabs.map(t => (
                        <button key={t.key} onClick={() => switchTab(t.key)} style={{
                            flex: 1, padding: '8px 4px', borderRadius: 8, border: 'none',
                            cursor: 'pointer', fontSize: 12, fontWeight: 600,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                            transition: 'all 0.2s',
                            background: tab === t.key ? 'white' : 'transparent',
                            color: tab === t.key ? SCT_ORANGE : '#6B7280',
                            boxShadow: tab === t.key ? '0 1px 4px rgba(0,0,0,0.12)' : 'none',
                        }}>{t.icon}{t.label}</button>
                    ))}
                </div>

                {/* Error / Success */}
                {error && (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        background: '#FEF2F2', border: '1px solid #FECACA',
                        borderRadius: 8, padding: '10px 14px', marginBottom: 16,
                        color: '#DC2626', fontSize: 13,
                    }}><AlertCircle size={15} />{error}</div>
                )}
                {success && (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        background: '#F0FDF4', border: '1px solid #BBF7D0',
                        borderRadius: 8, padding: '10px 14px', marginBottom: 16,
                        color: '#16A34A', fontSize: 13,
                    }}><CheckCircle size={15} />{success}</div>
                )}

                {/* ===== ĐĂNG NHẬP ===== */}
                {tab === 'login' && (
                    <form onSubmit={handleLogin}>
                        <div style={{ marginBottom: 16 }}>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Email</label>
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                                placeholder="admin@kientrucsct.com" required autoFocus style={inputStyle} />
                        </div>
                        <div style={{ marginBottom: 24 }}>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Mật khẩu</label>
                            <div style={{ position: 'relative' }}>
                                <input type={showPassword ? 'text' : 'password'} value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="Nhập mật khẩu" required
                                    style={{ ...inputStyle, paddingRight: 48 }} />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{
                                    position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)',
                                    background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF',
                                    padding: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                            </div>
                        </div>
                        <button type="submit" disabled={loading} style={{
                            width: '100%', padding: '13px 20px', borderRadius: 10,
                            background: loading ? '#9CA3AF' : `linear-gradient(135deg, ${SCT_ORANGE}, ${SCT_DARK})`,
                            color: 'white', fontWeight: 700, fontSize: 15,
                            border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            boxShadow: loading ? 'none' : '0 4px 14px rgba(244,121,32,0.4)',
                        }}>
                            <LogIn size={18} />{loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                        </button>
                    </form>
                )}

                {/* ===== ĐĂNG KÝ ===== */}
                {tab === 'register' && (
                    <form onSubmit={handleRegister}>
                        <div style={{ marginBottom: 14 }}>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Họ tên *</label>
                            <input value={regName} onChange={e => setRegName(e.target.value)}
                                placeholder="Nguyễn Văn A" required autoFocus style={inputStyle} />
                        </div>
                        <div style={{ marginBottom: 14 }}>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Email *</label>
                            <input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)}
                                placeholder="email@kientrucsct.com" required style={inputStyle} />
                        </div>
                        <div style={{ marginBottom: 14 }}>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Phòng ban</label>
                            <select value={regDept} onChange={e => setRegDept(e.target.value)} style={{ ...inputStyle, color: regDept ? '#111827' : '#9CA3AF', background: 'white' }}>
                                <option value="">— Chọn phòng ban —</option>
                                <option>Phòng xây dựng</option>
                                <option>Phòng kinh doanh</option>
                                <option>Phòng thiết kế</option>
                                <option>Phòng hành chính kế toán</option>
                                <option>Marketing</option>
                                <option>Xưởng nội thất</option>
                            </select>
                        </div>
                        <div style={{ marginBottom: 14 }}>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Mật khẩu *</label>
                            <div style={{ position: 'relative' }}>
                                <input type={showRegPass ? 'text' : 'password'} value={regPass}
                                    onChange={e => setRegPass(e.target.value)}
                                    placeholder="Ít nhất 6 ký tự" required
                                    style={{ ...inputStyle, paddingRight: 48 }} />
                                <button type="button" onClick={() => setShowRegPass(!showRegPass)} style={{
                                    position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)',
                                    background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF',
                                    padding: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>{showRegPass ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                            </div>
                        </div>
                        <div style={{ marginBottom: 20 }}>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Xác nhận mật khẩu *</label>
                            <input type="password" value={regPassConfirm} onChange={e => setRegPassConfirm(e.target.value)}
                                placeholder="Nhập lại mật khẩu" required style={inputStyle} />
                        </div>
                        <button type="submit" disabled={loading} style={{
                            width: '100%', padding: '13px 20px', borderRadius: 10,
                            background: loading ? '#9CA3AF' : `linear-gradient(135deg, ${SCT_ORANGE}, ${SCT_DARK})`,
                            color: 'white', fontWeight: 700, fontSize: 15,
                            border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            boxShadow: loading ? 'none' : '0 4px 14px rgba(244,121,32,0.4)',
                        }}>
                            <UserPlus size={18} />{loading ? 'Đang xử lý...' : 'Tạo tài khoản'}
                        </button>
                        <p style={{ textAlign: 'center', fontSize: 12, color: '#9CA3AF', marginTop: 12 }}>
                            Tài khoản được kích hoạt ngay sau khi đăng ký
                        </p>
                    </form>
                )}

                {/* ===== QUÊN MẬT KHẨU ===== */}
                {tab === 'forgot' && (
                    <form onSubmit={handleForgot}>
                        <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 16, lineHeight: 1.5 }}>
                            Nhập email tài khoản và mật khẩu mới để đặt lại.
                        </p>
                        <div style={{ marginBottom: 14 }}>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Email tài khoản *</label>
                            <input type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                                placeholder="email@kientrucsct.com" required autoFocus style={inputStyle} />
                        </div>
                        <div style={{ marginBottom: 24 }}>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Mật khẩu mới *</label>
                            <div style={{ position: 'relative' }}>
                                <input type={showNewPass ? 'text' : 'password'} value={newPass}
                                    onChange={e => setNewPass(e.target.value)}
                                    placeholder="Ít nhất 6 ký tự" required
                                    style={{ ...inputStyle, paddingRight: 48 }} />
                                <button type="button" onClick={() => setShowNewPass(!showNewPass)} style={{
                                    position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)',
                                    background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF',
                                    padding: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>{showNewPass ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                            </div>
                        </div>
                        <button type="submit" disabled={loading} style={{
                            width: '100%', padding: '13px 20px', borderRadius: 10,
                            background: loading ? '#9CA3AF' : `linear-gradient(135deg, ${SCT_ORANGE}, ${SCT_DARK})`,
                            color: 'white', fontWeight: 700, fontSize: 15,
                            border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            boxShadow: loading ? 'none' : '0 4px 14px rgba(244,121,32,0.4)',
                        }}>
                            <KeyRound size={18} />{loading ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
