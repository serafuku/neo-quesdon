'use client';

import Answer from '@/app/_components/answer';
import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { AnswerDto } from '@/app/_dto/answers/Answers.dto';
import DialogModalTwoButton from '@/app/_components/modalTwoButton';

export default function SingleAnswer() {
  const [answerBody, setAnswerBody] = useState<AnswerDto>();
  const singleQuestionDeleteModalRef = useRef<HTMLDialogElement>(null);
  const { answer } = useParams() as { answer: string };
  const { userHandle } = useParams() as { userHandle: string };

  async function fetchAnswer(id: string) {
    const res = await fetch(`/api/db/answers/${userHandle}/${id}`, {
      method: 'GET',
    });
    if (!res.ok) {
      throw new Error(`Fail to fetch answer! ${await res.text()}`);
    }
    return await res.json();
  }

  const handleDeleteAnswer = async (id: string) => {
    const res = await fetch(`/api/db/answers/${userHandle}/${id}`, {
      method: 'DELETE',
    });
    try {
      if (res.ok) {
        window.history.back();
      } else {
        throw new Error(`답변을 지우는데 실패했어요! ${await res.text()}`);
      }
    } catch (err) {
      alert(err);
    }
  };

  useEffect(() => {
    fetchAnswer(answer).then((r) => setAnswerBody(r));
  }, [answer]);

  return (
    <div className="flex w-[90%] window:w-[80%] desktop:w-[70%]">
      {answerBody && (
        <>
          <Answer value={answerBody} id={answerBody.id} ref={singleQuestionDeleteModalRef} />
          <DialogModalTwoButton
            title={'답변 지우기'}
            body={'답변을 지울까요...?'}
            confirmButtonText={'확인'}
            cancelButtonText={'취소'}
            ref={singleQuestionDeleteModalRef}
            onClick={() => handleDeleteAnswer(answerBody.id)}
          />
          <input type="checkbox" id={`answer_delete_modal_${answerBody.id}`} className="modal-toggle" />
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
                <label htmlFor={`answer_delete_modal_${answerBody.id}`} className="btn">
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
