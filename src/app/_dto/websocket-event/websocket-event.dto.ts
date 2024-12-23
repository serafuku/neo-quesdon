import { questionDto } from '@/app/_dto/questions/question.dto';
import { AnswerWithProfileDto } from '../answers/Answers.dto';
import { NotificationPayloadTypes } from '@/app/_dto/notification/notification.dto';

export const event_name_enum_arr = [
  'question-created-event',
  'question-deleted-event',
  'keep-alive',
  'answer-created-event',
  'answer-deleted-event',
  'websocket-notification-event',
] as const;

export type websocketEventNameType = (typeof event_name_enum_arr)[number];

export type WebsocketPayloadTypes =
  | QuestionCreatedPayload
  | QuestionDeletedPayload
  | AnswerCreatedPayload
  | AnswerDeletedEvPayload
  | NotificationPayloadTypes
  | string;

export class WebsocketEvent<T extends WebsocketPayloadTypes> {
  ev_name: websocketEventNameType;
  data: T;
}

export type QuestionCreatedPayload = questionDto & {
  question_numbers: number;
};
export class WebsocketQuestionCreatedEvent extends WebsocketEvent<QuestionCreatedPayload> {
  ev_name: 'question-created-event';
}

export type QuestionDeletedPayload = {
  deleted_id: number;
  handle: string;
  question_numbers: number;
};
export class WebsocketQuestionDeletedEvent extends WebsocketEvent<QuestionDeletedPayload> {
  ev_name: 'question-deleted-event';
}

export class WebsocketKeepAliveEvent extends WebsocketEvent<string> {
  ev_name: 'keep-alive';
}

export class AnswerCreatedPayload extends AnswerWithProfileDto {
  hideFromMain: boolean;
}
export class WebsocketAnswerCreatedEvent extends WebsocketEvent<AnswerCreatedPayload> {
  ev_name: 'answer-created-event';
}

export type AnswerDeletedEvPayload = {
  deleted_id: string;
};
export class WebsocketAnswerDeletedEvent extends WebsocketEvent<AnswerDeletedEvPayload> {
  ev_name: 'answer-deleted-event';
}

export class WebsocketNotificationEvent extends WebsocketEvent<NotificationPayloadTypes> {
  ev_name: 'websocket-notification-event';
}
