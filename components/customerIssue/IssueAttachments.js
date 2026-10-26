'use client';
import { useRef, useState } from 'react';
import { ImagePlus, FilePlus2, FileText, Trash2, Download, ExternalLink } from 'lucide-react';
import { Button, IconButton, ConfirmDialog, Modal, useToast } from '@/components/ui';
import { formatDate, formatDateTime } from '@/lib/format';
import {
    ATTACHMENT_CATEGORY, ATTACHMENT_CATEGORY_LABELS, ATTACHMENT_MAX_MB, IMAGE_EXTENSIONS, DOCUMENT_EXTENSIONS,
} from '@/lib/customerIssue/constants';
import { isImageFile, validateIssueFile } from '@/lib/customerIssue/files';
import { issueApi, uploadIssueFile } from './api';
import s from './dh360.module.css';

const IMAGE_ACCEPT = IMAGE_EXTENSIONS.map(e => `.${e}`).join(',');
const DOCUMENT_ACCEPT = DOCUMENT_EXTENSIONS.map(e => `.${e}`).join(',');

/** Upload nhiều tệp: kiểm tra định dạng/dung lượng, /api/upload (loại proofs), rồi đăng ký vào vấn đề. */
function useUploader(issueId, onChanged) {
    const toast = useToast();
    const [busy, setBusy] = useState(null);

    const upload = async (category, fileList) => {
        const files = Array.from(fileList || []);
        if (!files.length) return;
        const valid = [];
        files.forEach(f => {
            const error = validateIssueFile(f, category);
            if (error) toast.error(error, 'Tệp không hợp lệ');
            else valid.push(f);
        });
        if (!valid.length) return;

        setBusy(category);
        let done = 0;
        for (const file of valid) {
            try {
                const up = await uploadIssueFile(file);
                await issueApi.addAttachment(issueId, {
                    category, url: up.url, thumbnailUrl: up.thumbnailUrl || '', fileName: file.name, mimeType: file.type || '',
                });
                done += 1;
            } catch (e) {
                toast.error(e.message, `Không tải lên được ${file.name}`);
            }
        }
        setBusy(null);
        if (done) {
            toast.success(`Đã thêm ${done} tệp vào mục ${ATTACHMENT_CATEGORY_LABELS[category]}.`);
            onChanged?.();
        }
    };
    return { busy, upload };
}

function PickButton({ category, accept, busy, onPick, tile, children }) {
    const ref = useRef(null);
    const input = (
        <input ref={ref} type="file" hidden multiple accept={accept} data-upload={category}
            onChange={e => { onPick(category, e.target.files); e.target.value = ''; }} />
    );
    if (tile) {
        return (
            <>
                <button type="button" className={s.uploadTile} disabled={!!busy} onClick={() => ref.current?.click()}>
                    <ImagePlus size={18} aria-hidden="true" />
                    {busy === category ? 'Đang tải…' : children}
                </button>
                {input}
            </>
        );
    }
    return (
        <>
            <Button variant="outline" size="sm" icon={FilePlus2} loading={busy === category} disabled={!!busy} onClick={() => ref.current?.click()}>
                {children}
            </Button>
            {input}
        </>
    );
}

function Gallery({ items, category, canAdd, busy, onPick, onPreview }) {
    return (
        <div>
            <h4 className={s.subTitle}>{ATTACHMENT_CATEGORY_LABELS[category]} ({items.length})</h4>
            <div className={s.gallery} data-gallery={category}>
                {items.map(a => (
                    <button key={a.id} type="button" className={s.thumb} onClick={() => onPreview(a)}
                        title={`Xem ${a.fileName || 'ảnh'}`} aria-label={`Xem ${a.fileName || 'ảnh'}`}>
                        {isImageFile(a)
                            ? <img src={a.thumbnailUrl || a.url} alt="" loading="lazy" />
                            : <span className={s.thumbFile}><FileText size={20} aria-hidden="true" />{a.fileName}</span>}
                    </button>
                ))}
                {canAdd && (
                    <PickButton tile category={category} accept={IMAGE_ACCEPT} busy={busy} onPick={onPick}>Thêm ảnh</PickButton>
                )}
                {!items.length && !canAdd && <span className={s.placeholder}>Chưa có ảnh</span>}
            </div>
        </div>
    );
}

/** Xem trước ảnh/tệp, tải xuống, và gỡ nếu có quyền. */
function PreviewModal({ attachment, canRemove, onRemove, onClose }) {
    if (!attachment) return null;
    const image = isImageFile(attachment);
    return (
        <Modal
            isOpen
            onClose={onClose}
            title={attachment.fileName || ATTACHMENT_CATEGORY_LABELS[attachment.category]}
            description={`${ATTACHMENT_CATEGORY_LABELS[attachment.category]} · ${[attachment.uploadedByName, formatDateTime(attachment.createdAt)].filter(Boolean).join(' · ')}`}
            maxWidth={900}
            footer={(
                <>
                    {canRemove && (
                        <Button variant="danger" icon={Trash2} onClick={() => onRemove(attachment)} style={{ marginRight: 'auto' }}>Gỡ tệp</Button>
                    )}
                    <a className="ui-btn ui-btn--outline" href={attachment.url} target="_blank" rel="noreferrer">
                        <ExternalLink size={16} aria-hidden="true" />Mở tab mới
                    </a>
                    <a className="ui-btn ui-btn--secondary" href={attachment.url} download={attachment.fileName || true}>
                        <Download size={16} aria-hidden="true" />Tải xuống
                    </a>
                </>
            )}
        >
            {image
                ?<img className={s.previewImage} src={attachment.url} alt={attachment.caption || attachment.fileName || 'Ảnh đính kèm'} />
                : (
                    <div className={s.thumbFile} style={{ padding: 'var(--space-8)' }}>
                        <FileText size={40} aria-hidden="true" />
                        <span>Không xem trước được loại tệp này — dùng “Tải xuống” hoặc “Mở tab mới”.</span>
                    </div>
                )}
        </Modal>
    );
}

/** Ảnh trước / trong / sau xử lý và tài liệu đính kèm của một vấn đề. */
// rolePerms: quyền theo phòng ban (không tính vai trò trên vấn đề) — khớp kiểm tra của API gỡ tệp
export default function IssueAttachments({ issue, perms, rolePerms, me, onChanged }) {
    const toast = useToast();
    const { busy, upload } = useUploader(issue.id, onChanged);
    const [preview, setPreview] = useState(null);
    const [removing, setRemoving] = useState(null);
    const byCat = (c) => issue.attachments.filter(a => a.category === c);
    const canRemove = (a) => !!perms.files && (a.uploadedById === me?.id || !!rolePerms?.update);
    const docs = byCat(ATTACHMENT_CATEGORY.DOCUMENT);

    const remove = async () => {
        try {
            await issueApi.removeAttachment(issue.id, removing.id);
            toast.success(`Đã gỡ ${removing.fileName || 'tệp'}.`);
            setPreview(null);
            onChanged?.();
        } catch (e) {
            toast.error(e.message);
        }
    };

    const gallery = (category) => (
        <Gallery items={byCat(category)} category={category} canAdd={!!perms.files}
            busy={busy} onPick={upload} onPreview={setPreview} />
    );

    return (
        <>
            <section className={s.section} aria-labelledby="dh360-photos">
                <div>
                    <h3 className={s.sectionTitle} id="dh360-photos">Hình ảnh trước / sau xử lý</h3>
                    {perms.files && (
                        <p className={s.rowSub} style={{ margin: '2px 0 0' }}>
                            Ảnh {IMAGE_EXTENSIONS.join(', ').toUpperCase()}, tối đa {ATTACHMENT_MAX_MB.photo} MB/ảnh. Bấm vào ảnh để xem, tải xuống hoặc gỡ.
                        </p>
                    )}
                </div>
                <div className={s.compareGrid}>
                    {gallery(ATTACHMENT_CATEGORY.BEFORE)}
                    {gallery(ATTACHMENT_CATEGORY.AFTER)}
                </div>
                {gallery(ATTACHMENT_CATEGORY.DURING)}
            </section>

            <section className={s.section} aria-labelledby="dh360-docs">
                <div className={s.sectionHead}>
                    <div>
                        <h3 className={s.sectionTitle} id="dh360-docs">Tệp đính kèm ({docs.length})</h3>
                        {perms.files && (
                            <p className={s.rowSub} style={{ margin: '2px 0 0' }}>
                                PDF, Word, Excel, PowerPoint, ảnh, TXT, CSV, DWG, ZIP — tối đa {ATTACHMENT_MAX_MB.document} MB/tệp.
                            </p>
                        )}
                    </div>
                    {perms.files && (
                        <PickButton category={ATTACHMENT_CATEGORY.DOCUMENT} accept={DOCUMENT_ACCEPT} busy={busy} onPick={upload}>Thêm tệp</PickButton>
                    )}
                </div>
                {docs.length ? (
                    <div className={s.rowList} data-gallery={ATTACHMENT_CATEGORY.DOCUMENT}>
                        {docs.map(a => (
                            <div key={a.id} className={s.rowItem}>
                                <FileText size={18} aria-hidden="true" style={{ color: 'var(--color-text-secondary)', flexShrink: 0 }} />
                                <div className={s.rowMain}>
                                    <span className={s.rowTitle}>
                                        <button type="button" className={s.linkButton} onClick={() => setPreview(a)}>{a.fileName || a.url}</button>
                                    </span>
                                    <span className={s.rowSub}>{[a.uploadedByName, formatDate(a.createdAt)].filter(Boolean).join(' · ')}</span>
                                </div>
                                <a className="ui-icon-btn ui-icon-btn--sm" href={a.url} download={a.fileName || true}
                                    title={`Tải xuống ${a.fileName || 'tệp'}`} aria-label={`Tải xuống ${a.fileName || 'tệp'}`}>
                                    <Download size={14} aria-hidden="true" />
                                </a>
                                {canRemove(a) && <IconButton icon={Trash2} size="sm" label={`Gỡ ${a.fileName || 'tệp'}`} onClick={() => setRemoving(a)} />}
                            </div>
                        ))}
                    </div>
                ) : <span className={s.placeholder}>Chưa có tài liệu</span>}
            </section>

            <PreviewModal
                attachment={preview}
                canRemove={preview && canRemove(preview)}
                onRemove={setRemoving}
                onClose={() => setPreview(null)}
            />

            <ConfirmDialog
                isOpen={!!removing}
                onClose={() => setRemoving(null)}
                onConfirm={remove}
                title="Gỡ tệp"
                message={`Gỡ "${removing?.fileName || 'tệp này'}" khỏi vấn đề ${issue.code}? Thao tác được ghi vào nhật ký.`}
                confirmText="Gỡ tệp"
            />
        </>
    );
}
