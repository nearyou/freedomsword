import type { PromiseView } from './contracts';
export function promiseSummary(promises: PromiseView[]) {
  return {
    delivered: promises.filter((p) => p.status === 'DELIVERED').length,
    total: promises.length,
    progress: promises.length
      ? Math.round(promises.reduce((sum, p) => sum + p.progress, 0) / promises.length)
      : 0,
  };
}
