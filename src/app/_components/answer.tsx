'use client';

import Link from 'next/link';
import { Dispatch, RefObject, SetStateAction, useEffect, useState } from 'react';
import NameComponents from './NameComponents';
import { AnswerDto, AnswerWithProfileDto } from '../_dto/Answers.dto';
import { userProfileDto } from '../_dto/fetch-profile/Profile.dto';
import { useParams } from 'next/navigation';

interface askProps {
  value: AnswerDto;
  id: string;
  ref?: RefObject<HTMLDialogElement>;
  idState?: Dispatch<SetStateAction<string>>;
}

export async function fetchProfile(value: AnswerWithProfileDto) {
  if (value.answeredPerson) {
    return value.answeredPerson;
  }
  const profile = await fetch(`/api/db/fetch-profile/${value.answeredPersonHandle}`);
  if (profile && profile.ok) {
    return profile.json() as unknown as userProfileDto;
  } else {
    return undefined;
  }
}

export default function Answer({ value, idState, ref }: askProps) {
  const { handle } = useParams() as { handle: string };
  const [showNsfw, setShowNsfw] = useState(false);
  const [userInfo, setUserInfo] = useState<userProfileDto>();
  const [localHandle, setLocalHandle] = useState<string | null>();

  const profileHandle = handle !== undefined ? decodeURIComponent(handle) : '';

  useEffect(() => {
    setLocalHandle(localStorage.getItem('user_handle'));
  }, [profileHandle]);

  useEffect(() => {
    fetchProfile(value).then((r) => setUserInfo(r));
    setShowNsfw(!value.nsfwedAnswer);
  }, [value]);

  return (
    <div className="w-full glass rounded-box px-2 desktop:px-8 py-4 mb-2 shadow">
      {!showNsfw && (
        <div className="fixed top-0 left-0 z-10 gap-2 w-full h-full flex flex-col justify-center items-center">
          <span>답변자가 NSFW로 체크한 질문이에요!</span>
          <button className="btn" onClick={() => setShowNsfw(!showNsfw)}>
            질문 보기
          </button>
        </div>
      )}

      <div className={`${!showNsfw && 'blur'} w-full h-full`}>
        <div className="chat chat-start flex ml-2 desktop:ml-0 justify-between">
          <div className="w-full">
            <div className="chat-header dark:text-white">
              {value.questioner ? (
                <Link href={`/main/user/${value.questioner}`}>{value.questioner}</Link>
              ) : (
                '익명의 질문자'
              )}
            </div>
            <div className="flex items-center text-sm break-all window:text-xl desktop:text-2xl chat-bubble text-slate-200">
              {value.question}
            </div>
          </div>
          {localHandle !== null && localHandle === profileHandle && (
            <div className="w-12 flex justify-end">
              <a
                className="link text-red-800 dark:text-red-500"
                onClick={() => {
                  ref?.current?.showModal();
                  if (idState) {
                    idState(value.id);
                  }
                }}
              >
                삭제
              </a>
            </div>
          )}
        </div>
        <div className="chat chat-end">
          <div className="chat-image avatar">
            <div className="w-12 rounded-full">
              <Link href={`/main/user/${value.answeredPersonHandle}`}>
                <img src={userInfo?.avatarUrl} alt="answered person avatar" />
              </Link>
            </div>
          </div>
          <div className="chat-header">
            <Link href={`/main/user/${value.answeredPersonHandle}`}>
              <NameComponents username={userInfo?.name} width={16} height={16} />
            </Link>
          </div>
          <div className="flex items-center text-sm break-all window:text-xl desktop:text-2xl chat-bubble bg-green-600 text-slate-100 dark:text-slate-50">
            {value.answer}
          </div>
          <div className="chat-footer font-thin text-xs mt-2 underline text-blue-900 dark:text-slate-100">
            <Link href={`/main/user/${value.answeredPersonHandle}/${value.id}`}>
              {new Date(value.answeredAt).toLocaleString('ko-kr', { hour12: false })}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
