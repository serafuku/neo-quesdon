'use client';

export async function loginCheck(): Promise<boolean> {
  try {
    const res = await fetch('/api/db/fetch-my-profile', {
      method: 'GET',
    });
    if (!res.ok) {
      return false;
    } else {
      return true;
    }

  } catch (err) {
    console.log('로그인 체크 실패', err);
    return false;
  }
}