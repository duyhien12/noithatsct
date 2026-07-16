/**
 * Ghi audit log dùng chung cho module sản xuất (mục VI.10, IX).
 * Luôn gọi bên trong transaction cùng với thao tác đổi trạng thái.
 */
export async function writeAudit(tx, { entityType, entityId, action, fromStatus = '', toStatus = '', session, note = '' }) {
    return tx.mfgAuditLog.create({
        data: {
            entityType,
            entityId,
            action,
            fromStatus,
            toStatus,
            byUserId: session?.user?.id || '',
            byUserName: session?.user?.name || '',
            note,
        },
    });
}
