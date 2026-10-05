import { WHATSAPP_NUMBER } from '../config/site';

/**
 * Build a wa.me deep link with a pre-filled message.
 *
 * Use this EVERYWHERE instead of writing the number inline. That is the whole
 * point — a placeholder number previously shipped to production precisely
 * because the URL was hand-written in six different files.
 *
 * @param text Pre-filled message the visitor will see in their WhatsApp box.
 */
export function waLink(text: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

/** Human-readable number for printed documents and visible copy. */
export function waDisplay(): string {
  return `+${WHATSAPP_NUMBER}`;
}
