import { describe, expect, it } from 'vitest';
import { notificationFor } from '../../src/notify/messages';

describe('notificationFor', () => {
  it('new / en', () => {
    expect(notificationFor('new', 'en', 'Dahab', 'Who snores?')).toEqual({
      title: 'Dahab: new question',
      body: 'Who snores?',
    });
  });
  it('new / ar', () => {
    expect(notificationFor('new', 'ar', 'Dahab', 'q').title).toBe('Dahab: سؤال جديد');
  });
  it('revealed / en', () => {
    expect(notificationFor('revealed', 'en', 'Dahab', 'q').title).toBe('Dahab: results are in!');
  });
  it('revealed / ar', () => {
    expect(notificationFor('revealed', 'ar', 'Dahab', 'q')).toEqual({
      title: 'Dahab: النتيجة ظهرت!',
      body: 'q',
    });
  });
});
