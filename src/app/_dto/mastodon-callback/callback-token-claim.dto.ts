import { IsString } from 'class-validator';

export class mastodonCallbackTokenClaimPayload {
  /** Mastodon code를 요청할 mastodon의 host (예: planet.moe) */
  @IsString()
  mastodonHost: string;

  /** callback으로 받은 토큰 */
  @IsString()
  callback_code: string;

  /** 현재 로그인 state */
  @IsString()
  state: string;
}
