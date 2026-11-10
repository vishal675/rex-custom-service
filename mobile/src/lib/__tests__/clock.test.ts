import { afterEach, describe, expect, it, jest } from '@jest/globals';

import { resetServerClock, serverNow, syncServerClock } from '../clock';

describe('server clock', () => {
  afterEach(() => {
    resetServerClock();
    jest.restoreAllMocks();
  });

  it('corrects a device clock that is 5 minutes slow', () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
    syncServerClock(new Date(1_000_000 + 300_000).toISOString(), 999_000, 1_001_000);
    expect(serverNow()).toBe(1_300_000);
  });

  it('ignores an unparseable timestamp', () => {
    jest.spyOn(Date, 'now').mockReturnValue(5_000);
    syncServerClock('not a date', 0, 0);
    expect(serverNow()).toBe(5_000);
  });
});
