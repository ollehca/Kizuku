// Kizuku Configuration
globalThis.kizukuConfig = {
  // Desktop-specific configuration
  isDesktop: true,
  version: process?.versions?.electron || 'unknown',
  platform: process?.platform || 'unknown',
};
