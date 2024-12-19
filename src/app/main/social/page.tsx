'use client';

import UsernameAndProfile from '@/app/_components/userProfile';
import { FollowingListResDto } from '@/app/_dto/following/following.dto';
import { MyProfileContext } from '@/app/main/layout';
import { useContext, useEffect, useState } from 'react';

export default function Social() {
  const [following, setFollowing] = useState<FollowingListResDto | null | undefined>();

  const profileContext = useContext(MyProfileContext);

  useEffect(() => {
    const fn = async () => {
      try {
        const res = await fetch('/api/user/following/list', {
          method: 'POST',
          body: JSON.stringify({}),
        });
        if (!res.ok) {
          throw new Error('팔로잉 목록을 받아오는데 실패했어요!');
        }
        const data = (await res.json()) as FollowingListResDto;
        setFollowing(data);
      } catch (err) {
        alert(err);
      }
    };
    if (profileContext) fn();
  }, [profileContext]);

  return (
    <div className="w-[90%] window:w-[80%] desktop:w-[70%]">
      <h3 className="text-3xl desktop:text-4xl mb-2">내 친구들</h3>
      <div className="h-fit p-6 glass rounded-box flex flex-col items-center shadow mb-2">
        <div className="grid grid-cols-1 window:grid-cols-2 desktop:grid-cols-3 gap-4">
          {following?.followingList.map((following, key) => (
            <UsernameAndProfile profile={following.follweeProfile} key={key} />
          ))}
        </div>
      </div>
    </div>
  );
}
