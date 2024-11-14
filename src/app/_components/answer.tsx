"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchUser } from "./action";
import { profile } from "@prisma/client";
import NameComponents from "./NameComponents";
import { AnswerDto } from "../_dto/fetch-all-answers/Answers.dto";

interface askProps {
  value: AnswerDto;
}

export default function Answer({ value }: askProps) {
  const [showNsfw, setShowNsfw] = useState(false);
  const [userInfo, setUserInfo] = useState<profile>();

  useEffect(() => {
    fetchUser(value.answeredPersonHandle).then((r) => setUserInfo(r));
    setShowNsfw(!value.nsfwedAnswer);
  }, []);

  return (
    <div className="w-full glass rounded-box p-4 mb-2 shadow">
      {!showNsfw && (
        <div className="fixed top-0 left-0 z-10 gap-2 w-full h-full flex flex-col justify-center items-center">
          <span>답변자가 NSFW로 체크한 질문이에요!</span>
          <button className="btn" onClick={() => setShowNsfw(!showNsfw)}>
            질문 보기
          </button>
        </div>
      )}

      <div className={`${!showNsfw && "blur"}`}>
        <div className="text-2xl chat chat-start">
          <div className="chat-header">
            {value.questioner ? value.questioner : "익명의 질문자"}
          </div>
          <Link
            href={`/main/user/${value.answeredPersonHandle}/${value.id}`}
            className="chat-bubble"
          >
            {value.question}
          </Link>
        </div>
        <div className="text-2xl chat chat-end">
          <div className="chat-image avatar">
            <div className="w-12 rounded-full">
              <img src={userInfo?.avatarUrl} alt="answered person avatar" />
            </div>
          </div>
          <div className="chat-header text-blue-500">
            <Link href={`/main/user/${value.answeredPersonHandle}`}>
              <NameComponents
                username={userInfo?.name}
                width={16}
                height={16}
              />
            </Link>
          </div>
          <div className="chat-bubble bg-green-700">{value.answer}</div>
          <div className="chat-footer font-thin text-xs">
            {value.answeredAt.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}
