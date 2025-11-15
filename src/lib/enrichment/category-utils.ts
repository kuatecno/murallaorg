export const normalizeCategoryValue = (value?: string | null): string | undefined => {
  if (!value) return value ?? undefined;

  const withoutEmoji = value.replace(/[\u{1F300}-\u{1FAFF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u2600-\u26FF\u2700-\u27BF]/gu, '');
  const cleaned = withoutEmoji.replace(/^[^A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ]+/, '').replace(/\s{2,}/g, ' ').trim();

  return cleaned || undefined;
};
