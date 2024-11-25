'use client';

export async function logout() {
  try {
    await fetch('/api/web/logout');
  } catch {}
  localStorage.removeItem('user_handle');
  window.location.reload();
}
