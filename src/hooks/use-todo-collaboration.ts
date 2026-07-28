import { useEffect, useMemo } from 'react';
import { AppState } from 'react-native';

import {
  flushTodoMutations,
  loadAllSharedTodoLists,
  loadTodoListSnapshot,
  subscribeToTodoList,
} from '@/services/todos/collaboration';
import { useTodos } from '@/store/todos';

export function useTodoCollaboration(enabled: boolean) {
  const lists = useTodos((state) => state.lists);
  const sharedLists = useMemo(
    () => lists.filter((list) => list.mode === 'shared'),
    [lists],
  );
  const pendingCount = useTodos((state) => state.pendingMutations.length);
  const sharedKey = useMemo(
    () => sharedLists.map((list) => list.id).sort().join(','),
    [sharedLists],
  );

  useEffect(() => {
    if (!enabled) return;
    void loadAllSharedTodoLists().catch(() => undefined);
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void loadAllSharedTodoLists().catch(() => undefined);
      }
    });
    return () => subscription.remove();
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !pendingCount) return;
    void flushTodoMutations().catch(() => undefined);
  }, [enabled, pendingCount]);

  useEffect(() => {
    if (!enabled) return;
    const channels = sharedLists.flatMap((list) => {
      const channel = subscribeToTodoList(list, () => {
        void loadTodoListSnapshot(list.id).catch(() => {
          useTodos.getState().removeSharedList(list.id);
        });
      });
      return channel ? [channel] : [];
    });
    return () => {
      channels.forEach((channel) => {
        void channel.unsubscribe();
      });
    };
    // sharedKey intentionally re-subscribes only when membership changes.
  }, [enabled, sharedKey]); // eslint-disable-line react-hooks/exhaustive-deps
}
