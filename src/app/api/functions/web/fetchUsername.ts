import type { payload } from "../../web/fetch-username/route";

export async function fetchUsername({ username, host }: payload) {
  const res = await fetch("/api/web/fetch-username", {
    method: "POST",
    body: JSON.stringify({
      username: username,
      host: `https://${host}`,
    }),
  }).then((r) => r.json());

  return res;
}
