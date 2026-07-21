import type { PlantServiceErrorCode } from './types';

export class PlantServiceError extends Error {
  constructor(
    message: string,
    readonly code: PlantServiceErrorCode,
    readonly status = 0,
  ) {
    super(message);
    this.name = 'PlantServiceError';
  }
}
