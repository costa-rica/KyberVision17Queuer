const app = require("./app"); // Import the configured app
const PORT = process.env.PORT || 8003;
const APP_NAME = process.env.APP_NAME || "KyberVision17Queuer";

// Override console.log and console.error to include the app name
console.log = (
  (log) => (message) =>
    log(`[${APP_NAME}] ${message}`)
)(console.log);

console.error = (
  (log) => (message) =>
    log(`[${APP_NAME}] ${message}`)
)(console.error);

// Capture stack traces for errors
process.on("uncaughtException", (err) => {
  console.error(`[${APP_NAME}] Uncaught Exception: ${err.message}`);
  console.error(`[${APP_NAME}] Stack Trace:\n${err.stack}`);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error(`[${APP_NAME}] Unhandled Rejection at:`, promise);
  console.error(`[${APP_NAME}] Reason:`, reason);
});

// Start the server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running at http://0.0.0.0:${PORT}`);
});
