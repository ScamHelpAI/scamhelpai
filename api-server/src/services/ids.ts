export function createSequentialId(prefix: string): () => string {
  let counter = 0;
  return () => `${prefix}-${String(++counter).padStart(3, "0")}`;
}
