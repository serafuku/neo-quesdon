import {
  fetchNameWithEmojiReqDto,
  fetchNameWithEmojiResDto,
} from '@/app/_dto/fetch-name-with-emoji/fetch-name-with-emoji.dto';
import { Logger } from '@/utils/logger/Logger';

const logger = new Logger('fetchNameWithEmoji');
export async function fetchNameWithEmoji(fetchUserNameReq: fetchNameWithEmojiReqDto) {
  const res = await fetch(`${process.env.WEB_URL}/api/web/fetch-name-with-emoji`, {
    method: 'POST',
    body: JSON.stringify(fetchUserNameReq),
  });
  if (!res.ok) {
    logger.error(`fail to get username with emojis `, res.status, await res.text());
    throw new Error('fail to get username with emojis');
  }
  const body: fetchNameWithEmojiResDto = await res.json();
  const data: string[] = body.nameWithEmoji;
  return data;
}
