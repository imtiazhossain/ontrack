import fs from 'node:fs';
import path from 'node:path';

import { ALL_ACCOUNTS_TEST_TRIP } from '@/constants/travel';
import { travelChatAccessCode } from '@/features/travel/chat';

jest.mock('expo-notifications', () => ({}));

const hardeningMigrationPath = path.join(
  process.cwd(),
  'supabase/migrations/202607300001_security_hardening.sql',
);

describe('all-accounts test trip chat', () => {
  const hardening = fs.readFileSync(hardeningMigrationPath, 'utf8');

  it('ships the shared chat capability with the test fixture for signed-in local testing', () => {
    expect(travelChatAccessCode(ALL_ACCOUNTS_TEST_TRIP)).toBe(
      '00000000000000000001',
    );
  });

  it('removes the anonymous fixture and restricts chat RPCs to authenticated users', () => {
    expect(hardening).toContain(
      "delete from public.travel_invites\nwhere code = '00000000000000000001'",
    );
    expect(hardening).toContain(
      'revoke all on function public.travel_chat_messages(text) from public, anon',
    );
    expect(hardening).toContain(
      'grant execute on function public.travel_chat_messages(text) to authenticated',
    );
    expect(hardening).toMatch(
      /invite\.inviter_user_id = auth\.uid\(\)[\s\S]*?invite\.accepted_by_user_id = auth\.uid\(\)/,
    );
    expect(hardening).not.toMatch(
      /grant execute on function public\.travel_chat_messages\(text\)\s+to anon/,
    );
  });
});
