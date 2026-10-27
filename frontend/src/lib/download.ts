// Delay before the object URL is revoked: some browsers read the blob after click() returns
const REVOKE_DELAY_MS = 1000;

/** Saves text as a file through a temporary object URL, revoked shortly after the download starts */
export function downloadText(text: string, fileName: string, mimeType: string) {
  const url = URL.createObjectURL(new Blob([text], { type: mimeType }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.rel = "noopener";
  link.style.display = "none";
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
}
