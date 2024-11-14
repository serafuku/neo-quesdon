import { userProfileDto } from "@/app/_dto/fetch-profile/Profile.dto";
import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

export const revalidate = 60;

export async function GET(req: NextRequest, { params }: { params: Promise<{handle?: string}> }) {
  const prisma = new PrismaClient();
  const userHandle = (await params).handle;
  try {
    if (!userHandle) { 
      throw new Error('userHandle empty');
    }
    const profile = await prisma.profile.findUnique({
      where: {
        handle: userHandle,
      },
    });
    if (!profile) {
      return NextResponse.json({ message: `profile ${profile} not found`}, {status: 404});
    }
    const resBody: userProfileDto = {
      handle: profile.handle,
      name: profile.name,
      stopNewQuestion: profile.stopNewQuestion,
      stopAnonQuestion: profile.stopAnonQuestion,
      avatarUrl: profile.avatarUrl,
      questionBoxName: profile.questionBoxName,
    }


    return NextResponse.json(resBody, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=3600',
      }
    });
  } catch (err) {
    return NextResponse.json({}, {status: 400});
  }
}
