export function getProxyUrl(url: string) {
  const baseUrl = process.env.WEB_URL;
  if (!baseUrl) {
    return url;
  }
  return `${baseUrl}/api/web/proxy?url=${encodeURIComponent(url)}`;
}
