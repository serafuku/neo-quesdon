import { loginReqDto } from "@/app/_dto/web/login/login.dto";
import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { misskeyHost } = await req.json() as loginReqDto;
  const prisma = new PrismaClient();

  try {
    const checkInstances = await prisma.server.findFirst({
      where: {
        instances: misskeyHost,
      },
    });

    if (checkInstances === null) {
      const payload = {
        name: "Neo-Quesdon",
        description: "새로운 퀘스돈, 네오-퀘스돈입니다.",
        permission: ["write:notes", "read:follower"],
        callbackUrl: `${process.env.WEB_URL}/misskey-callback`,
      };

      const appSecret = await fetch(`https://${misskeyHost}/api/app/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }).then((r) => r.json());

      const storeAppSecret = await prisma.server.create({
        data: {
          appSecret: appSecret.secret,
          instances: misskeyHost,
        },
      });

      const misskeyAuthSession = await fetch(
        `https://${misskeyHost}/api/auth/session/generate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            appSecret: appSecret.secret,
          }),
        }
      ).then((r) => r.json());
      console.log(misskeyAuthSession);
      return NextResponse.json(misskeyAuthSession);
    } else if (checkInstances !== null) {
      const misskeyAuthSession = await fetch(
        `https://${misskeyHost}/api/auth/session/generate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            appSecret: checkInstances.appSecret,
          }),
        }
      ).then((r) => r.json());
      return NextResponse.json(misskeyAuthSession);
    }
  } catch (err) {
    return NextResponse.json({ error: err }, {status: 500});
  }
}
