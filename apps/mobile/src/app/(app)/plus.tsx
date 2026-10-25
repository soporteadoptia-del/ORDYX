import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import {
  cancelPlusRequest,
  formatDay,
  formatEuros,
  formatPhone,
  getPaymentNote,
  requestPlus,
} from '@/api/plus';
import { LIST_BOTTOM_PADDING } from '@/components/Screen';
import { useToast } from '@/components/Toast';
import { Button, ErrorState, Loading, Text, type IconName } from '@/components/ui';
import { usePlus, usePlusOffer } from '@/hooks/usePlus';
import { toUserMessage } from '@/lib/errors';
import { colors, fonts, radius, spacing } from '@/theme';

/** Lo que incluye Plus. Cada ventaja existe de verdad en la app; ninguna es una promesa. */
export const PLUS_PERKS: { icon: IconName; title: string; text: string }[] = [
  {
    icon: 'pulse',
    title: 'Sonido máximo',
    text: 'Escuchas el archivo original que subió el artista, sin volver a comprimirlo.',
  },
  {
    icon: 'arrow-down-circle',
    title: 'Descargas sin conexión',
    text: 'Guarda canciones en el móvil y escúchalas en el metro, en el avión o sin datos.',
  },
  {
    icon: 'text',
    title: 'Letras que avanzan',
    text: 'La letra sigue a la canción línea a línea, y puedes tocar una línea para saltar ahí.',
  },
  {
    icon: 'stats-chart',
    title: 'Tus estadísticas',
    text: 'Minutos escuchados, tus canciones, artistas y géneros, y a qué hora escuchas más.',
  },
  {
    icon: 'speedometer',
    title: 'Velocidad a tu ritmo',
    text: 'De 0,75× a 2×, sin que las voces cambien de tono.',
  },
  {
    icon: 'sparkles',
    title: 'Insignia Plus',
    text: 'Una marca en tu perfil para que se vea que apoyas la música independiente.',
  },
];

export default function PlusScreen() {
  const qc = useQueryClient();
  const toast = useToast();
  const plus = usePlus();
  const offer = usePlusOffer();
  const pendingId = plus.data?.pending_id ?? null;
  const note = useQuery({
    queryKey: ['plus', 'note', pendingId],
    queryFn: () => getPaymentNote(pendingId!),
    enabled: !!pendingId,
  });
  const [busy, setBusy] = useState(false);

  if (plus.isLoading || offer.isLoading) return <Loading />;
  if (plus.error || !plus.data)
    return <ErrorState message={toUserMessage(plus.error)} onRetry={() => void plus.refetch()} />;

  const p = plus.data;
  const price = formatEuros(offer.data?.priceCents ?? 499);
  const phone = formatPhone(offer.data?.bizumPhone ?? '602708111');
  const paid = !!note.data;

  async function run(fn: () => Promise<unknown>, ok?: string) {
    setBusy(true);
    try {
      await fn();
      await qc.invalidateQueries({ queryKey: ['plus'] });
      if (ok) toast.show(ok, 'success');
    } catch (e) {
      toast.show(toUserMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: LIST_BOTTOM_PADDING + spacing.xxl }}>
      <Stack.Screen options={{ title: '' }} />
      <LinearGradient
        colors={['rgba(200,245,96,0.28)', 'rgba(185,140,255,0.10)', 'transparent']}
        style={styles.hero}
      >
        <Text style={styles.kicker}>Aurevix</Text>
        <Text style={styles.title} accessibilityRole="header">
          Plus
        </Text>
        {p.active && p.expires_at ? (
          <Text style={styles.lead}>
            Tienes Plus hasta el {formatDay(p.expires_at)}.
            {p.source === 'gift' ? ' Te lo hemos regalado nosotros.' : ''}
          </Text>
        ) : (
          <Text style={styles.lead}>
            Todo Aurevix sin límites por {price} al mes. Sin permanencia y sin renovación
            automática: pagas cada mes que lo quieras.
          </Text>
        )}
      </LinearGradient>

      <View style={styles.perks}>
        {PLUS_PERKS.map((perk) => (
          <View key={perk.title} style={styles.perk}>
            <View style={styles.perkIcon}>
              <Ionicons name={perk.icon} size={20} color={colors.onAccent} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="bodyStrong">{perk.title}</Text>
              <Text variant="caption" muted>
                {perk.text}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {p.active ? (
        <View style={styles.links}>
          <Button
            label="Ver mis estadísticas"
            icon="stats-chart"
            onPress={() => router.push('/stats')}
          />
          <Button
            label="Mis descargas"
            icon="arrow-down-circle-outline"
            variant="secondary"
            onPress={() => router.push('/downloads')}
          />
        </View>
      ) : null}

      {p.last_rejection_note && !pendingId ? (
        <View style={[styles.card, { borderColor: colors.danger }]}>
          <Text variant="bodyStrong">No hemos podido confirmar tu último Bizum</Text>
          <Text variant="caption" muted>
            {p.last_rejection_note}
          </Text>
        </View>
      ) : null}

      {pendingId && p.pending_reference ? (
        <View style={styles.card}>
          <Text variant="heading">{paid ? 'Comprobando tu Bizum' : 'Paga con Bizum'}</Text>
          {paid ? (
            <Text muted>
              Estamos comprobando el pago con el concepto {p.pending_reference}. Te avisaremos en
              Notificaciones en cuanto se active{p.active ? ' el mes extra' : ' Plus'}.
            </Text>
          ) : (
            <>
              <Step n={1} text="Abre Bizum en la app de tu banco." />
              <Step n={2}>
                <Text>
                  Envía{' '}
                  <Text variant="bodyStrong">{formatEuros(p.pending_amount_cents ?? 499)}</Text> al
                </Text>
                <Text selectable style={styles.code}>
                  {phone}
                </Text>
              </Step>
              <Step n={3}>
                <Text>Escribe este código en el concepto, tal cual:</Text>
                <Text selectable style={styles.code}>
                  {p.pending_reference}
                </Text>
              </Step>
              <Text variant="caption" muted>
                Con el código sabemos que el pago es tuyo. Mantén pulsado el número o el código para
                copiarlo.
              </Text>
              <Button
                label="Ya he enviado el Bizum"
                icon="checkmark-circle"
                loading={busy}
                onPress={() =>
                  void run(
                    () => requestPlus('Bizum enviado'),
                    'Recibido. Te avisaremos al confirmarlo.',
                  )
                }
              />
            </>
          )}
          <Button
            label="Cancelar la solicitud"
            variant="ghost"
            compact
            disabled={busy}
            onPress={() =>
              Alert.alert(
                'Cancelar la solicitud',
                paid
                  ? 'Si ya has enviado el Bizum, no canceles: escríbenos desde Ajustes → Ayuda y lo resolvemos.'
                  : '¿Seguro? Podrás pedir Plus de nuevo cuando quieras.',
                [
                  { text: 'Volver', style: 'cancel' },
                  {
                    text: 'Cancelar solicitud',
                    style: 'destructive',
                    onPress: () => void run(() => cancelPlusRequest(pendingId)),
                  },
                ],
              )
            }
          />
        </View>
      ) : (
        <View style={styles.cta}>
          <Button
            label={p.active ? `Añadir un mes por ${price}` : `Conseguir Plus por ${price}`}
            icon="sparkles"
            loading={busy}
            onPress={() => void run(() => requestPlus())}
          />
          <Text variant="caption" muted style={{ textAlign: 'center' }}>
            Te daremos un código para el concepto del Bizum. Plus se activa en cuanto confirmamos el
            pago y dura un mes desde ese momento
            {p.active ? ' (o desde que acabe el que tienes)' : ''}.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

function Step({ n, text, children }: { n: number; text?: string; children?: React.ReactNode }) {
  return (
    <View style={styles.step}>
      <View style={styles.stepN}>
        <Text style={styles.stepNText}>{n}</Text>
      </View>
      <View style={{ flex: 1, gap: spacing.xs }}>{text ? <Text>{text}</Text> : children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing.xxl },
  kicker: { fontFamily: fonts.display, fontSize: 22, color: colors.text },
  title: {
    fontFamily: fonts.displayHeavy,
    fontSize: 88,
    lineHeight: 88,
    letterSpacing: -4,
    color: colors.accent,
  },
  lead: {
    fontFamily: fonts.bodyMedium,
    fontSize: 17,
    lineHeight: 24,
    color: colors.text,
    marginTop: spacing.md,
  },
  perks: { paddingHorizontal: spacing.xl, gap: spacing.lg },
  perk: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  perkIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  links: { paddingHorizontal: spacing.xl, gap: spacing.sm, marginTop: spacing.xl },
  card: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    padding: spacing.xl,
    gap: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(200,245,96,0.3)',
    backgroundColor: colors.glass,
  },
  step: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  stepN: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepNText: { fontFamily: fonts.bodyStrong, fontSize: 13, color: colors.accent },
  code: {
    fontFamily: fonts.mono,
    fontSize: 24,
    letterSpacing: 1,
    color: colors.accent,
  },
  cta: { paddingHorizontal: spacing.xl, marginTop: spacing.xxl, gap: spacing.md },
});
