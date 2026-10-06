import LanguageSelect from "./LanguageSelect";
import ThemeMenu from "./ThemeMenu";
import "./DisplayPreferences.css";

// Language and theme controls for the screens shown before login, where the navbar and Settings
// are not available. The choices are stored on this device only, like everywhere else.
function DisplayPreferences() {
  return (
    <div className="display-preferences">
      <LanguageSelect />
      <ThemeMenu placement="above" />
    </div>
  );
}

export default DisplayPreferences;
