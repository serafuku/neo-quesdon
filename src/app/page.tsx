"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import detectInstance from "./api/functions/web/detectInstance";
import { loginReqDto } from "./_dto/web/login/login.dto";
import GithubRepoLink from "./_components/github";

interface FormValue {
  address: string;
}

/**
 * 미스키 전용 Auth Function
 * @param loginReqDto
 * @returns
 */
const misskeyAuth = async ({ host }: loginReqDto) => {
  const body: loginReqDto = {
    host: host,
  };
  const res = await fetch(`/api/web/misskey-login`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) { throw new Error(`Misskey login Error! ${res.status}, ${await res.text()}`); }
  return await res.json();
};

/**
 * 마스토돈 전용 Auth Function
 * @param loginReqDto
 * @returns
 */
const mastodonAuth = async ({ host }: loginReqDto) => {
  const body: loginReqDto = {
    host: host,
  };
  const res = await fetch(`/api/web/mastodon-login`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) { throw new Error(`Mastodon login Error! ${res.status}, ${await res.text()}`); }
  return await res.json();
};

/**
 * https://example.com/ 같은 URL 형식으로 온 경우 Host 형식으로 변환
 * host형식으로 온 경우 그대로 반환
 * @param urlOrHost
 * @returns
 */
function urlToHost(urlOrHost: string) {
  const re = /\/\/[^/@\s]+(:[0-9]{1,5})?\/?/;
  const matched_str = urlOrHost.match(re)?.[0];
  if (matched_str) {
    console.log(
      `URL ${urlOrHost} replaced with ${matched_str.replaceAll("/", "")}`
    );
    return matched_str.replaceAll("/", "");
  }
  return urlOrHost;
}

export default function Home() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const router = useRouter();
  const {
    register,
    formState: { errors },
    handleSubmit,
    setValue: setFormValue
  } = useForm<FormValue>({ defaultValues: { address: "" } });

  const onSubmit: SubmitHandler<FormValue> = async (e) => {
    setIsLoading(true);
    const host = urlToHost(e.address);
    localStorage.setItem("server", host);

    detectInstance(host).then((type) => {
      const payload: loginReqDto = {
        host: host,
      };
      switch (type) {
        case "misskey":
          localStorage.setItem("server", host);
          misskeyAuth(payload).then((r) => {
            setIsLoading(false);
            router.replace(r.url);
          }).catch((err) => {
            window.alert(err);
          });
          break;
        case "cherrypick":
          localStorage.setItem("server", host);
          misskeyAuth(payload).then((r) => {
            setIsLoading(false);
            router.replace(r.url);
          }).catch((err) => {
            window.alert(err);
          });
          break;
        case "mastodon":
          localStorage.setItem("server", host);
          mastodonAuth(payload).then((r) => {
            router.replace(r);
          }).catch((err) => {
            window.alert(err);
          });
          break;
        default:
          window.alert('인스턴스 타입 감지에 실패했어요!');
          console.log("아무것도 없는뎁쇼?");
      }
    });
  };

  useEffect(() => {
    const lastUsedHost = localStorage.getItem("server");
    const ele = document.getElementById("serverNameInput") as HTMLInputElement;
    if (lastUsedHost && ele) {
      setFormValue('address', lastUsedHost);
      ele.focus();
    }
  }, [ setFormValue ]);

  return (
    <div className="w-screen h-screen absolute flex flex-col items-center justify-center">
      <main className="w-full h-full flex flex-col justify-center items-center p-6">
        <div className="mb-4 flex flex-col items-center">
          <div className="relative text-7xl font-bold z-10">
            <h1 className="absolute -inset-0 -z-10 bg-gradient-to-r text-transparent from-red-500 via-fuchsia-500 to-green-500 bg-clip-text blur-lg">
              Neo-Quesdon
            </h1>
            <h1 className="text-7xl font-bold z-10 mb-2 desktop:mb-0">
              Neo-Quesdon
            </h1>
          </div>
          <span className="font-thin tracking-wider text-base desktop:text-lg">
            Misskey / CherryPick / Mastodon 에서 사용할 수 있는 새로운
            Quesdon
          </span>
        </div>
        <div className="flex flex-col desktop:flex-row items-center">
          <form
            className="flex flex-col desktop:flex-row"
            onSubmit={handleSubmit(onSubmit)}
            id="urlInputForm"
          >
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
              id="serverNameInput"
              {...register("address", {
                pattern: /\./,
                required: "required",
              })}
              placeholder="serafuku.moe"
              className="w-full input input-bordered text-lg desktop:text-3xl mb-4 desktop:mb-0"
            />
          </form>
          <div className="flex flex-row items-center">
            <button
              type="submit"
              className={`btn ml-4 ${
                isLoading ? "btn-disabled" : "btn-primary"
              }`}
              form="urlInputForm"
            >
              {isLoading ? (
                <div>
                  <span className="loading loading-spinner" />
                </div>
              ) : (
                <div>
                  <span>로그인</span>
                </div>
              )}
            </button>
            <button
              type="button"
              className={`btn ml-4 ${
                isLoading ? "btn-disabled" : "btn-outline"
              }`}
              onClick={() => (window.location.href = "/main")}
            >
              로그인 없이 즐기기
            </button>
          </div>
        </div>
      </main>
      <footer className="w-full row-start-3 flex gap-6 flex-wrap items-center justify-end">
        <GithubRepoLink />
      </footer>
    </div>
  );
}
