'use client';

import { userProfileMeDto } from '@/app/_dto/fetch-profile/Profile.dto';
import MainHeader from '@/app/main/_header';
import { createContext, useEffect, useState } from 'react';
import { MyProfileContext } from '@/app/main/_profileContext';
import { FetchAllAnswersReqDto } from '../_dto/fetch-all-answers/fetch-all-answers.dto';
import { AnswerListWithProfileDto, AnswerWithProfileDto } from '../_dto/Answers.dto';
import { AnswerEv } from './_events';

type MainPageContextType = {
  answers: AnswerWithProfileDto[] | null;
  loading: boolean;
  untilId: string | undefined;
};
export const AnswersContext = createContext<MainPageContextType | undefined>(undefined);

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [userProfileData, setUserProfileData] = useState<userProfileMeDto | undefined>();
  const [answers, setAnswers] = useState<AnswerWithProfileDto[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [untilId, setUntilId] = useState<string | undefined>(undefined);

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
    return () => {
      AnswerEv.removeFetchMoreRequestEventListener(onEv);
      AnswerEv.removeCreatedAnswerEventListener(onWebSocketEv);
    };
  }, []);

  return (
    <div>
      <MyProfileContext.Provider value={userProfileData}>
        <AnswersContext.Provider value={{ answers, loading, untilId }}>
          <header className="w-full h-full flex justify-center">
            <MainHeader setUserProfile={setUserProfileData} />
          </header>
          <main className="flex justify-center">{children}</main>
        </AnswersContext.Provider>
      </MyProfileContext.Provider>
    </div>
  );
}

async function fetchAllAnswers(req: FetchAllAnswersReqDto) {
  const res = await fetch('/api/db/fetch-all-answers', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(req),
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
