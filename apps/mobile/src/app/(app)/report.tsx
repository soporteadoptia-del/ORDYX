import {
  firstError,
  REPORT_REASON_LABELS,
  REPORT_REASONS,
  reportSchema,
  type ReportReason,
  type ReportTarget,
} from '@ordyx/shared';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { submitReport } from '@/api/social';
import { useToast } from '@/components/Toast';
import { Button, Chip, Text, TextField } from '@/components/ui';
import { env } from '@/lib/env';
import { toUserMessage } from '@/lib/errors';
import { colors, spacing } from '@/theme';

export default function Report() {
  const { type, id, label } = useLocalSearchParams<{
    type: ReportTarget;
    id: string;
    label?: string;
  }>();
  const toast = useToast();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [sending, setSending] = useState(false);

  async function send() {
    const parsed = reportSchema.safeParse({
      target_type: type,
      target_id: id,
      reason,
      details: details.trim() || null,
    });
    if (!parsed.success)
      return toast.show(reason ? firstError(parsed.error) : 'Elige un motivo', 'error');
    setSending(true);
    try {
      await submitReport(parsed.data);
      toast.show('Denuncia enviada. La revisaremos lo antes posible.', 'success');
      router.back();
    } catch (e) {
      toast.show(toUserMessage(e), 'error');
    } finally {
      setSending(false);
    }
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.xl, gap: spacing.lg }}
    >
      <Text variant="title">¿Qué ocurre con {label ?? 'este contenido'}?</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {REPORT_REASONS.map((r) => (
          <Chip
            key={r}
            label={REPORT_REASON_LABELS[r]}
            selected={reason === r}
            onPress={() => setReason(r)}
          />
        ))}
      </View>
      {reason === 'copyright' ? (
        <Text muted variant="caption">
          Si eres titular de los derechos, usa también el formulario de reclamación de derechos para
          que podamos tramitarla formalmente.{' '}
          <Text
            variant="caption"
            style={{ color: colors.accentStrong }}
            onPress={() => WebBrowser.openBrowserAsync(`${env.webUrl}/derechos`)}
          >
            Abrir formulario
          </Text>
        </Text>
      ) : null}
      <TextField
        label="Detalles (opcional)"
        value={details}
        onChangeText={setDetails}
        multiline
        maxLength={2000}
        style={{ minHeight: 110, textAlignVertical: 'top' }}
      />
      <Button label="Enviar denuncia" onPress={send} loading={sending} disabled={!reason} />
    </ScrollView>
  );
}
