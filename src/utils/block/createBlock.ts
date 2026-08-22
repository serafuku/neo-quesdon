import { createBlockByQuestionDto } from '@/app/_dto/blocking/blocking.dto';
import { BlockEv } from '@/app/main/_events';

export async function createBlock(id: number, onResNotOk?: (code: number, res: Response) => void) {
  const body: createBlockByQuestionDto = {
    questionId: id,
  };
  const res = await fetch(`/api/user/blocking/create-by-question`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    if (onResNotOk) {
      onResNotOk(res.status, res);
    }
    return;
  }
  BlockEv.sendBlockUpdatedEvent();
}
