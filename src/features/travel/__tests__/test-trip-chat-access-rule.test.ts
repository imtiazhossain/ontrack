import fs from 'node:fs';
import path from 'node:path';

import { ALL_ACCOUNTS_TEST_TRIP } from '@/constants/travel';
import { travelChatAccessCode } from '@/features/travel/chat';

jest.mock('expo-notifications', () => ({}));

const migrationPath = path.join(
  process.cwd(),
  'supabase/migrations/202607270007_all_accounts_test_trip_chat.sql',
);
const anonymousMigrationPath = path.join(
  process.cwd(),
  'supabase/migrations/202607270008_anonymous_test_trip_chat.sql',
);

describe('all-accounts test trip chat', () => {
  const migration = fs.readFileSync(migrationPath, 'utf8');
  const anonymousMigration = fs.readFileSync(anonymousMigrationPath, 'utf8');

  it('ships the shared chat capability with the test fixture', () => {
    expect(travelChatAccessCode(ALL_ACCOUNTS_TEST_TRIP)).toBe(
      '00000000000000000001',
    );
  });

  it('allows a signed-in account to resolve only the test trip capability', () => {
    expect(migration).toContain(
      "chat_access_code = '00000000000000000001'",
    );
    expect(migration).toContain(
      "select 'trip-all-accounts-test'::text as trip_id",
    );
    expect(migration).toMatch(
      /chat_access_code = '00000000000000000001'[\s\S]*?auth\.uid\(\) is not null/,
    );
    expect(migration).toMatch(
      /invite\.code <> '00000000000000000001'[\s\S]*?invite\.inviter_user_id = auth\.uid\(\)[\s\S]*?invite\.accepted_by_user_id = auth\.uid\(\)/,
    );
  });

  it('lets signed-out app sessions use only the fixed test capability', () => {
    expect(anonymousMigration).toMatch(
      /chat_access_code = '00000000000000000001'\s*\n/,
    );
    expect(anonymousMigration).toMatch(
      /invite\.code <> '00000000000000000001'[\s\S]*?auth\.uid\(\) is not null/,
    );
    expect(anonymousMigration).toContain(
      'grant execute on function public.travel_chat_messages(text)',
    );
    expect(anonymousMigration).toContain(
      'grant execute on function public.send_travel_chat_message(text, uuid, text, text)',
    );
  });
});
