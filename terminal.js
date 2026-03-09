export class TerminalConsole {
  constructor({ onCommand, history = [] } = {}) {
    this.onCommand = onCommand;
    this.history = history;
    this.historyIndex = history.length;
    this.outputNode = null;
    this.inputNode = null;
  }

  render() {
    return `
      <div class="terminal-shell">
        <div class="panel-heading compact">
          <div>
            <div class="section-kicker">Analytics Terminal</div>
            <h1>NEXUS COMMAND CONSOLE</h1>
          </div>
          <div class="panel-badges">
            <span class="badge badge-cyan">Unix-style</span>
            <span class="badge badge-magenta">Command routing</span>
          </div>
        </div>
        <div class="terminal-output" data-terminal-output></div>
        <form class="terminal-input-row" data-terminal-form>
          <span class="terminal-prompt">nexus@analytics:~$</span>
          <input class="terminal-input" name="command" data-terminal-input type="text" autocomplete="off" spellcheck="false" placeholder="Try: open dashboard, show projects, run analysis">
        </form>
        <div class="terminal-help">
          <span>Commands</span><span>open dashboard</span><span>show projects</span><span>run analysis</span><span>load dataset</span><span>generate report</span><span>help</span>
        </div>
      </div>
    `;
  }

  bind(container) {
    this.outputNode = container.querySelector("[data-terminal-output]");
    this.inputNode = container.querySelector("[data-terminal-input]");
    const form = container.querySelector("[data-terminal-form]");

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const value = this.inputNode.value.trim();
      if (!value) return;
      this.history.push(value);
      this.historyIndex = this.history.length;
      this.printCommand(value);
      this.routeCommand(value);
      this.inputNode.value = "";
    });

    this.inputNode.addEventListener("keydown", (event) => {
      if (event.key === "ArrowUp") {
        event.preventDefault();
        this.historyIndex = Math.max(0, this.historyIndex - 1);
        this.inputNode.value = this.history[this.historyIndex] || "";
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        this.historyIndex = Math.min(this.history.length, this.historyIndex + 1);
        this.inputNode.value = this.history[this.historyIndex] || "";
      }
    });

    this.seedWelcome();
    window.setTimeout(() => this.inputNode.focus(), 80);
  }

  seedWelcome() {
    [
      "NEXUS//OS v8 analytics terminal initialized.",
      "Use commands to open apps, trigger dataset analysis, and generate executive reports.",
      "Type help for a quick command list.",
    ].forEach((line, index) => this.printOutput(line, index === 0 ? "cyan" : "muted"));
  }

  printCommand(command) {
    const row = document.createElement("div");
    row.className = "terminal-line command";
    row.innerHTML = `<span class="terminal-line-prompt">nexus@analytics:~$</span><span>${command}</span>`;
    this.outputNode.appendChild(row);
    this.scrollToBottom();
  }

  printOutput(message, tone = "default") {
    const row = document.createElement("div");
    row.className = `terminal-line ${tone}`;
    row.textContent = message;
    this.outputNode.appendChild(row);
    this.scrollToBottom();
  }

  printBlock(lines, tone = "default") {
    lines.forEach((line) => this.printOutput(line, tone));
  }

  routeCommand(rawCommand) {
    const normalized = rawCommand.trim().toLowerCase();
    if (normalized === "help") {
      this.printBlock([
        "open dashboard     Launch the BI Dashboard Center",
        "show projects      Open the Projects Database",
        "run analysis       Analyze the current dataset",
        "load dataset       Open the Dataset Analyzer",
        "generate report    Produce an executive summary from NEXUS AI",
        "open sql           Launch the SQL Query Console",
        "open ai            Launch the AI Analytics Assistant",
        "clear              Clear terminal output",
      ], "muted");
      return;
    }
    if (normalized === "clear") {
      this.outputNode.innerHTML = "";
      return;
    }
    if (this.onCommand) {
      const result = this.onCommand(normalized, rawCommand);
      if (typeof result === "string") {
        this.printOutput(result, "cyan");
        return;
      }
      if (Array.isArray(result)) {
        this.printBlock(result, "cyan");
        return;
      }
    }
    this.printOutput(`Command not recognized: ${rawCommand}`, "error");
  }

  scrollToBottom() {
    this.outputNode.scrollTop = this.outputNode.scrollHeight;
  }
}
