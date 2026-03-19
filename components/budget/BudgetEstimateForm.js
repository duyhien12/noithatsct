'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(n || 0));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

// SCT Brand colors
const SCT = {
    orange: '#ea580c',
    orangeLight: '#fff7ed',
    orangeBorder: '#fed7aa',
    navy: '#1e3a5f',
    navyMid: '#2d5480',
    navyLight: '#eff6ff',
};

const DEFAULT_CATS = ['Phần thô', 'Phần hoàn thiện', 'Nội thất gỗ', 'M&E (Điện - Nước)', 'Ngoại thất'];

function emptyItem() {
    return { _k: uid(), name: '', unit: '', qty: 1, unitPrice: 0, amount: 0, note: '' };
}
function emptySubcat(name = '') {
    return { _k: uid(), name, items: [emptyItem()], collapsed: false };
}
function emptyMainCat(name = '') {
    return { _k: uid(), name, subcats: [emptySubcat()], subtotal: 0 };
}
function calcItem(item) {
    const amount = (Number(item.qty) || 0) * (Number(item.unitPrice) || 0);
    return { ...item, amount };
}

function ProductSearch({ value, onSelect, onFreeText, onBlur: onBlurProp, products }) {
    const [search, setSearch] = useState('');
    const [results, setResults] = useState([]);
    const [open, setOpen] = useState(false);
    const ref = useRef();

    useEffect(() => {
        if (!open || !search.trim()) { setResults([]); return; }
        const q = search.toLowerCase();
        setResults((products || []).filter(p => p.name.toLowerCase().includes(q) || (p.code || '').toLowerCase().includes(q)).slice(0, 8));
    }, [search, open, products]);

    useEffect(() => {
        const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    return (
        <div ref={ref} style={{ position: 'relative', flex: 1 }}>
            <input
                className="form-input form-input-compact"
                style={{ width: '100%', fontSize: 12 }}
                value={open ? search : value}
                placeholder="Tên hạng mục / gõ tìm sản phẩm..."
                onFocus={() => { setOpen(true); setSearch(value || ''); }}
                onBlur={() => setTimeout(() => {
                    if (search.trim() && !results.length) onFreeText(search.trim());
                    setOpen(false);
                    onBlurProp?.();
                }, 200)}
                onChange={e => { setSearch(e.target.value); onFreeText(e.target.value); setOpen(true); }}
            />
            {open && results.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: '#fff', border: `1px solid ${SCT.orangeBorder}`, borderRadius: 6, maxHeight: 200, overflow: 'auto', boxShadow: '0 8px 24px rgba(234,88,12,0.12)' }}>
                    {results.map(p => (
                        <div key={p.id} onMouseDown={() => { onSelect(p); setOpen(false); setSearch(''); }}
                            style={{ padding: '6px 10px', cursor: 'pointer', fontSize: 11, display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #fff7ed' }}>
                            <span style={{ fontWeight: 500 }}>{p.name}</span>
                            <span style={{ color: SCT.orange, whiteSpace: 'nowrap', marginLeft: 8, fontWeight: 600 }}>{p.unit} · {fmt(p.salePrice || p.importPrice)}đ</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function exportBudgetPDF({ cats, projectId }) {
    const fmt2 = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(n || 0));
    const grandTotal = (cats || []).reduce((sum, c) =>
        sum + c.subcats.reduce((s2, s) =>
            s2 + s.items.reduce((s3, it) => s3 + (it.amount || 0), 0), 0), 0);

    // Build summary rows per category
    const catSummaryRows = cats.map(cat => {
        const total = cat.subcats.reduce((s, sub) => s + sub.items.reduce((s2, it) => s2 + (it.amount || 0), 0), 0);
        return total > 0 ? `<tr><td>${cat.name}</td><td class="num bold navy">${fmt2(total)} đ</td></tr>` : '';
    }).join('');

    // Build detail rows
    let stt = 0;
    let detailRows = '';
    cats.forEach((cat) => {
        const catTotal = cat.subcats.reduce((s, sub) => s + sub.items.reduce((s2, it) => s2 + (it.amount || 0), 0), 0);
        if (catTotal === 0) return;
        detailRows += `<tr class="cat-header">
            <td colspan="2">${cat.name}</td>
            <td></td><td></td><td></td>
            <td class="num">${fmt2(catTotal)} đ</td>
        </tr>`;
        cat.subcats.forEach((sub, si) => {
            const subTotal = sub.items.reduce((s, it) => s + (it.amount || 0), 0);
            detailRows += `<tr class="sub-header">
                <td colspan="2" style="padding-left:20px">${String.fromCharCode(65 + si)}. ${sub.name || 'Mục ' + (si + 1)}</td>
                <td></td><td></td><td></td>
                <td class="num">${fmt2(subTotal)} đ</td>
            </tr>`;
            sub.items.forEach((item) => {
                if (!item.name && !item.amount) return;
                stt++;
                detailRows += `<tr class="${stt % 2 === 0 ? 'alt' : ''}">
                    <td class="num gray" style="padding-left:28px">${stt}</td>
                    <td style="padding-left:32px">${item.name || ''}</td>
                    <td class="num">${item.qty > 0 ? item.qty : ''}</td>
                    <td class="center">${item.unit || ''}</td>
                    <td class="num">${item.unitPrice > 0 ? fmt2(item.unitPrice) : ''}</td>
                    <td class="num amount">${item.amount > 0 ? fmt2(item.amount) : ''}</td>
                </tr>`;
            });
            detailRows += `<tr class="sub-total">
                <td colspan="5" class="right">Cộng ${sub.name || ''}:</td>
                <td class="num">${fmt2(subTotal)} đ</td>
            </tr>`;
        });
    });

    const date = new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const logoSvg = `<svg width="42" height="42" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 8 L12 40" stroke="white" stroke-width="7" stroke-linecap="round"/>
        <path d="M12 24 L34 8" stroke="white" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M12 24 L34 40" stroke="white" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M20 16 L28 24" stroke="#F47920" stroke-width="3.5" stroke-linecap="round"/>
        <path d="M20 32 L28 24" stroke="#F47920" stroke-width="3.5" stroke-linecap="round"/>
    </svg>`;

    const html = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<title>Bảng Dự Trù Kinh Phí — Kiến Trúc Đô Thị SCT</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, 'Helvetica Neue', sans-serif; font-size: 11.5px; color: #1a202c; background: #fff; }
  @page { size: A4; margin: 0; }

  /* ── PAGE WRAPPER ── */
  .page { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 0; display: flex; flex-direction: column; }

  /* ── HEADER BAND ── */
  .header-band {
    background: #1C3A6B;
    padding: 18px 28px 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .brand-block { display: flex; align-items: center; gap: 12px; }
  .brand-logo-bg {
    width: 48px; height: 48px; border-radius: 10px;
    background: rgba(255,255,255,0.12);
    display: flex; align-items: center; justify-content: center;
    border: 1.5px solid rgba(201,168,76,0.4);
  }
  .brand-text { color: white; }
  .brand-name { font-size: 17px; font-weight: 800; letter-spacing: 0.5px; line-height: 1.2; }
  .brand-tagline { font-size: 9.5px; color: #C9A84C; letter-spacing: 1.5px; text-transform: uppercase; margin-top: 2px; }
  .header-right { text-align: right; color: rgba(255,255,255,0.75); font-size: 9.5px; line-height: 1.7; }
  .header-right strong { color: #C9A84C; }

  /* ── GOLD STRIPE ── */
  .gold-stripe { height: 4px; background: linear-gradient(to right, #C9A84C, #E8C96A, #C9A84C); }

  /* ── BODY CONTENT ── */
  .body { padding: 20px 28px 24px; flex: 1; }

  /* ── DOC TITLE ── */
  .doc-title-block { text-align: center; margin-bottom: 16px; }
  .doc-title { font-size: 18px; font-weight: 800; color: #1C3A6B; letter-spacing: 2px; text-transform: uppercase; }
  .doc-underline { width: 80px; height: 3px; background: #C9A84C; margin: 6px auto 0; border-radius: 2px; }

  /* ── PROJECT INFO BOX ── */
  .info-box {
    display: flex; justify-content: space-between;
    border: 1px solid #dce3ef; border-radius: 8px;
    padding: 10px 18px; margin-bottom: 18px;
    background: #f7f9fd;
  }
  .info-item { font-size: 11px; color: #4a5568; }
  .info-item strong { color: #1C3A6B; font-size: 12px; }

  /* ── SUMMARY BOX ── */
  .summary-box { margin-bottom: 18px; }
  .summary-title {
    font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;
    color: #1C3A6B; border-bottom: 2px solid #C9A84C; padding-bottom: 5px; margin-bottom: 6px;
  }
  .summary-table { width: 100%; border-collapse: collapse; font-size: 11px; }
  .summary-table td { padding: 4px 8px; border-bottom: 1px solid #edf0f7; }
  .summary-table tr:last-child td { border-bottom: none; }

  /* ── DETAIL TABLE ── */
  .detail-title {
    font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;
    color: #1C3A6B; border-bottom: 2px solid #C9A84C; padding-bottom: 5px; margin-bottom: 6px;
  }
  table.detail { width: 100%; border-collapse: collapse; font-size: 11px; }
  table.detail th {
    background: #1C3A6B; color: white; padding: 7px 8px;
    font-size: 10.5px; font-weight: 700; text-align: center;
    border: 1px solid #2a5298;
  }
  table.detail td { border: 1px solid #e2e8f0; padding: 4px 7px; vertical-align: middle; }
  .num { text-align: right; }
  .center { text-align: center; }
  .right { text-align: right; }
  .gray { color: #a0aec0; }
  .bold { font-weight: 700; }
  .navy { color: #1C3A6B; }
  .amount { font-weight: 700; color: #1C3A6B; }
  .alt td { background: #f7f9fd; }
  .cat-header td {
    background: #1C3A6B; color: white; font-weight: 700;
    font-size: 11.5px; padding: 7px 9px; border: 1px solid #2a5298;
  }
  .cat-header .num { color: #C9A84C; }
  .sub-header td {
    background: rgba(201,168,76,0.1); color: #1C3A6B; font-weight: 700;
    padding: 5px 8px; border: 1px solid #dce3ef; font-style: italic;
  }
  .sub-header .num { color: #C9A84C; font-weight: 700; }
  .sub-total td {
    background: rgba(201,168,76,0.08); font-weight: 700;
    color: #744210; border: 1px solid #e8d5a0; font-size: 11px;
  }

  /* ── GRAND TOTAL ── */
  .grand-total-wrap {
    margin-top: 10px;
    background: linear-gradient(135deg, #1C3A6B 0%, #2A5298 100%);
    border-radius: 8px; overflow: hidden;
  }
  .grand-total-inner {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 20px;
  }
  .grand-label { color: rgba(255,255,255,0.85); font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; }
  .grand-value { color: white; font-size: 20px; font-weight: 800; letter-spacing: 0.5px; }
  .grand-gold-bar { height: 3px; background: linear-gradient(to right, #C9A84C, #E8C96A, #C9A84C); }

  /* ── SIGNATURE SECTION ── */
  .sig-section { margin-top: 28px; display: flex; justify-content: space-around; }
  .sig-block { text-align: center; width: 30%; }
  .sig-role { font-weight: 700; font-size: 11px; color: #1C3A6B; }
  .sig-note { font-size: 9.5px; color: #718096; margin-top: 2px; font-style: italic; }
  .sig-line { margin: 32px auto 6px; width: 80%; border-top: 1px dashed #a0aec0; }
  .sig-name { font-size: 10px; color: #4a5568; }

  /* ── FOOTER ── */
  .footer-band {
    background: #f7f9fd; border-top: 1px solid #dce3ef;
    padding: 8px 28px; margin-top: 24px;
    display: flex; justify-content: space-between; align-items: center;
    font-size: 9.5px; color: #718096;
  }
  .footer-brand { color: #1C3A6B; font-weight: 700; font-size: 10px; }

  @media print {
    .page { width: 100%; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
<div class="page">

  <!-- HEADER -->
  <div class="header-band">
    <div class="brand-block">
      <div class="brand-logo-bg">${logoSvg}</div>
      <div class="brand-text">
        <div class="brand-name">Kiến Trúc Đô Thị SCT</div>
        <div class="brand-tagline">Cùng bạn xây dựng ước mơ</div>
      </div>
    </div>
    <div class="header-right">
      <div>Website: <strong>kientrucsct.com</strong></div>
      <div>Email: <strong>info@kientrucsct.com</strong></div>
      <div>Ngày lập: <strong>${date}</strong></div>
    </div>
  </div>
  <div class="gold-stripe"></div>

  <!-- BODY -->
  <div class="body">

    <!-- DOC TITLE -->
    <div class="doc-title-block">
      <div class="doc-title">Bảng Dự Trù Kinh Phí</div>
      <div class="doc-underline"></div>
    </div>

    <!-- PROJECT INFO -->
    <div class="info-box">
      <div class="info-item">Dự án: <strong>${projectId}</strong></div>
      <div class="info-item">Ngày lập: <strong>${date}</strong></div>
      <div class="info-item">Tổng giá trị: <strong style="color:#1C3A6B;font-size:13px">${fmt2(grandTotal)} đ</strong></div>
    </div>

    <!-- SUMMARY -->
    <div class="summary-box">
      <div class="summary-title">Tóm tắt theo hạng mục</div>
      <table class="summary-table">
        <tbody>
          ${catSummaryRows}
          <tr style="border-top:2px solid #C9A84C">
            <td style="font-weight:700;color:#1C3A6B;font-size:12px">TỔNG CỘNG</td>
            <td class="num bold navy" style="font-size:13px">${fmt2(grandTotal)} đ</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- DETAIL TABLE -->
    <div class="detail-title">Chi tiết dự trù</div>
    <table class="detail">
      <thead>
        <tr>
          <th style="width:32px">#</th>
          <th style="text-align:left;min-width:220px">HẠNG MỤC / SẢN PHẨM</th>
          <th style="width:46px">SL</th>
          <th style="width:52px">ĐVT</th>
          <th style="width:110px">ĐƠN GIÁ (đ)</th>
          <th style="width:120px">THÀNH TIỀN (đ)</th>
        </tr>
      </thead>
      <tbody>
        ${detailRows}
      </tbody>
    </table>

    <!-- GRAND TOTAL -->
    <div class="grand-total-wrap">
      <div class="grand-total-inner">
        <div class="grand-label">Tổng Dự Trù Kinh Phí</div>
        <div class="grand-value">${fmt2(grandTotal)} đ</div>
      </div>
      <div class="grand-gold-bar"></div>
    </div>

    <!-- SIGNATURES -->
    <div class="sig-section">
      <div class="sig-block">
        <div class="sig-role">Người Lập Bảng</div>
        <div class="sig-note">(Ký, ghi rõ họ tên)</div>
        <div class="sig-line"></div>
        <div class="sig-name">&nbsp;</div>
      </div>
      <div class="sig-block">
        <div class="sig-role">Chủ Đầu Tư Xác Nhận</div>
        <div class="sig-note">(Ký, ghi rõ họ tên)</div>
        <div class="sig-line"></div>
        <div class="sig-name">&nbsp;</div>
      </div>
      <div class="sig-block">
        <div class="sig-role">Giám Đốc SCT</div>
        <div class="sig-note">(Ký tên, đóng dấu)</div>
        <div class="sig-line"></div>
        <div class="sig-name">&nbsp;</div>
      </div>
    </div>

  </div>

  <!-- FOOTER -->
  <div class="footer-band">
    <div class="footer-brand">Kiến Trúc Đô Thị SCT — Cùng bạn xây dựng ước mơ</div>
    <div>Tài liệu được tạo tự động từ hệ thống ERP — ${date}</div>
  </div>

</div>
<script>window.onload = () => { window.print(); }<\/script>
</body>
</html>`;

    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
}

export default function BudgetEstimateForm({ projectId }) {
    const [cats, setCats] = useState(null);
    const [activeIdx, setActiveIdx] = useState(0);
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);
    const [products, setProducts] = useState([]);
    const dirtyRef = useRef(false);
    const savingRef = useRef(false);
    const catsRef = useRef(null);
    const autoSaveTimerRef = useRef(null);
    const [autoSaveStatus, setAutoSaveStatus] = useState(''); // '', 'saving', 'saved'
    const [editingCatName, setEditingCatName] = useState(null);
    const [editingSubName, setEditingSubName] = useState(null);

    // Keep catsRef in sync + trigger debounced auto-save on every cats change
    useEffect(() => {
        catsRef.current = cats;
        if (!dirtyRef.current || cats === null) return;
        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = setTimeout(() => {
            if (!dirtyRef.current || savingRef.current) return;
            const data = catsRef.current;
            if (!data) return;
            setAutoSaveStatus('saving');
            savingRef.current = true;
            fetch(`/api/projects/${projectId}/budget-estimate`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data }),
            }).then(() => {
                dirtyRef.current = false;
                setDirty(false);
                setAutoSaveStatus('saved');
                setTimeout(() => setAutoSaveStatus(''), 2000);
            }).catch(() => setAutoSaveStatus('')).finally(() => {
                savingRef.current = false;
            });
        }, 1500);
    }, [cats]);

    useEffect(() => {
        fetch(`/api/projects/${projectId}/budget-estimate`)
            .then(r => r.json())
            .then(json => {
                if (json.data && Array.isArray(json.data)) {
                    setCats(json.data);
                    setActiveIdx(0);
                } else {
                    setCats(DEFAULT_CATS.map(n => emptyMainCat(n)));
                }
            })
            .catch(() => setCats(DEFAULT_CATS.map(n => emptyMainCat(n))));
        fetch('/api/products?limit=1000').then(r => r.json()).then(d => setProducts(d.data || d || [])).catch(() => {});
    }, [projectId]);

    const mark = useCallback(() => { setDirty(true); dirtyRef.current = true; }, []);

    const save = async () => {
        setSaving(true);
        savingRef.current = true;
        try {
            await fetch(`/api/projects/${projectId}/budget-estimate`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: cats }),
            });
            setDirty(false);
            dirtyRef.current = false;
        } catch { alert('Lỗi lưu dữ liệu'); }
        setSaving(false);
        savingRef.current = false;
    };

    const autoSave = useCallback(() => {
        if (!dirtyRef.current || savingRef.current) return;
        const data = catsRef.current;
        if (!data) return;
        setSaving(true);
        savingRef.current = true;
        fetch(`/api/projects/${projectId}/budget-estimate`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data }),
        }).then(() => {
            setDirty(false);
            dirtyRef.current = false;
        }).catch(() => {}).finally(() => {
            setSaving(false);
            savingRef.current = false;
        });
    }, [projectId]);

    const addCat = () => {
        const newCat = emptyMainCat('Hạng mục mới');
        setCats(prev => {
            const n = [...prev, newCat];
            setActiveIdx(n.length - 1);
            setTimeout(() => setEditingCatName(n.length - 1), 50);
            return n;
        });
        mark();
    };
    const removeCat = (ci) => {
        if (!confirm('Xóa hạng mục chính này?')) return;
        setCats(prev => { const n = prev.filter((_, i) => i !== ci); setActiveIdx(Math.min(ci, n.length - 1)); return n; });
        mark();
    };
    const renameCat = (ci, name) => {
        setCats(prev => prev.map((c, i) => i === ci ? { ...c, name } : c));
        mark();
    };

    const addSubcat = (ci) => {
        setCats(prev => prev.map((c, i) => {
            if (i !== ci) return c;
            const newSi = c.subcats.length;
            setTimeout(() => setEditingSubName({ ci, si: newSi }), 50);
            return { ...c, subcats: [...c.subcats, emptySubcat('Mục mới')] };
        }));
        mark();
    };
    const removeSubcat = (ci, si) => {
        if (!confirm('Xóa mục này?')) return;
        setCats(prev => prev.map((c, i) => i !== ci ? c : { ...c, subcats: c.subcats.filter((_, j) => j !== si) }));
        mark();
    };
    const renameSubcat = (ci, si, name) => {
        setCats(prev => prev.map((c, i) => i !== ci ? c : { ...c, subcats: c.subcats.map((s, j) => j === si ? { ...s, name } : s) }));
        mark();
    };
    const toggleSubcat = (ci, si) => {
        setCats(prev => prev.map((c, i) => i !== ci ? c : { ...c, subcats: c.subcats.map((s, j) => j === si ? { ...s, collapsed: !s.collapsed } : s) }));
    };

    const updateItem = (ci, si, ii, field, val) => {
        setCats(prev => prev.map((c, i) => {
            if (i !== ci) return c;
            return {
                ...c, subcats: c.subcats.map((s, j) => {
                    if (j !== si) return s;
                    const items = s.items.map((item, k) => {
                        if (k !== ii) return item;
                        return calcItem({ ...item, [field]: val });
                    });
                    return { ...s, items };
                })
            };
        }));
        mark();
    };
    const addItem = (ci, si) => {
        setCats(prev => prev.map((c, i) => i !== ci ? c : {
            ...c, subcats: c.subcats.map((s, j) => j !== si ? s : { ...s, items: [...s.items, emptyItem()] })
        }));
        mark();
    };
    const removeItem = (ci, si, ii) => {
        setCats(prev => prev.map((c, i) => i !== ci ? c : {
            ...c, subcats: c.subcats.map((s, j) => j !== si ? s : { ...s, items: s.items.filter((_, k) => k !== ii) })
        }));
        mark();
    };
    const selectProduct = (ci, si, ii, p) => {
        setCats(prev => prev.map((c, i) => {
            if (i !== ci) return c;
            return {
                ...c, subcats: c.subcats.map((s, j) => {
                    if (j !== si) return s;
                    const items = s.items.map((item, k) => {
                        if (k !== ii) return item;
                        return calcItem({ ...item, name: p.name, unit: p.unit || item.unit, unitPrice: p.salePrice || p.importPrice || 0 });
                    });
                    return { ...s, items };
                })
            };
        }));
        mark();
    };

    const grandTotal = (cats || []).reduce((sum, c) =>
        sum + c.subcats.reduce((s2, s) =>
            s2 + s.items.reduce((s3, it) => s3 + (it.amount || 0), 0), 0), 0);
    const catTotal = (c) => c.subcats.reduce((s, sub) => s + sub.items.reduce((s2, it) => s2 + (it.amount || 0), 0), 0);
    const subcatTotal = (s) => s.items.reduce((sum, it) => sum + (it.amount || 0), 0);

    if (cats === null) return (
        <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>
            <div>Đang tải dữ liệu...</div>
        </div>
    );

    const activeCat = cats[activeIdx] || cats[0];
    if (!activeCat) return null;

    // VarianceTable-matching styles
    const thS = { background: '#1e3a5f', color: 'white', fontWeight: 700, textAlign: 'center', fontSize: 11, padding: '8px 6px', border: '1px solid #1e3a5f', whiteSpace: 'nowrap' };
    const cellS = { border: '1px solid #d1d5db', padding: '5px 7px', fontSize: 12 };
    const inpS = { width: '100%', padding: '3px 5px', fontSize: 11, border: '1px solid #93c5fd', borderRadius: 3, outline: 'none', background: '#eff6ff', boxSizing: 'border-box' };

    const renderRow = (item, ii, si) => {
        const rowBg = ii % 2 === 0 ? '#f9fafb' : '#fff';
        return (
            <tr key={item._k} style={{ background: rowBg }}>
                <td style={{ ...cellS, textAlign: 'center', color: '#9ca3af', fontSize: 11, width: 32 }}>{ii + 1}</td>
                <td style={{ ...cellS, padding: '3px 4px' }}>
                    <ProductSearch
                        value={item.name}
                        products={products}
                        onSelect={(p) => { selectProduct(activeIdx, si, ii, p); setTimeout(autoSave, 300); }}
                        onFreeText={(txt) => updateItem(activeIdx, si, ii, 'name', txt)}
                        onBlur={autoSave}
                    />
                </td>
                <td style={{ ...cellS, padding: '3px 4px', width: 52 }}>
                    <input style={{ ...inpS, textAlign: 'center' }}
                        value={item.unit || ''}
                        placeholder="m², cái..."
                        onChange={e => updateItem(activeIdx, si, ii, 'unit', e.target.value)}
                        onBlur={autoSave}
                    />
                </td>
                <td style={{ ...cellS, padding: '3px 4px', width: 72 }}>
                    <input style={{ ...inpS, textAlign: 'right' }} type="number"
                        value={item.qty || ''}
                        placeholder="1"
                        onChange={e => updateItem(activeIdx, si, ii, 'qty', parseFloat(e.target.value) || 0)}
                        onFocus={e => e.target.select()}
                        onBlur={autoSave}
                    />
                </td>
                <td style={{ ...cellS, padding: '3px 4px', width: 120 }}>
                    <input style={{ ...inpS, textAlign: 'right' }} type="number"
                        value={item.unitPrice || ''}
                        placeholder="0"
                        onChange={e => updateItem(activeIdx, si, ii, 'unitPrice', parseFloat(e.target.value) || 0)}
                        onFocus={e => e.target.select()}
                        onBlur={autoSave}
                    />
                </td>
                <td style={{ ...cellS, textAlign: 'right', fontWeight: 600, color: '#2563eb', width: 115 }}>
                    {fmt(item.amount || 0)}
                </td>
                <td style={{ ...cellS, textAlign: 'center', padding: '3px 4px', width: 36 }}>
                    <button onClick={() => removeItem(activeIdx, si, ii)} title="Xóa"
                        style={{ padding: '2px 7px', fontSize: 11, background: 'none', border: '1px solid #fca5a5', borderRadius: 4, cursor: 'pointer', color: '#dc2626' }}>🗑</button>
                </td>
            </tr>
        );
    };

    return (
        <div>
            {/* Top bar — Summary + Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: 11, color: '#9ca3af' }}>Tổng dự trù</span>
                        <span style={{ fontWeight: 700, fontSize: 14, color: '#2563eb' }}>{fmt(grandTotal)} đ</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: 11, color: '#9ca3af' }}>Hạng mục hiện tại</span>
                        <span style={{ fontWeight: 700, fontSize: 14, color: '#1e3a5f' }}>{fmt(catTotal(activeCat))} đ</span>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    {autoSaveStatus === 'saving' && (
                        <span style={{ fontSize: 11, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ display: 'inline-block', width: 10, height: 10, border: '2px solid #93c5fd', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                            Đang lưu...
                        </span>
                    )}
                    {autoSaveStatus === 'saved' && (
                        <span style={{ fontSize: 11, color: '#16a34a' }}>✓ Đã lưu tự động</span>
                    )}
                    <button onClick={save} disabled={saving}
                        style={{ padding: '7px 18px', fontSize: 13, fontWeight: 700, borderRadius: 8, border: 'none', cursor: 'pointer',
                            background: dirty ? '#1e3a5f' : '#4b7ab5', color: 'white',
                            boxShadow: '0 2px 8px rgba(30,58,95,0.25)', display: 'flex', alignItems: 'center', gap: 6,
                            opacity: saving ? 0.7 : 1 }}>
                        💾 {saving ? 'Đang lưu...' : dirty ? 'Lưu *' : 'Lưu'}
                    </button>
                    <button onClick={() => exportBudgetPDF({ cats, projectId })}
                        style={{ padding: '7px 16px', fontSize: 12, fontWeight: 700, borderRadius: 8, border: 'none', cursor: 'pointer',
                            background: '#f97316', color: 'white', display: 'flex', alignItems: 'center', gap: 6 }}>
                        📄 Xuất PDF
                    </button>
                </div>
            </div>

            {/* Tabs — VarianceTable style (blue) */}
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 16, borderBottom: '2px solid #e5e7eb', paddingBottom: 8, alignItems: 'center' }}>
                {cats.map((c, ci) => {
                    const isActive = ci === activeIdx;
                    const total = catTotal(c);
                    return (
                        <div key={c._k} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            {editingCatName === ci ? (
                                <>
                                    <input autoFocus
                                        style={{ padding: '5px 10px', fontSize: 13, border: '2px solid #2563eb', borderRadius: 8, outline: 'none', width: 180, fontWeight: 700 }}
                                        defaultValue={c.name}
                                        onBlur={e => { renameCat(ci, e.target.value || c.name); setEditingCatName(null); }}
                                        onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') setEditingCatName(null); }}
                                    />
                                    <button onClick={() => setEditingCatName(null)}
                                        style={{ padding: '4px 7px', fontSize: 12, background: 'none', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', color: '#6b7280' }}>✕</button>
                                </>
                            ) : (
                                <>
                                    <button onClick={() => setActiveIdx(ci)}
                                        style={{ padding: '7px 16px', fontSize: 13, fontWeight: isActive ? 700 : 500, borderRadius: 8,
                                            border: isActive ? '2px solid #2563eb' : '1px solid #e5e7eb',
                                            background: isActive ? '#eff6ff' : 'white', cursor: 'pointer',
                                            color: isActive ? '#2563eb' : '#374151', whiteSpace: 'nowrap' }}>
                                        {c.name}
                                        {total > 0 && <span style={{ marginLeft: 6, fontSize: 11, color: isActive ? '#3b82f6' : '#9ca3af' }}>{fmt(total)}</span>}
                                    </button>
                                    <button onClick={() => { setActiveIdx(ci); setEditingCatName(ci); }} title="Đổi tên"
                                        style={{ padding: '3px 6px', fontSize: 11, background: 'none', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', color: '#9ca3af', lineHeight: 1 }}>✏️</button>
                                    <button onClick={() => removeCat(ci)} title="Xóa hạng mục"
                                        style={{ padding: '3px 6px', fontSize: 11, background: 'none', border: '1px solid #fca5a5', borderRadius: 6, cursor: 'pointer', color: '#dc2626', lineHeight: 1 }}>✕</button>
                                </>
                            )}
                        </div>
                    );
                })}
                <button onClick={addCat}
                    style={{ padding: '7px 14px', fontSize: 13, border: '1px dashed #93c5fd', borderRadius: 8, background: 'transparent', cursor: 'pointer', color: '#2563eb', fontWeight: 500 }}>
                    + Thêm
                </button>
            </div>

            {/* Subcategories — VarianceTable section style (amber header) */}
            {activeCat.subcats.map((sub, si) => {
                const subTot = subcatTotal(sub);
                return (
                    <div key={sub._k} style={{ marginBottom: 16, border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
                        {/* Section header — amber like VarianceTable */}
                        <div style={{ background: '#fde68a', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 13, color: '#78350f', cursor: 'pointer' }}
                                onClick={() => toggleSubcat(activeIdx, si)}>
                                {sub.collapsed ? '▶' : '▼'}
                            </span>
                            <span style={{ fontWeight: 700, fontSize: 13, color: '#78350f', minWidth: 24 }}>{String.fromCharCode(65 + si)}.</span>
                            {editingSubName?.ci === activeIdx && editingSubName?.si === si ? (
                                <input autoFocus
                                    style={{ flex: 1, padding: '3px 8px', fontSize: 13, fontWeight: 700, border: '2px solid #92400e', borderRadius: 6, outline: 'none', background: '#fffbeb', color: '#92400e' }}
                                    defaultValue={sub.name}
                                    onBlur={e => { renameSubcat(activeIdx, si, e.target.value || sub.name); setEditingSubName(null); }}
                                    onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') setEditingSubName(null); }}
                                />
                            ) : (
                                <span style={{ fontWeight: 600, fontSize: 13, color: '#92400e', flex: 1, cursor: 'pointer' }}
                                    onClick={() => toggleSubcat(activeIdx, si)}>
                                    {sub.name}
                                    <span style={{ marginLeft: 6, fontSize: 10, color: '#b45309', opacity: 0.6 }}>✏️</span>
                                </span>
                            )}
                            {editingSubName?.ci !== activeIdx || editingSubName?.si !== si ? (
                                <button onClick={() => setEditingSubName({ ci: activeIdx, si })} title="Đổi tên"
                                    style={{ background: 'none', border: '1px solid #d97706', borderRadius: 5, cursor: 'pointer', color: '#92400e', fontSize: 11, padding: '2px 7px', lineHeight: 1, flexShrink: 0 }}>✏️</button>
                            ) : null}
                            <span style={{ fontSize: 12, color: '#92400e' }}>DT: <strong>{fmt(subTot)}</strong></span>
                            <button onClick={() => removeSubcat(activeIdx, si)} title="Xóa mục"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#dc2626', padding: '0 2px', lineHeight: 1 }}>✕</button>
                        </div>

                        {!sub.collapsed && (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                                    <thead>
                                        <tr>
                                            <th style={{ ...thS, width: 32 }}>#</th>
                                            <th style={{ ...thS, textAlign: 'left' }}>HẠNG MỤC / SẢN PHẨM</th>
                                            <th style={{ ...thS, width: 52 }}>ĐVT</th>
                                            <th style={{ ...thS, width: 72 }}>SL</th>
                                            <th style={{ ...thS, width: 120 }}>ĐƠN GIÁ DT</th>
                                            <th style={{ ...thS, width: 115 }}>THÀNH TIỀN</th>
                                            <th style={{ ...thS, width: 36 }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sub.items.map((item, ii) => renderRow(item, ii, si))}
                                        {/* Subtotal row */}
                                        <tr style={{ background: '#fce4d6' }}>
                                            <td colSpan={5} style={{ ...cellS, textAlign: 'right', fontWeight: 700, fontSize: 12, color: '#92400e' }}>
                                                Cộng {sub.name}:
                                            </td>
                                            <td style={{ ...cellS, textAlign: 'right', fontWeight: 700, color: '#1d4ed8' }}>{fmt(subTot)}</td>
                                            <td style={cellS} />
                                        </tr>
                                    </tbody>
                                </table>
                                <div style={{ padding: '8px 12px' }}>
                                    <button onClick={() => addItem(activeIdx, si)}
                                        style={{ fontSize: 12, color: '#2563eb', background: 'none', border: '1px dashed #93c5fd', borderRadius: 6, padding: '4px 12px', cursor: 'pointer' }}>
                                        + Thêm dòng
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Footer: Add subcat + Grand total */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <button onClick={() => addSubcat(activeIdx)}
                    style={{ fontSize: 13, color: '#16a34a', background: 'none', border: '1px dashed #86efac', borderRadius: 8, padding: '7px 18px', cursor: 'pointer', fontWeight: 500 }}>
                    + Thêm mục con
                </button>
                <div style={{ background: 'linear-gradient(135deg, #1e3a5f, #2d5480)', color: 'white', padding: '12px 24px', borderRadius: 10, textAlign: 'right', boxShadow: '0 4px 12px rgba(30,58,95,0.25)' }}>
                    <div style={{ fontSize: 10, opacity: 0.75, marginBottom: 3, letterSpacing: '1px', fontWeight: 600 }}>TỔNG DỰ TRÙ KINH PHÍ</div>
                    <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '0.5px' }}>{fmt(grandTotal)} <span style={{ fontSize: 13, fontWeight: 400, opacity: 0.8 }}>đ</span></div>
                </div>
            </div>
        </div>
    );
}
