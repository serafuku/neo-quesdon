import { loginReqDto } from "@/app/_dto/web/login/login.dto";
import { validateStrict } from "@/utils/validator/strictValidator";
import { NextRequest, NextResponse } from "next/server";
import { sendErrorResponse } from "../../functions/web/errorResponse";
import { v4 as uuid } from "uuid";
import { GetPrismaClient } from "@/utils/getPrismaClient/get-prisma-client";
import { Logger } from "@/utils/logger/Logger";

const logger = new Logger('mastodon-login');
export async function POST(req: NextRequest) {
  let data: loginReqDto;
  const body = await req.json();
  const prisma = GetPrismaClient.getClient();

  //일단은 미스키와 같은 Validate를 거침
  try {
    data = await validateStrict(loginReqDto, body);
  } catch (err) {
    return sendErrorResponse(400, `${err}`);
  }

  const mastodonHost = data.host.toLowerCase();

  try {
    const serverInfo = await prisma.server.findFirst({
      where: {
        instances: mastodonHost,
      },
    });

    //인스턴스의 첫번째 로그인이거나, client_id/client_secret 가 null인 경우
    if (!serverInfo || !serverInfo.client_id || !serverInfo.client_secret) {
      const res = await fetch(`https://${mastodonHost}/api/v1/apps`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_name: "Neo-Quesdon",
          redirect_uris: `${process.env.WEB_URL}/mastodon-callback`,
          scopes: "read:accounts read:blocks read:follows write:statuses",
          website: `${process.env.WEB_URL}`,
        }),
      }).then((r) => r.json());

      if (!res.id) {
        return sendErrorResponse(500, `Mastodon Response: ${JSON.stringify(res)}`);
      }
      logger.log('New Mastodon OAuth2 App Created:', res);

      await prisma.server.upsert({
        where: {
          instances: mastodonHost,
        },
        update: {
          client_id: res.client_id,
          client_secret: res.client_secret,
          instanceType: 'mastodon',
        },
        create: {
          instances: mastodonHost,
          client_id: res.client_id,
          client_secret: res.client_secret,
          instanceType: 'mastodon',
        },
      });
      const session = await initiateMastodonAuthSession(
        mastodonHost,
        res.client_id
      );
      return NextResponse.json(session);

    } else {
      const session = await initiateMastodonAuthSession(
        mastodonHost,
        serverInfo.client_id
      );
      return NextResponse.json(session);
    }
  } catch (err) {
    return sendErrorResponse(500, `login error... ${err}`);
  }
}

/**
 * 
 * @param hostname Mastodon Hostname
 * @param client_id OAuth2 Client ID
 * @returns Mastodon Authorize URL
 */
async function initiateMastodonAuthSession(
  hostname: string,
  client_id: string
) {
  const loginState = `${uuid()}_${client_id}`;

  const params: { [key: string]: string } = {
    client_id: encodeURIComponent(client_id),
    scope: "read:accounts+read:blocks+read:follows+write:statuses",
    redirect_uri: encodeURIComponent(`${process.env.WEB_URL}/mastodon-callback`),
    response_type: "code",
    state: loginState,
  };

  const url = `https://${hostname}/oauth/authorize?${Object.entries(params)
    .map((v) => v.join("="))
    .join("&")}`;
  logger.log('Created New Mastodon OAuth2 authorize URL:', url);
  return url;
}
