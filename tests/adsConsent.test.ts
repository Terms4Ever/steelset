jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// funkce vznikají uvnitř továrny: `@/lib/ads` načte SDK hned při importu, dřív než by se
// proměnné mimo ni stihly založit
jest.mock('react-native-google-mobile-ads', () => ({
  AdsConsent: { getConsentInfo: jest.fn(), showPrivacyOptionsForm: jest.fn() },
  TestIds: {},
}));

import { privacyOptionsRequired, showPrivacyOptions } from '@/lib/ads';
import { readAdsLog } from '@/lib/adsLog';

const sdk = jest.requireMock('react-native-google-mobile-ads');
const mockGetConsentInfo: jest.Mock = sdk.AdsConsent.getConsentInfo;
const mockShowPrivacyOptionsForm: jest.Mock = sdk.AdsConsent.showPrivacyOptionsForm;

// Řádek Souhlas s reklamami v Profilu (#18): Google po zveřejnění zprávy GDPR vyžaduje,
// aby šel souhlas později změnit. Ukáže se jen tam, kde to Google žádá.
describe('změna souhlasu s reklamami', () => {
  beforeEach(() => {
    mockGetConsentInfo.mockReset();
    mockShowPrivacyOptionsForm.mockReset();
  });

  it('řádek se ukáže, jen když Google změnu souhlasu vyžaduje', async () => {
    mockGetConsentInfo.mockResolvedValue({ privacyOptionsRequirementStatus: 'REQUIRED' });
    await expect(privacyOptionsRequired()).resolves.toBe(true);
    mockGetConsentInfo.mockResolvedValue({ privacyOptionsRequirementStatus: 'NOT_REQUIRED' });
    await expect(privacyOptionsRequired()).resolves.toBe(false);
  });

  it('chyba při zjišťování řádek schová a nic neshodí', async () => {
    mockGetConsentInfo.mockRejectedValue(new Error('offline'));
    await expect(privacyOptionsRequired()).resolves.toBe(false);
  });

  it('otevření formuláře zapíše výsledek do deníku reklam', async () => {
    mockShowPrivacyOptionsForm.mockResolvedValue({ status: 'OBTAINED', canRequestAds: true });
    await showPrivacyOptions();
    expect(mockShowPrivacyOptionsForm).toHaveBeenCalledTimes(1);
    expect((await readAdsLog()).at(-1)?.text).toBe('privacy options: OBTAINED, canRequestAds=true');
  });
});
