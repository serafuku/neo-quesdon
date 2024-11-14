"use server";

import { cookies } from "next/headers";

export async function fetchCookies(cookie: string) {
  const cookieStore = await cookies();
  const jwtToken = cookieStore.get(cookie);

  if (jwtToken) {
    return jwtToken;
  } else {
    return undefined;
  }
}
