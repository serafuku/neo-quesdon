import { NotificationService } from '@/app/api/_service/notification/notification.service';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const notificationService = NotificationService.getInstance();
  return await notificationService.getMyNotificationsApi(req);
}

export async function DELETE(req: NextRequest) {
  const notificationService = NotificationService.getInstance();
  return await notificationService.deleteAllNotificationApi(req);
}