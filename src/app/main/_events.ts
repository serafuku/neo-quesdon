import { Logger } from '@/utils/logger/Logger';
import { questionDto } from '../_dto/questions/question.dto';
import { QuestionDeletedPayload } from '../_dto/websocket-event/websocket-event.dto';
import { AnswerWithProfileDto } from '../_dto/answers/Answers.dto';
import { NotificationPayloadTypes } from '../_dto/notification/notification.dto';

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
const WebSocketAnswerEvent = 'WebSocketAnswerEvent';
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

  static addCreatedAnswerEventListener(onEvent: (ev: CustomEvent<AnswerWithProfileDto>) => void) {
    AnswerEv.logger.debug('Added WebSocket Answer EventListener');
    window.addEventListener(WebSocketAnswerEvent, onEvent as EventListener);
  }

  static removeCreatedAnswerEventListener(onEvent: (ev: CustomEvent<AnswerWithProfileDto>) => void) {
    AnswerEv.logger.debug('Removed WebSocket Answer EventListener');
    window.removeEventListener(WebSocketAnswerEvent, onEvent as EventListener);
  }

  static sendCreatedAnswerEvent(data: AnswerWithProfileDto) {
    const ev = new CustomEvent<AnswerWithProfileDto>(WebSocketAnswerEvent, { detail: data });
    window.dispatchEvent(ev);
    AnswerEv.logger.debug('New Answer Created', data);
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
