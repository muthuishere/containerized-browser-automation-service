import { ChromiumBrowser } from "./chromiumBrowser";
import { FirefoxBrowser } from "./firefoxBrowser";

export class BrowserFactory {
  static createBrowser(type, profilePath, config) {
    switch (type.toLowerCase()) {
      case "chrome":
      case "chromium":
        return new ChromiumBrowser(profilePath, config, type.toLowerCase());
      case "firefox":
        return new FirefoxBrowser(profilePath, config);
      default:
        throw new Error(`Unsupported browser type: ${type}`);
    }
  }
}
