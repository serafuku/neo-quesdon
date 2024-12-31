'use client';

import { userProfileMeDto } from '@/app/_dto/fetch-profile/Profile.dto';
import MainHeader from '@/app/main/_header';
import { createContext, useEffect, useRef, useState } from 'react';
import { AnswerWithProfileDto } from '../_dto/answers/Answers.dto';
import { AnswerEv, MyProfileEv, NotificationEv } from './_events';
import { NotificationDto, NotificationPayloadTypes } from '../_dto/notification/notification.dto';
import { AnswerCreatedPayload, AnswerDeletedEvPayload } from '@/app/_dto/websocket-event/websocket-event.dto';
import { Logger } from '@/utils/logger/Logger';
import { fetchMyProfile } from '@/utils/profile/fetchMyProfile';
import DialogModalOneButton from '@/app/_components/modalOneButton';
import { logout } from '@/utils/logout/logout';
import { fetchAllAnswers } from '@/utils/answers/fetchAllAnswers';
import { fetchNoti } from '@/utils/notification/fetchNoti';
import { ApiErrorResponseDto } from '@/app/_dto/api-error/api-error.dto';
import { refreshJwt } from '@/utils/refreshJwt/refresh-jwt-token';

type MainPageContextType = {
  answers: AnswerWithProfileDto[] | null;
  loading: boolean;
  untilId: string | undefined;
};
export const AnswersContext = createContext<MainPageContextType | undefined>(undefined);
export const NotificationContext = createContext<NotificationDto | undefined>(undefined);
export const MyProfileContext = createContext<userProfileMeDto | undefined>(undefined);

export default function MainLayout({ modal, children }: { children: React.ReactNode; modal: React.ReactNode }) {
  const [userProfileData, setUserProfileData] = useState<userProfileMeDto | undefined>();
  const [answers, setAnswers] = useState<AnswerWithProfileDto[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [untilId, setUntilId] = useState<string | undefined>(undefined);
  const [noti, setNoti] = useState<NotificationDto>();
  const [questionsNum, setQuestions_num] = useState<number>(0);
  const [loginChecked, setLoginChecked] = useState<boolean>(false);
  const [logoutModalText, setLogoutModalText] = useState<string>('');
  const forceLogoutModalRef = useRef<HTMLDialogElement>(null);

  const onResNotOk = async (code: number, res: Response) => {
    try {
      const errorRes = (await res.json()) as ApiErrorResponseDto;
      switch (errorRes.error_type) {
        case 'FORBIDDEN':
          setLogoutModalText('요청이 거부 되었어요!');
          break;
        case 'JWT_EXPIRED':
          setLogoutModalText('로그인 인증이 만료되었어요!');
          break;
        case 'REMOTE_ACCESS_TOKEN_REVOKED':
          setLogoutModalText('원격 서버(Misskey/Mastodon...) 에서 인증이 해제 되었어요!');
          break;
        case 'JWT_REVOKED':
          setLogoutModalText('로그인 인증이 해제되었어요!');
          break;
        case 'UNAUTHORIZED':
          setLogoutModalText('인증에 실패했어요!');
          break;
        default:
          setLogoutModalText('');
          return;
      }
      forceLogoutModalRef.current?.showModal();
    } catch (err) {
      alert(`unknown error! code: ${code}, err: ${String(err)}`);
    }
  };
  // ------------ Initial Fetch -----------------------------
  useEffect(() => {
    fetchMyProfile(onResNotOk).then((r) => {
      setUserProfileData(r);
      setQuestions_num(r?.questions ?? 0);
      setLoginChecked(true);
    });
    fetchAllAnswers({ sort: 'DESC', limit: 25 }, onResNotOk).then((r) => {
      if (r.length === 0) {
        setLoading(false);
        setAnswers([]);
        return;
      }
      setAnswers(r);
      setUntilId(r[r.length - 1].id);
    });
    fetchNoti(onResNotOk).then((v) => {
      setNoti(v);
    });
    const last_token_refresh = Number.parseInt(localStorage.getItem('last_token_refresh') ?? '0');
    if (Date.now() / 1000 - last_token_refresh > 3600) {
      refreshJwt(onResNotOk);
    }
  }, []);

  // ------------- add Event callbacks --------------------
  useEffect(() => {
    MyProfileEv.addEventListener(onProfileUpdateEvent);
    AnswerEv.addFetchMoreRequestEventListener(onFetchMoreEv);
    AnswerEv.addAnswerCreatedEventListener(onAnswerCreated);
    AnswerEv.addAnswerDeletedEventListener(onAnswerDeleted);
    NotificationEv.addNotificationEventListener(onNotiEv);
    return () => {
      MyProfileEv.removeEventListener(onProfileUpdateEvent);
      AnswerEv.removeFetchMoreRequestEventListener(onFetchMoreEv);
      AnswerEv.removeAnswerCreatedEventListener(onAnswerCreated);
      AnswerEv.removeAnswerDeletedEventListener(onAnswerDeleted);
      NotificationEv.removeNotificationEventListener(onNotiEv);
    };
  }, []);

  // ---------------- event callback functions -------------------
  const onNotiEv = (ev: CustomEvent<NotificationPayloadTypes>) => {
    const notiData = ev.detail;
    switch (notiData.notification_name) {
      case 'answer_on_my_question': {
        setNoti((prev) => {
          return {
            notifications: [notiData, ...(prev ? prev.notifications : [])],
            unread_count: prev ? prev.unread_count + 1 : 1,
          };
        });
        break;
      }
      case 'read_all_notifications': {
        setNoti((prev) => {
          return {
            notifications: prev ? prev.notifications : [],
            unread_count: 0,
          };
        });
        break;
      }
      case 'delete_all_notifications': {
        setNoti({ notifications: [], unread_count: 0 });
        break;
      }
      default:
        break;
    }
  };

  const onProfileUpdateEvent = (ev: CustomEvent<Partial<userProfileMeDto>>) => {
    const logger = new Logger('onProfileUpdateEvent', { noColor: true });
    setUserProfileData((prev) => {
      if (prev) {
        const newData = { ...prev, ...ev.detail };
        logger.log('My Profile Context Update With: ', ev.detail);
        return newData;
      }
    });
    setQuestions_num((prev) => ev.detail.questions ?? prev);
  };

  const onFetchMoreEv = (ev: CustomEvent<string | undefined>) => {
    const id = ev.detail;
    fetchAllAnswers({ sort: 'DESC', limit: 25, untilId: id }).then((r) => {
      if (r.length === 0) {
        setLoading(false);
        return;
      }
      setAnswers((prev_answers) => (prev_answers ? [...prev_answers, ...r] : null));
      setUntilId(r[r.length - 1].id);
    });
  };

  const onAnswerCreated = (ev: CustomEvent<AnswerCreatedPayload>) => {
    if (ev.detail.hideFromMain) {
      return;
    }
    setAnswers((prevAnswer) => (prevAnswer ? [ev.detail, ...prevAnswer] : []));
  };

  const onAnswerDeleted = (ev: CustomEvent<AnswerDeletedEvPayload>) => {
    setAnswers((prev) => {
      if (prev) {
        return prev.filter((v) => v.id !== ev.detail.deleted_id);
      } else {
        return prev;
      }
    });
    setNoti((prev) => {
      if (prev) {
        return {
          notifications: prev.notifications.filter((v) => {
            return v.notification_name !== 'answer_on_my_question' || v.data.id !== ev.detail.deleted_id;
          }),
          unread_count: prev.unread_count - 1,
        };
      }
    });
  };

  return (
    <div>
      <MyProfileContext.Provider value={userProfileData}>
        <AnswersContext.Provider value={{ answers, loading, untilId }}>
          <NotificationContext.Provider value={noti}>
            {modal}
            <header className="w-full h-full flex justify-center">
              <MainHeader questionsNum={questionsNum} loginChecked={loginChecked} />
            </header>
            <main className="flex justify-center">{children}</main>
          </NotificationContext.Provider>
        </AnswersContext.Provider>
      </MyProfileContext.Provider>
      <DialogModalOneButton
        title={'자동 로그아웃'}
        body={logoutModalText}
        buttonText={'확인'}
        ref={forceLogoutModalRef}
        onClose={logout}
      />
    </div>
  );
}
