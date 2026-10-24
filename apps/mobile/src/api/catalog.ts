import { LIMITS, type Genre, type SearchKind, type SearchResult } from '@ordyx/shared';
import { supabase } from '@/lib/supabase';
import { range, unwrap } from './client';
import {
  ALBUM_FIELDS,
  PLAYLIST_FIELDS,
  TRACK_DETAIL_FIELDS,
  TRACK_FIELDS,
  type AlbumSummary,
  type ArtistRef,
  type PlaylistSummary,
  type TrackDetail,
  type TrackListItem,
} from './types';

const published = () => supabase.from('tracks').select(TRACK_FIELDS).eq('status', 'published');

export async function getNewReleases(limit = 12): Promise<TrackListItem[]> {
  return unwrap(
    await published().order('published_at', { ascending: false }).limit(limit),
  ) as unknown as TrackListItem[];
}

export async function getPopularTracks(limit = 12): Promise<TrackListItem[]> {
  return unwrap(
    await published().order('play_count', { ascending: false }).limit(limit),
  ) as unknown as TrackListItem[];
}

/** Música independiente: lanzamientos recientes de artistas no verificados (comunidad). */
export async function getIndependentTracks(limit = 12): Promise<TrackListItem[]> {
  const rows = unwrap(
    await supabase
      .from('tracks')
      .select(
        TRACK_FIELDS.replace(
          'artist:artists(id,name,slug,image_path)',
          'artist:artists!inner(id,name,slug,image_path,is_verified)',
        ),
      )
      .eq('status', 'published')
      .eq('artist.is_verified', false)
      .order('published_at', { ascending: false })
      .limit(limit),
  );
  return rows as unknown as TrackListItem[];
}

export async function getTracksByGenre(genreId: number, page = 0): Promise<TrackListItem[]> {
  const [from, to] = range(page, LIMITS.pageSize);
  return unwrap(
    await published()
      .eq('genre_id', genreId)
      .order('play_count', { ascending: false })
      .range(from, to),
  ) as unknown as TrackListItem[];
}

export async function getTrack(id: string): Promise<TrackDetail> {
  return unwrap(
    await supabase.from('tracks').select(TRACK_DETAIL_FIELDS).eq('id', id).single(),
  ) as unknown as TrackDetail;
}

export async function getTracksByIds(ids: string[]): Promise<TrackListItem[]> {
  if (ids.length === 0) return [];
  const rows = unwrap(
    await supabase.from('tracks').select(TRACK_FIELDS).in('id', ids),
  ) as unknown as TrackListItem[];
  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids.map((id) => byId.get(id)).filter((t): t is TrackListItem => Boolean(t));
}

export type ArtistDetail = ArtistRef & {
  bio: string | null;
  links: Record<string, string>;
  is_verified: boolean;
  follower_count: number;
  created_by: string | null;
};

export async function getFeaturedArtists(limit = 12): Promise<ArtistDetail[]> {
  return unwrap(
    await supabase
      .from('artists')
      .select('id,name,slug,image_path,bio,links,is_verified,follower_count,created_by')
      .order('is_featured', { ascending: false })
      .order('follower_count', { ascending: false })
      .limit(limit),
  ) as ArtistDetail[];
}

export async function getArtist(id: string): Promise<ArtistDetail> {
  return unwrap(
    await supabase
      .from('artists')
      .select('id,name,slug,image_path,bio,links,is_verified,follower_count,created_by')
      .eq('id', id)
      .single(),
  ) as ArtistDetail;
}

export async function getArtistTracks(artistId: string): Promise<TrackListItem[]> {
  return unwrap(
    await published().eq('artist_id', artistId).order('play_count', { ascending: false }).limit(50),
  ) as unknown as TrackListItem[];
}

export async function getArtistAlbums(artistId: string): Promise<AlbumSummary[]> {
  return unwrap(
    await supabase
      .from('albums')
      .select(ALBUM_FIELDS)
      .eq('artist_id', artistId)
      .eq('status', 'published')
      .order('release_date', { ascending: false }),
  ) as unknown as AlbumSummary[];
}

export async function getPopularAlbums(limit = 12): Promise<AlbumSummary[]> {
  return unwrap(
    await supabase
      .from('albums')
      .select(ALBUM_FIELDS)
      .eq('status', 'published')
      .order('save_count', { ascending: false })
      .limit(limit),
  ) as unknown as AlbumSummary[];
}

export async function getAlbum(
  id: string,
): Promise<AlbumSummary & { description: string | null; tracks: TrackListItem[] }> {
  const album = unwrap(
    await supabase.from('albums').select(`${ALBUM_FIELDS},description`).eq('id', id).single(),
  ) as unknown as AlbumSummary & { description: string | null };
  const items = unwrap(
    await supabase
      .from('album_tracks')
      .select(`position,track:tracks(${TRACK_FIELDS})`)
      .eq('album_id', id)
      .order('position'),
  ) as unknown as { position: number; track: TrackListItem | null }[];
  return {
    ...album,
    tracks: items.map((i) => i.track).filter((t): t is TrackListItem => t !== null),
  };
}

export async function getFeaturedPlaylists(limit = 12): Promise<PlaylistSummary[]> {
  return unwrap(
    await supabase
      .from('playlists')
      .select(PLAYLIST_FIELDS)
      .eq('is_public', true)
      .gt('track_count', 0)
      .order('is_featured', { ascending: false })
      .order('save_count', { ascending: false })
      .limit(limit),
  ) as unknown as PlaylistSummary[];
}

export async function getGenres(): Promise<Genre[]> {
  return unwrap(
    await supabase.from('genres').select('id,slug,name').order('sort_order'),
  ) as Genre[];
}

export async function searchCatalog(
  query: string,
  kind: SearchKind | null,
  page: number,
): Promise<SearchResult[]> {
  return unwrap(
    await supabase.rpc('search_catalog', {
      p_query: query,
      p_kind: kind,
      p_limit: LIMITS.pageSize,
      p_offset: page * LIMITS.pageSize,
    }),
  ) as SearchResult[];
}
