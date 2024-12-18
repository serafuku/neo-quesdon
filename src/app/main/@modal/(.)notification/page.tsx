'use client';

import Notification from '@/app/_components/notification';
import { useRouter } from 'next/navigation';
import { FaXmark } from 'react-icons/fa6';

export default function Page() {
  const router = useRouter();
  return (
    <div className="w-screen h-screen flex flex-col items-center absolute top-0 left-0 z-[1] bg-slate-100/10 dark:bg-slate-800/10 backdrop-blur-sm no-doc-scroll">
      <div className="w-[90%] window:w-[70%] desktop:w-[50%] h-[calc(100vh-5rem)] absolute top-10 bg-base-100 rounded-box shadow p-2 desktop:p-6 overflow-y-scroll">
        <FaXmark className="absolute right-6 cursor-pointer" size={24} onClick={() => router.back()} />
        <Notification />
      </div>
    </div>
  );
}
