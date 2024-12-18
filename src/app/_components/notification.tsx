'use client';

import { NotificationPayloadTypes } from '@/app/_dto/notification/notification.dto';
import { useContext, useEffect } from 'react';
import { NotificationContext } from '../main/layout';
import Link from 'next/link';

export default function Notification() {
  const notificationContext = useContext(NotificationContext);

  const parseNoti = (noti: NotificationPayloadTypes, i: number) => {
    const isRead = i + 1 > (notificationContext?.unread_count ?? 0) ? true : false;
    switch (noti.notification_name) {
      case 'answer_on_my_question': {
        return (
          <div key={noti.data?.id}>
            <Link href={`/main/user/${noti.data.answeredPersonHandle}/${noti.data.id}`} replace>
              <div
                className={`flex items-center gap-2 my-2 p-2 relative desktop:p-4 w-full rounded-box shadow ${isRead ? 'bg-gray-100 dark:bg-gray-700' : 'bg-base-100 dark:bg-slate-500'}`}
              >
                <img
                  src={noti.data?.answeredPerson?.avatarUrl}
                  alt="answered persen avatar"
                  className={`w-16 h-16 rounded-full ${isRead && 'opacity-70'}`}
                />
                <div className={`flex flex-col ${isRead && 'text-slate-500 dark:text-slate-400'}`}>
                  <span className="font-thin italic">&quot;{noti.data?.question}&quot;</span>
                  <p>{noti.data?.answer}</p>
                </div>
              </div>
            </Link>
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
      {notificationContext?.notifications && notificationContext.notifications.map((el, i) => parseNoti(el, i))}
    </div>
  );
}
