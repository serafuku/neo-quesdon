import { AnswerWithProfileDto, AnswerListWithProfileDto } from '@/app/_dto/answers/Answers.dto';
import { FetchAllAnswersReqDto } from '@/app/_dto/answers/fetch-all-answers.dto';

export async function fetchAllAnswers(
  req: FetchAllAnswersReqDto,
  onResNotOk?: (code: number, res: Response) => void,
): Promise<AnswerWithProfileDto[]> {
  const query: string[] = [];
  for (const [key, value] of Object.entries(req)) {
    query.push(`${key}=${value}`);
  }
  const url = `/api/db/answers?${query.join('&')}`;
  const res = await fetch(url, {
    method: 'GET',
    cache: 'no-cache',
  });
  try {
    if (res.ok) {
      const answers = ((await res.json()) as AnswerListWithProfileDto).answersList;
      return answers;
    } else {
      if (onResNotOk) {
        onResNotOk(res.status, res);
        return [];
      }
      throw new Error(`답변을 불러오는데 실패했어요!: ${await res.text()}`);
    }
  } catch (err) {
    throw err;
  }
}
