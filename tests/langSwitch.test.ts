import { langSwitchTarget } from '@/i18n/langSwitch';

// Návrat do Profilu po přepnutí jazyka (#20, S50) se nesmí spustit při startu aplikace (S56).
describe('návrat do Profilu po přepnutí jazyka', () => {
  it('jazyk telefonu před načtením nastavení a uložená volba po něm do Profilu nevedou', () => {
    let r = langSwitchTarget(null, 'cs', false); // telefon česky, nastavení ještě nenačtená
    expect(r).toEqual({ shown: null, openProfile: false });
    r = langSwitchTarget(r.shown, 'en', true); // načetla se volba English
    expect(r).toEqual({ shown: 'en', openProfile: false });
  });

  it('přepnutí v Profilu po načtení vrátí uživatele do Profilu', () => {
    let r = langSwitchTarget('en', 'en', true);
    expect(r.openProfile).toBe(false);
    r = langSwitchTarget(r.shown, 'cs', true);
    expect(r).toEqual({ shown: 'cs', openProfile: true });
  });
});
