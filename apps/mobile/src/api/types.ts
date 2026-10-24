import type { Album, Artist, Playlist, Profile, Track } from '@ordyx/shared';

export type ArtistRef = Pick<Artist, 'id' | 'name' | 'slug' | 'image_path'>;

export type TrackListItem = Pick<
  Track,
  | 'id'
  | 'title'
  | 'duration_ms'
  | 'cover_path'
  | 'audio_path'
  | 'artist_id'
  | 'owner_id'
  | 'status'
  | 'play_count'
  | 'like_count'
  | 'comment_count'
  | 'is_demo'
  | 'is_explicit'
  | 'published_at'
> & { artist: ArtistRef | null };

export type TrackDetail = TrackListItem &
  Pick<Track, 'description' | 'license' | 'rights_holder' | 'genre_id' | 'review_note' | 'release_date'> & {
    genre: { id: number; name: string } | null;
  };

export type PlaylistSummary = Pick<
  Playlist,
  'id' | 'title' | 'description' | 'cover_path' | 'is_public' | 'track_count' | 'duration_ms' | 'owner_id' | 'updated_at' | 'save_count'
> & { owner: Pick<Profile, 'id' | 'username' | 'display_name'> | null };

export type PlaylistItem = { id: number; position: number; added_at: string; track: TrackListItem };

export type AlbumSummary = Pick<Album, 'id' | 'title' | 'cover_path' | 'release_date' | 'artist_id' | 'status'> & {
  artist: ArtistRef | null;
};

export type ProfileSummary = Pick<
  Profile,
  'id' | 'username' | 'display_name' | 'avatar_path' | 'bio' | 'follower_count' | 'following_count' | 'created_at' | 'status'
>;

export const TRACK_FIELDS =
  'id,title,duration_ms,cover_path,audio_path,artist_id,owner_id,status,play_count,like_count,comment_count,is_demo,is_explicit,published_at,artist:artists(id,name,slug,image_path)';

export const TRACK_DETAIL_FIELDS = `${TRACK_FIELDS},description,license,rights_holder,genre_id,review_note,release_date,genre:genres(id,name)`;

export const PLAYLIST_FIELDS =
  'id,title,description,cover_path,is_public,track_count,duration_ms,owner_id,updated_at,save_count,owner:profiles(id,username,display_name)';

export const ALBUM_FIELDS = 'id,title,cover_path,release_date,artist_id,status,artist:artists(id,name,slug,image_path)';

export const PROFILE_FIELDS = 'id,username,display_name,avatar_path,bio,follower_count,following_count,created_at,status';
