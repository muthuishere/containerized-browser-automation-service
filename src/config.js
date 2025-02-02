/*
    "--no-sandbox",
        "--disable-setuid-sandbox",
        "--display=" + process.env.DISPLAY,
        "--disable-dev-shm-usage",
        "--disable-gpu",
 */
export const CONFIG = {
  profilesDir: process.env.PROFILES_DIR || "/chrome-profiles",
  serverPort: parseInt(process.env.SERVER_PORT) || 3000,
  display: {
    width: parseInt(process.env.DISPLAY_WIDTH) || 1920,
    height: parseInt(process.env.DISPLAY_HEIGHT) || 1080,
  },

  browser: {
    executablePath: "/usr/bin/chromium",
    headless: false, // Explicitly set headless to false
    args: [
      "--no-sandbox",
      "--kiosk",
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
      "--enable-audio-service",
      "--alsa-output-device=default",
      "--disable-dev-shm-usage", // Prevent memory issues
      "--disable-features=TranslateUI", // Disable unnecessary features
      "--disable-gpu",
      "--window-position=0,0",
      `--window-size=${process.env.DISPLAY_WIDTH || 1920},${process.env.DISPLAY_HEIGHT || 1080}`,
    ],
    ignoreDefaultArgs: ["--enable-automation"], // Disable automation info
    viewport: null,
    chromiumSandbox: false,
    handleSIGINT: false,
    handleSIGTERM: false,
    handleSIGHUP: false,
  },
};

/*
args: [
  "--no-sandbox",
  "--kiosk",
  "--remote-debugging-port=9222",
  "--no-first-run",
  "--no-default-browser-check",
  // Use display dimensions from environment
  `--window-size=${process.env.DISPLAY_WIDTH || 1920},${process.env.DISPLAY_HEIGHT || 1080}`,
],*/
