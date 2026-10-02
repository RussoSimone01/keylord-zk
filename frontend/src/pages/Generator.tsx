import PasswordGenerator from "../components/PasswordGenerator";
import "./Generator.css";
import { useTranslation } from "react-i18next";

function Generator() {
  const { t } = useTranslation();
  return (
    <div className="generator-container">
      <h1>{t("generator.title")}</h1>
      <p className="generator-intro">{t("generator.intro")}</p>
      <div className="generator-card">
        <PasswordGenerator />
      </div>
    </div>
  );
}

export default Generator;
