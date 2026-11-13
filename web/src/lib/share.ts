export function shareLink(origin: string, code: string): string {
  return `${origin}/j/${code}`;
}

export function whatsappShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
