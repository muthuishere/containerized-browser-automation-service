import { PassThrough } from "stream";
import { file } from "bun";

export class ScriptExecutorService {
  constructor(browserInstance, scriptManager) {
    this.browserInstance = browserInstance;
    this.scriptManager = scriptManager;
    this.overridesCache = null;
  }

  async loadOverrides() {
    if (!this.overridesCache) {
      this.overridesCache = await file(
        "src/assets/scripts/overrides.js",
      ).text();
    }
    return this.overridesCache;
  }

  async ensureContext() {
    try {
      // Check if the context needs initialization by testing for our globals
      const needsInit = await this.browserInstance.evaluateInPage(`
        typeof window.__originalSetInterval === 'undefined'
      `);

      if (needsInit) {
        const overridesScript = await this.loadOverrides();
        await this.browserInstance.evaluateInPage(overridesScript);
        console.log("Context initialized with overrides");
      }
    } catch (error) {
      console.error("Failed to ensure context:", error);
      throw error;
    }
  }

  async execute(script) {
    return await this.browserInstance.evaluateInPage(script);
  }

  async executeContinuous(script) {
    const scriptId = this.scriptManager.generateScriptId();
    const stream = new PassThrough();

    try {
      await this.ensureContext();
      await this.setupScriptExecution(scriptId, script, stream);
      return { stream, scriptId };
    } catch (error) {
      stream.destroy();
      throw error;
    }
  }

  async setupScriptExecution(scriptId, script, stream) {
    try {
      const sendResultFunctionName = `sendResult_${scriptId}`;

      await this.browserInstance.exposeFunction(
        sendResultFunctionName,
        (data) => {
          stream.write(JSON.stringify({ data, scriptId }));
        },
      );

      await this.browserInstance.evaluateInPage(`
        (async () => {
          try {
            window.__currentScriptId = '${scriptId}';
            window.sendResult = window.${sendResultFunctionName};

            ${script}
          } catch (error) {
            window.${sendResultFunctionName}({ error: error.message });
          }
        })();
      `);

      this.registerScript(scriptId, stream);
    } catch (error) {
      console.error("Setup script execution error:", error);
      throw error;
    }
  }

  registerScript(scriptId, stream) {
    this.scriptManager.registerScript(scriptId, {
      stream,
      cleanup: async () => {
        try {
          await this.cleanupScript(scriptId);
          stream.destroy();
        } catch (error) {
          console.error("Script cleanup error:", error);
        }
      },
    });

    stream.on("end", () => this.stopScript(scriptId));
    stream.on("close", () => this.stopScript(scriptId));
  }

  async cleanupScript(scriptId) {
    await this.browserInstance.evaluateInPage(`
      window.cleanupScript('${scriptId}');
    `);
  }

  async stopScript(scriptId) {
    return await this.scriptManager.stopScript(scriptId);
  }
}
