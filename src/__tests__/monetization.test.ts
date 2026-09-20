jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { checkPro, getProPackages, purchasesAvailable, restorePro } from '@/lib/purchases.web';
import { useStore } from '@/store/useStore';

const s = () => useStore.getState();

describe('subscription state', () => {
  beforeEach(() => {
    s().setPro(false);
  });

  it('setPro flips the cached entitlement used to hide ads', () => {
    expect(s().isPro).toBe(false);
    s().setPro(true);
    expect(s().isPro).toBe(true);
  });

  it('checkPro returns null when it cannot ask, so a cached Pro user keeps their ad-free app', async () => {
    // offline / SDK missing must NOT resolve to false - that would put ads in front of a paying user
    expect(purchasesAvailable()).toBe(false);
    await expect(checkPro()).resolves.toBeNull();
  });

  it('purchase helpers fail safely when the store is unavailable', async () => {
    await expect(getProPackages()).resolves.toEqual([]);
    const restored = await restorePro();
    expect(restored.ok).toBe(false);
    expect(restored.isPro).toBe(false);
  });
});
