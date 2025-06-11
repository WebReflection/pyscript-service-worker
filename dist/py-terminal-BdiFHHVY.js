import { T as TYPES, b as customObserver, r as relative_url } from './core-U_kQgoO-.js';
import { notify } from './error-1KvIsB9S.js';

// PyScript py-terminal plugin

// will contain all valid selectors
const SELECTORS = [];

// avoid processing same elements twice
const processed = new WeakSet();

// show the error on main and
// stops the module from keep executing
const notifyAndThrow = (message) => {
    notify(message);
    throw new Error(message);
};

const onceOnMain = ({ attributes: { worker } }) => !worker;

let addStyle = true;

for (const type of TYPES.keys()) {
    const selector = `script[type="${type}"][terminal],${type}-script[terminal]`;
    SELECTORS.push(selector);
    customObserver.set(selector, async (element) => {
        // we currently support only one terminal on main as in "classic"
        const terminals = document.querySelectorAll(SELECTORS.join(","));
        if ([].filter.call(terminals, onceOnMain).length > 1)
            notifyAndThrow("You can use at most 1 main terminal");

        // import styles lazily
        if (addStyle) {
            addStyle = false;
            document.head.append(
                Object.assign(document.createElement("link"), {
                    rel: "stylesheet",
                    href: relative_url("./xterm.css", import.meta.url),
                }),
            );
        }

        if (processed.has(element)) return;
        processed.add(element);

        const bootstrap = (module) => module.default(element);

        // we can't be smart with template literals for the dynamic import
        // or bundlers are incapable of producing multiple files around
        if (type === "mpy") {
            await import(/* webpackIgnore: true */ './mpy-B89xX_bX.js').then(
                bootstrap,
            );
        } else {
            await import(/* webpackIgnore: true */ './py-Nb7faTHJ.js').then(
                bootstrap,
            );
        }
    });
}
//# sourceMappingURL=py-terminal-BdiFHHVY.js.map
