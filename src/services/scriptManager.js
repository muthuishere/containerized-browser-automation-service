export class ScriptManager {
  constructor() {
    this.activeScripts = new Map();
  }

  generateScriptId() {
    return `script_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  registerScript(scriptId, { stream, cleanup }) {
    this.activeScripts.set(scriptId, { stream, cleanup });
    return scriptId;
  }

  async stopScript(scriptId) {
    const script = this.activeScripts.get(scriptId);
    if (script?.cleanup) {
      await script.cleanup();
      this.activeScripts.delete(scriptId);
      return true;
    }
    return false;
  }

  async stopAllScripts() {
    const promises = Array.from(this.activeScripts.keys()).map((id) =>
      this.stopScript(id),
    );
    await Promise.all(promises);
  }
}
