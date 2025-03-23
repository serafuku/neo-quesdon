'use client';

import Question from '@/app/_components/question';
import { useContext, useEffect, useRef, useState } from 'react';
import DialogModalTwoButton from '@/app/_components/modalTwoButton';
import DialogModalLoadingOneButton from '@/app/_components/modalLoadingOneButton';
import { questionDto } from '@/app/_dto/questions/question.dto';
import { MyQuestionEv } from '../_events';
import { Logger } from '@/utils/logger/Logger';
import { QuestionDeletedPayload } from '@/app/_dto/websocket-event/websocket-event.dto';
import { MyProfileContext } from '@/app/main/layout';
import { deleteQuestion } from '@/utils/questions/deleteQuestion';
import { createBlock } from '@/utils/block/createBlock';
import { onApiError } from '@/utils/api-error/onApiError';

const fetchQuestions = async (): Promise<questionDto[] | null> => {
  const res = await fetch('/api/db/questions');

  try {
    if (res.status === 401) {
      return null;
    } else if (!res.ok) {
      onApiError(res.status, res);
      return null;
    } else {
      return await res.json();
    }
  } catch {
    return null;
  }
};

export default function Questions() {
  const [questions, setQuestions] = useState<questionDto[] | null>();
  const profile = useContext(MyProfileContext);
  const [id, setId] = useState<number>(0);
  const deleteQuestionModalRef = useRef<HTMLDialogElement>(null);
  const answeredQuestionModalRef = useRef<HTMLDialogElement>(null);
  const createBlockModalRef = useRef<HTMLDialogElement>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const onNewQuestionEvent = (ev: CustomEvent<questionDto>) => {
    const logger = new Logger('onNewQuestion', { noColor: true });
    logger.log('New Question has arrived: ', ev.detail);
    setQuestions((prev) => (prev ? [ev.detail, ...prev] : []));
  };

  const onDeleteQuestionEvent = (ev: CustomEvent<QuestionDeletedPayload>) => {
    const logger = new Logger('onNewQuestion', { noColor: true });
    logger.log('Question Deleted: ', ev.detail);
    setQuestions((prev) => prev && prev.filter((el) => el.id !== ev.detail.deleted_id));
  };

  useEffect(() => {
    fetchQuestions().then((r) => {
      setQuestions(r);
    });
    MyQuestionEv.addCreatedEventListener(onNewQuestionEvent);
    MyQuestionEv.addDeletedEventListner(onDeleteQuestionEvent);

    return () => {
      MyQuestionEv.removeCreatedEventListener(onNewQuestionEvent);
      MyQuestionEv.removeDeletedEventListener(onDeleteQuestionEvent);
    };
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
                        blockingRef={createBlockModalRef}
                        setIsLoading={setIsLoading}
                        defaultVisibility={profile?.defaultPostVisibility}
                        defaultHideFromTimeline={profile?.defaultHideFromTimeline}
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
      <DialogModalLoadingOneButton
        isLoading={isLoading}
        title_loading={'보내는 중'}
        title_done={'답변완료'}
        body_loading={'답변을 보내고 있어요...'}
        body_done={'답변했어요!'}
        loadingButtonText={'로딩중...'}
        doneButtonText={'확인'}
        ref={answeredQuestionModalRef}
      />
      <DialogModalTwoButton
        title={'질문 지우기'}
        body={'질문을 지울까요...?'}
        confirmButtonText={'확인'}
        cancelButtonText={'취소'}
        ref={deleteQuestionModalRef}
        onClick={() => {
          deleteQuestion(id, onApiError);
        }}
      />
      <DialogModalTwoButton
        title={'질문자 차단'}
        body={'정말 질문자를 차단할까요? 차단된 질문자는 더 이상 나에게 질문을 할 수 없어요!'}
        confirmButtonText={'확인'}
        cancelButtonText={'취소'}
        ref={createBlockModalRef}
        onClick={() => {
          createBlock(id, onApiError);
        }}
      />
    </div>
  );
}
