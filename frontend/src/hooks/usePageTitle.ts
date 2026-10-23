import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { APP_NAME } from "../components/Wordmark";

// Sets the browser tab title to "<page> · Keylord", translated and updated when the language changes.
export function usePageTitle(key: string) {
  const { t } = useTranslation();
  const page = t(key);
  useEffect(() => {
    document.title = `${page} · ${APP_NAME}`;
  }, [page]);
}
