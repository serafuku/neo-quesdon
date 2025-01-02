import { Metadata } from 'next';
import SingleAnswer from './answer';
import { AnswerWithProfileDto } from '@/app/_dto/answers/Answers.dto';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string; answer: string }>;
}): Promise<Metadata> {
  const { handle, answer } = await params;
  const profileHandle = decodeURIComponent(handle);

  const answerBody = (await fetchAnswer(profileHandle, answer)) as AnswerWithProfileDto;

  if (!answerBody) {
    return {};
  }
  return {
    title: answerBody.question,
    openGraph: {
      title: `Q. ${answerBody.question}`,
      description: `A. ${answerBody.answer}`,
      images: answerBody.answeredPerson?.avatarUrl,
    },
  };
}

async function fetchAnswer(userHandle: string, id: string): Promise<AnswerWithProfileDto | undefined> {
  const url = process.env.WEB_URL;
  const res = await fetch(`${url}/api/db/answers/${userHandle}/${id}`, {
    method: 'GET',
  });
  if (res.status === 404) {
    return undefined;
  } else if (!res.ok) {
    throw new Error(`Fail to fetch answer! ${await res.text()}`);
  }
  return await res.json();
}

export default async function singleAnswerWrapper({ params }: { params: Promise<{ handle: string; answer: string }> }) {
  const { handle, answer } = await params;
  const profileHandle = decodeURIComponent(handle);

  const answerBody = await fetchAnswer(profileHandle, answer);

  if (!answerBody) {
    return notFound();
  }
  return (
    <>
      <SingleAnswer answerBody={answerBody} />
    </>
  );
}
