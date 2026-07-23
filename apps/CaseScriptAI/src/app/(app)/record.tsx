import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { modelManager } from '@/services/ai/model-manager-runtime';
import { buildModelStatusRows, MODEL_STATUS_COPY } from '@/services/ai/model-status-rows';
import { useDeviceStore } from '@/stores/device-store';

import type { ModelReadiness } from '@/types/download';

export default function RecordScreen() {
  const theme = useTheme();
  const selection = useDeviceStore((state) => state.selection);
  const assessAndSelect = useDeviceStore((state) => state.assessAndSelect);
  const [readiness, setReadiness] = useState<ModelReadiness | null>(null);

  const tier = selection?.tier ?? 'lite';

  useEffect(() => {
    if (!selection) void assessAndSelect();
  }, [assessAndSelect, selection]);

  const refreshReadiness = useCallback(async () => {
    const result = await modelManager.checkAllModelsReady(tier);
    if (result.success) setReadiness(result.data);
  }, [tier]);

  useEffect(() => {
    void refreshReadiness();
  }, [refreshReadiness]);

  const statuses = buildModelStatusRows(tier, readiness);
  const allReady = readiness?.ready === true;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      <View style={styles.body}>
        <ThemedText type="headlineMd">(app)/record</ThemedText>
        <ThemedText type="bodyMd" themeColor="textSecondary">
          {selection
            ? `Tier: ${selection.tier} (${selection.modelId})`
            : 'Assessing device tier…'}
        </ThemedText>

        <View style={[styles.statusList, { borderColor: theme.outlineVariant }]}>
          {statuses.map((row) => (
            <View key={row.label} style={styles.statusRow}>
              <MaterialIcons
                name={
                  row.state === 'ready'
                    ? 'check-circle'
                    : row.state === 'corrupt'
                      ? 'error'
                      : row.state === 'missing'
                        ? 'cloud-download'
                        : 'hourglass-empty'
                }
                size={20}
                color={row.state === 'ready' ? theme.primary : theme.textSecondary}
              />
              <View style={styles.statusText}>
                <ThemedText type="bodyMd">{row.label}</ThemedText>
                <ThemedText type="labelSm" themeColor="textSecondary">
                  {MODEL_STATUS_COPY[row.state]}
                  {row.detail ? ` · ${row.detail}` : ''}
                </ThemedText>
              </View>
            </View>
          ))}
        </View>

        <ThemedText type="bodyMd" themeColor={allReady ? 'primary' : 'textSecondary'}>
          {readiness == null
            ? 'Checking on-disk models…'
            : allReady
              ? 'All required models are on disk.'
              : `Not ready — missing: ${readiness.missing.join(', ') || 'none'}; corrupt: ${readiness.corrupt.join(', ') || 'none'}`}
        </ThemedText>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.marginMobile,
    gap: Spacing.four,
  },
  statusList: {
    width: '100%',
    maxWidth: 420,
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  statusText: { flex: 1, gap: 2 },
});
