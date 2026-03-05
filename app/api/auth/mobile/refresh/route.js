import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/prisma';

const SECRET = process.env.NEXTAUTH_SECRET;
const TOKEN_EXPIRY = '8h';

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Token không hợp lệ' },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7);

    let decoded;
    try {
      decoded = jwt.verify(token, SECRET);
    } catch (err) {
      return NextResponse.json(
        { error: 'Token hết hạn hoặc không hợp lệ' },
        { status: 401 }
      );
    }

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user || !user.active) {
      return NextResponse.json(
        { error: 'Tài khoản không còn hoạt động' },
        { status: 401 }
      );
    }

    const newToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );

    return NextResponse.json({
      token: newToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { error: 'Lỗi làm mới token' },
      { status: 500 }
    );
  }
}
