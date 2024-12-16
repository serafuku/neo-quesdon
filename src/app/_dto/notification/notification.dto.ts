import { AnswerWithProfileDto } from '@/app/_dto/answers/Answers.dto';

export type NotificationTypes = [{ notification_name: 'answer-on-my-question'; data: AnswerWithProfileDto }][number];

export class NotificationDto {
  unread_count: number;
  notifications: NotificationTypes[];
}
