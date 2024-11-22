"use client";

import UserPage from "./_answers";
import Profile from "./_profile";

export default function ProfilePage() {
  return (
    <div className="w-[90%] window:w-[80%] desktop:w-[70%] grid grid-cols-1 desktop:grid-cols-2 gap-4">
      <Profile />
      <UserPage />
    </div>
  );
}
