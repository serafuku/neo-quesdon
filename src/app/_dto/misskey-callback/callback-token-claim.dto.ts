import { IsString } from 'class-validator';

export class misskeyCallbackTokenClaimPayload {
  /** Misskey Access key 를 요청할 misskey의 host (예: serafuku.moe) */
  @IsString()
  misskeyHost: string;

  /** callback으로 받은 토큰 */
  @IsString()
  callback_token: string;
}
