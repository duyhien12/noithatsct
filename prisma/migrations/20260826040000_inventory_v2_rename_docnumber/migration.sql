-- Rename InvDocument.docNumber to code (align with house convention: code/PurchaseOrder.code, MfgOrder.code)
ALTER TABLE "InvDocument" RENAME COLUMN "docNumber" TO "code";
