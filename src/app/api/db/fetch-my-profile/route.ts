import { PrismaClient } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const prisma = new PrismaClient();

  try {
    const res = await prisma.profile.findUnique({
      where: {
        handle: body,
      },
    });

    return NextResponse.json(res);
  } catch (err) {
    return NextResponse.json({ status: 400, message: `Bad Request: ${err}` });
  }
}
