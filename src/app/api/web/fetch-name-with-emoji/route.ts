import { fetchNameWithEmojiReqDto, fetchNameWithEmojiResDto } from "@/app/_dto/fetch-name-with-emoji/fetch-name-with-emoji.dto";
import { NextRequest, NextResponse } from "next/server";


export async function POST(req: NextRequest): Promise<NextResponse<fetchNameWithEmojiResDto>> {
  const { name, misskeyBaseUrl }: fetchNameWithEmojiReqDto = await req.json();
  const usernameIndex: number[] = [];
  const usernameEmojiAddress: string[] = [];
  if (!name) {
    return NextResponse.json({ nameWithEmoji: []});
  }
  const emojiInUsername = name
    .match(/:[\w]+:/g)
    ?.map((el) => el.replaceAll(":", ""));
  const nameArray = name.split(":").filter((el) => el !== "");

  try {
    if (emojiInUsername) {
      for (let i = 0; i < emojiInUsername.length; i++) {
        const emojiAddress = await fetch(`${misskeyBaseUrl}/api/emoji`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: emojiInUsername[i],
          }),
        }).then((r) => r.json());

        usernameEmojiAddress.push(emojiAddress.url);
      }

      for (const el in nameArray) {
        usernameIndex.push(nameArray.indexOf(emojiInUsername[el]));
      }
      const filteredIndex = usernameIndex.filter((value) => value >= 0);

      for (let i = 0; i < usernameEmojiAddress.length; i++) {
        nameArray.splice(filteredIndex[i], 1, usernameEmojiAddress[i]);
      }
    }

    return NextResponse.json({ nameWithEmoji: nameArray });
  } catch (err) {
    console.log(err);
    throw (err);
  }
}
