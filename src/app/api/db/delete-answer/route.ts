import { DeleteAnswerDto } from "@/app/_dto/delete-answer/delete-answer.dto";
import { sendApiError } from "@/utils/apiErrorResponse/sendApiError";
import { validateStrict } from "@/utils/validator/strictValidator";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "../../functions/web/verify-jwt";
import { GetPrismaClient } from "@/utils/getPrismaClient/get-prisma-client";
import { Logger } from "@/utils/logger/Logger";

const logger = new Logger('delete-answer');
export async function POST(req: NextRequest) {
  const body = await req.json();
  let data: DeleteAnswerDto;
  try {
    data = await validateStrict(DeleteAnswerDto, body);
  } catch (err) {
    return sendApiError(400, `Bad Request ${err}`);
  }
  const prisma = GetPrismaClient.getClient();
  const cookieStore = await cookies();
  const token = cookieStore.get("jwtToken")?.value;
  let tokenPayload;
  // JWT 토큰 검증
  try {
    tokenPayload = await verifyToken(token);
  } catch (err) {
    return sendApiError(401, "Unauthorized");
  }
  const willBeDeletedAnswer = await prisma.answer.findUnique({
    where: { id: data.id },
  });
  if (!willBeDeletedAnswer) {
    // 그런 답변이 없음
    return sendApiError(404, "Not Found");
  }
  if (willBeDeletedAnswer.answeredPersonHandle !== tokenPayload.handle) {
    // 너의 답변이 아님
    return sendApiError(403, "This is Not Your Answer!");
  }
  try {
    logger.log(`Delete answer... : ${data.id}`);
    await prisma.answer.delete({ where: { id: data.id } });

    return NextResponse.json(
      { message: "Delete Answer Successful" },
      { status: 200 }
    );
  } catch (err) {
    logger.error('Error: Delete answer:', err);
    return sendApiError(500, `Error ${JSON.stringify(err)}`);
  }
}
