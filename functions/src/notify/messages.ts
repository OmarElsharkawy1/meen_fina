export type NotifyKind = 'new' | 'revealed';
export type NotifyLang = 'en' | 'ar';

const SUFFIX: Record<NotifyKind, Record<NotifyLang, string>> = {
  new: { en: 'new question', ar: 'سؤال جديد' },
  revealed: { en: 'results are in!', ar: 'النتيجة ظهرت!' },
};

export function notificationFor(
  kind: NotifyKind,
  lang: NotifyLang,
  groupName: string,
  questionText: string,
): { title: string; body: string } {
  return { title: `${groupName}: ${SUFFIX[kind][lang]}`, body: questionText };
}
