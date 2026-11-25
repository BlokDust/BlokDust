// The few private members of v1's ported classes (generated, never edited) that the scene reads or
// sets: one typed view each.
import type { DisplayContext } from '../shim.ts';
import type { MessagePanel } from '../ported/UI/MessagePanel';
import type { SharePanel } from '../ported/UI/SharePanel';
import type { ZoomButtons } from '../ported/UI/ZoomButtons';

/** v1's zoom levels. */
export const zoomSlotsOf = (zoomButtons: ZoomButtons): number[] =>
  (zoomButtons as unknown as { _ZoomSlots: number[] })._ZoomSlots;

/** The Share panel's "saving…" spinner is showing. */
export const shareSaving = (panel: SharePanel): boolean =>
  (panel as unknown as { _Saving: boolean })._Saving;

/** v1's MessagePanel never sets _Alpha before its first fade-in, which this tween library turns
 * into NaN (nothing drawn): it starts hidden, at 0. */
export function hideMessageBar(panel: MessagePanel): void {
  (panel as unknown as { _Alpha: number })._Alpha = 0;
}

/** v1 passes its sprite drawer a display context or a bare 2D context. */
export const canvasOf = (target: unknown): CanvasRenderingContext2D =>
  typeof target === 'object' && target !== null && 'Ctx' in target
    ? (target as DisplayContext).Ctx
    : (target as CanvasRenderingContext2D);
