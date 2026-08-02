import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AppText, Input } from '@/components/primitives';
import { radii, type AppIconName } from '@/design-system';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';

import {
  ADDRESS_LOOKUP_MIN_QUERY,
  searchAddresses,
  type AddressSuggestion,
} from './address-lookup';

const ADDRESS_MAX_LENGTH = 240;
const DEBOUNCE_MS = 320;

interface AddressAutofindFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  stackedLabel?: string;
  icon?: AppIconName;
  iconBackground?: string;
  iconColor?: string;
  fieldBackground?: string;
  stackedLabelColor?: string;
  placeholderTextColor?: string;
  accessibilityLabel?: string;
}

function approxHeightForText(text: string, minHeight: number, lineHeight: number): number {
  if (!text) return minHeight;
  const approxLines = Math.max(1, Math.ceil(text.length / 28));
  return Math.max(minHeight, approxLines * lineHeight);
}

export function AddressAutofindField({
  value,
  onChange,
  placeholder = 'Address',
  stackedLabel,
  icon = 'location',
  iconBackground,
  iconColor,
  fieldBackground,
  stackedLabelColor,
  placeholderTextColor,
  accessibilityLabel = 'Address, optional',
}: AddressAutofindFieldProps) {
  const theme = useTheme();
  const { s, spacing: rs } = useResponsive();
  const minHeight = Math.max(stackedLabel ? 56 : 44, s(stackedLabel ? 60 : 48));
  const lineHeight = Math.max(22, s(24));
  const [height, setHeight] = useState(() => approxHeightForText(value, minHeight, lineHeight));
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const requestIdRef = useRef(0);
  /** Last value we pushed via typing or suggestion pick. */
  const lastLocalValueRef = useRef(value);
  /** True only for the next value effect caused by onChangeText. */
  const userTypedRef = useRef(false);

  const clearSuggestions = () => {
    requestIdRef.current += 1;
    setSuggestions([]);
    setOpen(false);
    setLoading(false);
  };

  useEffect(() => {
    const fromUserTyping = userTypedRef.current;
    userTypedRef.current = false;

    // Parent/import changed the value out from under us — keep it, no suggestions.
    // (onChangeText always syncs lastLocalValueRef first, so a mismatch means external.)
    if (value !== lastLocalValueRef.current) {
      lastLocalValueRef.current = value;
      clearSuggestions();
      setHeight(approxHeightForText(value, minHeight, lineHeight));
      return;
    }

    if (!fromUserTyping) {
      clearSuggestions();
      return;
    }

    const query = value.trim();
    if (query.length < ADDRESS_LOOKUP_MIN_QUERY) {
      clearSuggestions();
      return;
    }

    const requestId = ++requestIdRef.current;
    setLoading(true);
    const timer = setTimeout(() => {
      void searchAddresses(query).then((results) => {
        if (requestId !== requestIdRef.current) return;
        setSuggestions(results);
        setOpen(results.length > 0);
        setLoading(false);
      });
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      if (requestId === requestIdRef.current) setLoading(false);
    };
  }, [value, minHeight, lineHeight]);

  const applySuggestion = (suggestion: AddressSuggestion) => {
    const next = [suggestion.label, suggestion.secondary]
      .filter(Boolean)
      .join(', ')
      .slice(0, ADDRESS_MAX_LENGTH);
    lastLocalValueRef.current = next;
    userTypedRef.current = false;
    clearSuggestions();
    setHeight(approxHeightForText(next, minHeight, lineHeight));
    onChange(next);
  };

  const expanding = value.trim().length > 36 || height > minHeight + 4;

  return (
    <View style={styles.wrap}>
      <Input
        value={value}
        placeholder={placeholder}
        accessibilityLabel={accessibilityLabel}
        icon={icon}
        stackedLabel={stackedLabel}
        iconBackground={iconBackground}
        iconColor={iconColor}
        fieldBackground={fieldBackground}
        stackedLabelColor={stackedLabelColor}
        placeholderTextColor={placeholderTextColor}
        multiline={expanding}
        scrollEnabled={false}
        maxLength={ADDRESS_MAX_LENGTH}
        textAlignVertical={expanding ? 'top' : 'center'}
        autoCorrect={false}
        autoCapitalize="words"
        returnKeyType="search"
        onChangeText={(next) => {
          const clipped = next.slice(0, ADDRESS_MAX_LENGTH);
          if (!clipped) setHeight(minHeight);
          userTypedRef.current = true;
          lastLocalValueRef.current = clipped;
          onChange(clipped);
        }}
        onFocus={() => {
          if (suggestions.length > 0) setOpen(true);
        }}
        onBlur={() => {
          // Delay so suggestion presses register before the list unmounts.
          setTimeout(() => setOpen(false), 180);
        }}
        onContentSizeChange={(event) => {
          if (!value.trim()) {
            setHeight(minHeight);
            return;
          }
          const next = Math.ceil(event.nativeEvent.contentSize.height);
          // Cap growth so flex layout can't feed a runaway height loop.
          const measured = Math.min(Math.max(minHeight, next), minHeight + lineHeight * 8);
          setHeight((current) => (measured === current ? current : measured));
        }}
        style={{
          ...(expanding ? { minHeight: Math.max(minHeight, height) } : null),
          paddingRight: loading ? s(44) : undefined,
        }}
        trailing={
          loading ? (
            <ActivityIndicator size="small" color={theme.textTertiary} />
          ) : undefined
        }
      />
      {open && suggestions.length > 0 ? (
        <View
          style={[
            styles.suggestions,
            {
              backgroundColor: theme.backgroundPrimary,
              borderColor: theme.separator,
              marginTop: rs.xs,
              borderRadius: radii.md,
            },
          ]}>
          {suggestions.map((suggestion, index) => (
            <Pressable
              key={suggestion.id}
              accessibilityRole="button"
              accessibilityLabel={`Use address ${suggestion.label}`}
              onPress={() => applySuggestion(suggestion)}
              style={({ pressed }) => [
                styles.suggestionRow,
                {
                  minHeight: Math.max(44, s(48)),
                  paddingHorizontal: rs.lg,
                  paddingVertical: rs.sm,
                  borderTopWidth: index === 0 ? 0 : StyleSheet.hairlineWidth,
                  borderTopColor: theme.separator,
                  backgroundColor: pressed ? theme.backgroundSunken : undefined,
                },
              ]}>
              <View style={styles.suggestionText}>
                <AppText variant="body" numberOfLines={2}>
                  {suggestion.label}
                </AppText>
                {suggestion.secondary ? (
                  <AppText variant="caption" color="secondary" numberOfLines={1} fit>
                    {suggestion.secondary}
                  </AppText>
                ) : null}
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {},
  suggestions: {
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  suggestionRow: {
    justifyContent: 'center',
  },
  suggestionText: {
    flexShrink: 1,
    minWidth: 0,
    gap: 2,
  },
});
