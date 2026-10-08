import { afterEach, describe, expect, it, vi } from 'vitest';
import { logAuthOutcome } from '../src/server/safe-log';

describe('safe authentication logging', () => {
  afterEach(() => vi.restoreAllMocks());
  it('rejects arbitrary payloads before they can reach a log sink', () => {
    const sink = vi.spyOn(console, 'info').mockImplementation(() => {});
    expect(() => logAuthOutcome('raw initData and cookie' as never)).toThrow('Unsupported');
    expect(sink).not.toHaveBeenCalled();
  });
});
