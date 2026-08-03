/** Pretty join path helpers — copy/share keep the real code URL. */

export function tripNameSlug(title: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'trip';
}

/** Pretty join path for display — always uses the trip name. */
export function displayJoinLink(tripTitle: string, realUrl: string): string {
  try {
    const host = new URL(realUrl).host.replace(/^www\./, '');
    return `${host}/j/${tripNameSlug(tripTitle)}`;
  } catch {
    return `ontrack--links.expo.app/j/${tripNameSlug(tripTitle)}`;
  }
}
