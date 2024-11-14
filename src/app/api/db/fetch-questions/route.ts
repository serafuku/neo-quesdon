import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "../../functions/web/verify-jwt";

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
        return NextResponse.json({ status: 401, message: "Unauthorized" }, {status: 401});
      }
    } else {
      return NextResponse.json({ status: 400, message: "Bad Request" }, {status: 400});
    }
  } catch (err) {
    return NextResponse.json(err, {status: 500});
  }
}
