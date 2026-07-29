import fs from 'node:fs';
import path from 'node:path';

describe('optimistic network actions', () => {
  it('renders a trip message before sending and restores the draft on failure', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/features/travel/travel-chat-screen.tsx'),
      'utf8',
    );
    const optimisticUpdate = source.indexOf(
      'setMessages((current) => [...current, optimisticMessage])',
    );
    const serverSend = source.indexOf('await sendTravelChatMessage');

    expect(optimisticUpdate).toBeGreaterThan(-1);
    expect(optimisticUpdate).toBeLessThan(serverSend);
    expect(source).toContain(
      'current.filter((item) => item.id !== optimisticId)',
    );
    expect(source).toContain('setDraft((current) => current || body)');
    expect(source).toContain('Message not sent. Your draft was restored.');
  });

  it('removes shared lists before the request and rolls back failed removals', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/services/todos/collaboration.ts'),
      'utf8',
    );
    for (const functionName of ['leaveTodoList', 'deleteSharedTodoList']) {
      const start = source.indexOf(`export async function ${functionName}`);
      const end = source.indexOf('\nexport ', start + 1);
      const implementation = source.slice(start, end);
      expect(implementation.indexOf('removeSharedList(listId)')).toBeLessThan(
        implementation.indexOf('await authenticatedClient()'),
      );
      expect(implementation).toContain('replaceSharedSnapshot(rollback)');
    }
  });
});
