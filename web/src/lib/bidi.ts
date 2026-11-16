/**
 * Wraps user text in Unicode isolate marks (FSI … PDI) so an Arabic name inside an
 * English sentence, or the reverse, doesn't reorder the words around it.
 */
export function isolate(text: string): string {
  return `⁨${text}⁩`;
}
