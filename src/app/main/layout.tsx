'use client';
import { userProfileMeDto } from '@/app/_dto/fetch-profile/Profile.dto';
import MainHeader from '@/app/main/_header';
import { useState } from 'react';
import { MyProfileContext } from '@/app/main/_profileContext';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [userProfileData, setUserProfileData] = useState<userProfileMeDto | undefined>();

  return (
    <div>
      <MyProfileContext.Provider value={userProfileData}>
          <header className="w-full h-full flex justify-center">
            <MainHeader setUserProfile={setUserProfileData}/>
          </header>
          <main className="flex justify-center">{children}</main>
      </MyProfileContext.Provider>
    </div>
  );
}
