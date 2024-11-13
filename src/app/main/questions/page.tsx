"use client";

import { questions } from "@/app";
import Question from "@/app/_components/question";
import { useEffect, useState } from "react";
import { deleteQuestion } from "./action";

const fetchQuestions = async () => {
  const res = await fetch("/api/db/fetch-questions").then((r) => r.json());

  return res;
};

export default function Questions() {
  const [questions, setQuestions] = useState<questions[]>();

  useEffect(() => {
    fetchQuestions().then((r) => setQuestions(r));
  }, []);

  return (
    <div className="w-[90%] desktop:w-[60%] flex justify-center">
      {questions === undefined || null ? (
        <div>
          <span className="loading loading-infinity loading-lg" />
        </div>
      ) : (
        <div className="w-full">
          {questions.length > 0 ? (
            <div>
              {questions.map((el) => (
                <div key={el.id}>
                  <Question value={el} hostname={window.location.hostname} />
                  <input
                    type="checkbox"
                    id="question_delete_modal"
                    className="modal-toggle"
                  />
                  <div className="modal" role="dialog">
                    <div className="modal-box">
                      <h3 className="py-4 text-2xl">질문을 지울까요...?</h3>
                      <div className="modal-action">
                        <label
                          htmlFor="question_delete_modal"
                          className="btn btn-error"
                          onClick={() => {
                            deleteQuestion(el.id).then(() =>
                              fetchQuestions().then((r) => setQuestions(r))
                            );
                          }}
                        >
                          확인
                        </label>
                        <label htmlFor="question_delete_modal" className="btn">
                          취소
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="w-full flex justify-center">
              <h1 className="text-3xl">아무것도 없습니다!</h1>
            </div>
          )}
        </div>
      )}
      <input type="checkbox" id="my_modal_1" className="modal-toggle" />
      <div className="modal" role="dialog">
        <div className="modal-box">
          <h3 className="py-4 text-2xl">답변했어요!</h3>
          <div className="modal-action">
            <label
              htmlFor="my_modal_1"
              className="btn"
              onClick={() => {
                fetchQuestions().then((r) => setQuestions(r));
              }}
            >
              닫기
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
