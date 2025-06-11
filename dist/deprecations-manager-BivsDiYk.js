import { notify } from './error-1KvIsB9S.js';
import { e as exportedHooks } from './core-U_kQgoO-.js';

// PyScript Derepcations Plugin

// react lazily on PyScript bootstrap
exportedHooks.main.onReady.add(checkDeprecations);
exportedHooks.main.onWorker.add(checkDeprecations);

/**
 * Check that there are no scripts loading from pyscript.net/latest
 */
function checkDeprecations() {
    const scripts = document.querySelectorAll("script");
    for (const script of scripts) checkLoadingScriptsFromLatest(script.src);
}

/**
 * Check if src being loaded from pyscript.net/latest and display a notification if true
 * * @param {string} src
 */
function checkLoadingScriptsFromLatest(src) {
    if (/\/pyscript\.net\/latest/.test(src)) {
        notify(
            "Loading scripts from latest is deprecated and will be removed soon. Please use a specific version instead.",
        );
    }
}
//# sourceMappingURL=deprecations-manager-BivsDiYk.js.map
