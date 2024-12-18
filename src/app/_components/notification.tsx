'use client';

import { NotificationPayloadTypes } from '@/app/_dto/notification/notification.dto';
import { useContext, useEffect } from 'react';
import { NotificationContext } from '../main/layout';

export default function Notification() {
  const notificationContext = useContext(NotificationContext);

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

  useEffect(() => {
    //3초 이상 알림을 읽고 있으면 자동으로 읽음 처리
    const timestamp = Date.now();

    return () => {
      if (Date.now() - timestamp > 1000 * 3) {
        fetch('/api/user/notification/read-all', {
          method: 'POST',
        });
      }
    };
  }, []);

  return (
    <div className="overflow-y-scroll">
      <h2 className="text-3xl desktop:text-4xl font-semibold">
        {notificationContext && notificationContext.unread_count}개의 새로운 알림
      </h2>
      {notificationContext?.notifications && notificationContext.notifications.map((el) => parseNoti(el))}
    </div>
  );
}
