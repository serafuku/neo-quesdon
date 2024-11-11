import { PrismaClient } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const prisma = new PrismaClient();

  try {
    const newQuestion = await prisma.profile.create({
      data: {
        handle: body,
      },
    });
  } catch (err) {
    console.log(err);
  }
  return NextResponse.json({ status: 200 });
}
