import { loginReqDto } from "@/app/_dto/web/login/login.dto";
import { validateStrict } from "@/utils/validator/strictValidator";
import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { sendErrorResponse } from "../../functions/web/errorResponse";
import { MiApiError, MiAuthSession } from "@/app";

export async function POST(req: NextRequest) {
  let data: loginReqDto;
  const body = await req.json();
  try {
    data = await validateStrict(loginReqDto, body);
  } catch (err) {
    return sendErrorResponse(400, `${err}`);
  }

  const misskeyHost = data.misskeyHost.toLowerCase();
  const prisma = new PrismaClient();

  try {
    const serverInfo = await prisma.server.findFirst({
      where: {
        instances: misskeyHost,
      },
    });

    // 인스턴스의 첫 번째 로그인이거나, 앱시크릿이 유효하지 않은 경우
    if (serverInfo === null || serverInfo.appSecret === null) {
      const payload = {
        name: "Neo-Quesdon",
        description: "새로운 퀘스돈, 네오-퀘스돈입니다.",
        permission: ["write:notes", "read:follower"],
        callbackUrl: `${process.env.WEB_URL}/misskey-callback`,
      };

      // Create New App in instance
      const res = await fetch(`https://${misskeyHost}/api/app/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        return sendErrorResponse(
          500,
          `Login Error! From Remote: ${await res.text()}`
        );
      }
      const data = await res.json();
      const appSecret = data.secret;
      console.log('New Misskey APP created!', data);

      await prisma.server.upsert({
        where: {
          instances: misskeyHost,
        },
        update: {
          appSecret: appSecret,
        },
        create: {
          appSecret: appSecret,
          instances: misskeyHost,
        },
      });
      const authRes = await initiateMisskeyAuthSession(
        misskeyHost,
        appSecret
      );
      if (!authRes.ok) {
        return sendErrorResponse(
          500,
          `Fail to Create Auth Session: ${await authRes.text()}`
        );
      }
      const misskeyAuthSession = (await authRes.json()) as MiAuthSession;
      console.log(`New Misskey Auth Session Created: `, misskeyAuthSession);
      return NextResponse.json(misskeyAuthSession);
    }
    // 앱 시크릿 존재하는 경우
    else {
      const res = await initiateMisskeyAuthSession(
        misskeyHost,
        serverInfo.appSecret
      );
      if (!res.ok) {
        const data = (await res.json()) as MiApiError;
        if (data.error.code === "NO_SUCH_APP") {
          // 어라라...? 앱 스크릿 무효화
          console.log(`Misskey response NO_SUCH_APP, delete invalid appSecret from DB`);
          await prisma.server.update({
            where: { instances: misskeyHost },
            data: { appSecret: null },
          });
        }
        return sendErrorResponse(
          500,
          `Fail to Create Misskey Auth Session`
        );
      }
      const misskeyAuthSession = (await res.json()) as MiAuthSession;
      console.log(`New Misskey Auth Session Created: `, misskeyAuthSession);
      return NextResponse.json(misskeyAuthSession);
    }
  } catch (err) {
    return sendErrorResponse(500, `login error... ${err}`);
  }
}

/**
 * initiate Misskey App Auth Session
 * @param host misskey host
 * @param appSecret Misskey AppSecret
 * @returns Misskey API Response
 */
async function initiateMisskeyAuthSession(
  host: string,
  appSecret: string
): Promise<Response> {
  return await fetch(`https://${host}/api/auth/session/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      appSecret: appSecret,
    }),
  });
}
