import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prisma = new PrismaClient();

    const res = await prisma.answer.findMany({
      where: {
        answeredPersonHandle: body,
      },
    });

    return NextResponse.json(res);
  } catch (err) {
    console.log(err);
  }
}
