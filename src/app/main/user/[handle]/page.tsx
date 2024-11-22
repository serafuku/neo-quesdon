"use client";

import { useEffect, useState } from "react";
import UserPage from "./_answers";
import Profile from "./_profile";
import { useParams } from "next/navigation";
import { userProfileWithHostnameDto } from "@/app/_dto/fetch-profile/Profile.dto";

async function fetchProfile(handle: string) {
  const profile = await fetch(`/api/db/fetch-profile/${handle}`);
  if (profile && profile.ok) {
    return profile.json() as unknown as userProfileWithHostnameDto;
  } else {
    return null;
  }
}

export default function ProfilePage() {
  const { handle } = useParams() as { handle: string };
  const profileHandle = handle.toString().replace(/(?:%40)/g, "@");

  const [userProfile, setUserProfile] =
    useState<userProfileWithHostnameDto | null>();

  useEffect(() => {
    fetchProfile(profileHandle).then((r) => {
      setUserProfile(r);
    });
  }, [profileHandle]);
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
