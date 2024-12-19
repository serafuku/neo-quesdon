import { AnswerWithProfileDto } from '@/app/_dto/answers/Answers.dto';

export type NotificationPayloadTypes = [
  { notification_name: 'answer_on_my_question'; data: AnswerWithProfileDto; target: string },
  { notification_name: 'read_all_notifications'; data: null; target: string },
  { notification_name: 'delete_all_notifications'; data: null; target: string },
][number];

export class NotificationDto {
  unread_count: number;
  notifications: NotificationPayloadTypes[];
}
