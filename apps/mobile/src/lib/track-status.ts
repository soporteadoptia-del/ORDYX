import type { TrackStatus } from '@ordyx/shared';

export const STATUS_TONE: Record<TrackStatus, 'accent' | 'warning' | 'success' | 'danger' | 'muted'> = {
  draft: 'muted',
  processing: 'accent',
  pending_review: 'warning',
  published: 'success',
  rejected: 'danger',
  removed: 'danger',
};
