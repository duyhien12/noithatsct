import { GoogleGenerativeAI } from '@google/generative-ai';

const SYSTEM_PROMPT = `Bạn là chuyên gia BA ngành Kiến trúc / Nội thất / Xây dựng.
Phân tích đoạn hội thoại/ghi chú dưới đây và trích xuất:

1. **summary**: Tóm tắt ngắn gọn nội dung trao đổi (2-3 câu).
2. **commitments**: Danh sách các cam kết / yêu cầu, mỗi item gồm:
   - title: Mô tả ngắn gọn (VD: "Sửa ban công tầng 2", "Thêm phòng thờ")
   - type: Một trong "request" (yêu cầu chỉnh sửa), "schedule" (lịch hẹn), "feedback" (phản hồi/nhận xét)
   - assignee: Người thực hiện (nếu có)
   - deadline: Deadline dạng ISO (nếu có, VD "2025-10-25"), null nếu không rõ
   - notes: Ghi chú thêm (nếu có)

Trả về JSON thuần, KHÔNG markdown, KHÔNG code block. Format:
{"summary":"...","commitments":[{"title":"...","type":"...","assignee":"...","deadline":null,"notes":""}]}

Nếu không tìm thấy cam kết nào, trả commitments = [].
Ưu tiên chính xác hơn bao phủ — chỉ trích xuất những gì rõ ràng.`;

export async function analyzeJournalText(rawInput, contextDate = null) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY chưa được cấu hình');

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const today = contextDate || new Date().toISOString().split('T')[0];
    const prompt = `Ngày hôm nay: ${today}\n\n--- NỘI DUNG ---\n${rawInput}\n--- HẾT ---`;

    const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 2048,
            responseMimeType: 'application/json',
        },
    });

    const text = result.response.text();
    try {
        return JSON.parse(text);
    } catch {
        // Try to extract JSON from response
        const match = text.match(/\{[\s\S]*\}/);
        if (match) return JSON.parse(match[0]);
        return { summary: text, commitments: [] };
    }
}
