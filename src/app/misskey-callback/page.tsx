"use client";

import { useEffect, useState } from "react";
import { fetchUsername } from "../api/functions/web/fetchUsername";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { generateJwt, pushDB, requestAccessToken } from "./actions";

export type DBpayload = {
  account: string;
  accountLower: string;
  hostName: string;
  handle: string;
  name: string[];
  avatarUrl: string;
  accessToken: string;
  userId: string;
};

export default function CallbackPage() {
  const [id, setId] = useState<number>(0);

  const router = useRouter();

  useEffect(() => {
    const host = window.location.host;
    const protocol = window.location.protocol;
    const server = localStorage.getItem("server");

    const url = new URL(window.location.href);
    const params = new URLSearchParams(url.search);

    const randomNumber = Math.ceil(Math.random() * 3);
    setId(randomNumber);

    const fn = async () => {
      if (server) {
        const payload = {
          protocol: protocol,
          host: host,
          address: server,
          token: params.get("token"),
        };

        const res = await requestAccessToken(payload);

        const accessToken = res.accessToken;
        const user = res.user;

        const nameWithEmoji = await fetchUsername({
          username: user.name,
          host: server,
        });

        const dbPayload: DBpayload = {
          account: user.username,
          accountLower: user.username.toLowerCase(),
          hostName: server,
          handle: `@${user.username}@${server}`,
          name: nameWithEmoji.username,
          avatarUrl: user.avatarUrl,
          accessToken: accessToken,
          userId: user.id,
        };

        await generateJwt(dbPayload);
        await pushDB(dbPayload);
        localStorage.setItem('user_handle', dbPayload.handle);

        router.replace("/main");
      }
    };

    fn();
  }, []);

  return (
    <div className="w-full h-[100vh] flex flex-col gap-2 justify-center items-center text-3xl">
      <Image
        src={`/loading/${id}.gif`}
        width={64}
        height={64}
        alt="Login Loading"
        unoptimized
      />
      <span>로그인하고 있어요...</span>
    </div>
  );
}
