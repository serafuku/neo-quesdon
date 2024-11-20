"use client";

import { questions } from "@/app";
import Question from "@/app/_components/question";
import { useEffect, useRef, useState } from "react";
import { deleteQuestion } from "./action";

const fetchQuestions = async () => {
  const res = await fetch("/api/db/fetch-my-questions")
    .then((r) => {
      if (!r.ok) {
        console.error(`Fail to fetch my questions`);
        return null;
      }
      return r.json();
    });

  return res;
};

export default function Questions() {
  const [questions, setQuestions] = useState<questions[] | null>(null);
  const parentDivRef = useRef<HTMLDivElement>(null);

  const onEscape = (e: React.KeyboardEvent) => {
    const modalState = document.getElementById(
      "my_modal_1"
    ) as HTMLInputElement;
    if (e.key === "Escape") {
      modalState.checked = false;
    }
  };

  useEffect(() => {
    fetchQuestions().then((r) => setQuestions(r));
  }, []);

  useEffect(() => {
    parentDivRef.current?.focus();
  }, [questions]);

  return (
    <div className="w-[90%] window:w-[80%] desktop:w-[70%] flex flex-col justify-center">
      <h3 className="text-3xl desktop:text-4xl mb-2">미답변 질문들</h3>
      {questions === undefined || null ? (
        <div>
          <span className="loading loading-infinity loading-lg" />
        </div>
      ) : (
        <div className="w-full">
          {questions ? (
            <div>
              {questions.length > 0 ? (
                <div>
                  {questions.map((el) => (
                    <div key={el.id}>
                      <Question
                        singleQuestion={el}
                        multipleQuestions={questions}
                        setState={setQuestions}
                        id={el.id}
                      />
                      <input
                        type="checkbox"
                        id={`question_delete_modal_${el.id}`}
                        className="modal-toggle"
                      />
                      <div className="modal" role="dialog">
                        <div className="modal-box">
                          <h3 className="py-4 text-2xl">질문을 지울까요...?</h3>
                          <div className="modal-action">
                            <label
                              htmlFor={`question_delete_modal_${el.id}`}
                              className="btn btn-error"
                              onClick={() => {
                                deleteQuestion(el.id);
                                setQuestions((prevQuestions) =>
                                  prevQuestions
                                    ? [
                                        ...prevQuestions.filter(
                                          (prev) => prev.id !== el.id
                                        ),
                                      ]
                                    : null
                                );
                              }}
                            >
                              확인
                            </label>
                            <label
                              htmlFor={`question_delete_modal_${el.id}`}
                              className="btn"
                            >
                              취소
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-fit p-4 glass rounded-box flex flex-col items-center shadow mb-2">
                  <h1 className="text-xl desktop:text-3xl">
                    👍 답변하지 않은 질문이 없어요!
                  </h1>
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
      <input type="checkbox" id="my_modal_1" className="modal-toggle" />
      <div
        className="modal"
        role="dialog"
        onKeyDown={onEscape}
        tabIndex={0}
        ref={parentDivRef}
      >
        <div className="modal-box">
          <h3 className="py-4 text-2xl">답변했어요!</h3>
          <div className="modal-action">
            <label htmlFor="my_modal_1" className="btn">
              닫기
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
