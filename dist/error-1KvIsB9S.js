import { e as exportedHooks, f as buffered } from './core-U_kQgoO-.js';

// PyScript Error Plugin

let dontBotherDOM = false;
function notOnDOM() {
    dontBotherDOM = true;
}

exportedHooks.main.onReady.add(function override(pyScript) {
    // be sure this override happens only once
    exportedHooks.main.onReady.delete(override);

    // trap generic `stderr` to propagate to it regardless
    const { stderr } = pyScript.io;

    const cb = (error, ...rest) => {
        notify(error.message || error);
        // let other plugins or stderr hook, if any, do the rest
        return stderr(error, ...rest);
    };

    // override it with our own logic
    pyScript.io.stderr = pyScript.type === "py" ? cb : buffered(cb);

    // be sure uncaught Python errors are also visible
    addEventListener("error", ({ message }) => {
        if (message.startsWith("Uncaught PythonError")) notify(message);
    });
});

// Error hook utilities

// Custom function to show notifications

/**
 * Add a banner to the top of the page, notifying the user of an error
 * @param {string} message
 */
function notify(message) {
    if (dontBotherDOM) return;
    const div = document.createElement("div");
    div.className = "py-error";
    div.textContent = message;
    div.style.cssText = `
    border: 1px solid red;
    background: #ffdddd;
    color: black;
    font-family: courier, monospace;
    white-space: pre;
    overflow-x: auto;
    padding: 8px;
    margin-top: 8px;
  `;
    document.body.append(div);
}

export { notOnDOM, notify };
//# sourceMappingURL=error-1KvIsB9S.js.map
