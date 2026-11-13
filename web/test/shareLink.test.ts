import { describe, expect, it } from 'vitest';
import { shareLink, whatsappShareUrl } from '../src/lib/share';

describe('share helpers', () => {
  it('builds the join link', () => {
    expect(shareLink('https://x.web.app', 'K7P2QX')).toBe('https://x.web.app/j/K7P2QX');
  });
  it('builds a WhatsApp url with encoded text', () => {
    expect(whatsappShareUrl('a b').endsWith('a%20b')).toBe(true);
    expect(whatsappShareUrl('a b').startsWith('https://wa.me/?text=')).toBe(true);
  });
});
