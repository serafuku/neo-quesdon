import { Logger } from '@/utils/logger/Logger';
import { questionDto } from '../_dto/questions/question.dto';
import {
  AnswerCreatedPayload,
  AnswerDeletedEvPayload,
  QuestionDeletedPayload,
} from '../_dto/websocket-event/websocket-event.dto';
import { NotificationPayloadTypes } from '../_dto/notification/notification.dto';
import { userProfileMeDto } from '@/app/_dto/fetch-profile/Profile.dto';
import { ApiErrorTypes } from '../_dto/api-error/apiErrorTypes';

const QuestionCreateEvent = 'QuestionCreateEvent';
const QuestionDeleteEvent = 'QuestionDeleteEvent';
type QuestionCreateEvent = typeof QuestionCreateEvent;
type QuestionDeleteEvent = typeof QuestionDeleteEvent;

export class MyQuestionEv {
  private constructor() {}
  private static logger = new Logger('updateNewQuestionEvent', { noColor: true });
  static async SendUpdateReq(data: questionDto) {
    const ev = new CustomEvent<questionDto>(QuestionCreateEvent, { bubbles: true, detail: data });
    window.dispatchEvent(ev);
    MyQuestionEv.logger.debug('Sending New Question...');
  }

  static async SendDeleteReq(data: QuestionDeletedPayload) {
    const ev = new CustomEvent<QuestionDeletedPayload>(QuestionDeleteEvent, { bubbles: true, detail: data });
    window.dispatchEvent(ev);
    MyQuestionEv.logger.debug('Deleting Question...');
  }

  static addCreatedEventListener(onEvent: (ev: CustomEvent<questionDto>) => void) {
    MyQuestionEv.logger.debug('add New Question Update Eventlistener');
    window.addEventListener(QuestionCreateEvent, onEvent as EventListener);
  }

  static addDeletedEventListner(onEvent: (ev: CustomEvent<QuestionDeletedPayload>) => void) {
    MyQuestionEv.logger.debug('delete Question Update Eventlistener');
    window.addEventListener(QuestionDeleteEvent, onEvent as EventListener);
  }

  static removeCreatedEventListener(onEvent: (ev: CustomEvent<questionDto>) => void) {
    MyQuestionEv.logger.debug('Remove New Question Update Eventlistener');
    window.removeEventListener(QuestionCreateEvent, onEvent as EventListener);
  }

  static removeDeletedEventListener(onEvent: (ev: CustomEvent<QuestionDeletedPayload>) => void) {
    MyQuestionEv.logger.debug('Remove New Question Update Eventlistener');
    window.removeEventListener(QuestionDeleteEvent, onEvent as EventListener);
  }
}

const FetchMoreAnswerRequestEvent = 'FetchMoreAnswerRequestEvent';
const WebSocketAnswerCreatedEvent = 'WebSocketAnswerCreatedEvent';
const WebSocketAnswerDeletedEvent = 'WebSocketAnswerDeletedEvent';
export class AnswerEv {
  private static logger = new Logger('AnswerEv', { noColor: true });
  static addFetchMoreRequestEventListener(onEvent: (ev: CustomEvent<string | undefined>) => void) {
    AnswerEv.logger.debug('addFetchMoreRequestEventListener');
    window.addEventListener(FetchMoreAnswerRequestEvent, onEvent as EventListener);
  }
  static removeFetchMoreRequestEventListener(onEvent: (ev: CustomEvent<string | undefined>) => void) {
    AnswerEv.logger.debug('removeFetchMoreRequestEventListener');
    window.removeEventListener(FetchMoreAnswerRequestEvent, onEvent as EventListener);
  }
  static sendFetchMoreRequestEvent(untilId: string | undefined) {
    AnswerEv.logger.debug('Send Event');
    const ev = new CustomEvent<string | undefined>(FetchMoreAnswerRequestEvent, { detail: untilId });
    window.dispatchEvent(ev);
  }

  static addAnswerCreatedEventListener(onEvent: (ev: CustomEvent<AnswerCreatedPayload>) => void) {
    AnswerEv.logger.debug('Added WebSocket AnswerCreated EventListener');
    window.addEventListener(WebSocketAnswerCreatedEvent, onEvent as EventListener);
  }

  static removeAnswerCreatedEventListener(onEvent: (ev: CustomEvent<AnswerCreatedPayload>) => void) {
    AnswerEv.logger.debug('Removed WebSocket AnswerCreated EventListener');
    window.removeEventListener(WebSocketAnswerCreatedEvent, onEvent as EventListener);
  }

  static sendAnswerCreatedEvent(data: AnswerCreatedPayload) {
    const ev = new CustomEvent<AnswerCreatedPayload>(WebSocketAnswerCreatedEvent, { detail: data });
    window.dispatchEvent(ev);
    AnswerEv.logger.debug('New Answer Created', data);
  }

  static addAnswerDeletedEventListener(onEvent: (ev: CustomEvent<AnswerDeletedEvPayload>) => void) {
    AnswerEv.logger.debug('Added WebSocket AnswerDeleted EventListener');
    window.addEventListener(WebSocketAnswerDeletedEvent, onEvent as EventListener);
  }
  static removeAnswerDeletedEventListener(onEvent: (ev: CustomEvent<AnswerDeletedEvPayload>) => void) {
    AnswerEv.logger.debug('Removed WebSocket AnswerDeleted EventListener');
    window.removeEventListener(WebSocketAnswerDeletedEvent, onEvent as EventListener);
  }
  static sendAnswerDeletedEvent(data: AnswerDeletedEvPayload) {
    const ev = new CustomEvent<AnswerDeletedEvPayload>(WebSocketAnswerDeletedEvent, { detail: data });
    AnswerEv.logger.debug('Answer Deleted', data);
    window.dispatchEvent(ev);
  }
}

const NotificationEvent = 'NotificationEvent';
export class NotificationEv {
  private static logger = new Logger('NotificationEv', { noColor: true });
  static addNotificationEventListener(onEvent: (ev: CustomEvent<NotificationPayloadTypes>) => void) {
    NotificationEv.logger.debug('Notification Event Listener Added');
    window.addEventListener(NotificationEvent, onEvent as EventListener);
  }

  static removeNotificationEventListener(onEvent: (ev: CustomEvent<NotificationPayloadTypes>) => void) {
    NotificationEv.logger.debug('Notification Event Listener Deleted');
    window.removeEventListener(NotificationEvent, onEvent as EventListener);
  }

  static sendNotificationEvent(data: NotificationPayloadTypes) {
    const ev = new CustomEvent<NotificationPayloadTypes>(NotificationEvent, { detail: data });
    window.dispatchEvent(ev);
    NotificationEv.logger.debug('Notification Event Sent', data);
  }
}

const ProfileUpdateReqEvent = 'ProfileUpdateReqEvent';
type ProfileUpdateReqEvent = typeof ProfileUpdateReqEvent;
type ProfileUpdateReqData = Partial<userProfileMeDto>;
/**
 * MyProfileContext 의 Update요청 Event들
 */
export class MyProfileEv {
  private constructor() {}
  private static logger = new Logger('UpdateMyProfileContext', { noColor: true });
  static async SendUpdateReq(data: Partial<userProfileMeDto>) {
    const ev = new CustomEvent<ProfileUpdateReqData>(ProfileUpdateReqEvent, { bubbles: true, detail: data });
    window.dispatchEvent(ev);
    MyProfileEv.logger.debug('Send My Profile Update Request Event...');
  }

  static addEventListener(onEvent: (ev: CustomEvent<ProfileUpdateReqData>) => void) {
    MyProfileEv.logger.debug('add Profile Update EventListener');
    window.addEventListener(ProfileUpdateReqEvent, onEvent as EventListener);
  }

  static removeEventListener(onEvent: (ev: CustomEvent<ProfileUpdateReqData>) => void) {
    MyProfileEv.logger.debug('Remove Profile Update Req EventListener');
    window.removeEventListener(ProfileUpdateReqEvent, onEvent as EventListener);
  }
}

export type ApiErrorEventValues = { title: string; body: string; buttonText: string; errorType: ApiErrorTypes };
const ApiErrorEvent = 'ApiErrorEvent';
export class ApiErrorEv {
  private constructor() {}
  static async SendApiErrorEvent(data: ApiErrorEventValues) {
    const ev = new CustomEvent<ApiErrorEventValues>(ApiErrorEvent, { bubbles: true, detail: data });
    window.dispatchEvent(ev);
  }
  static addEventListener(onEvent: (ev: CustomEvent<ApiErrorEventValues>) => void) {
    window.addEventListener(ApiErrorEvent, onEvent as EventListener);
  }
  static removeEventListener(onEvent: (ev: CustomEvent<ApiErrorEventValues>) => void) {
    window.removeEventListener(ApiErrorEvent, onEvent as EventListener);
  }
}
