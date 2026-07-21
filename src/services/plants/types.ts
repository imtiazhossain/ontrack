import type {
  PlantCarePlan,
  PlantHealthAssessment,
  PlantIdentity,
  RoomProfile,
} from '@/types/models';

export type PlantServiceErrorCode =
  | 'INVALID_IMAGE'
  | 'UNCLEAR_IMAGE'
  | 'INVALID_INPUT'
  | 'OFFLINE'
  | 'PROVIDER_FAILURE'
  | 'NOT_CONFIGURED';

export interface PlantApiErrorBody {
  error: string;
  code: PlantServiceErrorCode;
}

export interface PlantIdentificationResponse {
  identity: PlantIdentity;
  health: PlantHealthAssessment;
}

export interface PlantCareRequest {
  identity: PlantIdentity;
  health: PlantHealthAssessment;
  room: RoomProfile;
  roomImageDataUrl?: string;
}

export interface PlantCareResponse {
  carePlan: PlantCarePlan;
}

export interface PlantCheckInResponse {
  health: PlantHealthAssessment;
  proposedCarePlan?: PlantCarePlan;
}
