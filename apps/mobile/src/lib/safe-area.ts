import { Platform } from 'react-native';

/**
 * Margen inferior seguro. En el móvil usa el inset nativo; en la versión web (iPhone instalado
 * desde Safari) lo calcula el propio navegador con `env(safe-area-inset-bottom)`, porque ahí los
 * insets de JavaScript llegan a cero. `tight` resta parte del hueco de la barra de inicio, para
 * que la barra de pestañas no deje una franja vacía debajo.
 */
export function safeBottom(nativeInset: number, extra: number, tight = 0): number {
  if (Platform.OS !== 'web') return Math.max(extra, nativeInset - tight + extra);
  return `max(${extra}px, calc(env(safe-area-inset-bottom) - ${tight}px + ${extra}px))` as unknown as number;
}
