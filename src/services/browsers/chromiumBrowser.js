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
      const { windowId } = await client.send("Browser.getWindowForTarget");

      // Set to normal state with proper dimensions
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

      // Only go fullscreen if devtools are not enabled
      if (!this.config.disableFullScreen) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        await client.send("Browser.setWindowBounds", {
          windowId,
          bounds: {
            windowState: "fullscreen",
          },
        });

        await client.send("Page.bringToFront");

        await this.currentPage.evaluate(() => {
          if (!document.fullscreenElement) {
            document.documentElement
              .requestFullscreen({
                navigationUI: "hide",
              })
              .catch(console.error);
          }
        });
      }
    } catch (error) {
      console.warn("Show browser failed:", error);
      // Fallback method only if devtools are not enabled
      if (!this.config.showDevTools) {
        try {
          await this.currentPage.evaluate(() => {
            const win = window.open("", "_self");
            if (win) {
              win.moveTo(0, 0);
              win.resizeTo(window.screen.availWidth, window.screen.availHeight);
              document.documentElement
                .requestFullscreen({
                  navigationUI: "hide",
                })
                .catch(console.error);
            }
          });
        } catch (fallbackError) {
          console.error("Both CDP and fallback methods failed:", fallbackError);
        }
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
    const baseArgs = [
      "--no-sandbox",
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
      "--enable-audio-service",
      "--alsa-output-device=default",
      "--disable-dev-shm-usage",
      "--disable-features=TranslateUI",
      "--disable-gpu",
      "--window-position=0,0",
      "--remote-debugging-port=9222",
      "--remote-debugging-address=0.0.0.0",
      "--enable-automation",
      // Add these new arguments for better screenshot handling
      "--force-device-scale-factor=1",
      "--hide-scrollbars",
      "--disable-notifications",
      "--disable-popup-blocking",
      "--disable-infobars",
      "--disable-extensions",
      "--disable-component-extensions-with-background-pages",
      "--disable-background-timer-throttling",
      "--disable-backgrounding-occluded-windows",
      "--disable-renderer-backgrounding",
      "--disable-background-networking",
      "--metrics-recording-only",
      "--disable-prompt-on-repost",
      "--disable-hang-monitor",
      "--disable-sync",
      "--disable-domain-reliability",
      "--disable-client-side-phishing-detection",
      "--disable-features=OptimizationHints",
      "--autoplay-policy=no-user-gesture-required",
      `--window-size=${this.config.display.width},${this.config.display.height}`,
    ];

    // Only add kiosk mode if devtools are not enabled
    if (!this.config.disableFullScreen) {
      baseArgs.push("--kiosk", "--start-maximized");
    }

    return {
      headless: false,
      ignoreDefaultArgs: ["--enable-automation"],
      viewport: null,
      handleSIGINT: false,
      handleSIGTERM: false,
      handleSIGHUP: false,
      // Screenshot-specific settings
      screencastFrameRate: 30,
      forcedColors: "none",
      reducedMotion: "no-preference",

      // Error handling
      ignoreHTTPSErrors: true,

      // Additional context options
      acceptDownloads: false,
      hasTouch: false,
      isMobile: false,
      javaScriptEnabled: true,
      locale: "en-US",
      timezoneId: "UTC",
      geolocation: { longitude: 0, latitude: 0 },
      permissions: ["geolocation"],
      offline: false,
      colorScheme: "light",
      executablePath: this.getExecutablePath(),
      args: baseArgs,
    };
  }

  async evaluateInPage(script) {
    return await this.currentPage.evaluate(script);
  }
  async setupPageForScreenshot() {
    if (!this.currentPage) return;

    await this.currentPage.evaluate(() => {
      // Remove scrollbars
      const style = document.createElement("style");
      style.textContent = `
        ::-webkit-scrollbar {
          display: none !important;
        }
        * {
          -ms-overflow-style: none !important;
          scrollbar-width: none !important;
        }
      `;
      document.head.appendChild(style);

      // Force all animations to complete
      const styles = document.querySelectorAll('style,link[rel="stylesheet"]');
      styles.forEach((style) => {
        if (style.sheet && style.sheet.cssRules) {
          [...style.sheet.cssRules].forEach((rule) => {
            if (rule.style) {
              if (rule.style.animationPlayState) {
                rule.style.animationPlayState = "completed";
              }
              if (rule.style.animationDuration) {
                rule.style.animationDuration = "0s";
              }
            }
          });
        }
      });

      // Stop all CSS transitions
      const css = `
        * {
          transition-duration: 0s !important;
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-delay: 0s !important;
        }
      `;
      const styleSheet = document.createElement("style");
      styleSheet.textContent = css;
      document.head.appendChild(styleSheet);
    });

    // Wait for any lazy-loaded images
    await this.currentPage.evaluate(() => {
      return Promise.all(
        Array.from(document.images)
          .filter((img) => !img.complete)
          .map(
            (img) =>
              new Promise((resolve) => {
                img.onload = img.onerror = resolve;
              }),
          ),
      );
    });
  }
  async exposeFunction(name, fn) {
    return await this.currentPage.exposeFunction(name, fn);
  }
  getPlaywright() {
    return chromium;
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
}
