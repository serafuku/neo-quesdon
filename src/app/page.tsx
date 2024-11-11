"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import detectInstance from "./api/functions/web/detectInstance";
import { getTokenCookie } from "./action";
import type { loginPayload } from "@/app";
import { fetchCookies } from "./main/action";
import Link from "next/link";

interface FormValue {
  address: string;
}

interface hosts {
  protocol: string;
  host: string;
}

export const misskeyAuth = async ({
  protocol,
  host,
  address,
}: loginPayload) => {
  const res = await fetch(`/api/web/login`, {
    method: "POST",
    body: JSON.stringify({
      protocol: protocol,
      host: host,
      address: address,
    }),
  });

  return await res.json();
};

export default function Home() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hosts, setHosts] = useState<hosts>({ protocol: "", host: "" });

  const router = useRouter();

  const {
    register,
    formState: { errors },
    handleSubmit,
  } = useForm<FormValue>();

  const onSubmit: SubmitHandler<FormValue> = async (e) => {
    setIsLoading(true);
    localStorage.setItem("server", e.address);

    const payload: loginPayload = {
      protocol: hosts.protocol,
      host: hosts.host,
      address: e.address,
    };

    detectInstance(e.address).then((r) => {
      switch (r) {
        case "misskey":
          localStorage.setItem("server", e.address);
          misskeyAuth(payload).then((r) => {
            setIsLoading(false);
            router.replace(r.url);
          });
          break;
        case "cherrypick":
          localStorage.setItem("server", e.address);
          misskeyAuth(payload).then((r) => {
            setIsLoading(false);
            router.replace(r.url);
          });
          break;
        case "mastodon":
          document.getElementById("mastodon_modal")?.click();
          setIsLoading(false);
          break;
        default:
          console.log("아무것도 없는뎁쇼?");
      }
    });
  };

  useEffect(() => {
    const protocol = window.location.protocol;
    const host = window.location.host;

    setHosts({ protocol: protocol, host: host });
  }, []);

  return (
    <div className="w-[100vw] h-[100vh] absolute flex items-center justify-center p-8">
      <main className="flex flex-col justify-center items-center">
        <div className="mb-12 flex flex-col items-center">
          <div className="relative text-7xl font-bold z-10">
            <h1 className="absolute -inset-0 -z-10 bg-gradient-to-r text-transparent from-red-500 via-fuchsia-500 to-green-500 bg-clip-text blur-lg">
              Neo-Quesdon
            </h1>
            <h1 className="text-7xl font-bold z-10">Neo-Quesdon</h1>
          </div>
          <span className="font-thin tracking-wider">
            "아직은" Misskey / CherryPick에서 사용할 수 있는 새로운 Quesdon
          </span>
        </div>
        <div className="flex gap-4">
          <form className="flex items-center" onSubmit={handleSubmit(onSubmit)}>
            <div className="flex flex-col">
              {errors.address && errors.address.type === "pattern" && (
                <div
                  className="tooltip tooltip-open tooltip-error transition-opacity"
                  data-tip="올바른 URL을 입력해주세요"
                />
              )}
              {errors.address && errors.address.message === "required" && (
                <div
                  className="tooltip tooltip-open tooltip-error transition-opacity"
                  data-tip="URL을 입력해주세요"
                />
              )}
              <input
                {...register("address", {
                  pattern: /\./,
                  required: "required",
                })}
                placeholder="serafuku.moe"
                className="input input-bordered text-3xl"
              />
            </div>
            <button
              type="submit"
              className={`btn ml-4 ${
                isLoading ? "btn-disabled" : "btn-primary"
              }`}
            >
              로그인
            </button>
          </form>
          <button
            className={`btn ${isLoading ? "btn-disabled" : "btn-outline"}`}
          >
            <Link href={"/main"}>로그인 없이 즐기기</Link>
          </button>
        </div>
        <input type="checkbox" id="mastodon_modal" className="modal-toggle" />
        <div className="modal" role="dialog">
          <div className="modal-box">
            <h3 className="text-lg font-bold">준비중!</h3>
            <p className="py-4">
              마스토돈 로그인은 준비중이에요.
              <br />{" "}
              <a
                className="link link-primary"
                href="https://serafuku.moe/@Yozumina"
                target="_blank"
                rel="noopener noreferrer"
              >
                @Yozumina@serafuku.moe
              </a>
              를 쪼아주세요!
            </p>
            <div className="modal-action">
              <label htmlFor="mastodon_modal" className="btn">
                알겠어요
              </label>
            </div>
          </div>
        </div>
      </main>
      <footer className="row-start-3 flex gap-6 flex-wrap items-center justify-center"></footer>
    </div>
  );
}
