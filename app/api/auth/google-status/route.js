import { NextResponse } from 'next/server';

// Cho client biết Google OAuth đã được cấu hình chưa
export async function GET() {
    const configured = !!(
        process.env.GOOGLE_CLIENT_ID?.trim() &&
        process.env.GOOGLE_CLIENT_SECRET?.trim()
    );
    return NextResponse.json({ configured });
}
