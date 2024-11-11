import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { protocol, host, address } = await req.json();
  const prisma = new PrismaClient();

  try {
    const checkInstances = await prisma.server.findFirst({
      where: {
        instances: address,
      },
    });

    if (checkInstances === null) {
      const payload = {
        name: "Neo-Quesdon",
        description: "새로운 퀘스돈, 네오-퀘스돈입니다.",
        permission: ["write:notes", "read:follower"],
        callbackUrl: `${protocol}//${host}/misskey-callback`,
      };

      const appSecret = await fetch(`https://${address}/api/app/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }).then((r) => r.json());

      const storeAppSecret = await prisma.server.create({
        data: {
          appSecret: appSecret.secret,
          instances: address,
        },
      });

      const misskeyToken = await fetch(
        `https://${address}/api/auth/session/generate`,
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

      return NextResponse.json(misskeyToken);
    } else if (checkInstances !== null) {
      const misskeyToken = await fetch(
        `https://${address}/api/auth/session/generate`,
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

      return NextResponse.json(misskeyToken);
    }
  } catch (err) {
    return NextResponse.json({ error: err });
  }
}
