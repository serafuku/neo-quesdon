import UserPage from '@/app/main/user/[handle]/_answers';
import Profile from '@/app/main/user/[handle]/_profile';
import josa from '@/app/api/_utils/josa';
import { Metadata } from 'next';
import { GetPrismaClient } from '@/app/api/_utils/getPrismaClient/get-prisma-client';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const { handle } = await params;
  const profileHandle = decodeURIComponent(handle);
  const prisma = GetPrismaClient.getClient();
  const userProfile = await prisma.profile.findUnique({
    where: {
      handle: profileHandle,
    },
  });
  if (!userProfile) {
    return {
      title: '찾을 수 없음',
      description: '그런 유저를 찾을 수 없습니다',
    };
  }

  return {
    title: `${userProfile.handle.match(/(?:@)(.+)(?:@)/)?.[1]} 님의 ${userProfile.questionBoxName}`,
    openGraph: {
      title: `${userProfile.handle.match(/(?:@)(.+)(?:@)/)?.[1]} 님의 ${userProfile.questionBoxName}`,
      description: `${userProfile.handle.match(/(?:@)(.+)(?:@)/)?.[1]} 님의 ${josa(userProfile.questionBoxName, '이에요!', '예요!')}`,
      images: userProfile.avatarUrl,
    },
  };
}

export default async function ProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const profileHandle = decodeURIComponent(handle);
  const prisma = GetPrismaClient.getClient();
  const userProfile = await prisma.profile.findUnique({
    where: {
      handle: profileHandle,
    },
  });

  return (
    <div className="w-[90%] window:w-[80%] desktop:w-[70%] grid grid-cols-1 desktop:grid-cols-2 gap-4">
      {userProfile === null ? (
        <div className="w-full col-span-2 flex flex-col justify-center items-center glass text-4xl rounded-box shadow p-2">
          😶‍🌫️
          <span>그런 사용자는 없어요!</span>
        </div>
      ) : (
        <>
          {userProfile === undefined ? (
            <div className="w-full col-span-2 flex justify-center">
              <span className="loading loading-spinner loading-lg" />
            </div>
          ) : (
            <>
              <Profile />
              <UserPage />
            </>
          )}
        </>
      )}
    </div>
  );
}
