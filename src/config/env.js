export function getEnv(name) {
  const value = Deno.env.get(name)
  return typeof value === "string" ? value.trim() : ""
}