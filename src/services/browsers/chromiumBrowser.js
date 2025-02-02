// src/services/browsers/chromiumBrowser.js
import { chromium } from "playwright";
import { BaseBrowser } from "./baseBrowser";

export class ChromiumBrowser extends BaseBrowser {
  constructor(profilePath, config, browserType = "chromium") {
    super(profilePath, config);
    this.browserType = browserType;
  }

  getExecutablePath() {
    return this.browserType === "chrome"
      ? "/usr/bin/google-chrome"
      : "/usr/bin/chromium";
  }

  async showBrowser() {
    try {
      if (!this.browser || !this.currentPage) return;

      // Get CDP client
      const client = await this.currentPage
        .context()
        .newCDPSession(this.currentPage);

      // Get window ID using CDP
      const { windowId } = await client.send("Browser.getWindowForTarget");

      // First set to normal state to ensure proper positioning
      await client.send("Browser.setWindowBounds", {
        windowId,
        bounds: {
          windowState: "normal",
          left: 0,
          top: 0,
          width: this.config.display.width,
          height: this.config.display.height,
        },
      });

      // Small delay to ensure window state is updated
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Then set to fullscreen
      await client.send("Browser.setWindowBounds", {
        windowId,
        bounds: {
          windowState: "fullscreen",
        },
      });

      // Ensure window is focused
      await client.send("Page.bringToFront");

      // Additional step to ensure kiosk mode
      await this.currentPage.evaluate(() => {
        if (!document.fullscreenElement) {
          document.documentElement
            .requestFullscreen({
              navigationUI: "hide",
            })
            .catch(console.error);
        }
      });
    } catch (error) {
      console.warn("Show browser failed:", error);
      // Enhanced fallback method
      try {
        await this.currentPage.evaluate(() => {
          const win = window.open("", "_self");
          if (win) {
            // First position the window
            win.moveTo(0, 0);
            win.resizeTo(window.screen.availWidth, window.screen.availHeight);

            // Then request fullscreen
            document.documentElement
              .requestFullscreen({
                navigationUI: "hide",
              })
              .then(() => {
                // Additional kiosk-like settings
                win.focus();
                win.scrollTo(0, 0);
              })
              .catch(console.error);
          }
        });
      } catch (fallbackError) {
        console.error("Both CDP and fallback methods failed:", fallbackError);
      }
    }
  }

  async hideBrowser() {
    try {
      if (!this.browser || !this.currentPage) return;

      // Get CDP client
      const client = await this.currentPage
        .context()
        .newCDPSession(this.currentPage);

      // Get window ID using CDP
      const { windowId } = await client.send("Browser.getWindowForTarget");

      // First, set to normal state
      await client.send("Browser.setWindowBounds", {
        windowId,
        bounds: {
          windowState: "normal",
        },
      });

      // Wait a bit for the state change to take effect
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Then minimize
      await client.send("Browser.setWindowBounds", {
        windowId,
        bounds: {
          windowState: "minimized",
        },
      });
    } catch (error) {
      console.warn("Hide browser failed:", error);
      // Enhanced fallback method
      try {
        await this.currentPage.evaluate(() => {
          // First exit fullscreen if active
          if (document.fullscreenElement) {
            document.exitFullscreen().catch(console.error);
          }

          // Wait for fullscreen to exit
          return new Promise((resolve) => {
            const checkFullscreen = () => {
              if (!document.fullscreenElement) {
                const win = window.open("", "_self");
                if (win) {
                  win.resizeTo(100, 100);
                  win.moveTo(
                    window.screen.width + 50,
                    window.screen.height + 50,
                  );
                }
                resolve();
              } else {
                setTimeout(checkFullscreen, 100);
              }
            };
            checkFullscreen();
          });
        });
      } catch (fallbackError) {
        console.error("Both CDP and fallback methods failed:", fallbackError);
      }
    }
  }

  getBrowserConfig() {
    return {
      headless: false,
      ignoreDefaultArgs: ["--enable-automation"],
      viewport: null,
      handleSIGINT: false,
      handleSIGTERM: false,
      handleSIGHUP: false,
      executablePath: this.getExecutablePath(),
      args: [
        "--no-sandbox",
        "--start-maximized", // Add this
        "--kiosk",
        "--use-fake-ui-for-media-stream",
        "--use-fake-device-for-media-stream",
        "--enable-audio-service",
        "--alsa-output-device=default",
        "--disable-dev-shm-usage",
        "--disable-features=TranslateUI",
        "--disable-gpu",
        "--window-position=0,0",
        "--remote-debugging-port=9222", // Add remote debugging
        "--enable-automation", // Remove from ignoreDefaultArgs
        `--window-size=${this.config.display.width},${this.config.display.height}`,
      ],
    };
  }
  async evaluateInPage(script) {
    return await this.currentPage.evaluate(script);
  }

  async exposeFunction(name, fn) {
    return await this.currentPage.exposeFunction(name, fn);
  }
  getPlaywright() {
    return chromium;
  }
}
