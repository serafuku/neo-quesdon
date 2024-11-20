"use client";

import Answer from "@/app/_components/answer";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchAnswer } from "./action";
import { AnswerDto } from "@/app/_dto/Answers.dto";

export default function SingleAnswer() {
  const [answerBody, setAnswerBody] = useState<AnswerDto>();
  const { answer } = useParams() as { answer: string };

  const handleDeleteAnswer = async (id: string) => {
    const res = await fetch("/api/db/delete-answer", {
      method: "POST",
      body: JSON.stringify({ id: id }),
    });
    if (res.ok) {
      window.history.back();
    }
  };

  useEffect(() => {
    fetchAnswer(answer).then((r) => setAnswerBody(r));
  }, [answer]);

  return (
    <div className="flex w-[90%] window:w-[80%] desktop:w-[70%]">
      {answerBody && (
        <>
          <Answer value={answerBody} id={answerBody.id} />
          <input
            type="checkbox"
            id={`answer_delete_modal_${answerBody.id}`}
            className="modal-toggle"
          />
          <div className="modal" role="dialog">
            <div className="modal-box">
              <h3 className="py-4 text-2xl">답변을 지울까요...?</h3>
              <div className="modal-action">
                <label
                  htmlFor={`answer_delete_modal_${answerBody.id}`}
                  className="btn btn-error"
                  onClick={() => handleDeleteAnswer(answerBody.id)}
                >
                  확인
                </label>
                <label
                  htmlFor={`answer_delete_modal_${answerBody.id}`}
                  className="btn"
                >
                  취소
                </label>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
