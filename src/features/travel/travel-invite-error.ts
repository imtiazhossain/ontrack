/** Shared error for invite / open-join / roster host RPCs (leaf — no cycles). */
export class TravelInviteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TravelInviteError';
  }
}
