import "./Wordmark.css";

export const APP_NAME = "Keylord";

interface WordmarkProps {
  className?: string;
}

// The product name as a logotype: lowercase mono "keylord" with the accent caret.
// Screen readers hear the plain name instead of "keylord underscore".
function Wordmark({ className }: WordmarkProps) {
  return (
    <span
      className={className ? `wordmark ${className}` : "wordmark"}
      role="img"
      aria-label={APP_NAME}
    >
      keylord<span className="wordmark-caret">_</span>
    </span>
  );
}

export default Wordmark;
