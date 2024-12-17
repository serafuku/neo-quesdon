import { AnswerWithProfileDto } from '@/app/_dto/answers/Answers.dto';
import { NotificationPayloadTypes } from '@/app/_dto/notification/notification.dto';
import { RedisPubSubService } from '@/app/api/_service/redis-pubsub/redis-event.service';

export class NotificationService {
  private static instance: NotificationService;
  private redisPubSub: RedisPubSubService;
  private constructor() {
    this.redisPubSub = RedisPubSubService.getInstance();
  }
  public static getInstance() {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  public readAllNotifications(target_handle: string) {
    this.redisPubSub.pub<NotificationPayloadTypes>('websocket-notification-event', {
      notification_name: 'read-all-notifications',
      data: null,
      target: target_handle,
    });
  }

  public sendAnswerOnMyQuestionNotification(target_handle: string, data: AnswerWithProfileDto) {
    if (!target_handle) {
      return;
    }
    this.redisPubSub.pub<NotificationPayloadTypes>('websocket-notification-event', {
      notification_name: 'answer-on-my-question',
      data: data,
      target: target_handle,
    });
  }
}
