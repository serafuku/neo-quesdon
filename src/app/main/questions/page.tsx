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
import { ApiErrorResponseDto } from '@/app/_dto/api-error/api-error.dto';
import DialogModalOneButton from '@/app/_components/modalOneButton';
import { deleteQuestion } from '@/utils/questions/deleteQuestion';
import { createBlock } from '@/utils/block/createBlock';

const fetchQuestions = async (): Promise<questionDto[] | null> => {
  const res = await fetch('/api/db/questions');

  try {
    if (res.status === 401) {
      return null;
    } else if (!res.ok) {
      throw new Error(`내 질문을 불러오는데 실패했어요!: ${await res.text()}`);
    } else {
      return await res.json();
    }
  } catch (err) {
    alert(err);
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
  const errorModalRef = useRef<HTMLDialogElement>(null);
  const [errorModalValue, setErrorModalValue] = useState<{ title: string; body: string; buttonText: string }>({
    title: '',
    body: '',
    buttonText: '',
  });
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

  const onResNotOk = async (code: number, res: Response) => {
    const errorRes = (await res.json()) as ApiErrorResponseDto;
    setErrorModalValue({ title: '오류', body: '', buttonText: '알겠어요' });
    switch (errorRes.error_type) {
      case 'CAN_NOT_BLOCK_YOURSELF':
        setErrorModalValue((prev) => ({ ...prev, title: '차단 오류', body: '자기 자신을 차단할 수 없어요!' }));
        break;
      case 'RATE_LIMITED':
        setErrorModalValue((prev) => ({
          ...prev,
          body: '요청 제한을 초과했어요...! 잠시 후 다시 시도해 주세요',
        }));
        break;
      case 'UNAUTHORIZED':
        setErrorModalValue((prev) => ({ ...prev, body: 'API 인증에 실패했어요' }));
        break;
      default:
        setErrorModalValue((prev) => ({
          ...prev,
          body: `알 수 없는 ${code} 오류가 발생했어요: ${errorRes.error_type}, ${errorRes.message}`,
        }));
    }
    errorModalRef.current?.showModal();
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
          deleteQuestion(id, onResNotOk);
        }}
      />
      <DialogModalTwoButton
        title={'질문자 차단'}
        body={'정말 질문자를 차단할까요? 차단된 질문자는 더 이상 나에게 질문을 할 수 없어요!'}
        confirmButtonText={'확인'}
        cancelButtonText={'취소'}
        ref={createBlockModalRef}
        onClick={() => {
          createBlock(id, onResNotOk);
        }}
      />
      <DialogModalOneButton
        title={errorModalValue.title}
        body={errorModalValue.body}
        buttonText={errorModalValue.buttonText}
        ref={errorModalRef}
      ></DialogModalOneButton>
    </div>
  );
}
