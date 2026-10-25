import { formatCount } from '@ordyx/shared';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { getPublicPlaylistsOf } from '@/api/social';
import { formatDay } from '@/api/plus';
import { Artwork } from '@/components/Artwork';
import { Carousel } from '@/components/MediaCard';
import { PressableScale } from '@/components/motion';
import { LIST_BOTTOM_PADDING, Screen } from '@/components/Screen';
import { Badge, Button, Loading, SectionHeader, Text, type IconName } from '@/components/ui';
import { usePlus } from '@/hooks/usePlus';
import { imageUrl } from '@/lib/media';
import { useAuth } from '@/providers/AuthProvider';
import { colors, fonts, radius, spacing } from '@/theme';

export default function Me() {
  const { profile, roles, canUpload, isStaff } = useAuth();
  const plus = usePlus();
  const playlists = useQuery({
    queryKey: ['user', profile?.id, 'playlists'],
    queryFn: () => getPublicPlaylistsOf(profile!.id),
    enabled: !!profile,
  });
  if (!profile) return <Loading />;

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: LIST_BOTTOM_PADDING }}>
        <View style={styles.header}>
          <Artwork
            uri={imageUrl('avatars', profile.avatar_path)}
            size={96}
            rounded
            icon="person"
            seed={profile.id}
          />
          <Text variant="title">{profile.display_name || profile.username}</Text>
          <Text muted>@{profile.username}</Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {plus.isPlus ? <Badge label="Premium" /> : null}
            {roles.map((r) => (
              <Badge
                key={r}
                label={r === 'artist' ? 'Artista' : r === 'admin' ? 'Administración' : 'Moderación'}
              />
            ))}
          </View>
          <View style={styles.stats}>
            <Text
              onPress={() =>
                router.push({
                  pathname: '/user/[username]/follows',
                  params: { username: profile.username, kind: 'followers' },
                })
              }
            >
              <Text variant="bodyStrong">{formatCount(profile.follower_count)}</Text>{' '}
              <Text muted>seguidores</Text>
            </Text>
            <Text
              onPress={() =>
                router.push({
                  pathname: '/user/[username]/follows',
                  params: { username: profile.username, kind: 'following' },
                })
              }
            >
              <Text variant="bodyStrong">{formatCount(profile.following_count)}</Text>{' '}
              <Text muted>siguiendo</Text>
            </Text>
          </View>
          {profile.bio ? <Text style={{ textAlign: 'center' }}>{profile.bio}</Text> : null}
          <View style={styles.actions}>
            <Button
              label="Editar perfil"
              icon="create-outline"
              variant="secondary"
              compact
              onPress={() => router.push('/profile-edit')}
            />
            <Button
              label="Ajustes"
              icon="settings-outline"
              variant="secondary"
              compact
              onPress={() => router.push('/settings')}
            />
          </View>
          <Button
            label="Ver perfil público"
            variant="ghost"
            compact
            onPress={() => router.push(`/user/${profile.username}`)}
          />
        </View>

        <PressableScale
          scaleTo={0.98}
          onPress={() => router.push('/plus')}
          accessibilityRole="button"
          style={[styles.plus, plus.isPlus && styles.plusOn]}
        >
          <Text style={[styles.plusWord, plus.isPlus && { color: colors.onAccent }]}>Premium</Text>
          <Text style={{ color: plus.isPlus ? colors.onAccent : colors.text, flex: 1 }}>
            {plus.isPlus && plus.data?.expires_at
              ? `Activo hasta el ${formatDay(plus.data.expires_at)}`
              : plus.data?.pending_id
                ? 'Tu solicitud está en marcha'
                : 'Sonido original, descargas, letras y estadísticas'}
          </Text>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={plus.isPlus ? colors.onAccent : colors.textMuted}
          />
        </PressableScale>

        <View style={styles.tiles}>
          <Tile icon="stats-chart" label="Estadísticas" onPress={() => router.push('/stats')} />
          <Tile
            icon="arrow-down-circle"
            label="Descargas"
            onPress={() => router.push('/downloads')}
          />
          <Tile icon="time" label="Historial" onPress={() => router.push('/history')} />
          <Tile icon="notifications" label="Avisos" onPress={() => router.push('/notifications')} />
        </View>

        {isStaff ? (
          <PressableScale
            scaleTo={0.98}
            onPress={() => router.push('/owner')}
            accessibilityRole="button"
            accessibilityLabel="Panel del propietario"
            style={styles.owner}
          >
            <View style={styles.ownerIcon}>
              <Ionicons name="shield-checkmark" size={22} color={colors.onAccent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong">Panel del propietario</Text>
              <Text variant="caption" muted>
                Pagos de Premium, canciones por revisar, usuarios y configuración
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </PressableScale>
        ) : null}

        <SectionHeader title="Estudio de artista" />
        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
          {canUpload ? (
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Button
                  label="Mis canciones"
                  icon="cloud-upload-outline"
                  onPress={() => router.push('/studio')}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  label="Estadísticas"
                  icon="bar-chart-outline"
                  variant="secondary"
                  onPress={() => router.push('/studio/stats')}
                />
              </View>
            </View>
          ) : (
            <>
              <Text muted>
                Publicar tu música es parte de Aurevix Premium: creas tu perfil de artista, subes
                tus canciones y ves cuánta gente las escucha.
              </Text>
              <Button
                label="Subir mi música con Premium"
                icon="sparkles"
                variant="secondary"
                onPress={() => router.push('/plus')}
              />
            </>
          )}
        </View>

        {(playlists.data?.length ?? 0) > 0 ? (
          <>
            <SectionHeader title="Tus playlists públicas" />
            <Carousel
              items={playlists.data!.map((p) => ({
                id: p.id,
                title: p.title,
                subtitle: `${p.track_count} canciones`,
                imageUrl: imageUrl('playlist-images', p.cover_path),
                icon: 'list',
                onPress: () => router.push(`/playlist/${p.id}`),
              }))}
              size={132}
            />
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function Tile({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={styles.tile}
    >
      <Ionicons name={icon} size={22} color={colors.accent} />
      <Text variant="caption" style={{ fontFamily: fonts.bodyStrong }}>
        {label}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  plus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(200,245,96,0.35)',
    backgroundColor: 'rgba(200,245,96,0.06)',
  },
  plusOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  plusWord: {
    fontFamily: fonts.displayHeavy,
    fontSize: 26,
    letterSpacing: -1,
    color: colors.accent,
  },
  owner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  ownerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tiles: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  tile: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  header: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  stats: { flexDirection: 'row', gap: spacing.xl, marginTop: spacing.xs },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
});
