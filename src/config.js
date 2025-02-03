export const CONFIG = {
  profilesDir: process.env.PROFILES_DIR || "/chrome-profiles",
  serverPort: parseInt(process.env.SERVER_PORT) || 3000,
  display: {
    width: parseInt(process.env.DISPLAY_WIDTH) || 1920,
    height: parseInt(process.env.DISPLAY_HEIGHT) || 1080,
  },
  disableFullScreen: process.env.DISABLE_FULL_SCREEN === "true",
};
