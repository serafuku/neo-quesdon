export function getProxyUrl(url: string) {
  return `/api/web/proxy?url=${encodeURIComponent(url)}`;
}
