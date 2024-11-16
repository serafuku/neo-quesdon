import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "../../functions/web/verify-jwt";
import { sendApiError } from "@/utils/apiErrorResponse/sendApiError";

export async function GET(req: NextRequest) {
  const cookie = req.cookies.get("jwtToken");
  const prisma = new PrismaClient();

  try {
    if (cookie) {
      const jwt = await verifyToken(cookie.value);
      if (jwt.handle) {
        const questions = await prisma.question.findMany({
          where: {
            questioneeHandle: jwt.handle,
          },
        });
        return NextResponse.json(questions);
      } else {
        return sendApiError(400, 'Bad Request');
      }
    } else {
      return sendApiError(401, 'Unauthorized');
    }
  } catch (err) {
    return sendApiError(500, `${err}`);
  }
}
