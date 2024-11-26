import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "../../_utils/jwt/verify-jwt";
import { sendApiError } from "../../_utils/apiErrorResponse/sendApiError";
import { GetPrismaClient } from "../../_utils/getPrismaClient/get-prisma-client";
import { UserSettingsDto, UserSettingsUpdateDto } from "@/app/_dto/settings/settings.dto";
import { validateStrict } from "@/utils/validator/strictValidator";

export async function GET(req: NextRequest) {
  const jwt = req.cookies.get('jwtToken')?.value;
  let jwtBody;
  try {
    jwtBody = await verifyToken(jwt);
  }
  catch {
    return sendApiError(401, 'Auth Error');
  }

  const prisma = GetPrismaClient.getClient();
  const user_profile = await prisma.profile.findUniqueOrThrow({where: {handle: jwtBody.handle}});
  const res_body: UserSettingsDto = {
    stopAnonQuestion: user_profile.stopAnonQuestion,
    stopNewQuestion: user_profile.stopNewQuestion,
    stopNotiNewQuestion: user_profile.stopNotiNewQuestion,
    stopPostAnswer: user_profile.stopPostAnswer,
    questionBoxName: user_profile.questionBoxName,
  };
  return NextResponse.json(res_body);
}

export async function POST(req: NextRequest) {
  const jwt = req.cookies.get('jwtToken')?.value;
  let jwtBody;
  try {
    jwtBody = await verifyToken(jwt);
  }
  catch {
    return sendApiError(401, 'Auth Error');
  }
  
  let data;
  try {
    const body = await req.json();
    data = await validateStrict(UserSettingsUpdateDto, body);
  } catch {
    return sendApiError(400, 'Bad Request');
  }

  const prisma = GetPrismaClient.getClient();
  
  const updated = await prisma.profile.update({where: {handle: jwtBody.handle}, data: data});

  return NextResponse.json(updated);

}