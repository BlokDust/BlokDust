// Hand the video to the system share sheet, or download it (SPEC-SHARING-VIDEO-EXPORT R13–R14). Nothing is uploaded.

/** The share sheet takes this file here (phones, Safari, Chrome on Windows and ChromeOS…). */
export function canShareFile(file: File): boolean {
  try {
    return typeof navigator.share === 'function' && !!navigator.canShare?.({ files: [file] });
  } catch {
    return false;
  }
}

/** Must run in a click (the share sheet needs a user gesture). Resolves false if the user closed the sheet. */
export async function shareFile(file: File, title: string, text: string): Promise<boolean> {
  try {
    await navigator.share({ files: [file], title, text });
    return true;
  } catch (e) {
    if ((e as Error).name === 'AbortError') return false;
    throw e;
  }
}

export function downloadFile(file: File): void {
  const url = URL.createObjectURL(file),
    a = Object.assign(document.createElement('a'), { href: url, download: file.name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** A file name from the patch title: letters, digits and dashes. */
export function videoFileName(title: string): string {
  const base =
    title
      .normalize('NFKD')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 60) || 'blokdust';
  return `${base}.mp4`;
}
