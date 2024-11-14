"use client";

import { useCallback, useEffect, useState } from "react";
import Question from "../_components/answer";
import { FaExclamationCircle } from "react-icons/fa";
import { AnswerDto } from "../_dto/fetch-all-answers/Answers.dto";

export default function MainBody() {
  const [answers, setAnswers] = useState<AnswerDto[]>([]);

  const fetchMainAnswers = useCallback(async () => {
    const res = await fetch("/api/db/fetch-all-answers").then((r) => r.json());

    setAnswers(res);
  }, []);

  useEffect(() => {
    fetchMainAnswers();
  }, [fetchMainAnswers]);

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
            <div className="flex flex-col-reverse">
              {answers.map((r) => (
                <div key={r.id}>
                  <Question value={r} />
                </div>
              ))}
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
