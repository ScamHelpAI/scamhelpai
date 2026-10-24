/**
 * Small helper for allocating stable sequential ids (e.g. ev-001, ev-002)
 * within a single collect/analysis pass.
 */

export function createSequentialId(prefix: string): () => string {
  let counter = 0;
  return () => `${prefix}-${String(++counter).padStart(3, "0")}`;
}
