import { PassThrough } from "stream";

export class ScriptExecutorService {
  constructor(browserInstance, scriptManager) {
    this.browserInstance = browserInstance;
    this.scriptManager = scriptManager;
  }

  async execute(script) {
    return await this.browserInstance.evaluateInPage(script);
  }

  async executeContinuous(script) {
    const scriptId = this.scriptManager.generateScriptId();
    const stream = new PassThrough();

    try {
      await this.setupScriptExecution(scriptId, script, stream);
      return { stream, scriptId };
    } catch (error) {
      stream.destroy();
      throw error;
    }
  }

  async setupScriptExecution(scriptId, script, stream) {
    // Expose result sending function
    await this.browserInstance.exposeFunction("sendResult", (data) => {
      stream.write(JSON.stringify({ data, scriptId }));
    });

    // Setup script with cleanup handlers
    await this.browserInstance.evaluateInPage(`
      (async () => {
        try {
          // Create cleanup handler
          window.scriptCleanup_${scriptId} = () => {
            if (window.scriptInterval_${scriptId}) clearInterval(window.scriptInterval_${scriptId});
            if (window.scriptObserver_${scriptId}) window.scriptObserver_${scriptId}.disconnect();

            // Cleanup globals
            delete window.scriptCleanup_${scriptId};
            delete window.scriptInterval_${scriptId};
            delete window.scriptObserver_${scriptId};
          };

          // Modify and execute script
          const modifiedScript = \`
            ${this.modifyScript(script, scriptId)}
          \`;
          eval(modifiedScript);
        } catch (error) {
          window.sendResult({ error: error.message });
        }
      })();
    `);

    // Register script for cleanup
    this.registerScript(scriptId, stream);
  }

  modifyScript(script, scriptId) {
    return script
      .replace(
        /setInterval\(/g,
        `window.scriptInterval_${scriptId} = setInterval(`,
      )
      .replace(
        /new MutationObserver\(/g,
        `window.scriptObserver_${scriptId} = new MutationObserver(`,
      );
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

    // Handle stream lifecycle
    stream.on("end", () => this.stopScript(scriptId));
    stream.on("close", () => this.stopScript(scriptId));
  }

  async cleanupScript(scriptId) {
    await this.browserInstance.evaluateInPage(`
      if (window.scriptCleanup_${scriptId}) {
        window.scriptCleanup_${scriptId}();
      }
    `);
  }

  async stopScript(scriptId) {
    return await this.scriptManager.stopScript(scriptId);
  }
}
