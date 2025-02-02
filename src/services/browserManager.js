import { mkdir, access } from "fs/promises";
import { join } from "path";
import { chromium, firefox } from "playwright";
import { CONFIG } from "../config";
import { BrowserFactory } from "./browsers/browserFactory";
import { ScriptManager } from "./scriptManager";
export class BrowserManager {
  constructor(profileName, browserType = "chromium") {
    this.profileName = profileName;
    this.browserType = browserType.toLowerCase();
    this.profilePath = join(CONFIG.profilesDir, this.browserType, profileName);
    this.isInitialized = false;
    this.browserInstance = BrowserFactory.createBrowser(
      browserType,
      this.profilePath,
      CONFIG,
    );
    this.scriptManager = new ScriptManager();
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

  async showBrowser() {
    await this.ensureBrowserAndPage();
    await this.browserInstance.showBrowser();
  }

  async hideBrowser() {
    await this.ensureBrowserAndPage();
    await this.browserInstance.hideBrowser();
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

      // Try to go fullscreen
      try {
        await this.browserInstance.currentPage.evaluate(() => {
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

  async cleanup() {
    console.log("Cleaning up browser resources...");
    await this.scriptManager.stopAllScripts(); // Add this
    if (this.browserInstance.browser) {
      await this.browserInstance.browser.close();
      this.browserInstance.browser = null;
      this.browserInstance.currentPage = null;
      this.isInitialized = false;
    }
    process.exit(0);
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
    return await this.browserInstance.evaluateInPage(script);
  }

  async executeContinuousScript(script) {
    await this.ensureBrowserAndPage();
    const scriptId = this.scriptManager.generateScriptId();
    const self = this; // Add this

    const stream = new ReadableStream({
      async start(controller) {
        try {
          await self.browserInstance.exposeFunction("sendResult", (data) => {
            controller.enqueue({ data, scriptId });
          });

          await this.browserInstance.evaluateInPage(`
            (async () => {
              try {
                ${script}
              } catch (error) {
                window.sendResult({ error: error.message });
              }
            })();
          `);

          const cleanup = async () => {
            await this.browserInstance.evaluateInPage(`
              if (window.scriptCleanup_${scriptId}) {
                await window.scriptCleanup_${scriptId}();
              }
            `);
            controller.close();
          };

          this.scriptManager.registerScript(scriptId, { stream, cleanup });
        } catch (error) {
          controller.error(error);
        }
      },
      cancel: async () => {
        await this.scriptManager.stopScript(scriptId);
      },
    });

    return { stream, scriptId };
  }

  async stopScript(scriptId) {
    return await this.scriptManager.stopScript(scriptId);
  }

  async type(selector, text) {
    try {
      await this.ensureBrowserAndPage();
      await this.browserInstance.currentPage.fill(selector, text);
    } catch (error) {
      console.error("Error typing text:", error);
      throw error;
    }
  }
  // Browser control methods
}
