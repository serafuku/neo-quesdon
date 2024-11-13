"use client";

import NameComponents from "@/app/_components/NameComponents";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import Question from "@/app/_components/answer";
import { FaBeer, FaUserSlash } from "react-icons/fa";
import { fetchCookies } from "../../action";
import { authJwtToken } from "@/app/api/functions/web/authJwtToken";
import { profile } from "@prisma/client";
import { answers } from "@/app";

type FormValue = {
  question: string;
  questioner: boolean;
};

const fetchProfile = async (handle: string) => {
  const res = await fetch("/api/db/fetch-profile", {
    method: "POST",
    body: JSON.stringify(handle),
  }).then((r) => r.json());

  return res;
};

export default function UserPage() {
  const { handle } = useParams() as { handle: string };
  const [userInfo, setUserInfo] = useState<profile>();
  const [questions, setQuestions] = useState<answers[]>([]);

  const profileHandle = handle.toString().replace(/(?:%40)/g, "@");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    trigger,
    getValues,
    setError,
    formState: { errors },
  } = useForm<FormValue>({
    defaultValues: {
      question: "",
      questioner: false,
    },
  });

  const questioner = watch("questioner");

  const onCtrlEnter = async (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      trigger();

      const value = getValues();

      if (value) {
        await onSubmit(value);
      }
    }
  };

  const onSubmit: SubmitHandler<FormValue> = async (e) => {
    let questionerHandle: string;
    const cookies = await fetchCookies("jwtToken");

    if (questioner === true && cookies !== undefined) {
      const localHandle = await authJwtToken(cookies.value);
      questionerHandle = localHandle.handle;

      const res = await fetch("/api/db/post-question", {
        method: "POST",
        body: JSON.stringify({
          question: e.question,
          questioner: questionerHandle,
          questionee: profileHandle,
        }),
      }).then((r) => r.json());

      if (res.status === 200) {
        document.getElementById("my_modal_2")?.click();
      }
    } else if (questioner === false && cookies !== undefined) {
      if (userInfo?.stopAnonQuestion === true) {
        setError("questioner", {
          type: "stopAnonQuestion",
          message: "익명 질문은 받지 않고 있어요...",
        });
      } else {
        const res = await fetch("/api/db/post-question", {
          method: "POST",
          body: JSON.stringify({
            question: e.question,
            questioner: null,
            questionee: profileHandle,
          }),
        }).then((r) => r.json());

        if (res.status === 200) {
          document.getElementById("my_modal_2")?.click();
        }
      }
    } else if (questioner === true && cookies === undefined) {
      setError("questioner", {
        type: "notLoggedIn",
        message: "작성자 공개를 하려면 로그인을 해주세요!",
      });
    } else {
      const res = await fetch("/api/db/post-question", {
        method: "POST",
        body: JSON.stringify({
          question: e.question,
          questioner: null,
          questionee: profileHandle,
        }),
      }).then((r) => r.json());

      if (res.status === 200) {
        document.getElementById("my_modal_2")?.click();
      }
    }
  };

  useEffect(() => {
    fetchProfile(profileHandle).then((r) => {
      setUserInfo(r);
    });
  }, []);

  useEffect(() => {
    if (userInfo) {
      fetch("/api/db/fetch-personal-question", {
        method: "POST",
        body: JSON.stringify(profileHandle),
      })
        .then((r) => r.json())
        .then((r) => setQuestions(r));
    }
  }, [userInfo]);

  return (
    <div className="flex w-[90vw] desktop:w-[60vw]">
      {userInfo === null ? (
        <div className="w-full flex flex-col justify-center items-center glass text-4xl rounded-box shadow p-2">
          <FaUserSlash />
          <span>그런 사용자는 없어요!</span>
        </div>
      ) : (
        <div className="w-full flex flex-col desktop:flex-row">
          <div className="w-full desktop:w-[50%] h-fit desktop:sticky z-0 top-2 py-4 glass rounded-box flex flex-col items-center shadow mb-2">
            <div className="flex flex-col items-center gap-2 py-2">
              {userInfo && userInfo.avatarUrl ? (
                <div className="flex w-full justify-center">
                  <img
                    src={userInfo.avatarUrl}
                    alt="User Avatar"
                    className="w-24 h-24 object-cover rounded-full"
                  />
                  {userInfo.stopAnonQuestion && (
                    <div className="chat chat-start absolute left-[21rem] w-full">
                      <div className="chat-bubble bg-base-100 text-slate-700">
                        작성자 공개 질문만 받아요!
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="skeleton h-24 w-24 rounded-full" />
              )}
              <div className="flex items-center text-xl">
                {userInfo?.stopNewQuestion ? (
                  <div className="flex flex-col items-center desktop:flex-row">
                    <NameComponents
                      username={userInfo?.name}
                      width={32}
                      height={32}
                    />
                    <span>님은 지금 질문을 받지 않고 있어요...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center desktop:flex-row window:flex-col window:text-sm">
                    <NameComponents
                      username={userInfo?.name}
                      width={32}
                      height={32}
                    />
                    <span>님의 {userInfo?.questionBoxName}이에요!</span>
                  </div>
                )}
              </div>
            </div>
            <form
              className="w-full flex flex-col items-center"
              onSubmit={handleSubmit(onSubmit)}
            >
              <textarea
                {...register("question", {
                  required: "required",
                })}
                placeholder="질문 내용을 입력해 주세요"
                className={`w-[90%] my-2 font-thin textarea ${
                  errors.question ? "textarea-error" : "textarea-bordered"
                }`}
                onKeyDown={onCtrlEnter}
                disabled={userInfo?.stopNewQuestion === true ? true : false}
              />
              {errors.questioner &&
                errors.questioner.type === "stopAnonQuestion" && (
                  <div
                    className="tooltip tooltip-open tooltip-bottom tooltip-error transition-opacity"
                    data-tip={errors.questioner.message}
                  />
                )}
              {errors.questioner &&
                errors.questioner.type === "notLoggedIn" && (
                  <div
                    className="tooltip tooltip-open tooltip-bottom tooltip-error transition-opacity"
                    data-tip={errors.questioner.message}
                  />
                )}
              <div className="w-[90%] flex justify-between">
                <div className="flex gap-2 items-center">
                  <input
                    type="checkbox"
                    className="toggle toggle-accent"
                    onClick={() => setValue("questioner", !questioner)}
                  />
                  <input type="hidden" {...register("questioner")} />
                  <span>작성자 공개</span>
                </div>
                <button type="submit" className="btn btn-primary">
                  질문하기
                </button>
              </div>
            </form>
          </div>
          <div className="desktop:ml-2 desktop:w-[50%]">
            {questions !== null ? (
              <div>
                {questions.length > 0 ? (
                  <div className="flex flex-col-reverse">
                    {questions.map((el) => (
                      <div key={el.id}>
                        <Question value={el} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-2xl flex gap-2 justify-center items-center border shadow rounded-box p-2 glass">
                    <span>🍺 질문함이 맥주있어요...</span>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <span className="loading loading-spinner loading-lg" />
              </div>
            )}
          </div>
        </div>
      )}
      <input type="checkbox" id="my_modal_2" className="modal-toggle" />
      <div className="modal" role="dialog">
        <div className="modal-box">
          <h3 className="py-4 text-2xl">질문했어요!</h3>
          <div className="modal-action">
            <button
              className="btn"
              onClick={() => {
                document.getElementById("my_modal_2")?.click();
                reset();
              }}
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
