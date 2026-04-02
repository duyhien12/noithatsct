'use client';

import { useState, useEffect, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LogIn, Eye, EyeOff, AlertCircle, UserPlus, KeyRound, CheckCircle } from 'lucide-react';

/* ─── Constants ─────────────────────────────────────────────────── */
const SCT_ORANGE = '#F47920';
const SCT_DARK = '#E8621A';

const AUTH_ERRORS = {
    OAuthSignin: 'Không thể khởi động đăng nhập Google. Thử lại sau.',
    OAuthCallback: 'Google trả về lỗi xác thực. Thử lại sau.',
    OAuthCreateAccount: 'Không thể tạo tài khoản từ Google.',
    OAuthAccountNotLinked: 'Email này đã được đăng ký bằng mật khẩu. Hãy dùng form đăng nhập bên dưới.',
    AccountDisabled: 'Tài khoản của bạn đã bị vô hiệu hoá. Liên hệ quản trị viên.',
    DatabaseError: 'Lỗi hệ thống. Vui lòng thử lại sau.',
    Configuration: 'Google OAuth chưa được cấu hình.',
    AccessDenied: 'Quyền truy cập bị từ chối.',
    Callback: 'Lỗi xác thực. Thử lại.',
    Default: 'Đăng nhập thất bại. Vui lòng thử lại.',
};

const inputStyle = {
    width: '100%', padding: '12px 14px', borderRadius: 8,
    border: '1.5px solid #E5E7EB', fontSize: 15, outline: 'none',
    boxSizing: 'border-box', transition: 'border-color 0.2s', background: '#fff',
};

/* ─── Sub-components ────────────────────────────────────────────── */
const LogoIcon = () => (
    <div style={{
        width: 80, height: 80, borderRadius: 20, background: SCT_ORANGE,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 16px', boxShadow: '0 8px 24px rgba(244,121,32,0.4)',
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

const GoogleIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
);

// Nút Google — đặt NGOÀI LoginForm để tránh remount mỗi render
function GoogleButton({ label, onClick, loading }) {
    return (
        <>
            <button
                type="button"
                onClick={onClick}
                disabled={loading}
                style={{
                    width: '100%', padding: '12px 20px', borderRadius: 10, marginBottom: 14,
                    background: '#fff', border: '1.5px solid #E5E7EB',
                    cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.65 : 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                    fontSize: 14, fontWeight: 600, color: '#374151',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.08)', transition: 'box-shadow 0.2s',
                }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.14)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.08)'; }}
            >
                <GoogleIcon />
                {label}
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
                <div style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
                <span style={{ fontSize: 12, color: '#9CA3AF', whiteSpace: 'nowrap' }}>hoặc dùng email</span>
                <div style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
            </div>
        </>
    );
}

const SubmitButton = ({ loading, icon, label, loadingLabel }) => (
    <button type="submit" disabled={loading} style={{
        width: '100%', padding: '13px 20px', borderRadius: 10,
        background: loading ? '#9CA3AF' : `linear-gradient(135deg, ${SCT_ORANGE}, ${SCT_DARK})`,
        color: 'white', fontWeight: 700, fontSize: 15, border: 'none',
        cursor: loading ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        boxShadow: loading ? 'none' : '0 4px 14px rgba(244,121,32,0.4)',
        transition: 'opacity 0.2s',
    }}>
        {icon}{loading ? loadingLabel : label}
    </button>
);

const PasswordInput = ({ value, onChange, show, onToggle, placeholder = 'Nhập mật khẩu', required = true }) => (
    <div style={{ position: 'relative' }}>
        <input
            type={show ? 'text' : 'password'}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            required={required}
            style={{ ...inputStyle, paddingRight: 48 }}
        />
        <button type="button" onClick={onToggle} style={{
            position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF',
            padding: 10, display: 'flex', alignItems: 'center',
        }}>
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
    </div>
);

/* ─── Page ──────────────────────────────────────────────────────── */
export default function LoginPage() {
    return <Suspense><LoginForm /></Suspense>;
}

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get('callbackUrl') || '/';
    const urlError = searchParams.get('error');

    const [tab, setTab] = useState('login');
    const [error, setError] = useState(urlError ? (AUTH_ERRORS[urlError] || AUTH_ERRORS.Default) : '');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const [googleOn, setGoogleOn] = useState(false); // Google có được cấu hình không

    // Login
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false);

    // Register
    const [regName, setRegName] = useState('');
    const [regEmail, setRegEmail] = useState('');
    const [regDept, setRegDept] = useState('');
    const [regPass, setRegPass] = useState('');
    const [regPassConfirm, setRegPassConfirm] = useState('');
    const [showRegPass, setShowRegPass] = useState(false);

    // Forgot
    const [forgotEmail, setForgotEmail] = useState('');
    const [newPass, setNewPass] = useState('');
    const [showNewPass, setShowNewPass] = useState(false);

    // Kiểm tra Google OAuth đã cấu hình chưa
    useEffect(() => {
        fetch('/api/auth/google-status')
            .then(r => r.json())
            .then(d => setGoogleOn(!!d.configured))
            .catch(() => setGoogleOn(false));
    }, []);

    const switchTab = (t) => { setTab(t); setError(''); setSuccess(''); };

    /* ── Handlers ── */
    const handleGoogleSignIn = async () => {
        setError('');
        setLoading(true);
        try {
            await signIn('google', { callbackUrl });
        } catch {
            setError('Không thể kết nối Google. Vui lòng thử lại.');
            setLoading(false);
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setError(''); setLoading(true);
        const res = await signIn('credentials', { email, password, redirect: false });
        setLoading(false);
        if (res?.error) setError('Email hoặc mật khẩu không đúng');
        else { router.push(callbackUrl); router.refresh(); }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError(''); setSuccess('');
        if (regPass !== regPassConfirm) { setError('Mật khẩu xác nhận không khớp'); return; }
        if (regPass.length < 6) { setError('Mật khẩu phải có ít nhất 6 ký tự'); return; }
        setLoading(true);
        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: regName, email: regEmail, password: regPass, department: regDept }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || 'Đăng ký thất bại'); return; }
            setSuccess(data.message || 'Đăng ký thành công! Tài khoản cần được Admin kích hoạt trước khi đăng nhập.');
            setRegName(''); setRegEmail(''); setRegPass(''); setRegPassConfirm(''); setRegDept('');
        } catch {
            setError('Lỗi kết nối. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    const handleForgot = async (e) => {
        e.preventDefault();
        setError(''); setSuccess('');
        setLoading(true);
        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: forgotEmail, newPassword: newPass }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || 'Thất bại'); return; }
            setSuccess('Mật khẩu đã được cập nhật! Đang chuyển về đăng nhập...');
            setTimeout(() => switchTab('login'), 2000);
        } catch {
            setError('Lỗi kết nối. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
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
                boxShadow: '0 24px 80px rgba(0,0,0,0.28)',
            }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <LogoIcon />
                    <h1 style={{ fontSize: 26, fontWeight: 800, color: SCT_ORANGE, margin: 0 }}>HomeSCT</h1>
                    <p style={{ color: '#9CA3AF', marginTop: 4, fontSize: 12 }}>
                        Kiến Trúc Đô Thị SCT · Cùng bạn xây dựng ước mơ
                    </p>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', background: '#F3F4F6', borderRadius: 10, padding: 4, marginBottom: 24, gap: 2 }}>
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

                {/* Alert */}
                {error && (
                    <div style={{
                        display: 'flex', alignItems: 'flex-start', gap: 8,
                        background: '#FEF2F2', border: '1px solid #FECACA',
                        borderRadius: 8, padding: '10px 14px', marginBottom: 16,
                        color: '#DC2626', fontSize: 13, lineHeight: 1.5,
                    }}>
                        <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />{error}
                    </div>
                )}
                {success && (
                    <div style={{
                        display: 'flex', alignItems: 'flex-start', gap: 8,
                        background: '#F0FDF4', border: '1px solid #BBF7D0',
                        borderRadius: 8, padding: '10px 14px', marginBottom: 16,
                        color: '#16A34A', fontSize: 13, lineHeight: 1.5,
                    }}>
                        <CheckCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />{success}
                    </div>
                )}

                {/* ── ĐĂNG NHẬP ── */}
                {tab === 'login' && (
                    <form onSubmit={handleLogin} noValidate>
                        {googleOn && (
                            <GoogleButton
                                label="Tiếp tục với Google"
                                onClick={handleGoogleSignIn}
                                loading={loading}
                            />
                        )}
                        <div style={{ marginBottom: 16 }}>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Email</label>
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                                placeholder="admin@kientrucsct.com" required autoFocus style={inputStyle} />
                        </div>
                        <div style={{ marginBottom: 24 }}>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Mật khẩu</label>
                            <PasswordInput
                                value={password} onChange={e => setPassword(e.target.value)}
                                show={showPass} onToggle={() => setShowPass(v => !v)}
                            />
                        </div>
                        <SubmitButton
                            loading={loading} icon={<LogIn size={18} />}
                            label="Đăng nhập" loadingLabel="Đang đăng nhập..."
                        />
                    </form>
                )}

                {/* ── ĐĂNG KÝ ── */}
                {tab === 'register' && (
                    <form onSubmit={handleRegister} noValidate>
                        {googleOn && (
                            <GoogleButton
                                label="Đăng ký bằng Google"
                                onClick={handleGoogleSignIn}
                                loading={loading}
                            />
                        )}
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
                            <select value={regDept} onChange={e => setRegDept(e.target.value)}
                                style={{ ...inputStyle, color: regDept ? '#111827' : '#9CA3AF' }}>
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
                            <PasswordInput
                                value={regPass} onChange={e => setRegPass(e.target.value)}
                                show={showRegPass} onToggle={() => setShowRegPass(v => !v)}
                                placeholder="Ít nhất 6 ký tự"
                            />
                        </div>
                        <div style={{ marginBottom: 20 }}>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Xác nhận mật khẩu *</label>
                            <input type="password" value={regPassConfirm} onChange={e => setRegPassConfirm(e.target.value)}
                                placeholder="Nhập lại mật khẩu" required style={inputStyle} />
                        </div>
                        <SubmitButton
                            loading={loading} icon={<UserPlus size={18} />}
                            label="Tạo tài khoản" loadingLabel="Đang tạo tài khoản..."
                        />
                        <p style={{ textAlign: 'center', fontSize: 12, color: '#9CA3AF', marginTop: 10 }}>
                            Tài khoản kích hoạt ngay — không cần duyệt
                        </p>
                    </form>
                )}

                {/* ── QUÊN MẬT KHẨU ── */}
                {tab === 'forgot' && (
                    <form onSubmit={handleForgot} noValidate>
                        <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 16, lineHeight: 1.6 }}>
                            Nhập email tài khoản và mật khẩu mới để đặt lại.
                        </p>
                        <div style={{ marginBottom: 14 }}>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Email tài khoản *</label>
                            <input type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                                placeholder="email@kientrucsct.com" required autoFocus style={inputStyle} />
                        </div>
                        <div style={{ marginBottom: 24 }}>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Mật khẩu mới *</label>
                            <PasswordInput
                                value={newPass} onChange={e => setNewPass(e.target.value)}
                                show={showNewPass} onToggle={() => setShowNewPass(v => !v)}
                                placeholder="Ít nhất 6 ký tự"
                            />
                        </div>
                        <SubmitButton
                            loading={loading} icon={<KeyRound size={18} />}
                            label="Đặt lại mật khẩu" loadingLabel="Đang xử lý..."
                        />
                    </form>
                )}
            </div>
        </div>
    );
}
