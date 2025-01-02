'use client';

import Answer from '@/app/_components/answer';
import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { AnswerWithProfileDto } from '@/app/_dto/answers/Answers.dto';
import DialogModalTwoButton from '@/app/_components/modalTwoButton';
import { onApiError } from '@/utils/api-error/onApiError';

export default function SingleAnswer({ answerBody }: { answerBody: AnswerWithProfileDto }) {
  const [answerBodyState, setAnswerBodyState] = useState<AnswerWithProfileDto | undefined>();
  const singleQuestionDeleteModalRef = useRef<HTMLDialogElement>(null);
  const { userHandle } = useParams() as { userHandle: string };

  const handleDeleteAnswer = async (id: string) => {
    const res = await fetch(`/api/db/answers/${userHandle}/${id}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      window.history.back();
    } else {
      onApiError(res.status, res);
    }
  };

  useEffect(() => {
    setAnswerBodyState(answerBody);
  }, [answerBody]);

  return (
    <div className="flex w-[90%] window:w-[80%] desktop:w-[70%]">
      {answerBodyState ? (
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
        </>
      ) : (
        <div className="w-full text-center">
          <span className="loading loading-spinner loading-lg" />
        </div>
      )}
    </div>
  );
}
