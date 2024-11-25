'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { login } from './actions';
import { MiUser as MiUser } from '../api/_misskey-entities/user';
import { misskeyCallbackTokenClaimPayload } from '../_dto/misskey-callback/callback-token-claim.dto';
import { misskeyUserInfoPayload } from '../_dto/misskey-callback/user-info.dto';
import type { profile, user } from '@prisma/client';

export type DBpayload = {
  account: user['account'];
  accountLower: user['accountLower'];
  hostName: user['hostName'];
  handle: user['handle'];
  name: profile['name'];
  avatarUrl: profile['avatarUrl'];
  accessToken: user['token'];
  userId: user['userId'];
};

export default function CallbackPage() {
  const [id, setId] = useState<number>(0);

  const router = useRouter();

  useEffect(() => {
    const server = localStorage.getItem('server');

    const url = new URL(window.location.href);
    const params = new URLSearchParams(url.search);

    const randomNumber = Math.ceil(Math.random() * 3);
    setId(randomNumber);

    const fn = async () => {
      try {
        if (server) {
          const callback_token = params.get('token');
          if (callback_token === null) {
            throw new Error('callback token is null?');
          }
          const payload: misskeyCallbackTokenClaimPayload = {
            misskeyHost: server,
            callback_token: callback_token,
          };

          let res: misskeyUserInfoPayload;
          try {
            res = await login(payload);
          } catch (err) {
            console.error(`login failed!`, err);
            throw err;
          }

          const user: MiUser = res.user;

          const handle = `@${user.username}@${server}`;
          localStorage.setItem('user_handle', handle);
          const now = Math.ceil(Date.now() / 1000);
          localStorage.setItem('last_token_refresh', `${now}`);

          router.replace('/main');
        }
      } catch (err) {
        console.error(err);
        return (
          <div className="w-full h-[100vh] flex flex-col gap-2 justify-center items-center text-3xl">
            <span>로그인 중에 문제가 발생했어요... 다시 시도해 보세요</span>
          </div>
        );
      }
    };

    fn();
  }, [router]);

  return (
    <div className="w-full h-[100vh] flex flex-col gap-2 justify-center items-center text-3xl">
      <Image src={`/loading/${id}.gif`} width={64} height={64} alt="Login Loading" unoptimized />
      <span>로그인하고 있어요...</span>
    </div>
  );
}
