'use client';
import { userProfileMeDto } from '../_dto/fetch-profile/Profile.dto';
import MainHeader from './_header';
import { useState } from 'react';
import { UserProfileContext } from './_profileContext';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [userProfileData, setUserProfileData] = useState<userProfileMeDto | undefined>();

  return (
    <div>
      <UserProfileContext.Provider value={userProfileData}>
          <header className="w-full h-full flex justify-center">
            <MainHeader setUserProfile={setUserProfileData}/>
          </header>
          <main className="flex justify-center">{children}</main>
      </UserProfileContext.Provider>
    </div>
  );
}
