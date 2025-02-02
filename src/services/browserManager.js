import { mkdir, access } from "fs/promises";
import { join } from "path";
import { chromium } from "playwright";
import { CONFIG } from "../config";

export class BrowserManager {
  constructor(profileName) {
    this.profileName = profileName;
    this.profilePath = join(CONFIG.profilesDir, profileName);
    this.browser = null;
    this.currentPage = null;
    this.isInitialized = false;
  }

  async ensureProfileDir() {
    try {
      // First ensure the base profiles directory exists
      await mkdir(CONFIG.profilesDir, { recursive: true });

      // Check if profile directory exists
      try {
        await access(this.profilePath);
        console.log(`Profile directory already exists: ${this.profilePath}`);
      } catch {
        // Profile directory doesn't exist, create it
        await mkdir(this.profilePath, { recursive: true });
        await Bun.spawn(["chmod", "777", this.profilePath]);
        console.log(`Created new profile directory: ${this.profilePath}`);
      }
    } catch (error) {
      console.error("Error managing profile directory:", error);
      throw error;
    }
  }

  async ensureDataDir() {
    try {
      await mkdir(this.userDataDir, { recursive: true });
      await Bun.spawn(["chmod", "777", this.userDataDir]);
      console.log("Chrome data directory created/verified successfully");
    } catch (error) {
      console.error("Error creating chrome data directory:", error);
      throw error;
    }
  }

  async init() {
    try {
      await this.cleanupChromeData();

      // Verify Chromium exists
      try {
        await access(CONFIG.browser.executablePath);
        console.log(`Found Chromium at ${CONFIG.browser.executablePath}`);
      } catch (error) {
        console.error(`Chromium not found at ${CONFIG.browser.executablePath}`);
        throw new Error(
          `Chromium not found at ${CONFIG.browser.executablePath}`,
        );
      }

      // Ensure profile directory exists
      await this.ensureProfileDir();
      console.log("Launching browser with config:", CONFIG.browser);

      // Launch browser context with profile path
      this.browser = await chromium.launchPersistentContext(this.profilePath, {
        ...CONFIG.browser,
      });

      // Ensure we have a page
      const pages = this.browser.pages();
      this.currentPage =
        pages.length > 0 ? pages[0] : await this.browser.newPage();

      if (!this.currentPage) {
        throw new Error("Failed to create or get page");
      }

      // Set default timeouts
      await this.currentPage.setDefaultTimeout(30000);
      await this.currentPage.setDefaultNavigationTimeout(30000);

      this.isInitialized = true;
      console.log("Browser initialized successfully");

      // Setup event listeners
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

  async cleanupChromeData() {
    try {
      // Remove Chrome lock files from profile directory
      await Bun.spawn(["rm", "-f", `${this.profilePath}/SingletonLock`]);
      await Bun.spawn(["rm", "-f", `${this.profilePath}/SingletonCookie`]);
      await Bun.spawn(["rm", "-rf", `${this.profilePath}/Singleton*`]);
      console.log("Cleaned up Chrome lock files");
    } catch (error) {
      console.warn("Error cleaning up Chrome data:", error);
    }
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
