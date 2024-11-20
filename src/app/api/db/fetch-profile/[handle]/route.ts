import {
  userProfileDto,
  userProfileWithHostnameDto,
} from "@/app/_dto/fetch-profile/Profile.dto";
import { sendApiError } from "@/utils/apiErrorResponse/sendApiError";
import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ handle?: string }> }
) {
  const prisma = new PrismaClient();
  const userHandle = (await params).handle;
  try {
    if (!userHandle) {
      return sendApiError(400, "userHandle empty");
    }
    const profile = await prisma.profile.findUnique({
      where: {
        handle: userHandle,
      },
      select: {
        user: {
          select: {
            hostName: true,
          },
        },
        handle: true,
        name: true,
        stopNewQuestion: true,
        stopAnonQuestion: true,
        avatarUrl: true,
        questionBoxName: true,
        stopNotiNewQuestion: true,
        stopPostAnswer: true,
      },
    });
    if (!profile) {
      return NextResponse.json(
        { message: `profile ${profile} not found` },
        { status: 404 }
      );
    }
    const { instanceType } = await prisma.server.findUniqueOrThrow({where: {instances: profile.user.hostName}});
    const resBody: userProfileWithHostnameDto = {
      handle: profile.handle,
      name: profile.name,
      stopNewQuestion: profile.stopNewQuestion,
      stopAnonQuestion: profile.stopAnonQuestion,
      avatarUrl: profile.avatarUrl,
      questionBoxName: profile.questionBoxName,
      stopNotiNewQuestion: profile.stopNotiNewQuestion,
      stopPostAnswer: profile.stopPostAnswer,
      hostname: profile.user.hostName,
      instanceType: instanceType,
    };

    return NextResponse.json(resBody, {
      status: 200,
      headers: {
        "Cache-Control": "public, max-age=10",
      },
    });
  } catch (err) {
    console.log(err);
    return sendApiError(500, "Error");
  }
}
