import { userProfileMeDto } from '@/app/_dto/fetch-profile/Profile.dto';

export async function fetchMyProfile(onResNotOk?: (code: number) => void): Promise<userProfileMeDto | undefined> {
  const user_handle = localStorage.getItem('user_handle');

  if (user_handle) {
    const res = await fetch('/api/db/fetch-my-profile', {
      method: 'GET',
    });
    if (!res.ok) {
      if (onResNotOk) {
        onResNotOk(res.status);
      }
      return;
    }
    const data = await res.json();
    return data;
  }
}
