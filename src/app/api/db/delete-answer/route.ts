import { DeleteAnswerDto } from "@/app/_dto/delete-answer/delete-answer.dto";
import { sendApiError } from "@/utils/apiErrorResponse/sendApiError";
import { validateStrict } from "@/utils/validator/strictValidator";
import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { verifyToken } from "../../functions/web/verify-jwt";

export async function POST(req: NextRequest) {
  const body = await req.json();
  let data: DeleteAnswerDto;
  try {
    data = await validateStrict(DeleteAnswerDto, body);
  } catch (err) {
    return sendApiError(400, `Bad Request ${err}`);
  }
  const prisma = new PrismaClient();
  const cookieStore = await cookies();
  const token = cookieStore.get("jwtToken")?.value;
  let tokenPayload;
  // JWT 토큰 검증
  try {
    tokenPayload = await verifyToken(token);
  } catch (err) {
    return sendApiError(401, "Unauthorized");
  }
  const willBeDeletedAnswer = await prisma.answer.findUnique({where: { id: data.id }});
  if (!willBeDeletedAnswer) {
    // 그런 답변이 없음
    return sendApiError(404, 'Not Found');
  }
  if (willBeDeletedAnswer.answeredPersonHandle !== tokenPayload.handle) {
    // 너의 답변이 아님
    return sendApiError(403, 'This is Not Your Answer!');    
  }
  try {
    await prisma.answer.delete({ where: { id: data.id } });
  } catch (err) {
    return sendApiError(500, `Error ${JSON.stringify(err)}`);
  }
}
