"use client";

import NameComponents from "@/app/_components/NameComponents";

import { useEffect, useState } from "react";
import { fetchUser, updateSetting } from "./action";
import { userProfileDto } from "@/app/_dto/fetch-profile/Profile.dto";
import { SubmitHandler, useForm } from "react-hook-form";

export type FormValue = {
  stopAnonQuestion: boolean;
  stopNewQuestion: boolean;
  stopNotiNewQuestion: boolean;
  stopPostAnswer: boolean;
  questionBoxName: string;
};

export default function Settings() {
  const [userInfo, setUserInfo] = useState<userProfileDto | null>();
  const [buttonClicked, setButtonClicked] = useState<boolean>(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValue>();

  const onSubmit: SubmitHandler<FormValue> = async (e) => {
    if (userInfo) {
      updateSetting(userInfo?.handle, e);
      setButtonClicked(true);
      setTimeout(() => {
        setButtonClicked(false);
      }, 2000);
    }
  };

  useEffect(() => {
    fetchUser().then((r) => setUserInfo(r));
  }, []);

  return (
    <div className="w-[90%] window:w-[80%] desktop:w-[70%] glass flex flex-col desktop:grid desktop:grid-cols-2 gap-4 rounded-box shadow p-2">
      <div className="flex flex-col mt-2 desktop:flex-row desktop:ml-4 gap-2 items-center">
        <div className="avatar">
          <div className="ring-primary ring-offset-base-100 w-24 h-24 rounded-full ring ring-offset-2">
            {userInfo?.avatarUrl !== undefined && (
              <img
                src={userInfo?.avatarUrl}
                alt="User Avatar"
                className="rounded-full"
              />
            )}
          </div>
        </div>
        <div className="desktop:ml-2 flex flex-col items-center desktop:items-start">
          <span className="text-xl font-thin">안녕하세요,</span>
          <div className="flex text-2xl items-center">
            <NameComponents username={userInfo?.name} width={32} height={32} />
            님!
          </div>
        </div>
      </div>
      <div className="flex flex-col items-center">
        <span className="text-3xl mb-4">우리만의 비밀설정창</span>
        <div className="w-full window:w-[70%] desktop:w-full">
          {userInfo ? (
            <form onSubmit={handleSubmit(onSubmit)}>
              <table className="table-fixed border-separate border-spacing-4">
                <tbody>
                  <tr>
                    <td className="font-thin desktop:text-xl">
                      익명 질문을 받지 않기
                    </td>
                    <td>
                      <input
                        {...register("stopAnonQuestion")}
                        type="checkbox"
                        className="toggle toggle-success"
                        defaultChecked={userInfo.stopAnonQuestion}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="font-thin desktop:text-xl">
                      더 이상 질문을 받지 않기
                    </td>
                    <td>
                      <input
                        {...register("stopAnonQuestion")}
                        type="checkbox"
                        className="toggle toggle-success"
                        defaultChecked={userInfo.stopNewQuestion}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="font-thin desktop:text-xl">
                      새 질문 DM으로 받지 않기
                    </td>
                    <td>
                      <input
                        {...register("stopNewQuestion")}
                        type="checkbox"
                        className="toggle toggle-success"
                        defaultChecked={userInfo.stopNotiNewQuestion}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="font-thin desktop:text-xl">
                      내 답변을 올리지 않기
                    </td>
                    <td>
                      <input
                        {...register("stopNotiNewQuestion")}
                        type="checkbox"
                        className="toggle toggle-success"
                        defaultChecked={userInfo.stopPostAnswer}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="font-thin desktop:text-xl">
                      질문함 이름 (10글자 이내)
                    </td>
                    <td>
                      <input
                        {...register("questionBoxName", {
                          maxLength: 10,
                        })}
                        type="text"
                        placeholder={userInfo?.questionBoxName}
                        className={`input input-bordered input-sm max-w-44 min-w-full mr-2 ${
                          errors.questionBoxName?.type === "maxLength" &&
                          "input-error"
                        }`}
                      />
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="mr-2 flex desktop:justify-end">
                <button
                  type="submit"
                  className={`btn ${
                    buttonClicked ? "btn-disabled" : "btn-primary"
                  }`}
                >
                  {buttonClicked ? "저장했어요!" : "저장"}
                </button>
              </div>
            </form>
          ) : (
            <span className="loading loading-spinner loading-lg" />
          )}
        </div>
      </div>
    </div>
  );
}
