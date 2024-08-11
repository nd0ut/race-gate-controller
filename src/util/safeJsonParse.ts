export const safeJsonParse = <T = unknown>(json: string): T | null => {
  try {
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
};
