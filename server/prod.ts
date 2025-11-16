/**
 * Production server entry point
 * NO development dependencies
 */

// Log startup
console.log("🚀 Starting production server...");
console.log("📍 Node version:", process.version);
console.log("📍 Environment:", process.env.NODE_ENV);
console.log("📍 Port:", process.env.PORT || "5000");

// Prevent silent crashes
process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️  Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('⚠️  Uncaught Exception:', error);
});

import { startServer } from "./app.js";

startServer().catch((err) => {
  console.error("❌ Failed to start server:", err);
  process.exit(1);
});
