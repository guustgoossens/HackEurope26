import { useTranslation } from 'react-i18next';

export function LanguageSwitcher({ className, style }: { className?: string; style?: React.CSSProperties }) {
  const { i18n } = useTranslation();

  const toggle = () => {
    const next = i18n.language === 'en' ? 'fr' : 'en';
    i18n.changeLanguage(next);
    try {
      localStorage.setItem('lang', next);
    } catch {
      // ignore
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className={className}
      style={style}
      title={i18n.language === 'en' ? 'Français' : 'English'}
      aria-label={i18n.language === 'en' ? 'Switch to French' : 'Passer en anglais'}
    >
      {i18n.language === 'en' ? 'FR' : 'EN'}
    </button>
  );
}
