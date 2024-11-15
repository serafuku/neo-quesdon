"use client";

import Answer from "@/app/_components/answer";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchAnswer } from "./action";
import { answer } from "@prisma/client";

export default function SingleAnswer() {
  const [answerBody, setAnswerBody] = useState<answer>();
  const { answer } = useParams() as { answer: string };

  useEffect(() => {
    fetchAnswer(answer).then((r) => setAnswerBody(r));
  }, [answer]);

  return (
    <div className="flex w-[90%] window:w-[80%] desktop:w-[70%]">
      {answerBody && <Answer value={answerBody} />}
    </div>
  );
}
