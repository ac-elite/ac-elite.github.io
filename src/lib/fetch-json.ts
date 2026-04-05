const APP_BASE_URL = import.meta.env.BASE_URL;

function resolveFetchUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  const normalizedBase = APP_BASE_URL.endsWith('/') ? APP_BASE_URL : `${APP_BASE_URL}/`;
  const path = url.startsWith('/') ? url.slice(1) : url;
  return `${normalizedBase}${path}`;
}

export async function fetchJson<T>(url: string): Promise<T> {
  const requestUrl = resolveFetchUrl(url);
  const res = await fetch(requestUrl, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}
