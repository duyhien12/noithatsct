'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { markdownToHtml } from '@/lib/aiAssistant/markdownToHtml';
import { Printer, ArrowLeft } from 'lucide-react';

const STORAGE_KEY = 'sct_ai_doc_print';

export default function AIDocumentPrintPage() {
    const router = useRouter();
    const [doc, setDoc] = useState(null);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        try {
            const raw = sessionStorage.getItem(STORAGE_KEY);
            if (!raw) { setNotFound(true); return; }
            setDoc(JSON.parse(raw));
        } catch {
            setNotFound(true);
        }
    }, []);

    if (notFound) {
        return (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                Không tìm thấy nội dung để in. Vui lòng quay lại trang Trợ lý Hồ sơ AI và thử lại.
                <div style={{ marginTop: 12 }}>
                    <button className="btn" onClick={() => router.push('/ai/documents')}>← Quay lại</button>
                </div>
            </div>
        );
    }
    if (!doc) return null;

    const html = markdownToHtml(doc.markdown || '');
    const createdAtStr = doc.createdAt ? new Date(doc.createdAt).toLocaleString('vi-VN') : '';

    return (
        <div className="ai-doc-print-page">
            <div className="ai-doc-print-toolbar">
                <button className="btn" onClick={() => router.back()}><ArrowLeft size={14} /> Quay lại</button>
                <button className="btn btn-primary" onClick={() => window.print()}><Printer size={14} /> In / Lưu PDF</button>
            </div>

            <div className="ai-doc-print-sheet">
                <div className="ai-doc-print-header">
                    <div className="ai-doc-print-brand">CÔNG TY TNHH KIẾN TRÚC ĐÔ THỊ SCT</div>
                    <div className="ai-doc-print-meta">
                        {doc.docTypeLabel && <span>{doc.docTypeLabel}</span>}
                        {doc.projectLabel && <span> · {doc.projectLabel}</span>}
                    </div>
                </div>

                <div className="ai-doc-print-content" dangerouslySetInnerHTML={{ __html: html }} />

                <div className="ai-doc-print-footer">
                    Soạn bởi Trợ lý Hồ sơ AI · {doc.userName || ''} {createdAtStr && `· ${createdAtStr}`}
                </div>
            </div>
        </div>
    );
}
