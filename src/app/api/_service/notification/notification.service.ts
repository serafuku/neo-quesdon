import { AnswerWithProfileDto } from '@/app/_dto/answers/Answers.dto';
import { NotificationDto, NotificationPayloadTypes } from '@/app/_dto/notification/notification.dto';
import { RateLimit } from '@/app/api/_service/ratelimiter/decorator';
import { RedisPubSubService } from '@/app/api/_service/redis-pubsub/redis-event.service';
import { sendApiError } from '@/app/api/_utils/apiErrorResponse/sendApiError';
import { GetPrismaClient } from '@/app/api/_utils/getPrismaClient/get-prisma-client';
import { Auth, JwtPayload } from '@/app/api/_utils/jwt/decorator';
import type { jwtPayloadType } from '@/app/api/_utils/jwt/jwtPayloadType';
import { Logger } from '@/utils/logger/Logger';
import { Prisma, PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

export class NotificationService {
  private static instance: NotificationService;
  private redisPubSub: RedisPubSubService;
  private prisma: PrismaClient;
  private logger = new Logger('NotificationService');
  private constructor() {
    this.redisPubSub = RedisPubSubService.getInstance();
    this.prisma = GetPrismaClient.getClient();
  }
  public static getInstance() {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private async cleanUpOldNotifications(handle: string) {
    const notificationIds = await this.prisma.notification.findMany({
      where: { userHandle: handle },
      select: { id: true },
      orderBy: { createdAt: 'desc' },
    });
    if (notificationIds.length > 200) {
      const deleteTargets = notificationIds.slice(200);
      deleteTargets.forEach(async (t) => {
        await this.prisma.notification.delete({ where: { id: t.id } });
      });
    }
  }
  public async readAllNotifications(handle: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userHandle: handle, read: false },
      data: { read: true },
    });
    this.redisPubSub.pub<NotificationPayloadTypes>('websocket-notification-event', {
      notification_name: 'read_all_notifications',
      data: null,
      target: handle,
    });
    return result.count;
  }

  public async AnswerOnMyQuestionNotification(target_handle: string, data: AnswerWithProfileDto) {
    if (!target_handle) {
      return;
    }
    this.redisPubSub.pub<NotificationPayloadTypes>('websocket-notification-event', {
      notification_name: 'answer_on_my_question',
      data: data,
      target: target_handle,
    });
    await this.prisma.notification.create({
      data: {
        notiType: 'answer_on_my_question',
        data: JSON.stringify(data),
        userHandle: target_handle,
      },
    });
    await this.cleanUpOldNotifications(target_handle);
  }

  @Auth()
  @RateLimit({ bucket_time: 60, req_limit: 120 }, 'user')
  public async getMyNotificationsApi(
    _req: NextRequest,
    @JwtPayload tokenPayload?: jwtPayloadType,
  ): Promise<NextResponse> {
    if (!tokenPayload) {
      return sendApiError(401, '');
    }
    try {
      const notifications = await this.prisma.notification.findMany({
        where: { userHandle: tokenPayload.handle },
        orderBy: { createdAt: 'desc' },
      });
      const unread_count = await this.prisma.notification.count({
        where: { userHandle: tokenPayload.handle, read: false },
      });
      const notificationArray = notifications.map((v) => {
        const data = JSON.parse(v.data);
        return {
          notification_name: v.notiType,
          target: v.userHandle,
          data: data,
        };
      });
      const dto: NotificationDto = {
        unread_count: unread_count,
        notifications: notificationArray,
      };

      return NextResponse.json(dto, {
        headers: { 'Content-type': 'application/json', 'Cache-Control': 'private, no-store, max-age=0' },
      });
    } catch (err) {
      this.logger.warn('getMyNotificationsApi Error!', err);
      return sendApiError(500, 'getMyNotificationsApi Error!');
    }
  }

  @Auth()
  @RateLimit({ bucket_time: 60, req_limit: 120 }, 'user')
  public async readAllNotificationsApi(
    _req: NextRequest,
    @JwtPayload tokenPayload?: jwtPayloadType,
  ): Promise<NextResponse> {
    const handle = tokenPayload?.handle;
    if (!handle) {
      return sendApiError(401, 'unauthorized');
    }
    try {
      const count = await this.readAllNotifications(handle);
      return NextResponse.json({ message: `OK! ${count} notifications read` });
    } catch (err) {
      this.logger.warn('readAllNotificationsApi FAIL!', err);
      return sendApiError(500, 'readAllNotificationsApi FAIL!');
    }
  }
}
