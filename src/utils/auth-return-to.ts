/**
 * Same-origin in-app return paths only. Rejects absolute URLs and
 * protocol-relative targets like "//evil.example" that become open redirects
 * on web after sign-in.
 */
export function isSafeAuthReturnTo(path: unknown): path is string {
  return typeof path === 'string' && /^\/(?![/\\])/.test(path);
}
