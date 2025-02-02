import { firefox } from "playwright";
import { BaseBrowser } from "./baseBrowser";

export class FirefoxBrowser extends BaseBrowser {
  async showBrowser() {
    try {
      if (!this.browser || !this.currentPage) return;

      await this.currentPage.evaluate(() => {
        window.moveTo(0, 0);
        window.resizeTo(screen.width, screen.height);
        window.focus();
      });
    } catch (error) {
      console.warn("Show browser failed:", error);
    }
  }

  async hideBrowser() {
    try {
      if (!this.browser || !this.currentPage) return;

      await this.currentPage.evaluate(() => {
        window.blur();
        window.resizeTo(1, 1);
        window.moveTo(screen.width + 100, screen.height + 100);
      });
    } catch (error) {
      console.warn("Hide browser failed:", error);
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
      executablePath: "/usr/bin/firefox",
      args: [
        "--kiosk",
        `--width=${this.config.display.width}`,
        `--height=${this.config.display.height}`,
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
    return firefox;
  }
}
