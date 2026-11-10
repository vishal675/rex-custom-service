import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

import { Text } from './text';

type Props = {
  title?: string;
  right?: ReactNode;
  children: ReactNode;
  scroll?: boolean;
  /** Enables pull-to-refresh on scrolling screens. */
  onRefresh?: () => void;
  refreshing?: boolean;
};

/** Standard screen shell: safe area, page background, optional large title row. */
export function Screen({ title, right, children, scroll = true, onRefresh, refreshing = false }: Props) {
  const { colors } = useTheme();
  const header = title ? (
    <View style={styles.header}>
      <Text variant="title" accessibilityRole="header">
        {title}
      </Text>
      {right}
    </View>
  ) : null;

  return (
    <SafeAreaView edges={['top']} style={[styles.flex, { backgroundColor: colors.background }]}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textMuted} />
            ) : undefined
          }>
          {header}
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, styles.content]}>
          {header}
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl, gap: spacing.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
  },
});
