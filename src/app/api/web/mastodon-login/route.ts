import { loginReqDto } from "@/app/_dto/web/login/login.dto";
import { validateStrict } from "@/utils/validator/strictValidator";
import { NextRequest, NextResponse } from "next/server";
import { sendErrorResponse } from "../../functions/web/errorResponse";
import { PrismaClient } from "@prisma/client";
import { v4 as uuid } from "uuid";

export async function POST(req: NextRequest) {
  let data: loginReqDto;
  const body = await req.json();

  //일단은 미스키와 같은 Validate를 거침
  try {
    data = await validateStrict(loginReqDto, body);
  } catch (err) {
    return sendErrorResponse(400, `${err}`);
  }

  const mastodonHost = data.host.toLowerCase();
  const prisma = new PrismaClient();

  try {
    const serverInfo = await prisma.server.findFirst({
      where: {
        instances: mastodonHost,
      },
    });

    //인스턴스의 첫번째 로그인인 경우
    if (!serverInfo) {
      const res = await fetch(`https://${mastodonHost}/api/v1/apps`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_name: "Neo-Quesdon",
          redirect_uris: `${process.env.WEB_URL}/mastodon-callback`,
          scopes: "read write",
          website: `${process.env.WEB_URL}`,
        }),
      }).then((r) => r.json());

      if (!res.id) {
        return sendErrorResponse(500, `login error!`);
      }

      await prisma.server.upsert({
        where: {
          instances: mastodonHost,
        },
        update: {
          client_secret: res.client_secret,
        },
        create: {
          instances: mastodonHost,
          client_id: res.client_id,
          client_secret: res.client_secret,
        },
      });
      const shit = await initiateMastodonAuthSession(
        mastodonHost,
        res.client_id
      );
      return NextResponse.json(shit);

      // 클라이언트 시크릿이 존재하는 경우
    } else if (serverInfo.client_id && serverInfo.client_secret) {
      const shit = await initiateMastodonAuthSession(
        mastodonHost,
        serverInfo.client_id
      );
      return NextResponse.json(shit);
    }
  } catch (err) {
    return sendErrorResponse(500, `login error... ${err}`);
  }
}

async function initiateMastodonAuthSession(
  hostname: string,
  client_id: string
) {
  const loginState = `${uuid()}_${client_id}`;

  const params: { [key: string]: string } = {
    client_id: client_id,
    scope: "read+write",
    redirect_uri: `${process.env.WEB_URL}/mastodon-callback`,
    response_type: "code",
    state: loginState,
  };

  const url = `https://${hostname}/oauth/authorize?${Object.entries(params)
    .map((v) => v.join("="))
    .join("&")}`;

  return url;
}
