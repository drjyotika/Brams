export async function register() {
  // Neon's SSL cert chain isn't always in Node.js's local trust store.
  // Only disable verification in development — Vercel production is fine.
  if (process.env.NODE_ENV !== "production") {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  }
}
