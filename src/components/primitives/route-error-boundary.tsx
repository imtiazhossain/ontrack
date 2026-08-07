import type { ErrorBoundaryProps } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { typeConfig } from '@/design-system/typography';
import { AgentUiIds } from '@/utils/agent-ui/ids';
import { sendCrashReport } from '@/utils/crash-report';

/**
 * Recoverable route shell so render/HMR failures never leave a blank white screen.
 * Intentionally avoids app primitives (Button/useTheme) so a broken module graph
 * cannot cascade into a second crash inside the boundary.
 */
export function RouteErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const [sending, setSending] = useState(false);
  const [sendHint, setSendHint] = useState<string | undefined>();

  const onSendCrashReport = useCallback(() => {
    if (sending) return;
    setSending(true);
    setSendHint(undefined);
    void sendCrashReport({ error })
      .then((result) => {
        if (result.method === 'unavailable') {
          setSendHint(result.reason);
          return;
        }
        if (result.method === 'share') {
          setSendHint('Choose Mail to send the attached crash log.');
          return;
        }
        setSendHint(undefined);
      })
      .catch(() => {
        setSendHint('Could not open a crash report. Try again.');
      })
      .finally(() => {
        setSending(false);
      });
  }, [error, sending]);

  return (
    <View style={styles.root} testID={AgentUiIds.errorBoundary.root}>
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.message}>
        {error.message || 'The screen failed to load. Try again.'}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Retry loading screen"
        testID={AgentUiIds.errorBoundary.retry}
        onPress={() => void retry()}
        style={({ pressed }) => [styles.retry, pressed && styles.retryPressed]}>
        <Text style={styles.retryLabel}>Try again</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Send crash report by email"
        testID={AgentUiIds.errorBoundary.sendReport}
        disabled={sending}
        onPress={onSendCrashReport}
        style={({ pressed }) => [
          styles.send,
          (pressed || sending) && styles.sendPressed,
        ]}>
        <Text style={styles.sendLabel}>
          {sending ? 'Preparing report…' : 'Send crash report'}
        </Text>
      </Pressable>
      {sendHint ? <Text style={styles.hint}>{sendHint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
    backgroundColor: '#F7F3EC',
  },
  title: {
    fontFamily: typeConfig.fontFamily,
    fontSize: 22,
    fontWeight: typeConfig.weight.regular,
    color: '#1B1815',
    textAlign: 'center',
  },
  message: {
    fontFamily: typeConfig.fontFamily,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: typeConfig.weight.regular,
    color: '#6B645C',
    textAlign: 'center',
  },
  retry: {
    marginTop: 8,
    minHeight: 44,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: '#1B1815',
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryPressed: {
    opacity: 0.75,
  },
  retryLabel: {
    fontFamily: typeConfig.fontFamily,
    fontSize: 15,
    fontWeight: typeConfig.weight.regular,
    color: '#F7F3EC',
  },
  send: {
    minHeight: 44,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#1B1815',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendPressed: {
    opacity: 0.75,
  },
  sendLabel: {
    fontFamily: typeConfig.fontFamily,
    fontSize: 15,
    fontWeight: typeConfig.weight.regular,
    color: '#1B1815',
  },
  hint: {
    fontFamily: typeConfig.fontFamily,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: typeConfig.weight.regular,
    color: '#6B645C',
    textAlign: 'center',
    marginTop: 4,
  },
});
