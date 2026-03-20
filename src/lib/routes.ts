const APP_BASE_URL = import.meta.env.BASE_URL;

export function getDriverProfileHref(guid: string) {
  return `${APP_BASE_URL}driver/${encodeURIComponent(guid)}`;
}
