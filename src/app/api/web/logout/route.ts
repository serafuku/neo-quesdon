import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const cookieStore = await cookies();

    cookieStore.delete('jwtToken');

    return NextResponse.json({ status: 200 });
  } catch (err) {
    return NextResponse.json({ status: 500, error: err }, { status: 500 });
  }
}
