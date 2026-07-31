import { travelChatAccessCode } from '../chat';
import type { TravelPlan } from '../types';

jest.mock('expo-notifications', () => ({}));

const basePlan: TravelPlan = {
  id: 'trip-1',
  title: 'Lisbon',
  destination: 'Lisbon',
  startDate: '2026-09-01',
  endDate: '2026-09-05',
  itinerary: [],
  participants: [],
  baseCurrency: 'USD',
  expenses: [],
  createdAt: '2026-07-27T12:00:00.000Z',
  updatedAt: '2026-07-27T12:00:00.000Z',
};

describe('travel chat access', () => {
  it('uses the capability saved when this member accepted an invitation', () => {
    expect(
      travelChatAccessCode({
        ...basePlan,
        chatAccessCode: 'aaaaaaaaaaaaaaaaaaaa',
        participants: [
          {
            id: 'person-1',
            name: 'Sam',
            inviteCode: 'bbbbbbbbbbbbbbbbbbbb',
            invitedAt: basePlan.createdAt,
            acceptedAt: basePlan.updatedAt,
          },
        ],
      }),
    ).toBe('aaaaaaaaaaaaaaaaaaaa');
  });

  it('prefers an accepted member capability for a trip organizer', () => {
    expect(
      travelChatAccessCode({
        ...basePlan,
        participants: [
          {
            id: 'pending',
            name: 'Pending',
            inviteCode: 'aaaaaaaaaaaaaaaaaaaa',
            invitedAt: basePlan.createdAt,
          },
          {
            id: 'accepted',
            name: 'Accepted',
            inviteCode: 'bbbbbbbbbbbbbbbbbbbb',
            invitedAt: basePlan.createdAt,
            acceptedAt: basePlan.updatedAt,
          },
        ],
      }),
    ).toBe('bbbbbbbbbbbbbbbbbbbb');
  });

  it('keeps chat closed while every invitation is pending', () => {
    expect(
      travelChatAccessCode({
        ...basePlan,
        participants: [
          {
            id: 'pending',
            name: 'Pending',
            inviteCode: 'aaaaaaaaaaaaaaaaaaaa',
            invitedAt: basePlan.createdAt,
          },
        ],
      }),
    ).toBeUndefined();
  });
});
