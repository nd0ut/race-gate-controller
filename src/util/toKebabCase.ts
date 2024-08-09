export const toKebabCase = (str: string) => {
  return str
    .toLowerCase()
    .replaceAll("_", "-")
    .replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, "$1-$2")
    .toLowerCase();
};
