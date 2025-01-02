import { ApiErrorResponseDto } from '@/app/_dto/api-error/api-error.dto';
import { ApiErrorEv, ApiErrorEventValues } from '@/app/main/_events';

export async function onApiError(code: number, res: Response) {
  const errorRes = (await res.json()) as ApiErrorResponseDto;
  const modalValue: ApiErrorEventValues = {
    title: '오류',
    body: '',
    buttonText: '알겠어요',
    errorType: errorRes.error_type,
  };
  switch (errorRes.error_type) {
    case 'BAD_REQUEST':
      modalValue.body = '잘못된 요청이에요';
      break;
    case 'FORBIDDEN':
      modalValue.body = '금지된 요청이에요';
      break;
    case 'CAN_NOT_BLOCK_YOURSELF':
      modalValue.title = '차단 오류';
      modalValue.body = '자기 자신을 차단할 수 없어요!';
      break;
    case 'JWT_EXPIRED':
      modalValue.title = '로그인 만료';
      modalValue.body = '로그인이 만료 되었어요. 다시 로그인해 주세요.';
      break;
    case 'JWT_REVOKED':
      modalValue.title = '인증 해제됨';
      modalValue.body = '로그인이 해제 되었어요!';
      break;
    case 'MASTODON_ERROR':
      modalValue.title = '마스토돈 오류';
      modalValue.body = '마스토돈 서버에서 오류를 반환했어요';
      break;
    case 'MISSKEY_ERROR':
      modalValue.title = '미스키 오류';
      modalValue.body = '미스키 서버에서 오류를 반환했어요';
      break;
    case 'NOT_FOUND':
      modalValue.title = '어라라...?';
      modalValue.body = '찾을 수 없어요!';
      break;
    case 'USER_NOT_EXIST':
      modalValue.title = '어라라...?';
      modalValue.body = '사용자를 찾을 수 없었어요';
      break;
    case 'QUESTION_BLOCKED':
      modalValue.title = '차단됨';
      modalValue.body = '이 사용자에게 질문을 보낼 수 없어요!';
      break;
    case 'RATE_LIMITED':
      modalValue.title = '제한 초과';
      modalValue.body = '요청 제한을 초과했어요...! 잠시 후 다시 시도해 주세요.';
      break;
    case 'SERVER_ERROR':
      modalValue.title = '서버 오류';
      modalValue.body = `서버 오류가 발생했어요...: ${errorRes.message}`;
      break;
    case 'UNAUTHORIZED':
      modalValue.title = '인증 오류';
      modalValue.body = '인증에 실패했어요';
      break;
    case 'REMOTE_SERVER_UNKNOWN_ERROR':
      modalValue.title = '원격 서버 오류';
      modalValue.body = `원격 서버에서 알 수 없는 오류를 반환했어요: ${errorRes.message}`;
      break;
    case 'USER_NOT_ACCEPT_ANONYMOUS_QUESTION':
      modalValue.title = '익명 질문 거절';
      modalValue.body = '이 사용자는 익명 질문을 받지 않고 있어요!';
      break;
    case 'USER_NOT_ACCEPT_NEW_QUESTION':
      modalValue.title = '질문 거절';
      modalValue.body = '이 사용자는 질문을 받지 않고 있어요!';
      break;
    case 'REMOTE_ACCESS_TOKEN_REVOKED':
      modalValue.title = '인증 해제됨';
      modalValue.body = '마스토돈/미스키 서버에서 API토큰 인증이 해제 되었어요!';
      break;
    default:
      modalValue.title = '알 수 없는 오류';
      modalValue.body = `알 수 없는 오류가 발생했어요! ${errorRes.error_type}, ${errorRes.message}`;
  }
  ApiErrorEv.SendApiErrorEvent(modalValue);
}
