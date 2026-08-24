'use client';

import { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LogIn, Eye, EyeOff, AlertCircle, UserPlus, CheckCircle, HelpCircle } from 'lucide-react';
import Modal from '@/components/ui/Modal';

/* ─── Constants ─────────────────────────────────────────────────── */
const SCT_ORANGE = '#F47920';
const SCT_DARK = '#E8621A';

const AUTH_ERRORS = {
    AccountDisabled: 'Tài khoản của bạn đã bị vô hiệu hoá. Liên hệ quản trị viên.',
    DatabaseError: 'Lỗi hệ thống. Vui lòng thử lại sau.',
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
    const [showHelp, setShowHelp] = useState(false);
    const [error, setError] = useState(urlError ? (AUTH_ERRORS[urlError] || AUTH_ERRORS.Default) : '');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
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

    const switchTab = (t) => { setTab(t); setError(''); setSuccess(''); };

    /* ── Handlers ── */
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

    const tabs = [
        { key: 'login', label: 'Đăng nhập', icon: <LogIn size={14} /> },
        { key: 'register', label: 'Đăng ký', icon: <UserPlus size={14} /> },
    ];

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `linear-gradient(160deg, ${SCT_ORANGE} 0%, ${SCT_DARK} 60%, #C94F12 100%)`,
            padding: 16, position: 'relative',
        }}>
            <button
                type="button"
                onClick={() => setShowHelp(true)}
                title="Hướng dẫn sử dụng"
                style={{
                    position: 'absolute', top: 20, right: 20,
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.4)',
                    borderRadius: 8, padding: '8px 14px', color: 'white',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
            >
                <HelpCircle size={16} /> Hỗ trợ
            </button>

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

            </div>

            <Modal isOpen={showHelp} onClose={() => setShowHelp(false)} title="Hướng dẫn sử dụng HomeERP" maxWidth={900}>
                <div style={{ width: '100%', height: '75vh' }}>
                    <iframe
                        src="https://duyhien12.github.io/homeerp-guide/"
                        title="Hướng dẫn sử dụng HomeERP"
                        style={{ width: '100%', height: '100%', border: 'none', borderRadius: 8 }}
                    />
                </div>
            </Modal>
        </div>
    );
}
