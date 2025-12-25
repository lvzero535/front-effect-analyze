export function jsonToString(json: any, indent = 2): string {
  return JSON.stringify(json, null, indent);
}