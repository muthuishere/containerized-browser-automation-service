export class BaseBrowser {
  constructor(profilePath, config) {
    this.profilePath = profilePath;
    this.config = config;
    this.browser = null;
    this.currentPage = null;
  }
  async evaluateInPage(script) {
    throw new Error("evaluateInPage must be implemented by subclass");
  }

  async exposeFunction(name, fn) {
    throw new Error("exposeFunction must be implemented by subclass");
  }
  async showBrowser() {
    throw new Error("showBrowser must be implemented by subclass");
  }

  async hideBrowser() {
    throw new Error("hideBrowser must be implemented by subclass");
  }

  getBrowserConfig() {
    throw new Error("getBrowserConfig must be implemented by subclass");
  }

  getExecutablePath() {
    throw new Error("getExecutablePath must be implemented by subclass");
  }
}
