import { create } from 'zustand';

export type AccountFlagsStatus = 'idle' | 'loading' | 'ready';

interface AccountFlagsState {
  status: AccountFlagsStatus;
  developerTools: boolean;
  analyticsAdmin: boolean;
  setLoading: () => void;
  replaceFlags: (flags: { developerTools: boolean; analyticsAdmin: boolean }) => void;
  reset: () => void;
}

const EMPTY = {
  status: 'idle' as const,
  developerTools: false,
  analyticsAdmin: false,
};

/** Server-backed privilege flags. Never persist — always reload from Supabase. */
export const useAccountFlags = create<AccountFlagsState>((set) => ({
  ...EMPTY,
  setLoading: () => set({ status: 'loading' }),
  replaceFlags: ({ developerTools, analyticsAdmin }) =>
    set({
      status: 'ready',
      developerTools: Boolean(developerTools),
      analyticsAdmin: Boolean(analyticsAdmin),
    }),
  reset: () => set({ ...EMPTY }),
}));
