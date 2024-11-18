"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { FaUser } from "react-icons/fa";
import { userProfileWithCountDto } from "../_dto/fetch-profile/Profile.dto";

const fetchMyProfile = async () => {
  const user_handle = localStorage.getItem("user_handle");

  if (user_handle) {
    const res = await fetch("/api/db/fetch-my-profile", {
      method: "GET",
    });
    if (!res.ok) {
      if (res.status === 401) {
        document.getElementById("forceLogoutNoteModal")?.click();
      }
      return;
    }
    const data = await res.json();
    return data;
  }
};

const logout = async () => {
  await fetch("/api/web/logout");
  localStorage.removeItem("user_handle");
  window.location.replace("/");
};

export default function MainHeader() {
  const [user, setUser] = useState<userProfileWithCountDto>();

  useEffect(() => {
    fetchMyProfile().then((r) => setUser(r));
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
          className={`btn btn-ghost btn-circle avatar ${
            user?.questions && user?.questions > 0 && "online"
          }`}
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
                <Link href={"/"}>로그인</Link>
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
                <Link href={"/main/questions"}>미답변 질문</Link>
              </li>
              <li>
                <Link href={"/main/settings"}>설정</Link>
              </li>
              <li
                onClick={() => document.getElementById("logout_modal")?.click()}
              >
                <a>로그아웃</a>
              </li>
            </ul>
          </div>
        )}
      </div>
      <input type="checkbox" id="logout_modal" className="modal-toggle" />
      <div className="modal" role="dialog">
        <div className="modal-box">
          <h3 className="text-lg font-bold">로그아웃</h3>
          <p className="py-4">정말로 로그아웃 하시겠어요?</p>
          <div className="modal-action">
            <button
              className="btn btn-error"
              onClick={() => {
                document.getElementById("logout_modal")?.click();
                logout();
              }}
            >
              로그아웃
            </button>
            <button
              onClick={() => document.getElementById("logout_modal")?.click()}
              className="btn"
            >
              취소
            </button>
          </div>
        </div>
      </div>
      <input
        type="checkbox"
        id="forceLogoutNoteModal"
        className="modal-toggle"
      />
      <div className="modal" role="dialog">
        <div className="modal-box">
          <h3 className="py-4 text-2xl">
            로그인 유효시간이 만료되어서 로그아웃 되었어요!
          </h3>
          <div className="modal-action">
            <label
              htmlFor="forceLogoutNoteModal"
              className="btn btn-primary"
              onClick={logout}
            >
              홈으로 돌아가기
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
