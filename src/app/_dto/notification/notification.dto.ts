import { AnswerWithProfileDto } from '@/app/_dto/answers/Answers.dto';

export type NotificationPayloadTypes = [
  { notification_name: 'answer-on-my-question'; data: AnswerWithProfileDto; target: string },
][number];

export class NotificationDto {
  unread_count: number;
  notifications: NotificationPayloadTypes[];
}
