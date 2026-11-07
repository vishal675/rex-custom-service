import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { PressableScale } from '@/components/ui/pressable-scale';
import { Text } from '@/components/ui/text';
import { fonts } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

const SIZE = 220;
const RING_STROKE = 6;
const RING_GAP = 10;
const RING_SIZE = SIZE + (RING_GAP + RING_STROKE) * 2;
const RADIUS = (RING_SIZE - RING_STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

type Props = {
  active: boolean;
  /** 1 → 0, time remaining as a fraction of the window. */
  fraction: number;
  remainingLabel: string;
  activityLabel?: string;
  onPress: () => void;
  onLongPress: () => void;
};

export function FreeButton({ active, fraction, remainingLabel, activityLabel, onPress, onLongPress }: Props) {
  const { colors } = useTheme();
  const breathe = useSharedValue(0);

  useEffect(() => {
    breathe.set(0);
    breathe.set(
      withRepeat(
        withTiming(1, { duration: active ? 1500 : 2600, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      ),
    );
    return () => cancelAnimation(breathe);
  }, [active, breathe]);

  const haloStyle = useAnimatedStyle(() => ({
    opacity: interpolate(breathe.get(), [0, 1], active ? [0.25, 0.5] : [0.14, 0.32]),
    transform: [{ scale: interpolate(breathe.get(), [0, 1], [1, active ? 1.16 : 1.1]) }],
  }));

  return (
    <View style={styles.wrap}>
      <Animated.View
        pointerEvents="none"
        style={[styles.halo, { backgroundColor: colors.accent }, haloStyle]}
      />

      {active && (
        <Svg width={RING_SIZE} height={RING_SIZE} style={styles.ring} pointerEvents="none">
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS}
            stroke={colors.border}
            strokeWidth={RING_STROKE}
            fill="none"
          />
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS}
            stroke={colors.accent}
            strokeWidth={RING_STROKE}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - fraction)}
            transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
          />
        </Svg>
      )}

      <PressableScale
        scaleTo={0.94}
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={450}
        accessibilityRole="button"
        accessibilityLabel={active ? `You are free, ${remainingLabel} left` : "I'm free"}
        accessibilityHint={
          active ? 'Change who and what' : 'Tell friends you are free. Long press to reuse your last settings.'
        }
        style={[
          styles.button,
          active
            ? { backgroundColor: colors.surface, borderColor: colors.accent, borderWidth: 2 }
            : { backgroundColor: colors.accent, shadowColor: colors.accent },
        ]}>
        {active ? (
          <>
            <Text variant="overline" tone="accent">
              YOU&apos;RE FREE
            </Text>
            <Text style={[styles.timer, { color: colors.text }]}>{remainingLabel}</Text>
            {activityLabel ? (
              <Text variant="caption" tone="muted">
                {activityLabel}
              </Text>
            ) : null}
          </>
        ) : (
          <>
            <Text style={[styles.cta, { color: colors.onAccent }]}>I&apos;M{'\n'}FREE</Text>
          </>
        )}
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: RING_SIZE + 40,
    height: RING_SIZE + 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
  },
  ring: { position: 'absolute' },
  button: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 28,
    elevation: 12,
  },
  cta: {
    fontFamily: fonts.displayHeavy,
    fontSize: 46,
    lineHeight: 46,
    letterSpacing: -1,
    textAlign: 'center',
  },
  timer: {
    fontFamily: fonts.displayHeavy,
    fontSize: 40,
    lineHeight: 46,
    letterSpacing: -0.8,
    fontVariant: ['tabular-nums'],
  },
});
