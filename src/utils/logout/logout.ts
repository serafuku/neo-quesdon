'use client';

export async function logout() {
  try {
    await fetch('/api/web/logout');
  } catch {}
  localStorage.removeItem('user_handle');
  localStorage.removeItem('last_token_refresh');
  window.location.reload();
}
