export const markdownEscape = (text: string) => {
  return text.replace(/-/g, "\\-").replace(/\./g, "\\.").replace(/\|/g, "\\|");
};
