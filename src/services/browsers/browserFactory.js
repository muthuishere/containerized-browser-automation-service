import { ChromiumBrowser } from "./chromiumBrowser";

export class BrowserFactory {
  static createBrowser(type, profilePath, config) {
    switch (type.toLowerCase()) {
      case "chromium":
        return new ChromiumBrowser(profilePath, config, type.toLowerCase());
      default:
        throw new Error(`Unsupported browser type: ${type}`);
    }
  }
}
