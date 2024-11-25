'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { FaUser } from 'react-icons/fa';
import { userProfileMeDto } from '../_dto/fetch-profile/Profile.dto';
import DialogModalTwoButton from '../_components/modalTwoButton';
import DialogModalOneButton from '../_components/modalOneButton';
import { refreshJwt } from '@/utils/refreshJwt/refresh-jwt-token';
import { logout } from '@/utils/logout/logout';

export default function MainHeader() {
  const [user, setUser] = useState<userProfileMeDto>();
  const logoutModalRef = useRef<HTMLDialogElement>(null);
  const forcedLogoutModalRef = useRef<HTMLDialogElement>(null);

  const fetchMyProfile = async () => {
    const user_handle = localStorage.getItem('user_handle');

    if (user_handle) {
      const res = await fetch('/api/db/fetch-my-profile', {
        method: 'GET',
      });
      if (!res.ok) {
        if (res.status === 401) {
          forcedLogoutModalRef.current?.showModal();
        }
        return;
      }
      const data = await res.json();
      return data;
    }
  };

  useEffect(() => {
    fetchMyProfile().then((r) => setUser(r));
  }, []);

  useEffect(() => {
    const fn = async () => {
      const now = Math.ceil(Date.now() / 1000);
      // JWT 리프레시로부터 1시간이 지난 경우 refresh 시도
      const last_token_refresh = Number.parseInt(localStorage.getItem('last_token_refresh') ?? '0');
      if (now - last_token_refresh > 3600) {
        await refreshJwt();
      }
    };
    fn();
  }, []);
  return (
    <div className="w-[90%] window:w-[80%] desktop:w-[70%] navbar bg-base-100 shadow rounded-box my-4">
      <div className="flex-1">
        <Link href="/main" className="btn btn-ghost text-xl">
          Neo-Quesdon
        </Link>
      </div>
      <div className="dropdown dropdown-end">
        <div
          tabIndex={0}
          role="button"
          className={`btn btn-ghost btn-circle avatar ${user?.questions && user?.questions > 0 && 'online'}`}
        >
          <div className="w-10 rounded-full">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="navbar avatar profile" />
            ) : (
              <div className="w-10 h-10 flex justify-center items-center text-3xl">
                <FaUser />
              </div>
            )}
          </div>
        </div>
        {user === undefined ? (
          <div>
            <ul
              tabIndex={0}
              className="menu menu-sm dropdown-content bg-base-100 rounded-box z-10 mt-3 w-52 p-2 shadow"
            >
              <li>
                <Link href={'/'}>로그인</Link>
              </li>
            </ul>
          </div>
        ) : (
          <div>
            <ul
              tabIndex={0}
              className="menu menu-sm dropdown-content bg-base-100 rounded-box z-10 mt-3 w-52 p-2 shadow"
            >
              <li>
                <Link href={`/main/user/${user?.handle}`}>마이페이지</Link>
              </li>
              <li>
                <Link href={'/main/questions'}>미답변 질문</Link>
              </li>
              <li>
                <Link href={'/main/settings'}>설정</Link>
              </li>
              <li onClick={() => logoutModalRef.current?.showModal()}>
                <a>로그아웃</a>
              </li>
            </ul>
          </div>
        )}
      </div>
      <DialogModalTwoButton
        title={'로그아웃'}
        body={'정말로 로그아웃 하시겠어요?'}
        confirmButtonText={'로그아웃'}
        cancelButtonText={'취소'}
        ref={logoutModalRef}
        onClick={logout}
      />
      <DialogModalOneButton
        title={'자동 로그아웃'}
        body={'로그인 유효시간이 만료되어서 로그아웃 되었어요!'}
        buttonText={'확인'}
        ref={forcedLogoutModalRef}
        onClick={logout}
      />
    </div>
  );
}
