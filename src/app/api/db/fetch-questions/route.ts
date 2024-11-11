import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { authJwtToken } from "../../functions/web/authJwtToken";

export async function GET(req: NextRequest) {
  const cookie = req.cookies.get("jwtToken");
  const prisma = new PrismaClient();

  try {
    if (cookie) {
      const jwt = await authJwtToken(cookie.value);
      if (jwt.handle) {
        const questions = await prisma.question.findMany({
          where: {
            questioneeHandle: jwt.handle,
          },
        });
        return NextResponse.json(questions);
      } else {
        return NextResponse.json({ status: 401, message: "Unauthorized" });
      }
    } else {
      return NextResponse.json({ status: 400, message: "Bad Request" });
    }
  } catch (err) {
    return NextResponse.json(err);
  }
}
