/**
 * Bóc tách vật tư nội thất / cutlist — tính toán, kiểm tra và đối chiếu tồn.
 * Isomorphic (thuần hàm): API route dùng để chặn chốt khi còn lỗi, trang dùng để kiểm tra trực tiếp.
 *
 * Nguyên tắc: không tự sinh định mức — hao hụt, định mức keo PUR, khổ tấm lấy từ dữ liệu người
 * dùng/danh mục; thiếu thì trả null để giao diện ghi "CHƯA CÓ DỮ LIỆU". Số tấm là ước tính theo
 * diện tích, không thay cho sơ đồ cắt tối ưu. Không cộng lẫn đơn vị khác nhau.
 */
import { getMfgPermissions } from '@/lib/manufacturing/permissions';
import { materialFullName } from '@/lib/inventoryV2/materialLabel';

export const CUTLIST_STATUS_LABELS = {
    DRAFT: 'Dự thảo',
    CHECKED: 'Đã kiểm tra – chờ duyệt',
    APPROVED: 'Đã duyệt',
    SUPERSEDED: 'Đã thay bằng bản mới',
    CANCELLED: 'Đã hủy',
};

export const CUTLIST_STATUS_STYLE = {
    DRAFT: 'muted',
    CHECKED: 'warning',
    APPROVED: 'success',
    SUPERSEDED: 'muted',
    CANCELLED: 'danger',
};

// Nhóm danh mục Kho 2.0 (InvMaterialCategory.code)
export const PANEL_CATEGORY_CODES = ['VCN', 'BM', 'VTT'];
export const EDGE_CATEGORY_CODES = ['NCC'];
export const ITEM_GROUP_LABELS = {
    PK: 'Phụ kiện',
    KK: 'Kim khí',
    KSC: 'Keo, sơn, hóa chất',
    KDN: 'Kính, đá, nhôm, inox',
    DDL: 'Điện, đèn LED',
    VDG: 'Vật tư đóng gói',
    VTH: 'Vật tư tiêu hao',
};

/** Prisma select cho material / edgeMaterial trên dòng cutlist — đủ field để checkCutlist + summarize. */
export const CUTLIST_MATERIAL_SELECT = {
    select: {
        id: true, sku: true, name: true, colorCode: true, length: true, width: true, thickness: true,
        category: { select: { code: true, name: true } },
        stockUnit: { select: { code: true } },
    },
};

const EDGE_SIDES = ['edgeL1', 'edgeL2', 'edgeW1', 'edgeW2'];

/** Quyền: sửa = quản lý vật tư (Thủ kho, Quản đốc, Thiết kế...); duyệt = cấp quản lý xưởng trở lên. */
export function getCutlistPermissions(user) {
    const p = getMfgPermissions(user);
    return {
        view: p.view,
        edit: p.manage_material,
        approve: p.manage_material && p.assign,
    };
}

const num = (v) => Number(v) || 0;
const round = (v, d = 3) => Math.round(v * 10 ** d) / 10 ** d;

/** Độ dày hiệu lực của chi tiết: ghi trên dòng, nếu trống lấy theo vật tư. */
export function lineThickness(line) {
    return num(line.thickness) || num(line.material?.thickness);
}

/** Diện tích chi tiết tấm (m²) = dài × rộng × SL. */
export function panelAreaM2(line) {
    return (num(line.length) * num(line.width) * num(line.quantity)) / 1e6;
}

/** Mét dài chỉ cạnh của dòng = (dài × số cạnh dài + rộng × số cạnh rộng) × SL. */
export function panelEdgeMeters(line) {
    const longSides = (line.edgeL1 ? 1 : 0) + (line.edgeL2 ? 1 : 0);
    const shortSides = (line.edgeW1 ? 1 : 0) + (line.edgeW2 ? 1 : 0);
    return ((num(line.length) * longSides + num(line.width) * shortSides) * num(line.quantity)) / 1000;
}

export function hasEdge(line) {
    return EDGE_SIDES.some(k => line[k]);
}

/** Chuỗi cạnh dán ngắn gọn, VD "D1 D2 R1". */
export function edgeLabel(line) {
    return [['edgeL1', 'D1'], ['edgeL2', 'D2'], ['edgeW1', 'R1'], ['edgeW2', 'R2']]
        .filter(([k]) => line[k]).map(([, l]) => l).join(' ');
}

/**
 * Đọc ký hiệu cạnh khi dán từ Excel: "D1 D2 R1", "L1,L2,W1", "2D1R", "4" (cả 4 cạnh), "x"/"" (không dán).
 * @returns {{edgeL1:boolean,edgeL2:boolean,edgeW1:boolean,edgeW2:boolean}}
 */
export function parseEdgeSpec(text) {
    const s = String(text || '').toUpperCase().replace(/\s+/g, '');
    const out = { edgeL1: false, edgeL2: false, edgeW1: false, edgeW2: false };
    if (!s || s === 'X' || s === '0' || s === '-') return out;
    if (s === '4' || s === '4C' || s === 'ALL') return { edgeL1: true, edgeL2: true, edgeW1: true, edgeW2: true };
    const count = s.match(/^([0-2])[DL](?:([0-2])[RW])?$/);
    if (count) {
        const l = Number(count[1]); const w = Number(count[2] || 0);
        return { edgeL1: l >= 1, edgeL2: l >= 2, edgeW1: w >= 1, edgeW2: w >= 2 };
    }
    if (/[DL]1/.test(s)) out.edgeL1 = true;
    if (/[DL]2/.test(s)) out.edgeL2 = true;
    if (/[RW]1/.test(s)) out.edgeW1 = true;
    if (/[RW]2/.test(s)) out.edgeW2 = true;
    return out;
}

/**
 * Chi tiết có nằm vừa khổ tấm không. Theo vân (grainLocked) thì chiều dài chi tiết phải
 * theo chiều dài tấm; không theo vân thì được xoay.
 * @returns {boolean|null} null khi vật tư chưa khai khổ tấm
 */
export function fitsSheet(line) {
    const sheetL = num(line.material?.length); const sheetW = num(line.material?.width);
    if (!sheetL || !sheetW) return null;
    const L = num(line.length); const W = num(line.width);
    const straight = L <= sheetL && W <= sheetW;
    if (line.grainLocked) return straight;
    return straight || (L <= sheetW && W <= sheetL);
}

const categoryCode = (m) => m?.category?.code || '';
const lineLabel = (line, idx) => `Dòng ${idx + 1}${line.partName ? ` (${line.partName})` : ''}`;

/**
 * Kiểm tra cutlist. Lỗi (error) chặn chốt; cảnh báo (warn) cần xem lại nhưng không chặn.
 * @param {object} cutlist - header (drawingRef, wastePercent, purGramPerMeter)
 * @param {object[]} lines - dòng kèm material / edgeMaterial (có category, stockUnit)
 * @returns {{severity:'error'|'warn', lineIndex:number|null, message:string}[]}
 */
export function checkCutlist(cutlist, lines) {
    const issues = [];
    const push = (severity, lineIndex, message) => issues.push({ severity, lineIndex, message });

    if (!String(cutlist?.drawingRef || '').trim()) {
        push('error', null, 'Chưa ghi nguồn bản vẽ / file cutlist — số liệu bóc tách phải truy được nguồn');
    }
    if (lines.length === 0) push('error', null, 'Bảng bóc tách chưa có dòng nào');
    const panelLines = lines.filter(l => l.lineType === 'PANEL');
    if (panelLines.some(hasEdge) && cutlist?.purGramPerMeter == null) {
        push('warn', null, 'Có dán chỉ cạnh nhưng chưa nhập định mức keo PUR (g/m) — chưa tính được keo');
    }
    if (!num(cutlist?.wastePercent) && panelLines.length > 0) {
        push('warn', null, 'Chưa nhập tỷ lệ hao hụt — số tấm đang tính không có hao hụt');
    }

    const seen = new Map();
    lines.forEach((line, idx) => {
        const at = lineLabel(line, idx);
        if (num(line.quantity) <= 0) push('error', idx, `${at}: số lượng phải > 0`);
        if (!line.mfgItemId && !String(line.productName || '').trim()) push('warn', idx, `${at}: chưa gắn sản phẩm / hạng mục`);
        if (!String(line.drawingPage || '').trim()) push('warn', idx, `${at}: chưa ghi trang / chi tiết bản vẽ`);

        if (line.lineType === 'PANEL') {
            if (!String(line.partName || '').trim()) push('error', idx, `${at}: chưa đặt tên chi tiết`);
            if (num(line.length) <= 0 || num(line.width) <= 0) push('error', idx, `${at}: kích thước dài/rộng phải > 0`);
            if (num(line.width) > num(line.length) && line.grainLocked) {
                push('warn', idx, `${at}: rộng lớn hơn dài trong khi chạy theo vân — kiểm tra lại chiều vân`);
            }
            if (!line.materialId) {
                push('error', idx, `${at}: chưa chọn mã ván trong danh mục`);
            } else {
                const m = line.material;
                if (m && !PANEL_CATEGORY_CODES.includes(categoryCode(m))) {
                    push('warn', idx, `${at}: mã ${m.sku} không thuộc nhóm ván/bề mặt`);
                }
                const t = num(line.thickness); const mt = num(m?.thickness);
                if (t > 0 && mt > 0 && t !== mt) push('error', idx, `${at}: dày ${t}mm khác độ dày vật tư ${m.sku} (${mt}mm)`);
                const fit = fitsSheet(line);
                if (fit === false) push('error', idx, `${at}: ${line.length}×${line.width} vượt khổ tấm ${m.length}×${m.width}${line.grainLocked ? ' (theo vân, không xoay)' : ''}`);
                if (fit === null && m) push('warn', idx, `${at}: vật tư ${m.sku} chưa khai khổ tấm — chưa tính được số tấm`);
            }
            if (hasEdge(line)) {
                if (!line.edgeMaterialId) push('error', idx, `${at}: có dán cạnh nhưng chưa chọn mã chỉ cạnh`);
                else if (line.edgeMaterial && !EDGE_CATEGORY_CODES.includes(categoryCode(line.edgeMaterial))) {
                    push('warn', idx, `${at}: mã ${line.edgeMaterial.sku} không thuộc nhóm nẹp/chỉ cạnh`);
                }
            }
            const key = [line.mfgItemId || line.productName, line.partName, num(line.length), num(line.width), line.materialId].join('|').toLowerCase();
            if (seen.has(key)) push('warn', idx, `${at}: trùng với dòng ${seen.get(key) + 1} (cùng sản phẩm, chi tiết, kích thước, vật tư)`);
            else seen.set(key, idx);
        } else {
            if (!line.materialId && !String(line.materialText || '').trim()) push('error', idx, `${at}: chưa chọn vật tư`);
            if (!String(line.unit || '').trim()) push('error', idx, `${at}: chưa ghi đơn vị`);
            const stockUnit = line.material?.stockUnit?.code;
            if (stockUnit && line.unit && stockUnit !== line.unit) {
                push('warn', idx, `${at}: đơn vị "${line.unit}" khác đơn vị kho "${stockUnit}" của ${line.material.sku} — không đối chiếu tồn được nếu chưa có hệ số quy đổi`);
            }
        }
    });
    return issues;
}

/**
 * Tổng hợp nhu cầu vật tư từ cutlist.
 * - Ván: tổng m², m² gồm hao hụt, số tấm ước tính = ceil(m² gồm hao hụt / m² một tấm)
 * - Chỉ cạnh: mét dài (gồm hao hụt) theo mã chỉ
 * - Keo PUR: kg = mét chỉ × định mức g/m ÷ 1000 (null nếu chưa có định mức)
 * - Vật tư khác: cộng theo mã + đơn vị (không cộng lẫn đơn vị)
 */
export function summarizeCutlist(cutlist, lines) {
    const waste = num(cutlist?.wastePercent) / 100;
    const panels = new Map(); const edges = new Map(); const items = new Map();

    for (const line of lines) {
        if (line.lineType === 'PANEL') {
            if (line.materialId) {
                const p = panels.get(line.materialId) || { materialId: line.materialId, material: line.material, pieces: 0, areaM2: 0 };
                p.pieces += num(line.quantity);
                p.areaM2 += panelAreaM2(line);
                panels.set(line.materialId, p);
            }
            const meters = panelEdgeMeters(line);
            if (meters > 0) {
                const key = line.edgeMaterialId || '__none__';
                const e = edges.get(key) || { materialId: line.edgeMaterialId || null, material: line.edgeMaterial || null, meters: 0 };
                e.meters += meters;
                edges.set(key, e);
            }
        } else {
            const unit = String(line.unit || '').trim();
            const key = `${line.materialId || `text:${String(line.materialText || '').trim().toLowerCase()}`}|${unit}`;
            const it = items.get(key) || {
                materialId: line.materialId || null, material: line.material || null,
                materialText: line.materialText || '', unit, quantity: 0,
                group: categoryCode(line.material) || 'KHAC',
            };
            it.quantity += num(line.quantity);
            items.set(key, it);
        }
    }

    const panelRows = [...panels.values()].map(p => {
        const sheetAreaM2 = (num(p.material?.length) * num(p.material?.width)) / 1e6;
        const areaWithWaste = p.areaM2 * (1 + waste);
        return {
            ...p,
            areaM2: round(p.areaM2), areaWithWaste: round(areaWithWaste),
            sheetAreaM2: sheetAreaM2 ? round(sheetAreaM2) : null,
            sheetsEstimate: sheetAreaM2 ? Math.ceil(round(areaWithWaste / sheetAreaM2, 6)) : null,
        };
    });
    const edgeRows = [...edges.values()].map(e => ({ ...e, meters: round(e.meters, 2), metersWithWaste: round(e.meters * (1 + waste), 2) }));
    const totalEdgeMeters = edgeRows.reduce((s, e) => s + e.metersWithWaste, 0);
    const purGram = cutlist?.purGramPerMeter;

    return {
        panels: panelRows,
        edges: edgeRows,
        pur: {
            edgeMeters: round(totalEdgeMeters, 2),
            gramPerMeter: purGram == null ? null : num(purGram),
            kg: purGram == null ? null : round((totalEdgeMeters * num(purGram)) / 1000, 3),
        },
        items: [...items.values()].map(i => ({ ...i, quantity: round(i.quantity) })),
        totals: {
            panelPieces: panelRows.reduce((s, p) => s + p.pieces, 0),
            panelAreaM2: round(panelRows.reduce((s, p) => s + p.areaM2, 0)),
        },
    };
}

/**
 * Đối chiếu nhu cầu với tồn khả dụng (đơn vị kho). Chỉ so khi quy được về đơn vị kho:
 * ván kho theo "tấm" → số tấm ước tính, theo "m2" → m²; chỉ cạnh kho theo "mét" → mét;
 * vật tư khác → đơn vị dòng trùng đơn vị kho. Ngược lại required = null kèm lý do.
 * @param {ReturnType<typeof summarizeCutlist>} summary
 * @param {Record<string, number>} availableByMaterial - materialId -> tồn khả dụng (onHand - reserved)
 */
export function compareWithStock(summary, availableByMaterial) {
    const rows = [];
    const add = (kind, materialId, material, required, reason, needLabel) => {
        const available = materialId ? num(availableByMaterial?.[materialId]) : null;
        rows.push({
            kind, materialId,
            label: material ? `${material.sku} — ${materialFullName(material)}` : needLabel,
            unit: material?.stockUnit?.code || '',
            need: needLabel,
            required: required == null ? null : round(required),
            available,
            shortage: required == null || available == null ? null : round(Math.max(0, required - available)),
            reason: reason || '',
        });
    };

    for (const p of summary.panels) {
        const u = p.material?.stockUnit?.code;
        const need = `${p.pieces} chi tiết · ${p.areaWithWaste} m²${p.sheetsEstimate != null ? ` · ~${p.sheetsEstimate} tấm` : ''}`;
        if (u === 'tấm') add('Ván', p.materialId, p.material, p.sheetsEstimate, p.sheetsEstimate == null ? 'Chưa khai khổ tấm' : '', need);
        else if (u === 'm2') add('Ván', p.materialId, p.material, p.areaWithWaste, '', need);
        else add('Ván', p.materialId, p.material, null, `Đơn vị kho "${u || '?'}" — cần hệ số quy đổi`, need);
    }
    for (const e of summary.edges) {
        const u = e.material?.stockUnit?.code;
        const need = `${e.metersWithWaste} m`;
        if (!e.materialId) add('Chỉ cạnh', null, null, null, 'Chưa chọn mã chỉ cạnh', `Chỉ cạnh chưa chọn mã · ${need}`);
        else if (u === 'mét') add('Chỉ cạnh', e.materialId, e.material, e.metersWithWaste, '', need);
        else add('Chỉ cạnh', e.materialId, e.material, null, `Đơn vị kho "${u || '?'}" — cần hệ số quy đổi từ mét`, need);
    }
    for (const it of summary.items) {
        const u = it.material?.stockUnit?.code;
        const need = `${it.quantity} ${it.unit}`;
        if (!it.materialId) add(ITEM_GROUP_LABELS[it.group] || 'Khác', null, null, null, 'Chưa có mã trong danh mục', `${it.materialText} · ${need}`);
        else if (u === it.unit) add(ITEM_GROUP_LABELS[it.group] || 'Khác', it.materialId, it.material, it.quantity, '', need);
        else add(ITEM_GROUP_LABELS[it.group] || 'Khác', it.materialId, it.material, null, `Đơn vị dòng "${it.unit}" ≠ đơn vị kho "${u || '?'}"`, need);
    }
    return rows;
}

/** Chuẩn hóa dòng từ client trước khi ghi DB (bỏ field quan hệ, ép kiểu số/boolean). */
export function sanitizeLine(raw, idx) {
    const lineType = raw.lineType === 'ITEM' ? 'ITEM' : 'PANEL';
    const str = (v) => String(v ?? '').trim();
    const isPanel = lineType === 'PANEL';
    return {
        sortOrder: idx,
        lineType,
        mfgItemId: raw.mfgItemId || null,
        productName: str(raw.productName),
        partName: str(raw.partName),
        materialId: raw.materialId || null,
        materialText: str(raw.materialText),
        length: isPanel ? num(raw.length) : 0,
        width: isPanel ? num(raw.width) : 0,
        thickness: isPanel ? num(raw.thickness) : 0,
        quantity: num(raw.quantity),
        unit: isPanel ? 'chi tiết' : str(raw.unit),
        grainLocked: isPanel && !!raw.grainLocked,
        edgeMaterialId: isPanel ? (raw.edgeMaterialId || null) : null,
        edgeL1: isPanel && !!raw.edgeL1,
        edgeL2: isPanel && !!raw.edgeL2,
        edgeW1: isPanel && !!raw.edgeW1,
        edgeW2: isPanel && !!raw.edgeW2,
        drawingPage: str(raw.drawingPage),
        note: str(raw.note),
    };
}
