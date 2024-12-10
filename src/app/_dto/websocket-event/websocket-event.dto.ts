import { questionDto } from '@/app/_dto/question/question.dto';

export const event_name_enum_arr = ['question-created-event', 'question-deleted-event', 'keep-alive'] as const;
export type websocketEventNameType = (typeof event_name_enum_arr)[number];
export class WebsocketEventPayload<T> {
  ev_name: websocketEventNameType;
  data: T;
}

export type QuestionCreatedPayload = questionDto & {
  question_numbers: number;
};
export class WebsocketQuestionCreatedEvent extends WebsocketEventPayload<QuestionCreatedPayload> {
  ev_name: 'question-created-event';
}

export type QuestionDeletedPayload = {
  deleted_id: number;
  handle: string;
  question_numbers: number;
};
export class WebsocketQuestionDeletedEvent extends WebsocketEventPayload<QuestionDeletedPayload> {
  ev_name: 'question-deleted-event';
}

export class WebsocketKeepAliveEvent extends WebsocketEventPayload<string> {
  ev_name: 'keep-alive';
}
