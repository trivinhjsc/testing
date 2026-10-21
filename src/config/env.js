export function getEnv(name) {
  const value = process.env[name];
  return typeof value === "string" ? value.trim() : "";
}