import { AnswerWithProfileDto } from '@/app/_dto/answers/Answers.dto';

export type NotificationPayloadTypes = [
  { notification_name: 'answer-on-my-question'; data: AnswerWithProfileDto; target: string },
  { notification_name: 'read-all-notifications'; data: null; target: string },
][number];

export class NotificationDto {
  unread_count: number;
  notifications: NotificationPayloadTypes[];
}
