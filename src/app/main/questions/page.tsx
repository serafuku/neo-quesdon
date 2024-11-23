"use client";

import { questions } from "@/app";
import Question from "@/app/_components/question";
import { useEffect, useRef, useState } from "react";
import { deleteQuestion } from "./action";
import DialogModalTwoButton from "@/app/_components/modalTwoButton";
import DialogModalOneButton from "@/app/_components/modalOneButton";

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
  const [id, setId] = useState<number>(0);
  const deleteQuestionModalRef = useRef<HTMLDialogElement>(null);
  const answeredQuestionModalRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    fetchQuestions().then((r) => setQuestions(r));
  }, []);

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
                        setId={setId}
                        setState={setQuestions}
                        answerRef={answeredQuestionModalRef}
                        deleteRef={deleteQuestionModalRef}
                      />
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
      <DialogModalOneButton
        title={"답변완료"}
        body={"답변했어요!"}
        buttonText={"확인"}
        ref={answeredQuestionModalRef}
      />
      <DialogModalTwoButton
        title={"질문 지우기"}
        body={"질문을 지울까요...?"}
        confirmButtonText={"확인"}
        cancelButtonText={"취소"}
        ref={deleteQuestionModalRef}
        onClick={() => {
          deleteQuestion(id);
          setQuestions((prevQuestions) =>
            prevQuestions
              ? [...prevQuestions.filter((prev) => prev.id !== id)]
              : null
          );
        }}
      />
    </div>
  );
}
