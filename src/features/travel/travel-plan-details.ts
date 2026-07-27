export interface TravelPlanDetailsDraft {
  title: string;
  destination: string;
  notes: string;
}

export type TravelPlanDetailsResult =
  | {
      ok: true;
      value: {
        title: string;
        destination: string;
        notes?: string;
      };
    }
  | { ok: false; error: string };

export function validateTravelPlanDetails(
  draft: TravelPlanDetailsDraft,
): TravelPlanDetailsResult {
  const title = draft.title.trim();
  const destination = draft.destination.trim();
  if (!title || !destination) {
    return { ok: false, error: 'Add both a trip name and destination.' };
  }
  return {
    ok: true,
    value: {
      title,
      destination,
      notes: draft.notes.trim() || undefined,
    },
  };
}
