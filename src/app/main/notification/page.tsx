import Notification from '@/app/_components/notification';

export default function Page() {
  return (
    <div className="w-full flex justify-center">
      <div className="w-[90%] window:w-[80%] desktop:w-[70%]">
        <Notification />
      </div>
    </div>
  );
}
