import { useTranslation } from "react-i18next";
import Wordmark from "./Wordmark";

interface AuthBrandProps {
  // Login and sign-up explain what the app is; the unlock screen does not need to
  tagline?: boolean;
}

// Product name above the card on the screens without the navbar.
function AuthBrand({ tagline = false }: AuthBrandProps) {
  const { t } = useTranslation();
  return (
    <div className="auth-brand">
      <Wordmark className="auth-brand-wordmark" />
      {tagline && <p className="auth-brand-tagline">{t("brand.tagline")}</p>}
    </div>
  );
}

export default AuthBrand;
