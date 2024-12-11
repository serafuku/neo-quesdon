'use client';

import Link from 'next/link';
import { Dispatch, SetStateAction, useContext, useEffect, useRef, useState } from 'react';
import { FaInfoCircle, FaUser } from 'react-icons/fa';
import DialogModalTwoButton from '@/app/_components/modalTwoButton';
import DialogModalOneButton from '@/app/_components/modalOneButton';
import { refreshJwt } from '@/utils/refreshJwt/refresh-jwt-token';
import { logout } from '@/utils/logout/logout';
import { MyProfileContext, MyProfileEv } from '@/app/main/_profileContext';
import { userProfileMeDto } from '@/app/_dto/fetch-profile/Profile.dto';
import { Logger } from '@/utils/logger/Logger';
import {
  WebsocketAnswerCreatedEvent,
  WebsocketAnswerDeletedEvent,
  WebsocketEventPayload,
  WebsocketQuestionCreatedEvent,
  WebsocketQuestionDeletedEvent,
} from '@/app/_dto/websocket-event/websocket-event.dto';
import { FaXmark } from 'react-icons/fa6';
import { AnswerEv, MyQuestionEv } from './_events';
import { AnswerWithProfileDto } from '../_dto/Answers.dto';

type headerProps = {
  setUserProfile: Dispatch<SetStateAction<userProfileMeDto | undefined>>;
};
export default function MainHeader({ setUserProfile }: headerProps) {
  const profile = useContext(MyProfileContext);
  const logoutModalRef = useRef<HTMLDialogElement>(null);
  const forcedLogoutModalRef = useRef<HTMLDialogElement>(null);
  const [questionsNum, setQuestions_num] = useState<number | null>(null);
  const [questionsToastMenu, setQuestionsToastMenu] = useState<boolean>(false);
  const websocket = useRef<WebSocket | null>(null);

  const fetchMyProfile = async (): Promise<userProfileMeDto | undefined> => {
    const user_handle = localStorage.getItem('user_handle');

    if (user_handle) {
      const res = await fetch('/api/db/fetch-my-profile', {
        method: 'GET',
      });
      if (!res.ok) {
        if (res.status === 401) {
          forcedLogoutModalRef.current?.showModal();
        }
        return;
      }
      const data = await res.json();
      return data;
    }
  };

  const onProfileUpdateEvent = (ev: CustomEvent<Partial<userProfileMeDto>>) => {
    const logger = new Logger('onProfileUpdateEvent', { noColor: true });
    setUserProfile((prev) => {
      if (prev) {
        const newData = { ...prev, ...ev.detail };
        logger.log('My Profile Context Update With: ', ev.detail);
        return newData;
      }
    });
    setQuestions_num((prev) => ev.detail.questions ?? prev);
  };

  useEffect(() => {
    let toastTimeout: NodeJS.Timeout;
    websocket.current = new WebSocket('/api/websocket');
    websocket.current.onmessage = (ws_event: MessageEvent) => {
      const ws_data = JSON.parse(ws_event.data) as WebsocketEventPayload<unknown>;
      switch (ws_data.ev_name) {
        case 'question-created-event': {
          const data = ws_data as WebsocketQuestionCreatedEvent;
          console.debug('WS: 새로운 질문이 생겼어요!,', data.data);
          MyProfileEv.SendUpdateReq({ questions: data.data.question_numbers });
          MyQuestionEv.SendUpdateReq(data.data);
          toastTimeout = setTimeout(() => {
            setQuestionsToastMenu(false);
          }, 8000);
          setQuestionsToastMenu(true);
          break;
        }
        case 'question-deleted-event': {
          const data = ws_data as WebsocketQuestionDeletedEvent;
          console.debug('WS: 질문이 삭제되었어요!', data.data);
          MyProfileEv.SendUpdateReq({ questions: data.data.question_numbers });
          MyQuestionEv.SendDeleteReq(data.data);
          setQuestionsToastMenu(false);
          break;
        }
        case 'answer-created-event': {
          const data = ws_data as WebsocketAnswerCreatedEvent;
          AnswerEv.sendCreatedAnswerEvent(data.data);
          console.debug('WS: 새로운 답변이 생겼어요!', data.data);
          break;
        }
        case 'answer-deleted-event': {
          const data = ws_data as WebsocketAnswerDeletedEvent;
          console.debug('WS: 답변이 삭제되었어요!', data.data);
          break;
        }
        case 'keep-alive': {
          break;
        }
      }
    };
    websocket.current.onopen = () => {
      console.debug('웹소켓이 열렸어요!');
    };
    websocket.current.onclose = (ev: CloseEvent) => {
      console.log('웹소켓이 닫혔어요!', ev);
    };
    websocket.current.onerror = (ev: Event) => {
      console.log(`웹소켓 에러`, ev);
    };

    return () => {
      clearTimeout(toastTimeout);
      if (websocket.current && websocket.current.readyState === 1) {
        websocket.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (setUserProfile) {
      fetchMyProfile().then((r) => {
        setUserProfile(r);
        setQuestions_num(r?.questions ?? null);
      });
    }
  }, [setUserProfile]);

  useEffect(() => {
    MyProfileEv.addEventListener(onProfileUpdateEvent);

    return () => {
      MyProfileEv.removeEventListener(onProfileUpdateEvent);
    };
  }, []);

  useEffect(() => {
    const fn = async () => {
      const now = Math.ceil(Date.now() / 1000);
      // JWT 리프레시로부터 1시간이 지난 경우 refresh 시도
      const last_token_refresh = Number.parseInt(localStorage.getItem('last_token_refresh') ?? '0');
      if (now - last_token_refresh > 3600) {
        await refreshJwt();
      }
    };
    fn();
  }, []);

  return (
    <div className="w-[90%] window:w-[80%] desktop:w-[70%] navbar bg-base-100 shadow rounded-box my-4">
      <div className="flex-1">
        <Link href="/main" className="btn btn-ghost text-xl">
          Neo-Quesdon
        </Link>
      </div>
      <div className="dropdown dropdown-end">
        <div tabIndex={0} role="button" className={`btn btn-ghost btn-circle avatar`}>
          <div className="w-10 rounded-full">
            {profile?.avatarUrl ? (
              <>
                <img src={profile.avatarUrl} alt="navbar avatar profile" />
                {questionsNum && questionsNum > 0 && (
                  <span className="badge badge-sm badge-warning absolute top-0">{questionsNum}</span>
                )}
              </>
            ) : (
              <div className="w-10 h-10 flex justify-center items-center text-3xl">
                <FaUser />
              </div>
            )}
          </div>
        </div>
        {profile === undefined ? (
          <div>
            <ul
              tabIndex={0}
              className="menu menu-sm dropdown-content bg-base-100 rounded-box z-10 mt-3 w-52 p-2 shadow"
            >
              <li>
                <Link href={'/'}>로그인</Link>
              </li>
            </ul>
          </div>
        ) : (
          <div>
            <ul
              tabIndex={0}
              className="menu menu-sm dropdown-content bg-base-100 rounded-box z-10 mt-3 w-52 p-2 shadow"
            >
              <li>
                <Link href={`/main/user/${profile?.handle}`}>마이페이지</Link>
              </li>
              <li className="flex ">
                <Link href={'/main/questions'}>
                  <span>미답변 질문</span>
                  {questionsNum && questionsNum > 0 ? (
                    <>
                      <div className="w-2 h-2 rounded-full absolute left-[5.6rem] bg-green-400 animate-ping" />
                      <div className="w-2 h-2 rounded-full absolute left-[5.6rem] bg-green-400" />
                    </>
                  ) : (
                    <></>
                  )}
                </Link>
              </li>
              <li>
                <Link href={'/main/social'}>소셜(베타)</Link>
              </li>
              <li>
                <Link href={'/main/settings'}>설정</Link>
              </li>
              <li onClick={() => logoutModalRef.current?.showModal()}>
                <a>로그아웃</a>
              </li>
            </ul>
          </div>
        )}
      </div>
      <DialogModalTwoButton
        title={'로그아웃'}
        body={'정말로 로그아웃 하시겠어요?'}
        confirmButtonText={'로그아웃'}
        cancelButtonText={'취소'}
        ref={logoutModalRef}
        onClick={logout}
      />
      <DialogModalOneButton
        title={'자동 로그아웃'}
        body={'로그인 유효시간이 만료되어서 로그아웃 되었어요!'}
        buttonText={'확인'}
        ref={forcedLogoutModalRef}
        onClick={logout}
      />
      <div
        className={`toast toast-end w-[16rem] desktop:w-[20rem] z-[1] ${!questionsToastMenu && 'translate-x-full transition-transform'}`}
      >
        <div className="alert shadow flex">
          <Link
            href={'/main/questions'}
            className="flex items-center gap-4"
            onClick={() => setQuestionsToastMenu(false)}
          >
            <FaInfoCircle size={20} />
            <div className="">
              <h3 className="text-lg">새 질문이 있어요!</h3>
              <span className="text-sm font-thin">여기를 눌러 확인하기</span>
            </div>
          </Link>
          <FaXmark className="absolute top-7 right-8 cursor-pointer" onClick={() => setQuestionsToastMenu(false)} />
        </div>
      </div>
    </div>
  );
}
