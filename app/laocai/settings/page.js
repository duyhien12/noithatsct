'use client';
import { useState } from 'react';
import LcShell from '../_components/LcShell';
import { useSession } from 'next-auth/react';

const C = { primary:'#0f766e', white:'#fff', gray:'#64748b', border:'#e2e8f0', text:'#1e293b', textMuted:'#94a3b8' };

function Section({ title, children }) {
    return (
        <div style={{ background:C.white, borderRadius:14, border:`1px solid ${C.border}`, marginBottom:16, overflow:'hidden' }}>
            <div style={{ padding:'14px 22px', borderBottom:`1px solid ${C.border}`, background:'#f8fafc' }}>
                <h3 style={{ margin:0, fontSize:13, fontWeight:700, color:C.text }}>{title}</h3>
            </div>
            <div style={{ padding:'18px 22px' }}>{children}</div>
        </div>
    );
}

function InfoRow({ label, value, tag }) {
    return (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 0', borderBottom:`1px solid ${C.border}` }}>
            <span style={{ fontSize:13, color:C.gray, minWidth:160 }}>{label}</span>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:13, fontWeight:600, color:C.text }}>{value}</span>
                {tag && <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:20, background:`${C.primary}18`, color:C.primary }}>{tag}</span>}
            </div>
        </div>
    );
}

export default function LcSettings() {
    const { data: session } = useSession();
    const [saved, setSaved] = useState(false);

    function showSaved() {
        setSaved(true);
        setTimeout(()=>setSaved(false), 2000);
    }

    return (
        <LcShell title="Cài Đặt">
            <Section title="Thông tin chi nhánh">
                <InfoRow label="Tên chi nhánh" value="Nội Thất SCT — Chi Nhánh Lào Cai" />
                <InfoRow label="Mã chi nhánh" value="LC" tag="Branch Code" />
                <InfoRow label="Địa chỉ" value="Lào Cai, Việt Nam" />
                <InfoRow label="Trạng thái" value="Đang hoạt động" tag="Active" />
                <InfoRow label="Loại hình" value="Kinh doanh & Nội thất" />
            </Section>

            <Section title="Tài khoản đăng nhập">
                <InfoRow label="Tên người dùng" value={session?.user?.name || '—'} />
                <InfoRow label="Email" value={session?.user?.email || '—'} />
                <InfoRow label="Vai trò" value={session?.user?.role || '—'} />
                <InfoRow label="Phiên đăng nhập" value="Chia sẻ từ hệ thống chính (SCT ERP)" tag="Shared Session" />
            </Section>

            <Section title="Pipeline mặc định">
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:10, marginTop:4 }}>
                    {[
                        { stage:'Tư vấn', color:'#3b82f6', icon:'💬' },
                        { stage:'Báo giá', color:'#8b5cf6', icon:'📋' },
                        { stage:'Ký HĐ', color:'#10b981', icon:'✍️' },
                        { stage:'Thi công', color:'#f59e0b', icon:'🔨' },
                        { stage:'Hoàn thành', color:'#64748b', icon:'✅' },
                    ].map((s,i)=>(
                        <div key={s.stage} style={{ display:'flex', alignItems:'center', gap:9, padding:'10px 14px', borderRadius:10, border:`1px solid ${s.color}33`, background:`${s.color}08` }}>
                            <div style={{ width:28, height:28, borderRadius:8, background:s.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0 }}>{s.icon}</div>
                            <div>
                                <div style={{ fontSize:11, color:C.textMuted }}>Bước {i+1}</div>
                                <div style={{ fontSize:13, fontWeight:700, color:s.color }}>{s.stage}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </Section>

            <Section title="Liên kết hệ thống">
                <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                    {[
                        { label:'Về trang chính SCT', href:'/', icon:'🏢' },
                        { label:'Dashboard LC', href:'/laocai/dashboard', icon:'▦' },
                        { label:'Quản lý khách hàng', href:'/laocai/customers', icon:'👥' },
                        { label:'Báo giá LC', href:'/laocai/quotations', icon:'📋' },
                    ].map(link=>(
                        <a key={link.href} href={link.href} style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 16px', borderRadius:10, border:`1px solid ${C.border}`, background:'#f8fafc', color:C.text, textDecoration:'none', fontSize:13, fontWeight:500 }}
                            onMouseEnter={e=>{e.currentTarget.style.borderColor=C.primary;e.currentTarget.style.background='#f0fdfa';}}
                            onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.background='#f8fafc';}}>
                            <span>{link.icon}</span> {link.label}
                        </a>
                    ))}
                </div>
            </Section>

            {saved && (
                <div style={{ position:'fixed', bottom:24, right:24, padding:'12px 20px', borderRadius:12, background:C.primary, color:'#fff', fontWeight:700, fontSize:13, boxShadow:'0 4px 16px rgba(0,0,0,0.2)', zIndex:9999 }}>
                    ✓ Đã lưu
                </div>
            )}
        </LcShell>
    );
}
