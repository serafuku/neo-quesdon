import { fetchNameWithEmojiReqDto, fetchNameWithEmojiResDto } from "@/app/_dto/fetch-name-with-emoji/fetch-name-with-emoji.dto";

export async function fetchNameWithEmoji(fetchUserNameReq: fetchNameWithEmojiReqDto) {
  const res = await fetch(`${process.env.WEB_URL}/api/web/fetch-name-with-emoji`, {
    method: "POST",
    body: JSON.stringify(fetchUserNameReq),
  });
  if (!res.ok) {
    console.error(`fail to get username with emojis `, res.status, res.statusText);
    throw new Error('fail to get username with emojis');
  }
  const body: fetchNameWithEmojiResDto = await res.json();
  const data: string[] = body.nameWithEmoji;
  return data;
}
