'use client';

import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import Answer from '@/app/_components/answer';
import { userProfileDto } from '@/app/_dto/fetch-profile/Profile.dto';
import { AnswerDto, AnswerWithProfileDto } from '@/app/_dto/answers/Answers.dto';
import { FetchUserAnswersDto } from '@/app/_dto/answers/fetch-user-answers.dto';
import DialogModalTwoButton from '@/app/_components/modalTwoButton';
import { AnswerDeletedEvPayload } from '@/app/_dto/websocket-event/websocket-event.dto';
import { AnswerEv } from '@/app/main/_events';

type ResponseType = {
  answers: AnswerDto[];
  count: number;
};

async function fetchProfile(handle: string) {
  const profile = await fetch(`/api/db/fetch-profile/${handle}`);
  try {
    if (profile.ok) {
      return profile.json() as unknown as userProfileDto;
    } else {
      throw new Error(`프로필이 없습니다! ${await profile.text()}`);
    }
  } catch (err) {
    alert(err);
    return undefined;
  }
}

export default function UserPage() {
  const { handle } = useParams() as { handle: string };
  const profileHandle = decodeURIComponent(handle);

  const [userProfile, setUserProfile] = useState<userProfileDto>();
  const [answers, setAnswers] = useState<AnswerDto[] | null>(null);
  const [count, setCount] = useState<number | null>(0);
  const [untilId, setUntilId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [mounted, setMounted] = useState<HTMLDivElement | null>(null);
  const [id, setId] = useState<string>('');
  const answerDeleteModalRef = useRef<HTMLDialogElement>(null);

  const fetchUserAnswers = async (q: FetchUserAnswersDto): Promise<ResponseType> => {
    const params = Object.entries(q)
      .map((e) => {
        const [key, value] = e;
        return `${key}=${encodeURIComponent(value)}`;
      })
      .join('&');
    const res = await fetch(`/api/db/answers/${handle}?${params}`, {
      method: 'GET',
    });
    try {
      if (res.ok) {
        return res.json();
      } else {
        throw new Error(`fetch-user-answers fail! ${res.status}, ${await res.text()}`);
      }
    } catch (err) {
      alert(err);
      return { answers: [], count: 0 };
    }
  };

  const handleDeleteAnswer = async (id: string) => {
    const res = await fetch(`/api/db/answers/${handle}/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      alert(`답변을 삭제하는데 실패하였습니다! ${await res.text()}`);
      return;
    }
    if (answers && count) {
      const filteredAnswer = answers.filter((el) => el.id !== id);
      setAnswers(filteredAnswer);
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

  useEffect(() => {
    const onAnswerCreated = (ev: CustomEvent<AnswerWithProfileDto>) => {
      setAnswers((prev) => {
        if (prev && ev.detail.answeredPersonHandle === profileHandle) {
          return [ev.detail, ...prev];
        } else {
          return prev;
        }
      });
      setCount((prev) => (prev ? prev + 1 : null));
    };
    const onAnswerDeleted = (ev: CustomEvent<AnswerDeletedEvPayload>) => {
      setAnswers((prev) => {
        if (prev) {
          return prev.filter((v) => v.id !== ev.detail.deleted_id);
        } else {
          return prev;
        }
      });
      setCount((prev) => (prev ? prev - 1 : null));
    };

    AnswerEv.addAnswerCreatedEventListener(onAnswerCreated);
    AnswerEv.addAnswerDeletedEventListener(onAnswerDeleted);
    return () => {
      AnswerEv.removeAnswerCreatedEventListener(onAnswerCreated);
      AnswerEv.removeAnswerDeletedEventListener(onAnswerDeleted);
    };
  }, []);

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
