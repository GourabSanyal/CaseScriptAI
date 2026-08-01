import { FALLBACK_CHECKSUMS } from '@/constants/fallback-checksums';
import { LLM_MODELS } from '@/constants/models';
import { llmDownloadAssets, whisperDownloadAssets } from '@/services/download/model-assets';

import type { ModelGroupId } from '@/services/download/delete-model-assets';
import type { DownloadAssetId, ModelReadiness } from '@/types/download';
import type { LLMTier } from '@/types/device';

export type { ModelGroupId };

export type ModelStatusRow = {
  id: ModelGroupId;
  label: string;
  state: 'checking' | 'ready' | 'missing' | 'corrupt';
  detail?: string;
  canDelete: boolean;
};

export const LLM_STATUS_LABEL: Record<LLMTier, string> = {
  lite: 'Qwen3 0.6B (lite)',
  standard: 'Qwen3 1.7B (standard)',
  pro: 'Qwen3 4B (pro)',
};

export const MODEL_STATUS_COPY: Record<ModelStatusRow['state'], string> = {
  checking: 'Checking…',
  ready: 'Downloaded',
  missing: 'Not downloaded',
  corrupt: 'Corrupt / incomplete',
};

const formatBytes = (bytes: number): string => {
  if (bytes >= 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(1)} GB`;
  if (bytes >= 1_000_000) return `${Math.round(bytes / 1_000_000)} MB`;
  return `${Math.round(bytes / 1_000)} KB`;
};

const sizeDetail = (ids: DownloadAssetId[]): string | undefined => {
  const total = ids.reduce((sum, id) => sum + (FALLBACK_CHECKSUMS[id]?.size ?? 0), 0);
  return total > 0 ? `~${formatBytes(total)}` : undefined;
};

const groupState = (
  ids: DownloadAssetId[],
  readiness: ModelReadiness | null,
): ModelStatusRow['state'] => {
  if (!readiness) return 'checking';
  if (ids.some((id) => readiness.corrupt.includes(id))) return 'corrupt';
  if (ids.some((id) => readiness.missing.includes(id))) return 'missing';
  return 'ready';
};

export const buildModelStatusRows = (
  tier: LLMTier,
  readiness: ModelReadiness | null,
): ModelStatusRow[] => {
  const whisper = whisperDownloadAssets();
  const llm = llmDownloadAssets(tier);
  const whisperIds = whisper.success ? whisper.data.map((a) => a.id) : [];
  const llmIds = llm.success ? llm.data.map((a) => a.id) : [];

  const whisperState = groupState(whisperIds, readiness);
  const llmState = groupState(llmIds, readiness);

  return [
    {
      id: 'whisper',
      label: 'Whisper Tiny (STT)',
      state: whisperState,
      detail: sizeDetail(whisperIds),
      // Idempotent: useful for re-testing download even when status is missing.
      canDelete: whisperState !== 'checking',
    },
    {
      id: 'llm',
      label: LLM_STATUS_LABEL[tier],
      state: llmState,
      detail: [LLM_MODELS[tier].modelName, sizeDetail(llmIds)].filter(Boolean).join(' · '),
      canDelete: llmState !== 'checking',
    },
  ];
};
