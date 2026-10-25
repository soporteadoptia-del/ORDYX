import Ionicons from '@expo/vector-icons/Ionicons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Platform, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import {
  getActivePremiumCount,
  getOwnerSettings,
  getOwnerStats,
  getPendingPayments,
  getPendingTracks,
  grantPremium,
  OWNER_SETTINGS,
  reviewPayment,
  reviewTrack,
  saveOwnerSetting,
  searchUsers,
  setExternalHidden,
  setUserSuspended,
  type OwnerSettingKey,
  type OwnerUser,
} from '@/api/owner';
import { getCommunityTracks } from '@/api/community';
import { formatEuros } from '@/api/plus';
import { Artwork } from '@/components/Artwork';
import { PressableScale } from '@/components/motion';
import { LIST_BOTTOM_PADDING } from '@/components/Screen';
import { useToast } from '@/components/Toast';
import {
  Badge,
  Button,
  Chip,
  EmptyState,
  ErrorState,
  Loading,
  Text,
  TextField,
} from '@/components/ui';
import { toUserMessage } from '@/lib/errors';
import { imageUrl } from '@/lib/media';
import { playList } from '@/player/play';
import { useAuth } from '@/providers/AuthProvider';
import { colors, fonts, radius, spacing } from '@/theme';

type Tab = 'today' | 'payments' | 'tracks' | 'users' | 'settings';
const TABS: { key: Tab; label: string }[] = [
  { key: 'today', label: 'Hoy' },
  { key: 'payments', label: 'Pagos' },
  { key: 'tracks', label: 'Canciones' },
  { key: 'users', label: 'Usuarios' },
  { key: 'settings', label: 'Ajustes' },
];

/** Confirmación que funciona en el móvil y en la versión web (Alert no tiene botones en la web). */
function confirm(title: string, message: string, ok: string, onOk: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onOk();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancelar', style: 'cancel' },
    { text: ok, onPress: onOk },
  ]);
}

/**
 * Panel del propietario: lo urgente del día a un toque desde «Yo». Aprobar pagos de Bizum,
 * revisar canciones, regalar Premium, suspender cuentas y cambiar el precio o el aviso de la app.
 * Para todo lo demás (denuncias, géneros, versiones, auditoría) está el panel completo en web.
 */
export default function OwnerScreen() {
  const { isStaff, isAdmin } = useAuth();
  const [tab, setTab] = useState<Tab>('today');
  const qc = useQueryClient();
  const stats = useQuery({
    queryKey: ['owner', 'stats'],
    queryFn: getOwnerStats,
    enabled: isStaff,
  });
  const premium = useQuery({
    queryKey: ['owner', 'premium'],
    queryFn: getActivePremiumCount,
    enabled: isAdmin,
  });
  const payments = useQuery({
    queryKey: ['owner', 'payments'],
    queryFn: getPendingPayments,
    enabled: isAdmin,
  });

  if (!isStaff)
    return (
      <EmptyState
        icon="lock-closed-outline"
        title="Solo para el equipo de Aurevix"
        message="Este panel es para la administración y la moderación."
      />
    );

  const refreshing = stats.isRefetching || payments.isRefetching;
  const tabs = isAdmin ? TABS : TABS.filter((t) => t.key === 'today' || t.key === 'tracks');

  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: LIST_BOTTOM_PADDING + spacing.xxl }}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          tintColor={colors.accent}
          onRefresh={() => void qc.invalidateQueries({ queryKey: ['owner'] })}
        />
      }
    >
      <Stack.Screen options={{ title: 'Panel del propietario' }} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabs}
      >
        {tabs.map((t) => (
          <Chip
            key={t.key}
            label={
              t.key === 'payments' && payments.data?.length
                ? `${t.label} · ${payments.data.length}`
                : t.key === 'tracks' && stats.data?.tracks_pending
                  ? `${t.label} · ${stats.data.tracks_pending}`
                  : t.label
            }
            selected={tab === t.key}
            onPress={() => setTab(t.key)}
          />
        ))}
      </ScrollView>

      {tab === 'today' ? (
        stats.isLoading ? (
          <Loading />
        ) : stats.error || !stats.data ? (
          <ErrorState message={toUserMessage(stats.error)} onRetry={() => void stats.refetch()} />
        ) : (
          <>
            <View style={styles.hero}>
              <Text style={styles.big}>{stats.data.valid_plays_1d}</Text>
              <Text variant="heading" style={{ color: colors.onAccent }}>
                escuchas en las últimas 24 h
              </Text>
              <View style={styles.heroRow}>
                <Figure value={stats.data.active_users_1d} label="oyentes hoy" />
                <Figure value={stats.data.active_users_7d} label="oyentes en 7 días" />
              </View>
            </View>
            <View style={styles.grid}>
              <Stat
                icon="people"
                value={stats.data.users_total}
                label={`usuarios · ${stats.data.users_new_7d} nuevos esta semana`}
              />
              {isAdmin ? (
                <Stat icon="sparkles" value={premium.data ?? 0} label="con Premium ahora" />
              ) : null}
              <Stat
                icon="card"
                value={payments.data?.length ?? 0}
                label="Bizum por confirmar"
                alert={(payments.data?.length ?? 0) > 0}
                onPress={isAdmin ? () => setTab('payments') : undefined}
              />
              <Stat
                icon="musical-notes"
                value={stats.data.tracks_pending}
                label="canciones por revisar"
                alert={stats.data.tracks_pending > 0}
                onPress={() => setTab('tracks')}
              />
              <Stat icon="disc" value={stats.data.tracks_published} label="canciones publicadas" />
              <Stat
                icon="flag"
                value={stats.data.reports_open + stats.data.rights_claims_open}
                label="denuncias abiertas (panel web)"
                alert={stats.data.reports_open + stats.data.rights_claims_open > 0}
              />
            </View>
            <View style={styles.note}>
              <Ionicons name="desktop-outline" size={20} color={colors.textMuted} />
              <Text variant="caption" muted style={{ flex: 1 }}>
                Denuncias, géneros, versiones de la app, errores y auditoría están en el panel
                completo para ordenador.
              </Text>
            </View>
          </>
        )
      ) : null}

      {tab === 'payments' ? <Payments /> : null}
      {tab === 'tracks' ? <Tracks /> : null}
      {tab === 'tracks' ? <Community /> : null}
      {tab === 'users' ? <Users /> : null}
      {tab === 'settings' ? <Settings /> : null}
    </ScrollView>
  );
}

function Payments() {
  const qc = useQueryClient();
  const toast = useToast();
  const payments = useQuery({ queryKey: ['owner', 'payments'], queryFn: getPendingPayments });
  const review = useMutation({
    mutationFn: (v: { id: string; approve: boolean }) =>
      reviewPayment(v.id, v.approve, v.approve ? 'Bizum recibido' : 'No hemos encontrado el Bizum'),
    onSuccess: (_d, v) => {
      toast.show(v.approve ? 'Premium activado' : 'Pago rechazado', 'success');
      void qc.invalidateQueries({ queryKey: ['owner'] });
    },
    onError: (e) => toast.show(toUserMessage(e), 'error'),
  });

  if (payments.isLoading) return <Loading />;
  if (payments.error)
    return (
      <ErrorState message={toUserMessage(payments.error)} onRetry={() => void payments.refetch()} />
    );
  if (!payments.data?.length)
    return (
      <EmptyState
        icon="checkmark-done-circle-outline"
        title="No hay Bizum pendientes"
        message="Cuando alguien pida Premium aparecerá aquí con su código."
      />
    );

  return (
    <View style={styles.list}>
      <Text variant="caption" muted>
        Busca en tu banco un Bizum con este código en el concepto. Si está, confírmalo y Premium se
        activa al momento.
      </Text>
      {payments.data.map((p) => (
        <View key={p.id} style={styles.card}>
          <View style={styles.cardTop}>
            <Text style={styles.ref}>{p.reference}</Text>
            <Text variant="bodyStrong">{formatEuros(p.amount_cents)}</Text>
          </View>
          <Text muted>
            {p.user?.display_name || p.user?.username || 'Usuario'} · @{p.user?.username} ·{' '}
            {new Date(p.created_at).toLocaleString('es-ES', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
          {p.payer_note ? <Text variant="caption">«{p.payer_note}»</Text> : null}
          <View style={styles.actions}>
            <View style={{ flex: 1 }}>
              <Button
                label="Bizum recibido"
                icon="checkmark"
                compact
                disabled={review.isPending}
                onPress={() =>
                  confirm(
                    `¿Activar Premium con ${p.reference}?`,
                    'Hazlo solo si el Bizum está en tu cuenta.',
                    'Activar',
                    () => review.mutate({ id: p.id, approve: true }),
                  )
                }
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                label="No ha llegado"
                variant="secondary"
                compact
                disabled={review.isPending}
                onPress={() =>
                  confirm(
                    `¿Rechazar ${p.reference}?`,
                    'Le diremos que no encontramos el Bizum; podrá pedirlo de nuevo.',
                    'Rechazar',
                    () => review.mutate({ id: p.id, approve: false }),
                  )
                }
              />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

function Tracks() {
  const qc = useQueryClient();
  const toast = useToast();
  const tracks = useQuery({ queryKey: ['owner', 'tracks'], queryFn: getPendingTracks });
  const review = useMutation({
    mutationFn: (v: { id: string; decision: 'publish' | 'reject' }) =>
      reviewTrack(
        v.id,
        v.decision,
        v.decision === 'reject' ? 'No cumple las condiciones de publicación' : undefined,
      ),
    onSuccess: (_d, v) => {
      toast.show(v.decision === 'publish' ? 'Canción publicada' : 'Canción rechazada', 'success');
      void qc.invalidateQueries({ queryKey: ['owner'] });
    },
    onError: (e) => toast.show(toUserMessage(e), 'error'),
  });

  if (tracks.isLoading) return <Loading />;
  if (tracks.error)
    return (
      <ErrorState message={toUserMessage(tracks.error)} onRetry={() => void tracks.refetch()} />
    );
  if (!tracks.data?.length)
    return (
      <EmptyState
        icon="musical-notes-outline"
        title="Nada por revisar"
        message="Las canciones nuevas de los artistas aparecerán aquí antes de publicarse."
      />
    );

  return (
    <View style={styles.list}>
      {tracks.data.map((t, i) => (
        <View key={t.id} style={styles.card}>
          <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
            <Artwork uri={imageUrl('covers', t.cover_path)} size={56} seed={t.id} />
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong" numberOfLines={1}>
                {t.title}
              </Text>
              <Text muted numberOfLines={1}>
                {t.artist?.name ?? 'Artista'}
              </Text>
            </View>
            {t.audio_path ? (
              <Button
                label="Escuchar"
                icon="play"
                variant="secondary"
                compact
                onPress={() => void playList(tracks.data!, i, { type: 'queue' })}
              />
            ) : (
              <Badge label="Sin audio" tone="warning" />
            )}
          </View>
          <View style={styles.actions}>
            <View style={{ flex: 1 }}>
              <Button
                label="Publicar"
                icon="checkmark"
                compact
                disabled={review.isPending || !t.audio_path}
                onPress={() => review.mutate({ id: t.id, decision: 'publish' })}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                label="Rechazar"
                variant="secondary"
                compact
                disabled={review.isPending}
                onPress={() =>
                  confirm(
                    `¿Rechazar «${t.title}»?`,
                    'El artista recibirá un aviso.',
                    'Rechazar',
                    () => review.mutate({ id: t.id, decision: 'reject' }),
                  )
                }
              />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

/** Lo importado por la comunidad: se puede ocultar si no debe estar (por ejemplo, una denuncia). */
function Community() {
  const qc = useQueryClient();
  const toast = useToast();
  const list = useQuery({
    queryKey: ['owner', 'community'],
    queryFn: () => getCommunityTracks(40),
  });
  const hide = useMutation({
    mutationFn: (id: string) => setExternalHidden(id, true),
    onSuccess: () => {
      toast.show('Oculta para todo el mundo', 'success');
      void qc.invalidateQueries({ queryKey: ['owner', 'community'] });
      void qc.invalidateQueries({ queryKey: ['home', 'community'] });
    },
    onError: (e) => toast.show(toUserMessage(e), 'error'),
  });
  if (!list.data?.length) return null;
  return (
    <View style={[styles.list, { marginTop: spacing.xl }]}>
      <Text variant="heading">Importado por la comunidad</Text>
      {list.data.map((t) => (
        <View key={t.id} style={[styles.card, { flexDirection: 'row', alignItems: 'center' }]}>
          <Artwork uri={t.cover_url} size={44} seed={t.id} />
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong" numberOfLines={1}>
              {t.title}
            </Text>
            <Text variant="caption" muted numberOfLines={1}>
              {t.source} · {t.artist ?? '—'} · {t.import_count} importaciones
            </Text>
          </View>
          <Button
            label="Ocultar"
            variant="ghost"
            compact
            disabled={hide.isPending}
            onPress={() =>
              confirm(
                `¿Ocultar «${t.title}»?`,
                'Dejará de verse en Inicio y en el buscador.',
                'Ocultar',
                () => hide.mutate(t.id),
              )
            }
          />
        </View>
      ))}
    </View>
  );
}

function Users() {
  const qc = useQueryClient();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setQuery(q.trim()), 300);
    return () => clearTimeout(id);
  }, [q]);
  const users = useQuery({
    queryKey: ['owner', 'users', query],
    queryFn: () => searchUsers(query),
  });
  const run = useMutation({
    mutationFn: async (v: { user: OwnerUser; action: 'gift' | 'suspend' | 'restore' }) => {
      if (v.action === 'gift') return grantPremium(v.user.id, 1);
      return setUserSuspended(v.user.id, v.action === 'suspend');
    },
    onSuccess: (_d, v) => {
      toast.show(
        v.action === 'gift'
          ? `Un mes de Premium para @${v.user.username}`
          : v.action === 'suspend'
            ? 'Cuenta suspendida'
            : 'Cuenta reactivada',
        'success',
      );
      void qc.invalidateQueries({ queryKey: ['owner'] });
    },
    onError: (e) => toast.show(toUserMessage(e), 'error'),
  });

  return (
    <View style={styles.list}>
      <TextField
        label="Buscar por nombre, usuario o correo"
        value={q}
        onChangeText={setQ}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="p. ej. maria"
      />
      {users.isLoading ? (
        <Loading />
      ) : users.error ? (
        <ErrorState message={toUserMessage(users.error)} onRetry={() => void users.refetch()} />
      ) : (
        users.data?.map((u) => (
          <View key={u.id} style={styles.card}>
            <View style={styles.cardTop}>
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong" numberOfLines={1}>
                  {u.display_name || u.username}
                </Text>
                <Text variant="caption" muted numberOfLines={1}>
                  @{u.username}
                  {u.email ? ` · ${u.email}` : ''}
                </Text>
              </View>
              {u.status !== 'active' ? <Badge label="Suspendida" tone="danger" /> : null}
              {u.roles?.includes('admin') ? <Badge label="Admin" /> : null}
            </View>
            <View style={styles.actions}>
              <View style={{ flex: 1 }}>
                <Button
                  label="Regalar 1 mes"
                  icon="gift-outline"
                  variant="secondary"
                  compact
                  disabled={run.isPending}
                  onPress={() =>
                    confirm(
                      `¿Regalar Premium a @${u.username}?`,
                      'Se suma un mes a su plan y le llega un aviso.',
                      'Regalar',
                      () => run.mutate({ user: u, action: 'gift' }),
                    )
                  }
                />
              </View>
              {u.roles?.includes('admin') ? null : (
                <View style={{ flex: 1 }}>
                  <Button
                    label={u.status === 'active' ? 'Suspender' : 'Reactivar'}
                    variant="ghost"
                    compact
                    disabled={run.isPending}
                    onPress={() =>
                      confirm(
                        u.status === 'active'
                          ? `¿Suspender a @${u.username}?`
                          : `¿Reactivar a @${u.username}?`,
                        u.status === 'active'
                          ? 'No podrá entrar ni publicar hasta que la reactives.'
                          : 'Volverá a poder usar Aurevix con normalidad.',
                        u.status === 'active' ? 'Suspender' : 'Reactivar',
                        () =>
                          run.mutate({
                            user: u,
                            action: u.status === 'active' ? 'suspend' : 'restore',
                          }),
                      )
                    }
                  />
                </View>
              )}
            </View>
          </View>
        ))
      )}
    </View>
  );
}

function Settings() {
  const settings = useQuery({ queryKey: ['owner', 'settings'], queryFn: getOwnerSettings });
  if (settings.isLoading) return <Loading />;
  if (settings.error || !settings.data)
    return (
      <ErrorState message={toUserMessage(settings.error)} onRetry={() => void settings.refetch()} />
    );
  return <SettingsForm initial={settings.data} />;
}

function SettingsForm({ initial }: { initial: Record<string, unknown> }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [draft, setDraft] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      OWNER_SETTINGS.map((s) => {
        const v = initial[s.key];
        return [s.key, typeof v === 'string' || typeof v === 'number' ? String(v) : ''];
      }),
    ),
  );
  const save = useMutation({
    mutationFn: (key: OwnerSettingKey) => saveOwnerSetting(key, draft[key] ?? ''),
    onSuccess: () => {
      toast.show('Guardado. La app lo usa desde ya.', 'success');
      void qc.invalidateQueries({ queryKey: ['owner', 'settings'] });
      void qc.invalidateQueries({ queryKey: ['plus', 'offer'] });
      void qc.invalidateQueries({ queryKey: ['app', 'notice'] });
    },
    onError: (e) => toast.show(toUserMessage(e), 'error'),
  });

  return (
    <View style={styles.list}>
      {OWNER_SETTINGS.map((s) => (
        <View key={s.key} style={styles.card}>
          <TextField
            label={s.label}
            value={draft[s.key] ?? ''}
            onChangeText={(v) => setDraft((d) => ({ ...d, [s.key]: v }))}
            keyboardType={s.kind === 'number' ? 'number-pad' : 'default'}
            autoCapitalize="none"
            multiline={s.kind === 'nullable-text'}
          />
          {s.key === 'plus_monthly_price_cents' && Number(draft[s.key]) > 0 ? (
            <Text variant="caption" muted>
              = {formatEuros(Number(draft[s.key]))} al mes
            </Text>
          ) : null}
          <Button
            label="Guardar"
            compact
            variant="secondary"
            disabled={save.isPending}
            onPress={() => save.mutate(s.key)}
          />
        </View>
      ))}
    </View>
  );
}

function Figure({ value, label }: { value: number; label: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.figure}>{value}</Text>
      <Text variant="caption" style={{ color: colors.onAccent, opacity: 0.75 }}>
        {label}
      </Text>
    </View>
  );
}

function Stat({
  icon,
  value,
  label,
  alert,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  value: number;
  label: string;
  alert?: boolean;
  onPress?: () => void;
}) {
  const body = (
    <>
      <Ionicons name={icon} size={18} color={alert ? colors.accent : colors.textMuted} />
      <Text style={styles.statValue}>{value}</Text>
      <Text variant="caption" muted>
        {label}
      </Text>
    </>
  );
  return onPress ? (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${value} ${label}`}
      style={[styles.stat, alert && styles.statAlert]}
    >
      {body}
    </PressableScale>
  ) : (
    <View style={[styles.stat, alert && styles.statAlert]} accessibilityLabel={`${value} ${label}`}>
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  hero: {
    marginHorizontal: spacing.lg,
    padding: spacing.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.accent,
  },
  big: {
    fontFamily: fonts.displayHeavy,
    fontSize: 64,
    lineHeight: 68,
    letterSpacing: -3,
    color: colors.onAccent,
  },
  heroRow: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.lg },
  figure: { fontFamily: fonts.display, fontSize: 26, color: colors.onAccent },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  stat: {
    flexBasis: '47%',
    flexGrow: 1,
    gap: 2,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  statAlert: { borderColor: 'rgba(200,245,96,0.45)' },
  statValue: { fontFamily: fonts.display, fontSize: 26, color: colors.text },
  note: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  list: { paddingHorizontal: spacing.lg, gap: spacing.md },
  card: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  ref: { flex: 1, fontFamily: fonts.mono, fontSize: 18, color: colors.accent },
  actions: { flexDirection: 'row', gap: spacing.sm },
});
