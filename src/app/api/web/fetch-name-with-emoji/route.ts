import { fetchNameWithEmojiReqDto } from '@/app/_dto/fetch-name-with-emoji/fetch-name-with-emoji.dto';
import { validateStrict } from '@/utils/validator/strictValidator';
import { NextRequest, NextResponse } from 'next/server';
import detectInstance from '@/utils/detectInstance/detectInstance';
import { Logger } from '@/utils/logger/Logger';
import { sendApiError } from '@/api/_utils/apiErrorResponse/sendApiError';

const logger = new Logger('fetch-name-with-emoji');
export async function POST(req: NextRequest) {
  let data;
  try {
    data = await validateStrict(fetchNameWithEmojiReqDto, await req.json());
  } catch (err) {
    return sendApiError(400, `${err}`, 'BAD_REQUEST');
  }

  const { name, baseUrl }: fetchNameWithEmojiReqDto = data;
  const usernameIndex: number[] = [];
  const usernameEmojiAddress: string[] = [];
  if (!name) {
    return NextResponse.json({ nameWithEmoji: [] });
  }
  const emojiInUsername = name.match(/:[\w]+:/g)?.map((el) => el.replaceAll(':', ''));
  let nameArray = name.split(':').filter((el) => el !== '');

  const instanceType = await detectInstance(baseUrl);

  switch (instanceType) {
    case 'mastodon':
      try {
        if (emojiInUsername && data.emojis !== null) {
          const emojis = data.emojis;
          const newNameArray = nameArray.map((v) => {
            const matched_emoji_url = emojis.find((emoji) => emoji.shortcode === v)?.url;
            if (matched_emoji_url) {
              return matched_emoji_url;
            } else {
              return v;
            }
          });
          nameArray = newNameArray;
        }
        return NextResponse.json({ nameWithEmoji: nameArray });
      } catch (err) {
        return NextResponse.json(err, { status: 500 });
      }

    case 'misskey':
    case 'cherrypick':
      try {
        if (emojiInUsername) {
          for (let i = 0; i < emojiInUsername.length; i++) {
            try {
              const emojiAddress = await fetch(`https://${baseUrl}/emojis/${emojiInUsername[i]}`).then((r) => r.json());
  
              usernameEmojiAddress.push(emojiAddress.icon.url);
            } catch {
              console.error(`emoji ${emojiInUsername[i]} not found in instance ${baseUrl}`);
            }
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
        logger.warn(err);
        return NextResponse.json({ nameWithEmoji: [name] });
      }

    default:
      logger.warn('there is no matching instance type');

      break;
  }
}
