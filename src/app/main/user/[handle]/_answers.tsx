'use client';

import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import Answer from '@/app/_components/answer';
import { userProfileWithHostnameDto } from '@/app/_dto/fetch-profile/Profile.dto';
import { AnswerDto } from '@/app/_dto/Answers.dto';
import { FetchUserAnswersDto } from '@/app/_dto/fetch-user-answers/fetch-user-answers.dto';
import DialogModalTwoButton from '@/app/_components/modalTwoButton';

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
  const profileHandle = decodeURIComponent(handle);

  const [userProfile, setUserProfile] = useState<userProfileWithHostnameDto>();
  const [answers, setAnswers] = useState<AnswerDto[] | null>(null);
  const [count, setCount] = useState<number | null>(0);
  const [untilId, setUntilId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [mounted, setMounted] = useState<HTMLDivElement | null>(null);
  const [id, setId] = useState<string>('');
  const answerDeleteModalRef = useRef<HTMLDialogElement>(null);

  const fetchUserAnswers = async (q: FetchUserAnswersDto): Promise<ResponseType> => {
    const res = await fetch('/api/db/fetch-user-answers', {
      method: 'POST',
      body: JSON.stringify(q),
    });
    if (res.ok) {
      return res.json();
    } else {
      throw new Error(`fetch-user-answers fail! ${res.status}, ${res.statusText}`);
    }
  };

  const handleDeleteAnswer = async (id: string) => {
    await fetch('/api/db/delete-answer', {
      method: 'POST',
      body: JSON.stringify({ id: id }),
    });
    if (answers && count) {
      const filteredAnswer = answers.filter((el) => el.id !== id);
      setAnswers(filteredAnswer);
      setCount((prevCount) => (prevCount ? prevCount - 1 : null));
    }
  };

  useEffect(() => {
    fetchProfile(profileHandle).then((r) => {
      setUserProfile(r);
    });
  }, [profileHandle]);

  useEffect(() => {
    if (userProfile) {
      fetchUserAnswers({
        answeredPersonHandle: userProfile.handle,
        sort: 'DESC',
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
            sort: 'DESC',
            limit: 20,
            untilId: untilId,
            answeredPersonHandle: profileHandle,
          }).then((r) => {
            if (r.answers.length === 0) {
              setLoading(false);
              return;
            }
            setAnswers((prev_answers) => (prev_answers ? [...prev_answers, ...r.answers] : null));
            setUntilId(r.answers[r.answers.length - 1].id);
          });
        }
      },
      {
        threshold: 0.7,
      },
    );
    if (mounted) observer.observe(mounted);
    return () => {
      if (mounted) observer.unobserve(mounted);
    };
  }, [mounted, untilId]);

  return (
    <div className="w-full flex flex-col desktop:flex-row">
      {userProfile !== null && (
        <div className="w-full flex flex-col desktop:flex-row">
          {answers !== null ? (
            <div className="w-full">
              <div className="flex items-center gap-2 my-2 text-2xl">
                <span>답변</span>
                <span className="badge badge-ghost">{count}</span>
              </div>
              {answers.length > 0 ? (
                <div className="flex flex-col">
                  {answers.map((el) => (
                    <div key={el.id}>
                      <Answer value={el} id={el.id} idState={setId} ref={answerDeleteModalRef} />
                    </div>
                  ))}
                  <div className="w-full h-16 flex justify-center items-center" ref={(ref) => setMounted(ref)}>
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
      )}
      <DialogModalTwoButton
        title={'답변 지우기'}
        body={'답변을 지울까요...?'}
        confirmButtonText={'확인'}
        cancelButtonText={'취소'}
        ref={answerDeleteModalRef}
        onClick={() => handleDeleteAnswer(id)}
      />
    </div>
  );
}
