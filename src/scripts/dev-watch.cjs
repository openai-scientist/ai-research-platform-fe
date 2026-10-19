// Set before Next.js loads Watchpack. Windows native watch events can leave nested
// routes out of the dev server's route map; polling keeps the scan up to date.
if (process.platform === "win32" && process.env.WATCHPACK_POLLING === undefined) {
  process.env.WATCHPACK_POLLING = "1000";
}
