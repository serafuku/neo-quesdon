"use client";

import { useEffect, useState } from "react";
import Question from "../_components/answer";
import { fetchMainAnswers } from "./action";
import { FaExclamationCircle } from "react-icons/fa";
import { answers } from "..";

export default function MainBody() {
  const [answers, setAnswers] = useState<answers[]>();

  useEffect(() => {
    fetchMainAnswers().then((r) => setAnswers(r));
  }, []);

  return (
    <div className="w-[60%]">
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
