export async function runInBatches<T>(
  batchSize: number,
  maxSize: number,
  processFn: (index: number) => Promise<T>
): Promise<T[]> {
  const results: T[] = [];
  for (let i = 0; i < maxSize; i += batchSize) {
    const batchIndices = Array.from(
      { length: Math.min(batchSize, maxSize - i) },
      (_, index) => i + index
    );
    const batchResults = await Promise.all(
      batchIndices.map((index) => processFn(index))
    );
    results.push(...batchResults);
  }
  return results;
}
