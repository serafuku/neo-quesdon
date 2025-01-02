'use client';

import NameComponents from '@/app/_components/NameComponents';

import { useContext, useEffect, useRef, useState } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { UserSettingsUpdateDto } from '@/app/_dto/settings/settings.dto';
import { $Enums } from '@prisma/client';
import BlockList from '@/app/main/settings/_table';
import CollapseMenu from '@/app/_components/collapseMenu';
import DialogModalTwoButton from '@/app/_components/modalTwoButton';
import { AccountCleanReqDto } from '@/app/_dto/account-clean/account-clean.dto';
import { FaLock, FaUserLargeSlash } from 'react-icons/fa6';
import { MdDeleteSweep, MdOutlineCleaningServices } from 'react-icons/md';
import { MyProfileContext } from '@/app/main/layout';
import { MyProfileEv } from '@/app/main/_events';
import { getProxyUrl } from '@/utils/getProxyUrl/getProxyUrl';
import { onApiError } from '@/utils/api-error/onApiError';

export type FormValue = {
  stopAnonQuestion: boolean;
  stopNewQuestion: boolean;
  stopNotiNewQuestion: boolean;
  stopPostAnswer: boolean;
  questionBoxName: string;
  visibility: $Enums.PostVisibility;
  wordMuteList: string;
};
async function updateUserSettings(value: FormValue) {
  const body: UserSettingsUpdateDto = {
    stopAnonQuestion: value.stopAnonQuestion,
    stopNewQuestion: value.stopNewQuestion,
    stopNotiNewQuestion: value.stopNotiNewQuestion,
    stopPostAnswer: value.stopPostAnswer,
    questionBoxName: value.questionBoxName || '질문함',
    defaultPostVisibility: value.visibility,
    wordMuteList: value.wordMuteList
      .split('\n')
      .map((v) => v.trim())
      .filter((v) => v.length > 0)
      .map((word) => word.replace(/^\/|\/[igmsuy]{0,6}$/g, '')),
  };
  try {
    const res = await fetch('/api/user/settings', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-type': 'application/json',
      },
    });
    if (!res.ok) {
      onApiError(res.status, res);
      return;
    }
    MyProfileEv.SendUpdateReq({ ...body });
  } catch (err) {
    throw err;
  }
}

function Divider({ className }: { className?: string }) {
  return <div className={`w-full window:w-[90%] desktop:w-full my-4 border-b ${className}`} />;
}

export default function Settings() {
  const userInfo = useContext(MyProfileContext);
  const [buttonClicked, setButtonClicked] = useState<boolean>(false);
  const [defaultFormValue, setDefaultFormValue] = useState<FormValue>();
  const logoutAllModalRef = useRef<HTMLDialogElement>(null);
  const accountCleanModalRef = useRef<HTMLDialogElement>(null);
  const importBlockModalRef = useRef<HTMLDialogElement>(null);
  const deleteAllQuestionsModalRef = useRef<HTMLDialogElement>(null);
  const deleteAllNotificationsModalRef = useRef<HTMLDialogElement>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValue>({
    values: defaultFormValue,
  });

  const formValues = watch();
  useEffect(() => {
    if (userInfo) {
      const value = {
        stopAnonQuestion: userInfo.stopAnonQuestion,
        stopNewQuestion: userInfo.stopNewQuestion,
        stopNotiNewQuestion: userInfo.stopNotiNewQuestion,
        stopPostAnswer: userInfo.stopPostAnswer,
        questionBoxName: userInfo.questionBoxName,
        visibility: userInfo.defaultPostVisibility,
        wordMuteList: userInfo.wordMuteList.join('\n'),
      };
      setDefaultFormValue(value);
    }
  }, [userInfo]);

  const onSubmit: SubmitHandler<FormValue> = async (value) => {
    if (userInfo) {
      updateUserSettings(value);
      setButtonClicked(true);
      setTimeout(() => {
        setButtonClicked(false);
      }, 2000);
    }
  };
  const onLogoutAll = async () => {
    setButtonClicked(true);
    const res = await fetch('/api/user/logout-all', { method: 'POST' });
    if (res.ok) {
      localStorage.removeItem('user_handle');
      window.location.href = '/';
    } else {
      onApiError(res.status, res);
      setButtonClicked(false);
      return;
    }
    setTimeout(() => {
      setButtonClicked(false);
    }, 2000);
  };

  const onAccountClean = async () => {
    setButtonClicked(true);
    const user_handle = userInfo?.handle;
    if (!user_handle) {
      return;
    }
    const req: AccountCleanReqDto = {
      handle: user_handle,
    };
    const res = await fetch('/api/user/account-clean', {
      method: 'POST',
      body: JSON.stringify(req),
      headers: { 'content-type': 'application/json' },
    });
    if (res.ok) {
      console.log('계정청소 시작됨...');
    } else {
      onApiError(res.status, res);
    }
    setTimeout(() => {
      setButtonClicked(false);
    }, 2000);
  };

  const onImportBlock = async () => {
    setButtonClicked(true);
    const res = await fetch('/api/user/blocking/import', {
      method: 'POST',
    });
    if (res.ok) {
      console.log('블락 리스트 가져오기 시작됨...');
    } else {
      onApiError(res.status, res);
    }
    setTimeout(() => {
      setButtonClicked(false);
    }, 2000);
  };

  const onDeleteAllQuestions = async () => {
    setButtonClicked(true);
    const res = await fetch('/api/db/questions', {
      method: 'DELETE',
    });
    setButtonClicked(false);
    if (!res.ok) {
      throw new Error('질문을 모두 삭제하는데 실패했어요!');
    }
  };

  const onDeleteAllNotifications = async () => {
    setButtonClicked(true);
    const res = await fetch('/api/user/notification', {
      method: 'DELETE',
    });
    setButtonClicked(false);
    if (!res.ok) {
      throw new Error('알림을 삭제하는데 실패했어요!');
    }
  };

  return (
    <div className="w-[90%] window:w-[80%] desktop:w-[70%] glass flex flex-col desktop:grid desktop:grid-cols-2 gap-0 rounded-box shadow p-2 dark:text-white">
      {userInfo === undefined ? (
        <div className="w-full flex col-span-3 justify-center">
          <span className="loading loading-spinner loading-lg" />
        </div>
      ) : (
        <>
          {userInfo === null || defaultFormValue === undefined ? (
            <div className="w-full flex col-span-3 justify-center">
              <span className="text-2xl">로그인이 안 되어있어요!</span>
            </div>
          ) : (
            <>
              <div className="flex flex-col mt-2 gap-2 col-span-2 justify-center items-center">
                <div className="avatar">
                  <div className="ring-primary ring-offset-base-100 w-24 h-24 rounded-full ring ring-offset-2">
                    {userInfo?.avatarUrl !== undefined && (
                      <img src={getProxyUrl(userInfo.avatarUrl)} alt="User Avatar" className="rounded-full" />
                    )}
                  </div>
                </div>
                <div className="desktop:ml-2 flex flex-col items-center desktop:items-start">
                  <span className="text-xl font-thin">안녕하세요,</span>
                  <div className="flex text-2xl items-center">
                    <NameComponents username={userInfo?.name} width={24} height={24} />
                    <span>님!</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col col-span-2 items-center">
                <div className="text-3xl flex justify-center mt-4 w-full window:w-[90%] desktop:w-full">
                  <span>우리만의 비밀설정창</span>
                </div>
                <Divider />
                <div className="w-full window:w-[70%] flex flex-col desktop:w-full gap-2 desktop:grid desktop:grid-cols-2">
                  {userInfo && (
                    <>
                      <CollapseMenu id={'basicSetting'} text="기본설정">
                        <form onSubmit={handleSubmit(onSubmit)} className="w-full flex flex-col items-center">
                          <div className="grid grid-cols-[20%_80%] desktop:w-[24rem] desktop:grid-cols-[7rem_100%] gap-2 items-center p-2">
                            <input {...register('stopNewQuestion')} type="checkbox" className="toggle toggle-success" />
                            <span className="font-thin">더 이상 질문을 받지 않기</span>
                            <input
                              {...register('stopAnonQuestion')}
                              type="checkbox"
                              className="toggle toggle-success"
                              disabled={formValues.stopNewQuestion}
                            />
                            <span className="font-thin">익명 질문을 받지 않기</span>
                            <input
                              {...register('stopNotiNewQuestion')}
                              type="checkbox"
                              className="toggle toggle-success"
                              disabled={formValues.stopNewQuestion}
                            />
                            <span className="font-thin">새 질문 DM으로 받지 않기</span>
                            <input {...register('stopPostAnswer')} type="checkbox" className="toggle toggle-success" />
                            <span className="font-thin">내 답변을 올리지 않기</span>
                            <div className="w-fit col-span-2 desktop:grid desktop:grid-cols-subgrid flex flex-col-reverse justify-center desktop:items-center gap-2 ml-[calc(20%+8px)] desktop:ml-0">
                              <select
                                {...register('visibility')}
                                className="select select-ghost select-sm w-fit"
                                disabled={formValues.stopPostAnswer}
                              >
                                <option value="public">공개</option>
                                <option value="home">홈</option>
                                <option value="followers">팔로워</option>
                              </select>
                              <span className="font-thin"> 답변을 올릴 때 기본 공개 범위</span>
                            </div>
                            <div className="col-start-2 flex flex-col-reverse gap-2">
                              <input
                                {...register('questionBoxName', {
                                  maxLength: 10,
                                })}
                                type="text"
                                placeholder="질문함"
                                className={`input input-bordered input-sm w-48 ${
                                  errors.questionBoxName?.type === 'maxLength' && 'input-error'
                                }`}
                              />
                              <span className="font-thin">질문함 이름 (10글자 이내)</span>
                            </div>
                          </div>
                          <Divider />
                          <div className="flex flex-col desktop:w-[24rem] gap-2 items-center p-2">
                            <div className="text-lg"> 질문 단어 뮤트 </div>
                            <div className="font-thin">
                              뮤트할 단어를 한줄에 하나씩 입력합니다. <br /> 정규식 문법도 지원합니다.
                            </div>
                            <textarea
                              {...register('wordMuteList')}
                              className="textarea textarea-bordered w-full min-h-[15vh] text-base"
                              placeholder="뮤트할 단어, 또는 정규식"
                            ></textarea>
                          </div>
                          <div className="flex w-full justify-end mt-2">
                            <button type="submit" className={`btn ${buttonClicked ? 'btn-disabled' : 'btn-primary'}`}>
                              {buttonClicked ? '잠깐만요...' : '저장'}
                            </button>
                          </div>
                        </form>
                      </CollapseMenu>
                      <div className="flex justify-center">
                        <BlockList />
                      </div>
                      <CollapseMenu id={'securitySettings'} text="보안">
                        <div className="w-full flex flex-col items-center">
                          <span className="font-normal text-xl py-3 flex items-center gap-2">
                            <FaLock />
                            모든 기기에서 로그아웃 하기{' '}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              logoutAllModalRef.current?.showModal();
                            }}
                            className={`btn ${buttonClicked ? 'btn-disabled' : 'btn-warning'}`}
                          >
                            {buttonClicked ? '잠깐만요...' : '모든 기기에서 로그아웃'}
                          </button>
                        </div>
                      </CollapseMenu>
                      <CollapseMenu id={'dangerSetting'} text="위험한 설정">
                        <div className="w-full flex flex-col items-center">
                          <Divider />
                          <div className="font-normal text-xl py-3 flex items-center gap-2">
                            <MdDeleteSweep size={24} />
                            알림함 비우기
                          </div>
                          <div className="font-thin px-4 py-2 break-keep">
                            알림함의 모든 알림을 지워요. 지워진 알림은 되돌릴 수 없으니 주의하세요.
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              deleteAllNotificationsModalRef.current?.showModal();
                            }}
                            className={`btn ${buttonClicked ? 'btn-disabled' : 'btn-warning'}`}
                          >
                            {buttonClicked ? '잠깐만요...' : '알림함 비우기'}
                          </button>
                          <Divider />
                          <div className="font-normal text-xl py-3 flex items-center gap-2">
                            <FaUserLargeSlash />
                            차단 목록 가져오기
                          </div>
                          <div className="font-thin px-4 py-2 break-keep">
                            차단 목록을 내 연합우주 계정에서 가져오는 기능이에요. 차단된 사용자는 나에게 더 이상 질문을
                            보낼 수 없어요. 사용자를 차단하면 서로의 답변이 숨겨져요.
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              importBlockModalRef.current?.showModal();
                            }}
                            className={`btn ${buttonClicked ? 'btn-disabled' : 'btn-warning'}`}
                          >
                            {buttonClicked ? '잠깐만요...' : '차단 목록 가져오기'}
                          </button>
                          <Divider />
                          <div className="font-normal text-xl py-3 flex items-center gap-2">
                            <MdOutlineCleaningServices />
                            계정 청소하기
                          </div>
                          <div className="font-thin px-4 py-2 break-keep">
                            네오 퀘스돈에서 이 계정으로 지금까지 작성한 모든 답변을 지워요. 이 작업은 시간이 걸리고,
                            지워진 글은 되돌릴 수 없으니 주의하세요.{' '}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              accountCleanModalRef.current?.showModal();
                            }}
                            className={`btn ${buttonClicked ? 'btn-disabled' : 'btn-error'}`}
                          >
                            {buttonClicked ? '잠깐만요...' : '모든 답변을 삭제'}
                          </button>
                          <Divider />
                          <div className="font-normal text-xl py-3 flex items-center gap-2">
                            <MdDeleteSweep size={24} />
                            모든 질문 삭제하기
                          </div>
                          <div className="font-thin px-4 py-2 break-keep">
                            아직 답변하지 않은 모든 질문들을 지워요. 지워진 글은 되돌릴 수 없으니 주의하세요.
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              deleteAllQuestionsModalRef.current?.showModal();
                            }}
                            className={`btn ${buttonClicked ? 'btn-disabled' : 'btn-error'}`}
                          >
                            {buttonClicked ? '잠깐만요...' : '모든 질문을 삭제'}
                          </button>
                        </div>
                      </CollapseMenu>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
          <DialogModalTwoButton
            title={'주의'}
            body={'정말 모든 기기를 로그아웃 시킬까요?'}
            confirmButtonText={'네'}
            cancelButtonText={'아니오'}
            ref={logoutAllModalRef}
            onClick={onLogoutAll}
          />
          <DialogModalTwoButton
            title={'주의'}
            body={'알림함을 비울까요?'}
            confirmButtonText={'네'}
            cancelButtonText={'아니오'}
            ref={deleteAllNotificationsModalRef}
            onClick={onDeleteAllNotifications}
          />
          <DialogModalTwoButton
            title={'경고'}
            body={'미답변 질문들을 모두 지울까요? \n이 작업은 시간이 걸리고, 지워진 질문은 복구할 수 없어요!'}
            confirmButtonText={'네'}
            cancelButtonText={'아니오'}
            ref={deleteAllQuestionsModalRef}
            onClick={onDeleteAllQuestions}
          />
          <DialogModalTwoButton
            title={'경고'}
            body={'그동안 썼던 모든 답변을 지울까요? \n이 작업은 시간이 걸리고, 지워진 답변은 복구할 수 없어요!'}
            confirmButtonText={'네'}
            cancelButtonText={'아니오'}
            ref={accountCleanModalRef}
            onClick={onAccountClean}
          />
          <DialogModalTwoButton
            title={'주의'}
            body={`${userInfo.instanceType} 에서 블락 목록을 가져올까요? \n 이 작업은 완료되는데 시간이 조금 걸려요!`}
            confirmButtonText={'네'}
            cancelButtonText={'아니오'}
            ref={importBlockModalRef}
            onClick={onImportBlock}
          />
        </>
      )}
    </div>
  );
}
