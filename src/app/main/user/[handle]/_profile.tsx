import DialogModalOneButton from '@/app/_components/modalOneButton';
import NameComponents from '@/app/_components/NameComponents';
import { CreateQuestionDto } from '@/app/_dto/create_question/create-question.dto';
import { userProfileWithHostnameDto } from '@/app/_dto/fetch-profile/Profile.dto';
import josa from '@/app/api/functions/josa';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';

type FormValue = {
  question: string;
  questioner: boolean;
};

async function fetchProfile(handle: string) {
  const profile = await fetch(`/api/db/fetch-profile/${handle}`);
  if (profile && profile.ok) {
    return profile.json() as unknown as userProfileWithHostnameDto;
  } else {
    return undefined;
  }
}

export default function Profile() {
  const { handle } = useParams() as { handle: string };
  const profileHandle = decodeURIComponent(handle);

  const [userProfile, setUserProfile] = useState<userProfileWithHostnameDto>();
  const [localHandle, setLocalHandle] = useState<string>('');
  const questionSuccessModalRef = useRef<HTMLDialogElement>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    trigger,
    getValues,
    setError,
    formState: { errors },
  } = useForm<FormValue>({
    defaultValues: {
      question: '',
      questioner: false,
    },
  });

  const questioner = watch('questioner');

  const onCtrlEnter = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      const isValid = await trigger();

      if (isValid === false) {
        return;
      } else {
        const value = getValues();
        if (value && !questionSuccessModalRef.current?.open) {
          await onSubmit(value);
        }
      }
    }
  };

  const mkQuestionCreateApi = async (q: CreateQuestionDto): Promise<Response> => {
    const res = await fetch('/api/db/create-question', {
      method: 'POST',
      body: JSON.stringify(q),
    });
    return res;
  };

  const shareUrl = () => {
    const server = localStorage.getItem('server');
    const text = `저의 ${josa(
      userProfile?.questionBoxName,
      '이에요!',
      '예요!',
    )} #neo-quesdon ${location.origin}/main/user/${userProfile?.handle}`;
    return `https://${server}/share?text=${encodeURIComponent(text)}`;
  };

  const onSubmit: SubmitHandler<FormValue> = async (e) => {
    const user_handle = localStorage.getItem('user_handle');
    const detectWhiteSpaces = new RegExp(/^\s+$/);

    // 작성자 공개
    if (questioner === true) {
      if (user_handle === null) {
        setError('questioner', {
          type: 'notLoggedIn',
          message: '작성자 공개를 하려면 로그인을 해주세요!',
        });
        return;
      }
      if (detectWhiteSpaces.test(e.question) === true) {
        setError('question', {
          type: 'questionOnlyWhiteSpace',
          message: '아무것도 없는 질문을 보내시려구요...?',
        });
        return;
      }

      const req: CreateQuestionDto = {
        question: e.question,
        questioner: user_handle,
        questionee: profileHandle,
      };
      reset()
      const res = await mkQuestionCreateApi(req);

      if (res.status === 200) {
        questionSuccessModalRef.current?.showModal();
      }
    }
    // 작성자 비공개
    else {
      if (userProfile?.stopAnonQuestion === true) {
        setError('questioner', {
          type: 'stopAnonQuestion',
          message: '익명 질문은 받지 않고 있어요...',
        });
        return;
      } else {
        if (detectWhiteSpaces.test(e.question) === true) {
          setError('question', {
            type: 'questionOnlyWhiteSpace',
            message: '아무것도 없는 질문을 보내시려구요...?',
          });
          return;
        }

        const req: CreateQuestionDto = {
          question: e.question,
          questioner: null,
          questionee: profileHandle,
        };
        reset();
        const res = await mkQuestionCreateApi(req);
        if (res.status === 200) {
          questionSuccessModalRef.current?.showModal()
        }
      }
    }
  };

  useEffect(() => {
    fetchProfile(profileHandle).then((r) => {
      setUserProfile(r);
    });
    setLocalHandle(localStorage.getItem('user_handle') ?? '');
  }, [profileHandle]);

  return (
    <div className="w-full h-fit desktop:sticky top-2 flex flex-col">
      <div className="h-fit py-4 glass rounded-box flex flex-col items-center shadow mb-2">
        <div className="flex flex-col items-center gap-2 py-2">
          {userProfile && userProfile.avatarUrl ? (
            <div className="flex w-full h-24">
              <Link href={`https://${userProfile.hostname}/${userProfile.handle}`}>
                <img
                  src={userProfile.avatarUrl}
                  alt="User Avatar"
                  className={`w-24 h-24 object-cover absolute left-[calc(50%-3rem)] rounded-full`}
                />
              </Link>
              {userProfile.stopAnonQuestion && (
                <div className="chat chat-start w-32 window:w-full desktop:w-full relative left-[68%] window:left-[60%] deskstop:left-[57%]">
                  <div className="chat-bubble text-sm flex items-center bg-base-100 text-slate-700">
                    작성자 공개 질문만 받아요!
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="skeleton h-24 w-24 rounded-full" />
          )}
          <div className="flex items-center text-xl">
            {userProfile?.stopNewQuestion ? (
              <div className="flex flex-col items-center desktop:flex-row">
                <NameComponents username={userProfile.name} width={32} height={32} />
                <span>님은 지금 질문을 받지 않고 있어요...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center desktop:flex-row window:flex-row window:text-2xl">
                <NameComponents username={userProfile?.name} width={32} height={32} />
                <span>님의 {josa(userProfile?.questionBoxName, '이에요!', '예요!')}</span>
              </div>
            )}
          </div>
        </div>
        <form className="w-full flex flex-col items-center" onSubmit={handleSubmit(onSubmit)}>
          <textarea
            {...register('question', {
              required: 'required',
            })}
            placeholder="질문 내용을 입력해 주세요"
            className={`w-[90%] my-2 font-thin leading-loose textarea ${
              errors.question ? 'textarea-error' : 'textarea-bordered'
            }`}
            onKeyDown={onCtrlEnter}
            disabled={userProfile?.stopNewQuestion === true ? true : false}
          />
          {errors.questioner && errors.questioner.type === 'stopAnonQuestion' && (
            <div
              className="tooltip tooltip-open tooltip-bottom tooltip-error transition-opacity"
              data-tip={errors.questioner.message}
            />
          )}
          {errors.questioner && errors.questioner.type === 'notLoggedIn' && (
            <div
              className="tooltip tooltip-open tooltip-bottom tooltip-error transition-opacity"
              data-tip={errors.questioner.message}
            />
          )}
          {errors.question && errors.question.type === 'questionOnlyWhiteSpace' && (
            <div
              className="tooltip tooltip-open tooltip-bottom tooltip-error transition-opacity"
              data-tip={errors.question.message}
            />
          )}
          <div className="w-[90%] flex justify-between">
            <div className="flex gap-2 items-center">
              <input
                type="checkbox"
                className="toggle toggle-accent"
                onClick={() => setValue('questioner', !questioner)}
              />
              <input type="hidden" {...register('questioner')} />
              <span>작성자 공개</span>
            </div>
            <button type="submit" className="btn btn-primary">
              질문하기
            </button>
          </div>
        </form>
      </div>
      {localHandle === profileHandle && (
        <div className="h-fit py-4 glass rounded-box flex flex-col items-center shadow mb-2">
          <a className="link" href={shareUrl()} target="_blank" rel="noreferrer">
            {userProfile?.instanceType}에 질문상자 페이지를 공유
          </a>
        </div>
      )}
      <DialogModalOneButton title={'성공!'} body={'질문했어요!'} buttonText={'닫기'} ref={questionSuccessModalRef} />
    </div>
  );
}
