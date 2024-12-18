'use client';

import { userProfileMeDto } from '@/app/_dto/fetch-profile/Profile.dto';
import MainHeader from '@/app/main/_header';
import { createContext, useCallback, useEffect, useState } from 'react';
import { MyProfileContext } from '@/app/main/_profileContext';
import { FetchAllAnswersReqDto } from '../_dto/answers/fetch-all-answers.dto';
import { AnswerListWithProfileDto, AnswerWithProfileDto } from '../_dto/answers/Answers.dto';
import { AnswerEv, NotificationEv } from './_events';
import { NotificationDto, NotificationPayloadTypes } from '../_dto/notification/notification.dto';

type MainPageContextType = {
  answers: AnswerWithProfileDto[] | null;
  loading: boolean;
  untilId: string | undefined;
};
export const AnswersContext = createContext<MainPageContextType | undefined>(undefined);
export const NotificationContext = createContext<NotificationDto | undefined>(undefined);

export default function MainLayout({ modal, children }: { children: React.ReactNode; modal: React.ReactNode }) {
  const [userProfileData, setUserProfileData] = useState<userProfileMeDto | undefined>();
  const [answers, setAnswers] = useState<AnswerWithProfileDto[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [untilId, setUntilId] = useState<string | undefined>(undefined);
  const [noti, setNoti] = useState<NotificationDto>();

  const fetchNoti = useCallback(async () => {
    const res = await fetch('/api/user/notification');
    if (!res.ok) alert(await res.text());
    const data = (await res.json()) as NotificationDto;
    setNoti(data);
  }, []);

  const onNotiEv = (ev: CustomEvent<NotificationPayloadTypes>) => {
    const notiData = ev.detail;
    switch (ev.detail.notification_name) {
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
      }
    }
  };

  useEffect(() => {
    fetchAllAnswers({ sort: 'DESC', limit: 25 }).then((r) => {
      if (r.length === 0) {
        setLoading(false);
        setAnswers([]);
        return;
      }
      setAnswers(r);
      setUntilId(r[r.length - 1].id);
    });
    fetchNoti();

    const onEv = (ev: CustomEvent<string | undefined>) => {
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

    const onWebSocketEv = (ev: CustomEvent<AnswerWithProfileDto>) => {
      setAnswers((prevAnswer) => (prevAnswer ? [ev.detail, ...prevAnswer] : []));
    };

    AnswerEv.addFetchMoreRequestEventListener(onEv);
    AnswerEv.addCreatedAnswerEventListener(onWebSocketEv);
    NotificationEv.addNotificationEventListener(onNotiEv);
    return () => {
      AnswerEv.removeFetchMoreRequestEventListener(onEv);
      AnswerEv.removeCreatedAnswerEventListener(onWebSocketEv);
      NotificationEv.removeNotificationEventListener(onNotiEv);
    };
  }, []);

  return (
    <div>
      <MyProfileContext.Provider value={userProfileData}>
        <AnswersContext.Provider value={{ answers, loading, untilId }}>
          <NotificationContext.Provider value={noti}>
            {modal}
            <header className="w-full h-full flex justify-center">
              <MainHeader setUserProfile={setUserProfileData} />
            </header>
            <main className="flex justify-center">{children}</main>
          </NotificationContext.Provider>
        </AnswersContext.Provider>
      </MyProfileContext.Provider>
    </div>
  );
}

async function fetchAllAnswers(req: FetchAllAnswersReqDto) {
  const query: string[] = [];
  for (const [key, value] of Object.entries(req)) {
    query.push(`${key}=${value}`);
  }
  const url = `/api/db/answers?${query.join('&')}`;
  const res = await fetch(url, {
    method: 'GET',
    cache: 'no-cache',
  });
  try {
    if (res.ok) {
      const answers = ((await res.json()) as AnswerListWithProfileDto).answersList;
      return answers;
    } else {
      throw new Error(`답변을 불러오는데 실패했어요!: ${await res.text()}`);
    }
  } catch (err) {
    alert(err);
    throw err;
  }
}
