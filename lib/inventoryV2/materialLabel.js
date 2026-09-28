/** Phần đuôi tên vật tư: "-mã màu-độ dày", VD AC-333-17 (bỏ độ dày nếu chưa khai). Dùng được cả client lẫn server. */
export function materialNameSuffix(m) {
    const thickness = Number(m?.thickness) || 0;
    return [m?.colorCode, thickness > 0 ? thickness : ''].filter(Boolean).map(x => `-${x}`).join('');
}

/** Tên đầy đủ, VD "AC-333-17". */
export function materialFullName(m) {
    return `${m?.name || ''}${materialNameSuffix(m)}`;
}
