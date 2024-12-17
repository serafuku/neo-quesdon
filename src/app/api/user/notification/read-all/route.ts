import { NotificationService } from '@/app/api/_service/notification/notification.service';
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const notificationService = NotificationService.getInstance();
  return await notificationService.readAllNotificationsApi(req);
}
