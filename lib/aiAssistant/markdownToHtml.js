/**
 * Chuyển Markdown (định dạng Claude hay dùng: heading, bảng GFM, danh sách, in đậm) sang HTML
 * đơn giản để in/xuất PDF. Không phải parser Markdown đầy đủ — chỉ đủ cho các khối mà
 * DOCUMENT_ASSISTANT_BASE_SYSTEM_PROMPT yêu cầu Claude tạo ra.
 */

// Claude được yêu cầu không chèn HTML thô, nhưng phòng khi vẫn lọt qua — bóc thẻ, giữ lại nội dung
// bên trong thay vì hiện nguyên văn "<div>" ra tài liệu in.
function stripRawHtml(s) {
    return s.replace(/<\/?[a-zA-Z][^>]*>/g, '');
}

function escapeHtml(s) {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function inline(text) {
    let s = escapeHtml(text);
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(?<!\*)\*(?!\*)(.+?)\*(?!\*)/g, '<em>$1</em>');
    return s;
}

function isTableSeparator(line) {
    return /^\|?[\s:|-]+\|?$/.test(line) && line.includes('-');
}

function renderTable(lines) {
    const rows = lines.filter((l) => l.trim().startsWith('|'));
    if (rows.length < 2) return '';
    const cellsOf = (row) => row.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
    const header = cellsOf(rows[0]);
    const bodyRows = rows.slice(2).map(cellsOf); // rows[1] is the --- separator
    let html = '<table class="doc-table"><thead><tr>';
    header.forEach((h) => { html += `<th>${inline(h)}</th>`; });
    html += '</tr></thead><tbody>';
    bodyRows.forEach((r) => {
        html += '<tr>';
        r.forEach((c) => { html += `<td>${inline(c)}</td>`; });
        html += '</tr>';
    });
    html += '</tbody></table>';
    return html;
}

export function markdownToHtml(markdown) {
    const lines = stripRawHtml((markdown || '').replace(/\r\n/g, '\n')).split('\n');
    const htmlBlocks = [];
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];

        if (line.trim() === '') { i++; continue; }

        // Table block
        if (line.trim().startsWith('|') && lines[i + 1] && isTableSeparator(lines[i + 1])) {
            const tableLines = [];
            while (i < lines.length && lines[i].trim().startsWith('|')) {
                tableLines.push(lines[i]);
                i++;
            }
            htmlBlocks.push(renderTable(tableLines));
            continue;
        }

        // Heading
        const headingMatch = line.match(/^(#{1,4})\s+(.*)$/);
        if (headingMatch) {
            const level = headingMatch[1].length;
            htmlBlocks.push(`<h${level}>${inline(headingMatch[2])}</h${level}>`);
            i++;
            continue;
        }

        // Horizontal rule
        if (/^-{3,}$/.test(line.trim()) || /^={3,}$/.test(line.trim())) {
            htmlBlocks.push('<hr/>');
            i++;
            continue;
        }

        // List block (bullet, numbered, or checkbox)
        if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
            const items = [];
            const ordered = /^\s*\d+\.\s+/.test(line);
            while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i])) {
                const itemText = lines[i].replace(/^\s*([-*]|\d+\.)\s+/, '');
                const checkboxMatch = itemText.match(/^\[( |x|X)\]\s+(.*)$/);
                if (checkboxMatch) {
                    const checked = checkboxMatch[1].toLowerCase() === 'x';
                    items.push(`<li class="doc-check">${checked ? '☑' : '☐'} ${inline(checkboxMatch[2])}</li>`);
                } else {
                    items.push(`<li>${inline(itemText)}</li>`);
                }
                i++;
            }
            const tag = ordered ? 'ol' : 'ul';
            htmlBlocks.push(`<${tag}>${items.join('')}</${tag}>`);
            continue;
        }

        // Paragraph (collect consecutive non-blank, non-special lines)
        const paraLines = [];
        while (
            i < lines.length &&
            lines[i].trim() !== '' &&
            !lines[i].trim().startsWith('|') &&
            !/^(#{1,4})\s+/.test(lines[i]) &&
            !/^-{3,}$/.test(lines[i].trim()) &&
            !/^\s*([-*]|\d+\.)\s+/.test(lines[i])
        ) {
            paraLines.push(lines[i]);
            i++;
        }
        htmlBlocks.push(`<p>${paraLines.map(inline).join('<br/>')}</p>`);
    }

    return htmlBlocks.join('\n');
}
