'use client';

import { NotificationDto, NotificationPayloadTypes } from '@/app/_dto/notification/notification.dto';
import { useCallback, useEffect, useState } from 'react';
import { NotificationEv } from '../main/_events';

export default function Notification() {
  const [noti, setNoti] = useState<NotificationDto | null>(null);

  const fetchNoti = useCallback(async () => {
    const res = await fetch('/api/user/notification');
    if (!res.ok) alert(await res.text());
    const data = (await res.json()) as NotificationDto;
    setNoti(data);
  }, []);

  const parseNoti = (noti: NotificationPayloadTypes) => {
    switch (noti.notification_name) {
      case 'answer_on_my_question': {
        return (
          <div
            key={noti.data?.id}
            className="flex items-center gap-2 my-2 p-2 desktop:p-4 w-full rounded-box glass shadow"
          >
            <img
              src={noti.data?.answeredPerson?.avatarUrl}
              alt="answered persen avatar"
              className="w-16 h-16 rounded-full"
            />
            <div className="flex flex-col">
              <span className="font-thin italic">&quot;{noti.data?.question}&quot;</span>
              <p>{noti.data?.answer}</p>
            </div>
          </div>
        );
      }
      default:
        break;
    }
  };

  const onNotiEv = (ev: CustomEvent<NotificationPayloadTypes>) => {
    console.log(ev.detail);
  };

  useEffect(() => {
    NotificationEv.addNotificationEventListener(onNotiEv);

    return () => {
      NotificationEv.removeNotificationEventListener(onNotiEv);
    };
  }, []);

  useEffect(() => {
    fetchNoti();
  }, [fetchNoti]);

  return (
    <div className="overflow-y-scroll">
      <h2 className="text-3xl desktop:text-4xl font-semibold">{noti && noti.unread_count}개의 새로운 알림</h2>
      {noti && noti.notifications.map((el) => parseNoti(el))}
    </div>
  );
}
