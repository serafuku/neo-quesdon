"use server";

import { decodeJwt } from "jose";
import { cookies } from "next/headers";

export async function getTokenCookie() {
  const cookieStore = await cookies();
  const token = cookieStore.get("jwtToken");

  if (token) {
    const { payload } = decodeJwt(token.value);

    console.log(payload);

    return token.value;
  } else {
    return null;
  }
}
