/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allows accessing the dev server from another device on the LAN (e.g. a phone) for testing.
  // Only affects `next dev`; has no effect on production builds/deploys.
  allowedDevOrigins: ["192.168.50.220", "192.168.11.6", "10.0.4.249"],
};

module.exports = nextConfig;

