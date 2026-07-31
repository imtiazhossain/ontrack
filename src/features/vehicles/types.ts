export type VehicleMode = 'private' | 'shared';
export type VehicleRole = 'owner' | 'member';

export type VehiclePartStatus = 'needed' | 'ordered' | 'installed';

export type VehicleExpenseCategory =
  | 'fuel'
  | 'maintenance'
  | 'insurance'
  | 'registration'
  | 'parts'
  | 'parking'
  | 'tolls'
  | 'other';

export type VehicleActivityEntity =
  | 'vehicle'
  | 'maintenance_schedule'
  | 'maintenance_log'
  | 'mileage'
  | 'expense'
  | 'part'
  | 'registration'
  | 'insurance'
  | 'member';

export interface VehicleRegistration {
  state?: string;
  number?: string;
  expiresOn?: string;
  notes?: string;
}

export interface VehicleInsurance {
  provider?: string;
  policyNumber?: string;
  expiresOn?: string;
  notes?: string;
}

export interface VehicleMaintenanceSchedule {
  id: string;
  title: string;
  intervalMiles?: number;
  intervalMonths?: number;
  lastDoneAt?: string;
  lastDoneMiles?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleMaintenanceLog {
  id: string;
  title: string;
  date: string;
  miles?: number;
  cost?: number;
  currency?: string;
  notes?: string;
  scheduleId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleMileageLog {
  id: string;
  date: string;
  miles: number;
  notes?: string;
  createdAt: string;
}

export interface VehicleExpense {
  id: string;
  title: string;
  amount: number;
  currency: string;
  date: string;
  category: VehicleExpenseCategory;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VehiclePart {
  id: string;
  name: string;
  partNumber?: string;
  category?: string;
  vendorUrl?: string;
  status: VehiclePartStatus;
  price?: number;
  currency?: string;
  notes?: string;
  fitmentLabel?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleActivityEvent {
  id: string;
  actorUserId?: string;
  actorDisplayName: string;
  action: string;
  entityType: VehicleActivityEntity;
  entityId?: string;
  summary: string;
  meta?: Record<string, unknown>;
  createdAt: string;
}

export interface VehicleMember {
  userId: string;
  displayName: string;
  role: VehicleRole;
  joinedAt: string;
}

export interface VehicleInvite {
  id: string;
  vehicleId: string;
  inviteeEmail: string;
  inviterDisplayName: string;
  createdAt: string;
  expiresAt?: string;
}

export interface Vehicle {
  id: string;
  nickname: string;
  year?: number;
  make?: string;
  model?: string;
  trim?: string;
  engine?: string;
  vin?: string;
  plate?: string;
  color?: string;
  photoUri?: string;
  odometerMiles?: number;
  odometerUpdatedAt?: string;
  baseCurrency: string;
  registration?: VehicleRegistration;
  insurance?: VehicleInsurance;
  maintenanceSchedules: VehicleMaintenanceSchedule[];
  maintenanceLogs: VehicleMaintenanceLog[];
  mileageLogs: VehicleMileageLog[];
  expenses: VehicleExpense[];
  parts: VehiclePart[];
  activity: VehicleActivityEvent[];
  mode: VehicleMode;
  role: VehicleRole;
  members: VehicleMember[];
  invites: VehicleInvite[];
  shareCode?: string;
  createdAt: string;
  updatedAt: string;
}

export const VEHICLE_EXPENSE_CATEGORIES: readonly VehicleExpenseCategory[] = [
  'fuel',
  'maintenance',
  'insurance',
  'registration',
  'parts',
  'parking',
  'tolls',
  'other',
] as const;

export const VEHICLE_PART_STATUSES: readonly VehiclePartStatus[] = [
  'needed',
  'ordered',
  'installed',
] as const;

export function vehicleFitmentLabel(
  vehicle: Pick<Vehicle, 'year' | 'make' | 'model' | 'trim' | 'engine'>,
): string {
  return [vehicle.year, vehicle.make, vehicle.model, vehicle.trim, vehicle.engine]
    .filter((part) => part !== undefined && part !== '')
    .join(' ')
    .trim();
}

export function vehicleDisplayTitle(vehicle: Pick<Vehicle, 'nickname' | 'year' | 'make' | 'model'>): string {
  const nickname = vehicle.nickname.trim();
  if (nickname) return nickname;
  const ymm = [vehicle.year, vehicle.make, vehicle.model]
    .filter((part) => part !== undefined && part !== '')
    .join(' ')
    .trim();
  return ymm || 'Vehicle';
}
