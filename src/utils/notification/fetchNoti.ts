import { NotificationDto } from '@/app/_dto/notification/notification.dto';

export async function fetchNoti(
  onResNotOk?: (code: number, res: Response) => void,
): Promise<NotificationDto | undefined> {
  const handle = localStorage.getItem('user_handle');
  if (!handle) {
    return;
  }
  const res = await fetch('/api/user/notification');
  if (!res.ok) {
    if (onResNotOk) {
      onResNotOk(res.status, res);
      return;
    } else {
      throw new Error(`Fail to fatch notifications! ${await res.text()}`);
    }
  }
  const data = (await res.json()) as NotificationDto;
  return data;
}
