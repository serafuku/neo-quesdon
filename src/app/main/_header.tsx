"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { FaUser } from "react-icons/fa";
import { authJwtToken } from "../api/functions/web/authJwtToken";
import { fetchCookies } from "./action";
import { profile } from "@prisma/client";

const fetchMyProfile = async () => {
  const cookie = await fetchCookies("jwtToken");

  if (cookie) {
    const user = await authJwtToken(cookie.value);
    const res = await fetch("/api/db/fetch-my-profile", {
      method: "POST",
      body: JSON.stringify(user.handle),
    }).then((r) => r.json());

    return res;
  }
};

const logout = async () => {
  await fetch("/api/web/logout");

  localStorage.clear();
  window.location.replace("/");
};

export default function MainHeader() {
  const [user, setUser] = useState<profile>();
  const dialogModal = useRef(null);

  useEffect(() => {
    fetchMyProfile().then((r) => setUser(r));
  }, []);

  return (
    <div className="navbar bg-base-100 w-[60%] shadow rounded-box my-4">
      <div className="flex-1">
        <Link href="/main" className="btn btn-ghost text-xl">
          Neo-Quesdon
        </Link>
      </div>
      <div className="dropdown dropdown-end">
        <div
          tabIndex={0}
          role="button"
          className="btn btn-ghost btn-circle avatar"
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
              <li onClick={() => dialogModal.current?.showModal()}>
                <a>로그아웃</a>
              </li>
            </ul>
          </div>
        )}
      </div>
      <dialog id="my_modal_3" className="modal" ref={dialogModal}>
        <div className="modal-box">
          <h3 className="font-bold text-lg">로그아웃</h3>
          <p className="py-4">정말로 로그아웃 하시겠어요?</p>
          <div className="flex justify-end gap-4 ">
            <button
              className="btn btn-error w-22"
              onClick={() => {
                dialogModal.current?.close();
                logout();
              }}
            >
              로그아웃
            </button>
            <form method="dialog">
              <button className="btn w-22">취소</button>
            </form>
          </div>
        </div>
      </dialog>
    </div>
  );
}
