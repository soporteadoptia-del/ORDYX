import type {
  INSTALL_METHODS,
  PLATFORMS,
  RELEASE_CHANNELS,
  RELEASE_STATUSES,
  REPORT_REASONS,
  REPORT_TARGETS,
  TRACK_LICENSES,
  TRACK_STATUSES,
} from './constants';

/**
 * Tipos de dominio que reflejan las tablas de `supabase/migrations`.
 * Cuando el proyecto esté enlazado, puedes generar tipos exhaustivos con
 * `pnpm supabase gen types typescript --linked > packages/shared/src/database.gen.ts`.
 */
export type UUID = string;
export type ISODate = string;

export type TrackStatus = (typeof TRACK_STATUSES)[number];
export type ReportReason = (typeof REPORT_REASONS)[number];
export type ReportTarget = (typeof REPORT_TARGETS)[number];
export type TrackLicense = (typeof TRACK_LICENSES)[number];
export type Platform = (typeof PLATFORMS)[number];
export type ReleaseChannel = (typeof RELEASE_CHANNELS)[number];
export type ReleaseStatus = (typeof RELEASE_STATUSES)[number];
export type InstallMethod = (typeof INSTALL_METHODS)[number];
export type AppRole = 'artist' | 'moderator' | 'admin';
export type AccountStatus = 'active' | 'suspended';

export interface Profile {
  id: UUID;
  username: string;
  display_name: string | null;
  avatar_path: string | null;
  bio: string | null;
  status: AccountStatus;
  follower_count: number;
  following_count: number;
  created_at: ISODate;
  updated_at: ISODate;
}

export interface UserSettings {
  user_id: UUID;
  show_likes_public: boolean;
  show_history_public: boolean;
  allow_explicit: boolean;
  email_notifications: boolean;
  updated_at: ISODate;
}

export interface Artist {
  id: UUID;
  slug: string;
  name: string;
  image_path: string | null;
  bio: string | null;
  links: Record<string, string>;
  is_verified: boolean;
  follower_count: number;
  created_by: UUID | null;
  created_at: ISODate;
  updated_at: ISODate;
}

export interface Genre {
  id: number;
  slug: string;
  name: string;
}

export interface Album {
  id: UUID;
  artist_id: UUID;
  title: string;
  cover_path: string | null;
  description: string | null;
  release_date: string | null;
  status: 'draft' | 'published' | 'removed';
  created_by: UUID;
  created_at: ISODate;
  updated_at: ISODate;
}

export interface Track {
  id: UUID;
  artist_id: UUID;
  owner_id: UUID;
  title: string;
  description: string | null;
  genre_id: number | null;
  cover_path: string | null;
  audio_path: string | null;
  audio_mime: string | null;
  audio_size_bytes: number | null;
  duration_ms: number | null;
  status: TrackStatus;
  license: TrackLicense;
  rights_holder: string | null;
  rights_confirmed_at: ISODate | null;
  is_explicit: boolean;
  is_demo: boolean;
  release_date: string | null;
  published_at: ISODate | null;
  review_note: string | null;
  play_count: number;
  like_count: number;
  comment_count: number;
  created_at: ISODate;
  updated_at: ISODate;
}

/** Canción con los datos mínimos necesarios para listarla y reproducirla. */
export interface TrackWithArtist extends Track {
  artist: Pick<Artist, 'id' | 'name' | 'slug' | 'image_path'> | null;
}

export interface Playlist {
  id: UUID;
  owner_id: UUID;
  title: string;
  description: string | null;
  cover_path: string | null;
  is_public: boolean;
  is_featured: boolean;
  track_count: number;
  duration_ms: number;
  created_at: ISODate;
  updated_at: ISODate;
}

export interface PlaylistTrack {
  id: number;
  playlist_id: UUID;
  track_id: UUID;
  position: number;
  added_by: UUID;
  added_at: ISODate;
}

export interface Comment {
  id: UUID;
  track_id: UUID;
  user_id: UUID;
  parent_id: UUID | null;
  body: string;
  timestamp_ms: number | null;
  is_hidden: boolean;
  created_at: ISODate;
  updated_at: ISODate;
}

export interface Report {
  id: UUID;
  reporter_id: UUID | null;
  target_type: ReportTarget;
  target_id: UUID;
  reason: ReportReason;
  details: string | null;
  status: 'open' | 'reviewing' | 'resolved' | 'dismissed';
  resolution_note: string | null;
  resolved_by: UUID | null;
  created_at: ISODate;
  updated_at: ISODate;
}

export interface NotificationRow {
  id: UUID;
  user_id: UUID;
  type: string;
  payload: Record<string, unknown>;
  read_at: ISODate | null;
  created_at: ISODate;
}

export interface AppVersion {
  id: UUID;
  platform: Platform;
  channel: ReleaseChannel;
  version: string;
  build_number: number;
  status: ReleaseStatus;
  install_method: InstallMethod;
  release_notes: string | null;
  min_os_version: string | null;
  download_url: string | null;
  storage_path: string | null;
  file_size_bytes: number | null;
  sha256: string | null;
  verified_at: ISODate | null;
  published_at: ISODate | null;
  withdrawn_at: ISODate | null;
  withdrawn_reason: string | null;
  created_at: ISODate;
}

export type SearchKind = 'track' | 'artist' | 'album' | 'playlist' | 'profile';

export interface SearchResult {
  kind: SearchKind;
  id: UUID;
  title: string;
  subtitle: string | null;
  image_path: string | null;
  rank: number;
}
