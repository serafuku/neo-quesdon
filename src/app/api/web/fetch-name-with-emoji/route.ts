import { fetchNameWithEmojiReqDto } from "@/app/_dto/fetch-name-with-emoji/fetch-name-with-emoji.dto";
import { validateStrict } from "@/utils/validator/strictValidator";
import { NextRequest, NextResponse } from "next/server";
import { sendErrorResponse } from "../../functions/web/errorResponse";
import detectInstance from "../../functions/web/detectInstance";

export async function POST(req: NextRequest) {
  let data;
  const body: fetchNameWithEmojiReqDto = await req.json();
  try {
    data = await validateStrict(fetchNameWithEmojiReqDto, body);
  } catch (err) {
    return sendErrorResponse(400, `${err}`);
  }

  const { name, baseUrl }: fetchNameWithEmojiReqDto = data;
  const usernameIndex: number[] = [];
  const usernameEmojiAddress: string[] = [];
  if (!name) {
    return NextResponse.json({ nameWithEmoji: [] });
  }
  const emojiInUsername = name
    .match(/:[\w]+:/g)
    ?.map((el) => el.replaceAll(":", ""));
  const nameArray = name.split(":").filter((el) => el !== "");

  const instanceType = await detectInstance(baseUrl);

  switch (instanceType) {
    case "mastodon":
      try {
        if (emojiInUsername && body.emojis) {
          for (let i = 0; i < emojiInUsername.length; i++) {
            usernameEmojiAddress.push(body.emojis[i].url);
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
        return NextResponse.json({ asdf: "asdf" }, { status: 500 });
      }

    case "misskey":
      try {
        if (emojiInUsername) {
          for (let i = 0; i < emojiInUsername.length; i++) {
            const emojiAddress = await fetch(`https://${baseUrl}/api/emoji`, {
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
        return NextResponse.json(
          { error: "Internal Server Error" },
          { status: 500 }
        );
      }

    case "cherrypick":
      try {
        if (emojiInUsername) {
          for (let i = 0; i < emojiInUsername.length; i++) {
            const emojiAddress = await fetch(`https://${baseUrl}/api/emoji`, {
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
        return NextResponse.json(
          { error: "Internal Server Error" },
          { status: 500 }
        );
      }

    default:
      console.log("there is no matching instance type");

      break;
  }
}
