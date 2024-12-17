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
  WebsocketEvent,
  WebsocketNotificationEvent,
  WebsocketPayloadTypes,
  WebsocketQuestionCreatedEvent,
  WebsocketQuestionDeletedEvent,
} from '@/app/_dto/websocket-event/websocket-event.dto';
import { FaXmark } from 'react-icons/fa6';
import { AnswerEv, MyQuestionEv } from './_events';
import WebSocketState from '../_components/webSocketState';

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
  const [wsState, setWsState] = useState<number | undefined>();
  const ws_retry_counter = useRef<number>(0);
  const [loginChecked, setLoginChecked] = useState<boolean>(false);
  const toastTimeout = useRef<NodeJS.Timeout>();

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
  const webSocketManager = () => {
    if (websocket.current) {
      websocket.current.close();
    }
    websocket.current = new WebSocket('/api/websocket');
    websocket.current.onmessage = (ws_event: MessageEvent) => {
      const ws_data = JSON.parse(ws_event.data) as WebsocketEvent<WebsocketPayloadTypes>;
      switch (ws_data.ev_name) {
        case 'question-created-event': {
          const data = ws_data as WebsocketQuestionCreatedEvent;
          console.debug('WS: 새로운 질문이 생겼어요!,', data.data);
          MyProfileEv.SendUpdateReq({ questions: data.data.question_numbers });
          MyQuestionEv.SendUpdateReq(data.data);
          toastTimeout.current = setTimeout(() => {
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
        case 'websocket-notification-event': {
          const data = ws_data as WebsocketNotificationEvent;
          switch (data.data.notification_name) {
            case 'answer-on-my-question': {
              console.debug('WS: 내 질문에 답변이 등록되었어요!', data.data.data);
              break;
            }
            case 'read-all-notifications': {
              console.debug('WS: 모든 알림이 읽음처리 되었어요!', data.data);
              break;
            }
            default: {
              break;
            }
          }
          break;
        }
        case 'keep-alive': {
          break;
        }
      }
    };

    websocket.current.onopen = () => {
      console.debug('웹소켓이 열렸어요!');
      ws_retry_counter.current = 0;
      setWsState(websocket.current?.readyState);
    };
    websocket.current.onclose = (ev: CloseEvent) => {
      console.debug('웹소켓이 닫혔어요!', ev);
      setWsState(websocket.current?.readyState);
    };
    websocket.current.onerror = (ev: Event) => {
      console.log(`웹소켓 에러`, ev);
      setWsState(websocket.current?.readyState);
    };
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
    if (!loginChecked) {
      return;
    }
    const webSocketRetryInterval = setInterval(
      () => {
        if (websocket.current === null || websocket.current?.readyState === 3) {
          if (ws_retry_counter.current < 5) {
            ws_retry_counter.current += 1;
            console.log('웹소켓 연결 재시도...', ws_retry_counter.current);
            webSocketManager();
          } else {
            console.log('웹소켓 연결 최대 재시도 횟수를 초과했어요!');
            clearInterval(webSocketRetryInterval);
            return;
          }
        } else {
          websocket.current.send(`mua: ${Date.now()}`);
        }
      },
      5000 + ws_retry_counter.current * 2000,
    );

    webSocketManager();
    return () => {
      clearTimeout(toastTimeout.current);
      clearInterval(webSocketRetryInterval);
      if (websocket.current?.readyState === 1) {
        websocket.current.close();
      }
    };
  }, [loginChecked]);

  useEffect(() => {
    if (setUserProfile) {
      fetchMyProfile().then((r) => {
        setUserProfile(r);
        setQuestions_num(r?.questions ?? null);
        setLoginChecked(true);
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
      <div className="mr-2 tooltip tooltip-bottom" data-tip="스트리밍 연결상태">
        <WebSocketState connection={wsState} />
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
