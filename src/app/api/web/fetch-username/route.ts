import { NextRequest, NextResponse } from "next/server";

export type payload = {
  username: string;
  host: string;
};

export async function POST(req: NextRequest) {
  const { username, host }: payload = await req.json();
  const usernameIndex: number[] = [];
  const usernameEmojiAddress: string[] = [];

  const emojiInUsername = username
    .match(/:[\w]+:/g)
    ?.map((el) => el.replaceAll(":", ""));
  const usernameArray = username.split(":").filter((el) => el !== "");

  try {
    if (emojiInUsername) {
      for (let i = 0; i < emojiInUsername.length; i++) {
        const emojiAddress = await fetch(`${host}/api/emoji`, {
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

      for (const el in usernameArray) {
        usernameIndex.push(usernameArray.indexOf(emojiInUsername[el]));
      }
      const filteredIndex = usernameIndex.filter((value) => value >= 0);

      for (let i = 0; i < usernameEmojiAddress.length; i++) {
        usernameArray.splice(filteredIndex[i], 1, usernameEmojiAddress[i]);
      }
    }

    return NextResponse.json({ username: usernameArray });
  } catch (err) {
    console.log(err);

    return NextResponse.json({ err: err });
  }
}
