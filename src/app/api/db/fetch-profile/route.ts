import { userProfileDto } from "@/app/_dto/fetch-profile/Profile.dto";
import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const prisma = new PrismaClient();

  try {
    const profile = await prisma.profile.findUnique({
      where: {
        handle: body,
      },
    });
    if (!profile) {
      throw new Error(`profile ${body} not found`);
    }
    const res: userProfileDto = {
      handle: profile.handle,
      name: profile.name,
      stopNewQuestion: profile.stopNewQuestion,
      stopAnonQuestion: profile.stopAnonQuestion,
      avatarUrl: profile.avatarUrl,
      questionBoxName: profile.questionBoxName,
    }

    return NextResponse.json(res);
  } catch (err) {
    return NextResponse.json(err, {status: 400});
  }
}
