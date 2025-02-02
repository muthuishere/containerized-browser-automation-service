import { mkdir, access } from "fs/promises";
import { join } from "path";
import { chromium, firefox } from "playwright";
import { CONFIG } from "../config";

export class BrowserManager {
  constructor(profileName, browserType = "chromium") {
    this.profileName = profileName;
    this.browserType = browserType.toLowerCase();
    this.profilePath = join(CONFIG.profilesDir, this.browserType, profileName);
    this.browser = null;
    this.currentPage = null;
    this.isInitialized = false;
    this.browserConfig = this.getBrowserConfig();
  }

  getBrowserConfig() {
    const baseConfig = {
      headless: false,
      ignoreDefaultArgs: ["--enable-automation"],
      viewport: null,
      handleSIGINT: false,
      handleSIGTERM: false,
      handleSIGHUP: false,
    };

    const configs = {
      chrome: {
        executablePath: "/usr/bin/google-chrome",
        args: [
          "--no-sandbox",
          "--kiosk",
          "--use-fake-ui-for-media-stream",
          "--use-fake-device-for-media-stream",
          "--enable-audio-service",
          "--alsa-output-device=default",
          "--disable-dev-shm-usage",
          "--disable-features=TranslateUI",
          "--disable-gpu",
          "--window-position=0,0",
          `--window-size=${CONFIG.display.width},${CONFIG.display.height}`,
        ],
      },
      chromium: {
        executablePath: "/usr/bin/chromium",
        args: [
          "--no-sandbox",
          "--kiosk",
          "--use-fake-ui-for-media-stream",
          "--use-fake-device-for-media-stream",
          "--enable-audio-service",
          "--alsa-output-device=default",
          "--disable-dev-shm-usage",
          "--disable-features=TranslateUI",
          "--disable-gpu",
          "--window-position=0,0",
          `--window-size=${CONFIG.display.width},${CONFIG.display.height}`,
        ],
      },
      firefox: {
        executablePath: "/usr/bin/firefox",
        args: [
          "--kiosk",
          `--width=${CONFIG.display.width}`,
          `--height=${CONFIG.display.height}`,
        ],
      },
    };

    if (!configs[this.browserType]) {
      throw new Error(`Unsupported browser type: ${this.browserType}`);
    }

    return {
      ...baseConfig,
      ...configs[this.browserType],
    };
  }

  getBrowserType() {
    switch (this.browserType) {
      case "firefox":
        return firefox;
      case "chrome":
      case "chromium":
        return chromium;
      default:
        throw new Error(`Unsupported browser type: ${this.browserType}`);
    }
  }

  async ensureProfileDir() {
    try {
      // Create browser-specific profile directory
      await mkdir(this.profilePath, { recursive: true });
      await Bun.spawn(["chmod", "777", this.profilePath]);
      console.log(`Profile directory verified/created at: ${this.profilePath}`);
    } catch (error) {
      console.error("Error managing profile directory:", error);
      throw error;
    }
  }

  async init() {
    try {
      await this.cleanupBrowserData();

      // Verify browser exists
      try {
        await access(this.browserConfig.executablePath);
        console.log(
          `Found ${this.browserType} at ${this.browserConfig.executablePath}`,
        );
      } catch (error) {
        console.error(
          `${this.browserType} not found at ${this.browserConfig.executablePath}`,
        );
        throw new Error(
          `${this.browserType} not found at ${this.browserConfig.executablePath}`,
        );
      }

      await this.ensureProfileDir();
      console.log("Launching browser with config:", this.browserConfig);

      const browserType = this.getBrowserType();
      this.browser = await browserType.launchPersistentContext(
        this.profilePath,
        this.browserConfig,
      );

      const pages = this.browser.pages();
      this.currentPage =
        pages.length > 0 ? pages[0] : await this.browser.newPage();

      if (!this.currentPage) {
        throw new Error("Failed to create or get page");
      }

      await this.currentPage.setDefaultTimeout(30000);
      await this.currentPage.setDefaultNavigationTimeout(30000);

      this.isInitialized = true;
      console.log(`${this.browserType} browser initialized successfully`);

      this.browser.on("disconnected", () => {
        console.log("Browser disconnected");
        this.isInitialized = false;
        this.browser = null;
        this.currentPage = null;
      });

      return true;
    } catch (error) {
      console.error("Browser initialization failed:", error);
      this.isInitialized = false;
      this.browser = null;
      this.currentPage = null;
      return false;
    }
  }

  async cleanupBrowserData() {
    try {
      // Remove browser lock files
      await Bun.spawn(["rm", "-f", `${this.profilePath}/SingletonLock`]);
      await Bun.spawn(["rm", "-f", `${this.profilePath}/SingletonCookie`]);
      await Bun.spawn(["rm", "-rf", `${this.profilePath}/Singleton*`]);
      console.log("Cleaned up browser lock files");
    } catch (error) {
      console.warn("Error cleaning up browser data:", error);
    }
  }

  async ensureBrowserAndPage() {
    if (!this.isInitialized || !this.browser || !this.currentPage) {
      console.log("Browser needs initialization, attempting to reconnect...");
      const success = await this.reconnect();
      if (!success) {
        throw new Error("Failed to ensure browser and page availability");
      }
    }

    // Double check everything is ready
    if (!this.currentPage) {
      console.log("Creating new page...");
      this.currentPage = await this.browser.newPage();
      if (!this.currentPage) {
        throw new Error("Failed to create new page");
      }
    }
  }

  async goto(url) {
    try {
      await this.ensureBrowserAndPage();

      if (!this.currentPage) {
        throw new Error("Page is not available");
      }

      console.log(`Navigating to: ${url}`);
      await this.currentPage.goto(url, {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      // Try to go fullscreen
      try {
        await this.currentPage.evaluate(() => {
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
          }
        });
      } catch (error) {
        console.warn("Failed to enter fullscreen:", error);
      }
    } catch (error) {
      console.error("Error navigating to URL:", error);
      throw error;
    }
  }

  async reconnect() {
    console.log("Attempting to reconnect browser...");
    let retries = 3;
    while (retries > 0 && !this.isInitialized) {
      try {
        const success = await this.init();
        if (success) {
          console.log("Browser reconnected successfully");
          return true;
        }
      } catch (error) {
        console.error(
          `Reconnection attempt failed. Retries left: ${retries - 1}`,
        );
      }
      retries--;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    return false;
  }

  async cleanup() {
    console.log("Cleaning up browser resources...");
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.currentPage = null;
      this.isInitialized = false;
    }
    process.exit(0);
  }

  // Browser control methods

  async click(selector) {
    try {
      await this.ensureBrowserAndPage();
      await this.currentPage.click(selector, {
        timeout: 5000,
        waitFor: "visible",
      });
    } catch (error) {
      console.error("Error clicking element:", error);
      throw error;
    }
  }

  async type(selector, text) {
    try {
      await this.ensureBrowserAndPage();
      await this.currentPage.fill(selector, text);
    } catch (error) {
      console.error("Error typing text:", error);
      throw error;
    }
  }
}
