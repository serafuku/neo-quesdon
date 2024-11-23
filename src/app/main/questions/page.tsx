'use client';

import { questions } from '@/app';
import Question from '@/app/_components/question';
import { useEffect, useRef, useState } from 'react';
import { deleteQuestion } from './action';
import DialogModalTwoButton from '@/app/_components/modalTwoButton';
import DialogModalOneButton from '@/app/_components/modalOneButton';

const fetchQuestions = async () => {
  const res = await fetch('/api/db/fetch-my-questions');

  try {
    if (!res.ok) {
      throw new Error(`내 질문을 불러오는데 실패했어요!: ${await res.text()}`);
    } else {
      return await res.json();
    }
  } catch (err) {
    alert(err);
  }

  return res;
};

export default function Questions() {
  const [questions, setQuestions] = useState<questions[] | null>();
  const [id, setId] = useState<number>(0);
  const deleteQuestionModalRef = useRef<HTMLDialogElement>(null);
  const answeredQuestionModalRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    fetchQuestions().then((r) => setQuestions(r));
  }, []);

  return (
    <div className="w-[90%] window:w-[80%] desktop:w-[70%] flex flex-col justify-center">
      <h3 className="text-3xl desktop:text-4xl mb-2">미답변 질문들</h3>
      {questions === undefined ? (
        <div className="w-full flex justify-center">
          <span className="loading loading-spinner loading-lg" />
        </div>
      ) : (
        <div className="w-full">
          {questions !== null ? (
            <div>
              {questions.length > 0 ? (
                <div>
                  {questions.map((el) => (
                    <div key={el.id}>
                      <Question
                        singleQuestion={el}
                        multipleQuestions={questions}
                        setId={setId}
                        setQuestions={setQuestions}
                        answerRef={answeredQuestionModalRef}
                        deleteRef={deleteQuestionModalRef}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-fit p-4 glass rounded-box flex flex-col items-center shadow mb-2">
                  <h1 className="text-xl desktop:text-3xl">👍 답변하지 않은 질문이 없어요!</h1>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full flex justify-center">
              <span className="text-2xl">로그인이 안 되어있어요!</span>
            </div>
          )}
        </div>
      )}
      <DialogModalOneButton
        title={'답변완료'}
        body={'답변했어요!'}
        buttonText={'확인'}
        ref={answeredQuestionModalRef}
      />
      <DialogModalTwoButton
        title={'질문 지우기'}
        body={'질문을 지울까요...?'}
        confirmButtonText={'확인'}
        cancelButtonText={'취소'}
        ref={deleteQuestionModalRef}
        onClick={() => {
          deleteQuestion(id);
          setQuestions((prevQuestions) => (prevQuestions ? [...prevQuestions.filter((prev) => prev.id !== id)] : null));
        }}
      />
    </div>
  );
}
