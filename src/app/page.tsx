'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import detectInstance from '../utils/detectInstance/detectInstance';
import { loginReqDto } from './_dto/web/login/login.dto';
import GithubRepoLink from './_components/github';
import DialogModalOneButton from './_components/modalOneButton';
import { loginCheck } from '@/utils/checkLogin/fastLoginCheck';
import { logout } from '@/utils/logout/logout';

interface FormValue {
  address: string;
}

/**
 * 미스키 전용 Auth Function
 * @param loginReqDto
 * @returns
 */
const misskeyAuth = async ({ host }: loginReqDto) => {
  const body: loginReqDto = {
    host: host,
  };
  const res = await fetch(`/api/web/misskey-login`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Misskey login Error! ${res.status}, ${await res.text()}`);
  }
  return await res.json();
};

/**
 * 마스토돈 전용 Auth Function
 * @param loginReqDto
 * @returns
 */
const mastodonAuth = async ({ host }: loginReqDto) => {
  const body: loginReqDto = {
    host: host,
  };
  const res = await fetch(`/api/web/mastodon-login`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Mastodon login Error! ${res.status}, ${await res.text()}`);
  }
  return await res.json();
};

const goWithoutLogin = async () => {
  try {
    await logout();
  } catch {}
  window.location.replace('/main');
};
/**
 * https://example.com/ 같은 URL 형식이나 handle 형식으로 입력한 경우 host로 변환.
 * host를 소문자 처리후 반환
 * @param urlOrHostOrHandle
 * @returns
 */
function convertHost(urlOrHostOrHandle: string) {
  const url_regex = /\/\/[^/@\s]+(:[0-9]{1,5})?\/?/;
  const matched_host_from_url = urlOrHostOrHandle.match(url_regex)?.[0];
  const handle_regex = /(:?@)[^@\s\n\r\t]+$/g;
  const matched_host_from_handle = urlOrHostOrHandle.match(handle_regex)?.[0];
  if (matched_host_from_url) {
    const replaceed = matched_host_from_url.replaceAll('/', '').toLowerCase();
    console.log(`URL ${urlOrHostOrHandle} replaced with ${replaceed}`);
    return replaceed;
  } else if (matched_host_from_handle) {
    const replaced = matched_host_from_handle.replaceAll('@', '').toLowerCase();
    console.log(`Handle ${urlOrHostOrHandle} replaced with ${replaced}`);
    return replaced;
  }
  return urlOrHostOrHandle.toLowerCase();
}

export default function Home() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errMessage, setErrorMessage] = useState<string>();
  const errModalRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const {
    register,
    formState: { errors },
    handleSubmit,
    setValue: setFormValue,
  } = useForm<FormValue>({ defaultValues: { address: '' } });

  const onSubmit: SubmitHandler<FormValue> = async (e) => {
    setIsLoading(true);
    const host = convertHost(e.address);

    localStorage.setItem('server', host);
    await detectInstance(host)
      .then((type) => {
        const payload: loginReqDto = {
          host: host,
        };
        switch (type) {
          case 'misskey':
          case 'cherrypick':
            misskeyAuth(payload)
              .then((r) => {
                router.replace(r.url);
              })
              .catch((err) => {
                setErrorMessage(err);
                errModalRef.current?.showModal();
              });
            break;
          case 'mastodon':
            mastodonAuth(payload)
              .then((r) => {
                router.replace(r);
              })
              .catch((err) => {
                setErrorMessage(err);
                errModalRef.current?.showModal();
              });
            break;
          default:
            setErrorMessage(`알 수 없는 인스턴스 타입 '${type}' 이에요!`);
            errModalRef.current?.showModal();
        }
      })
      .catch(() => {
        setErrorMessage('인스턴스 타입 감지에 실패했어요!');
        errModalRef.current?.showModal();
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    const lastUsedHost = localStorage.getItem('server');
    const ele = document.getElementById('serverNameInput') as HTMLInputElement;
    if (lastUsedHost && ele) {
      setFormValue('address', lastUsedHost);
      ele.focus();
    }
  }, [setFormValue]);

  useEffect(() => {
    const fn = async () => {
      setIsLoading(true);
      /// 이미 로그인 되어있는 경우 빠른 재 로그인 시도
      const lastUsedHost = localStorage.getItem('server');
      const lastUsedHandle = localStorage.getItem('user_handle');
      if (lastUsedHost && lastUsedHandle != null) {
        console.log('Try Fast Relogin...');
        const relogin_success = await loginCheck();
        if (relogin_success) {
          console.log('Fast ReLogin OK!!');
          router.replace('/main');
          return;
        } else {
          localStorage.removeItem('handle');
        }
      }
      setIsLoading(false);
    };
    fn();
  }, []);

  return (
    <div className="w-screen h-screen absolute flex flex-col items-center justify-center">
      <main className="w-full h-full flex flex-col justify-center items-center p-6">
        <div className="mb-4 flex flex-col items-center">
          <div className="relative text-7xl font-bold z-10">
            <h1 className="absolute -inset-0 -z-10 bg-gradient-to-r text-transparent from-red-500 via-fuchsia-500 to-green-500 bg-clip-text blur-lg">
              Neo-Quesdon
            </h1>
            <h1 className="text-7xl font-bold z-10 mb-2 desktop:mb-0">Neo-Quesdon</h1>
          </div>
          <span className="font-thin tracking-wider text-base desktop:text-lg">
            Misskey / CherryPick / Mastodon 에서 사용할 수 있는 새로운 Quesdon
          </span>
        </div>
        <div className="flex flex-col desktop:flex-row items-center">
          <form className="flex flex-col desktop:flex-row" onSubmit={handleSubmit(onSubmit)} id="urlInputForm">
            {errors.address && errors.address.type === 'pattern' && (
              <div
                className="tooltip tooltip-open tooltip-error transition-opacity"
                data-tip="올바른 URL을 입력해주세요"
              />
            )}
            {errors.address && errors.address.message === 'required' && (
              <div className="tooltip tooltip-open tooltip-error transition-opacity" data-tip="URL을 입력해주세요" />
            )}
            <input
              id="serverNameInput"
              {...register('address', {
                pattern: /\./,
                required: 'required',
              })}
              placeholder="serafuku.moe"
              className="w-full input input-bordered text-lg desktop:text-3xl mb-4 desktop:mb-0"
            />
          </form>
          <div className="flex flex-row items-center">
            <button
              type="submit"
              className={`btn ml-4 ${isLoading ? 'btn-disabled' : 'btn-primary'}`}
              form="urlInputForm"
            >
              {isLoading ? (
                <div>
                  <span className="loading loading-spinner" />
                </div>
              ) : (
                <div>
                  <span>로그인</span>
                </div>
              )}
            </button>
            <button
              type="button"
              className={`btn ml-4 ${isLoading ? 'btn-disabled' : 'btn-outline'}`}
              onClick={goWithoutLogin}
            >
              로그인 없이 즐기기
            </button>
          </div>
        </div>
      </main>
      <footer className="w-full row-start-3 flex gap-6 flex-wrap items-center justify-end">
        <GithubRepoLink />
      </footer>
      <DialogModalOneButton
        title={'오류'}
        body={`로그인 오류가 발생했어요! ${errMessage}`}
        buttonText={'확인'}
        ref={errModalRef}
      />
    </div>
  );
}
