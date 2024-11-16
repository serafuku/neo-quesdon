import { Transform } from "class-transformer";
import { IsNotEmpty, IsString } from "class-validator";

export class loginReqDto {
  @Transform((param) => {
    // https://example.com/ 같은 형식으로 온 경우 Host 형식으로 변환
    if (typeof param.value === 'string') {
      const v = param.value;
      const re = /\/\/[^/@\s]+(:[0-9]{1,5})?\/?/;
      const matched_str = v.match(re)?.[0];
      if (matched_str) {
        console.log(`URL ${param.value} replaced with ${matched_str.replaceAll('/', '')}`);
        return matched_str.replaceAll('/', '');
      }
      return v;
    }
  })
  @IsString()
  @IsNotEmpty()
  misskeyHost: string;
}