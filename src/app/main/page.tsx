"use client";

import { useEffect, useState } from "react";
import Answer from "../_components/answer";
import { FaExclamationCircle } from "react-icons/fa";
import { AnswerDto } from "../_dto/fetch-all-answers/Answers.dto";

export default function MainBody() {
  const [answers, setAnswers] = useState<AnswerDto[]>([]);
  const [mounted, setMounted] = useState<HTMLDivElement | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchMainAnswers = async () => {
    setLoading(true);
    const res = await fetch(
      `/api/db/fetch-all-answers?limit=5&cursor=${cursor || ""}`
    ).then((r) => r.json());

    setAnswers((prevAnswers) => [...prevAnswers, ...res.answers]);
    setCursor(res.nextCursor);
    setLoading(false);
  };

  useEffect(() => {
    fetchMainAnswers();
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && cursor !== null) fetchMainAnswers();
      },
      {
        threshold: 0.7,
      }
    );
    if (mounted) observer.observe(mounted);
    return () => {
      if (mounted) observer.unobserve(mounted);
    };
  }, [mounted, cursor]);

  return (
    <div className="w-[90%] desktop:w-[60%]">
      <h3 className="text-4xl mb-2">최근 올라온 답변들</h3>
      {answers === undefined ? (
        <div className="flex justify-center">
          <span className="loading loading-spinner loading-lg" />
        </div>
      ) : (
        <div>
          {answers.length > 0 ? (
            <div className="flex flex-col">
              {answers.map((r) => (
                <div key={r.id}>
                  <Answer value={r} />
                </div>
              ))}
              <div
                className="w-full h-16 flex justify-center items-center"
                ref={(ref) => setMounted(ref)}
              >
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
