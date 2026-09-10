/**
 * Resolves an evidence photo URL.
 * If the URL starts with http(s), it is returned directly.
 * Otherwise, it routes through the secure Edge CDN / API evidence proxy.
 */
export function getEvidencePhotoUrl(fileUrl: string | null | undefined): string {
  if (!fileUrl) {
    return "/api/kebersihan/evidence?path=NOT_FOUND";
  }
  if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) {
    return fileUrl;
  }
  return `/api/kebersihan/evidence?path=${encodeURIComponent(fileUrl)}`;
}
