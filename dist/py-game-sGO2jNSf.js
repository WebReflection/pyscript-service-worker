import { l as loadProgress$1, h as registry, j as define, k as configDetails, s as stdlib, a as dedent, m as getText, n as createProgress } from './core-U_kQgoO-.js';

// this file simply exports enough stuff to allow
// 3rd party libraries, including PyScript, to work

const loadProgress = (type, ...rest) => loadProgress$1(registry.get(type), ...rest);

const progress = createProgress("py-game");

const inputPatch = `
import builtins
def input(prompt=""):
    import js
    return js.prompt(prompt)

builtins.input = input
del builtins
del input
`;

let toBeWarned = true;

const hooks = {
    main: {
        onReady: async (wrap, script) => {
            if (toBeWarned) {
                toBeWarned = false;
                console.warn("⚠️ EXPERIMENTAL `py-game` FEATURE");
            }

            let config = {};
            if (script.hasAttribute("config")) {
                const value = script.getAttribute("config");
                const { json, toml, text, url } = await configDetails(value);
                if (json) config = JSON.parse(text);
                else if (toml) {
                    const { parse } = await import(
                        /* webpackIgnore: true */ './toml-DeE0u5hM.js'
                    );
                    config = parse(text);
                }
                if (config.packages) {
                    await wrap.interpreter.loadPackage("micropip");
                    const micropip = wrap.interpreter.pyimport("micropip");
                    await micropip.install(config.packages, {
                        keep_going: true,
                    });
                    micropip.destroy();
                }
                await loadProgress(
                    "py-game",
                    progress,
                    wrap.interpreter,
                    config,
                    url ? new URL(url, location.href).href : location.href,
                );
            }

            wrap.interpreter.registerJsModule("_pyscript", {
                PyWorker() {
                    throw new Error(
                        "Unable to use PyWorker in py-game scripts",
                    );
                },
                js_import: (...urls) =>
                    Promise.all(urls.map((url) => import(url))),
                get target() {
                    return script.id;
                },
            });

            await wrap.interpreter.runPythonAsync(stdlib);
            wrap.interpreter.runPython(inputPatch);

            let code = dedent(script.textContent);
            if (script.src) code = await fetch(script.src).then(getText);

            const target = script.getAttribute("target") || "canvas";
            const canvas = document.getElementById(target);
            wrap.interpreter.canvas.setCanvas2D(canvas);

            // allow 3rd party to hook themselves right before
            // the code gets executed
            const event = new CustomEvent("py-game", {
                bubbles: true,
                cancelable: true,
                detail: {
                    canvas,
                    code,
                    config,
                    wrap,
                },
            });
            script.dispatchEvent(event);
            // run only if the default was not prevented
            if (!event.defaultPrevented)
                await wrap.interpreter.runPythonAsync(code);
        },
    },
};

define("py-game", {
    config: { packages: ["pygame-ce"] },
    configURL: new URL("./config.txt", location.href).href,
    interpreter: "pyodide",
    env: "py-game",
    hooks,
});
//# sourceMappingURL=py-game-sGO2jNSf.js.map
