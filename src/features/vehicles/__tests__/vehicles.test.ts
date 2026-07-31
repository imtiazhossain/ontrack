import {
  normalizeVehicle,
  privateVehiclePayload,
} from '@/features/vehicles/normalize';
import { isMaintenanceDue, nextDueMiles } from '@/features/vehicles/maintenance-due';
import { buildPartsSearchResults, normalizeNhtsaDecode } from '@/services/vehicles/server';

describe('vehicle normalize', () => {
  it('normalizes a minimal vehicle and strips shared from private payload', () => {
    const now = '2026-07-31T12:00:00.000Z';
    const vehicle = normalizeVehicle({
      id: '00000000-0000-4000-8000-000000000001',
      nickname: 'Civic',
      year: 2018,
      make: 'Honda',
      model: 'Civic',
      baseCurrency: 'usd',
      mode: 'private',
      role: 'owner',
      maintenanceSchedules: [],
      maintenanceLogs: [],
      mileageLogs: [],
      expenses: [],
      parts: [],
      activity: [],
      members: [],
      invites: [],
      createdAt: now,
      updatedAt: now,
    });
    expect(vehicle?.nickname).toBe('Civic');
    expect(vehicle?.baseCurrency).toBe('USD');
    expect(vehicle?.year).toBe(2018);

    const shared = normalizeVehicle({
      ...vehicle,
      mode: 'shared',
    });
    expect(privateVehiclePayload([vehicle!, shared!])).toHaveLength(1);
    expect(privateVehiclePayload([vehicle!, shared!])[0]?.mode).toBe('private');
  });
});

describe('maintenance due', () => {
  it('flags mileage intervals as due', () => {
    expect(
      isMaintenanceDue(
        {
          id: '1',
          title: 'Oil',
          intervalMiles: 5000,
          lastDoneMiles: 10000,
          createdAt: '',
          updatedAt: '',
        },
        16000,
        '2026-07-31',
      ),
    ).toBe(true);
    expect(nextDueMiles({ intervalMiles: 5000, lastDoneMiles: 10000 })).toBe(15000);
  });
});

describe('vin decode normalize', () => {
  it('maps NHTSA decode values', () => {
    const result = normalizeNhtsaDecode('1HGBH41JXMN109186', {
      Results: [
        {
          ErrorCode: '0',
          Make: 'HONDA',
          Model: 'Civic',
          ModelYear: '2021',
          Trim: 'EX',
          DisplacementL: '1.5',
          EngineCylinders: '4',
        },
      ],
    });
    expect(result.make).toBe('HONDA');
    expect(result.model).toBe('Civic');
    expect(result.year).toBe(2021);
    expect(result.engine).toContain('1.5L');
  });
});

describe('parts search', () => {
  it('builds fitment-scoped retailer links', () => {
    const results = buildPartsSearchResults({
      year: 2018,
      make: 'Honda',
      model: 'Civic',
      query: 'oil filter',
    });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.fitmentLabel).toContain('Honda');
    expect(results.some((item) => item.vendor === 'RockAuto')).toBe(true);
    expect(results[0]?.url).toContain('http');
  });
});
