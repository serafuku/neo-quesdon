"use client";

import NameComponents from "@/app/_components/NameComponents";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import Answer from "@/app/_components/answer";
import { FaUserSlash } from "react-icons/fa";
import { userProfileWithHostnameDto } from "@/app/_dto/fetch-profile/Profile.dto";
import { CreateQuestionDto } from "@/app/_dto/create_question/create-question.dto";
import { AnswerDto } from "@/app/_dto/Answers.dto";
import { FetchUserAnswersDto } from "@/app/_dto/fetch-user-answers/fetch-user-answers.dto";
import josa from "@/app/api/functions/josa";
import Link from "next/link";

type FormValue = {
  question: string;
  questioner: boolean;
};

type ResponseType = {
  answers: AnswerDto[];
  count: number;
};

async function fetchProfile(handle: string) {
  const profile = await fetch(`/api/db/fetch-profile/${handle}`);
  if (profile && profile.ok) {
    return profile.json() as unknown as userProfileWithHostnameDto;
  } else {
    return undefined;
  }
}

export default function UserPage() {
  const { handle } = useParams() as { handle: string };
  const [userProfile, setUserProfile] = useState<userProfileWithHostnameDto>();
  const [localHandle, setLocalHandle] = useState<string>("");
  const [answers, setAnswers] = useState<AnswerDto[] | null>(null);
  const [count, setCount] = useState<number | null>(0);
  const [untilId, setUntilId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [mounted, setMounted] = useState<HTMLDivElement | null>(null);

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
      const isValid = await trigger();

      if (isValid === false) {
        return;
      } else {
        const value = getValues();
        if (value) {
          await onSubmit(value);
        }
      }
    }
  };

  const onEscape = (e: React.KeyboardEvent) => {
    const modalState = document.getElementById(
      "my_modal_2"
    ) as HTMLInputElement;
    if (e.key === "Escape") {
      modalState.checked = false;
    }
  };

  const fetchUserAnswers = async (
    q: FetchUserAnswersDto
  ): Promise<ResponseType> => {
    const res = await fetch("/api/db/fetch-user-answers", {
      method: "POST",
      body: JSON.stringify(q),
    });
    if (res.ok) {
      return res.json();
    } else {
      throw new Error(
        `fetch-user-answers fail! ${res.status}, ${res.statusText}`
      );
    }
  };

  const handleDeleteAnswer = async (id: string) => {
    await fetch("/api/db/delete-answer", {
      method: "POST",
      body: JSON.stringify({ id: id }),
    });
    if (answers && count) {
      const filteredAnswer = answers.filter((el) => el.id !== id);
      setAnswers(filteredAnswer);
      setCount((prevCount) => (prevCount ? prevCount - 1 : null));
    }
  };

  const mkQuestionCreateApi = async (
    q: CreateQuestionDto
  ): Promise<Response> => {
    const res = await fetch("/api/db/create-question", {
      method: "POST",
      body: JSON.stringify(q),
    });
    return res;
  };

  const shareUrl = () => {
    const server = localStorage.getItem("server");
    const text = `저의 ${josa(
      userProfile?.questionBoxName,
      "이에요!",
      "예요!"
    )} #neo_quesdon ${location.origin}/main/user/${userProfile?.handle}`;
    return `https://${server}/share?text=${encodeURIComponent(text)}`;
  };

  const onSubmit: SubmitHandler<FormValue> = async (e) => {
    const user_handle = localStorage.getItem("user_handle");
    const detectWhiteSpaces = new RegExp(/^\s+$/);

    // 작성자 공개
    if (questioner === true) {
      if (user_handle === null) {
        setError("questioner", {
          type: "notLoggedIn",
          message: "작성자 공개를 하려면 로그인을 해주세요!",
        });
        return;
      }
      if (detectWhiteSpaces.test(e.question) === true) {
        setError("question", {
          type: "questionOnlyWhiteSpace",
          message: "아무것도 없는 질문을 보내시려구요...?",
        });
        return;
      }
      const req: CreateQuestionDto = {
        question: e.question,
        questioner: user_handle,
        questionee: profileHandle,
      };
      reset();
      const res = await mkQuestionCreateApi(req);
      if (res.ok) {
        (document.getElementById("my_modal_2") as HTMLInputElement).checked = true;
      } else {
        window.alert(`Error!! ${await res.text()}`);
      }
    }
    // 작성자 비공개
    else {
      if (userProfile?.stopAnonQuestion === true) {
        setError("questioner", {
          type: "stopAnonQuestion",
          message: "익명 질문은 받지 않고 있어요...",
        });
        return;
      } else {
        if (detectWhiteSpaces.test(e.question) === true) {
          setError("question", {
            type: "questionOnlyWhiteSpace",
            message: "아무것도 없는 질문을 보내시려구요...?",
          });
          return;
        }

        (document.getElementById("my_modal_2") as HTMLInputElement).checked = true;

        const req: CreateQuestionDto = {
          question: e.question,
          questioner: null,
          questionee: profileHandle,
        };
        const res = await mkQuestionCreateApi(req);
        if (res.status === 200) {
          reset();
        }
      }
    }
  };

  useEffect(() => {
    fetchProfile(profileHandle).then((r) => {
      setUserProfile(r);
    });
    setLocalHandle(localStorage.getItem("user_handle") ?? "");
  }, [profileHandle]);

  useEffect(() => {
    if (userProfile) {
      fetchUserAnswers({
        answeredPersonHandle: userProfile.handle,
        sort: "DESC",
        limit: 20,
      }).then(({ answers, count }: ResponseType) => {
        if (answers.length === 0) {
          setLoading(false);
          setAnswers([]);
          return;
        }
        setAnswers(answers);
        setCount(count);
        setUntilId(answers[answers.length - 1].id);
      });
    }
  }, [profileHandle, userProfile]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && untilId !== null && answers !== null) {
          fetchUserAnswers({
            sort: "DESC",
            limit: 20,
            untilId: untilId,
            answeredPersonHandle: profileHandle,
          }).then((r) => {
            if (r.answers.length === 0) {
              setLoading(false);
              return;
            }
            setAnswers((prev_answers) =>
              prev_answers ? [...prev_answers, ...r.answers] : null
            );
            setUntilId(r.answers[r.answers.length - 1].id);
          });
        }
      },
      {
        threshold: 0.7,
      }
    );
    if (mounted) observer.observe(mounted);
    return () => {
      if (mounted) observer.unobserve(mounted);
    };
  }, [answers, mounted, profileHandle, untilId]);

  return (
    <div
      className="w-[90%] window:w-[80%] desktop:w-[70%]"
      onKeyDown={onEscape}
    >
      {userProfile === null ? (
        <div className="w-full flex flex-col justify-center items-center glass text-4xl rounded-box shadow p-2">
          <FaUserSlash />
          <span>그런 사용자는 없어요!</span>
        </div>
      ) : (
        <div className="w-full flex flex-col desktop:flex-row">
          <div className="w-full h-fit desktop:sticky top-2 desktop:w-[50%] flex flex-col">
            <div className="h-fit py-4 glass rounded-box flex flex-col items-center shadow mb-2">
              <div className="flex flex-col items-center gap-2 py-2">
                {userProfile && userProfile.avatarUrl ? (
                  <div className="flex w-full h-24">
                    <Link
                      href={`https://${userProfile.hostname}/${userProfile.handle}`}
                    >
                      <img
                        src={userProfile.avatarUrl}
                        alt="User Avatar"
                        className={`w-24 h-24 object-cover absolute left-[calc(50%-3rem)] rounded-full`}
                      />
                    </Link>
                    {(userProfile.stopAnonQuestion && !userProfile.stopNewQuestion) && (
                      <div className="chat chat-start w-32 window:w-full desktop:w-full relative left-[68%] window:left-[60%] deskstop:left-[57%]">
                        <div className="chat-bubble text-sm flex items-center bg-base-100 text-slate-700">
                          작성자 공개 질문만 받아요!
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="skeleton h-24 w-24 rounded-full" />
                )}
                <div className="flex items-center text-xl">
                  {userProfile?.stopNewQuestion ? (
                    <div className="flex flex-col items-center desktop:flex-row">
                      <NameComponents
                        username={userProfile.name}
                        width={32}
                        height={32}
                      />
                      <span>님은 지금 질문을 받지 않고 있어요...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center desktop:flex-row window:flex-row window:text-2xl">
                      <NameComponents
                        username={userProfile?.name}
                        width={32}
                        height={32}
                      />
                      <span>
                        님의{" "}
                        {josa(userProfile?.questionBoxName, "이에요!", "예요!")}
                      </span>
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
                  disabled={
                    userProfile?.stopNewQuestion === true ? true : false
                  }
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
                {errors.question &&
                  errors.question.type === "questionOnlyWhiteSpace" && (
                    <div
                      className="tooltip tooltip-open tooltip-bottom tooltip-error transition-opacity"
                      data-tip={errors.question.message}
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
            {localHandle === profileHandle && (
              <div className="h-fit py-4 glass rounded-box flex flex-col items-center shadow mb-2">
                <a className="link" href={shareUrl()} target="_blank">
                  {userProfile?.instanceType}에 질문상자 페이지를 공유
                </a>
              </div>
            )}
          </div>
          <div className="desktop:ml-2 desktop:w-[50%]">
            {answers !== null ? (
              <div>
                <div className="flex items-center gap-2 my-2 text-2xl">
                  <span>답변</span>
                  <span className="badge badge-ghost">{count}</span>
                </div>
                {answers.length > 0 ? (
                  <div className="flex flex-col">
                    {answers.map((el) => (
                      <div key={el.id}>
                        <Answer value={el} id={el.id} />
                        <input
                          type="checkbox"
                          id={`answer_delete_modal_${el.id}`}
                          className="modal-toggle"
                        />
                        <div className="modal" role="dialog">
                          <div className="modal-box">
                            <h3 className="py-4 text-2xl">
                              답변을 지울까요...?
                            </h3>
                            <div className="modal-action">
                              <label
                                htmlFor={`answer_delete_modal_${el.id}`}
                                className="btn btn-error"
                                onClick={() => handleDeleteAnswer(el.id)}
                              >
                                확인
                              </label>
                              <label
                                htmlFor={`answer_delete_modal_${el.id}`}
                                className="btn"
                              >
                                취소
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div
                      className="w-full h-16 flex justify-center items-center"
                      ref={(ref) => setMounted(ref)}
                    >
                      {loading ? (
                        <div>
                          <span className="loading loading-spinner loading-lg" />
                        </div>
                      ) : (
                        <div>
                          <span className="text-3xl">🥂 끝이야 한 잔 해</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-2xl flex gap-2 justify-center items-center border shadow rounded-box p-2 glass">
                    <span>🍺 질문함이 맥주있어요...</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full flex justify-center">
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
                (document.getElementById("my_modal_2") as HTMLInputElement).checked = false;
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
