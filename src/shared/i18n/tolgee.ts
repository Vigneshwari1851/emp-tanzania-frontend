import { Tolgee, DevTools, FormatSimple } from '@tolgee/react';
import en from './translations/en.json';
import es from './translations/es.json';
import fr from './translations/fr.json';
import de from './translations/de.json';
import hi from './translations/hi.json';
import ar from './translations/ar.json';

export const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
];

export const tolgee = Tolgee()
  .use(DevTools())
  .use(FormatSimple())
  .init({
    language: localStorage.getItem('app_language') || 'en',
    fallbackLanguage: 'en',
    apiUrl: import.meta.env.VITE_TOLGEE_API_URL,
    apiKey: import.meta.env.VITE_TOLGEE_API_KEY,
    staticData: {
      en,
      es,
      fr,
      de,
      hi,
      ar,
    },
  });
