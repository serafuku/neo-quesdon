'use client';

import { RefreshTokenReqDto } from '@/app/_dto/refresh-token/refresh-token.dto';

/**
 * /api/web/refresh-token 를 호출해서 JWT를 Refresh 하려고 시도합니다.
 * 성공적으로 JWT를 refresh 한 경우 last_token_refresh 를 현재 시간으로 업데이트합니다.
 */
export async function refreshJwt(onResNotOk?: (code: number, res: Response) => void) {
  const now = Math.ceil(Date.now() / 1000);
  const user_handle = localStorage.getItem('user_handle');
  const last_token_refresh = Number.parseInt(localStorage.getItem('last_token_refresh') ?? '0');
  if (!user_handle) return;
  try {
    const req: RefreshTokenReqDto = {
      handle: user_handle,
      last_refreshed_time: last_token_refresh,
    };
    const res = await fetch('/api/web/refresh-token', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(req),
    });
    if (!res.ok) {
      if (onResNotOk) {
        onResNotOk(res.status, res);
      }
      return;
    }
    localStorage.setItem('last_token_refresh', `${now}`);
  } catch (err) {
    console.error(err);
  }
}
