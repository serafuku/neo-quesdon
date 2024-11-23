'use client';

import { useEffect, useState } from 'react';
import Answer from '../_components/answer';
import { FaExclamationCircle } from 'react-icons/fa';
import { answer } from '@prisma/client';
import { FetchAllAnswersReqDto } from '../_dto/fetch-all-answers/fetch-all-answers.dto';

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
      return (await res.json()) as answer[];
    } else {
      throw new Error(`답변을 불러오는데 실패했어요!: ${await res.text()}`);
    }
  } catch (err) {
    alert(err);
    return [];
  }
}
export default function MainBody() {
  const [answers, setAnswers] = useState<answer[] | null>(null);
  const [mounted, setMounted] = useState<HTMLDivElement | null>(null);
  const [untilId, setUntilId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

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
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && untilId !== null) {
          fetchAllAnswers({ sort: 'DESC', limit: 25, untilId: untilId }).then((r) => {
            if (r.length === 0) {
              setLoading(false);
              return;
            }
            setAnswers((prev_answers) => (prev_answers ? [...prev_answers, ...r] : null));
            setUntilId(r[r.length - 1].id);
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
    <div className="w-[90%] window:w-[80%] desktop:w-[70%]">
      <h3 className="text-3xl desktop:text-4xl mb-2">최근 올라온 답변들</h3>
      {answers === null ? (
        <div className="flex justify-center">
          <span className="loading loading-spinner loading-lg" />
        </div>
      ) : (
        <div>
          {answers.length > 0 ? (
            <div className="flex flex-col">
              {answers.map((r) => (
                <div key={r.id}>
                  <Answer id={r.id} value={r} />
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
            <div className="flex flex-col items-center justify-center text-3xl my-2 p-2">
              <FaExclamationCircle />
              <span>아무것도 없습니다.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
