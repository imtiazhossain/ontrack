/**
 * TypeScript / non-Metro fallback. Metro resolves `.ios` / `.android` / `.web`
 * at bundle time; this file keeps `tsc` and shared imports working.
 */
export { TimeField } from './time-field.ios';
export type { TimeFieldProps } from './time-field.types';
