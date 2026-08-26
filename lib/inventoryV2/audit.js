/**
 * Ghi audit log dùng chung cho module Kho vật tư xưởng 2.0.
 * Copy nguyên mẫu lib/manufacturing/audit.js — luôn gọi bên trong transaction
 * cùng với thao tác đổi trạng thái để đảm bảo tính nguyên tử.
 */
export async function writeInvAudit(tx, { entityType, entityId, action, fromStatus = '', toStatus = '', session, note = '' }) {
    return tx.invAuditLog.create({
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
