import { mkdir, access } from "fs/promises";
import { join } from "path";
import { chromium, firefox } from "playwright";
import { CONFIG } from "../config";
import { BrowserFactory } from "./browsers/browserFactory";
import { ScriptManager } from "./scriptManager";
import { PassThrough } from "stream";

export class BrowserManager {
  constructor(
    profileName,
    browserType = "chromium",
    initialVisibility = false,
  ) {
    this.profileName = profileName;
    this.browserType = browserType.toLowerCase();
    this.profilePath = join(CONFIG.profilesDir, this.browserType, profileName);
    this.isInitialized = false;
    this.browserInstance = BrowserFactory.createBrowser(
      browserType,
      this.profilePath,
      CONFIG,
    );
    this.isVisible = initialVisibility; // Add visibility tracking
    this.scriptManager = new ScriptManager();
    this.scriptExecutor = new ScriptExecutorService(
      this.browserInstance,
      this.scriptManager,
    );
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
      await this.ensureProfileDir();

      const browserConfig = this.browserInstance.getBrowserConfig();
      console.log("Launching browser with config:", browserConfig);

      const playwright = this.browserInstance.getPlaywright();
      this.browserInstance.browser = await playwright.launchPersistentContext(
        this.profilePath,
        browserConfig,
      );

      const pages = this.browserInstance.browser.pages();
      this.browserInstance.currentPage =
        pages.length > 0
          ? pages[0]
          : await this.browserInstance.browser.newPage();

      if (!this.browserInstance.currentPage) {
        throw new Error("Failed to create or get page");
      }

      await this.browserInstance.currentPage.setDefaultTimeout(30000);
      await this.browserInstance.currentPage.setDefaultNavigationTimeout(30000);

      // Set initial visibility state
      if (this.isVisible) {
        await this.showBrowser();
      } else {
        await this.hideBrowser();
      }

      this.isInitialized = true;
      console.log(`${this.browserType} browser initialized successfully`);

      this.browserInstance.browser.on("disconnected", () => {
        console.log("Browser disconnected");
        this.isInitialized = false;
        this.browserInstance.browser = null;
        this.browserInstance.currentPage = null;
      });

      return true;
    } catch (error) {
      console.error("Browser initialization failed:", error);
      this.isInitialized = false;
      this.browserInstance.browser = null;
      this.browserInstance.currentPage = null;
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

  async showBrowser() {
    await this.ensureBrowserAndPage();
    await this.browserInstance.showBrowser();
    this.isVisible = true;
  }

  async hideBrowser() {
    await this.ensureBrowserAndPage();
    await this.browserInstance.hideBrowser();
    this.isVisible = false;
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
  async ensureBrowserAndPage() {
    if (
      !this.isInitialized ||
      !this.browserInstance.browser ||
      !this.browserInstance.currentPage
    ) {
      console.log("Browser needs initialization, attempting to reconnect...");
      const success = await this.reconnect();
      if (!success) {
        throw new Error("Failed to ensure browser and page availability");
      }
    }

    if (!this.browserInstance.currentPage) {
      console.log("Creating new page...");
      this.browserInstance.currentPage =
        await this.browserInstance.browser.newPage();
      if (!this.browserInstance.currentPage) {
        throw new Error("Failed to create new page");
      }
    }
  }

  async cleanup() {
    console.log("Cleaning up browser resources...");
    await this.scriptManager.stopAllScripts();
    if (this.browserInstance.browser) {
      await this.browserInstance.browser.close();
      this.browserInstance.browser = null;
      this.browserInstance.currentPage = null;
      this.isInitialized = false;
    }
    process.exit(0);
  }

  async goto(url) {
    try {
      await this.ensureBrowserAndPage();

      if (!this.browserInstance.currentPage) {
        throw new Error("Page is not available");
      }

      console.log(`Navigating to: ${url}`);
      await this.browserInstance.currentPage.goto(url, {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      // Only attempt fullscreen if browser is visible
      if (this.isVisible) {
        try {
          await this.browserInstance.currentPage.evaluate(() => {
            if (!document.fullscreenElement) {
              document.documentElement.requestFullscreen();
            }
          });
        } catch (error) {
          console.warn("Failed to enter fullscreen:", error);
        }
      }
    } catch (error) {
      console.error("Error navigating to URL:", error);
      throw error;
    }
  }

  async click(selector) {
    try {
      await this.ensureBrowserAndPage();
      await this.browserInstance.currentPage.click(selector, {
        timeout: 5000,
        waitFor: "visible",
      });
    } catch (error) {
      console.error("Error clicking element:", error);
      throw error;
    }
  }

  async executeScript(script) {
    await this.ensureBrowserAndPage();
    return await this.scriptExecutor.execute(script);
  }

  async executeContinuousScript(script) {
    await this.ensureBrowserAndPage();
    return await this.scriptExecutor.executeContinuous(script);
  }

  async stopScript(scriptId) {
    await this.ensureBrowserAndPage();
    return await this.scriptExecutor.stopScript(scriptId);
  }

  async type(selector, text) {
    await this.ensureBrowserAndPage();
    await this.browserInstance.currentPage.fill(selector, text);
  }
  // Browser control methods
}
