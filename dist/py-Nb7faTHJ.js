import { e as exportedHooks, d as defineProperties } from './core-U_kQgoO-.js';

// PyScript py-terminal plugin

const bootstrapped = new WeakSet();

// this callback will be serialized as string and it never needs
// to be invoked multiple times. Each xworker here is bootstrapped
// only once thanks to the `sync.is_pyterminal()` check.
const workerReady = ({ interpreter, io, run, type }, { sync }) => {
    if (type !== "py" || !sync.is_pyterminal()) return;

    run(
        [
            "from polyscript import currentScript as _",
            "__terminal__ = _.terminal",
            "del _",
        ].join(";"),
    );

    let data = "";
    const { pyterminal_read, pyterminal_write } = sync;
    const decoder = new TextDecoder();
    const generic = {
        isatty: false,
        write(buffer) {
            data = decoder.decode(buffer);
            pyterminal_write(data);
            return buffer.length;
        },
    };

    io.stderr = (error) => {
        pyterminal_write(String(error.message || error));
    };

    interpreter.setStdout(generic);
    interpreter.setStderr(generic);
    interpreter.setStdin({
        isatty: false,
        stdin: () => pyterminal_read(data),
    });
};

var py = async (element) => {
    // lazy load these only when a valid terminal is found
    const [{ Terminal }, { Readline }, { FitAddon }, { WebLinksAddon }] =
        await Promise.all([
            import(/* webpackIgnore: true */ './xterm-Dp_0I5Wl.js'),
            import(
                /* webpackIgnore: true */ './xterm-readline-JMDDN57U.js'
            ),
            import(
                /* webpackIgnore: true */ './xterm_addon-fit-CW69VZXO.js'
            ),
            import(
                /* webpackIgnore: true */ './xterm_addon-web-links-CyLm3EZ8.js'
            ),
        ]);

    const readline = new Readline();

    // common main thread initialization for both worker
    // or main case, bootstrapping the terminal on its target
    const init = (options) => {
        let target = element;
        const selector = element.getAttribute("target");
        if (selector) {
            target =
                document.getElementById(selector) ||
                document.querySelector(selector);
            if (!target) throw new Error(`Unknown target ${selector}`);
        } else {
            target = document.createElement("py-terminal");
            target.style.display = "block";
            element.after(target);
        }
        const terminal = new Terminal({
            theme: {
                background: "#191A19",
                foreground: "#F5F2E7",
            },
            ...options,
        });
        const fitAddon = new FitAddon();
        terminal.loadAddon(fitAddon);
        terminal.loadAddon(readline);
        terminal.loadAddon(new WebLinksAddon());
        terminal.open(target);
        fitAddon.fit();
        terminal.focus();
        defineProperties(element, {
            terminal: { value: terminal },
            process: {
                value: async (code) => {
                    for (const line of code.split(/(?:\r\n|\r|\n)/)) {
                        terminal.paste(`${line}`);
                        terminal.write("\r\n");
                        do {
                            await new Promise((resolve) =>
                                setTimeout(resolve, 0),
                            );
                        } while (!readline.activeRead?.resolve);
                        readline.activeRead.resolve(line);
                    }
                },
            },
        });
        return terminal;
    };

    // branch logic for the worker
    if (element.hasAttribute("worker")) {
        // add a hook on the main thread to setup all sync helpers
        // also bootstrapping the XTerm target on main *BUT* ...
        exportedHooks.main.onWorker.add(function worker(_, xworker) {
            // ... as multiple workers will add multiple callbacks
            // be sure no xworker is ever initialized twice!
            if (bootstrapped.has(xworker)) return;
            bootstrapped.add(xworker);

            // still cleanup this callback for future scripts/workers
            exportedHooks.main.onWorker.delete(worker);

            init({
                disableStdin: false,
                cursorBlink: true,
                cursorStyle: "block",
                lineHeight: 1.2,
            });

            xworker.sync.is_pyterminal = () => true;
            xworker.sync.pyterminal_read = readline.read.bind(readline);
            xworker.sync.pyterminal_write = readline.write.bind(readline);
        });

        // setup remote thread JS/Python code for whenever the
        // worker is ready to become a terminal
        exportedHooks.worker.onReady.add(workerReady);

        // @see https://github.com/pyscript/pyscript/issues/2246
        const patchInput = [
            "import builtins as _b",
            "from pyscript import sync as _s",
            "_b.input = _s.pyterminal_read",
            "del _b",
            "del _s",
        ].join("\n");

        exportedHooks.worker.codeBeforeRun.add(patchInput);
        exportedHooks.worker.codeBeforeRunAsync.add(patchInput);
    } else {
        // in the main case, just bootstrap XTerm without
        // allowing any input as that's not possible / awkward
        exportedHooks.main.onReady.add(function main({ interpreter, io, run, type }) {
            if (type !== "py") return;

            console.warn("py-terminal is read only on main thread");
            exportedHooks.main.onReady.delete(main);

            // on main, it's easy to trash and clean the current terminal
            globalThis.__py_terminal__ = init({
                disableStdin: true,
                cursorBlink: false,
                cursorStyle: "underline",
            });
            run("from js import __py_terminal__ as __terminal__");
            delete globalThis.__py_terminal__;

            io.stderr = (error) => {
                readline.write(String(error.message || error));
            };

            let data = "";
            const decoder = new TextDecoder();
            const generic = {
                isatty: false,
                write(buffer) {
                    data = decoder.decode(buffer);
                    readline.write(data);
                    return buffer.length;
                },
            };
            interpreter.setStdout(generic);
            interpreter.setStderr(generic);
            interpreter.setStdin({
                isatty: false,
                stdin: () => readline.read(data),
            });
        });
    }
};

export { py as default };
//# sourceMappingURL=py-Nb7faTHJ.js.map
