/* eslint no-unused-vars: 0 */
try {
    crypto.randomUUID();
} catch (_) {
    if (location.href.startsWith("http://0.0.0.0"))
        location.href = location.href.replace("0.0.0.0", "localhost");
}

/**
 * Allow leaking a module globally to help avoid conflicting exports
 * if the module might have been re-bundled in other projects.
 * @template T
 * @param {string} name the module name to save or retrieve
 * @param {T} value the module as value to save if not known
 * @param {globalThis} [global=globalThis] the reference where modules are saved where `globalThis` is the default
 * @returns {[T, boolean]} the passed `value` or the previous one as first entry, a boolean indicating if it was known or not
 */
const stickyModule$1 = (name, value, global = globalThis) => {
  const symbol = Symbol.for(name);
  const known = symbol in global;
  return [
    known ?
      global[symbol] :
      Object.defineProperty(global, symbol, { value })[symbol],
    known
  ];
};

//@ts-check

/**
 * @template T
 * @typedef {{promise: Promise<T>, resolve: (value: T) => void, reject: (reason?: any) => void}} Resolvers
 */

//@ts-ignore
const withResolvers$4 = Promise.withResolvers;

/**
 * @template T
 * @type {() => Resolvers<T>}
 */
var withResolvers$5 = withResolvers$4.bind(Promise);

// REQUIRES INTEGRATION TEST
/* c8 ignore start */
const io = new WeakMap();
const stdio = (init) => {
    const context = init || console;
    const localIO = {
        // allow plugins or other io manipulating logic to reuse
        // the buffered utility exposed in here (see py-editor)
        buffered,
        stderr: (context.stderr || console.error).bind(context),
        stdout: (context.stdout || console.log).bind(context),
    };
    return {
        stderr: (...args) => localIO.stderr(...args),
        stdout: (...args) => localIO.stdout(...args),
        async get(engine) {
            const interpreter = await engine;
            io.set(interpreter, localIO);
            return interpreter;
        },
    };
};

const decoder$1 = new TextDecoder();
const buffered = (callback, EOL = 10) => {
    const buffer = [];
    return (maybeUI8) => {
        if (maybeUI8 instanceof Uint8Array) {
            for (const c of maybeUI8) {
                if (c === EOL)
                    callback(decoder$1.decode(new Uint8Array(buffer.splice(0))));
                else
                    buffer.push(c);
            }
        }
        // if io.stderr(error) is passed instead
        // or any io.stdout("thing") this should
        // still work as expected
        else {
            callback(maybeUI8);
        }
    };
};
/* c8 ignore stop */

// a bit terser code than I usually write but it's 10 LOC within 80 cols
// if you are struggling to follow the code you can replace 1-char
// references around with the following one, hoping that helps :-)

// d => descriptors
// k => key
// p => promise
// r => response

const d = Object.getOwnPropertyDescriptors(Response.prototype);

const isFunction = value => typeof value === 'function';

const bypass = (p, k, { get, value }) => get || !isFunction(value) ?
                p.then(r => r[k]) :
                (...args) => p.then(r => r[k](...args));

const direct = (p, value) => isFunction(value) ? value.bind(p) : value;

const handler = {
    get: (p, k) => d.hasOwnProperty(k) ? bypass(p, k, d[k]) : direct(p, p[k])
};

/**
 * @param {RequestInfo | URL} input
 * @param  {...RequestInit} init
 * @returns {Promise<Response> & Response}
 */
var fetch$1 = (input, ...init) => new Proxy(fetch(input, ...init), handler);

const { assign: assign$4 } = Object;

const STORAGE$1 = 'entries';
const READONLY$1 = 'readonly';
const READWRITE$1 = 'readwrite';

/**
 * @typedef {Object} IDBMapOptions
 * @prop {'strict' | 'relaxed' | 'default'} [durability]
 * @prop {string} [prefix]
 */

/** @typedef {[IDBValidKey, unknown]} IDBMapEntry */

/** @type {IDBMapOptions} */
const defaultOptions$1 = { durability: 'default', prefix: 'IDBMap' };

/**
 * @template T
 * @param {{ target: IDBRequest<T> }} event
 * @returns {T}
 */
const result$2 = ({ target: { result } }) => result;

let IDBMap$1 = class IDBMap extends EventTarget {
  // Privates
  /** @type {Promise<IDBDatabase>} */ #db;
  /** @type {IDBMapOptions} */ #options;
  /** @type {string} */ #prefix;

  /**
   * @template T
   * @param {(store: IDBObjectStore) => IDBRequest<T>} what
   * @param {'readonly' | 'readwrite'} how
   * @returns {Promise<T>}
   */
  async #transaction(what, how) {
    const db = await this.#db;
    const t = db.transaction(STORAGE$1, how, this.#options);
    return new Promise((onsuccess, onerror) => assign$4(
      what(t.objectStore(STORAGE$1)),
      {
        onsuccess,
        onerror,
      }
    ));
  }

  /**
   * @param {string} name
   * @param {IDBMapOptions} options
   */
  constructor(
    name,
    {
      durability = defaultOptions$1.durability,
      prefix = defaultOptions$1.prefix,
    } = defaultOptions$1
  ) {
    super();
    this.#prefix = prefix;
    this.#options = { durability };
    this.#db = new Promise((resolve, reject) => {
      assign$4(
        indexedDB.open(`${this.#prefix}/${name}`),
        {
          onupgradeneeded({ target: { result, transaction } }) {
            if (!result.objectStoreNames.length)
              result.createObjectStore(STORAGE$1);
            transaction.oncomplete = () => resolve(result);
          },
          onsuccess(event) {
            resolve(result$2(event));
          },
          onerror(event) {
            reject(event);
            this.dispatchEvent(event);
          },
        },
      );
    }).then(result => {
      const boundDispatch = this.dispatchEvent.bind(this);
      for (const key in result) {
        if (key.startsWith('on'))
          result[key] = boundDispatch;
      }
      return result;
    });
  }

  // EventTarget Forwards
  /**
   * @param {Event} event
   * @returns 
   */
  dispatchEvent(event) {
    const { type, message, isTrusted } = event;
    return super.dispatchEvent(
      // avoid re-dispatching of the same event
      isTrusted ?
        assign$4(new Event(type), { message }) :
        event
    );
  }

  // IDBDatabase Forwards
  async close() {
    (await this.#db).close();
  }

  // Map async API
  get size() {
    return this.#transaction(
      store => store.count(),
      READONLY$1,
    ).then(result$2);
  }

  async clear() {
    await this.#transaction(
      store => store.clear(),
      READWRITE$1,
    );
  }

  /**
   * @param {IDBValidKey} key
   */
  async delete(key) {
    await this.#transaction(
      store => store.delete(key),
      READWRITE$1,
    );
  }

  /**
   * @returns {Promise<IDBMapEntry[]>}
   */
  async entries() {
    const keys = await this.keys();
    return Promise.all(keys.map(key => this.get(key).then(value => [key, value])));
  }

  /**
   * @param {(unknown, IDBValidKey, IDBMap) => void} callback
   * @param {unknown} [context]
   */
  async forEach(callback, context = this) {
    for (const [key, value] of await this.entries())
      await callback.call(context, value, key, this);
  }

  /**
   * @param {IDBValidKey} key
   * @returns {Promise<unknown | undefined>}
   */
  async get(key) {
    const value = await this.#transaction(
      store => store.get(key),
      READONLY$1,
    ).then(result$2);
    return value;
  }

  /**
   * @param {IDBValidKey} key
   */
  async has(key) {
    const k = await this.#transaction(
      store => store.getKey(key),
      READONLY$1,
    ).then(result$2);
    return k !== void 0;
  }

  async keys() {
    const keys = await this.#transaction(
      store => store.getAllKeys(),
      READONLY$1,
    ).then(result$2);
    return keys;
  }

  /**
   * @param {IDBValidKey} key
   * @param {unknown} value
   */
  async set(key, value) {
    await this.#transaction(
      store => store.put(value, key),
      READWRITE$1,
    );
    return this;
  }

  async values() {
    const keys = await this.keys();
    return Promise.all(keys.map(key => this.get(key)));
  }

  get [Symbol.toStringTag]() {
    return this.#prefix;
  }
};

class IDBMapSync extends Map {
  #map;
  #queue;
  constructor(...args) {
    super();
    this.#map = new IDBMap$1(...args);
    this.#queue = this.#map.entries().then(entries => {
      for (const [key, value] of entries)
        super.set(key, value);
    });
  }
  async close() {
    await this.#queue;
    await this.#map.close();
  }
  async sync() {
    await this.#queue;
  }
  clear() {
    this.#queue = this.#queue.then(() => this.#map.clear());
    return super.clear();
  }
  delete(key) {
    this.#queue = this.#queue.then(() => this.#map.delete(key));
    return super.delete(key);
  }
  set(key, value) {
    this.#queue = this.#queue.then(() => this.#map.set(key, value));
    return super.set(key, value);
  }
}

function content (t) {
  for (var s = t[0], i = 1, l = arguments.length; i < l; i++)
    s += arguments[i] + t[i];
  return s;
}

const dedent$1 = {
  object(...args) {
    return this.string(content(...args));
  },
  string(content) {
    for (const line of content.split(/[\r\n]+/)) {
      // skip initial empty lines
      if (line.trim().length) {
        // trap indentation at the very first line of code
        if (/^(\s+)/.test(line))
          content = content.replace(new RegExp('^' + RegExp.$1, 'gm'), '');
        // no indentation? all good: get out of here!
        break;
      }
    }
    return content;
  }
};

/**
 * Usable both as template literal tag or just as callback for strings, removes all spaces found
 * at the very first line of code encountered while sanitizing, keeping everything else around.
 * @param {string | TemplateStringsArray} tpl either code as string or as template, when used as tag
 * @param  {...any} values the template interpolations, when used as tag
 * @returns {string} code without undesired indentation
 */
const codedent = (tpl, ...values) => dedent$1[typeof tpl](tpl, ...values);

/**
 * Copyright (C) 2017-present by Andrea Giammarchi - @WebReflection
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

const {replace} = '';

// escape
const es = /&(?:amp|#38|lt|#60|gt|#62|apos|#39|quot|#34);/g;


// unescape
const unes = {
  '&amp;': '&',
  '&#38;': '&',
  '&lt;': '<',
  '&#60;': '<',
  '&gt;': '>',
  '&#62;': '>',
  '&apos;': "'",
  '&#39;': "'",
  '&quot;': '"',
  '&#34;': '"'
};
const cape = m => unes[m];

/**
 * Safely unescape previously escaped entities such as `&`, `<`, `>`, `"`,
 * and `'`.
 * @param {string} un a previously escaped string
 * @returns {string} the unescaped input, and it **throws** an error if
 *  the input type is unexpected, except for boolean and numbers,
 *  converted as string.
 */
const unescape$1 = un => replace.call(un, es, cape);

/** @type {(tpl: string | TemplateStringsArray, ...values:any[]) => string} */
const dedent = codedent;

/** @type {(value:string) => string} */
const unescape = unescape$1;

const { isArray: isArray$3 } = Array;

const { assign: assign$3, create: create$1, defineProperties, defineProperty: defineProperty$3, entries: entries$1 } = Object;

const { all, resolve: resolve$2 } = new Proxy(Promise, {
    get: ($, name) => $[name].bind($),
});

const absoluteURL = (path, base = location.href) =>
    new URL(path, base.replace(/^blob:/, '')).href;

function fixedRelative(path) {
    return path.startsWith('.') ? absoluteURL(path, this) : path;
}

/* c8 ignore start */
let id = 0;
const nodeInfo = (node, type) => ({
    id: node.id || (node.id = `${type}-w${id++}`),
    tag: node.tagName
});

/**
 * Notify the main thread about element "readiness".
 * @param {HTMLScriptElement | HTMLElement} target the script or custom-type element
 * @param {string} type the custom/type as event prefix
 * @param {string} what the kind of event to dispatch, i.e. `ready` or `done`
 * @param {boolean} [worker = false] `true` if dispatched form a worker, `false` by default if in main
 * @param {globalThis.CustomEvent} [CustomEvent = globalThis.CustomEvent] the `CustomEvent` to use
 */
const dispatch = (target, type, what, worker = false, CE = CustomEvent) => {
    target.dispatchEvent(
        new CE(`${type}:${what}`, {
            bubbles: true,
            detail: { worker },
        })
    );
};

const createResolved = (module, type, config, interpreter) => ({
    type,
    config,
    interpreter,
    io: io.get(interpreter),
    run: (code, ...args) => module.run(interpreter, code, ...args),
    runAsync: (code, ...args) => module.runAsync(interpreter, code, ...args),
    runEvent: (...args) => module.runEvent(interpreter, ...args),
});

const dropLine0 = code => code.replace(/^(?:\n|\r\n)/, '');

const createOverload = (module, name, before, after) => {
    const method = module[name].bind(module);
    module[name] = name === 'run' ?
        // patch the sync method
        (interpreter, code, ...args) => {
            if (before) method(interpreter, before, ...args);
            const result = method(interpreter, dropLine0(code), ...args);
            if (after) method(interpreter, after, ...args);
            return result;
        } :
        // patch the async one
        async (interpreter, code, ...args) => {
            if (before) await method(interpreter, before, ...args);
            const result = await method(interpreter, dropLine0(code), ...args);
            if (after) await method(interpreter, after, ...args);
            return result;
        };
};

const js_modules = Symbol.for('polyscript.js_modules');

const jsModules = new Map;
defineProperty$3(globalThis, js_modules, { value: jsModules });

const JSModules = new Proxy(jsModules, {
    get: (map, name) => map.get(name),
    has: (map, name) => map.has(name),
    ownKeys: map => [...map.keys()],
});

const has$1 = (_, field) => !field.startsWith('_');

const proxy = (modules, name) => new Proxy(
    modules,
    { has: has$1, get: (modules, field) => modules[name][field] }
);

const registerJSModules = (type, module, interpreter, modules) => {
    // Pyodide resolves JS modules magically
    if (type === 'pyodide') return;

    // other runtimes need this pretty ugly dance (it works though)
    const jsModules = 'polyscript.js_modules';
    for (const name of Reflect.ownKeys(modules))
        module.registerJSModule(interpreter, `${jsModules}.${name}`, proxy(modules, name));
    module.registerJSModule(interpreter, jsModules, modules);
};

const importJS = (source, name) => import(source).then(esm => {
    jsModules.set(name, { ...esm });
});

const importCSS = href => new Promise((onload, onerror) => {
    if (document.querySelector(`link[rel="stylesheet"][href="${href}"]`)) {
        onload();
    }
    else {
        document.head.append(
            assign$3(
                document.createElement('link'),
                { rel: 'stylesheet', href, onload, onerror },
            )
        );
    }
});

const isCSS = source => /\.css$/i.test(new URL(source).pathname);

const isSync = element =>
    /^(?:false|0|no)$/i.test(element.getAttribute('async'));

const RUNNING_IN_WORKER = !globalThis.window;

// REQUIRES INTEGRATION TEST
/* c8 ignore start */

// This should be the only helper needed for all Emscripten based FS exports
const writeFile = ({ FS, PATH, PATH_FS }, path, buffer) => {
    const absPath = PATH_FS.resolve(path);
    const dirPath = PATH.dirname(absPath);
    if (FS.mkdirTree) FS.mkdirTree(dirPath);
    else mkdirTree(FS, dirPath);
    return FS.writeFile(absPath, new Uint8Array(buffer), {
        canOwn: true,
    });
};

// This is instead a fallback for Lua or others
const writeFileShim = (FS, path, buffer) => {
    mkdirTree(FS, dirname(path));
    path = resolve$1(FS, path);
    return FS.writeFile(path, new Uint8Array(buffer), { canOwn: true });
};

const dirname = (path) => {
    const tree = path.split('/');
    tree.pop();
    return tree.join('/');
};

const mkdirTree = (FS, path) => {
    const current = [];
    for (const branch of path.split('/')) {
        if (branch === '.' || branch === '..') continue;
        current.push(branch);
        if (branch) FS.mkdir(current.join('/'));
    }
};

const resolve$1 = (FS, path) => {
    const tree = [];
    for (const branch of path.split('/')) {
        switch (branch) {
            case '':
                break;
            case '.':
                break;
            case '..':
                tree.pop();
                break;
            default:
                tree.push(branch);
        }
    }
    return [FS.cwd()].concat(tree).join('/').replace(/^\/+/, '/');
};

const calculateFetchPaths = (config_fetch) => {
    for (const { files, to_file, from = '' } of config_fetch) {
        if (files !== undefined && to_file !== undefined)
            throw new Error(
                'Cannot use \'to_file\' and \'files\' parameters together!',
            );
        if (files === undefined && to_file === undefined && from.endsWith('/'))
            throw new Error(
                `Couldn't determine the filename from the path ${from}, please supply 'to_file' parameter.`,
            );
    }
    return config_fetch.flatMap(
        ({ from = '', to_folder = '.', to_file, files }) => {
            if (isArray$3(files))
                return files.map((file) => ({
                    url: joinPaths([from, file]),
                    path: joinPaths([to_folder, file]),
                }));
            const filename = to_file || from.slice(1 + from.lastIndexOf('/'));
            return [{ url: from, path: joinPaths([to_folder, filename]) }];
        },
    );
};

const joinPaths = (parts) => {
    const res = parts
        .map((part) => part.trim().replace(/(^[/]*|[/]*$)/g, ''))
        .filter((p) => p !== '' && p !== '.')
        .join('/');

    return parts[0].startsWith('/') ? `/${res}` : res;
};

const fetchBuffer = (url, baseURL) =>
    fetch$1(absoluteURL(url, baseURL)).arrayBuffer();

const fetchPaths = (module, interpreter, config_fetch, baseURL) =>
    all(
        calculateFetchPaths(config_fetch).map(({ url, path }) =>
            fetchBuffer(url, baseURL)
                .then((buffer) => module.writeFile(interpreter, path, buffer)),
        ),
    );

    const fillName = (source, dest) => dest.endsWith('/') ?
                        `${dest}${source.split('/').pop()}` : dest;

const parseTemplate = (src, map) => src.replace(
  /\{.+?\}/g,
  k => {
    if (!map.has(k))
      throw new SyntaxError(`Invalid template: ${k}`);
    return map.get(k);
  }
);

const calculateFilesPaths = files => {
  const map = new Map;
  const targets = new Set;
  const sourceDest = [];
  for (const [source, dest] of entries$1(files)) {
    if (/^\{.+\}$/.test(source)) {
      if (map.has(source))
        throw new SyntaxError(`Duplicated template: ${source}`);
      map.set(source, parseTemplate(dest, map));
    }
    else {
      const url = parseTemplate(source, map);
      const path = fillName(url, parseTemplate(dest || './', map));
      if (targets.has(path) && !path.endsWith('/*'))
        throw new SyntaxError(`Duplicated destination: ${path}`);
      targets.add(path);
      sourceDest.push({ url, path });
    }
  }
  return sourceDest;
};

const fetchFiles = (module, interpreter, config_files, baseURL) =>
    all(
        calculateFilesPaths(config_files).map(({ url, path }) =>
            fetchBuffer(url, baseURL)
                .then((buffer) => module.writeFile(
                    interpreter,
                    path,
                    buffer,
                    url,
                )),
        ),
    );

const fetchJSModules = ({ main, worker }, baseURL) => {
    const promises = [];
    if (worker && RUNNING_IN_WORKER) {
        for (let [source, name] of entries$1(worker)) {
            source = absoluteURL(source, baseURL);
            promises.push(importJS(source, name));
        }
    }
    if (main && !RUNNING_IN_WORKER) {
        for (let [source, name] of entries$1(main)) {
            source = absoluteURL(source, baseURL);
            if (isCSS(source)) importCSS(source);
            else promises.push(importJS(source, name));
        }
    }
    return all(promises);
};

const createProgress = prefix => detail => {
    dispatchEvent(new CustomEvent(`${prefix}:progress`, { detail }));
};
/* c8 ignore stop */

let i$3 = 0;

const FALSE$1 = i$3++;
const TRUE$1 = i$3++;

const UNDEFINED$1 = i$3++;
const NULL$1 = i$3++;

const NUMBER$1 = i$3++;
const UI8$1 = i$3++;
const NAN$1 = i$3++;
const INFINITY$1 = i$3++;
const N_INFINITY$1 = i$3++;
const ZERO$1 = i$3++;
const N_ZERO$1 = i$3++;

const BIGINT$2 = i$3++;
const BIGUINT$1 = i$3++;

const STRING$1 = i$3++;

const SYMBOL$2 = i$3++;

const ARRAY$2 = i$3++;
const BUFFER$2 = i$3++;
const DATE$1 = i$3++;
const ERROR$2 = i$3++;
const MAP$1 = i$3++;
const OBJECT$2 = i$3++;
const REGEXP$1 = i$3++;
const SET$2 = i$3++;
const VIEW$2 = i$3++;

const RECURSION$1 = i$3++;

const decoder = new TextDecoder;

const encoder$2 = new TextEncoder;

/** @type {Map<symbol, string>} */
const symbols$1 = new Map(
  Reflect.ownKeys(Symbol).map(
    key => [Symbol[key], `@${String(key)}`]
  )
);

/**
 * @param {symbol} value
 * @param {string} description
 * @returns {string}
 */
const asSymbol$1 = (value, description) => (
  description === void 0 ? '?' :
  (Symbol.keyFor(value) === void 0 ? `!${description}` : `#${description}`)
);

/**
 * Extract the value from a pair of type and value.
 * @param {string} name
 * @returns {symbol}
 */
const fromSymbol$1 = name => {
  switch (name[0]) {
    case '@': return Symbol[name.slice(1)];
    case '#': return Symbol.for(name.slice(1));
    case '!': return Symbol(name.slice(1));
    default: return Symbol();
  }
};

/**
 * Create the name of a symbol.
 * @param {symbol} value
 * @returns {string}
 */
const toSymbol$1 = value => symbols$1.get(value) || asSymbol$1(value, value.description);

const defineProperty$2 = Object.defineProperty;

const isArray$2 = Array.isArray;

const isView$2 = ArrayBuffer.isView;

const MAX_ARGS$1 = 0x7FFF;

/**
 * @param {number[]} output
 * @param {Uint8Array} value 
 */
const push$1 = (output, value) => {
  for (let $ = output.push, i = 0, length = value.length; i < length; i += MAX_ARGS$1)
    $.apply(output, value.subarray(i, i + MAX_ARGS$1));
};

const buffer$1 = new ArrayBuffer(8);
const dv$1 = new DataView(buffer$1);
const u8a8$1 = new Uint8Array(buffer$1);

//@ts-check


/** @typedef {Map<number, any>} Cache */

/**
 * @param {Cache} cache
 * @param {number} index
 * @param {any} value
 * @returns {any}
 */
const $$1 = (cache, index, value) => {
  cache.set(index, value);
  return value;
};

/**
 * @param {Uint8Array} input
 */
const number = input => {
  u8a8$1[0] = input[i$2++];
  u8a8$1[1] = input[i$2++];
  u8a8$1[2] = input[i$2++];
  u8a8$1[3] = input[i$2++];
  u8a8$1[4] = input[i$2++];
  u8a8$1[5] = input[i$2++];
  u8a8$1[6] = input[i$2++];
  u8a8$1[7] = input[i$2++];
};

/**
 * @param {Uint8Array} input
 * @returns {number}
 */
const size = input => {
  u8a8$1[0] = input[i$2++];
  u8a8$1[1] = input[i$2++];
  u8a8$1[2] = input[i$2++];
  u8a8$1[3] = input[i$2++];
  return dv$1.getUint32(0, true);
};

/**
 * @param {Uint8Array} input
 * @param {Cache} cache
 * @returns {any}
 */
const deflate = (input, cache) => {
  switch (input[i$2++]) {
    case NUMBER$1: {
      number(input);
      return dv$1.getFloat64(0, true);
    }
    case UI8$1: return input[i$2++];
    case OBJECT$2: {
      const object = $$1(cache, i$2 - 1, {});
      for (let j = 0, length = size(input); j < length; j++)
        object[deflate(input, cache)] = deflate(input, cache);
      return object;
    }
    case ARRAY$2: {
      const array = $$1(cache, i$2 - 1, []);
      for (let j = 0, length = size(input); j < length; j++)
        array.push(deflate(input, cache));
      return array;
    }
    case VIEW$2: {
      const index = i$2 - 1;
      const name = deflate(input, cache);
      return $$1(cache, index, new globalThis[name](deflate(input, cache)));
    }
    case BUFFER$2: {
      const index = i$2 - 1;
      const length = size(input);
      return $$1(cache, index, input.slice(i$2, i$2 += length).buffer);
    }
    case STRING$1: {
      const index = i$2 - 1;
      const length = size(input);
      // this could be a subarray but it's not supported on the Web and
      // it wouldn't work with arrays instead of typed arrays.
      return $$1(cache, index, decoder.decode(input.slice(i$2, i$2 += length)));
    }
    case DATE$1: {
      return $$1(cache, i$2 - 1, new Date(deflate(input, cache)));
    }
    case MAP$1: {
      const map = $$1(cache, i$2 - 1, new Map);
      for (let j = 0, length = size(input); j < length; j++)
        map.set(deflate(input, cache), deflate(input, cache));
      return map;
    }
    case SET$2: {
      const set = $$1(cache, i$2 - 1, new Set);
      for (let j = 0, length = size(input); j < length; j++)
        set.add(deflate(input, cache));
      return set;
    }
    case ERROR$2: {
      const name = deflate(input, cache);
      const message = deflate(input, cache);
      const stack = deflate(input, cache);
      const Class = globalThis[name] || Error;
      const error = new Class(message);
      return $$1(cache, i$2 - 1, defineProperty$2(error, 'stack', { value: stack }));
    }
    case REGEXP$1: {
      const source = deflate(input, cache);
      const flags = deflate(input, cache);
      return $$1(cache, i$2 - 1, new RegExp(source, flags));
    }
    case FALSE$1: return false;
    case TRUE$1: return true;
    case NAN$1: return NaN;
    case INFINITY$1: return Infinity;
    case N_INFINITY$1: return -Infinity;
    case ZERO$1: return 0;
    case N_ZERO$1: return -0;
    case NULL$1: return null;
    case BIGINT$2: return (number(input), dv$1.getBigInt64(0, true));
    case BIGUINT$1: return (number(input), dv$1.getBigUint64(0, true));
    case SYMBOL$2: return fromSymbol$1(deflate(input, cache));
    case RECURSION$1: return cache.get(size(input));
    // this covers functions too
    default: return undefined;
  }
};

let i$2 = 0;

/**
 * @param {Uint8Array} value
 * @returns {any}
 */
const decode = value => {
  i$2 = 0;
  return deflate(value, new Map);
};

const { getPrototypeOf: getPrototypeOf$2 } = Object;
const { construct: construct$2 } = Reflect;
const { toStringTag: toStringTag$1 } = Symbol;

const toTag$1 = (ref, name = ref[toStringTag$1]) =>
  name in globalThis ? name : toTag$1(construct$2(getPrototypeOf$2(ref.constructor),[0]));

//@ts-check


/** @typedef {Map<number, number[]>} Cache */

const { isNaN: isNaN$1, isFinite: isFinite$1, isInteger: isInteger$1 } = Number;
const { ownKeys: ownKeys$2 } = Reflect;
const { is: is$1 } = Object;

/**
 * @param {any} input
 * @param {number[]|Stack} output
 * @param {Cache} cache
 * @returns {boolean}
 */
const process$1 = (input, output, cache) => {
  const value = cache.get(input);
  const unknown = !value;
  if (unknown) {
    dv$1.setUint32(0, output.length, true);
    cache.set(input, [u8a8$1[0], u8a8$1[1], u8a8$1[2], u8a8$1[3]]);
  }
  else
    output.push(RECURSION$1, value[0], value[1], value[2], value[3]);
  return unknown;
};

/**
 * @param {number[]|Stack} output
 * @param {number} type
 * @param {number} length
 */
const set$4 = (output, type, length) => {
  dv$1.setUint32(0, length, true);
  output.push(type, u8a8$1[0], u8a8$1[1], u8a8$1[2], u8a8$1[3]);
};

/**
 * @param {any} input
 * @param {number[]|Stack} output
 * @param {Cache} cache
 */
const inflate$1 = (input, output, cache) => {
  switch (typeof input) {
    case 'number': {
      if (input && isFinite$1(input)) {
        if (isInteger$1(input) && input < 256 && -1 < input)
          output.push(UI8$1, input);
        else {
          dv$1.setFloat64(0, input, true);
          output.push(NUMBER$1, u8a8$1[0], u8a8$1[1], u8a8$1[2], u8a8$1[3], u8a8$1[4], u8a8$1[5], u8a8$1[6], u8a8$1[7]);
        }
      }
      else if (isNaN$1(input)) output.push(NAN$1);
      else if (!input) output.push(is$1(input, 0) ? ZERO$1 : N_ZERO$1);
      else output.push(input < 0 ? N_INFINITY$1 : INFINITY$1);
      break;
    }
    case 'object': {
      switch (true) {
        case input === null:
          output.push(NULL$1);
          break;
        case !process$1(input, output, cache): break;
        case isArray$2(input): {
          const length = input.length;
          set$4(output, ARRAY$2, length);
          for (let i = 0; i < length; i++)
            inflate$1(input[i], output, cache);
          break;
        }
        case isView$2(input): {
          output.push(VIEW$2);
          inflate$1(toTag$1(input), output, cache);
          input = input.buffer;
          if (!process$1(input, output, cache)) break;
          // fallthrough
        }
        case input instanceof ArrayBuffer: {
          const ui8a = new Uint8Array(input);
          set$4(output, BUFFER$2, ui8a.length);
          //@ts-ignore
          pushView$1(output, ui8a);
          break;
        }
        case input instanceof Date:
          output.push(DATE$1);
          inflate$1(input.getTime(), output, cache);
          break;
        case input instanceof Map: {
          set$4(output, MAP$1, input.size);
          for (const [key, value] of input) {
            inflate$1(key, output, cache);
            inflate$1(value, output, cache);
          }
          break;
        }
        case input instanceof Set: {
          set$4(output, SET$2, input.size);
          for (const value of input)
            inflate$1(value, output, cache);
          break;
        }
        case input instanceof Error:
          output.push(ERROR$2);
          inflate$1(input.name, output, cache);
          inflate$1(input.message, output, cache);
          inflate$1(input.stack, output, cache);
          break;
        case input instanceof RegExp:
          output.push(REGEXP$1);
          inflate$1(input.source, output, cache);
          inflate$1(input.flags, output, cache);
          break;
        default: {
          if ('toJSON' in input) {
            const json = input.toJSON();
            inflate$1(json === input ? null : json, output, cache);
          }
          else {
            const keys = ownKeys$2(input);
            const length = keys.length;
            set$4(output, OBJECT$2, length);
            for (let i = 0; i < length; i++) {
              const key = keys[i];
              inflate$1(key, output, cache);
              inflate$1(input[key], output, cache);
            }
          }
          break;
        }
      }
      break;
    }
    case 'string': {
      if (process$1(input, output, cache)) {
        const encoded = encoder$2.encode(input);
        set$4(output, STRING$1, encoded.length);
        //@ts-ignore
        pushView$1(output, encoded);
      }
      break;
    }
    case 'boolean': {
      output.push(input ? TRUE$1 : FALSE$1);
      break;
    }
    case 'symbol': {
      output.push(SYMBOL$2);
      inflate$1(toSymbol$1(input), output, cache);
      break;
    }
    case 'bigint': {
      let type = BIGINT$2;
      if (9223372036854775807n < input) {
        dv$1.setBigUint64(0, input, true);
        type = BIGUINT$1;
      }
      else dv$1.setBigInt64(0, input, true);
      output.push(type, u8a8$1[0], u8a8$1[1], u8a8$1[2], u8a8$1[3], u8a8$1[4], u8a8$1[5], u8a8$1[6], u8a8$1[7]);
      break;
    }
    // this covers functions too
    default: {
      output.push(UNDEFINED$1);
      break;
    }
  }
};

/** @type {typeof push|typeof Stack.push} */
let pushView$1 = push$1;

/**
 * @param {any} value
 * @returns {number[]}
 */
const encode = value => {
  const output = [];
  pushView$1 = push$1;
  inflate$1(value, output, new Map);
  return output;
};

const JSON$1 = { parse: decode, stringify: encode };

const loader = new WeakMap();

// REQUIRES INTEGRATION TEST
/* c8 ignore start */
const loadProgress = async (self, progress, interpreter, config, baseURL) => {
    if (config.files) {
        progress('Loading files');
        await fetchFiles(self, interpreter, config.files, baseURL);
        progress('Loaded files');
    }
    if (config.fetch) {
        progress('Loading fetch');
        await fetchPaths(self, interpreter, config.fetch, baseURL);
        progress('Loaded fetch');
    }
    if (config.js_modules) {
        progress('Loading JS modules');
        await fetchJSModules(config.js_modules, baseURL);
        progress('Loaded JS modules');
    }
};

const registerJSModule = (interpreter, name, value) => {
    if (name === 'polyscript') {
        value.lazy_py_modules = async (...packages) => {
            await loader.get(interpreter)(packages);
            return packages.map(name => interpreter.pyimport(name));
        };
        value.storage = async (name) => {
            const storage = new IDBMapSync(name);
            await storage.sync();
            return storage;
        };
        value.JSON = JSON$1;
    }
    interpreter.registerJsModule(name, value);
};

const getFormat = (path, url) => {
    if (path.endsWith('/*')) {
        if (/\.(zip|whl|tgz|tar(?:\.gz)?)$/.test(url))
            return RegExp.$1;
        throw new Error(`Unsupported archive ${url}`);
    }
    return '';
};

const run$2 = (interpreter, code, ...args) => {
    try {
        return interpreter.runPython(dedent(code), ...args);
    }
    catch (error) {
        io.get(interpreter).stderr(error);
    }
};

const runAsync = async (interpreter, code, ...args) => {
    try {
        return await interpreter.runPythonAsync(dedent(code), ...args);
    }
    catch (error) {
        io.get(interpreter).stderr(error);
    }
};

const runEvent = async (interpreter, code, event) => {
    // allows method(event) as well as namespace.method(event)
    // it does not allow fancy brackets names for now
    const [name, ...keys] = code.split('.');
    let target = interpreter.globals.get(name);
    let context;
    for (const key of keys) [context, target] = [target, target[key]];
    try {
        await target.call(context, event);
    }
    catch (error) {
        io.get(interpreter).stderr(error);
    }
};
/* c8 ignore stop */

const registry$2 = new Map;

const type$5 = 'dummy';

// REQUIRES INTEGRATION TEST
/* c8 ignore start */
const require = name => registry$2.get(name);

const run$1 = (interpreter, code) => {
    try {
        return Function('require', code)(require);
    }
    catch (error) {
        io.get(interpreter).stderr(error);
    }
};

var dummy = {
    type: type$5,
    module: () => 'data:text/javascript,',
    engine: module => stdio().get(module),
    registerJSModule(_, name, value) {
        registry$2.set(name, value);
    },
    run: run$1,
    runAsync: run$1,
    runEvent: async (interpreter, code, event) => {
        try {
            await Function('require', 'e', `return ${code}(e)`)(require, event);
        }
        catch (error) {
            io.get(interpreter).stderr(error);
        }
    },
    transform: (_, value) => value,
    writeFile() {},
};

// ⚠️ DO NOT MODIFY - SOURCE FILE: "../../python/mip.py"
var mip = new TextEncoder().encode("_F='github:'\n_E='user-agent'\n_D=True\n_C=False\n_B='/'\n_A=None\nfrom uio import StringIO\nimport sys\nclass Response:\n\tdef __init__(A,f):A.raw=f;A.encoding='utf-8';A._cached=_A\n\tdef close(A):\n\t\tif A.raw:A.raw.close();A.raw=_A\n\t\tA._cached=_A\n\t@property\n\tdef content(self):\n\t\tA=self\n\t\tif A._cached is _A:\n\t\t\ttry:A._cached=A.raw.read()\n\t\t\tfinally:A.raw.close();A.raw=_A\n\t\treturn A._cached\n\t@property\n\tdef text(self):return str(self.content,self.encoding)\n\tdef json(A):import ujson;return ujson.loads(A.content)\nHEADERS_TO_IGNORE=_E,\ntry:import js\nexcept Exception as err:raise OSError('This version of urequests can only be used in the browser')\nHEADERS_TO_IGNORE=_E,\ndef request(method,url,data=_A,json=_A,headers={},stream=_A,auth=_A,timeout=_A,parse_headers=_D):\n\tE=timeout;D=method;C=data;from js import XMLHttpRequest as G;A=G.new();A.withCredentials=_C\n\tif auth is not _A:import ubinascii;H,I=auth;A.open(D,url,_C,H,I)\n\telse:A.open(D,url,_C)\n\tfor(F,J)in headers.items():\n\t\tif F.lower()not in HEADERS_TO_IGNORE:A.setRequestHeader(F,J)\n\tif E:A.timeout=int(E*1000)\n\tif json is not _A:assert C is _A;import ujson;C=ujson.dumps(json);A.setRequestHeader('Content-Type','application/json')\n\tA.send(C);B=Response(StringIO(A.responseText));B.status_code=A.status;B.reason=A.statusText;B.headers=A.getAllResponseHeaders();return B\ndef get(url,**A):return request('GET',url,**A)\n_PACKAGE_INDEX=const('https://micropython.org/pi/v2')\n_CHUNK_SIZE=128\ndef _ensure_path_exists(path):\n\timport os;A=path.split(_B)\n\tif not A[0]:A.pop(0);A[0]=_B+A[0]\n\tB=''\n\tfor C in range(len(A)-1):\n\t\tB+=A[C]\n\t\ttry:os.stat(B)\n\t\texcept:os.mkdir(B)\n\t\tB+=_B\ndef _chunk(src,dest):\n\tA=memoryview(bytearray(_CHUNK_SIZE))\n\twhile _D:\n\t\tB=src.readinto(A)\n\t\tif B==0:break\n\t\tdest(A if B==_CHUNK_SIZE else A[:B])\ndef _check_exists(path,short_hash):\n\tA=short_hash;import os\n\ttry:\n\t\timport binascii as C,hashlib as D\n\t\twith open(path,'rb')as E:B=D.sha256();_chunk(E,B.update);F=str(C.hexlify(B.digest())[:len(A)],'utf-8');return F==A\n\texcept:return _C\ndef _rewrite_url(url,branch=_A):\n\tB=branch;A=url\n\tif not B:B='HEAD'\n\tif A.startswith(_F):A=A[7:].split(_B);A='https://raw.githubusercontent.com/'+A[0]+_B+A[1]+_B+B+_B+_B.join(A[2:])\n\treturn A\ndef _download_file(url,dest):\n\tB=dest;A=get(url)\n\ttry:\n\t\tif A.status_code!=200:print('Error',A.status_code,'requesting',url);return _C\n\t\tprint('Copying:',B);_ensure_path_exists(B)\n\t\twith open(B,'wb')as C:_chunk(A.raw,C.write)\n\t\treturn _D\n\tfinally:A.close()\ndef _install_json(package_json_url,index,target,version,mpy):\n\tK='File not found: {} {}';I=version;H=index;G=package_json_url;D=target;E=get(_rewrite_url(G,I))\n\ttry:\n\t\tif E.status_code!=200:print('Package not found:',G);return _C\n\t\tF=E.json()\n\tfinally:E.close()\n\tfor(A,C)in F.get('hashes',()):\n\t\tB=D+_B+A\n\t\tif _check_exists(B,C):print('Exists:',B)\n\t\telse:\n\t\t\tL='{}/file/{}/{}'.format(H,C[:2],C)\n\t\t\tif not _download_file(L,B):print(K.format(A,C));return _C\n\tfor(A,J)in F.get('urls',()):\n\t\tB=D+_B+A\n\t\tif not _download_file(_rewrite_url(J,I),B):print(K.format(A,J));return _C\n\tfor(M,N)in F.get('deps',()):\n\t\tif not _install_package(M,H,D,N,mpy):return _C\n\treturn _D\ndef _install_package(package,index,target,version,mpy):\n\tD=index;C=target;B=version;A=package\n\tif A.startswith('http://')or A.startswith('https://')or A.startswith(_F):\n\t\tif A.endswith('.py')or A.endswith('.mpy'):print('Downloading {} to {}'.format(A,C));return _download_file(_rewrite_url(A,B),C+_B+A.rsplit(_B)[-1])\n\t\telse:\n\t\t\tif not A.endswith('.json'):\n\t\t\t\tif not A.endswith(_B):A+=_B\n\t\t\t\tA+='package.json'\n\t\t\tprint('Installing {} to {}'.format(A,C))\n\telse:\n\t\tif not B:B='latest'\n\t\tprint('Installing {} ({}) from {} to {}'.format(A,B,D,C));E=sys.implementation._mpy&255 if mpy and hasattr(sys.implementation,'_mpy')else'py';A='{}/package/{}/{}/{}.json'.format(D,'py',A,B)\n\treturn _install_json(A,D,C,B,mpy)\ndef install(package,index=_A,target=_A,version=_A,mpy=_D):\n\tB=target;A=index\n\tif not B:\n\t\tfor C in sys.path:\n\t\t\tif C.endswith('/lib'):B=C;break\n\t\telse:print('Unable to find lib dir in sys.path');return\n\tif not A:A=_PACKAGE_INDEX\n\tif _install_package(package,A.rstrip(_B),B,version,mpy):print('Done')\n\telse:print('Package may be partially installed')");

/* c8 ignore start */

// toml
const toml = async (text) => (
  await import(/* webpackIgnore: true */'./toml-CkEFU7ly.js')
).parse(text);

// zip
const zip = () => import(/* webpackIgnore: true */'./zip-CAMAhqMX.js');

/* c8 ignore stop */

async function syncfs(FS, direction) {
    return new Promise((resolve, reject) => {
        FS.syncfs(direction, err => {
            if (err) reject(err);
            else resolve();
        });
    });
}

// (C) Pyodide  https://github.com/pyodide/pyodide - Mozilla Public License Version 2.0
// JS port of https://github.com/pyodide/pyodide/blob/34fcd02172895d75db369994011409324f9e3cce/src/js/nativefs.ts
function initializeNativeFS(module) {
    const FS = module.FS;
    const MEMFS = module.FS.filesystems.MEMFS;
    const PATH = module.PATH;

    const nativeFSAsync = {
        // DIR_MODE: {{{ cDefine('S_IFDIR') }}} | 511 /* 0777 */,
        // FILE_MODE: {{{ cDefine('S_IFREG') }}} | 511 /* 0777 */,
        DIR_MODE: 16384 | 511,
        FILE_MODE: 32768 | 511,
        mount: function (mount) {
            if (!mount.opts.fileSystemHandle) {
                throw new Error('opts.fileSystemHandle is required');
            }

            // reuse all of the core MEMFS functionality
            return MEMFS.mount.apply(null, arguments);
        },
        syncfs: async (mount, populate, callback) => {
            try {
                const local = nativeFSAsync.getLocalSet(mount);
                const remote = await nativeFSAsync.getRemoteSet(mount);
                const src = populate ? remote : local;
                const dst = populate ? local : remote;
                await nativeFSAsync.reconcile(mount, src, dst);
                callback(null);
            } catch (e) {
                callback(e);
            }
        },
        // Returns file set of emscripten's filesystem at the mountpoint.
        getLocalSet: (mount) => {
            let entries = Object.create(null);

            function isRealDir(p) {
                return p !== '.' && p !== '..';
            }

            function toAbsolute(root) {
                return (p) => {
                    return PATH.join2(root, p);
                };
            }

            let check = FS.readdir(mount.mountpoint)
                .filter(isRealDir)
                .map(toAbsolute(mount.mountpoint));

            while (check.length) {
                let path = check.pop();
                let stat = FS.stat(path);

                if (FS.isDir(stat.mode)) {
                    check.push.apply(
                        check,
                        FS.readdir(path).filter(isRealDir).map(toAbsolute(path)),
                    );
                }

                entries[path] = { timestamp: stat.mtime, mode: stat.mode };
            }

            return { type: 'local', entries: entries };
        },
        // Returns file set of the real, on-disk filesystem at the mountpoint.
        getRemoteSet: async (mount) => {
            // TODO: this should be a map.
            const entries = Object.create(null);

            const handles = await getFsHandles(mount.opts.fileSystemHandle);
            for (const [path, handle] of handles) {
                if (path === '.') continue;

                entries[PATH.join2(mount.mountpoint, path)] = {
                    timestamp:
                        handle.kind === 'file'
                            ? (await handle.getFile()).lastModifiedDate
                            : new Date(),
                    mode:
                        handle.kind === 'file'
                            ? nativeFSAsync.FILE_MODE
                            : nativeFSAsync.DIR_MODE,
                };
            }

            return { type: 'remote', entries, handles };
        },
        loadLocalEntry: (path) => {
            const lookup = FS.lookupPath(path);
            const node = lookup.node;
            const stat = FS.stat(path);

            if (FS.isDir(stat.mode)) {
                return { timestamp: stat.mtime, mode: stat.mode };
            } else if (FS.isFile(stat.mode)) {
                node.contents = MEMFS.getFileDataAsTypedArray(node);
                return {
                    timestamp: stat.mtime,
                    mode: stat.mode,
                    contents: node.contents,
                };
            } else {
                throw new Error('node type not supported');
            }
        },
        storeLocalEntry: (path, entry) => {
            if (FS.isDir(entry['mode'])) {
                FS.mkdirTree(path, entry['mode']);
            } else if (FS.isFile(entry['mode'])) {
                FS.writeFile(path, entry['contents'], { canOwn: true });
            } else {
                throw new Error('node type not supported');
            }

            FS.chmod(path, entry['mode']);
            FS.utime(path, entry['timestamp'], entry['timestamp']);
        },
        removeLocalEntry: (path) => {
            var stat = FS.stat(path);

            if (FS.isDir(stat.mode)) {
                FS.rmdir(path);
            } else if (FS.isFile(stat.mode)) {
                FS.unlink(path);
            }
        },
        loadRemoteEntry: async (handle) => {
            if (handle.kind === 'file') {
                const file = await handle.getFile();
                return {
                    contents: new Uint8Array(await file.arrayBuffer()),
                    mode: nativeFSAsync.FILE_MODE,
                    timestamp: file.lastModifiedDate,
                };
            } else if (handle.kind === 'directory') {
                return {
                    mode: nativeFSAsync.DIR_MODE,
                    timestamp: new Date(),
                };
            } else {
                throw new Error('unknown kind: ' + handle.kind);
            }
        },
        storeRemoteEntry: async (handles, path, entry) => {
            const parentDirHandle = handles.get(PATH.dirname(path));
            const handle = FS.isFile(entry.mode)
                ? await parentDirHandle.getFileHandle(PATH.basename(path), {
                    create: true,
                })
                : await parentDirHandle.getDirectoryHandle(PATH.basename(path), {
                    create: true,
                });
            if (handle.kind === 'file') {
                const writable = await handle.createWritable();
                await writable.write(entry.contents);
                await writable.close();
            }
            handles.set(path, handle);
        },
        removeRemoteEntry: async (handles, path) => {
            const parentDirHandle = handles.get(PATH.dirname(path));
            await parentDirHandle.removeEntry(PATH.basename(path));
            handles.delete(path);
        },
        reconcile: async (mount, src, dst) => {
            let total = 0;

            const create = [];
            Object.keys(src.entries).forEach(function (key) {
                const e = src.entries[key];
                const e2 = dst.entries[key];
                if (
                    !e2 ||
                    (FS.isFile(e.mode) &&
                        e['timestamp'].getTime() > e2['timestamp'].getTime())
                ) {
                    create.push(key);
                    total++;
                }
            });
            // sort paths in ascending order so directory entries are created
            // before the files inside them
            create.sort();

            const remove = [];
            Object.keys(dst.entries).forEach(function (key) {
                if (!src.entries[key]) {
                    remove.push(key);
                    total++;
                }
            });
            // sort paths in descending order so files are deleted before their
            // parent directories
            remove.sort().reverse();

            if (!total) {
                return;
            }

            const handles = src.type === 'remote' ? src.handles : dst.handles;

            for (const path of create) {
                const relPath = PATH.normalize(
                    path.replace(mount.mountpoint, '/'),
                ).substring(1);
                if (dst.type === 'local') {
                    const handle = handles.get(relPath);
                    const entry = await nativeFSAsync.loadRemoteEntry(handle);
                    nativeFSAsync.storeLocalEntry(path, entry);
                } else {
                    const entry = nativeFSAsync.loadLocalEntry(path);
                    await nativeFSAsync.storeRemoteEntry(handles, relPath, entry);
                }
            }

            for (const path of remove) {
                if (dst.type === 'local') {
                    nativeFSAsync.removeLocalEntry(path);
                } else {
                    const relPath = PATH.normalize(
                        path.replace(mount.mountpoint, '/'),
                    ).substring(1);
                    await nativeFSAsync.removeRemoteEntry(handles, relPath);
                }
            }
        },
    };

    module.FS.filesystems.NATIVEFS_ASYNC = nativeFSAsync;

    function ensureMountPathExists(path) {
        if (FS.mkdirTree) FS.mkdirTree(path);
        else mkdirTree(FS, path);

        const { node } = FS.lookupPath(path, {
            follow_mount: false,
        });

        if (FS.isMountpoint(node)) {
            throw new Error(`path '${path}' is already a file system mount point`);
        }
        if (!FS.isDir(node.mode)) {
            throw new Error(`path '${path}' points to a file not a directory`);
        }
        // eslint-disable-next-line
        for (const _ in node.contents) {
            throw new Error(`directory '${path}' is not empty`);
        }
    }

    return async function mountNativeFS(path, fileSystemHandle) {
        if (fileSystemHandle.constructor.name !== 'FileSystemDirectoryHandle') {
            throw new TypeError(
              'Expected argument \'fileSystemHandle\' to be a FileSystemDirectoryHandle',
            );
        }
        ensureMountPathExists(path);
      
        FS.mount(
            FS.filesystems.NATIVEFS_ASYNC,
            { fileSystemHandle },
            path,
        );

        // sync native ==> browser
        await syncfs(FS, true);

        return {
            // sync browser ==> native
            syncfs: async () => await syncfs(FS, false),
        };
    };
}

const getFsHandles = async (dirHandle) => {
    const handles = [];

    async function collect(curDirHandle) {
        for await (const entry of curDirHandle.values()) {
            handles.push(entry);
            if (entry.kind === 'directory') {
                await collect(entry);
            }
        }
    }

    await collect(dirHandle);

    const result = new Map();
    result.set('.', dirHandle);
    for (const handle of handles) {
        const relativePath = (await dirHandle.resolve(handle)).join('/');
        result.set(relativePath, handle);
    }
    return result;
};

const type$4 = 'micropython';

// REQUIRES INTEGRATION TEST
/* c8 ignore start */
const mkdir = (FS, path) => {
    try {
        FS.mkdir(path);
    }
    // eslint-disable-next-line no-unused-vars
    catch (_) {
        // ignore as there's no path.exists here
    }
};

const progress$1 = createProgress('mpy');

var micropython = {
    type: type$4,
    module: (version = '1.25.0') =>
        `https://cdn.jsdelivr.net/npm/@micropython/micropython-webassembly-pyscript@${version}/micropython.mjs`,
    async engine({ loadMicroPython }, config, url, baseURL) {
        const { stderr, stdout, get } = stdio({
            stderr: buffered(console.error),
            stdout: buffered(console.log),
        });
        url = url.replace(/\.m?js$/, '.wasm');
        progress$1('Loading MicroPython');
        const interpreter = await get(loadMicroPython({ linebuffer: false, stderr, stdout, url }));
        const py_imports = importPackages$1.bind(this, interpreter, baseURL);
        loader.set(interpreter, py_imports);
        await loadProgress(this, progress$1, interpreter, config, baseURL);
        // Install Micropython Package
        this.writeFile(interpreter, './mip.py', mip);
        if (config.packages) {
            progress$1('Loading packages');
            await py_imports(config.packages.map(fixedRelative, baseURL));
            progress$1('Loaded packages');
        }
        progress$1('Loaded MicroPython');
        if (!interpreter.mountNativeFS)
            interpreter.mountNativeFS = initializeNativeFS(interpreter._module);
        return interpreter;
    },
    registerJSModule,
    run: run$2,
    runAsync,
    runEvent,
    transform: (interpreter, value) => interpreter.PyProxy.toJs(value),
    writeFile: (interpreter, path, buffer, url) => {
        const { FS, _module: { PATH, PATH_FS } } = interpreter;
        const fs = { FS, PATH, PATH_FS };
        const format = getFormat(path, url);
        if (format) {
            const extractDir = path.slice(0, -1);
            if (extractDir !== './') FS.mkdir(extractDir);
            switch (format) {
                case 'whl':
                case 'zip': {
                    const blob = new Blob([buffer], { type: 'application/zip' });
                    return zip().then(async ({ BlobReader, Uint8ArrayWriter, ZipReader }) => {
                        const zipFileReader = new BlobReader(blob);
                        const zipReader = new ZipReader(zipFileReader);
                        for (const entry of await zipReader.getEntries()) {
                            const { directory, filename } = entry;
                            const name = extractDir + filename;
                            if (directory) mkdir(FS, name);
                            else {
                                mkdir(FS, PATH.dirname(name));
                                const buffer = await entry.getData(new Uint8ArrayWriter);
                                FS.writeFile(name, buffer, {
                                    canOwn: true,
                                });
                            }
                        }
                        zipReader.close();
                    });
                }
                case 'tgz':
                case 'tar.gz': {
                    const TMP = './_.tar.gz';
                    writeFile(fs, TMP, buffer);
                    interpreter.runPython(`
                        import os, gzip, tarfile
                        tar = tarfile.TarFile(fileobj=gzip.GzipFile(fileobj=open("${TMP}", "rb")))
                        for f in tar:
                            name = f"${extractDir}{f.name}"
                            if f.type == tarfile.DIRTYPE:
                                if f.name != "./":
                                    os.mkdir(name.strip("/"))
                            else:
                                dir = os.path.dirname(name)
                                if not os.path.exists(dir):
                                    os.mkdir(dir)
                                source = tar.extractfile(f)
                                with open(name, "wb") as dest:
                                    dest.write(source.read())
                                    dest.close()
                        tar.close()
                        os.remove("${TMP}")
                    `);
                    return;
                }
            }
        }
        return writeFile(fs, path, buffer);
    },
};

async function importPackages$1(interpreter, baseURL, packages) {
    let mip;
    for (const mpyPackage of packages) {
        if (mpyPackage.endsWith('.whl')) {
            const url = absoluteURL(mpyPackage, baseURL);
            const buffer = await fetch$1(url).arrayBuffer();
            await this.writeFile(interpreter, './*', buffer, url);
        }
        else {
            if (!mip) mip = interpreter.pyimport('mip');
            mip.install(mpyPackage);
        }
    }
}
/* c8 ignore stop */

const type$3 = 'pyodide';
const toJsOptions = { dict_converter: Object.fromEntries };

const { stringify } = JSON;

const { apply: apply$1 } = Reflect;
const FunctionPrototype = Function.prototype;

// REQUIRES INTEGRATION TEST
/* c8 ignore start */
const overrideMethod = method => function (...args) {
    return apply$1(method, this, args);
};

let pyproxy, to_js;
const override = intercept => {

    const proxies = new WeakMap;

    const patch = args => {
        for (let arg, i = 0; i < args.length; i++) {
            switch (typeof(arg = args[i])) {
                case 'object':
                    if (arg === null) break;
                    // falls through
                case 'function': {
                    if (pyproxy in arg && !arg[pyproxy].shared?.gcRegistered) {
                        intercept = false;
                        let proxy = proxies.get(arg)?.deref();
                        if (!proxy) {
                            proxy = to_js(arg);
                            const wr = new WeakRef(proxy);
                            proxies.set(arg, wr);
                            proxies.set(proxy, wr);
                        }
                        args[i] = proxy;
                        intercept = true;
                    }
                    break;
                }
            }
        }
    };

    // the patch
    Object.defineProperties(FunctionPrototype, {
        apply: {
            value(context, args) {
                if (intercept) patch(args);
                return apply$1(this, context, args);
            }
        },
        call: {
            value(context, ...args) {
                if (intercept) patch(args);
                return apply$1(this, context, args);
            }
        }
    });
};

const progress = createProgress('py');
const indexURLs = new WeakMap();

var pyodide = {
    type: type$3,
    module: (version = '0.27.7') =>
        `https://cdn.jsdelivr.net/pyodide/v${version}/full/pyodide.mjs`,
    async engine({ loadPyodide }, config, url, baseURL) {
        progress('Loading Pyodide');
        let { packages, index_urls } = config;
        if (packages) packages = packages.map(fixedRelative, baseURL);
        progress('Loading Storage');
        const indexURL = url.slice(0, url.lastIndexOf('/'));
        // each pyodide version shares its own cache
        const storage = new IDBMapSync(indexURL);
        const options = { indexURL };
        const save = config.packages_cache !== 'never';
        await storage.sync();
        // packages_cache = 'never' means: erase the whole DB
        if (!save) storage.clear();
        // otherwise check if cache is known
        else if (packages) {
            packages = packages.sort();
            // packages are uniquely stored as JSON key
            const key = stringify(packages);
            if (storage.has(key)) {
                const blob = new Blob(
                    [storage.get(key)],
                    { type: 'application/json' },
                );
                // this should be used to bootstrap loadPyodide
                options.lockFileURL = URL.createObjectURL(blob);
                // versions are not currently understood by pyodide when
                // a lockFileURL is used instead of micropip.install(packages)
                // https://github.com/pyodide/pyodide/issues/5135#issuecomment-2441038644
                // https://github.com/pyscript/pyscript/issues/2245
                options.packages = packages.map(name => name.split(/[>=<]=/)[0]);
                packages = null;
            }
        }
        progress('Loaded Storage');
        const { stderr, stdout, get } = stdio();
        const interpreter = await get(
            loadPyodide({ stderr, stdout, ...options }),
        );
        if (config.debug) interpreter.setDebug(true);
        const py_imports = importPackages.bind(interpreter);
        if (index_urls) indexURLs.set(interpreter, index_urls);
        loader.set(interpreter, py_imports);
        await loadProgress(this, progress, interpreter, config, baseURL);
        // if cache wasn't know, import and freeze it for the next time
        if (packages) await py_imports(packages, storage, save);
        await storage.close();
        if (options.lockFileURL) URL.revokeObjectURL(options.lockFileURL);
        progress('Loaded Pyodide');
        if (config.experimental_create_proxy === 'auto') {
            interpreter.runPython([
                'import js',
                'from pyodide.ffi import to_js',
                'o=js.Object.fromEntries',
                'js.experimental_create_proxy=lambda r:to_js(r,dict_converter=o)'
            ].join(';'), { globals: interpreter.toPy({}) });
            to_js = globalThis.experimental_create_proxy;
            delete globalThis.experimental_create_proxy;
            [pyproxy] = Reflect.ownKeys(to_js).filter(
                k => (
                    typeof k === 'symbol' &&
                    String(k) === 'Symbol(pyproxy.attrs)'
                )
            );
            override(true);
        }
        return interpreter;
    },
    registerJSModule,
    run: overrideMethod(run$2),
    runAsync: overrideMethod(runAsync),
    runEvent: overrideMethod(runEvent),
    transform: (interpreter, value) => apply$1(transform, interpreter, [value]),
    writeFile: (interpreter, path, buffer, url) => {
        const format = getFormat(path, url);
        if (format) {
            return interpreter.unpackArchive(buffer, format, {
                extractDir: path.slice(0, -1)
            });
        }
        const { FS, PATH, _module: { PATH_FS } } = interpreter;
        return writeFile({ FS, PATH, PATH_FS }, path, buffer);
    },
};

function transform(value) {
    const { ffi: { PyProxy } } = this;
    if (value && typeof value === 'object') {
        if (value instanceof PyProxy) return value.toJs(toJsOptions);
        // I believe this case is for LiteralMap which is not a PyProxy
        // and yet it needs to be re-converted to something useful.
        if (value instanceof Map) return new Map([...value.entries()]);
        if (isArray$3(value)) return value.map(transform, this);
    }
    return value;
}

// exposed utility to import packages via polyscript.lazy_py_modules
async function importPackages(packages, storage, save = false) {
    // temporary patch/fix console.log which is used
    // not only by Pyodide but by micropip too and there's
    // no way to intercept those calls otherwise
    const { log } = console;
    const _log = (detail, ...rest) => {
        log(detail, ...rest);
        console.log = log;
        progress(detail);
        console.log = _log;
    };
    console.log = _log;
    await this.loadPackage('micropip');
    const micropip = this.pyimport('micropip');
    if (indexURLs.has(this)) micropip.set_index_urls(indexURLs.get(this));
    await micropip.install(packages, { keep_going: true });
    console.log = log;
    if (save && (storage instanceof IDBMapSync)) {
        const frozen = micropip.freeze();
        storage.set(stringify(packages), frozen);
    }
    micropip.destroy();
}
/* c8 ignore stop */

const type$2 = 'ruby-wasm-wasi';
const jsType = type$2.replace(/\W+/g, '_');

// MISSING:
//  * there is no VFS apparently or I couldn't reach any
//  * I've no idea how to override the stderr and stdout
//  * I've no idea how to import packages

// REQUIRES INTEGRATION TEST
/* c8 ignore start */
var ruby_wasm_wasi = {
    type: type$2,
    experimental: true,
    module: (version = '2.7.1') =>
        `https://cdn.jsdelivr.net/npm/@ruby/3.2-wasm-wasi@${version}/dist/browser/+esm`,
    async engine({ DefaultRubyVM }, config, url, baseURL) {
        url = url.replace(/\/browser\/\+esm$/, '/ruby.wasm');
        const buffer = await fetch$1(url).arrayBuffer();
        const module = await WebAssembly.compile(buffer);
        const { vm: interpreter } = await DefaultRubyVM(module);
        if (config.files) await fetchFiles(this, interpreter, config.files, baseURL);
        if (config.fetch) await fetchPaths(this, interpreter, config.fetch, baseURL);
        if (config.js_modules) await fetchJSModules(config.js_modules, baseURL);
        return interpreter;
    },
    // Fallback to globally defined module fields (i.e. $xworker)
    registerJSModule(interpreter, name, value) {
        name = name.replace(/\W+/g, '__');
        const id = `__module_${jsType}_${name}`;
        globalThis[id] = value;
        this.run(interpreter, `require "js";$${name}=JS.global[:${id}]`);
        delete globalThis[id];
    },
    run: (interpreter, code, ...args) => interpreter.eval(dedent(code), ...args),
    runAsync: (interpreter, code, ...args) => interpreter.evalAsync(dedent(code), ...args),
    async runEvent(interpreter, code, event) {
        // patch common xworker.onmessage/onerror cases
        if (/^xworker\.(on\w+)$/.test(code)) {
            const { $1: name } = RegExp;
            const id = `__module_${jsType}_event`;
            globalThis[id] = event;
            this.run(
                interpreter,
                `require "js";$xworker.call("${name}",JS.global[:${id}])`,
            );
            delete globalThis[id];
        } else {
            // Experimental: allows only events by fully qualified method name
            const method = this.run(interpreter, `method(:${code})`);
            await method.call(code, interpreter.wrap(event));
        }
    },
    transform: (_, value) => value,
    writeFile: () => {
        throw new Error(`writeFile is not supported in ${type$2}`);
    },
};
/* c8 ignore stop */

const type$1 = 'wasmoon';

// MISSING:
//  * I've no idea how to import packages

// REQUIRES INTEGRATION TEST
/* c8 ignore start */
var wasmoon = {
    type: type$1,
    module: (version = '1.16.0') =>
        `https://cdn.jsdelivr.net/npm/wasmoon@${version}/+esm`,
    async engine({ LuaFactory, LuaLibraries }, config, _, baseURL) {
        const { stderr, stdout, get } = stdio();
        const interpreter = await get(new LuaFactory().createEngine());
        interpreter.global.getTable(LuaLibraries.Base, (index) => {
            interpreter.global.setField(index, 'print', stdout);
            interpreter.global.setField(index, 'printErr', stderr);
        });
        if (config.files) await fetchFiles(this, interpreter, config.files, baseURL);
        if (config.fetch) await fetchPaths(this, interpreter, config.fetch, baseURL);
        if (config.js_modules) await fetchJSModules(config.js_modules, baseURL);
        return interpreter;
    },
    // Fallback to globally defined module fields
    registerJSModule: (interpreter, name, value) => {
        interpreter.global.set(name, value);
    },
    run: (interpreter, code, ...args) => {
        try {
            return interpreter.doStringSync(dedent(code), ...args);
        }
        catch (error) {
            io.get(interpreter).stderr(error);
        }
    },
    runAsync: async (interpreter, code, ...args) => {
        try {
            return await interpreter.doString(dedent(code), ...args);
        }
        catch (error) {
            io.get(interpreter).stderr(error);
        }
    },
    runEvent: async (interpreter, code, event) => {
        // allows method(event) as well as namespace.method(event)
        // it does not allow fancy brackets names for now
        const [name, ...keys] = code.split('.');
        let target = interpreter.global.get(name);
        let context;
        for (const key of keys) [context, target] = [target, target[key]];
        try {
            await target.call(context, event);
        }
        catch (error) {
            io.get(interpreter).stderr(error);
        }
    },
    transform: (_, value) => value,
    writeFile: (
        {
            cmodule: {
                module: { FS },
            },
        },
        path,
        buffer,
    ) => writeFileShim(FS, path, buffer),
};
/* c8 ignore stop */

const type = 'webr';
const r = new WeakMap();
const fr = new FinalizationRegistry(fn => fn());

// REQUIRES INTEGRATION TEST
/* c8 ignore start */
const run = async (interpreter, code) => {
  const { shelter, destroy, io } = r.get(interpreter);
  const { output, result } = await shelter.captureR(dedent(code));
  for (const { type, data } of output) io[type](data);
  fr.register(result, destroy);
  return result;
};

var webr = {
    type,
    experimental: true,
    module: (version = '0.5.1') =>
        `https://cdn.jsdelivr.net/npm/webr@${version}/dist/webr.mjs`,
    async engine(module, config, _, baseURL) {
        const { get } = stdio();
        const interpreter = new module.WebR();
        await get(interpreter.init().then(() => interpreter));
        const shelter = await new interpreter.Shelter();
        r.set(interpreter, {
          module,
          shelter,
          destroy: shelter.destroy.bind(shelter),
          io: io.get(interpreter),
        });
        if (config.files) await fetchFiles(this, interpreter, config.files, baseURL);
        if (config.fetch) await fetchPaths(this, interpreter, config.fetch, baseURL);
        if (config.js_modules) await fetchJSModules(config.js_modules, baseURL);
        return interpreter;
    },
    // Fallback to globally defined module fields (i.e. $xworker)
    registerJSModule(_, name) {
        console.warn(`Experimental interpreter: module ${name} is not supported (yet)`);
        // TODO: as complex JS objects / modules are not allowed
        // it's not clear how we can bind anything or import a module
        // in a context that doesn't understand methods from JS
        // https://docs.r-wasm.org/webr/latest/convert-js-to-r.html#constructing-r-objects-from-javascript-objects
    },
    run,
    runAsync: run,
    async runEvent(interpreter, code, event) {
        // TODO: WebR cannot convert exoteric objects or any literal
        // to an easy to reason about data/frame ... that conversion
        // is reserved for the future:
        // https://docs.r-wasm.org/webr/latest/convert-js-to-r.html#constructing-r-objects-from-javascript-objects
        await interpreter.evalRVoid(`${code}(event)`, {
          env: { event: { type: [ event.type ] } }
        });
    },
    transform: (_, value) => {
        console.log('transforming', value);
        return value;
    },
    writeFile: () => {
        // MAYBE ???
    },
};
/* c8 ignore stop */

// ⚠️ Part of this file is automatically generated
//    The :RUNTIMES comment is a delimiter and no code should be written/changed after
//    See rollup/build_interpreters.cjs to know more

/** @type {Map<string, object>} */
const registry$1 = new Map();

/** @type {Map<string, object>} */
const configs$1 = new Map();

/** @type {string[]} */
const selectors = [];

/** @type {string[]} */
const prefixes = [];

/* c8 ignore start */
const interpreter = new Proxy(new Map(), {
    get(map, id) {
        if (!map.has(id)) {
            const [type, ...rest] = id.split('@');
            const interpreter = registry$1.get(type);
            const url = /^(?:\.?\.?\/|[a-z0-9-]+:\/\/)/i.test(rest)
                ? rest.join('@')
                : interpreter.module(...rest);
            map.set(id, {
                url,
                module: import(/* webpackIgnore: true */url),
                engine: interpreter.engine.bind(interpreter),
            });
        }
        const { url, module, engine } = map.get(id);
        return (config, baseURL) =>
            module.then((module) => {
                configs$1.set(id, config);
                return engine(module, config, url, baseURL);
            });
    },
});
/* c8 ignore stop */

const register$1 = (interpreter) => {
    for (const type of [].concat(interpreter.type)) {
        registry$1.set(type, interpreter);
        selectors.push(`script[type="${type}"]`);
        prefixes.push(`${type}-`);
    }
};
for (const interpreter of [dummy, micropython, pyodide, ruby_wasm_wasi, wasmoon, webr])
    register$1(interpreter);

/**
 * Allow leaking a module globally to help avoid conflicting exports
 * if the module might have been re-bundled in other projects.
 * @template T
 * @param {string} name the module name to save or retrieve
 * @param {T} value the module as value to save if not known
 * @param {globalThis} [global=globalThis] the reference where modules are saved where `globalThis` is the default
 * @returns {[T, boolean]} the passed `value` or the previous one as first entry, a boolean indicating if it was known or not
 */
const stickyModule = (name, value, global = globalThis) => {
  const symbol = Symbol.for(name);
  const known = symbol in global;
  return [
    known ?
      global[symbol] :
      Object.defineProperty(global, symbol, { value })[symbol],
    known
  ];
};

/**
 * Given a CSS selector, returns the first matching node, if any.
 * @param {string} css the CSS selector to query
 * @param {Document | DocumentFragment | Element} [root] the optional parent node to query
 * @returns {Element?} the found element, if any
 */
const $ = (css, root = document) => root.querySelector(css);

/**
 * Given a CSS selector, returns a list of all matching nodes.
 * @param {string} css the CSS selector to query
 * @param {Document | DocumentFragment | Element} [root] the optional parent node to query
 * @returns {Element[]} a list of found nodes
 */
const $$$1 = (css, root = document) => [...root.querySelectorAll(css)];

/**
 * Given a XPath selector, returns a list of all matching nodes.
 * @param {string} path the XPath selector to evaluate
 * @param {Document | DocumentFragment | Element} [root] the optional parent node to query
 * @returns {Node[]} a list of found nodes (elements, attributes, text, comments)
 */
const $x = (path, root = document) => {
  const expression = (new XPathEvaluator).createExpression(path);
  const xpath = expression.evaluate(root, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE);
  const result = [];
  for (let i = 0, {snapshotLength} = xpath; i < snapshotLength; i++)
    result.push(xpath.snapshotItem(i));
  return result;
};

//@ts-check

/**
 * @template T
 * @typedef {{promise: Promise<T>, resolve: (value: T) => void, reject: (reason?: any) => void}} Resolvers
 */

//@ts-ignore
const withResolvers$2 = Promise.withResolvers;

/**
 * @template T
 * @type {() => Resolvers<T>}
 */
var withResolvers$3 = withResolvers$2.bind(Promise);

// REQUIRES INTEGRATION TEST
/* c8 ignore start */
const workers = new Proxy(new Map, {
  get(map, name) {
    if (!map.has(name))
      map.set(name, withResolvers$3());
    return map.get(name);
  },
});

// filter out forever pending Promises in Pyodide
// @issue https://github.com/pyscript/pyscript/issues/2106
const ignore$1 = new Set(['__dict__', 'constructor', 'get', 'has', 'includes', 'next', 'set', 'then']);

const workersHandler = new Proxy(Object.freeze({}), {
  // guard against forever pending Promises in Pyodide
  // @issue https://github.com/pyscript/pyscript/issues/2106
  get: (_, name) => (typeof name === 'string' && !ignore$1.has(name)) ?
    workers[name].promise.then(w => w.sync) :
    void 0,
});
/* c8 ignore stop */

let i$1 = 0;

// extras
const UNREF = i$1++;
const ASSIGN = i$1++;
const EVALUATE = i$1++;
const GATHER = i$1++;
const QUERY = i$1++;

// traps
const APPLY = i$1++;
const CONSTRUCT = i$1++;
const DEFINE_PROPERTY = i$1++;
const DELETE_PROPERTY = i$1++;
const GET = i$1++;
const GET_OWN_PROPERTY_DESCRIPTOR = i$1++;
const GET_PROTOTYPE_OF = i$1++;
const HAS = i$1++;
const IS_EXTENSIBLE = i$1++;
const OWN_KEYS = i$1++;
const PREVENT_EXTENSIONS = i$1++;
const SET$1 = i$1++;
const SET_PROTOTYPE_OF = i$1++;

const DIRECT           = 0;
const REMOTE           = 1 << 0;
const OBJECT$1           = 1 << 1;
const ARRAY$1            = 1 << 2;
const FUNCTION         = 1 << 3;
const SYMBOL$1           = 1 << 4;
const BIGINT$1           = 1 << 5;
const BUFFER$1           = 1 << 6;

const VIEW$1             = BUFFER$1 | ARRAY$1;
const REMOTE_OBJECT    = REMOTE | OBJECT$1;
const REMOTE_ARRAY     = REMOTE | ARRAY$1;
const REMOTE_FUNCTION  = REMOTE | FUNCTION;

/** @type {Map<symbol, string>} */
const symbols = new Map(
  Reflect.ownKeys(Symbol).map(
    key => [Symbol[key], `@${String(key)}`]
  )
);

/**
 * @param {symbol} value
 * @param {string} description
 * @returns {string}
 */
const asSymbol = (value, description) => (
  description === void 0 ? '?' :
  (Symbol.keyFor(value) === void 0 ? `!${description}` : `#${description}`)
);

/**
 * Extract the value from a pair of type and value.
 * @param {string} name
 * @returns {symbol}
 */
const fromSymbol = name => {
  switch (name[0]) {
    case '@': return Symbol[name.slice(1)];
    case '#': return Symbol.for(name.slice(1));
    case '!': return Symbol(name.slice(1));
    default: return Symbol();
  }
};

/**
 * Create the name of a symbol.
 * @param {symbol} value
 * @returns {string}
 */
const toSymbol = value => symbols.get(value) || asSymbol(value, value.description);

const assign$2 = Object.assign;

const fromArray = Array.from;

const isArray$1 = Array.isArray;

const isView$1 = ArrayBuffer.isView;

/**
 * A type/value pair.
 * @typedef {[number, any]} TypeValue
 */

/**
 * Create a type/value pair.
 * @param {number} type
 * @param {any} value
 * @returns {TypeValue}
 */
const tv = (type, value) => [type, value];

const identity = value => value;

const object = {};

/**
 * Create a function that loops through an array and applies a function to each value.
 * @param {(value:any, cache?:Map<any, any>) => any} asValue
 * @returns
 */
const loopValues = asValue => (
  /**
   * Loop through an array and apply a function to each value.
   * @param {any[]} arr
   * @param {Map} [cache]
   * @returns
   */
  (arr, cache = new Map) => {
    for (let i = 0, length = arr.length; i < length; i++)
      arr[i] = asValue(arr[i], cache);
    return arr;
  }
);

/**
 * Extract the value from a pair of type and value.
 * @param {TypeValue} pair
 * @returns {string|symbol}
 */
const fromKey = ([type, value]) => type === DIRECT ? value : fromSymbol(value);

/**
 * Associate a key with an optionally transformed value.
 * @param {string|symbol} value
 * @returns {TypeValue}
 */
const toKey = value => typeof value === 'string' ?
  tv(DIRECT, value) : tv(SYMBOL$1, toSymbol(value))
;

const MAX_ARGS = 0x7FFF;

/**
 * @param {number[]} output
 * @param {Uint8Array} value 
 */
const push = (output, value) => {
  for (let $ = output.push, i = 0, length = value.length; i < length; i += MAX_ARGS)
    $.apply(output, value.subarray(i, i + MAX_ARGS));
};

const { getPrototypeOf: getPrototypeOf$1 } = Object;
const { construct: construct$1 } = Reflect;
const { toStringTag } = Symbol;
const { toString } = object;

const toTag = (ref, name = ref[toStringTag]) =>
  name in globalThis ? name : toTag(construct$1(getPrototypeOf$1(ref.constructor),[0]));

/**
 * @param {ArrayBufferLike} value
 * @param {boolean} direct
 * @returns {BufferDetails}
 */
const toBuffer = (value, direct) => [
  direct ? value : fromArray(new Uint8Array(value)),
  //@ts-ignore
  value.resizable ? value.maxByteLength : 0
];

/**
 * @param {ArrayBufferView} value
 * @param {boolean} direct
 * @returns {ViewDetails}
 */
const toView = (value, direct) => {
  //@ts-ignore
  const { BYTES_PER_ELEMENT, byteOffset, buffer, length } = value;
  return [
    toTag(value),
    toBuffer(buffer, direct),
    byteOffset,
    length !== ((buffer.byteLength - byteOffset) / BYTES_PER_ELEMENT) ? length : 0,
  ];
};

const brackets = /\[('|")?(.+?)\1\]/g;

const keys = (target, key) => target?.[key];

/**
 * Parses the given path and returns the value at the given target.
 * @param {any} target
 * @param {string} path
 * @returns {any}
 */
var query = (target, path) => path.replace(brackets, '.$2').split('.').reduce(keys, target);

/**
 * @template T
 * @typedef {Object} Heap
 * @property {() => void} clear
 * @property {(ref:T) => number} id
 * @property {(id:number) => T} ref
 * @property {(id:number) => boolean} unref
 */

/**
 * Create a heap-like utility to hold references in memory.
 * @param {number} [id=0] The initial `id` which is `0` by default.
 * @param {Map<number, any>} [ids=new Map] The used map of ids to references.
 * @param {Map<any, number>} [refs=new Map] The used map of references to ids.
 * @returns {Heap<any>}
 */
var heap = (id = 0, ids = new Map, refs = new Map) => ({
  clear: () => {
    ids.clear();
    refs.clear();
  },
  id: ref => {
    let uid = refs.get(ref);
    if (uid === void 0) {
      /* c8 ignore next */
      while (ids.has(uid = id++));
      ids.set(uid, ref);
      refs.set(ref, uid);
    }
    return uid;
  },
  ref: id => ids.get(id),
  unref: id => {
    refs.delete(ids.get(id));
    return ids.delete(id);
  },
});

// import DEBUG from './utils/debug.js';


const {
  apply,
  construct,
  defineProperty: defineProperty$1,
  deleteProperty,
  get: get$1,
  getOwnPropertyDescriptor,
  getPrototypeOf,
  has,
  isExtensible,
  ownKeys: ownKeys$1,
  preventExtensions,
  set: set$3,
  setPrototypeOf,
} = Reflect;

/**
 * @typedef {Object} LocalOptions Optional utilities used to orchestrate local <-> remote communication.
 * @property {Function} [reflect=identity] The function used to reflect operations via the remote receiver. Currently only `apply` and `unref` are supported.
 * @property {Function} [transform=identity] The function used to transform local values into simpler references that the remote side can understand.
 * @property {Function} [remote=identity] The function used to intercept remote invokes *before* these happen. Usable to sync `events` or do other tasks.
 * @property {Function} [module] The function used to import modules when remote asks to `import(...)` something.
 * @property {boolean} [buffer=false] Optionally allows direct buffer serialization breaking JSON compatibility.
 */

/**
 * @param {LocalOptions} options
 * @returns
 */
var local = ({
  reflect = identity,
  transform = identity,
  remote = identity,
  module = name => import(name),
  buffer = false,
} = object) => {
  // received values arrive via postMessage so are compatible
  // with the structured clone algorithm
  const fromValue = (value, cache = new Map) => {
    if (!isArray$1(value)) return value;
    const [t, v] = value;
    switch (t) {
      case OBJECT$1: {
        if (v === null) return globalThis;
        let cached = cache.get(value);
        if (!cached) {
          cached = v;
          cache.set(value, v);
          for (const k in v) v[k] = fromValue(v[k], cache);
        }
        return cached;
      }
      case ARRAY$1: {
        return cache.get(value) || (
          cache.set(value, v),
          fromValues(v, cache)
        );
      }
      case FUNCTION: {
        let wr = weakRefs.get(v), fn = wr?.deref();
        if (!fn) {
          /* c8 ignore start */
          if (wr) fr.unregister(wr);
          /* c8 ignore stop */
          fn = function (...args) {
            remote.apply(this, args);

            // values reflected asynchronously are not passed stringified
            // because it makes no sense to use Atomics and SharedArrayBuffer
            // to transfer these ... yet these must reflect the current state
            // on this local side of affairs.
            for (let i = 0, length = args.length; i < length; i++)
              args[i] = toValue(args[i]);

            const result = reflect(APPLY, v, toValue(this), args);
            /* c8 ignore start */
            return result instanceof Promise ? result.then(fromValue) : fromValue(result);
            /* c8 ignore stop */
          };
          wr = new WeakRef(fn);
          weakRefs.set(v, wr);
          fr.register(fn, v, wr);
        }
        return fn;
      }
      case SYMBOL$1: return fromSymbol(v);
      default: return (t & REMOTE) ? ref(v) : v;
    }
  };

  // OBJECT, DIRECT, VIEW, BUFFER, REMOTE_ARRAY, REMOTE_OBJECT, REMOTE_FUNCTION, SYMBOL, BIGINT
  /**
   * Converts values into TypeValue pairs when these
   * are not JSON compatible (symbol, bigint) or
   * local (functions, arrays, objects, globalThis).
   * @param {any} value the current value
   * @returns {any} the value as is or its TypeValue counterpart
   */
  const toValue = value => {
    switch (typeof value) {
      case 'object': {
        if (value === null) break;
        if (value === globalThis) return globalTarget;
        const $ = transform(value);
        return (hasDirect && direct.has($)) ?
          tv(DIRECT, $) : (
          isView$1($) ?
            tv(VIEW$1, toView($, buffer)) : (
              $ instanceof ArrayBuffer ?
                tv(BUFFER$1, toBuffer($, buffer)) :
                tv(isArray$1($) ? REMOTE_ARRAY : REMOTE_OBJECT, id($))
            )
        );
      }
      case 'function': return tv(REMOTE_FUNCTION, id(transform(value)));
      case 'symbol': return tv(SYMBOL$1, toSymbol(value));
      case 'bigint': return tv(BIGINT$1, value.toString());
    }
    return value;
  };

  const fromValues = loopValues(fromValue);
  const fromKeys = loopValues(fromKey);
  const toKeys = loopValues(toKey);

  const { clear, id, ref, unref } = heap();

  const weakRefs = new Map;
  const globalTarget = tv(OBJECT$1, null);
  const fr = new FinalizationRegistry(v => {
    weakRefs.delete(v);
    reflect(UNREF, v);
  });

  let hasDirect = false, direct;

  return {
    /**
     * Alows local references to be passed directly to the remote receiver,
     * either as copy or serliazied values (it depends on the implementation).
     * @template {WeakKey} T
     * @param {T} value
     * @returns {T}
     */
    direct(value) {
      if (!hasDirect) {
        // if (DEBUG) console.debug('DIRECT');
        hasDirect = true;
        direct = new WeakSet;
      }
      direct.add(value);
      return value;
    },

    /**
     * This callback reflects locally every remote call.
     * It accepts TypeValue pairs but it always returns a string
     * to make it possible to use Atomics and SharedArrayBuffer.
     * @param {number} method
     * @param {number?} uid
     * @param  {...any} args
     * @returns
     */
    reflect(method, uid, ...args) {
      // if (DEBUG) console.debug(method === UNREF ? 'GC' : 'ROUNDTRIP');
      const isGlobal = uid === null;
      const target = isGlobal ? globalThis : ref(uid);
      // the order is by most common use cases
      switch (method) {
        case GET: {
          const key = fromKey(args[0]);
          return toValue(isGlobal && key === 'import' ? module : get$1(target, key));
        }
        case APPLY: {
          const map = new Map;
          return toValue(apply(target, fromValue(args[0], map), fromValues(args[1], map)));
        }
        case SET$1: return set$3(target, fromKey(args[0]), fromValue(args[1]));
        case HAS: return has(target, fromKey(args[0]));
        case OWN_KEYS: return toKeys(ownKeys$1(target), weakRefs);
        case CONSTRUCT: return toValue(construct(target, fromValues(args[0])));
        case GET_OWN_PROPERTY_DESCRIPTOR: {
          const descriptor = getOwnPropertyDescriptor(target, fromKey(args[0]));
          if (descriptor) {
            for (const k in descriptor)
              descriptor[k] = toValue(descriptor[k]);
          }
          return descriptor;
        }
        case DEFINE_PROPERTY: return defineProperty$1(target, fromKey(args[0]), fromValue(args[1]));
        case DELETE_PROPERTY: return deleteProperty(target, fromKey(args[0]));
        case GET_PROTOTYPE_OF: return toValue(getPrototypeOf(target));
        case SET_PROTOTYPE_OF: return setPrototypeOf(target, fromValue(args[0]));
        case ASSIGN: {
          assign$2(target, fromValue(args[0]));
          return;
        }
        case EVALUATE: {
          const body = fromValue(args[0]);
          const fn = Function(`return(${body}).apply(null,arguments)`);
          return toValue(apply(fn, null, fromValues(args[1])));
        }
        case GATHER: {
          args = fromKeys(args[0], weakRefs);
          for (let k, i = 0, length = args.length; i < length; i++) {
            k = args[i];
            args[i] = toValue(typeof k === 'string' ? query(target, k) : target[k]);
          }
          return args;
        }
        case QUERY: return toValue(query(target, args[0]));
        case UNREF: return unref(uid);
        case IS_EXTENSIBLE: return isExtensible(target);
        case PREVENT_EXTENSIONS: return preventExtensions(target);
      }
    },

    /**
     * Terminates the local side of the communication,
     * erasing and unregistering all the cached references.
     */
    terminate() {
      for (const wr of weakRefs.values()) fr.unregister(wr);
      weakRefs.clear();
      clear();
    },
  };
};

// This is an optional utility that needs to patch `addEventListener`.
// Its `default` return value can be used as `remote` field when
// the `local({ remote: ... })` is invoked.

const { addEventListener } = EventTarget.prototype;
const eventsHandler = new WeakMap;
Reflect.defineProperty(EventTarget.prototype, 'addEventListener', {
  /**
   * Intercepts `options` with an `invoke` field that could contain
   * `preventDefault`, `stopPropagation` or `stopImmediatePropagation`
   * strings so that when the event will be triggered locally,
   * the remote side can still enforce one of those operations, even if
   * invoked asynchronously (those calls will happen on the local thread).
   * 
   * @param {string} type
   * @param {EventListenerOrEventListenerObject?} callback
   * @param  {AddEventListenerOptions & { invoke?: string|string[]} | boolean} options
   * @returns {void}
   */
  value(type, callback, options) {
    //@ts-ignore
    const invoke = options?.invoke;
    if (invoke) {
      let map = eventsHandler.get(this);
      if (!map) eventsHandler.set(this, (map = new Map));
      map.set(type, [].concat(invoke));
      //@ts-ignore
      delete options.invoke;
      console.log(map);
    }
    return addEventListener.apply(this, arguments);
  },
});

/**
 * This utility is used to perform `preventDefault` or `stopPropagation`
 * on events that are triggered via functions defined on the remote side.
 * It is meant to be passed as `remote`, or as part of `remote` field when
 * the `local({ remote: ... })` is invoked, meaning it happens right before
 * the *remote* event handler is requested to be called.
 * @param {Event} event
 */
var patchEvent = event => {
  const { currentTarget, target, type } = event;
  const methods = eventsHandler.get(currentTarget || target)?.get(type);
  if (methods) for (const method of methods) event[method]();
};

let i = 0;

const FALSE = i++;
const TRUE = i++;

const UNDEFINED = i++;
const NULL = i++;

const NUMBER = i++;
const UI8 = i++;
const NAN = i++;
const INFINITY = i++;
const N_INFINITY = i++;
const ZERO = i++;
const N_ZERO = i++;

const BIGINT = i++;
const BIGUINT = i++;

const STRING = i++;

const SYMBOL = i++;

const ARRAY = i++;
const BUFFER = i++;
const DATE = i++;
const ERROR$1 = i++;
const MAP = i++;
const OBJECT = i++;
const REGEXP = i++;
const SET = i++;
const VIEW = i++;

const RECURSION = i++;

// This is an Array facade for the encoder.

class Stack {
  /**
   * @param {Stack} self
   * @param {Uint8Array} value
   */
  static push(self, value) {
    self.sync(false);
    self._(value, value.length);
  }

  /**
   * @param {ArrayBufferLike} buffer
   * @param {number} offset
   */
  constructor(buffer, offset) {
    /** @type {number[]} */
    const output = [];

    /** @private length */
    this.l = 0;

    /** @private output */
    this.o = output;

    /** @private view */
    this.v = new Uint8Array(buffer, offset);

    /** @type {typeof Array.prototype.push} */
    this.push = output.push.bind(output);
  }

  /**
   * @readonly
   * @type {number}
   */
  get length() {
    return this.l + this.o.length;
  }

  /**
   * Sync all entries in the output to the buffer.
   * @param {boolean} last `true` if it's the last sync.
   */
  sync(last) {
    const output = this.o;
    const length = output.length;
    if (length) this._(last ? output : output.splice(0), length);
  }

  /**
   * Set a value to the buffer
   * @private
   * @param {Uint8Array|number[]} value
   * @param {number} byteLength
   */
  _(value, byteLength) {
    const { buffer, byteOffset } = this.v;
    const offset = this.l;
    this.l += byteLength;
    byteLength += byteOffset + offset;
    if (buffer.byteLength < byteLength)
      /** @type {SharedArrayBuffer} */(buffer).grow(byteLength);
    this.v.set(value, offset);
  }
}

new TextDecoder;

const encoder$1 = new TextEncoder;

const buffer = new ArrayBuffer(8);
const dv = new DataView(buffer);
const u8a8 = new Uint8Array(buffer);

//@ts-check


/** @typedef {Map<number, number[]>} Cache */

const { isNaN, isFinite, isInteger } = Number;
const { ownKeys } = Reflect;
const { is } = Object;

/**
 * @param {any} input
 * @param {number[]|Stack} output
 * @param {Cache} cache
 * @returns {boolean}
 */
const process = (input, output, cache) => {
  const value = cache.get(input);
  const unknown = !value;
  if (unknown) {
    dv.setUint32(0, output.length, true);
    cache.set(input, [u8a8[0], u8a8[1], u8a8[2], u8a8[3]]);
  }
  else
    output.push(RECURSION, value[0], value[1], value[2], value[3]);
  return unknown;
};

/**
 * @param {number[]|Stack} output
 * @param {number} type
 * @param {number} length
 */
const set$2 = (output, type, length) => {
  dv.setUint32(0, length, true);
  output.push(type, u8a8[0], u8a8[1], u8a8[2], u8a8[3]);
};

/**
 * @param {any} input
 * @param {number[]|Stack} output
 * @param {Cache} cache
 */
const inflate = (input, output, cache) => {
  switch (typeof input) {
    case 'number': {
      if (input && isFinite(input)) {
        if (isInteger(input) && input < 256 && -1 < input)
          output.push(UI8, input);
        else {
          dv.setFloat64(0, input, true);
          output.push(NUMBER, u8a8[0], u8a8[1], u8a8[2], u8a8[3], u8a8[4], u8a8[5], u8a8[6], u8a8[7]);
        }
      }
      else if (isNaN(input)) output.push(NAN);
      else if (!input) output.push(is(input, 0) ? ZERO : N_ZERO);
      else output.push(input < 0 ? N_INFINITY : INFINITY);
      break;
    }
    case 'object': {
      switch (true) {
        case input === null:
          output.push(NULL);
          break;
        case !process(input, output, cache): break;
        case isArray$1(input): {
          const length = input.length;
          set$2(output, ARRAY, length);
          for (let i = 0; i < length; i++)
            inflate(input[i], output, cache);
          break;
        }
        case isView$1(input): {
          output.push(VIEW);
          inflate(toTag(input), output, cache);
          input = input.buffer;
          if (!process(input, output, cache)) break;
          // fallthrough
        }
        case input instanceof ArrayBuffer: {
          const ui8a = new Uint8Array(input);
          set$2(output, BUFFER, ui8a.length);
          //@ts-ignore
          pushView(output, ui8a);
          break;
        }
        case input instanceof Date:
          output.push(DATE);
          inflate(input.getTime(), output, cache);
          break;
        case input instanceof Map: {
          set$2(output, MAP, input.size);
          for (const [key, value] of input) {
            inflate(key, output, cache);
            inflate(value, output, cache);
          }
          break;
        }
        case input instanceof Set: {
          set$2(output, SET, input.size);
          for (const value of input)
            inflate(value, output, cache);
          break;
        }
        case input instanceof Error:
          output.push(ERROR$1);
          inflate(input.name, output, cache);
          inflate(input.message, output, cache);
          inflate(input.stack, output, cache);
          break;
        case input instanceof RegExp:
          output.push(REGEXP);
          inflate(input.source, output, cache);
          inflate(input.flags, output, cache);
          break;
        default: {
          if ('toJSON' in input) {
            const json = input.toJSON();
            inflate(json === input ? null : json, output, cache);
          }
          else {
            const keys = ownKeys(input);
            const length = keys.length;
            set$2(output, OBJECT, length);
            for (let i = 0; i < length; i++) {
              const key = keys[i];
              inflate(key, output, cache);
              inflate(input[key], output, cache);
            }
          }
          break;
        }
      }
      break;
    }
    case 'string': {
      if (process(input, output, cache)) {
        const encoded = encoder$1.encode(input);
        set$2(output, STRING, encoded.length);
        //@ts-ignore
        pushView(output, encoded);
      }
      break;
    }
    case 'boolean': {
      output.push(input ? TRUE : FALSE);
      break;
    }
    case 'symbol': {
      output.push(SYMBOL);
      inflate(toSymbol(input), output, cache);
      break;
    }
    case 'bigint': {
      let type = BIGINT;
      if (9223372036854775807n < input) {
        dv.setBigUint64(0, input, true);
        type = BIGUINT;
      }
      else dv.setBigInt64(0, input, true);
      output.push(type, u8a8[0], u8a8[1], u8a8[2], u8a8[3], u8a8[4], u8a8[5], u8a8[6], u8a8[7]);
      break;
    }
    // this covers functions too
    default: {
      output.push(UNDEFINED);
      break;
    }
  }
};

/** @type {typeof push|typeof Stack.push} */
let pushView = push;

/**
 * @param {{ byteOffset?: number, Array?: typeof Stack }} [options]
 * @returns {(value: any, buffer: ArrayBufferLike) => number}
 */
const encoder = ({ byteOffset = 0, Array = Stack } = {}) => (value, buffer) => {
  const output = new Array(buffer, byteOffset);
  pushView = Array.push;
  inflate(value, output, new Map);
  const length = output.length;
  output.sync(true);
  return length;
};

// ⚠️ AUTOMATICALLY GENERATED - DO NOT CHANGE
const CHANNEL = 'ab344e2d';
const MAIN = '=' + CHANNEL;
const WORKER = '-' + CHANNEL;

//@ts-check

/**
 * @template T
 * @typedef {{promise: Promise<T>, resolve: (value: T) => void, reject: (reason?: any) => void}} Resolvers
 */

//@ts-ignore
const withResolvers = Promise.withResolvers;

/**
 * @template T
 * @type {() => Resolvers<T>}
 */
var withResolvers$1 = withResolvers.bind(Promise);

//@ts-check


/**
 * @template V
 * @callback Resolve
 * @param {V?} [value]
 * @returns {void}
 */

/**
 * @callback Reject
 * @param {any?} [error]
 * @returns {void}
 */

/**
 * @template V
 * @typedef {object} Resolvers
 * @prop {Promise<V>} promise
 * @prop {Resolve<V>} resolve
 * @prop {Reject} reject
 */

/**
 * @template K,V
 * @typedef {() => [K, Promise<V>]} Next
 */

/**
 * @template K,V
 * @callback Resolver
 * @param {K} uid
 * @param {V?} [value]
 * @param {any?} [error]
 */

/**
 * @template K,V
 * @typedef {[Next<K,V>, Resolver<K,V>]} NextResolver
 */

/**
 * @template K,V
 * @param {(id: number) => K} [as]
 * @returns
 */
var nextResolver = (as = (id => /** @type {K} */(id))) => {
  /** @type {Map<K,Resolvers<V>>} */
  const map = new Map;
  let id = 0;
  return /** @type {NextResolver<K,V>} */([
    /** @type {Next<K,V>} */
    () => {
      let uid;
      do { uid = as(id++); }
      while (map.has(uid));
      const wr = /** @type {Resolvers<V>} */(/** @type {unknown} */(withResolvers$1()));
      map.set(uid, wr);
      return [uid, wr.promise];
    },
    /** @type {Resolver<K,V>} */
    (uid, value, error) => {
      const wr = map.get(uid);
      map.delete(uid);
      if (error) wr?.reject(error);
      else wr?.resolve(value);
    },
  ]);
};

//@ts-check

/** @type {ArrayBuffer[]} */
const nothing = [];

/** @type {WeakSet<ArrayBuffer[]>} */
const buffers = new WeakSet;

/**
 * @param {boolean} check
 * @param {any[]} args
 * @returns
 */
const get = (check, args) => {
  let transfer = nothing;
  if (check && buffers.has(args.at(-1) || nothing)) {
    transfer = args.pop();
    buffers.delete(transfer);
  }
  return transfer;
};

/**
 * @param  {...ArrayBuffer} args
 * @returns
 */
const set$1 = (...args) => {
  buffers.add(args);
  return args;
};

// ⚠️ AUTOMATED ⚠️
var BROADCAST_CHANNEL_UID = 'dc78209b-186c-4f83-80e9-406becb7d9f3';

//@ts-check

let { SharedArrayBuffer: SAB } = globalThis, native = true;

try {
  //@ts-ignore due valid options not recognized
  new SAB(4, { maxByteLength: 8 });
}
catch (_) {
  native = false;
  SAB = /** @type {SharedArrayBufferConstructor} */(
    /** @type {unknown} */(
      class SharedArrayBuffer extends ArrayBuffer {
        get growable() {
          //@ts-ignore due valid property not recognized
          return super.resizable;
        }
        /** @param {number} newLength */
        grow(newLength) {
          //@ts-ignore due valid method not recognized
          super.resize(newLength);
        }
      }
    )
  );
}

const {
  assign: assign$1,
  create,
} = Object;

/* c8 ignore start */
const ID = `coincident-${native ? crypto.randomUUID() : Math.random().toString(36).substring(2)}`;
/* c8 ignore end */

const byteOffset = 2 * Int32Array.BYTES_PER_ELEMENT;

const defaults = {
  // ⚠️ mandatory: first int32 to notify, second one to store the written length
  byteOffset,
};

const result$1 = async (data, proxied, transform) => {
  try {
    const result = await proxied[data[1]].apply(null, data[2]);
    data[1] = transform ? transform(result) : result;
    data[2] = null;
  }
  catch (error) { data[2] = error; }
};

const set = (proxied, name, callback) => {
  const ok = name !== 'then';
  if (ok) proxied[name] = callback;
  return ok;
};

/** @param {Event} event */
const stop$1 = event => {
  event.stopImmediatePropagation();
  event.preventDefault();
};

const { isArray } = Array;
const { isView } = ArrayBuffer;
const { defineProperty, values } = Object;

const [next, resolve] = nextResolver();
let [bootstrap, promise] = next();

/**
 * @callback sabayon
 * @param {string|URL} [serviceWorkerURL] - The URL of the service worker to register on the main thread.
 * @returns {Promise<void>} - A promise that resolves when the polyfill is ready.
 */

let register = /** @type {sabayon} */(() => promise);

let {
  Atomics: Atomics$1,
  MessageChannel: MessageChannel$1,
  SharedArrayBuffer,
  Worker: Worker$1} = globalThis;

if (native) resolve(bootstrap);
else {
  SharedArrayBuffer = SAB;

  const views = new Map;

  const addListener = (target, ...args) => {
    target.addEventListener(...args);
  };

  const extend = (target, literal) => {
    for (const key in literal) {
      literal[key] = {
        value: literal[key],
        configurable: true,
        writable: true,
      };
    }
    return Object.create(target, literal);
  };

  // Web Worker
  if ('importScripts' in globalThis) {
    const intercept = (set, data, view) => {
      if (view && typeof view === 'object' && !set.has(view)) {
        set.add(view);
        if (isView(view)) {
          // avoid DataView or other views to be considered for waiting
          if (view instanceof Int32Array && view.buffer instanceof SharedArrayBuffer) {
            const id = (ids++).toString(16);
            if (views.has(view)) throw new Error('View already exists');
            views.set(view, id);
            return [UID, id, view, data];
          }
        }
        else {
          const array = isArray(view) ? view : values(view);
          for (let i = 0; i < array.length; i++) {
            const details = intercept(set, data, array[i]);
            if (details) return details;
          }
        }
      }
    };

    const interceptor = method => function postMessage(data, ...rest) {
      if (ready) {
        const details = intercept(new Set, data, data);
        method.call(this, (details || data), ...rest);
      }
      else {
        promise.then(() => postMessage(data, ...rest));
      }
    };

    const { prototype } = globalThis.MessagePort;
    prototype.postMessage = interceptor(prototype.postMessage);

    addListener(
      globalThis,
      'message',
      event => {
        let { data } = event;
        // console.log('sabayon', data);
        if (isArray(data) && typeof data.at(1) === 'string')
          event.stopImmediatePropagation();
        resolve(bootstrap, data);
      },
      { once: true }
    );

    // <Atomics Patch>
    const { wait } = Atomics$1;
    const { parse } = JSON;

    const Async = value => ({ value, async: true });

    const Request = (view, sync) => {
      const xhr = new XMLHttpRequest;
      xhr.open('POST', `${SW}?sabayon`, sync);
      console.log('request', UID, views.has(view));
      xhr.send(`["${UID}",${views.get(view)}]`);
      return xhr;
    };

    const Response = (view, xhr) => {
      view.set(parse(xhr.responseText));
      views.delete(view);
      return 'ok';
    };

    Atomics$1 = extend(Atomics$1, {
      wait: (view, ..._) => views.has(view) ?
        Response(view, Request(view, false)) :
        wait(view, ..._)
      ,
      waitAsync: (view, ..._) => {
        if (views.has(view)) {
          const { promise, resolve } = withResolvers$1();
          const xhr = Request(view, true);
          xhr.onloadend = () => resolve(Response(view, xhr));
          return Async(promise);
        }
        return wait(view, ..._);
      },
    });

    let UID, SW, ready = false, ids = 0;

    promise = promise.then(data => {
      [UID, SW] = data;
      ready = true;
    });
  }
  // Main
  else {
    const UID = [ID, Math.random()].join('-').replace(/\W/g, '-');

    let lastView;
    const bc = new BroadcastChannel(BROADCAST_CHANNEL_UID);
    bc.onmessage = async event => {
      const [swid, wid, vid] = event.data;
      // console.log('bc', vid, views.size);
      if (wid === UID) {
        for (const [view, [id, wr]] of views) {
          if (id === vid) {
            await wr.promise;
            views.delete(view);
            let length = view.length;
            while (length-- && !view[length]);
            bc.postMessage(lastView = [swid, view.slice(0, length + 1)]);
            return;
          }
        }
        // console.warn('NO VIEW FOUND', 'Main', lastView);
      }
    };

    const interceptData = event => {
      let { data } = event;
      if (isArray(data) && data.at(0) === UID) {
        const [_, id, view, value] = data;
        if (views.has(view)) throw new Error('View already exists');
        views.set(view, [id, withResolvers$1()]);
        defineProperty(event, 'data', { value });
      }
    };

    MessageChannel$1 = class extends MessageChannel$1 {
      constructor() {
        super();
        addListener(this.port1, 'message', interceptData);
        addListener(this.port2, 'message', interceptData);
      }
    };

    Worker$1 = class extends Worker$1 {
      /**
       * @param {string | URL} scriptURL 
       * @param {WorkerOptions} options 
       */
      constructor(scriptURL, options) {
        super(scriptURL, options);
        if (SW) {
          super.postMessage([UID, SW]);
          // addListener(this, 'message', interceptData);
        }
      }
    };

    const { notify } = Atomics$1;
    Atomics$1 = Object.create(Atomics$1, {
      notify: {
        configurable: true,
        writable: true,
        value: (view, ..._) => {
          const details = views.get(view);
          if (details) {
            details[1].resolve();
            return 0;
          }
          return notify(view, ..._);
        },
      },
    });

    let SW = '';
    let serviceWorker = null;

    /**
     * @param {ServiceWorkerContainer} swc
     * @param {RegistrationOptions} [options]
     */
    const activate = (swc, options) => {
      let w, c = true;
      swc.getRegistration(SW)
        .then(r => (r ?? swc.register(SW, options)))
        .then(function ready(r) {
          const { controller } = swc;
          c = c && !!controller;
          w = (r.installing || r.waiting || r.active);
          document.body.append(w.state, ' c: ', c, document.createElement('br'));
          if (w.state === 'activated' || w.state === 'installed') {
            if (c) {
              document.body.append('controller [', controller.scriptURL === SW, ']', document.createElement('br'));
              // allow ServiceWorker swap on different URL
              if (controller.scriptURL === SW)
                return resolve(bootstrap);
              r.unregister();
            }
            location.reload();
          }
          else {
            addListener(w, 'statechange', () => ready(r), { once: true });
          }
        });
    };

    register = /** @type {sabayon} */((serviceWorkerURL, options) => {
      if (!serviceWorker) {
        // resolve the fully qualified URL for Blob based workers
        SW = new URL(serviceWorkerURL, location.href).href;
        activate(navigator.serviceWorker, options);
        serviceWorker = promise;
      }
      return serviceWorker;
    });
  }
}

// @bug https://bugzilla.mozilla.org/show_bug.cgi?id=1956778
// Note: InstallTrigger is deprecated so once it's gone I do hope
//       this workaround would be gone too!
const UID = 'InstallTrigger' in globalThis ? ID : '';

const Number$1 = value => value;

const info = name => {
  if (name === MAIN) return 'main';
  if (name === WORKER) return 'worker';
  return name;
};

var coincident$1 = options => {
  const transform = options?.transform;
  const encode = (options?.encoder || encoder)(defaults);
  const checkTransferred = options?.transfer !== false;

  /** @type {Worker & { proxy: Record<string, function> }} */
  class Worker extends Worker$1 {
    constructor(url, options) {
      const serviceWorker = !native && options?.serviceWorker;
      const { notify } = serviceWorker ? Atomics$1 : Atomics;
      const { port1: channel, port2 } = new (
        serviceWorker ? MessageChannel$1 : MessageChannel
      );
      const [ next, resolve ] = nextResolver(Number$1);
      const callbacks = new Map;
      const proxied = create(null);
      const OK = native ? UID : ID;

      if (serviceWorker) register(serviceWorker);

      let resolving = '';

      const deadlock = (promise, name) => {
        if (resolving) {
          const t = setTimeout(
            console.warn,
            3e3,
            `💀🔒 - is proxy.${info(resolving)}() awaiting proxy.${info(name)}() ?`
          );
          promise = promise.then(
            result => {
              clearTimeout(t);
              return result;
            },
            error => {
              clearTimeout(t);
              return Promise.reject(error);
            },
          );
        }
        return promise;
      };

      super(url, assign$1({ type: 'module' }, options));

      this.proxy = new Proxy(proxied, {
        get: (_, name) => {
          // the curse of potentially awaiting proxies in the wild
          // requires this ugly guard around `then`
          if (name === 'then') return;
          let cb = callbacks.get(name);
          if (!cb) {
            callbacks.set(name, cb = (...args) => {
              const transfer = get(checkTransferred, args);
              const [uid, promise] = next();
              channel.postMessage(
                [uid, name, transform ? args.map(transform) : args],
                transfer
              );
              return deadlock(promise, name);
            });
          }
          return cb;
        },
        set
      });

      super.postMessage([OK, !!serviceWorker], [port2]);

      // @bug https://bugzilla.mozilla.org/show_bug.cgi?id=1956778
      if (OK) {
        super.addEventListener('message', event => {
          const { data } = event;
          if (data?.ID === OK) {
            stop$1(event);
            channel.onmessage(data);
          }
        });
      }

      channel.onmessage = async ({ data }) => {
        const i32 = data[0];
        const type = typeof i32;
        if (type === 'number')
          resolve.apply(null, data);
        else {
          resolving = data[1];
          await result$1(data, proxied, transform);
          resolving = '';
          if (type === 'string')
            channel.postMessage(data);
          else {
            const result = data[2] || data[1];
            // at index 1 we store the written length or 0, if undefined
            i32[1] = result === void 0 ? 0 : encode(result, i32.buffer);
            // at index 0 we set the SharedArrayBuffer as ready
            i32[0] = 1;
            notify(i32, 0);
          }
        }
      };
    }
  }

  return {
    Worker,
    native,
    transfer: set$1,
  };
};

var coincident = options => {
  const esm = options?.import;
  const exports = coincident$1({
    ...options,
    encoder: options?.encoder || encoder,
  });

  /** @type {Worker & { direct: <T>(value: T) => T, proxy: Record<string, function> }} */
  class Worker extends exports.Worker {
    #terminate;
    constructor(url, options) {
      const { proxy } = super(url, options);
      const { direct, reflect, terminate } = local({
        ...options,
        buffer: true,
        reflect: proxy[WORKER],
        remote(event) { if (event instanceof Event) patchEvent(event); },
        module: options?.import || esm || (name => import(new URL(name, location).href)),
      });

      this.#terminate = terminate;
      this.direct = direct;

      proxy[MAIN] = reflect;
    }
    terminate() {
      this.#terminate();
      super.terminate();
    }
  }

  return { ...exports, Worker };
};

/* c8 ignore start */
const {url} = import.meta;
const re = /import\((['"])([^)]+?\.js)\1\)/g;
const place = (_,q,f) => `import(${q}${new URL(f,url).href}${q})`;
const { Worker } = coincident({ transfer: false });
var xworker$1 = (...args) => new Worker(URL.createObjectURL(new Blob([`/*@*/const { assign: assign\x242 } = Object;

const STORAGE = 'entries';
const READONLY = 'readonly';
const READWRITE = 'readwrite';

/**
 * @typedef {Object} IDBMapOptions
 * @prop {'strict' | 'relaxed' | 'default'} [durability]
 * @prop {string} [prefix]
 */

/** @typedef {[IDBValidKey, unknown]} IDBMapEntry */

/** @type {IDBMapOptions} */
const defaultOptions = { durability: 'default', prefix: 'IDBMap' };

/**
 * @template T
 * @param {{ target: IDBRequest<T> }} event
 * @returns {T}
 */
const result\x241 = ({ target: { result } }) => result;

class IDBMap extends EventTarget {
  // Privates
  /** @type {Promise<IDBDatabase>} */ #db;
  /** @type {IDBMapOptions} */ #options;
  /** @type {string} */ #prefix;

  /**
   * @template T
   * @param {(store: IDBObjectStore) => IDBRequest<T>} what
   * @param {'readonly' | 'readwrite'} how
   * @returns {Promise<T>}
   */
  async #transaction(what, how) {
    const db = await this.#db;
    const t = db.transaction(STORAGE, how, this.#options);
    return new Promise((onsuccess, onerror) => assign\x242(
      what(t.objectStore(STORAGE)),
      {
        onsuccess,
        onerror,
      }
    ));
  }

  /**
   * @param {string} name
   * @param {IDBMapOptions} options
   */
  constructor(
    name,
    {
      durability = defaultOptions.durability,
      prefix = defaultOptions.prefix,
    } = defaultOptions
  ) {
    super();
    this.#prefix = prefix;
    this.#options = { durability };
    this.#db = new Promise((resolve, reject) => {
      assign\x242(
        indexedDB.open(\x60\x24{this.#prefix}/\x24{name}\x60),
        {
          onupgradeneeded({ target: { result, transaction } }) {
            if (!result.objectStoreNames.length)
              result.createObjectStore(STORAGE);
            transaction.oncomplete = () => resolve(result);
          },
          onsuccess(event) {
            resolve(result\x241(event));
          },
          onerror(event) {
            reject(event);
            this.dispatchEvent(event);
          },
        },
      );
    }).then(result => {
      const boundDispatch = this.dispatchEvent.bind(this);
      for (const key in result) {
        if (key.startsWith('on'))
          result[key] = boundDispatch;
      }
      return result;
    });
  }

  // EventTarget Forwards
  /**
   * @param {Event} event
   * @returns 
   */
  dispatchEvent(event) {
    const { type, message, isTrusted } = event;
    return super.dispatchEvent(
      // avoid re-dispatching of the same event
      isTrusted ?
        assign\x242(new Event(type), { message }) :
        event
    );
  }

  // IDBDatabase Forwards
  async close() {
    (await this.#db).close();
  }

  // Map async API
  get size() {
    return this.#transaction(
      store => store.count(),
      READONLY,
    ).then(result\x241);
  }

  async clear() {
    await this.#transaction(
      store => store.clear(),
      READWRITE,
    );
  }

  /**
   * @param {IDBValidKey} key
   */
  async delete(key) {
    await this.#transaction(
      store => store.delete(key),
      READWRITE,
    );
  }

  /**
   * @returns {Promise<IDBMapEntry[]>}
   */
  async entries() {
    const keys = await this.keys();
    return Promise.all(keys.map(key => this.get(key).then(value => [key, value])));
  }

  /**
   * @param {(unknown, IDBValidKey, IDBMap) => void} callback
   * @param {unknown} [context]
   */
  async forEach(callback, context = this) {
    for (const [key, value] of await this.entries())
      await callback.call(context, value, key, this);
  }

  /**
   * @param {IDBValidKey} key
   * @returns {Promise<unknown | undefined>}
   */
  async get(key) {
    const value = await this.#transaction(
      store => store.get(key),
      READONLY,
    ).then(result\x241);
    return value;
  }

  /**
   * @param {IDBValidKey} key
   */
  async has(key) {
    const k = await this.#transaction(
      store => store.getKey(key),
      READONLY,
    ).then(result\x241);
    return k !== void 0;
  }

  async keys() {
    const keys = await this.#transaction(
      store => store.getAllKeys(),
      READONLY,
    ).then(result\x241);
    return keys;
  }

  /**
   * @param {IDBValidKey} key
   * @param {unknown} value
   */
  async set(key, value) {
    await this.#transaction(
      store => store.put(value, key),
      READWRITE,
    );
    return this;
  }

  async values() {
    const keys = await this.keys();
    return Promise.all(keys.map(key => this.get(key)));
  }

  get [Symbol.toStringTag]() {
    return this.#prefix;
  }
}

class IDBMapSync extends Map {
  #map;
  #queue;
  constructor(...args) {
    super();
    this.#map = new IDBMap(...args);
    this.#queue = this.#map.entries().then(entries => {
      for (const [key, value] of entries)
        super.set(key, value);
    });
  }
  async close() {
    await this.#queue;
    await this.#map.close();
  }
  async sync() {
    await this.#queue;
  }
  clear() {
    this.#queue = this.#queue.then(() => this.#map.clear());
    return super.clear();
  }
  delete(key) {
    this.#queue = this.#queue.then(() => this.#map.delete(key));
    return super.delete(key);
  }
  set(key, value) {
    this.#queue = this.#queue.then(() => this.#map.set(key, value));
    return super.set(key, value);
  }
}

// ⚠️ AUTOMATICALLY GENERATED - DO NOT CHANGE
const CHANNEL = 'ab344e2d';
const MAIN = '=' + CHANNEL;
const WORKER = '-' + CHANNEL;

let i\x244 = 0;

const FALSE\x241 = i\x244++;
const TRUE\x241 = i\x244++;

i\x244++;
const NULL\x241 = i\x244++;

const NUMBER\x241 = i\x244++;
const UI8\x241 = i\x244++;
const NAN\x241 = i\x244++;
const INFINITY\x241 = i\x244++;
const N_INFINITY\x241 = i\x244++;
const ZERO\x241 = i\x244++;
const N_ZERO\x241 = i\x244++;

const BIGINT\x242 = i\x244++;
const BIGUINT\x241 = i\x244++;

const STRING\x241 = i\x244++;

const SYMBOL\x242 = i\x244++;

const ARRAY\x242 = i\x244++;
const BUFFER\x242 = i\x244++;
const DATE\x241 = i\x244++;
const ERROR\x241 = i\x244++;
const MAP\x241 = i\x244++;
const OBJECT\x242 = i\x244++;
const REGEXP\x241 = i\x244++;
const SET\x242 = i\x244++;
const VIEW\x242 = i\x244++;

const RECURSION\x241 = i\x244++;

const decoder\x243 = new TextDecoder;

new TextEncoder;

const DIRECT           = 0;
const REMOTE           = 1 << 0;
const OBJECT\x241           = 1 << 1;
const ARRAY\x241            = 1 << 2;
const FUNCTION         = 1 << 3;
const SYMBOL\x241           = 1 << 4;
const BIGINT\x241           = 1 << 5;
const BUFFER\x241           = 1 << 6;

const VIEW\x241             = BUFFER\x241 | ARRAY\x241;
const REMOTE_OBJECT    = REMOTE | OBJECT\x241;
const REMOTE_ARRAY     = REMOTE | ARRAY\x241;

/** @type {Map<symbol, string>} */
const symbols\x241 = new Map(
  Reflect.ownKeys(Symbol).map(
    key => [Symbol[key], \x60@\x24{String(key)}\x60]
  )
);

/**
 * @param {symbol} value
 * @param {string} description
 * @returns {string}
 */
const asSymbol\x241 = (value, description) => (
  description === void 0 ? '?' :
  (Symbol.keyFor(value) === void 0 ? \x60!\x24{description}\x60 : \x60#\x24{description}\x60)
);

/**
 * Extract the value from a pair of type and value.
 * @param {string} name
 * @returns {symbol}
 */
const fromSymbol\x241 = name => {
  switch (name[0]) {
    case '@': return Symbol[name.slice(1)];
    case '#': return Symbol.for(name.slice(1));
    case '!': return Symbol(name.slice(1));
    default: return Symbol();
  }
};

/**
 * Create the name of a symbol.
 * @param {symbol} value
 * @returns {string}
 */
const toSymbol\x241 = value => symbols\x241.get(value) || asSymbol\x241(value, value.description);

const defineProperty\x242 = Object.defineProperty;

const assign\x241 = Object.assign;

const isArray\x243 = Array.isArray;

const isView\x242 = ArrayBuffer.isView;

/**
 * A type/value pair.
 * @typedef {[number, any]} TypeValue
 */

/**
 * Create a type/value pair.
 * @param {number} type
 * @param {any} value
 * @returns {TypeValue}
 */
const tv = (type, value) => [type, value];

const identity = value => value;

const object = {};

/**
 * Create a function that loops through an array and applies a function to each value.
 * @param {(value:any, cache?:Map<any, any>) => any} asValue
 * @returns
 */
const loopValues = asValue => (
  /**
   * Loop through an array and apply a function to each value.
   * @param {any[]} arr
   * @param {Map} [cache]
   * @returns
   */
  (arr, cache = new Map) => {
    for (let i = 0, length = arr.length; i < length; i++)
      arr[i] = asValue(arr[i], cache);
    return arr;
  }
);

/**
 * Extract the value from a pair of type and value.
 * @param {TypeValue} pair
 * @returns {string|symbol}
 */
const fromKey = ([type, value]) => type === DIRECT ? value : fromSymbol\x241(value);

/**
 * Associate a key with an optionally transformed value.
 * @param {string|symbol} value
 * @returns {TypeValue}
 */
const toKey = value => typeof value === 'string' ?
  tv(DIRECT, value) : tv(SYMBOL\x241, toSymbol\x241(value))
;

const buffer\x241 = new ArrayBuffer(8);
const dv\x241 = new DataView(buffer\x241);
const u8a8\x241 = new Uint8Array(buffer\x241);

//@ts-check


/** @typedef {Map<number, any>} Cache */

/**
 * @param {Cache} cache
 * @param {number} index
 * @param {any} value
 * @returns {any}
 */
const \x24\x241 = (cache, index, value) => {
  cache.set(index, value);
  return value;
};

/**
 * @param {Uint8Array} input
 */
const number\x241 = input => {
  u8a8\x241[0] = input[i\x243++];
  u8a8\x241[1] = input[i\x243++];
  u8a8\x241[2] = input[i\x243++];
  u8a8\x241[3] = input[i\x243++];
  u8a8\x241[4] = input[i\x243++];
  u8a8\x241[5] = input[i\x243++];
  u8a8\x241[6] = input[i\x243++];
  u8a8\x241[7] = input[i\x243++];
};

/**
 * @param {Uint8Array} input
 * @returns {number}
 */
const size\x241 = input => {
  u8a8\x241[0] = input[i\x243++];
  u8a8\x241[1] = input[i\x243++];
  u8a8\x241[2] = input[i\x243++];
  u8a8\x241[3] = input[i\x243++];
  return dv\x241.getUint32(0, true);
};

/**
 * @param {Uint8Array} input
 * @param {Cache} cache
 * @returns {any}
 */
const deflate\x241 = (input, cache) => {
  switch (input[i\x243++]) {
    case NUMBER\x241: {
      number\x241(input);
      return dv\x241.getFloat64(0, true);
    }
    case UI8\x241: return input[i\x243++];
    case OBJECT\x242: {
      const object = \x24\x241(cache, i\x243 - 1, {});
      for (let j = 0, length = size\x241(input); j < length; j++)
        object[deflate\x241(input, cache)] = deflate\x241(input, cache);
      return object;
    }
    case ARRAY\x242: {
      const array = \x24\x241(cache, i\x243 - 1, []);
      for (let j = 0, length = size\x241(input); j < length; j++)
        array.push(deflate\x241(input, cache));
      return array;
    }
    case VIEW\x242: {
      const index = i\x243 - 1;
      const name = deflate\x241(input, cache);
      return \x24\x241(cache, index, new globalThis[name](deflate\x241(input, cache)));
    }
    case BUFFER\x242: {
      const index = i\x243 - 1;
      const length = size\x241(input);
      return \x24\x241(cache, index, input.slice(i\x243, i\x243 += length).buffer);
    }
    case STRING\x241: {
      const index = i\x243 - 1;
      const length = size\x241(input);
      // this could be a subarray but it's not supported on the Web and
      // it wouldn't work with arrays instead of typed arrays.
      return \x24\x241(cache, index, decoder\x243.decode(input.slice(i\x243, i\x243 += length)));
    }
    case DATE\x241: {
      return \x24\x241(cache, i\x243 - 1, new Date(deflate\x241(input, cache)));
    }
    case MAP\x241: {
      const map = \x24\x241(cache, i\x243 - 1, new Map);
      for (let j = 0, length = size\x241(input); j < length; j++)
        map.set(deflate\x241(input, cache), deflate\x241(input, cache));
      return map;
    }
    case SET\x242: {
      const set = \x24\x241(cache, i\x243 - 1, new Set);
      for (let j = 0, length = size\x241(input); j < length; j++)
        set.add(deflate\x241(input, cache));
      return set;
    }
    case ERROR\x241: {
      const name = deflate\x241(input, cache);
      const message = deflate\x241(input, cache);
      const stack = deflate\x241(input, cache);
      const Class = globalThis[name] || Error;
      const error = new Class(message);
      return \x24\x241(cache, i\x243 - 1, defineProperty\x242(error, 'stack', { value: stack }));
    }
    case REGEXP\x241: {
      const source = deflate\x241(input, cache);
      const flags = deflate\x241(input, cache);
      return \x24\x241(cache, i\x243 - 1, new RegExp(source, flags));
    }
    case FALSE\x241: return false;
    case TRUE\x241: return true;
    case NAN\x241: return NaN;
    case INFINITY\x241: return Infinity;
    case N_INFINITY\x241: return -Infinity;
    case ZERO\x241: return 0;
    case N_ZERO\x241: return -0;
    case NULL\x241: return null;
    case BIGINT\x242: return (number\x241(input), dv\x241.getBigInt64(0, true));
    case BIGUINT\x241: return (number\x241(input), dv\x241.getBigUint64(0, true));
    case SYMBOL\x242: return fromSymbol\x241(deflate\x241(input, cache));
    case RECURSION\x241: return cache.get(size\x241(input));
    // this covers functions too
    default: return undefined;
  }
};

let i\x243 = 0;

/**
 * @param {Uint8Array} value
 * @returns {any}
 */
const decode\x241 = value => {
  i\x243 = 0;
  return deflate\x241(value, new Map);
};

/**
 * @param {{ byteOffset?: number }} [options]
 * @returns {(length: number, buffer: ArrayBufferLike) => any}
 */
const decoder\x242 = ({ byteOffset = 0 } = {}) => (length, buffer) => decode\x241(
  new Uint8Array(buffer, byteOffset, length)
);

let i\x242 = 0;

// extras
const UNREF = i\x242++;
const ASSIGN = i\x242++;
const EVALUATE = i\x242++;
const GATHER = i\x242++;
const QUERY = i\x242++;

// traps
const APPLY = i\x242++;
const CONSTRUCT = i\x242++;
const DEFINE_PROPERTY = i\x242++;
const DELETE_PROPERTY = i\x242++;
const GET = i\x242++;
const GET_OWN_PROPERTY_DESCRIPTOR = i\x242++;
const GET_PROTOTYPE_OF = i\x242++;
const HAS = i\x242++;
const IS_EXTENSIBLE = i\x242++;
const OWN_KEYS = i\x242++;
const PREVENT_EXTENSIONS = i\x242++;
const SET\x241 = i\x242++;
const SET_PROTOTYPE_OF = i\x242++;

const { getPrototypeOf: getPrototypeOf\x241 } = Object;
const { toString } = object;

const toName = (ref, name = toString.call(ref).slice(8, -1)) =>
  name in globalThis ? name : toName(getPrototypeOf\x241(ref) || object);

/** @typedef {[ArrayBufferLike|number[], number]} BufferDetails */
/** @typedef {[string, BufferDetails, number, number]} ViewDetails */

/**
 * @param {number} length
 * @param {number} maxByteLength
 * @returns {ArrayBufferLike}
 */
const resizable = (length, maxByteLength) => new ArrayBuffer(length, { maxByteLength });

/**
 * @param {BufferDetails} details 
 * @param {boolean} direct
 * @returns {ArrayBufferLike}
 */
const fromBuffer = ([value, maxByteLength], direct) => {
  const length = direct ? /** @type {ArrayBufferLike} */ (value).byteLength : /** @type {number[]} */ (value).length;
  if (direct) {
    if (maxByteLength) {
      const buffer = resizable(length, maxByteLength);
      new Uint8Array(buffer).set(new Uint8Array(/** @type {ArrayBufferLike} */ (value)));
      value = buffer;
    }
  }
  else {
    const buffer = maxByteLength ? resizable(length, maxByteLength) : new ArrayBuffer(length);
    new Uint8Array(buffer).set(/** @type {number[]} */ (value));
    value = buffer;
  }
  return /** @type {ArrayBufferLike} */ (value);
};

/**
 * @param {ViewDetails} details
 * @param {boolean} direct
 */
const fromView = ([name, args, byteOffset, length], direct) => {
  const buffer = fromBuffer(args, direct);
  const Class = globalThis[name];
  return length ? new Class(buffer, byteOffset, length) : new Class(buffer, byteOffset);
};

// (c) https://github.com/WebReflection/to-json-callback
// brought in here to avoid a dependency for quick testing

/**
 * @param {Function} [callback=this]
 * @returns {string}
 */
function toJSONCallback (callback = this) {
  return String(callback).replace(
    /^(async\x5cs*)?(\x5cbfunction\x5cb)?(.*?)\x5c(/,
    (_, isAsync, fn, name) => (
      name && !fn ?
        \x60\x24{isAsync || ""}function \x24{name}(\x60 :
        _
    ),
  );
}

const brackets = /\x5c[('|")?(.+?)\x5c1\x5c]/g;

const keys = (target, key) => target?.[key];

/**
 * Parses the given path and returns the value at the given target.
 * @param {any} target
 * @param {string} path
 * @returns {any}
 */
var query = (target, path) => path.replace(brackets, '.\x242').split('.').reduce(keys, target);

/**
 * @template T
 * @typedef {Object} Heap
 * @property {() => void} clear
 * @property {(ref:T) => number} id
 * @property {(id:number) => T} ref
 * @property {(id:number) => boolean} unref
 */

/**
 * Create a heap-like utility to hold references in memory.
 * @param {number} [id=0] The initial \x60id\x60 which is \x600\x60 by default.
 * @param {Map<number, any>} [ids=new Map] The used map of ids to references.
 * @param {Map<any, number>} [refs=new Map] The used map of references to ids.
 * @returns {Heap<any>}
 */
var heap = (id = 0, ids = new Map, refs = new Map) => ({
  clear: () => {
    ids.clear();
    refs.clear();
  },
  id: ref => {
    let uid = refs.get(ref);
    if (uid === void 0) {
      /* c8 ignore next */
      while (ids.has(uid = id++));
      ids.set(uid, ref);
      refs.set(ref, uid);
    }
    return uid;
  },
  ref: id => ids.get(id),
  unref: id => {
    refs.delete(ids.get(id));
    return ids.delete(id);
  },
});

const { preventExtensions } = Object;

/**
 * @typedef {Object} RemoteOptions Optional utilities used to orchestrate local <-> remote communication.
 * @property {Function} [reflect=identity] The function used to reflect operations via the remote receiver. All \x60Reflect\x60 methods + \x60unref\x60 are supported.
 * @property {Function} [transform=identity] The function used to transform local values into simpler references that the remote side can understand.
 * @property {Function} [released=identity] The function invoked when a reference is released.
 * @property {boolean} [buffer=false] Optionally allows direct buffer deserialization breaking JSON compatibility.
 */

/**
 * @param {RemoteOptions} options
 * @returns
 */
var remote = ({
  reflect = identity,
  transform = identity,
  released = identity,
  buffer = false,
} = object) => {
  const fromKeys = loopValues(fromKey);
  const toKeys = loopValues(toKey);

  // OBJECT, DIRECT, VIEW, REMOTE_ARRAY, REMOTE_OBJECT, REMOTE_FUNCTION, SYMBOL, BIGINT
  const fromValue = value => {
    if (!isArray\x243(value)) return value;
    const [t, v] = value;
    if (t & REMOTE) return asProxy(value, t, v);
    switch (t) {
      case OBJECT\x241: return global;
      case DIRECT: return v;
      case SYMBOL\x241: return fromSymbol\x241(v);
      case BIGINT\x241: return BigInt(v);
      case VIEW\x241: return fromView(v, buffer);
      case BUFFER\x241: return fromBuffer(v, buffer);
      // there is no other case
    }
  };

  const toValue = (value, cache = new Map) => {
    switch (typeof value) {
      case 'object': {
        if (value === null) break;
        if (value === globalThis) return globalTarget;
        if (reflected in value) return reference;
        let cached = cache.get(value);
        if (!cached) {
          const \x24 = transform(value);
          if (indirect || !direct.has(\x24)) {
            if (isArray\x243(\x24)) {
              const a = [];
              cached = tv(ARRAY\x241, a);
              cache.set(value, cached);
              for (let i = 0, length = \x24.length; i < length; i++)
                a[i] = toValue(\x24[i], cache);
              return cached;
            }
            if (!isView\x242(\x24) && !(\x24 instanceof ArrayBuffer) && toName(\x24) === 'Object') {
              const o = {};
              cached = tv(OBJECT\x241, o);
              cache.set(value, cached);
              for (const k in \x24)
                o[k] = toValue(\x24[k], cache);
              return cached;
            }
          }
          cached = tv(DIRECT, \x24);
          cache.set(value, cached);
        }
        return cached;
      }
      case 'function': {
        if (reflected in value) return reference;
        let cached = cache.get(value);
        if (!cached) {
          const \x24 = transform(value);
          cached = tv(FUNCTION, id(\x24));
          cache.set(value, cached);
        }
        return cached;
      }
      case 'symbol': return tv(SYMBOL\x241, toSymbol\x241(value));
    }
    return value;
  };

  const toValues = loopValues(toValue);

  const asProxy = (tv, t, v) => {
    let wr = weakRefs.get(v), proxy = wr?.deref();
    if (!proxy) {
      /* c8 ignore start */
      if (wr) fr.unregister(wr);
      /* c8 ignore stop */
      proxy = new (
        t === REMOTE_OBJECT ? ObjectHandler :
        (t === REMOTE_ARRAY ? ArrayHandler : FunctionHandler)
      )(tv, v);
      wr = new WeakRef(proxy);
      weakRefs.set(v, wr);
      fr.register(proxy, v, wr);
    }
    return proxy;
  };

  /**
   * Checks if the given value is a proxy created in the remote side.
   * @param {any} value
   * @returns {boolean}
   */
  const isProxy = value => {
    switch (typeof value) {
      case 'object': if (value === null) break;
      case 'function': return reflected in value;
      default: return false;
    }
  };

  class Handler {
    constructor(_) { this._ = _; }

    get(_, key) { return fromValue(reflect(GET, this._, toKey(key))) }
    set(_, key, value) { return reflect(SET\x241, this._, toKey(key), toValue(value)) }
    ownKeys(_) { return fromKeys(reflect(OWN_KEYS, this._), weakRefs) }
    getOwnPropertyDescriptor(_, key) {
      const descriptor = fromValue(reflect(GET_OWN_PROPERTY_DESCRIPTOR, this._, toKey(key)));
      if (descriptor) {
        for (const k in descriptor)
          descriptor[k] = fromValue(descriptor[k]);
      }
      return descriptor;
    }
    defineProperty(_, key, descriptor) { return reflect(DEFINE_PROPERTY, this._, toKey(key), toValue(descriptor)) }
    deleteProperty(_, key) { return reflect(DELETE_PROPERTY, this._, toKey(key)) }
    getPrototypeOf(_) { return fromValue(reflect(GET_PROTOTYPE_OF, this._)) }
    setPrototypeOf(_, value) { return reflect(SET_PROTOTYPE_OF, this._, toValue(value)) }
    isExtensible(_) { return reflect(IS_EXTENSIBLE, this._) }
    preventExtensions(target) { return preventExtensions(target) && reflect(PREVENT_EXTENSIONS, this._) }
  }

  const has = (_, \x24, prop) => prop === reflected ?
    !!(reference = _) :
    reflect(HAS, \x24, toKey(prop))
  ;

  class ObjectHandler extends Handler {
    constructor(tv, v) {
      //@ts-ignore
      return new Proxy({ _: tv }, super(v));
    }

    has(target, prop) { return has(target._, this._, prop) }
  }

  class ArrayHandler extends Handler {
    constructor(tv, v) {
      //@ts-ignore
      return new Proxy(tv, super(v));
    }

    has(target, prop) { return has(target, this._, prop) }
  }

  class FunctionHandler extends Handler {
    constructor(tv, v) {
      //@ts-ignore
      return new Proxy(asFunction.bind(tv), super(v));
    }

    has(target, prop) { return has(target(), this._, prop) }
    construct(_, args) { return fromValue(reflect(CONSTRUCT, this._, toValues(args))) }

    apply(_, self, args) {
      const map = new Map;
      return fromValue(reflect(APPLY, this._, toValue(self, map), toValues(args, map)));
    }

    get(_, key) {
      switch (key) {
        // skip obvious roundtrip cases
        case 'apply': return (self, args) => this.apply(_, self, args);
        case 'call': return (self, ...args) => this.apply(_, self, args);
        default: return super.get(_, key);
      }
    }
  }

  let indirect = true, direct, reference;

  const { id, ref, unref } = heap();
  const weakRefs = new Map;
  const globalTarget = tv(OBJECT\x241, null);
  const reflected = Symbol('reflected-ffi');
  const global = new ObjectHandler(globalTarget, null);
  const fr = new FinalizationRegistry(v => {
    weakRefs.delete(v);
    reflect(UNREF, v);
  });

  return {
    /**
     * The local global proxy reference.
     * @type {unknown}
     */
    global,

    isProxy,

    /** @type {typeof assign} */
    assign(target, ...sources) {
      const asProxy = isProxy(target);
      const assignment = assign\x241(asProxy ? {} : target, ...sources);
      if (asProxy) reflect(ASSIGN, reference[1], toValue(assignment));
      return target;
    },

    /**
     * Alows local references to be passed directly to the remote receiver,
     * either as copy or serliazied values (it depends on the implementation).
     * @template {WeakKey} T
     * @param {T} value
     * @returns {T}
     */
    direct(value) {
      if (indirect) {
        indirect = false;
        direct = new WeakSet;
      }
      direct.add(value);
      return value;
    },

    /**
     * Evaluates elsewhere the given callback with the given arguments.
     * This utility is similar to puppeteer's \x60page.evaluate\x60 where the function
     * content is evaluated in the local side and its result is returned.
     * @param {Function} callback
     * @param  {...any} args
     * @returns {any}
     */
    evaluate: (callback, ...args) => fromValue(
      reflect(EVALUATE, null, toJSONCallback(callback), toValues(args))
    ),

    /**
     * @param {object} target
     * @param  {...(string|symbol)} keys
     * @returns {any[]}
     */
    gather(target, ...keys) {
      const asProxy = isProxy(target);
      const asValue = asProxy ? fromValue : (key => target[key]);
      if (asProxy) keys = reflect(GATHER, reference[1], toKeys(keys, weakRefs));
      for (let i = 0; i < keys.length; i++) keys[i] = asValue(keys[i]);
      return keys;
    },

    /**
     * Queries the given target for the given path.
     * @param {any} target
     * @param {string} path
     * @returns {any}
     */
    query: (target, path) => (
      isProxy(target) ?
        fromValue(reflect(QUERY, reference[1], path)) :
        query(target, path)
    ),

    /**
     * The callback needed to resolve any local call. Currently only \x60apply\x60 and \x60unref\x60 are supported.
     * Its returned value will be understood by the remote implementation
     * and it is compatible with the structured clone algorithm.
     * @param {number} method
     * @param {number?} uid
     * @param  {...any} args
     * @returns
     */
    reflect(method, uid, ...args) {
      switch (method) {
        case APPLY: {
          const [context, params] = args;
          for (let i = 0, length = params.length; i < length; i++)
            params[i] = fromValue(params[i]);
          return toValue(Reflect.apply(ref(uid), fromValue(context), params));
        }
        case UNREF: {
          released(ref(uid));
          return unref(uid);
        }
      }
    },
  };
};

function asFunction() {
  return this;
}

//@ts-check

/**
 * @template T
 * @typedef {{promise: Promise<T>, resolve: (value: T) => void, reject: (reason?: any) => void}} Resolvers
 */

//@ts-ignore
const withResolvers = Promise.withResolvers;

/**
 * @template T
 * @type {() => Resolvers<T>}
 */
var withResolvers\x241 = withResolvers.bind(Promise);

//@ts-check


/**
 * @template V
 * @callback Resolve
 * @param {V?} [value]
 * @returns {void}
 */

/**
 * @callback Reject
 * @param {any?} [error]
 * @returns {void}
 */

/**
 * @template V
 * @typedef {object} Resolvers
 * @prop {Promise<V>} promise
 * @prop {Resolve<V>} resolve
 * @prop {Reject} reject
 */

/**
 * @template K,V
 * @typedef {() => [K, Promise<V>]} Next
 */

/**
 * @template K,V
 * @callback Resolver
 * @param {K} uid
 * @param {V?} [value]
 * @param {any?} [error]
 */

/**
 * @template K,V
 * @typedef {[Next<K,V>, Resolver<K,V>]} NextResolver
 */

/**
 * @template K,V
 * @param {(id: number) => K} [as]
 * @returns
 */
var nextResolver = (as = (id => /** @type {K} */(id))) => {
  /** @type {Map<K,Resolvers<V>>} */
  const map = new Map;
  let id = 0;
  return /** @type {NextResolver<K,V>} */([
    /** @type {Next<K,V>} */
    () => {
      let uid;
      do { uid = as(id++); }
      while (map.has(uid));
      const wr = /** @type {Resolvers<V>} */(/** @type {unknown} */(withResolvers\x241()));
      map.set(uid, wr);
      return [uid, wr.promise];
    },
    /** @type {Resolver<K,V>} */
    (uid, value, error) => {
      const wr = map.get(uid);
      map.delete(uid);
      if (error) wr?.reject(error);
      else wr?.resolve(value);
    },
  ]);
};

//@ts-check

/** @type {ArrayBuffer[]} */
const nothing = [];

/** @type {WeakSet<ArrayBuffer[]>} */
const buffers = new WeakSet;

/**
 * @param {boolean} check
 * @param {any[]} args
 * @returns
 */
const get = (check, args) => {
  let transfer = nothing;
  if (check && buffers.has(args.at(-1) || nothing)) {
    transfer = args.pop();
    buffers.delete(transfer);
  }
  return transfer;
};

/**
 * @param  {...ArrayBuffer} args
 * @returns
 */
const set\x242 = (...args) => {
  buffers.add(args);
  return args;
};

//@ts-check

let { SharedArrayBuffer: SAB } = globalThis, native\x241 = true;

try {
  //@ts-ignore due valid options not recognized
  new SAB(4, { maxByteLength: 8 });
}
catch (_) {
  native\x241 = false;
  SAB = /** @type {SharedArrayBufferConstructor} */(
    /** @type {unknown} */(
      class SharedArrayBuffer extends ArrayBuffer {
        get growable() {
          //@ts-ignore due valid property not recognized
          return super.resizable;
        }
        /** @param {number} newLength */
        grow(newLength) {
          //@ts-ignore due valid method not recognized
          super.resize(newLength);
        }
      }
    )
  );
}

const {
  create: create\x241,
} = Object;

/* c8 ignore start */
const ID = \x60coincident-\x24{native\x241 ? crypto.randomUUID() : Math.random().toString(36).substring(2)}\x60;
/* c8 ignore end */

const byteOffset = 2 * Int32Array.BYTES_PER_ELEMENT;
const minByteLength = 0x7FFF; // throws at 0xFFFF via .apply(...)
const maxByteLength = 0x1000000;

const defaults = {
  // ⚠️ mandatory: first int32 to notify, second one to store the written length
  byteOffset,
};

const result = async (data, proxied, transform) => {
  try {
    const result = await proxied[data[1]].apply(null, data[2]);
    data[1] = transform ? transform(result) : result;
    data[2] = null;
  }
  catch (error) { data[2] = error; }
};

const set\x241 = (proxied, name, callback) => {
  const ok = name !== 'then';
  if (ok) proxied[name] = callback;
  return ok;
};

/** @param {Event} event */
const stop = event => {
  event.stopImmediatePropagation();
  event.preventDefault();
};

// ⚠️ AUTOMATED ⚠️
var BROADCAST_CHANNEL_UID = 'dc78209b-186c-4f83-80e9-406becb7d9f3';

const { isArray: isArray\x242 } = Array;
const { isView: isView\x241 } = ArrayBuffer;
const { values } = Object;

const [next, resolve\x242] = nextResolver();
let [bootstrap\x241, promise] = next();

/**
 * @callback sabayon
 * @param {string|URL} [serviceWorkerURL] - The URL of the service worker to register on the main thread.
 * @returns {Promise<void>} - A promise that resolves when the polyfill is ready.
 */

let register\x241 = /** @type {sabayon} */(() => promise);

let {
  Atomics,
  SharedArrayBuffer,
  postMessage: postMessage\x241,
} = globalThis;

if (native\x241) resolve\x242(bootstrap\x241);
else {
  SharedArrayBuffer = SAB;

  const views = new Map;

  const addListener = (target, ...args) => {
    target.addEventListener(...args);
  };

  const extend = (target, literal) => {
    for (const key in literal) {
      literal[key] = {
        value: literal[key],
        configurable: true,
        writable: true,
      };
    }
    return Object.create(target, literal);
  };

  // Web Worker
  if ('importScripts' in globalThis) {
    const intercept = (set, data, view) => {
      if (view && typeof view === 'object' && !set.has(view)) {
        set.add(view);
        if (isView\x241(view)) {
          // avoid DataView or other views to be considered for waiting
          if (view instanceof Int32Array && view.buffer instanceof SharedArrayBuffer) {
            const id = ids++;
            if (views.has(view)) throw new Error('View already exists');
            views.set(view, id);
            return [UID, id, view, data];
          }
        }
        else {
          const array = isArray\x242(view) ? view : values(view);
          for (let i = 0; i < array.length; i++) {
            const details = intercept(set, data, array[i]);
            if (details) return details;
          }
        }
      }
    };

    const interceptor = method => function postMessage(data, ...rest) {
      if (ready) {
        const details = intercept(new Set, data, data);
        method.call(this, (details || data), ...rest);
      }
      else {
        promise.then(() => postMessage(data, ...rest));
      }
    };

    postMessage\x241 = interceptor(postMessage\x241);

    const { prototype } = globalThis.MessagePort;
    prototype.postMessage = interceptor(prototype.postMessage);

    addListener(
      globalThis,
      'message',
      event => {
        let { data } = event;
        // console.log('sabayon', data);
        if (isArray\x242(data) && typeof data.at(1) === 'string')
          event.stopImmediatePropagation();
        resolve\x242(bootstrap\x241, data);
      },
      { once: true }
    );

    // <Atomics Patch>
    const { wait } = Atomics;
    const { parse } = JSON;

    const Async = value => ({ value, async: true });

    const Request = (view, sync) => {
      const xhr = new XMLHttpRequest;
      // console.log('request', String(UID).length, views.has(view));
      xhr.open('POST', \x60\x24{SW}?sabayon\x60, sync);
      xhr.send(\x60["\x24{UID}",\x24{views.get(view)}]\x60);
      return xhr;
    };

    const Response = (view, xhr) => {
      const responseText = xhr.responseText;
      const value = parse(responseText);
      //console.log('response', String(responseText).length, value);
      view.set(value);
      views.delete(view);
      return 'ok';
    };

    const failIfNoView = (...args) => {
      console.log('FAIL', ...args);
      throw new Error('No view found');
    };

    Atomics = extend(Atomics, {
      wait: (view, ..._) => views.has(view) ?
        Response(view, Request(view, false)) :
        failIfNoView(view, ..._)
      ,
      waitAsync: (view, ..._) => {
        if (views.has(view)) {
          const { promise, resolve } = withResolvers\x241();
          const xhr = Request(view, true);
          xhr.onloadend = () => resolve(Response(view, xhr));
          return Async(promise);
        }
        return wait(view, ..._);
      },
    });

    let UID, SW, ready = false, ids = Math.random();

    promise = promise.then(data => {
      [UID, SW] = data;
      ready = true;
    });
  }
  // Main
  else {
    const UID = ID;

    let lastView;
    const bc = new BroadcastChannel(BROADCAST_CHANNEL_UID);
    bc.onmessage = async event => {
      const [swid, wid, vid] = event.data;
      if (wid === UID) {
        for (const [view, [id, wr]] of views) {
          if (id === vid) {
            await wr.promise;
            views.delete(view);
            let length = view.length;
            while (length-- && !view[length]);
            bc.postMessage(lastView = [swid, view.slice(0, length + 1)]);
            break;
          }
        }
        // console.warn('NO VIEW FOUND', 'Worker', lastView);
      }
    };

    const { notify } = Atomics;
    Atomics = Object.create(Atomics, {
      notify: {
        configurable: true,
        writable: true,
        value: (view, ..._) => {
          const details = views.get(view);
          if (details) {
            details[1].resolve();
            return 0;
          }
          return notify(view, ..._);
        },
      },
    });

    let SW = '';
    let serviceWorker = null;

    /**
     * @param {ServiceWorkerContainer} swc
     * @param {RegistrationOptions} [options]
     */
    const activate = (swc, options) => {
      let w, c = true;
      swc.getRegistration(SW)
        .then(r => (r ?? swc.register(SW, options)))
        .then(function ready(r) {
          const { controller } = swc;
          c = c && !!controller;
          w = (r.installing || r.waiting || r.active);
          document.body.append(w.state, document.createElement('br'));
          if (w.state === 'activated') {
            if (c) {
              document.body.append('controller [', controller.scriptURL, '][', SW, ']', document.createElement('br'));
              // allow ServiceWorker swap on different URL
              if (controller.scriptURL === SW)
                return resolve\x242(bootstrap\x241);
              r.unregister();
            }
            location.reload();
          }
          else {
            addListener(w, 'statechange', () => ready(r), { once: true });
          }
        });
    };

    register\x241 = /** @type {sabayon} */((serviceWorkerURL, options) => {
      if (!serviceWorker) {
        // resolve the fully qualified URL for Blob based workers
        SW = new URL(serviceWorkerURL, location.href).href;
        activate(navigator.serviceWorker, options);
        serviceWorker = promise;
      }
      return serviceWorker;
    });
  }
}

// wait for the channel before resolving
const bootstrap = withResolvers\x241();

addEventListener(
  'message',
  event => {
    stop(event);
    const [ID, SW] = event.data;
    // console.log('coincident', [ID, SW]);
    bootstrap.resolve({ ID, SW, channel: event.ports[0] });
  },
  { once: true }
);

var coincident\x241 = async options => {
  const { ID, SW, channel } = await register\x241().then(() => bootstrap.promise);
  const WORKAROUND = !!ID;
  const direct = native\x241 || !!SW;
  const transform = options?.transform;
  const decode = (options?.decoder || decoder\x242)(defaults);
  const checkTransferred = options?.transfer !== false;

  let i32a, pause, wait;
  if (direct) {
    const sab = new SharedArrayBuffer(
      options?.minByteLength || minByteLength,
      { maxByteLength: options?.maxByteLength || maxByteLength }
    );
    i32a = new Int32Array(sab);
    ({ pause, wait } = Atomics);
    // prefer the fast path when possible
    if (pause && !WORKAROUND && !(sab instanceof ArrayBuffer)) {
      wait = (view, index) => {
        while (view[index] < 1) pause();
      };
    }
  }

  const [ next, resolve ] = nextResolver(String);
  const callbacks = new Map;
  const proxied = create\x241(null);
  const proxy = new Proxy(proxied, {
    get(_, name) {
      // the curse of potentially awaiting proxies in the wild
      // requires this ugly guard around \x60then\x60
      if (name === 'then') return;
      let cb = callbacks.get(name);
      if (!cb) {
        callbacks.set(name, cb = (...args) => {
          const transfer = get(checkTransferred, args);
          const data = [i32a, name, transform ? args.map(transform) : args];
          // synchronous request
          if (direct) {
            // if (WORKAROUND) postMessage\x241({ ID, data }, transfer);
            channel.postMessage(data, transfer);
            wait(i32a, 0);
            i32a[0] = 0;
            const result = i32a[1] ? decode(i32a[1], i32a.buffer) : void 0;
            if (result instanceof Error) throw result;
            return result;
          }
          // postMessage based request
          else {
            const [uid, promise] = next();
            data[0] = uid;
            channel.postMessage(data, transfer);
            return promise;
          }
        });
      }
      return cb;
    },
    set: set\x241
  });

  channel.onmessage = async ({ data }) => {
    if (typeof data[0] === 'string')
      resolve.apply(null, data);
    else {
      await result(data, proxied, transform);
      channel.postMessage(data);
    }
  };

  return {
    native: native\x241,
    proxy,
    sync: direct,
    transfer: set\x242,
  };
};

/**
 * @callback Coincident
 * @param {import('../worker.js').WorkerOptions} [options]
 * @returns {Promise<{native: boolean, transfer: (...args: Transferable[]) => Transferable[], proxy: {}, window: Window, isWindowProxy: (value: any) => boolean}>}
 */

var coincident = /** @type {Coincident} */ async options => {
  const exports = await coincident\x241({
    ...options,
    decoder: options?.decoder || decoder\x242,
  });

  const ffi = remote({ ...options, buffer: true, reflect: exports.proxy[MAIN] });
  exports.proxy[WORKER] = ffi.reflect;

  return {
    ...exports,
    window: ffi.global,
    isWindowProxy: ffi.isProxy,
    ffi: {  
      assign: ffi.assign,
      direct: ffi.direct,
      evaluate: ffi.evaluate,
      gather: ffi.gather,
      query: ffi.query,
    }
  };
};

function content (t) {
  for (var s = t[0], i = 1, l = arguments.length; i < l; i++)
    s += arguments[i] + t[i];
  return s;
}

const dedent\x241 = {
  object(...args) {
    return this.string(content(...args));
  },
  string(content) {
    for (const line of content.split(/[\x5cr\x5cn]+/)) {
      // skip initial empty lines
      if (line.trim().length) {
        // trap indentation at the very first line of code
        if (/^(\x5cs+)/.test(line))
          content = content.replace(new RegExp('^' + RegExp.\x241, 'gm'), '');
        // no indentation? all good: get out of here!
        break;
      }
    }
    return content;
  }
};

/**
 * Usable both as template literal tag or just as callback for strings, removes all spaces found
 * at the very first line of code encountered while sanitizing, keeping everything else around.
 * @param {string | TemplateStringsArray} tpl either code as string or as template, when used as tag
 * @param  {...any} values the template interpolations, when used as tag
 * @returns {string} code without undesired indentation
 */
const codedent = (tpl, ...values) => dedent\x241[typeof tpl](tpl, ...values);

// REQUIRES INTEGRATION TEST
/* c8 ignore start */
const io = new WeakMap();
const stdio = (init) => {
    const context = init || console;
    const localIO = {
        // allow plugins or other io manipulating logic to reuse
        // the buffered utility exposed in here (see py-editor)
        buffered,
        stderr: (context.stderr || console.error).bind(context),
        stdout: (context.stdout || console.log).bind(context),
    };
    return {
        stderr: (...args) => localIO.stderr(...args),
        stdout: (...args) => localIO.stdout(...args),
        async get(engine) {
            const interpreter = await engine;
            io.set(interpreter, localIO);
            return interpreter;
        },
    };
};

const decoder\x241 = new TextDecoder();
const buffered = (callback, EOL = 10) => {
    const buffer = [];
    return (maybeUI8) => {
        if (maybeUI8 instanceof Uint8Array) {
            for (const c of maybeUI8) {
                if (c === EOL)
                    callback(decoder\x241.decode(new Uint8Array(buffer.splice(0))));
                else
                    buffer.push(c);
            }
        }
        // if io.stderr(error) is passed instead
        // or any io.stdout("thing") this should
        // still work as expected
        else {
            callback(maybeUI8);
        }
    };
};
/* c8 ignore stop */

/** @type {(tpl: string | TemplateStringsArray, ...values:any[]) => string} */
const dedent = codedent;

const { isArray: isArray\x241 } = Array;

const { assign, create, defineProperty: defineProperty\x241, entries } = Object;

const { all, resolve: resolve\x241 } = new Proxy(Promise, {
    get: (\x24, name) => \x24[name].bind(\x24),
});

const absoluteURL = (path, base = location.href) =>
    new URL(path, base.replace(/^blob:/, '')).href;

function fixedRelative(path) {
    return path.startsWith('.') ? absoluteURL(path, this) : path;
}

/**
 * Notify the main thread about element "readiness".
 * @param {HTMLScriptElement | HTMLElement} target the script or custom-type element
 * @param {string} type the custom/type as event prefix
 * @param {string} what the kind of event to dispatch, i.e. \x60ready\x60 or \x60done\x60
 * @param {boolean} [worker = false] \x60true\x60 if dispatched form a worker, \x60false\x60 by default if in main
 * @param {globalThis.CustomEvent} [CustomEvent = globalThis.CustomEvent] the \x60CustomEvent\x60 to use
 */
const dispatch = (target, type, what, worker = false, CE = CustomEvent) => {
    target.dispatchEvent(
        new CE(\x60\x24{type}:\x24{what}\x60, {
            bubbles: true,
            detail: { worker },
        })
    );
};

const createFunction = value => Function(\x60'use strict';return (\x24{value})\x60)();

const createResolved = (module, type, config, interpreter) => ({
    type,
    config,
    interpreter,
    io: io.get(interpreter),
    run: (code, ...args) => module.run(interpreter, code, ...args),
    runAsync: (code, ...args) => module.runAsync(interpreter, code, ...args),
    runEvent: (...args) => module.runEvent(interpreter, ...args),
});

const dropLine0 = code => code.replace(/^(?:\x5cn|\x5cr\x5cn)/, '');

const createOverload = (module, name, before, after) => {
    const method = module[name].bind(module);
    module[name] = name === 'run' ?
        // patch the sync method
        (interpreter, code, ...args) => {
            if (before) method(interpreter, before, ...args);
            const result = method(interpreter, dropLine0(code), ...args);
            if (after) method(interpreter, after, ...args);
            return result;
        } :
        // patch the async one
        async (interpreter, code, ...args) => {
            if (before) await method(interpreter, before, ...args);
            const result = await method(interpreter, dropLine0(code), ...args);
            if (after) await method(interpreter, after, ...args);
            return result;
        };
};

const js_modules = Symbol.for('polyscript.js_modules');

const jsModules = new Map;
defineProperty\x241(globalThis, js_modules, { value: jsModules });

new Proxy(jsModules, {
    get: (map, name) => map.get(name),
    has: (map, name) => map.has(name),
    ownKeys: map => [...map.keys()],
});

const has\x241 = (_, field) => !field.startsWith('_');

const proxy\x241 = (modules, name) => new Proxy(
    modules,
    { has: has\x241, get: (modules, field) => modules[name][field] }
);

const registerJSModules = (type, module, interpreter, modules) => {
    // Pyodide resolves JS modules magically
    if (type === 'pyodide') return;

    // other runtimes need this pretty ugly dance (it works though)
    const jsModules = 'polyscript.js_modules';
    for (const name of Reflect.ownKeys(modules))
        module.registerJSModule(interpreter, \x60\x24{jsModules}.\x24{name}\x60, proxy\x241(modules, name));
    module.registerJSModule(interpreter, jsModules, modules);
};

const importJS = (source, name) => import(source).then(esm => {
    jsModules.set(name, { ...esm });
});

const importCSS = href => new Promise((onload, onerror) => {
    if (document.querySelector(\x60link[rel="stylesheet"][href="\x24{href}"]\x60)) {
        onload();
    }
    else {
        document.head.append(
            assign(
                document.createElement('link'),
                { rel: 'stylesheet', href, onload, onerror },
            )
        );
    }
});

const isCSS = source => /\x5c.css\x24/i.test(new URL(source).pathname);

const has = (modules, name) => modules.has(name);

const ownKeys\x241 = modules => [...modules.keys()];

const proxy = (modules, window, sync, baseURL) => new Proxy(modules, {
    has,
    ownKeys: ownKeys\x241,
    get: (modules, name) => {
        let value = modules.get(name);
        if (isArray\x241(value)) {
            let sources = value;
            value = null;
            for (let source of sources) {
                source = absoluteURL(source, baseURL);
                if (isCSS(source)) sync.importCSS(source);
                else {
                    sync.importJS(source, name);
                    value = window[js_modules].get(name);
                }
            }
            modules.set(name, value);
        }
        return value;
    },
});

var createJSModules = (window, sync, mainModules, baseURL) => {
    const modules = globalThis[js_modules];
    if (mainModules) {
        for (let [source, module] of entries(mainModules)) {
            let value = modules.get(module);
            if (!value || isArray\x241(value)) {
                modules.set(module, value || (value = []));
                value.push(source);
            }
        }
    }
    return proxy(modules, window, sync, baseURL);
};

const registry\x241 = new Map;

const type\x245 = 'dummy';

// REQUIRES INTEGRATION TEST
/* c8 ignore start */
const require = name => registry\x241.get(name);

const run\x242 = (interpreter, code) => {
    try {
        return Function('require', code)(require);
    }
    catch (error) {
        io.get(interpreter).stderr(error);
    }
};

var dummy = {
    type: type\x245,
    module: () => 'data:text/javascript,',
    engine: module => stdio().get(module),
    registerJSModule(_, name, value) {
        registry\x241.set(name, value);
    },
    run: run\x242,
    runAsync: run\x242,
    runEvent: async (interpreter, code, event) => {
        try {
            await Function('require', 'e', \x60return \x24{code}(e)\x60)(require, event);
        }
        catch (error) {
            io.get(interpreter).stderr(error);
        }
    },
    transform: (_, value) => value,
    writeFile() {},
};

// a bit terser code than I usually write but it's 10 LOC within 80 cols
// if you are struggling to follow the code you can replace 1-char
// references around with the following one, hoping that helps :-)

// d => descriptors
// k => key
// p => promise
// r => response

const d = Object.getOwnPropertyDescriptors(Response.prototype);

const isFunction = value => typeof value === 'function';

const bypass = (p, k, { get, value }) => get || !isFunction(value) ?
                p.then(r => r[k]) :
                (...args) => p.then(r => r[k](...args));

const direct = (p, value) => isFunction(value) ? value.bind(p) : value;

const handler = {
    get: (p, k) => d.hasOwnProperty(k) ? bypass(p, k, d[k]) : direct(p, p[k])
};

/**
 * @param {RequestInfo | URL} input
 * @param  {...RequestInit} init
 * @returns {Promise<Response> & Response}
 */
var fetch\x241 = (input, ...init) => new Proxy(fetch(input, ...init), handler);

const RUNNING_IN_WORKER = !globalThis.window;

// REQUIRES INTEGRATION TEST
/* c8 ignore start */

// This should be the only helper needed for all Emscripten based FS exports
const writeFile = ({ FS, PATH, PATH_FS }, path, buffer) => {
    const absPath = PATH_FS.resolve(path);
    const dirPath = PATH.dirname(absPath);
    if (FS.mkdirTree) FS.mkdirTree(dirPath);
    else mkdirTree(FS, dirPath);
    return FS.writeFile(absPath, new Uint8Array(buffer), {
        canOwn: true,
    });
};

// This is instead a fallback for Lua or others
const writeFileShim = (FS, path, buffer) => {
    mkdirTree(FS, dirname(path));
    path = resolve(FS, path);
    return FS.writeFile(path, new Uint8Array(buffer), { canOwn: true });
};

const dirname = (path) => {
    const tree = path.split('/');
    tree.pop();
    return tree.join('/');
};

const mkdirTree = (FS, path) => {
    const current = [];
    for (const branch of path.split('/')) {
        if (branch === '.' || branch === '..') continue;
        current.push(branch);
        if (branch) FS.mkdir(current.join('/'));
    }
};

const resolve = (FS, path) => {
    const tree = [];
    for (const branch of path.split('/')) {
        switch (branch) {
            case '':
                break;
            case '.':
                break;
            case '..':
                tree.pop();
                break;
            default:
                tree.push(branch);
        }
    }
    return [FS.cwd()].concat(tree).join('/').replace(/^\x5c/+/, '/');
};

const calculateFetchPaths = (config_fetch) => {
    for (const { files, to_file, from = '' } of config_fetch) {
        if (files !== undefined && to_file !== undefined)
            throw new Error(
                'Cannot use \x5c'to_file\x5c' and \x5c'files\x5c' parameters together!',
            );
        if (files === undefined && to_file === undefined && from.endsWith('/'))
            throw new Error(
                \x60Couldn't determine the filename from the path \x24{from}, please supply 'to_file' parameter.\x60,
            );
    }
    return config_fetch.flatMap(
        ({ from = '', to_folder = '.', to_file, files }) => {
            if (isArray\x241(files))
                return files.map((file) => ({
                    url: joinPaths([from, file]),
                    path: joinPaths([to_folder, file]),
                }));
            const filename = to_file || from.slice(1 + from.lastIndexOf('/'));
            return [{ url: from, path: joinPaths([to_folder, filename]) }];
        },
    );
};

const joinPaths = (parts) => {
    const res = parts
        .map((part) => part.trim().replace(/(^[/]*|[/]*\x24)/g, ''))
        .filter((p) => p !== '' && p !== '.')
        .join('/');

    return parts[0].startsWith('/') ? \x60/\x24{res}\x60 : res;
};

const fetchBuffer = (url, baseURL) =>
    fetch\x241(absoluteURL(url, baseURL)).arrayBuffer();

const fetchPaths = (module, interpreter, config_fetch, baseURL) =>
    all(
        calculateFetchPaths(config_fetch).map(({ url, path }) =>
            fetchBuffer(url, baseURL)
                .then((buffer) => module.writeFile(interpreter, path, buffer)),
        ),
    );

    const fillName = (source, dest) => dest.endsWith('/') ?
                        \x60\x24{dest}\x24{source.split('/').pop()}\x60 : dest;

const parseTemplate = (src, map) => src.replace(
  /\x5c{.+?\x5c}/g,
  k => {
    if (!map.has(k))
      throw new SyntaxError(\x60Invalid template: \x24{k}\x60);
    return map.get(k);
  }
);

const calculateFilesPaths = files => {
  const map = new Map;
  const targets = new Set;
  const sourceDest = [];
  for (const [source, dest] of entries(files)) {
    if (/^\x5c{.+\x5c}\x24/.test(source)) {
      if (map.has(source))
        throw new SyntaxError(\x60Duplicated template: \x24{source}\x60);
      map.set(source, parseTemplate(dest, map));
    }
    else {
      const url = parseTemplate(source, map);
      const path = fillName(url, parseTemplate(dest || './', map));
      if (targets.has(path) && !path.endsWith('/*'))
        throw new SyntaxError(\x60Duplicated destination: \x24{path}\x60);
      targets.add(path);
      sourceDest.push({ url, path });
    }
  }
  return sourceDest;
};

const fetchFiles = (module, interpreter, config_files, baseURL) =>
    all(
        calculateFilesPaths(config_files).map(({ url, path }) =>
            fetchBuffer(url, baseURL)
                .then((buffer) => module.writeFile(
                    interpreter,
                    path,
                    buffer,
                    url,
                )),
        ),
    );

const fetchJSModules = ({ main, worker }, baseURL) => {
    const promises = [];
    if (worker && RUNNING_IN_WORKER) {
        for (let [source, name] of entries(worker)) {
            source = absoluteURL(source, baseURL);
            promises.push(importJS(source, name));
        }
    }
    if (main && !RUNNING_IN_WORKER) {
        for (let [source, name] of entries(main)) {
            source = absoluteURL(source, baseURL);
            if (isCSS(source)) importCSS(source);
            else promises.push(importJS(source, name));
        }
    }
    return all(promises);
};

const createProgress = prefix => detail => {
    dispatchEvent(new CustomEvent(\x60\x24{prefix}:progress\x60, { detail }));
};
/* c8 ignore stop */

let i\x241 = 0;

const FALSE = i\x241++;
const TRUE = i\x241++;

const UNDEFINED = i\x241++;
const NULL = i\x241++;

const NUMBER = i\x241++;
const UI8 = i\x241++;
const NAN = i\x241++;
const INFINITY = i\x241++;
const N_INFINITY = i\x241++;
const ZERO = i\x241++;
const N_ZERO = i\x241++;

const BIGINT = i\x241++;
const BIGUINT = i\x241++;

const STRING = i\x241++;

const SYMBOL = i\x241++;

const ARRAY = i\x241++;
const BUFFER = i\x241++;
const DATE = i\x241++;
const ERROR = i\x241++;
const MAP = i\x241++;
const OBJECT = i\x241++;
const REGEXP = i\x241++;
const SET = i\x241++;
const VIEW = i\x241++;

const RECURSION = i\x241++;

const decoder = new TextDecoder;

const encoder = new TextEncoder;

/** @type {Map<symbol, string>} */
const symbols = new Map(
  Reflect.ownKeys(Symbol).map(
    key => [Symbol[key], \x60@\x24{String(key)}\x60]
  )
);

/**
 * @param {symbol} value
 * @param {string} description
 * @returns {string}
 */
const asSymbol = (value, description) => (
  description === void 0 ? '?' :
  (Symbol.keyFor(value) === void 0 ? \x60!\x24{description}\x60 : \x60#\x24{description}\x60)
);

/**
 * Extract the value from a pair of type and value.
 * @param {string} name
 * @returns {symbol}
 */
const fromSymbol = name => {
  switch (name[0]) {
    case '@': return Symbol[name.slice(1)];
    case '#': return Symbol.for(name.slice(1));
    case '!': return Symbol(name.slice(1));
    default: return Symbol();
  }
};

/**
 * Create the name of a symbol.
 * @param {symbol} value
 * @returns {string}
 */
const toSymbol = value => symbols.get(value) || asSymbol(value, value.description);

const defineProperty = Object.defineProperty;

const isArray = Array.isArray;

const isView = ArrayBuffer.isView;

const MAX_ARGS = 0x7FFF;

/**
 * @param {number[]} output
 * @param {Uint8Array} value 
 */
const push = (output, value) => {
  for (let \x24 = output.push, i = 0, length = value.length; i < length; i += MAX_ARGS)
    \x24.apply(output, value.subarray(i, i + MAX_ARGS));
};

const buffer = new ArrayBuffer(8);
const dv = new DataView(buffer);
const u8a8 = new Uint8Array(buffer);

//@ts-check


/** @typedef {Map<number, any>} Cache */

/**
 * @param {Cache} cache
 * @param {number} index
 * @param {any} value
 * @returns {any}
 */
const \x24 = (cache, index, value) => {
  cache.set(index, value);
  return value;
};

/**
 * @param {Uint8Array} input
 */
const number = input => {
  u8a8[0] = input[i++];
  u8a8[1] = input[i++];
  u8a8[2] = input[i++];
  u8a8[3] = input[i++];
  u8a8[4] = input[i++];
  u8a8[5] = input[i++];
  u8a8[6] = input[i++];
  u8a8[7] = input[i++];
};

/**
 * @param {Uint8Array} input
 * @returns {number}
 */
const size = input => {
  u8a8[0] = input[i++];
  u8a8[1] = input[i++];
  u8a8[2] = input[i++];
  u8a8[3] = input[i++];
  return dv.getUint32(0, true);
};

/**
 * @param {Uint8Array} input
 * @param {Cache} cache
 * @returns {any}
 */
const deflate = (input, cache) => {
  switch (input[i++]) {
    case NUMBER: {
      number(input);
      return dv.getFloat64(0, true);
    }
    case UI8: return input[i++];
    case OBJECT: {
      const object = \x24(cache, i - 1, {});
      for (let j = 0, length = size(input); j < length; j++)
        object[deflate(input, cache)] = deflate(input, cache);
      return object;
    }
    case ARRAY: {
      const array = \x24(cache, i - 1, []);
      for (let j = 0, length = size(input); j < length; j++)
        array.push(deflate(input, cache));
      return array;
    }
    case VIEW: {
      const index = i - 1;
      const name = deflate(input, cache);
      return \x24(cache, index, new globalThis[name](deflate(input, cache)));
    }
    case BUFFER: {
      const index = i - 1;
      const length = size(input);
      return \x24(cache, index, input.slice(i, i += length).buffer);
    }
    case STRING: {
      const index = i - 1;
      const length = size(input);
      // this could be a subarray but it's not supported on the Web and
      // it wouldn't work with arrays instead of typed arrays.
      return \x24(cache, index, decoder.decode(input.slice(i, i += length)));
    }
    case DATE: {
      return \x24(cache, i - 1, new Date(deflate(input, cache)));
    }
    case MAP: {
      const map = \x24(cache, i - 1, new Map);
      for (let j = 0, length = size(input); j < length; j++)
        map.set(deflate(input, cache), deflate(input, cache));
      return map;
    }
    case SET: {
      const set = \x24(cache, i - 1, new Set);
      for (let j = 0, length = size(input); j < length; j++)
        set.add(deflate(input, cache));
      return set;
    }
    case ERROR: {
      const name = deflate(input, cache);
      const message = deflate(input, cache);
      const stack = deflate(input, cache);
      const Class = globalThis[name] || Error;
      const error = new Class(message);
      return \x24(cache, i - 1, defineProperty(error, 'stack', { value: stack }));
    }
    case REGEXP: {
      const source = deflate(input, cache);
      const flags = deflate(input, cache);
      return \x24(cache, i - 1, new RegExp(source, flags));
    }
    case FALSE: return false;
    case TRUE: return true;
    case NAN: return NaN;
    case INFINITY: return Infinity;
    case N_INFINITY: return -Infinity;
    case ZERO: return 0;
    case N_ZERO: return -0;
    case NULL: return null;
    case BIGINT: return (number(input), dv.getBigInt64(0, true));
    case BIGUINT: return (number(input), dv.getBigUint64(0, true));
    case SYMBOL: return fromSymbol(deflate(input, cache));
    case RECURSION: return cache.get(size(input));
    // this covers functions too
    default: return undefined;
  }
};

let i = 0;

/**
 * @param {Uint8Array} value
 * @returns {any}
 */
const decode = value => {
  i = 0;
  return deflate(value, new Map);
};

const { getPrototypeOf } = Object;
const { construct } = Reflect;
const { toStringTag } = Symbol;

const toTag = (ref, name = ref[toStringTag]) =>
  name in globalThis ? name : toTag(construct(getPrototypeOf(ref.constructor),[0]));

//@ts-check


/** @typedef {Map<number, number[]>} Cache */

const { isNaN, isFinite, isInteger } = Number;
const { ownKeys } = Reflect;
const { is } = Object;

/**
 * @param {any} input
 * @param {number[]|Stack} output
 * @param {Cache} cache
 * @returns {boolean}
 */
const process = (input, output, cache) => {
  const value = cache.get(input);
  const unknown = !value;
  if (unknown) {
    dv.setUint32(0, output.length, true);
    cache.set(input, [u8a8[0], u8a8[1], u8a8[2], u8a8[3]]);
  }
  else
    output.push(RECURSION, value[0], value[1], value[2], value[3]);
  return unknown;
};

/**
 * @param {number[]|Stack} output
 * @param {number} type
 * @param {number} length
 */
const set = (output, type, length) => {
  dv.setUint32(0, length, true);
  output.push(type, u8a8[0], u8a8[1], u8a8[2], u8a8[3]);
};

/**
 * @param {any} input
 * @param {number[]|Stack} output
 * @param {Cache} cache
 */
const inflate = (input, output, cache) => {
  switch (typeof input) {
    case 'number': {
      if (input && isFinite(input)) {
        if (isInteger(input) && input < 256 && -1 < input)
          output.push(UI8, input);
        else {
          dv.setFloat64(0, input, true);
          output.push(NUMBER, u8a8[0], u8a8[1], u8a8[2], u8a8[3], u8a8[4], u8a8[5], u8a8[6], u8a8[7]);
        }
      }
      else if (isNaN(input)) output.push(NAN);
      else if (!input) output.push(is(input, 0) ? ZERO : N_ZERO);
      else output.push(input < 0 ? N_INFINITY : INFINITY);
      break;
    }
    case 'object': {
      switch (true) {
        case input === null:
          output.push(NULL);
          break;
        case !process(input, output, cache): break;
        case isArray(input): {
          const length = input.length;
          set(output, ARRAY, length);
          for (let i = 0; i < length; i++)
            inflate(input[i], output, cache);
          break;
        }
        case isView(input): {
          output.push(VIEW);
          inflate(toTag(input), output, cache);
          input = input.buffer;
          if (!process(input, output, cache)) break;
          // fallthrough
        }
        case input instanceof ArrayBuffer: {
          const ui8a = new Uint8Array(input);
          set(output, BUFFER, ui8a.length);
          //@ts-ignore
          pushView(output, ui8a);
          break;
        }
        case input instanceof Date:
          output.push(DATE);
          inflate(input.getTime(), output, cache);
          break;
        case input instanceof Map: {
          set(output, MAP, input.size);
          for (const [key, value] of input) {
            inflate(key, output, cache);
            inflate(value, output, cache);
          }
          break;
        }
        case input instanceof Set: {
          set(output, SET, input.size);
          for (const value of input)
            inflate(value, output, cache);
          break;
        }
        case input instanceof Error:
          output.push(ERROR);
          inflate(input.name, output, cache);
          inflate(input.message, output, cache);
          inflate(input.stack, output, cache);
          break;
        case input instanceof RegExp:
          output.push(REGEXP);
          inflate(input.source, output, cache);
          inflate(input.flags, output, cache);
          break;
        default: {
          if ('toJSON' in input) {
            const json = input.toJSON();
            inflate(json === input ? null : json, output, cache);
          }
          else {
            const keys = ownKeys(input);
            const length = keys.length;
            set(output, OBJECT, length);
            for (let i = 0; i < length; i++) {
              const key = keys[i];
              inflate(key, output, cache);
              inflate(input[key], output, cache);
            }
          }
          break;
        }
      }
      break;
    }
    case 'string': {
      if (process(input, output, cache)) {
        const encoded = encoder.encode(input);
        set(output, STRING, encoded.length);
        //@ts-ignore
        pushView(output, encoded);
      }
      break;
    }
    case 'boolean': {
      output.push(input ? TRUE : FALSE);
      break;
    }
    case 'symbol': {
      output.push(SYMBOL);
      inflate(toSymbol(input), output, cache);
      break;
    }
    case 'bigint': {
      let type = BIGINT;
      if (9223372036854775807n < input) {
        dv.setBigUint64(0, input, true);
        type = BIGUINT;
      }
      else dv.setBigInt64(0, input, true);
      output.push(type, u8a8[0], u8a8[1], u8a8[2], u8a8[3], u8a8[4], u8a8[5], u8a8[6], u8a8[7]);
      break;
    }
    // this covers functions too
    default: {
      output.push(UNDEFINED);
      break;
    }
  }
};

/** @type {typeof push|typeof Stack.push} */
let pushView = push;

/**
 * @param {any} value
 * @returns {number[]}
 */
const encode = value => {
  const output = [];
  pushView = push;
  inflate(value, output, new Map);
  return output;
};

const JSON\x241 = { parse: decode, stringify: encode };

const loader = new WeakMap();

// REQUIRES INTEGRATION TEST
/* c8 ignore start */
const loadProgress = async (self, progress, interpreter, config, baseURL) => {
    if (config.files) {
        progress('Loading files');
        await fetchFiles(self, interpreter, config.files, baseURL);
        progress('Loaded files');
    }
    if (config.fetch) {
        progress('Loading fetch');
        await fetchPaths(self, interpreter, config.fetch, baseURL);
        progress('Loaded fetch');
    }
    if (config.js_modules) {
        progress('Loading JS modules');
        await fetchJSModules(config.js_modules, baseURL);
        progress('Loaded JS modules');
    }
};

const registerJSModule = (interpreter, name, value) => {
    if (name === 'polyscript') {
        value.lazy_py_modules = async (...packages) => {
            await loader.get(interpreter)(packages);
            return packages.map(name => interpreter.pyimport(name));
        };
        value.storage = async (name) => {
            const storage = new IDBMapSync(name);
            await storage.sync();
            return storage;
        };
        value.JSON = JSON\x241;
    }
    interpreter.registerJsModule(name, value);
};

const getFormat = (path, url) => {
    if (path.endsWith('/*')) {
        if (/\x5c.(zip|whl|tgz|tar(?:\x5c.gz)?)\x24/.test(url))
            return RegExp.\x241;
        throw new Error(\x60Unsupported archive \x24{url}\x60);
    }
    return '';
};

const run\x241 = (interpreter, code, ...args) => {
    try {
        return interpreter.runPython(dedent(code), ...args);
    }
    catch (error) {
        io.get(interpreter).stderr(error);
    }
};

const runAsync = async (interpreter, code, ...args) => {
    try {
        return await interpreter.runPythonAsync(dedent(code), ...args);
    }
    catch (error) {
        io.get(interpreter).stderr(error);
    }
};

const runEvent\x241 = async (interpreter, code, event) => {
    // allows method(event) as well as namespace.method(event)
    // it does not allow fancy brackets names for now
    const [name, ...keys] = code.split('.');
    let target = interpreter.globals.get(name);
    let context;
    for (const key of keys) [context, target] = [target, target[key]];
    try {
        await target.call(context, event);
    }
    catch (error) {
        io.get(interpreter).stderr(error);
    }
};
/* c8 ignore stop */

// ⚠️ DO NOT MODIFY - SOURCE FILE: "../../python/mip.py"
var mip = new TextEncoder().encode("_F='github:'\x5cn_E='user-agent'\x5cn_D=True\x5cn_C=False\x5cn_B='/'\x5cn_A=None\x5cnfrom uio import StringIO\x5cnimport sys\x5cnclass Response:\x5cn\x5ctdef __init__(A,f):A.raw=f;A.encoding='utf-8';A._cached=_A\x5cn\x5ctdef close(A):\x5cn\x5ct\x5ctif A.raw:A.raw.close();A.raw=_A\x5cn\x5ct\x5ctA._cached=_A\x5cn\x5ct@property\x5cn\x5ctdef content(self):\x5cn\x5ct\x5ctA=self\x5cn\x5ct\x5ctif A._cached is _A:\x5cn\x5ct\x5ct\x5cttry:A._cached=A.raw.read()\x5cn\x5ct\x5ct\x5ctfinally:A.raw.close();A.raw=_A\x5cn\x5ct\x5ctreturn A._cached\x5cn\x5ct@property\x5cn\x5ctdef text(self):return str(self.content,self.encoding)\x5cn\x5ctdef json(A):import ujson;return ujson.loads(A.content)\x5cnHEADERS_TO_IGNORE=_E,\x5cntry:import js\x5cnexcept Exception as err:raise OSError('This version of urequests can only be used in the browser')\x5cnHEADERS_TO_IGNORE=_E,\x5cndef request(method,url,data=_A,json=_A,headers={},stream=_A,auth=_A,timeout=_A,parse_headers=_D):\x5cn\x5ctE=timeout;D=method;C=data;from js import XMLHttpRequest as G;A=G.new();A.withCredentials=_C\x5cn\x5ctif auth is not _A:import ubinascii;H,I=auth;A.open(D,url,_C,H,I)\x5cn\x5ctelse:A.open(D,url,_C)\x5cn\x5ctfor(F,J)in headers.items():\x5cn\x5ct\x5ctif F.lower()not in HEADERS_TO_IGNORE:A.setRequestHeader(F,J)\x5cn\x5ctif E:A.timeout=int(E*1000)\x5cn\x5ctif json is not _A:assert C is _A;import ujson;C=ujson.dumps(json);A.setRequestHeader('Content-Type','application/json')\x5cn\x5ctA.send(C);B=Response(StringIO(A.responseText));B.status_code=A.status;B.reason=A.statusText;B.headers=A.getAllResponseHeaders();return B\x5cndef get(url,**A):return request('GET',url,**A)\x5cn_PACKAGE_INDEX=const('https://micropython.org/pi/v2')\x5cn_CHUNK_SIZE=128\x5cndef _ensure_path_exists(path):\x5cn\x5ctimport os;A=path.split(_B)\x5cn\x5ctif not A[0]:A.pop(0);A[0]=_B+A[0]\x5cn\x5ctB=''\x5cn\x5ctfor C in range(len(A)-1):\x5cn\x5ct\x5ctB+=A[C]\x5cn\x5ct\x5cttry:os.stat(B)\x5cn\x5ct\x5ctexcept:os.mkdir(B)\x5cn\x5ct\x5ctB+=_B\x5cndef _chunk(src,dest):\x5cn\x5ctA=memoryview(bytearray(_CHUNK_SIZE))\x5cn\x5ctwhile _D:\x5cn\x5ct\x5ctB=src.readinto(A)\x5cn\x5ct\x5ctif B==0:break\x5cn\x5ct\x5ctdest(A if B==_CHUNK_SIZE else A[:B])\x5cndef _check_exists(path,short_hash):\x5cn\x5ctA=short_hash;import os\x5cn\x5cttry:\x5cn\x5ct\x5ctimport binascii as C,hashlib as D\x5cn\x5ct\x5ctwith open(path,'rb')as E:B=D.sha256();_chunk(E,B.update);F=str(C.hexlify(B.digest())[:len(A)],'utf-8');return F==A\x5cn\x5ctexcept:return _C\x5cndef _rewrite_url(url,branch=_A):\x5cn\x5ctB=branch;A=url\x5cn\x5ctif not B:B='HEAD'\x5cn\x5ctif A.startswith(_F):A=A[7:].split(_B);A='https://raw.githubusercontent.com/'+A[0]+_B+A[1]+_B+B+_B+_B.join(A[2:])\x5cn\x5ctreturn A\x5cndef _download_file(url,dest):\x5cn\x5ctB=dest;A=get(url)\x5cn\x5cttry:\x5cn\x5ct\x5ctif A.status_code!=200:print('Error',A.status_code,'requesting',url);return _C\x5cn\x5ct\x5ctprint('Copying:',B);_ensure_path_exists(B)\x5cn\x5ct\x5ctwith open(B,'wb')as C:_chunk(A.raw,C.write)\x5cn\x5ct\x5ctreturn _D\x5cn\x5ctfinally:A.close()\x5cndef _install_json(package_json_url,index,target,version,mpy):\x5cn\x5ctK='File not found: {} {}';I=version;H=index;G=package_json_url;D=target;E=get(_rewrite_url(G,I))\x5cn\x5cttry:\x5cn\x5ct\x5ctif E.status_code!=200:print('Package not found:',G);return _C\x5cn\x5ct\x5ctF=E.json()\x5cn\x5ctfinally:E.close()\x5cn\x5ctfor(A,C)in F.get('hashes',()):\x5cn\x5ct\x5ctB=D+_B+A\x5cn\x5ct\x5ctif _check_exists(B,C):print('Exists:',B)\x5cn\x5ct\x5ctelse:\x5cn\x5ct\x5ct\x5ctL='{}/file/{}/{}'.format(H,C[:2],C)\x5cn\x5ct\x5ct\x5ctif not _download_file(L,B):print(K.format(A,C));return _C\x5cn\x5ctfor(A,J)in F.get('urls',()):\x5cn\x5ct\x5ctB=D+_B+A\x5cn\x5ct\x5ctif not _download_file(_rewrite_url(J,I),B):print(K.format(A,J));return _C\x5cn\x5ctfor(M,N)in F.get('deps',()):\x5cn\x5ct\x5ctif not _install_package(M,H,D,N,mpy):return _C\x5cn\x5ctreturn _D\x5cndef _install_package(package,index,target,version,mpy):\x5cn\x5ctD=index;C=target;B=version;A=package\x5cn\x5ctif A.startswith('http://')or A.startswith('https://')or A.startswith(_F):\x5cn\x5ct\x5ctif A.endswith('.py')or A.endswith('.mpy'):print('Downloading {} to {}'.format(A,C));return _download_file(_rewrite_url(A,B),C+_B+A.rsplit(_B)[-1])\x5cn\x5ct\x5ctelse:\x5cn\x5ct\x5ct\x5ctif not A.endswith('.json'):\x5cn\x5ct\x5ct\x5ct\x5ctif not A.endswith(_B):A+=_B\x5cn\x5ct\x5ct\x5ct\x5ctA+='package.json'\x5cn\x5ct\x5ct\x5ctprint('Installing {} to {}'.format(A,C))\x5cn\x5ctelse:\x5cn\x5ct\x5ctif not B:B='latest'\x5cn\x5ct\x5ctprint('Installing {} ({}) from {} to {}'.format(A,B,D,C));E=sys.implementation._mpy&255 if mpy and hasattr(sys.implementation,'_mpy')else'py';A='{}/package/{}/{}/{}.json'.format(D,'py',A,B)\x5cn\x5ctreturn _install_json(A,D,C,B,mpy)\x5cndef install(package,index=_A,target=_A,version=_A,mpy=_D):\x5cn\x5ctB=target;A=index\x5cn\x5ctif not B:\x5cn\x5ct\x5ctfor C in sys.path:\x5cn\x5ct\x5ct\x5ctif C.endswith('/lib'):B=C;break\x5cn\x5ct\x5ctelse:print('Unable to find lib dir in sys.path');return\x5cn\x5ctif not A:A=_PACKAGE_INDEX\x5cn\x5ctif _install_package(package,A.rstrip(_B),B,version,mpy):print('Done')\x5cn\x5ctelse:print('Package may be partially installed')");

/* c8 ignore start */

// toml
const toml = async (text) => (
  await import(/* webpackIgnore: true */'./toml-CkEFU7ly.js')
).parse(text);

// zip
const zip = () => import(/* webpackIgnore: true */'./zip-CAMAhqMX.js');

/* c8 ignore stop */

async function syncfs(FS, direction) {
    return new Promise((resolve, reject) => {
        FS.syncfs(direction, err => {
            if (err) reject(err);
            else resolve();
        });
    });
}

// (C) Pyodide  https://github.com/pyodide/pyodide - Mozilla Public License Version 2.0
// JS port of https://github.com/pyodide/pyodide/blob/34fcd02172895d75db369994011409324f9e3cce/src/js/nativefs.ts
function initializeNativeFS(module) {
    const FS = module.FS;
    const MEMFS = module.FS.filesystems.MEMFS;
    const PATH = module.PATH;

    const nativeFSAsync = {
        // DIR_MODE: {{{ cDefine('S_IFDIR') }}} | 511 /* 0777 */,
        // FILE_MODE: {{{ cDefine('S_IFREG') }}} | 511 /* 0777 */,
        DIR_MODE: 16384 | 511,
        FILE_MODE: 32768 | 511,
        mount: function (mount) {
            if (!mount.opts.fileSystemHandle) {
                throw new Error('opts.fileSystemHandle is required');
            }

            // reuse all of the core MEMFS functionality
            return MEMFS.mount.apply(null, arguments);
        },
        syncfs: async (mount, populate, callback) => {
            try {
                const local = nativeFSAsync.getLocalSet(mount);
                const remote = await nativeFSAsync.getRemoteSet(mount);
                const src = populate ? remote : local;
                const dst = populate ? local : remote;
                await nativeFSAsync.reconcile(mount, src, dst);
                callback(null);
            } catch (e) {
                callback(e);
            }
        },
        // Returns file set of emscripten's filesystem at the mountpoint.
        getLocalSet: (mount) => {
            let entries = Object.create(null);

            function isRealDir(p) {
                return p !== '.' && p !== '..';
            }

            function toAbsolute(root) {
                return (p) => {
                    return PATH.join2(root, p);
                };
            }

            let check = FS.readdir(mount.mountpoint)
                .filter(isRealDir)
                .map(toAbsolute(mount.mountpoint));

            while (check.length) {
                let path = check.pop();
                let stat = FS.stat(path);

                if (FS.isDir(stat.mode)) {
                    check.push.apply(
                        check,
                        FS.readdir(path).filter(isRealDir).map(toAbsolute(path)),
                    );
                }

                entries[path] = { timestamp: stat.mtime, mode: stat.mode };
            }

            return { type: 'local', entries: entries };
        },
        // Returns file set of the real, on-disk filesystem at the mountpoint.
        getRemoteSet: async (mount) => {
            // TODO: this should be a map.
            const entries = Object.create(null);

            const handles = await getFsHandles(mount.opts.fileSystemHandle);
            for (const [path, handle] of handles) {
                if (path === '.') continue;

                entries[PATH.join2(mount.mountpoint, path)] = {
                    timestamp:
                        handle.kind === 'file'
                            ? (await handle.getFile()).lastModifiedDate
                            : new Date(),
                    mode:
                        handle.kind === 'file'
                            ? nativeFSAsync.FILE_MODE
                            : nativeFSAsync.DIR_MODE,
                };
            }

            return { type: 'remote', entries, handles };
        },
        loadLocalEntry: (path) => {
            const lookup = FS.lookupPath(path);
            const node = lookup.node;
            const stat = FS.stat(path);

            if (FS.isDir(stat.mode)) {
                return { timestamp: stat.mtime, mode: stat.mode };
            } else if (FS.isFile(stat.mode)) {
                node.contents = MEMFS.getFileDataAsTypedArray(node);
                return {
                    timestamp: stat.mtime,
                    mode: stat.mode,
                    contents: node.contents,
                };
            } else {
                throw new Error('node type not supported');
            }
        },
        storeLocalEntry: (path, entry) => {
            if (FS.isDir(entry['mode'])) {
                FS.mkdirTree(path, entry['mode']);
            } else if (FS.isFile(entry['mode'])) {
                FS.writeFile(path, entry['contents'], { canOwn: true });
            } else {
                throw new Error('node type not supported');
            }

            FS.chmod(path, entry['mode']);
            FS.utime(path, entry['timestamp'], entry['timestamp']);
        },
        removeLocalEntry: (path) => {
            var stat = FS.stat(path);

            if (FS.isDir(stat.mode)) {
                FS.rmdir(path);
            } else if (FS.isFile(stat.mode)) {
                FS.unlink(path);
            }
        },
        loadRemoteEntry: async (handle) => {
            if (handle.kind === 'file') {
                const file = await handle.getFile();
                return {
                    contents: new Uint8Array(await file.arrayBuffer()),
                    mode: nativeFSAsync.FILE_MODE,
                    timestamp: file.lastModifiedDate,
                };
            } else if (handle.kind === 'directory') {
                return {
                    mode: nativeFSAsync.DIR_MODE,
                    timestamp: new Date(),
                };
            } else {
                throw new Error('unknown kind: ' + handle.kind);
            }
        },
        storeRemoteEntry: async (handles, path, entry) => {
            const parentDirHandle = handles.get(PATH.dirname(path));
            const handle = FS.isFile(entry.mode)
                ? await parentDirHandle.getFileHandle(PATH.basename(path), {
                    create: true,
                })
                : await parentDirHandle.getDirectoryHandle(PATH.basename(path), {
                    create: true,
                });
            if (handle.kind === 'file') {
                const writable = await handle.createWritable();
                await writable.write(entry.contents);
                await writable.close();
            }
            handles.set(path, handle);
        },
        removeRemoteEntry: async (handles, path) => {
            const parentDirHandle = handles.get(PATH.dirname(path));
            await parentDirHandle.removeEntry(PATH.basename(path));
            handles.delete(path);
        },
        reconcile: async (mount, src, dst) => {
            let total = 0;

            const create = [];
            Object.keys(src.entries).forEach(function (key) {
                const e = src.entries[key];
                const e2 = dst.entries[key];
                if (
                    !e2 ||
                    (FS.isFile(e.mode) &&
                        e['timestamp'].getTime() > e2['timestamp'].getTime())
                ) {
                    create.push(key);
                    total++;
                }
            });
            // sort paths in ascending order so directory entries are created
            // before the files inside them
            create.sort();

            const remove = [];
            Object.keys(dst.entries).forEach(function (key) {
                if (!src.entries[key]) {
                    remove.push(key);
                    total++;
                }
            });
            // sort paths in descending order so files are deleted before their
            // parent directories
            remove.sort().reverse();

            if (!total) {
                return;
            }

            const handles = src.type === 'remote' ? src.handles : dst.handles;

            for (const path of create) {
                const relPath = PATH.normalize(
                    path.replace(mount.mountpoint, '/'),
                ).substring(1);
                if (dst.type === 'local') {
                    const handle = handles.get(relPath);
                    const entry = await nativeFSAsync.loadRemoteEntry(handle);
                    nativeFSAsync.storeLocalEntry(path, entry);
                } else {
                    const entry = nativeFSAsync.loadLocalEntry(path);
                    await nativeFSAsync.storeRemoteEntry(handles, relPath, entry);
                }
            }

            for (const path of remove) {
                if (dst.type === 'local') {
                    nativeFSAsync.removeLocalEntry(path);
                } else {
                    const relPath = PATH.normalize(
                        path.replace(mount.mountpoint, '/'),
                    ).substring(1);
                    await nativeFSAsync.removeRemoteEntry(handles, relPath);
                }
            }
        },
    };

    module.FS.filesystems.NATIVEFS_ASYNC = nativeFSAsync;

    function ensureMountPathExists(path) {
        if (FS.mkdirTree) FS.mkdirTree(path);
        else mkdirTree(FS, path);

        const { node } = FS.lookupPath(path, {
            follow_mount: false,
        });

        if (FS.isMountpoint(node)) {
            throw new Error(\x60path '\x24{path}' is already a file system mount point\x60);
        }
        if (!FS.isDir(node.mode)) {
            throw new Error(\x60path '\x24{path}' points to a file not a directory\x60);
        }
        // eslint-disable-next-line
        for (const _ in node.contents) {
            throw new Error(\x60directory '\x24{path}' is not empty\x60);
        }
    }

    return async function mountNativeFS(path, fileSystemHandle) {
        if (fileSystemHandle.constructor.name !== 'FileSystemDirectoryHandle') {
            throw new TypeError(
              'Expected argument \x5c'fileSystemHandle\x5c' to be a FileSystemDirectoryHandle',
            );
        }
        ensureMountPathExists(path);
      
        FS.mount(
            FS.filesystems.NATIVEFS_ASYNC,
            { fileSystemHandle },
            path,
        );

        // sync native ==> browser
        await syncfs(FS, true);

        return {
            // sync browser ==> native
            syncfs: async () => await syncfs(FS, false),
        };
    };
}

const getFsHandles = async (dirHandle) => {
    const handles = [];

    async function collect(curDirHandle) {
        for await (const entry of curDirHandle.values()) {
            handles.push(entry);
            if (entry.kind === 'directory') {
                await collect(entry);
            }
        }
    }

    await collect(dirHandle);

    const result = new Map();
    result.set('.', dirHandle);
    for (const handle of handles) {
        const relativePath = (await dirHandle.resolve(handle)).join('/');
        result.set(relativePath, handle);
    }
    return result;
};

const type\x244 = 'micropython';

// REQUIRES INTEGRATION TEST
/* c8 ignore start */
const mkdir = (FS, path) => {
    try {
        FS.mkdir(path);
    }
    // eslint-disable-next-line no-unused-vars
    catch (_) {
        // ignore as there's no path.exists here
    }
};

const progress\x241 = createProgress('mpy');

var micropython = {
    type: type\x244,
    module: (version = '1.25.0') =>
        \x60https://cdn.jsdelivr.net/npm/@micropython/micropython-webassembly-pyscript@\x24{version}/micropython.mjs\x60,
    async engine({ loadMicroPython }, config, url, baseURL) {
        const { stderr, stdout, get } = stdio({
            stderr: buffered(console.error),
            stdout: buffered(console.log),
        });
        url = url.replace(/\x5c.m?js\x24/, '.wasm');
        progress\x241('Loading MicroPython');
        const interpreter = await get(loadMicroPython({ linebuffer: false, stderr, stdout, url }));
        const py_imports = importPackages\x241.bind(this, interpreter, baseURL);
        loader.set(interpreter, py_imports);
        await loadProgress(this, progress\x241, interpreter, config, baseURL);
        // Install Micropython Package
        this.writeFile(interpreter, './mip.py', mip);
        if (config.packages) {
            progress\x241('Loading packages');
            await py_imports(config.packages.map(fixedRelative, baseURL));
            progress\x241('Loaded packages');
        }
        progress\x241('Loaded MicroPython');
        if (!interpreter.mountNativeFS)
            interpreter.mountNativeFS = initializeNativeFS(interpreter._module);
        return interpreter;
    },
    registerJSModule,
    run: run\x241,
    runAsync,
    runEvent: runEvent\x241,
    transform: (interpreter, value) => interpreter.PyProxy.toJs(value),
    writeFile: (interpreter, path, buffer, url) => {
        const { FS, _module: { PATH, PATH_FS } } = interpreter;
        const fs = { FS, PATH, PATH_FS };
        const format = getFormat(path, url);
        if (format) {
            const extractDir = path.slice(0, -1);
            if (extractDir !== './') FS.mkdir(extractDir);
            switch (format) {
                case 'whl':
                case 'zip': {
                    const blob = new Blob([buffer], { type: 'application/zip' });
                    return zip().then(async ({ BlobReader, Uint8ArrayWriter, ZipReader }) => {
                        const zipFileReader = new BlobReader(blob);
                        const zipReader = new ZipReader(zipFileReader);
                        for (const entry of await zipReader.getEntries()) {
                            const { directory, filename } = entry;
                            const name = extractDir + filename;
                            if (directory) mkdir(FS, name);
                            else {
                                mkdir(FS, PATH.dirname(name));
                                const buffer = await entry.getData(new Uint8ArrayWriter);
                                FS.writeFile(name, buffer, {
                                    canOwn: true,
                                });
                            }
                        }
                        zipReader.close();
                    });
                }
                case 'tgz':
                case 'tar.gz': {
                    const TMP = './_.tar.gz';
                    writeFile(fs, TMP, buffer);
                    interpreter.runPython(\x60
                        import os, gzip, tarfile
                        tar = tarfile.TarFile(fileobj=gzip.GzipFile(fileobj=open("\x24{TMP}", "rb")))
                        for f in tar:
                            name = f"\x24{extractDir}{f.name}"
                            if f.type == tarfile.DIRTYPE:
                                if f.name != "./":
                                    os.mkdir(name.strip("/"))
                            else:
                                dir = os.path.dirname(name)
                                if not os.path.exists(dir):
                                    os.mkdir(dir)
                                source = tar.extractfile(f)
                                with open(name, "wb") as dest:
                                    dest.write(source.read())
                                    dest.close()
                        tar.close()
                        os.remove("\x24{TMP}")
                    \x60);
                    return;
                }
            }
        }
        return writeFile(fs, path, buffer);
    },
};

async function importPackages\x241(interpreter, baseURL, packages) {
    let mip;
    for (const mpyPackage of packages) {
        if (mpyPackage.endsWith('.whl')) {
            const url = absoluteURL(mpyPackage, baseURL);
            const buffer = await fetch\x241(url).arrayBuffer();
            await this.writeFile(interpreter, './*', buffer, url);
        }
        else {
            if (!mip) mip = interpreter.pyimport('mip');
            mip.install(mpyPackage);
        }
    }
}
/* c8 ignore stop */

const type\x243 = 'pyodide';
const toJsOptions = { dict_converter: Object.fromEntries };

const { stringify } = JSON;

const { apply } = Reflect;
const FunctionPrototype = Function.prototype;

// REQUIRES INTEGRATION TEST
/* c8 ignore start */
const overrideMethod = method => function (...args) {
    return apply(method, this, args);
};

let pyproxy, to_js;
const override = intercept => {

    const proxies = new WeakMap;

    const patch = args => {
        for (let arg, i = 0; i < args.length; i++) {
            switch (typeof(arg = args[i])) {
                case 'object':
                    if (arg === null) break;
                    // falls through
                case 'function': {
                    if (pyproxy in arg && !arg[pyproxy].shared?.gcRegistered) {
                        intercept = false;
                        let proxy = proxies.get(arg)?.deref();
                        if (!proxy) {
                            proxy = to_js(arg);
                            const wr = new WeakRef(proxy);
                            proxies.set(arg, wr);
                            proxies.set(proxy, wr);
                        }
                        args[i] = proxy;
                        intercept = true;
                    }
                    break;
                }
            }
        }
    };

    // the patch
    Object.defineProperties(FunctionPrototype, {
        apply: {
            value(context, args) {
                if (intercept) patch(args);
                return apply(this, context, args);
            }
        },
        call: {
            value(context, ...args) {
                if (intercept) patch(args);
                return apply(this, context, args);
            }
        }
    });
};

const progress = createProgress('py');
const indexURLs = new WeakMap();

var pyodide = {
    type: type\x243,
    module: (version = '0.27.7') =>
        \x60https://cdn.jsdelivr.net/pyodide/v\x24{version}/full/pyodide.mjs\x60,
    async engine({ loadPyodide }, config, url, baseURL) {
        progress('Loading Pyodide');
        let { packages, index_urls } = config;
        if (packages) packages = packages.map(fixedRelative, baseURL);
        progress('Loading Storage');
        const indexURL = url.slice(0, url.lastIndexOf('/'));
        // each pyodide version shares its own cache
        const storage = new IDBMapSync(indexURL);
        const options = { indexURL };
        const save = config.packages_cache !== 'never';
        await storage.sync();
        // packages_cache = 'never' means: erase the whole DB
        if (!save) storage.clear();
        // otherwise check if cache is known
        else if (packages) {
            packages = packages.sort();
            // packages are uniquely stored as JSON key
            const key = stringify(packages);
            if (storage.has(key)) {
                const blob = new Blob(
                    [storage.get(key)],
                    { type: 'application/json' },
                );
                // this should be used to bootstrap loadPyodide
                options.lockFileURL = URL.createObjectURL(blob);
                // versions are not currently understood by pyodide when
                // a lockFileURL is used instead of micropip.install(packages)
                // https://github.com/pyodide/pyodide/issues/5135#issuecomment-2441038644
                // https://github.com/pyscript/pyscript/issues/2245
                options.packages = packages.map(name => name.split(/[>=<]=/)[0]);
                packages = null;
            }
        }
        progress('Loaded Storage');
        const { stderr, stdout, get } = stdio();
        const interpreter = await get(
            loadPyodide({ stderr, stdout, ...options }),
        );
        if (config.debug) interpreter.setDebug(true);
        const py_imports = importPackages.bind(interpreter);
        if (index_urls) indexURLs.set(interpreter, index_urls);
        loader.set(interpreter, py_imports);
        await loadProgress(this, progress, interpreter, config, baseURL);
        // if cache wasn't know, import and freeze it for the next time
        if (packages) await py_imports(packages, storage, save);
        await storage.close();
        if (options.lockFileURL) URL.revokeObjectURL(options.lockFileURL);
        progress('Loaded Pyodide');
        if (config.experimental_create_proxy === 'auto') {
            interpreter.runPython([
                'import js',
                'from pyodide.ffi import to_js',
                'o=js.Object.fromEntries',
                'js.experimental_create_proxy=lambda r:to_js(r,dict_converter=o)'
            ].join(';'), { globals: interpreter.toPy({}) });
            to_js = globalThis.experimental_create_proxy;
            delete globalThis.experimental_create_proxy;
            [pyproxy] = Reflect.ownKeys(to_js).filter(
                k => (
                    typeof k === 'symbol' &&
                    String(k) === 'Symbol(pyproxy.attrs)'
                )
            );
            override(true);
        }
        return interpreter;
    },
    registerJSModule,
    run: overrideMethod(run\x241),
    runAsync: overrideMethod(runAsync),
    runEvent: overrideMethod(runEvent\x241),
    transform: (interpreter, value) => apply(transform\x241, interpreter, [value]),
    writeFile: (interpreter, path, buffer, url) => {
        const format = getFormat(path, url);
        if (format) {
            return interpreter.unpackArchive(buffer, format, {
                extractDir: path.slice(0, -1)
            });
        }
        const { FS, PATH, _module: { PATH_FS } } = interpreter;
        return writeFile({ FS, PATH, PATH_FS }, path, buffer);
    },
};

function transform\x241(value) {
    const { ffi: { PyProxy } } = this;
    if (value && typeof value === 'object') {
        if (value instanceof PyProxy) return value.toJs(toJsOptions);
        // I believe this case is for LiteralMap which is not a PyProxy
        // and yet it needs to be re-converted to something useful.
        if (value instanceof Map) return new Map([...value.entries()]);
        if (isArray\x241(value)) return value.map(transform\x241, this);
    }
    return value;
}

// exposed utility to import packages via polyscript.lazy_py_modules
async function importPackages(packages, storage, save = false) {
    // temporary patch/fix console.log which is used
    // not only by Pyodide but by micropip too and there's
    // no way to intercept those calls otherwise
    const { log } = console;
    const _log = (detail, ...rest) => {
        log(detail, ...rest);
        console.log = log;
        progress(detail);
        console.log = _log;
    };
    console.log = _log;
    await this.loadPackage('micropip');
    const micropip = this.pyimport('micropip');
    if (indexURLs.has(this)) micropip.set_index_urls(indexURLs.get(this));
    await micropip.install(packages, { keep_going: true });
    console.log = log;
    if (save && (storage instanceof IDBMapSync)) {
        const frozen = micropip.freeze();
        storage.set(stringify(packages), frozen);
    }
    micropip.destroy();
}
/* c8 ignore stop */

const type\x242 = 'ruby-wasm-wasi';
const jsType = type\x242.replace(/\x5cW+/g, '_');

// MISSING:
//  * there is no VFS apparently or I couldn't reach any
//  * I've no idea how to override the stderr and stdout
//  * I've no idea how to import packages

// REQUIRES INTEGRATION TEST
/* c8 ignore start */
var ruby_wasm_wasi = {
    type: type\x242,
    experimental: true,
    module: (version = '2.7.1') =>
        \x60https://cdn.jsdelivr.net/npm/@ruby/3.2-wasm-wasi@\x24{version}/dist/browser/+esm\x60,
    async engine({ DefaultRubyVM }, config, url, baseURL) {
        url = url.replace(/\x5c/browser\x5c/\x5c+esm\x24/, '/ruby.wasm');
        const buffer = await fetch\x241(url).arrayBuffer();
        const module = await WebAssembly.compile(buffer);
        const { vm: interpreter } = await DefaultRubyVM(module);
        if (config.files) await fetchFiles(this, interpreter, config.files, baseURL);
        if (config.fetch) await fetchPaths(this, interpreter, config.fetch, baseURL);
        if (config.js_modules) await fetchJSModules(config.js_modules, baseURL);
        return interpreter;
    },
    // Fallback to globally defined module fields (i.e. \x24xworker)
    registerJSModule(interpreter, name, value) {
        name = name.replace(/\x5cW+/g, '__');
        const id = \x60__module_\x24{jsType}_\x24{name}\x60;
        globalThis[id] = value;
        this.run(interpreter, \x60require "js";\x24\x24{name}=JS.global[:\x24{id}]\x60);
        delete globalThis[id];
    },
    run: (interpreter, code, ...args) => interpreter.eval(dedent(code), ...args),
    runAsync: (interpreter, code, ...args) => interpreter.evalAsync(dedent(code), ...args),
    async runEvent(interpreter, code, event) {
        // patch common xworker.onmessage/onerror cases
        if (/^xworker\x5c.(on\x5cw+)\x24/.test(code)) {
            const { \x241: name } = RegExp;
            const id = \x60__module_\x24{jsType}_event\x60;
            globalThis[id] = event;
            this.run(
                interpreter,
                \x60require "js";\x24xworker.call("\x24{name}",JS.global[:\x24{id}])\x60,
            );
            delete globalThis[id];
        } else {
            // Experimental: allows only events by fully qualified method name
            const method = this.run(interpreter, \x60method(:\x24{code})\x60);
            await method.call(code, interpreter.wrap(event));
        }
    },
    transform: (_, value) => value,
    writeFile: () => {
        throw new Error(\x60writeFile is not supported in \x24{type\x242}\x60);
    },
};
/* c8 ignore stop */

const type\x241 = 'wasmoon';

// MISSING:
//  * I've no idea how to import packages

// REQUIRES INTEGRATION TEST
/* c8 ignore start */
var wasmoon = {
    type: type\x241,
    module: (version = '1.16.0') =>
        \x60https://cdn.jsdelivr.net/npm/wasmoon@\x24{version}/+esm\x60,
    async engine({ LuaFactory, LuaLibraries }, config, _, baseURL) {
        const { stderr, stdout, get } = stdio();
        const interpreter = await get(new LuaFactory().createEngine());
        interpreter.global.getTable(LuaLibraries.Base, (index) => {
            interpreter.global.setField(index, 'print', stdout);
            interpreter.global.setField(index, 'printErr', stderr);
        });
        if (config.files) await fetchFiles(this, interpreter, config.files, baseURL);
        if (config.fetch) await fetchPaths(this, interpreter, config.fetch, baseURL);
        if (config.js_modules) await fetchJSModules(config.js_modules, baseURL);
        return interpreter;
    },
    // Fallback to globally defined module fields
    registerJSModule: (interpreter, name, value) => {
        interpreter.global.set(name, value);
    },
    run: (interpreter, code, ...args) => {
        try {
            return interpreter.doStringSync(dedent(code), ...args);
        }
        catch (error) {
            io.get(interpreter).stderr(error);
        }
    },
    runAsync: async (interpreter, code, ...args) => {
        try {
            return await interpreter.doString(dedent(code), ...args);
        }
        catch (error) {
            io.get(interpreter).stderr(error);
        }
    },
    runEvent: async (interpreter, code, event) => {
        // allows method(event) as well as namespace.method(event)
        // it does not allow fancy brackets names for now
        const [name, ...keys] = code.split('.');
        let target = interpreter.global.get(name);
        let context;
        for (const key of keys) [context, target] = [target, target[key]];
        try {
            await target.call(context, event);
        }
        catch (error) {
            io.get(interpreter).stderr(error);
        }
    },
    transform: (_, value) => value,
    writeFile: (
        {
            cmodule: {
                module: { FS },
            },
        },
        path,
        buffer,
    ) => writeFileShim(FS, path, buffer),
};
/* c8 ignore stop */

const type = 'webr';
const r = new WeakMap();
const fr = new FinalizationRegistry(fn => fn());

// REQUIRES INTEGRATION TEST
/* c8 ignore start */
const run = async (interpreter, code) => {
  const { shelter, destroy, io } = r.get(interpreter);
  const { output, result } = await shelter.captureR(dedent(code));
  for (const { type, data } of output) io[type](data);
  fr.register(result, destroy);
  return result;
};

var webr = {
    type,
    experimental: true,
    module: (version = '0.5.1') =>
        \x60https://cdn.jsdelivr.net/npm/webr@\x24{version}/dist/webr.mjs\x60,
    async engine(module, config, _, baseURL) {
        const { get } = stdio();
        const interpreter = new module.WebR();
        await get(interpreter.init().then(() => interpreter));
        const shelter = await new interpreter.Shelter();
        r.set(interpreter, {
          module,
          shelter,
          destroy: shelter.destroy.bind(shelter),
          io: io.get(interpreter),
        });
        if (config.files) await fetchFiles(this, interpreter, config.files, baseURL);
        if (config.fetch) await fetchPaths(this, interpreter, config.fetch, baseURL);
        if (config.js_modules) await fetchJSModules(config.js_modules, baseURL);
        return interpreter;
    },
    // Fallback to globally defined module fields (i.e. \x24xworker)
    registerJSModule(_, name) {
        console.warn(\x60Experimental interpreter: module \x24{name} is not supported (yet)\x60);
        // TODO: as complex JS objects / modules are not allowed
        // it's not clear how we can bind anything or import a module
        // in a context that doesn't understand methods from JS
        // https://docs.r-wasm.org/webr/latest/convert-js-to-r.html#constructing-r-objects-from-javascript-objects
    },
    run,
    runAsync: run,
    async runEvent(interpreter, code, event) {
        // TODO: WebR cannot convert exoteric objects or any literal
        // to an easy to reason about data/frame ... that conversion
        // is reserved for the future:
        // https://docs.r-wasm.org/webr/latest/convert-js-to-r.html#constructing-r-objects-from-javascript-objects
        await interpreter.evalRVoid(\x60\x24{code}(event)\x60, {
          env: { event: { type: [ event.type ] } }
        });
    },
    transform: (_, value) => {
        console.log('transforming', value);
        return value;
    },
    writeFile: () => {
        // MAYBE ???
    },
};
/* c8 ignore stop */

// ⚠️ Part of this file is automatically generated
//    The :RUNTIMES comment is a delimiter and no code should be written/changed after
//    See rollup/build_interpreters.cjs to know more

/** @type {Map<string, object>} */
const registry = new Map();

/** @type {Map<string, object>} */
const configs = new Map();

/* c8 ignore start */
const interpreter\x241 = new Proxy(new Map(), {
    get(map, id) {
        if (!map.has(id)) {
            const [type, ...rest] = id.split('@');
            const interpreter = registry.get(type);
            const url = /^(?:\x5c.?\x5c.?\x5c/|[a-z0-9-]+:\x5c/\x5c/)/i.test(rest)
                ? rest.join('@')
                : interpreter.module(...rest);
            map.set(id, {
                url,
                module: import(/* webpackIgnore: true */url),
                engine: interpreter.engine.bind(interpreter),
            });
        }
        const { url, module, engine } = map.get(id);
        return (config, baseURL) =>
            module.then((module) => {
                configs.set(id, config);
                return engine(module, config, url, baseURL);
            });
    },
});
/* c8 ignore stop */

const register = (interpreter) => {
    for (const type of [].concat(interpreter.type)) {
        registry.set(type, interpreter);
    }
};
for (const interpreter of [dummy, micropython, pyodide, ruby_wasm_wasi, wasmoon, webr])
    register(interpreter);

const { parse } = JSON;

// REQUIRES INTEGRATION TEST
/* c8 ignore start */
const getConfigURLAndType = (config, configURL = './config.txt') => {
    let type = typeof config;
    if (type === 'string' && /\x5c.(json|toml|txt)\x24/.test(config))
        type = RegExp.\x241;
    else
        config = configURL;
    return [absoluteURL(config), type];
};

const resolveConfig = (config, configURL, options = {}) => {
    const [absolute, type] = getConfigURLAndType(config, configURL);
    if (type === 'json') {
        options = fetch\x241(absolute).json();
    } else if (type === 'toml') {
        options = fetch\x241(absolute).text().then(toml);
    } else if (type === 'string') {
        options = parseString(config);
    } else if (type === 'object' && config) {
        options = config;
    } else if (type === 'txt' && typeof options === 'string') {
        options = parseString(options);
    }
    config = absolute;
    return [options, config];
};

const parseString = config => {
    try {
        return parse(config);
    }
    // eslint-disable-next-line no-unused-vars
    catch (_) {
        return toml(config);
    }
};
/* c8 ignore stop */

/**
 * Parse a generic config if it came from an attribute either as URL
 * or as a serialized string. In XWorker case, accepts a pre-defined
 * options to use as it is to avoid needing at all a fetch operation.
 * In latter case, config will be suffixed as \x60config.txt\x60.
 * @param {string} id the interpreter name @ version identifier
 * @param {string | object} config optional config file to parse
 * @param {string} [configURL] optional config URL if config is not string
 * @param {object} [options] optional options used to bootstrap XWorker
 * @returns
 */
const getRuntime = (id, config, configURL, options = {}) => {
    if (config) {
        // REQUIRES INTEGRATION TEST
        /* c8 ignore start */
        [options, config] = resolveConfig(config, configURL, options);
        /* c8 ignore stop */
    }
    return resolve\x241(options).then(options => interpreter\x241[id](options, config));
};

/**
 * @param {string} type the interpreter type
 * @param {string} [version] the optional interpreter version
 * @returns
 */
const getRuntimeID = (type, version = '') =>
    \x60\x24{type}@\x24{version}\x60.replace(/@\x24/, '');

const beforeRun = 'BeforeRun';
const afterRun = 'AfterRun';

const code = [
    \x60code\x24{beforeRun}\x60,
    \x60code\x24{beforeRun}Async\x60,
    \x60code\x24{afterRun}\x60,
    \x60code\x24{afterRun}Async\x60,
];

const js = [
    'onWorker',
    'onReady',
    \x60on\x24{beforeRun}\x60,
    \x60on\x24{beforeRun}Async\x60,
    \x60on\x24{afterRun}\x60,
    \x60on\x24{afterRun}Async\x60,
];

/* c8 ignore start */
// create a copy of the resolved wrapper with the original
// run and runAsync so that, if used within onBeforeRun/Async
// or onAfterRun/Async polluted entries won't matter and just
// the native utilities will be available without seppuku.
// The same applies if called within \x60onReady\x60 worker hook.
function patch(resolved, interpreter) {
    const { run, runAsync } = registry.get(this.type);
    return {
        ...resolved,
        run: run.bind(this, interpreter),
        runAsync: runAsync.bind(this, interpreter)
    };
}

/**
 * Created the wrapper to pass along hooked callbacks.
 * @param {object} module the details module
 * @param {object} ref the node or reference to pass as second argument
 * @param {boolean} isAsync if run should be async
 * @param {function?} before callback to run before
 * @param {function?} after callback to run after
 * @returns {object}
 */
const polluteJS = (module, resolved, ref, isAsync, before, after) => {
    if (before || after) {
        const patched = patch.bind(module, resolved);
        const name = isAsync ? 'runAsync' : 'run';
        const method = module[name];
        module[name] = isAsync ?
            async function (interpreter, code, ...args) {
                if (before) await before.call(this, patched(interpreter), ref);
                const result = await method.call(
                    this,
                    interpreter,
                    code,
                    ...args
                );
                if (after) await after.call(this, patched(interpreter), ref);
                return result;
            } :
            function (interpreter, code, ...args) {
                if (before) before.call(this, patched(interpreter), ref);
                const result = method.call(this, interpreter, code, ...args);
                if (after) after.call(this, patched(interpreter), ref);
                return result;
            }
        ;
    }
};
/* c8 ignore stop */

// ⚠️ This file is used to generate xworker.js
//    That means if any import is circular or brings in too much
//    that would be a higher payload for every worker.
//    Please check via \x60npm run size\x60 that worker code is not much
//    bigger than it used to be before any changes is applied to this file.


let interpreter, runEvent, transform;
const add = (type, fn) => {
    addEventListener(
        type,
        fn ||
            (async (event) => {
                try {
                    await interpreter;
                    runEvent(\x60xworker.on\x24{type}\x60, event);
                } catch (error) {
                    postMessage(error);
                }
            }),
        !!fn && { once: true },
    );
};

const {
    proxy: sync,
    sync: polyfill,
    native,
    window,
    isWindowProxy,
    ffi,
} = await coincident({
    transfer: false,
    transform: value => transform ? transform(value) : value
});

const xworker = {
    // propagate the fact SharedArrayBuffer is polyfilled
    polyfill,
    // allows synchronous utilities between this worker and the main thread
    sync,
    // allow access to the main thread world whenever it's possible
    window: (native || polyfill) ? window : null,
    // allow introspection for foreign (main thread) refrences
    isWindowProxy,
    // standard worker related events / features
    onmessage: console.info,
    onerror: console.error,
    onmessageerror: console.warn,
    postMessage: postMessage.bind(self),
};

add('message', ({ data: { options, config: baseURL, configURL, code: code\x241, hooks } }) => {
    interpreter = (async () => {
        try {
            const { id, tag, type, custom, version, config, async: isAsync } = options;

            const runtimeID = getRuntimeID(type, version);

            const interpreter = await getRuntime(runtimeID, baseURL, configURL, config);

            const { js_modules } = configs.get(runtimeID);

            const mainModules = js_modules?.main;

            const details = create(registry.get(type));

            const resolved = createResolved(
                details,
                custom || type,
                config || {},
                interpreter
            );

            let name = 'run';
            if (isAsync) name += 'Async';

            if (hooks) {
                let before = '';
                let after = '';

                for (const key of code) {
                    const value = hooks[key];
                    if (value) {
                        const asyncCode = key.endsWith('Async');
                        // either async hook and this worker is async
                        // or sync hook and this worker is sync
                        // other shared options possible cases are ignored
                        if ((asyncCode && isAsync) || (!asyncCode && !isAsync)) {
                            if (key.startsWith('codeBefore'))
                                before = value;
                            else
                                after = value;
                        }
                    }
                }

                if (before || after)
                    createOverload(details, name, before, after);

                let beforeCB, afterCB;
                // exclude onWorker and onReady
                for (const key of js.slice(2)) {
                    const value = hooks[key];
                    if (value) {
                        const asyncCode = key.endsWith('Async');
                        if ((asyncCode && isAsync) || (!asyncCode && !isAsync)) {
                            const cb = createFunction(value);
                            if (key.startsWith('onBefore'))
                                beforeCB = cb;
                            else
                                afterCB = cb;
                        }
                    }
                }
                polluteJS(details, resolved, xworker, isAsync, beforeCB, afterCB);
            }

            // there's no way to query the DOM, use foreign CustomEvent and so on
            // in case there's no SharedArrayBuffer around.
            let CustomEvent, document, notify, currentScript = null, target = '';
            if (native || polyfill) {
                ({ CustomEvent, document } = window);
                currentScript = id && document.getElementById(id) || null;
                notify = kind => dispatch(currentScript, custom || type, kind, true, CustomEvent);
            }

            // TODO: even this is problematic without SharedArrayBuffer
            // but let's see if we can manage to make it work somehow.
            const JSModules = createJSModules(window, sync, mainModules, baseURL);

            registerJSModules(type, details, interpreter, JSModules);
            details.registerJSModule(interpreter, 'polyscript', {
                IDBMap,
                IDBMapSync,
                xworker,
                currentScript,
                config: resolved.config,
                js_modules: JSModules,
                ffi,
                get target() {
                    if (!target && currentScript) {
                        if (tag === 'SCRIPT') {
                            currentScript.after(assign(
                                window.document.createElement(\x60script-\x24{custom || type}\x60),
                                { id: (target = \x60\x24{id}-target\x60) }
                            ));
                        }
                        else {
                            target = id;
                            currentScript.replaceChildren();
                            currentScript.style.display = 'block';
                        }
                    }
                    return target;
                }
            });

            // simplify runEvent calls
            runEvent = details.runEvent.bind(details, interpreter);

            // allows transforming arguments with sync
            transform = details.transform.bind(details, interpreter);

            // notify worker ready to execute
            if (currentScript) notify('ready');

            // evaluate the optional \x60onReady\x60 callback
            if (hooks?.onReady) {
                createFunction(hooks?.onReady).call(
                    details,
                    patch.call(details, resolved, interpreter),
                    xworker,
                );
            }

            // run either sync or async code in the worker
            await details[name](interpreter, code\x241);

            if (['micropython', 'pyodide'].includes(details.type)) {
                // this dance is required due Pyodide issues with runtime sync exports
                // or MicroPython issue with \x60runPython\x60 not returning values
                const polyscript = 'polyscript';
                const workers = \x60__\x24{polyscript}_workers__\x60;
                const exports = '__export__';
                interpreter.runPython([
                    \x60import js as \x24{workers}\x60,
                    \x60\x24{workers}.\x24{workers} = "\x24{exports}" in locals() and \x24{exports} or []\x60,
                    \x60del \x24{workers}\x60,
                ].join('\x5cn'));
                const list = [...globalThis[workers]];
                delete globalThis[workers];
                if (list.length) {
                    interpreter.runPython([
                        \x60from \x24{polyscript} import xworker as \x24{workers}\x60,
                        ...list.map(util => \x60\x24{workers}.sync.\x24{util} = \x24{util}\x60),
                        \x60del \x24{workers}\x60,
                    ].join('\x5cn'));
                }
            }

            // notify worker done executing
            if (currentScript) notify('done');
            postMessage('polyscript:done');
            return interpreter;
        } catch (error) {
            postMessage(error);
        }
    })();
    add('error');
    add('message');
    add('messageerror');
    if (native || polyfill) {
        addEventListener('py:progress', ({ type, detail }) => {
            window.dispatchEvent(new window.CustomEvent(type, { detail }));
        });
    }
});
`.replace(re,place)],{type:'text/javascript'})), ...args);
/* c8 ignore stop */

const { parse } = JSON;

// REQUIRES INTEGRATION TEST
/* c8 ignore start */
const getConfigURLAndType = (config, configURL = './config.txt') => {
    let type = typeof config;
    if (type === 'string' && /\.(json|toml|txt)$/.test(config))
        type = RegExp.$1;
    else
        config = configURL;
    return [absoluteURL(config), type];
};

const resolveConfig = (config, configURL, options = {}) => {
    const [absolute, type] = getConfigURLAndType(config, configURL);
    if (type === 'json') {
        options = fetch$1(absolute).json();
    } else if (type === 'toml') {
        options = fetch$1(absolute).text().then(toml);
    } else if (type === 'string') {
        options = parseString(config);
    } else if (type === 'object' && config) {
        options = config;
    } else if (type === 'txt' && typeof options === 'string') {
        options = parseString(options);
    }
    config = absolute;
    return [options, config];
};

const parseString = config => {
    try {
        return parse(config);
    }
    // eslint-disable-next-line no-unused-vars
    catch (_) {
        return toml(config);
    }
};
/* c8 ignore stop */

/**
 * Parse a generic config if it came from an attribute either as URL
 * or as a serialized string. In XWorker case, accepts a pre-defined
 * options to use as it is to avoid needing at all a fetch operation.
 * In latter case, config will be suffixed as `config.txt`.
 * @param {string} id the interpreter name @ version identifier
 * @param {string | object} config optional config file to parse
 * @param {string} [configURL] optional config URL if config is not string
 * @param {object} [options] optional options used to bootstrap XWorker
 * @returns
 */
const getRuntime = (id, config, configURL, options = {}) => {
    if (config) {
        // REQUIRES INTEGRATION TEST
        /* c8 ignore start */
        [options, config] = resolveConfig(config, configURL, options);
        /* c8 ignore stop */
    }
    return resolve$2(options).then(options => interpreter[id](options, config));
};

/**
 * @param {string} type the interpreter type
 * @param {string} [version] the optional interpreter version
 * @returns
 */
const getRuntimeID = (type, version = '') =>
    `${type}@${version}`.replace(/@$/, '');

function toJSONCallback$1 (callback = this) {
  return String(callback).replace(
    /^(async\s*)?(\bfunction\b)?(.*?)\(/,
    (_, isAsync, fn, name) => (
      name && !fn ?
        `${isAsync || ""}function ${name}(` :
        _
    ),
  );
}

const beforeRun = 'BeforeRun';
const afterRun = 'AfterRun';

const code$1 = [
    `code${beforeRun}`,
    `code${beforeRun}Async`,
    `code${afterRun}`,
    `code${afterRun}Async`,
];

const js = [
    'onWorker',
    'onReady',
    `on${beforeRun}`,
    `on${beforeRun}Async`,
    `on${afterRun}`,
    `on${afterRun}Async`,
];

/* c8 ignore start */
// create a copy of the resolved wrapper with the original
// run and runAsync so that, if used within onBeforeRun/Async
// or onAfterRun/Async polluted entries won't matter and just
// the native utilities will be available without seppuku.
// The same applies if called within `onReady` worker hook.
function patch(resolved, interpreter) {
    const { run, runAsync } = registry$1.get(this.type);
    return {
        ...resolved,
        run: run.bind(this, interpreter),
        runAsync: runAsync.bind(this, interpreter)
    };
}

/**
 * Created the wrapper to pass along hooked callbacks.
 * @param {object} module the details module
 * @param {object} ref the node or reference to pass as second argument
 * @param {boolean} isAsync if run should be async
 * @param {function?} before callback to run before
 * @param {function?} after callback to run after
 * @returns {object}
 */
const polluteJS = (module, resolved, ref, isAsync, before, after) => {
    if (before || after) {
        const patched = patch.bind(module, resolved);
        const name = isAsync ? 'runAsync' : 'run';
        const method = module[name];
        module[name] = isAsync ?
            async function (interpreter, code, ...args) {
                if (before) await before.call(this, patched(interpreter), ref);
                const result = await method.call(
                    this,
                    interpreter,
                    code,
                    ...args
                );
                if (after) await after.call(this, patched(interpreter), ref);
                return result;
            } :
            function (interpreter, code, ...args) {
                if (before) before.call(this, patched(interpreter), ref);
                const result = method.call(this, interpreter, code, ...args);
                if (after) after.call(this, patched(interpreter), ref);
                return result;
            }
        ;
    }
};
/* c8 ignore stop */

// REQUIRES INTEGRATION TEST
/* c8 ignore start */
let Hook$1 = class Hook {
    constructor(interpreter, hooks = {}) {
        const { main, worker } = hooks;
        this.interpreter = interpreter;
        this.onWorker = main?.onWorker;
        // ignore onWorker as that's main only
        for (const key of js.slice(1))
            this[key] = worker?.[key];
        for (const key of code$1)
            this[key] = worker?.[key];
    }
    toJSON() {
        const hooks = {};
        // ignore onWorker as that's main only
        for (const key of js.slice(1)) {
            if (this[key]) hooks[key] = toJSONCallback$1(this[key]);
        }
        // code related: exclude `onReady` callback
        for (const key of code$1) {
            if (this[key]) hooks[key] = dedent(this[key]());
        }
        return hooks;
    }
};
/* c8 ignore stop */

/**
 * @typedef {Object} WorkerOptions custom configuration
 * @prop {string} type the interpreter type to use
 * @prop {string} [version] the optional interpreter version to use
 * @prop {string | object} [config] the optional config to use within such interpreter
 * @prop {string} [configURL] the optional configURL used to resolve config entries
 * @prop {string} [serviceWorker] the optional Service Worker for SharedArrayBuffer fallback
 * @prop {string} [service_worker] alias for `serviceWorker`
 */

// REQUIRES INTEGRATION TEST
/* c8 ignore start */
var xworker = (...args) =>
    /**
     * A XWorker is a Worker facade able to bootstrap a channel with any desired interpreter.
     * @param {string} url the remote file to evaluate on bootstrap
     * @param {WorkerOptions} [options] optional arguments to define the interpreter to use
     * @returns {Worker}
     */
    function XWorker(url, options) {
        if (args.length) {
            const [type, version] = args;
            options = assign$3({}, options || { type, version });
            if (!options.type) options.type = type;
        }

        // provide a base url to fetch or load config files from a Worker
        // because there's no location at all in the Worker as it's embedded.
        // fallback to a generic, ignored, config.txt file to still provide a URL.
        const [ config ] = getConfigURLAndType(options.config, options.configURL);

        const serviceWorker = options?.serviceWorker || options?.service_worker;
        const worker = xworker$1({ serviceWorker });
        const { postMessage } = worker;
        const isHook = this instanceof Hook$1;

        const sync = assign$3(
            worker.proxy,
            { importJS, importCSS },
        );

        const resolver = withResolvers$3();

        let bootstrap = fetch$1(url)
            .text()
            .then(code => {
                const hooks = isHook ? this.toJSON() : void 0;
                postMessage.call(worker, { options, config, code, hooks });
            })
            .then(() => {
                // boost postMessage performance
                bootstrap = { then: fn => fn() };
            });

        defineProperties(worker, {
            sync: { value: sync },
            ready: { value: resolver.promise },
            ffi: {
                direct: worker.direct,
            },
            postMessage: {
                value: (data, ...rest) => bootstrap.then(
                    () => postMessage.call(worker, data, ...rest),
                ),
            },
            onerror: {
                writable: true,
                configurable: true,
                value: console.error
            }
        });

        worker.addEventListener('message', event => {
            const { data } = event;
            const isError = data instanceof Error;
            if (isError || data === 'polyscript:done') {
                event.stopImmediatePropagation();
                if (isError) {
                    resolver.reject(data);
                    worker.onerror(create$1(event, {
                        type: { value: 'error' },
                        error: { value: data }
                    }));
                }
                else resolver.resolve(worker);
            }
        });

        if (isHook) this.onWorker?.(this.interpreter, worker);

        return worker;
    };

/* c8 ignore stop */

const INVALID_CONTENT = 'Invalid content';
const INVALID_SRC_ATTR = 'Invalid worker attribute';
const INVALID_WORKER_ATTR = 'Invalid worker attribute';

const hasCommentsOnly = text => !text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*(?:\/\/|#).*/gm, '')
    .trim()
;

/* c8 ignore start */ // tested via integration
var workerURL = element => {
  const { src, worker } = element.attributes;
  if (worker) {
      let { value } = worker;
      // throw on worker values as ambiguous
      // @see https://github.com/pyscript/polyscript/issues/43
      if (value) throw new SyntaxError(INVALID_WORKER_ATTR);
      value = src?.value;
      if (!value) {
          // throw on empty src attributes
          if (src) throw new SyntaxError(INVALID_SRC_ATTR);
          if (!element.childElementCount)
              value = element.textContent;
          else {
              const { innerHTML, localName, type } = element;
              const name = type || localName.replace(/-script$/, '');
              value = unescape(innerHTML);
              console.warn(
                  `Deprecated: use <script type="${name}"> for an always safe content parsing:\n`,
                  value,
              );
          }

          const url = URL.createObjectURL(new Blob([dedent(value)], { type: 'text/plain' }));
          // TODO: should we really clean up this? debugging non-existent resources
          //       at distance might be very problematic if the url is revoked.
          // setTimeout(URL.revokeObjectURL, 5000, url);
          return url;
      }
      return value;
  }
  // validate ambiguous cases with src and not empty/commented content
  if (src && !hasCommentsOnly(element.textContent))
    throw new SyntaxError(INVALID_CONTENT);
};
/* c8 ignore stop */

const getRoot = (script) => {
    let parent = script;
    while (parent.parentNode) parent = parent.parentNode;
    return parent;
};

const queryTarget = (script, idOrSelector) => {
    const root = getRoot(script);
    return root.getElementById(idOrSelector) || $(idOrSelector, root);
};

const targets = new WeakMap();
const targetDescriptor = {
    get() {
        let target = targets.get(this);
        if (!target) {
            target = document.createElement(`${this.type}-script`);
            targets.set(this, target);
            handle(this);
        }
        return target;
    },
    set(target) {
        if (typeof target === 'string')
            targets.set(this, queryTarget(this, target));
        else {
            targets.set(this, target);
            handle(this);
        }
    },
};

const handled = new WeakMap();

const interpreters = new Map();

const execute = async (currentScript, source, XWorker, isAsync) => {
    const { type } = currentScript;
    const module = registry$1.get(type);
    /* c8 ignore start */
    if (module.experimental)
        console.warn(`The ${type} interpreter is experimental`);
    const [interpreter, content] = await all([
        handled.get(currentScript).interpreter,
        source,
    ]);
    try {
        registerJSModules(type, module, interpreter, JSModules);
        module.registerJSModule(interpreter, 'polyscript', {
            IDBMap: IDBMap$1,
            IDBMapSync,
            XWorker,
            currentScript,
            js_modules: JSModules,
            workers: workersHandler,
        });
        dispatch(currentScript, type, 'ready');
        // temporarily override inherited document.currentScript in a non writable way
        // but it deletes it right after to preserve native behavior (as it's sync: no trouble)
        defineProperty$3(document, 'currentScript', {
            configurable: true,
            get: () => currentScript,
        });
        const done = dispatch.bind(null, currentScript, type, 'done');
        let result = module[isAsync ? 'runAsync' : 'run'](interpreter, content);
        if (isAsync) result = await result;
        done();
        return result;
    } finally {
        delete document.currentScript;
    }
    /* c8 ignore stop */
};

const getValue = (ref, prefix) => {
    const value = ref?.value;
    return value ? prefix + value : '';
};

const getDetails = (type, id, name, version, config, configURL, runtime = type) => {
    if (!interpreters.has(id)) {
        const details = {
            interpreter: getRuntime(name, config, configURL),
            queue: resolve$2(),
            XWorker: xworker(type, version),
        };
        interpreters.set(id, details);
        // enable sane defaults when single interpreter *of kind* is used in the page
        // this allows `xxx-*` attributes to refer to such interpreter without `env` around
        /* c8 ignore start *//* this is tested very well in PyScript */
        if (!interpreters.has(type)) interpreters.set(type, details);
        if (!interpreters.has(runtime)) interpreters.set(runtime, details);
        /* c8 ignore stopt */
    }
    return interpreters.get(id);
};

/**
 * @param {HTMLScriptElement} script a special type of <script>
 */
const handle = async (script) => {
    // known node, move its companion target after
    // vDOM or other use cases where the script is a tracked element
    if (handled.has(script)) {
        const { target } = script;
        if (target) {
            // if the script is in the head just append target to the body
            if (script.closest('head')) document.body.append(target);
            // in any other case preserve the script position
            else script.after(target);
        }
    }
    // new script to handle ... allow newly created scripts to work
    // just exactly like any other script would
    else {
        // allow a shared config among scripts, beside interpreter,
        // and/or source code with different config or interpreter
        const {
            attributes: {
                config,
                env,
                name: wn,
                target,
                version,
                ['service-worker']: sw,
            },
            src,
            type,
        } = script;

        /* c8 ignore start */
        const isAsync = !isSync(script);

        const versionValue = version?.value;
        const name = getRuntimeID(type, versionValue);
        let configValue = getValue(config, '|');
        const id = getValue(env, '') || `${name}${configValue}`;
        configValue = configValue.slice(1);

        const url = workerURL(script);
        if (url) {
            const XWorker = xworker(type, versionValue);
            const xworker$1 = new XWorker(url, {
                ...nodeInfo(script, type),
                version: versionValue,
                async: isAsync,
                config: configValue,
                serviceWorker: sw?.value,
            });
            handled.set(
                defineProperty$3(script, 'xworker', { value: xworker$1 }),
                { xworker: xworker$1 },
            );
            const workerName = wn?.value;
            if (workerName) workers[workerName].resolve(xworker$1.ready);
            return;
        }
        /* c8 ignore stop */

        const targetValue = getValue(target, '');
        const details = getDetails(type, id, name, versionValue, configValue);

        handled.set(
            defineProperty$3(script, 'target', targetDescriptor),
            details,
        );

        if (targetValue) targets.set(script, queryTarget(script, targetValue));

        // start fetching external resources ASAP
        const source = src ? fetch$1(src).text() : script.textContent;
        details.queue = details.queue.then(() =>
            execute(script, source, details.XWorker, isAsync),
        );
    }
};

/* c8 ignore start */
const env$1 = new Proxy(create$1(null), {
    get: (_, name) => new Promise(queueMicrotask).then(
        () => awaitInterpreter(name)
    ),
});

// attributes are tested via integration / e2e
// ensure both interpreter and its queue are awaited then returns the interpreter
const awaitInterpreter = async (key) => {
    if (interpreters.has(key)) {
        const { interpreter, queue } = interpreters.get(key);
        return (await all([interpreter, queue]))[0];
    }

    const available = interpreters.size
        ? `Available interpreters are: ${[...interpreters.keys()]
              .map((r) => `"${r}"`)
              .join(', ')}.`
        : 'There are no interpreters in this page.';

    throw new Error(`The interpreter "${key}" was not found. ${available}`);
};

const listener = async (event) => {
    const { type, currentTarget } = event;
    if (!prefixes.length) return;
    for (let { name, value, ownerElement: el } of $x(
        `./@*[${prefixes.map((p) => `name()="${p}${type}"`).join(' or ')}]`,
        currentTarget,
    )) {
        name = name.slice(0, -(type.length + 1));
        const interpreter = await awaitInterpreter(
            el.getAttribute(`${name}-env`) || name,
        );
        const handler = registry$1.get(name);
        handler.runEvent(interpreter, value, event);
    }
};

/**
 * Look for known prefixes and add related listeners.
 * @param {Document | Element} root
 */
const addAllListeners = (root) => {
    if (!prefixes.length) return;
    for (let { name, ownerElement: el } of $x(
        `.//@*[${prefixes
            .map((p) => `starts-with(name(),"${p}")`)
            .join(' or ')}]`,
        root,
    )) {
        const i = name.lastIndexOf('-');
        const type = name.slice(i + 1);
        if (type !== 'env') {
            el.addEventListener(type, listener);
            // automatically disable form controls that are not disabled already
            if ('disabled' in el && !el.disabled) {
                el.disabled = true;
                // set these to enable once the interpreter is known (registered + loaded)
                env$1[name.slice(0, i)].then(() => {
                    el.disabled = false;
                });
            }
        }
    }
};
/* c8 ignore stop */

const XWorker$1 = xworker();

const CUSTOM_SELECTORS = [];

const customObserver$1 = new Map();

/**
 * @typedef {Object} Runtime custom configuration
 * @prop {object} interpreter the bootstrapped interpreter
 * @prop {(url:string, options?: object) => Worker} XWorker an XWorker constructor that defaults to same interpreter on the Worker.
 * @prop {object} config a cloned config used to bootstrap the interpreter
 * @prop {(code:string) => any} run an utility to run code within the interpreter
 * @prop {(code:string) => Promise<any>} runAsync an utility to run code asynchronously within the interpreter
 * @prop {(path:string, data:ArrayBuffer) => void} writeFile an utility to write a file in the virtual FS, if available
 */

const types = new Map();
const waitList = new Map();

// REQUIRES INTEGRATION TEST
/* c8 ignore start */
/**
 * @param {Element} node any DOM element registered via define.
 */
const handleCustomType = async (node) => {
    for (const selector of CUSTOM_SELECTORS) {
        if (node.matches(selector)) {
            const type = types.get(selector);
            const details = registry.get(type);
            const { resolve } = waitList.get(type);
            const { options, known } = details;

            if (known.has(node)) return;
            known.add(node);

            for (const [selector, callback] of customObserver$1) {
                if (node.matches(selector)) await callback(node);
            }

            const {
                interpreter: runtime,
                configURL,
                config,
                version,
                env,
                onerror,
                hooks,
            } = options;

            let error;
            try {
                const worker = workerURL(node);
                if (worker) {
                    let v = version;
                    let url = configURL;
                    let cfg = node.getAttribute('config') || config || {};
                    if (!v || !cfg) {
                        const [o, u] = resolveConfig(cfg, configURL);
                        cfg = await o;
                        url = u;
                        v = cfg.version || cfg.interpreter;
                        if (v && /\.m?js$/.test(v))
                            v = new URL(v, url).href;
                    }
                    const xworker = XWorker$1.call(new Hook$1(null, hooks), worker, {
                        ...nodeInfo(node, type),
                        configURL: url,
                        version: v,
                        type: runtime,
                        custom: type,
                        config: cfg,
                        async: !isSync(node),
                        serviceWorker: node.getAttribute('service-worker'),
                    });
                    defineProperty$3(node, 'xworker', { value: xworker });
                    resolve({ type, xworker });
                    const workerName = node.getAttribute('name');
                    if (workerName) workers[workerName].resolve(xworker.ready);
                    return;
                }
            }
            // let the custom type handle errors via its `io`
            catch (workerError) {
                error = workerError;
            }

            const name = getRuntimeID(runtime, version);
            const id = env || `${name}${config ? `|${config}` : ''}`;
            const { interpreter: engine, XWorker: Worker } = getDetails(
                type,
                id,
                name,
                version,
                config,
                configURL,
                runtime
            );

            const interpreter = await engine;

            const module = create$1(registry$1.get(runtime));

            const hook = new Hook$1(interpreter, hooks);

            const XWorker = function XWorker(...args) {
                return Worker.apply(hook, args);
            };

            const resolved = {
                ...createResolved(
                    module,
                    type,
                    structuredClone(configs$1.get(name)),
                    interpreter,
                ),
                XWorker,
            };

            registerJSModules(runtime, module, interpreter, JSModules);
            module.registerJSModule(interpreter, 'polyscript', {
                IDBMap: IDBMap$1,
                IDBMapSync,
                XWorker,
                config: resolved.config,
                currentScript: type.startsWith('_') ? null : node,
                js_modules: JSModules,
                workers: workersHandler,
            });

            // patch methods accordingly to hooks (and only if needed)
            for (const suffix of ['Run', 'RunAsync']) {
                let before = '';
                let after = '';

                for (const key of code$1) {
                    const value = hooks?.main?.[key];
                    if (value && key.endsWith(suffix)) {
                        if (key.startsWith('codeBefore'))
                            before = dedent(value());
                        else
                            after = dedent(value());
                    }
                }

                if (before || after) {
                    createOverload(
                        module,
                        `r${suffix.slice(1)}`,
                        before,
                        after,
                    );
                }

                let beforeCB, afterCB;
                // ignore onReady and onWorker
                for (let i = 2; i < js.length; i++) {
                    const key = js[i];
                    const value = hooks?.main?.[key];
                    if (value && key.endsWith(suffix)) {
                        if (key.startsWith('onBefore'))
                            beforeCB = value;
                        else
                            afterCB = value;
                    }
                }
                polluteJS(module, resolved, node, suffix.endsWith('Async'), beforeCB, afterCB);
            }

            details.queue = details.queue.then(() => {
                resolve(resolved);
                if (error) onerror?.(error, node);
                return hooks?.main?.onReady?.(resolved, node);
            });
        }
    }
};

/**
 * @type {Map<string, {options:object, known:WeakSet<Element>}>}
 */
const registry = new Map();

/**
 * @typedef {Object} CustomOptions custom configuration
 * @prop {'pyodide' | 'micropython' | 'ruby-wasm-wasi' | 'wasmoon'} interpreter the interpreter to use
 * @prop {string} [version] the optional interpreter version to use
 * @prop {string} [config] the optional config to use within such interpreter
 */

let dontBotherCount = 0;

/**
 * Allows custom types and components on the page to receive interpreters to execute any code
 * @param {string} type the unique `<script type="...">` identifier
 * @param {CustomOptions} options the custom type configuration
 */
const define$1 = (type, options) => {
    // allow no-type to be bootstrapped out of the box
    let dontBother = type == null;

    if (dontBother)
        type = `_ps${dontBotherCount++}`;
    else if (registry$1.has(type) || registry.has(type))
        throw new Error(`<script type="${type}"> already registered`);

    if (!registry$1.has(options?.interpreter))
        throw new Error('Unspecified interpreter');

    // allows reaching out the interpreter helpers on events
    registry$1.set(type, registry$1.get(options.interpreter));

    // allows selector -> registry by type
    const selectors = [`script[type="${type}"]`];

    // ensure a Promise can resolve once a custom type has been bootstrapped
    whenDefined$1(type);

    if (dontBother) {
        // add a script then cleanup everything once that's ready
        const { hooks } = options;
        const onReady = hooks?.main?.onReady;
        options = {
            ...options,
            hooks: {
                ...hooks,
                main: {
                    ...hooks?.main,
                    onReady(resolved, node) {
                        CUSTOM_SELECTORS.splice(CUSTOM_SELECTORS.indexOf(type), 1);
                        registry$1.delete(type);
                        registry.delete(type);
                        waitList.delete(type);
                        node.remove();
                        onReady?.(resolved);
                    }
                }
            },
        };
        document.head.append(
            assign$3(document.createElement('script'), { type })
        );
    }
    else {
        selectors.push(`${type}-script`);
        prefixes.push(`${type}-`);
    }

    for (const selector of selectors) types.set(selector, type);
    CUSTOM_SELECTORS.push(...selectors);

    // ensure always same env for this custom type
    registry.set(type, {
        options: assign$3({ env: type }, options),
        known: new WeakSet(),
        queue: Promise.resolve(),
    });

    if (!dontBother) addAllListeners(document);
    $$$1(selectors.join(',')).forEach(handleCustomType);
};

/**
 * Resolves whenever a defined custom type is bootstrapped on the page
 * @param {string} type the unique `<script type="...">` identifier
 * @returns {Promise<object>}
 */
const whenDefined$1 = (type) => {
    if (!waitList.has(type)) waitList.set(type, withResolvers$3());
    return waitList.get(type).promise;
};
/* c8 ignore stop */

/** @typedef {(type: string, options: import("./custom.js").CustomOptions) => void} CustomOptions */


// avoid multiple initialization of the same library
const [
    {
        customObserver,
        define,
        whenDefined,
        env,
        Hook,
        XWorker
    },
    alreadyLive$1
] = stickyModule(
    'polyscript',
    {
        customObserver: customObserver$1,
        define: define$1,
        whenDefined: whenDefined$1,
        env: env$1,
        Hook: Hook$1,
        XWorker: XWorker$1
    }
);


if (!alreadyLive$1) {
    const mo = new MutationObserver((records) => {
        const selector = selectors.join(',');
        for (const { type, target, attributeName, addedNodes } of records) {
            // attributes are tested via integration / e2e
            /* c8 ignore start */
            if (type === 'attributes') {
                const i = attributeName.lastIndexOf('-') + 1;
                if (i) {
                    const prefix = attributeName.slice(0, i);
                    for (const p of prefixes) {
                        if (prefix === p) {
                            const type = attributeName.slice(i);
                            if (type !== 'env') {
                                const method = target.hasAttribute(attributeName)
                                    ? 'add'
                                    : 'remove';
                                target[`${method}EventListener`](type, listener);
                            }
                            break;
                        }
                    }
                }
                continue;
            }
            for (const node of addedNodes) {
                if (node.nodeType === 1) {
                    addAllListeners(node);
                    if (selector && node.matches(selector)) handle(node);
                    else bootstrap(selector, node, true);
                }
            }
            /* c8 ignore stop */
        }
    });

    /* c8 ignore start */
    const bootstrap = (selector, node, shouldHandle) => {
        if (selector) $$$1(selector, node).forEach(handle);
        selector = CUSTOM_SELECTORS.join(',');
        if (selector) {
            if (shouldHandle) handleCustomType(node);
            $$$1(selector, node).forEach(handleCustomType);
        }
    };
    /* c8 ignore stop */

    const observe = (root) => {
        mo.observe(root, { childList: true, subtree: true, attributes: true });
        return root;
    };

    const { attachShadow } = Element.prototype;
    assign$3(Element.prototype, {
        attachShadow(init) {
            return observe(attachShadow.call(this, init));
        },
    });

    // give 3rd party a chance to apply changes before this happens
    queueMicrotask(() => {
        addAllListeners(observe(document));
        bootstrap(selectors.join(','), document, false);
    });

}

var TYPES = new Map([
    ["py", "pyodide"],
    ["mpy", "micropython"],
]);

const waitForIt = [];

for (const [TYPE] of TYPES) {
    const selectors = [`script[type="${TYPE}"]`, `${TYPE}-script`];
    for (const element of document.querySelectorAll(selectors.join(","))) {
        const { promise, resolve } = withResolvers$5();
        waitForIt.push(promise);
        element.addEventListener(`${TYPE}:done`, resolve, { once: true });
    }
}

// wait for all the things then cleanup
Promise.all(waitForIt).then(() => {
    dispatchEvent(new Event("py:all-done"));
});

/**
 * Given a CSS selector, returns the first matching node, if any.
 * @param {string} css the CSS selector to query
 * @param {Document | DocumentFragment | Element} [root] the optional parent node to query
 * @returns {Element?} the found element, if any
 */

/**
 * Given a CSS selector, returns a list of all matching nodes.
 * @param {string} css the CSS selector to query
 * @param {Document | DocumentFragment | Element} [root] the optional parent node to query
 * @returns {Element[]} a list of found nodes
 */
const $$ = (css, root = document) => [...root.querySelectorAll(css)];

// ⚠️ This file is an artifact: DO NOT MODIFY
var allPlugins = {
    // codemirror: () =>
    //     Promise.resolve().then(function () { return codemirror$1; }),
    // ["deprecations-manager"]: () =>
    //     import(
    //         /* webpackIgnore: true */
    //         './deprecations-manager-BivsDiYk.js'
    //     ),
    // donkey: () =>
    //     import(
    //         /* webpackIgnore: true */
    //         './donkey-C7TYn_Hu.js'
    //     ),
    error: () =>
        import(
            /* webpackIgnore: true */
            './error-1KvIsB9S.js'
        ),
    // ["py-editor"]: () =>
    //     import(
    //         /* webpackIgnore: true */
    //         './py-editor-Rz-OBDlg.js'
    //     ),
    // ["py-game"]: () =>
    //     import(
    //         /* webpackIgnore: true */
    //         './py-game-sGO2jNSf.js'
    //     ),
    ["py-terminal"]: () =>
        import(
            /* webpackIgnore: true */
            './py-terminal-BdiFHHVY.js'
        ),
};

/**
 * These error codes are used to identify the type of error that occurred.
 * @see https://pyscript.github.io/docs/latest/reference/exceptions.html?highlight=errors
 */
const ErrorCode = {
    CONFLICTING_CODE: "PY0409",
    BAD_CONFIG: "PY1000",
    // Currently these are created depending on error code received from fetching
    FETCH_ERROR: "PY0001",
    FETCH_UNAUTHORIZED_ERROR: "PY0401",
    FETCH_FORBIDDEN_ERROR: "PY0403",
    FETCH_NOT_FOUND_ERROR: "PY0404",
    FETCH_SERVER_ERROR: "PY0500",
    FETCH_UNAVAILABLE_ERROR: "PY0503",
};

/**
 * Keys of the ErrorCode object
 * @typedef {keyof ErrorCode} ErrorCodes
 * */

class UserError extends Error {
    /**
     * @param {ErrorCodes} errorCode
     * @param {string} message
     * @param {string} messageType
     * */
    constructor(errorCode, message = "", messageType = "text") {
        super(`(${errorCode}): ${message}`);
        this.errorCode = errorCode;
        this.messageType = messageType;
        this.name = "UserError";
    }
}

class FetchError extends UserError {
    /**
     * @param {ErrorCodes} errorCode
     * @param {string} message
     * */
    constructor(errorCode, message) {
        super(errorCode, message);
        this.name = "FetchError";
    }
}

/**
 * @param {Response} response
 * @returns
 */
const getText = (response) => response.text();

/**
 * This is a fetch wrapper that handles any non 200 responses and throws a
 * FetchError with the right ErrorCode. This is useful because our FetchError
 * will automatically create an alert banner.
 *
 * @param {string} url - URL to fetch
 * @param {Request} [options] - options to pass to fetch
 * @returns {Promise<Response>}
 */
async function robustFetch(url, options) {
    let response;

    // Note: We need to wrap fetch into a try/catch block because fetch
    // throws a TypeError if the URL is invalid such as http://blah.blah
    try {
        response = await fetch(url, options);
    } catch (err) {
        const error = err;
        let errMsg;
        if (url.startsWith("http")) {
            errMsg =
                `Fetching from URL ${url} failed with error ` +
                `'${error.message}'. Are your filename and path correct?`;
        } else {
            errMsg = `Polyscript: Access to local files
        (using [[fetch]] configurations in &lt;py-config&gt;)
        is not available when directly opening a HTML file;
        you must use a webserver to serve the additional files.
        See <a style="text-decoration: underline;" href="https://github.com/pyscript/pyscript/issues/257#issuecomment-1119595062">this reference</a>
        on starting a simple webserver with Python.
            `;
        }
        throw new FetchError(ErrorCode.FETCH_ERROR, errMsg);
    }

    // Note that response.ok is true for 200-299 responses
    if (!response.ok) {
        const errorMsg = `Fetching from URL ${url} failed with error ${response.status} (${response.statusText}). Are your filename and path correct?`;
        switch (response.status) {
            case 404:
                throw new FetchError(ErrorCode.FETCH_NOT_FOUND_ERROR, errorMsg);
            case 401:
                throw new FetchError(
                    ErrorCode.FETCH_UNAUTHORIZED_ERROR,
                    errorMsg,
                );
            case 403:
                throw new FetchError(ErrorCode.FETCH_FORBIDDEN_ERROR, errorMsg);
            case 500:
                throw new FetchError(ErrorCode.FETCH_SERVER_ERROR, errorMsg);
            case 503:
                throw new FetchError(
                    ErrorCode.FETCH_UNAVAILABLE_ERROR,
                    errorMsg,
                );
            default:
                throw new FetchError(ErrorCode.FETCH_ERROR, errorMsg);
        }
    }
    return response;
}

/**
 * This file parses a generic <py-config> or config attribute
 * to use as base config for all py-script elements, importing
 * also a queue of plugins *before* the interpreter (if any) resolves.
 */

const { BAD_CONFIG, CONFLICTING_CODE } = ErrorCode;

const badURL = (url, expected = "") => {
    let message = `(${BAD_CONFIG}): Invalid URL: ${url}`;
    if (expected) message += `\nexpected ${expected} content`;
    throw new Error(message);
};

/**
 * Given a string, returns its trimmed content as text,
 * fetching it from a file if the content is a URL.
 * @param {string} config either JSON, TOML, or a file to fetch
 * @param {string?} type the optional type to enforce
 * @returns {{json: boolean, toml: boolean, text: string}}
 */
const configDetails = async (config, type) => {
    let text = config?.trim();
    // we only support an object as root config
    let url = "",
        toml = false,
        json = /^{/.test(text) && /}$/.test(text);
    // handle files by extension (relaxing urls parts after)
    if (!json && /\.(\w+)(?:\?\S*)?$/.test(text)) {
        const ext = RegExp.$1;
        if (ext === "json" && type !== "toml") json = true;
        else if (ext === "toml" && type !== "json") toml = true;
        else badURL(text, type);
        url = text;
        text = (await robustFetch(url).then(getText)).trim();
    }
    return { json, toml: toml || (!json && !!text), text, url };
};

const conflictError = (reason) => new Error(`(${CONFLICTING_CODE}): ${reason}`);

const relative_url = (url, base = location.href) => new URL(url, base).href;

const syntaxError = (type, url, { message }) => {
    let str = `(${BAD_CONFIG}): Invalid ${type}`;
    if (url) str += ` @ ${url}`;
    return new SyntaxError(`${str}\n${message}`);
};

const configs = new Map();

for (const [TYPE] of TYPES) {
    /** @type {() => Promise<[...any]>} A Promise wrapping any plugins which should be loaded. */
    let plugins;

    /** @type {any} The PyScript configuration parsed from the JSON or TOML object*. May be any of the return types of JSON.parse() or toml-j0.4's parse() ( {number | string | boolean | null | object | Array} ) */
    let parsed;

    /** @type {Error | undefined} The error thrown when parsing the PyScript config, if any.*/
    let error;

    /** @type {string | undefined} The `configURL` field to normalize all config operations as opposite of guessing it once resolved */
    let configURL;

    let config,
        type,
        pyElement,
        pyConfigs = $$(`${TYPE}-config`),
        attrConfigs = $$(
            [
                `script[type="${TYPE}"][config]:not([worker])`,
                `${TYPE}-script[config]:not([worker])`,
            ].join(","),
        );

    // throw an error if there are multiple <py-config> or <mpy-config>
    if (pyConfigs.length > 1) {
        error = conflictError(`Too many ${TYPE}-config`);
    } else {
        // throw an error if there are <x-config> and config="x" attributes
        if (pyConfigs.length && attrConfigs.length) {
            error = conflictError(
                `Ambiguous ${TYPE}-config VS config attribute`,
            );
        } else if (pyConfigs.length) {
            [pyElement] = pyConfigs;
            config = pyElement.getAttribute("src") || pyElement.textContent;
            type = pyElement.getAttribute("type");
        } else if (attrConfigs.length) {
            [pyElement, ...attrConfigs] = attrConfigs;
            config = pyElement.getAttribute("config");
            // throw an error if dirrent scripts use different configs
            if (
                attrConfigs.some((el) => el.getAttribute("config") !== config)
            ) {
                error = conflictError(
                    "Unable to use different configs on main",
                );
            }
        }
    }

    // catch possible fetch errors
    if (!error && config) {
        try {
            const { json, toml, text, url } = await configDetails(config, type);
            if (url) configURL = relative_url(url);
            config = text;
            if (json || type === "json") {
                try {
                    parsed = JSON.parse(text);
                } catch (e) {
                    error = syntaxError("JSON", url, e);
                }
            } else if (toml || type === "toml") {
                try {
                    const { parse } = await import(
                        /* webpackIgnore: true */ './toml-DeE0u5hM.js'
                    );
                    parsed = parse(text);
                } catch (e) {
                    error = syntaxError("TOML", url, e);
                }
            }
        } catch (e) {
            error = e;
        }
    }

    // parse all plugins and optionally ignore only
    // those flagged as "undesired" via `!` prefix
    plugins = async () => {
        const toBeAwaited = [];
        for (const [key, value] of Object.entries(allPlugins)) {
            if (error) {
                if (key === "error") {
                    // show on page the config is broken, meaning that
                    // it was not possible to disable error plugin neither
                    // as that part wasn't correctly parsed anyway
                    value().then(({ notify }) => notify(error.message));
                }
            } else if (!parsed?.plugins?.includes(`!${key}`)) {
                toBeAwaited.push(value().then(({ default: p }) => p));
            } else if (key === "error") {
                toBeAwaited.push(value().then(({ notOnDOM }) => notOnDOM()));
            }
        }
        return await Promise.all(toBeAwaited);
    };

    configs.set(TYPE, { config: parsed, configURL, plugins, error });
}

const { assign } = Object;

const STORAGE = 'entries';
const READONLY = 'readonly';
const READWRITE = 'readwrite';

/**
 * @typedef {Object} IDBMapOptions
 * @prop {'strict' | 'relaxed' | 'default'} [durability]
 * @prop {string} [prefix]
 */

/** @typedef {[IDBValidKey, unknown]} IDBMapEntry */

/** @type {IDBMapOptions} */
const defaultOptions = { durability: 'default', prefix: 'IDBMap' };

/**
 * @template T
 * @param {{ target: IDBRequest<T> }} event
 * @returns {T}
 */
const result = ({ target: { result } }) => result;

class IDBMap extends EventTarget {
  // Privates
  /** @type {Promise<IDBDatabase>} */ #db;
  /** @type {IDBMapOptions} */ #options;
  /** @type {string} */ #prefix;

  /**
   * @template T
   * @param {(store: IDBObjectStore) => IDBRequest<T>} what
   * @param {'readonly' | 'readwrite'} how
   * @returns {Promise<T>}
   */
  async #transaction(what, how) {
    const db = await this.#db;
    const t = db.transaction(STORAGE, how, this.#options);
    return new Promise((onsuccess, onerror) => assign(
      what(t.objectStore(STORAGE)),
      {
        onsuccess,
        onerror,
      }
    ));
  }

  /**
   * @param {string} name
   * @param {IDBMapOptions} options
   */
  constructor(
    name,
    {
      durability = defaultOptions.durability,
      prefix = defaultOptions.prefix,
    } = defaultOptions
  ) {
    super();
    this.#prefix = prefix;
    this.#options = { durability };
    this.#db = new Promise((resolve, reject) => {
      assign(
        indexedDB.open(`${this.#prefix}/${name}`),
        {
          onupgradeneeded({ target: { result, transaction } }) {
            if (!result.objectStoreNames.length)
              result.createObjectStore(STORAGE);
            transaction.oncomplete = () => resolve(result);
          },
          onsuccess(event) {
            resolve(result(event));
          },
          onerror(event) {
            reject(event);
            this.dispatchEvent(event);
          },
        },
      );
    }).then(result => {
      const boundDispatch = this.dispatchEvent.bind(this);
      for (const key in result) {
        if (key.startsWith('on'))
          result[key] = boundDispatch;
      }
      return result;
    });
  }

  // EventTarget Forwards
  /**
   * @param {Event} event
   * @returns 
   */
  dispatchEvent(event) {
    const { type, message, isTrusted } = event;
    return super.dispatchEvent(
      // avoid re-dispatching of the same event
      isTrusted ?
        assign(new Event(type), { message }) :
        event
    );
  }

  // IDBDatabase Forwards
  async close() {
    (await this.#db).close();
  }

  // Map async API
  get size() {
    return this.#transaction(
      store => store.count(),
      READONLY,
    ).then(result);
  }

  async clear() {
    await this.#transaction(
      store => store.clear(),
      READWRITE,
    );
  }

  /**
   * @param {IDBValidKey} key
   */
  async delete(key) {
    await this.#transaction(
      store => store.delete(key),
      READWRITE,
    );
  }

  /**
   * @returns {Promise<IDBMapEntry[]>}
   */
  async entries() {
    const keys = await this.keys();
    return Promise.all(keys.map(key => this.get(key).then(value => [key, value])));
  }

  /**
   * @param {(unknown, IDBValidKey, IDBMap) => void} callback
   * @param {unknown} [context]
   */
  async forEach(callback, context = this) {
    for (const [key, value] of await this.entries())
      await callback.call(context, value, key, this);
  }

  /**
   * @param {IDBValidKey} key
   * @returns {Promise<unknown | undefined>}
   */
  async get(key) {
    const value = await this.#transaction(
      store => store.get(key),
      READONLY,
    ).then(result);
    return value;
  }

  /**
   * @param {IDBValidKey} key
   */
  async has(key) {
    const k = await this.#transaction(
      store => store.getKey(key),
      READONLY,
    ).then(result);
    return k !== void 0;
  }

  async keys() {
    const keys = await this.#transaction(
      store => store.getAllKeys(),
      READONLY,
    ).then(result);
    return keys;
  }

  /**
   * @param {IDBValidKey} key
   * @param {unknown} value
   */
  async set(key, value) {
    await this.#transaction(
      store => store.put(value, key),
      READWRITE,
    );
    return this;
  }

  async values() {
    const keys = await this.keys();
    return Promise.all(keys.map(key => this.get(key)));
  }

  get [Symbol.toStringTag]() {
    return this.#prefix;
  }
}

const stop = (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
};

// ⚠️ these two constants MUST be passed as `fs`
//     within the worker onBeforeRunAsync hook!
const NAMESPACE = "@pyscript.fs";
const ERROR = "storage permissions not granted";

const idb = new IDBMap(NAMESPACE);

/**
 * Ask a user action via dialog and returns the directory handler once granted.
 * @param {{id?:string, mode?:"read"|"readwrite", hint?:"desktop"|"documents"|"downloads"|"music"|"pictures"|"videos"}} options
 * @returns {Promise<FileSystemDirectoryHandle>}
 */
const getFileSystemDirectoryHandle = async (options) => {
    if (!("showDirectoryPicker" in globalThis)) {
        return Promise.reject(
            new Error("showDirectoryPicker is not supported"),
        );
    }

    const { promise, resolve, reject } = withResolvers$5();

    const how = { id: "pyscript", mode: "readwrite", ...options };
    if (options.hint) how.startIn = options.hint;

    const transient = async () => {
        try {
            /* eslint-disable */
            const handler = await showDirectoryPicker(how);
            /* eslint-enable */
            if ((await handler.requestPermission(how)) === "granted") {
                resolve(handler);
                return true;
            }
        } catch ({ message }) {
            console.warn(message);
        }
        return false;
    };

    // in case the user decided to attach the event itself
    // as opposite of relying our dialog walkthrough
    if (navigator.userActivation?.isActive) {
        if (!(await transient())) reject(new Error(ERROR));
    } else {
        const dialog = assign$3(document.createElement("dialog"), {
            className: "pyscript-fs",
            innerHTML: [
                "<strong>ℹ️ Persistent FileSystem</strong><hr>",
                "<p><small>PyScript would like to access a local folder.</small></p>",
                "<div><button title='ok'>✅ Authorize</button>",
                "<button title='cancel'>❌</button></div>",
            ].join(""),
        });

        const [ok, cancel] = $$("button", dialog);

        ok.addEventListener("click", async (event) => {
            stop(event);
            if (await transient()) dialog.close();
        });

        cancel.addEventListener("click", async (event) => {
            stop(event);
            reject(new Error(ERROR));
            dialog.close();
        });

        document.body.appendChild(dialog).showModal();
    }

    return promise;
};

var fs = /*#__PURE__*/Object.freeze({
    __proto__: null,
    ERROR: ERROR,
    NAMESPACE: NAMESPACE,
    getFileSystemDirectoryHandle: getFileSystemDirectoryHandle,
    idb: idb
});

var sync = {
    // allow pyterminal checks to bootstrap
    is_pyterminal: () => false,

    /**
     * 'Sleep' for the given number of seconds. Used to implement Python's time.sleep in Worker threads.
     * @param {number} seconds The number of seconds to sleep.
     */
    sleep(seconds) {
        return new Promise(($) => setTimeout($, seconds * 1000));
    },

    /**
     * Ask a user action via dialog and returns the directory handler once granted.
     * @param {string} uid
     * @param {{id?:string, mode?:"read"|"readwrite", hint?:"desktop"|"documents"|"downloads"|"music"|"pictures"|"videos"}} options
     * @returns {boolean}
     */
    async storeFSHandler(uid, options = {}) {
        if (await idb.has(uid)) return true;
        return getFileSystemDirectoryHandle(options).then(
            async (handler) => {
                await idb.set(uid, handler);
                return true;
            },
            () => false,
        );
    },
};

// helper for all script[type="py"] out there
const before = (script) => {
    defineProperty$3(document, "currentScript", {
        configurable: true,
        get: () => script,
    });
};

const after = () => {
    delete document.currentScript;
};

// common life-cycle handlers for any node
var bootstrapNodeAndPlugins = async (main, wrap, element, hook) => {
    const isAsync = hook.endsWith("Async");
    const isBefore = hook.startsWith("onBefore");
    // make it possible to reach the current target node via Python
    // or clean up for other scripts executing around this one
    (isBefore ? before : after)(element);
    for (const fn of main(hook)) {
        if (isAsync) await fn(wrap, element);
        else fn(wrap, element);
    }
};

const any = () => true;
const error = message => {
  throw new TypeError(message);
};

const validator = (type, Class) => {
  const checks = [];
  if (type) {
    for (const t of type.split(/\s*\|\s*/)) {
      if (t === 'object')
        checks.push(v => v !== null && typeof v === t);
      else if (t === 'null')
        checks.push(v => v === null);
      else
        checks.push(v => typeof v === t);
    }
  }
  if (Class) {
    for (const C of [].concat(Class))
      checks.push(o => o instanceof C);
  }
  switch (checks.length) {
    case 0: return any;
    case 1: return checks[0];
    default: return v => checks.some(f => f(v));
  }
};

const failure = (type, Class, kind, onerror = error) => value => {
  const message = [`Invalid ${typeof value} ${kind}: expected `];
  if (type) {
    message.push(type);
    if (Class) message.push(' or ');
  }
  if (Class) {
    message.push('an instanceof ');
    message.push([].concat(Class).map(({name}) => name).join(' | '));
  }
  onerror(message.join(''), value);
};

const checkFail = (options, kind = 'value') => {
  const type = options?.typeof;
  const Class = options?.instanceof;
  return [
    validator(type, Class),
    failure(type, Class, kind, options?.onerror)
  ];
};

const createSet = Set => options => {
  const [check, fail] = checkFail(options);
  return class TypedSet extends Set {
    add(value) {
      return check(value) ? super.add(value) : fail(value);
    }
  };
};

const typedSet = createSet(Set);

function toJSONCallback (callback = this) {
  return String(callback).replace(
    /^(async\s*)?(\bfunction\b)?(.*?)\(/,
    (_, isAsync, fn, name) => (
      name && !fn ?
        `${isAsync || ""}function ${name}(` :
        _
    ),
  );
}

// ⚠️ This file is an artifact: DO NOT MODIFY
var pyscript = {
  "pyscript": {
    "__init__.py": "from polyscript import lazy_py_modules as py_import\nfrom pyscript.magic_js import RUNNING_IN_WORKER,PyWorker,config,current_target,document,js_import,js_modules,sync,window\nfrom pyscript.display import HTML,display\nfrom pyscript.fetch import fetch\nfrom pyscript.storage import Storage,storage\nfrom pyscript.websocket import WebSocket\nfrom pyscript.events import when,Event\nif not RUNNING_IN_WORKER:from pyscript.workers import create_named_worker,workers",
    "display.py": "_L='_repr_mimebundle_'\n_K='image/svg+xml'\n_J='application/json'\n_I='__repr__'\n_H='savefig'\n_G='text/html'\n_F='image/jpeg'\n_E='application/javascript'\n_D='utf-8'\n_C='text/plain'\n_B='image/png'\n_A=None\nimport base64,html,io,re\nfrom pyscript.magic_js import current_target,document,window\n_MIME_METHODS={_H:_B,'_repr_javascript_':_E,'_repr_json_':_J,'_repr_latex':'text/latex','_repr_png_':_B,'_repr_jpeg_':_F,'_repr_pdf_':'application/pdf','_repr_svg_':_K,'_repr_markdown_':'text/markdown','_repr_html_':_G,_I:_C}\ndef _render_image(mime,value,meta):\n\tA=value\n\tif isinstance(A,bytes):A=base64.b64encode(A).decode(_D)\n\tB=re.compile('^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)?$')\n\tif len(A)>0 and not B.match(A):A=base64.b64encode(A.encode(_D)).decode(_D)\n\tC=f\"data:{mime};charset=utf-8;base64,{A}\";D=' '.join(['{k}=\"{v}\"'for(A,B)in meta.items()]);return f'<img src=\"{C}\" {D}></img>'\ndef _identity(value,meta):return value\n_MIME_RENDERERS={_C:html.escape,_G:_identity,_B:lambda value,meta:_render_image(_B,value,meta),_F:lambda value,meta:_render_image(_F,value,meta),_K:_identity,_J:_identity,_E:lambda value,meta:f\"<script>{value}<\\\\/script>\"}\nclass HTML:\n\tdef __init__(A,html):A._html=html\n\tdef _repr_html_(A):return A._html\ndef _eval_formatter(obj,print_method):\n\tB=obj;A=print_method\n\tif A==_I:return repr(B)\n\tif hasattr(B,A):\n\t\tif A==_H:C=io.BytesIO();B.savefig(C,format='png');C.seek(0);return base64.b64encode(C.read()).decode(_D)\n\t\treturn getattr(B,A)()\n\tif A==_L:return{},{}\ndef _format_mime(obj):\n\tC=obj\n\tif isinstance(C,str):return html.escape(C),_C\n\tD=_eval_formatter(C,_L)\n\tif isinstance(D,tuple):E,I=D\n\telse:E=D\n\tA,F=_A,[]\n\tfor(H,B)in _MIME_METHODS.items():\n\t\tif B in E:A=E[B]\n\t\telse:A=_eval_formatter(C,H)\n\t\tif A is _A:continue\n\t\tif B not in _MIME_RENDERERS:F.append(B);continue\n\t\tbreak\n\tif A is _A:\n\t\tif F:window.console.warn(f\"Rendered object requested unavailable MIME renderers: {F}\")\n\t\tA=repr(A);B=_C\n\telif isinstance(A,tuple):A,G=A\n\telse:G={}\n\treturn _MIME_RENDERERS[B](A,G),B\ndef _write(element,value,append=False):\n\tB=element;C,D=_format_mime(value)\n\tif C=='\\\\n':return\n\tif append:A=document.createElement('div');B.append(A)\n\telse:\n\t\tA=B.lastElementChild\n\t\tif A is _A:A=B\n\tif D in(_E,_G):E=document.createRange().createContextualFragment(C);A.append(E)\n\telse:A.innerHTML=C\ndef display(*E,target=_A,append=True):\n\tD=append;A=target\n\tif A is _A:A=current_target()\n\telif not isinstance(A,str):C=f\"target must be str or None, not {A.__class__.__name__}\";raise TypeError(C)\n\telif A=='':C='Cannot have an empty target';raise ValueError(C)\n\telif A.startswith('#'):A=A[1:]\n\tB=document.getElementById(A)\n\tif B is _A:C=f\"Invalid selector with id={A}. Cannot be found in the page.\";raise ValueError(C)\n\tif B.tagName=='SCRIPT'and hasattr(B,'target'):B=B.target\n\tfor F in E:\n\t\tif not D:B.replaceChildren()\n\t\t_write(B,F,append=D)",
    "events.py": "import asyncio,inspect,sys\nfrom functools import wraps\nfrom pyscript.magic_js import document\nfrom pyscript.ffi import create_proxy\nfrom pyscript.util import is_awaitable\nfrom pyscript import config\nclass Event:\n\tdef __init__(A):A._listeners=[]\n\tdef trigger(C,result):\n\t\tB=result\n\t\tfor A in C._listeners:\n\t\t\tif is_awaitable(A):asyncio.create_task(A(B))\n\t\t\telse:A(B)\n\tdef add_listener(B,listener):\n\t\tA=listener\n\t\tif is_awaitable(A)or callable(A):\n\t\t\tif A not in B._listeners:B._listeners.append(A)\n\t\telse:C='Listener must be callable or awaitable.';raise ValueError(C)\n\tdef remove_listener(A,*B):\n\t\tif B:\n\t\t\tfor C in B:A._listeners.remove(C)\n\t\telse:A._listeners=[]\ndef when(target,*B,**D):\n\tG='handler';C=target;E=None\n\tif B and(callable(B[0])or is_awaitable(B[0])):E=B[0]\n\telif callable(D.get(G))or is_awaitable(D.get(G)):E=D.pop(G)\n\tif isinstance(C,str):\n\t\tA=B[0]if B else D.pop('selector')\n\t\tif not A:I='No selector provided.';raise ValueError(I)\n\t\tfrom pyscript.web import Element as J,ElementCollection as K\n\t\tif isinstance(A,str):F=document.querySelectorAll(A)\n\t\telif isinstance(A,J):F=[A._dom_element]\n\t\telif isinstance(A,K):F=[A._dom_element for A in A]\n\t\telse:F=A if isinstance(A,list)else[A]\n\tdef H(func):\n\t\tE='positional arguments';D='takes';A=func\n\t\tif config['type']=='mpy':\n\t\t\tif is_awaitable(A):\n\t\t\t\tasync def B(*C,**F):\n\t\t\t\t\ttry:return await A(*C,**F)\n\t\t\t\t\texcept TypeError as B:\n\t\t\t\t\t\tif D in str(B)and E in str(B):return await A()\n\t\t\t\t\t\traise\n\t\t\telse:\n\t\t\t\tdef B(*C,**F):\n\t\t\t\t\ttry:return A(*C,**F)\n\t\t\t\t\texcept TypeError as B:\n\t\t\t\t\t\tif D in str(B)and E in str(B):return A()\n\t\t\t\t\t\traise\n\t\telse:\n\t\t\tG=inspect.signature(A)\n\t\t\tif G.parameters:\n\t\t\t\tif is_awaitable(A):\n\t\t\t\t\tasync def B(event):return await A(event)\n\t\t\t\telse:B=A\n\t\t\telif is_awaitable(A):\n\t\t\t\tasync def B(*B,**C):return await A()\n\t\t\telse:\n\t\t\t\tdef B(*B,**C):return A()\n\t\tB=wraps(A)(B)\n\t\tif isinstance(C,Event):C.add_listener(B)\n\t\telif isinstance(C,list)and all(isinstance(A,Event)for A in C):\n\t\t\tfor H in C:H.add_listener(B)\n\t\telse:\n\t\t\tfor I in F:I.addEventListener(C,create_proxy(B))\n\t\treturn B\n\treturn H(E)if E else H",
    "fetch.py": "import json,js\nfrom pyscript.util import as_bytearray\nclass _Response:\n\tdef __init__(A,response):A._response=response\n\tdef __getattr__(A,attr):return getattr(A._response,attr)\n\tasync def arrayBuffer(B):\n\t\tA=await B._response.arrayBuffer()\n\t\tif hasattr(A,'to_py'):return A.to_py()\n\t\treturn memoryview(as_bytearray(A))\n\tasync def blob(A):return await A._response.blob()\n\tasync def bytearray(A):B=await A._response.arrayBuffer();return as_bytearray(B)\n\tasync def json(A):return json.loads(await A.text())\n\tasync def text(A):return await A._response.text()\nclass _DirectResponse:\n\t@staticmethod\n\tdef setup(promise,response):A=promise;A._response=_Response(response);return A._response\n\tdef __init__(B,promise):A=promise;B._promise=A;A._response=None;A.arrayBuffer=B.arrayBuffer;A.blob=B.blob;A.bytearray=B.bytearray;A.json=B.json;A.text=B.text\n\tasync def _response(A):\n\t\tif not A._promise._response:await A._promise\n\t\treturn A._promise._response\n\tasync def arrayBuffer(A):B=await A._response();return await B.arrayBuffer()\n\tasync def blob(A):B=await A._response();return await B.blob()\n\tasync def bytearray(A):B=await A._response();return await B.bytearray()\n\tasync def json(A):B=await A._response();return await B.json()\n\tasync def text(A):B=await A._response();return await B.text()\ndef fetch(url,**B):C=js.JSON.parse(json.dumps(B));D=lambda response,*B:_DirectResponse.setup(A,response);A=js.fetch(url,C).then(D);_DirectResponse(A);return A",
    "ffi.py": "try:\n\timport js;from pyodide.ffi import create_proxy as _cp,to_js as _py_tjs;from_entries=js.Object.fromEntries\n\tdef _tjs(value,**A):\n\t\tB='dict_converter'\n\t\tif not hasattr(A,B):A[B]=from_entries\n\t\treturn _py_tjs(value,**A)\nexcept:from jsffi import create_proxy as _cp;from jsffi import to_js as _tjs\ncreate_proxy=_cp\nto_js=_tjs",
    "flatted.py": "import json as _json\nclass _Known:\n\tdef __init__(A):A.key=[];A.value=[]\nclass _String:\n\tdef __init__(A,value):A.value=value\ndef _array_keys(value):\n\tA=[];B=0\n\tfor C in value:A.append(B);B+=1\n\treturn A\ndef _object_keys(value):\n\tA=[]\n\tfor B in value:A.append(B)\n\treturn A\ndef _is_array(value):return isinstance(value,(list,tuple))\ndef _is_object(value):return isinstance(value,dict)\ndef _is_string(value):return isinstance(value,str)\ndef _index(known,input,value):B=value;A=known;input.append(B);C=str(len(input)-1);A.key.append(B);A.value.append(C);return C\ndef _loop(keys,input,known,output):\n\tA=output\n\tfor B in keys:\n\t\tC=A[B]\n\t\tif isinstance(C,_String):_ref(B,input[int(C.value)],input,known,A)\n\treturn A\ndef _ref(key,value,input,known,output):\n\tB=known;A=value\n\tif _is_array(A)and A not in B:B.append(A);A=_loop(_array_keys(A),input,B,A)\n\telif _is_object(A)and A not in B:B.append(A);A=_loop(_object_keys(A),input,B,A)\n\toutput[key]=A\ndef _relate(known,input,value):\n\tB=known;A=value\n\tif _is_string(A)or _is_array(A)or _is_object(A):\n\t\ttry:return B.value[B.key.index(A)]\n\t\texcept:return _index(B,input,A)\n\treturn A\ndef _transform(known,input,value):\n\tB=known;A=value\n\tif _is_array(A):\n\t\tC=[]\n\t\tfor F in A:C.append(_relate(B,input,F))\n\t\treturn C\n\tif _is_object(A):\n\t\tD={}\n\t\tfor E in A:D[E]=_relate(B,input,A[E])\n\t\treturn D\n\treturn A\ndef _wrap(value):\n\tA=value\n\tif _is_string(A):return _String(A)\n\tif _is_array(A):\n\t\tB=0\n\t\tfor D in A:A[B]=_wrap(D);B+=1\n\telif _is_object(A):\n\t\tfor C in A:A[C]=_wrap(A[C])\n\treturn A\ndef parse(value,*C,**D):\n\tA=value;E=_json.loads(A,*C,**D);B=[]\n\tfor A in E:B.append(_wrap(A))\n\tinput=[]\n\tfor A in B:\n\t\tif isinstance(A,_String):input.append(A.value)\n\t\telse:input.append(A)\n\tA=input[0]\n\tif _is_array(A):return _loop(_array_keys(A),input,[A],A)\n\tif _is_object(A):return _loop(_object_keys(A),input,[A],A)\n\treturn A\ndef stringify(value,*D,**E):\n\tB=_Known();input=[];C=[];A=int(_index(B,input,value))\n\twhile A<len(input):C.append(_transform(B,input,input[A]));A+=1\n\treturn _json.dumps(C,*D,**E)",
    "fs.py": "mounted={}\nasync def mount(path,mode='readwrite',root='',id='pyscript'):\n\tE=path;import js;from _pyscript import fs as A,interpreter as I;from pyscript.ffi import to_js as H;from pyscript.magic_js import RUNNING_IN_WORKER as J,sync;js.console.warn('experimental pyscript.fs ⚠️');B=None;C=f\"{E}@{id}\";F={'id':id,'mode':mode}\n\tif root!='':F['startIn']=root\n\tif J:\n\t\tG=sync.storeFSHandler(C,H(F))\n\t\tif isinstance(G,bool):D=G\n\t\telse:D=await G\n\t\tif D:from polyscript import IDBMap as K;L=K.new(A.NAMESPACE);B=await L.get(C)\n\t\telse:raise RuntimeError(A.ERROR)\n\telse:\n\t\tD=await A.idb.has(C)\n\t\tif D:B=await A.idb.get(C)\n\t\telse:B=await A.getFileSystemDirectoryHandle(H(F));await A.idb.set(C,B)\n\tmounted[E]=await I.mountNativeFS(E,B)\nasync def sync(path):await mounted[path].syncfs()\nasync def unmount(path):from _pyscript import interpreter as A;await sync(path);A._module.FS.unmount(path)",
    "magic_js.py": "import json,sys,js as globalThis\nfrom polyscript import config as _config,js_modules\nfrom pyscript.util import NotSupported\nRUNNING_IN_WORKER=not hasattr(globalThis,'document')\nconfig=json.loads(globalThis.JSON.stringify(_config))\nif'MicroPython'in sys.version:config['type']='mpy'\nelse:config['type']='py'\nclass JSModule:\n\tdef __init__(A,name):A.name=name\n\tdef __getattr__(B,field):\n\t\tA=field\n\t\tif not A.startswith('_'):return getattr(getattr(js_modules,B.name),A)\nfor name in globalThis.Reflect.ownKeys(js_modules):sys.modules[f\"pyscript.js_modules.{name}\"]=JSModule(name)\nsys.modules['pyscript.js_modules']=js_modules\nif RUNNING_IN_WORKER:\n\timport polyscript;PyWorker=NotSupported('pyscript.PyWorker','pyscript.PyWorker works only when running in the main thread')\n\ttry:import js;window=polyscript.xworker.window;document=window.document;js.document=document;js_import=window.Function('return (...urls) => Promise.all(urls.map((url) => import(url)))')()\n\texcept:message='Unable to use `window` or `document` -> https://docs.pyscript.net/latest/faq/#sharedarraybuffer';globalThis.console.warn(message);window=NotSupported('pyscript.window',message);document=NotSupported('pyscript.document',message);js_import=None\n\tsync=polyscript.xworker.sync\n\tdef current_target():return polyscript.target\nelse:\n\timport _pyscript;from _pyscript import PyWorker,js_import;window=globalThis;document=globalThis.document;sync=NotSupported('pyscript.sync','pyscript.sync works only when running in a worker')\n\tdef current_target():return _pyscript.target",
    "media.py": "from pyscript import window\nfrom pyscript.ffi import to_js\nclass Device:\n\tdef __init__(A,device):A._dom_element=device\n\t@property\n\tdef id(self):return self._dom_element.deviceId\n\t@property\n\tdef group(self):return self._dom_element.groupId\n\t@property\n\tdef kind(self):return self._dom_element.kind\n\t@property\n\tdef label(self):return self._dom_element.label\n\tdef __getitem__(A,key):return getattr(A,key)\n\t@classmethod\n\tasync def load(E,audio=False,video=True):\n\t\tC='video';B=video;A={};A['audio']=audio\n\t\tif isinstance(B,bool):A[C]=B\n\t\telse:\n\t\t\tA[C]={}\n\t\t\tfor D in B:A[C][D]=B[D]\n\t\treturn await window.navigator.mediaDevices.getUserMedia(to_js(A))\n\tasync def get_stream(A):B=A.kind.replace('input','').replace('output','');C={B:{'deviceId':{'exact':A.id}}};return await A.load(**C)\nasync def list_devices():return[Device(A)for A in await window.navigator.mediaDevices.enumerateDevices()]",
    "storage.py": "_C='memoryview'\n_B='bytearray'\n_A='generic'\nfrom polyscript import storage as _storage\nfrom pyscript.flatted import parse as _parse\nfrom pyscript.flatted import stringify as _stringify\ndef _to_idb(value):\n\tA=value\n\tif A is None:return _stringify(['null',0])\n\tif isinstance(A,(bool,float,int,str,list,dict,tuple)):return _stringify([_A,A])\n\tif isinstance(A,bytearray):return _stringify([_B,list(A)])\n\tif isinstance(A,memoryview):return _stringify([_C,list(A)])\n\tB=f\"Unexpected value: {A}\";raise TypeError(B)\ndef _from_idb(value):\n\tC=value;A,B=_parse(C)\n\tif A=='null':return\n\tif A==_A:return B\n\tif A==_B:return bytearray(B)\n\tif A==_C:return memoryview(bytearray(B))\n\treturn C\nclass Storage(dict):\n\tdef __init__(B,store):A=store;super().__init__({A:_from_idb(B)for(A,B)in A.entries()});B.__store__=A\n\tdef __delitem__(A,attr):A.__store__.delete(attr);super().__delitem__(attr)\n\tdef __setitem__(B,attr,value):A=value;B.__store__.set(attr,_to_idb(A));super().__setitem__(attr,A)\n\tdef clear(A):A.__store__.clear();super().clear()\n\tasync def sync(A):await A.__store__.sync()\nasync def storage(name='',storage_class=Storage):\n\tif not name:A='The storage name must be defined';raise ValueError(A)\n\treturn storage_class(await _storage(f\"@pyscript/{name}\"))",
    "util.py": "import js,sys,inspect\ndef as_bytearray(buffer):\n\tA=js.Uint8Array.new(buffer);B=A.length;C=bytearray(B)\n\tfor D in range(B):C[D]=A[D]\n\treturn C\nclass NotSupported:\n\tdef __init__(A,name,error):object.__setattr__(A,'name',name);object.__setattr__(A,'error',error)\n\tdef __repr__(A):return f\"<NotSupported {A.name} [{A.error}]>\"\n\tdef __getattr__(A,attr):raise AttributeError(A.error)\n\tdef __setattr__(A,attr,value):raise AttributeError(A.error)\n\tdef __call__(A,*B):raise TypeError(A.error)\ndef is_awaitable(obj):\n\tA=obj;from pyscript import config as B\n\tif B['type']=='mpy':\n\t\tif'<closure <generator>'in repr(A):return True\n\t\treturn inspect.isgeneratorfunction(A)\n\treturn inspect.iscoroutinefunction(A)",
    "web.py": "_C='htmlFor'\n_B='on_'\n_A=None\nfrom pyscript import document,when,Event\nfrom pyscript.ffi import create_proxy\ndef wrap_dom_element(dom_element):return Element.wrap_dom_element(dom_element)\nclass Element:\n\telement_classes_by_tag_name={}\n\t@classmethod\n\tdef get_tag_name(A):return A.__name__.replace('_','')\n\t@classmethod\n\tdef register_element_classes(B,element_classes):\n\t\tfor A in element_classes:C=A.get_tag_name();B.element_classes_by_tag_name[C]=A\n\t@classmethod\n\tdef unregister_element_classes(A,element_classes):\n\t\tfor B in element_classes:C=B.get_tag_name();A.element_classes_by_tag_name.pop(C,_A)\n\t@classmethod\n\tdef wrap_dom_element(A,dom_element):B=dom_element;C=A.element_classes_by_tag_name.get(B.tagName.lower(),A);return C(dom_element=B)\n\tdef __init__(A,dom_element=_A,classes=_A,style=_A,**E):\n\t\tA._dom_element=dom_element or document.createElement(type(A).get_tag_name());A._on_events={};C={}\n\t\tfor(B,D)in E.items():\n\t\t\tif B.startswith(_B):F=A.get_event(B);F.add_listener(D)\n\t\t\telse:C[B]=D\n\t\tA._classes=Classes(A);A._style=Style(A);A.update(classes=classes,style=style,**C)\n\tdef __eq__(A,obj):return isinstance(obj,Element)and obj._dom_element==A._dom_element\n\tdef __getitem__(B,key):\n\t\tA=key\n\t\tif isinstance(A,(int,slice)):return B.children[A]\n\t\treturn B.find(A)\n\tdef __getattr__(B,name):\n\t\tA=name\n\t\tif A.startswith(_B):return B.get_event(A)\n\t\tif A.endswith('_'):A=A[:-1]\n\t\tif A=='for':A=_C\n\t\treturn getattr(B._dom_element,A)\n\tdef __setattr__(C,name,value):\n\t\tB=value;A=name\n\t\tif A.startswith('_'):super().__setattr__(A,B)\n\t\telse:\n\t\t\tif A.endswith('_'):A=A[:-1]\n\t\t\tif A=='for':A=_C\n\t\t\tif A.startswith(_B):C._on_events[A]=B\n\t\t\tsetattr(C._dom_element,A,B)\n\tdef get_event(A,name):\n\t\tB=name\n\t\tif not B.startswith(_B):C=\"Event names must start with 'on_'.\";raise ValueError(C)\n\t\tD=B[3:]\n\t\tif not hasattr(A._dom_element,D):C=f\"Element has no '{D}' event.\";raise ValueError(C)\n\t\tif B in A._on_events:return A._on_events[B]\n\t\tE=Event();A._on_events[B]=E;A._dom_element.addEventListener(D,create_proxy(E.trigger));return E\n\t@property\n\tdef children(self):return ElementCollection.wrap_dom_elements(self._dom_element.children)\n\t@property\n\tdef classes(self):return self._classes\n\t@property\n\tdef parent(self):\n\t\tif self._dom_element.parentElement is _A:return\n\t\treturn Element.wrap_dom_element(self._dom_element.parentElement)\n\t@property\n\tdef style(self):return self._style\n\tdef append(B,*C):\n\t\tfor A in C:\n\t\t\tif isinstance(A,Element):B._dom_element.appendChild(A._dom_element)\n\t\t\telif isinstance(A,ElementCollection):\n\t\t\t\tfor D in A:B._dom_element.appendChild(D._dom_element)\n\t\t\telif isinstance(A,(list,tuple)):\n\t\t\t\tfor E in A:B.append(E)\n\t\t\telse:\n\t\t\t\ttry:A.tagName;B._dom_element.appendChild(A)\n\t\t\t\texcept AttributeError:\n\t\t\t\t\ttry:\n\t\t\t\t\t\tA.length\n\t\t\t\t\t\tfor F in A:B._dom_element.appendChild(F)\n\t\t\t\t\texcept AttributeError:G=f'Element \"{A}\" is a proxy object, \"but not a valid element or a NodeList.';raise TypeError(G)\n\tdef clone(B,clone_id=_A):A=Element.wrap_dom_element(B._dom_element.cloneNode(True));A.id=clone_id;return A\n\tdef find(A,selector):return ElementCollection.wrap_dom_elements(A._dom_element.querySelectorAll(selector))\n\tdef show_me(A):A._dom_element.scrollIntoView()\n\tdef update(A,classes=_A,style=_A,**D):\n\t\tC=style;B=classes\n\t\tif B:A.classes.add(B)\n\t\tif C:A.style.set(**C)\n\t\tfor(E,F)in D.items():setattr(A,E,F)\nclass Classes:\n\tdef __init__(A,element):A._element=element;A._class_list=A._element._dom_element.classList\n\tdef __contains__(A,item):return item in A._class_list\n\tdef __eq__(C,other):\n\t\tA=other\n\t\tif isinstance(A,Classes):B=list(A._class_list)\n\t\telse:\n\t\t\ttry:B=iter(A)\n\t\t\texcept TypeError:return False\n\t\treturn set(C._class_list)==set(B)\n\tdef __iter__(A):return iter(A._class_list)\n\tdef __len__(A):return A._class_list.length\n\tdef __repr__(A):return f\"Classes({\", \".join(A._class_list)})\"\n\tdef __str__(A):return' '.join(A._class_list)\n\tdef add(B,*C):\n\t\tfor A in C:\n\t\t\tif isinstance(A,list):\n\t\t\t\tfor D in A:B.add(D)\n\t\t\telse:B._class_list.add(A)\n\tdef contains(A,class_name):return class_name in A\n\tdef remove(B,*C):\n\t\tfor A in C:\n\t\t\tif isinstance(A,list):\n\t\t\t\tfor D in A:B.remove(D)\n\t\t\telse:B._class_list.remove(A)\n\tdef replace(A,old_class,new_class):A.remove(old_class);A.add(new_class)\n\tdef toggle(A,*C):\n\t\tfor B in C:\n\t\t\tif B in A:A.remove(B)\n\t\t\telse:A.add(B)\nclass HasOptions:\n\t@property\n\tdef options(self):\n\t\tA=self\n\t\tif not hasattr(A,'_options'):A._options=Options(A)\n\t\treturn A._options\nclass Options:\n\tdef __init__(A,element):A._element=element\n\tdef __getitem__(A,key):return A.options[key]\n\tdef __iter__(A):yield from A.options\n\tdef __len__(A):return len(A.options)\n\tdef __repr__(A):return f\"{A.__class__.__name__} (length: {len(A)}) {A.options}\"\n\t@property\n\tdef options(self):return[Element.wrap_dom_element(A)for A in self._element._dom_element.options]\n\t@property\n\tdef selected(self):return self.options[self._element._dom_element.selectedIndex]\n\tdef add(D,value=_A,html=_A,text=_A,before=_A,**B):\n\t\tC=value;A=before\n\t\tif C is not _A:B['value']=C\n\t\tif html is not _A:B['innerHTML']=html\n\t\tif text is not _A:B['text']=text\n\t\tE=option(**B)\n\t\tif A and isinstance(A,Element):A=A._dom_element\n\t\tD._element._dom_element.add(E._dom_element,A)\n\tdef clear(A):\n\t\twhile len(A)>0:A.remove(0)\n\tdef remove(A,index):A._element._dom_element.remove(index)\nclass Style:\n\tdef __init__(A,element):A._element=element;A._style=A._element._dom_element.style\n\tdef __getitem__(A,key):return A._style.getPropertyValue(key)\n\tdef __setitem__(A,key,value):A._style.setProperty(key,value)\n\tdef remove(A,key):A._style.removeProperty(key)\n\tdef set(A,**B):\n\t\tfor(C,D)in B.items():A._element._dom_element.style.setProperty(C,D)\n\t@property\n\tdef visible(self):return self._element._dom_element.style.visibility\n\t@visible.setter\n\tdef visible(self,value):self._element._dom_element.style.visibility=value\nclass ContainerElement(Element):\n\tdef __init__(B,*C,children=_A,dom_element=_A,style=_A,classes=_A,**D):\n\t\tsuper().__init__(dom_element=dom_element,style=style,classes=classes,**D)\n\t\tfor A in list(C)+(children or[]):\n\t\t\tif isinstance(A,(Element,ElementCollection)):B.append(A)\n\t\t\telse:B._dom_element.insertAdjacentHTML('beforeend',A)\n\tdef __iter__(A):yield from A.children\nclass ClassesCollection:\n\tdef __init__(A,collection):A._collection=collection\n\tdef __contains__(A,class_name):\n\t\tfor B in A._collection:\n\t\t\tif class_name in B.classes:return True\n\t\treturn False\n\tdef __eq__(B,other):A=other;return isinstance(A,ClassesCollection)and B._collection==A._collection\n\tdef __iter__(A):yield from A._all_class_names()\n\tdef __len__(A):return len(A._all_class_names())\n\tdef __repr__(A):return f\"ClassesCollection({A._collection!r})\"\n\tdef __str__(A):return' '.join(A._all_class_names())\n\tdef add(A,*B):\n\t\tfor C in A._collection:C.classes.add(*B)\n\tdef contains(A,class_name):return class_name in A\n\tdef remove(A,*B):\n\t\tfor C in A._collection:C.classes.remove(*B)\n\tdef replace(A,old_class,new_class):\n\t\tfor B in A._collection:B.classes.replace(old_class,new_class)\n\tdef toggle(A,*B):\n\t\tfor C in A._collection:C.classes.toggle(*B)\n\tdef _all_class_names(B):\n\t\tA=set()\n\t\tfor C in B._collection:\n\t\t\tfor D in C.classes:A.add(D)\n\t\treturn A\nclass StyleCollection:\n\tdef __init__(A,collection):A._collection=collection\n\tdef __getitem__(A,key):return[A.style[key]for A in A._collection._elements]\n\tdef __setitem__(A,key,value):\n\t\tfor B in A._collection._elements:B.style[key]=value\n\tdef __repr__(A):return f\"StyleCollection({A._collection!r})\"\n\tdef remove(A,key):\n\t\tfor B in A._collection._elements:B.style.remove(key)\nclass ElementCollection:\n\t@classmethod\n\tdef wrap_dom_elements(A,dom_elements):return A([Element.wrap_dom_element(A)for A in dom_elements])\n\tdef __init__(A,elements):A._elements=elements;A._classes=ClassesCollection(A);A._style=StyleCollection(A)\n\tdef __eq__(A,obj):return isinstance(obj,ElementCollection)and obj._elements==A._elements\n\tdef __getitem__(B,key):\n\t\tA=key\n\t\tif isinstance(A,int):return B._elements[A]\n\t\tif isinstance(A,slice):return ElementCollection(B._elements[A])\n\t\treturn B.find(A)\n\tdef __iter__(A):yield from A._elements\n\tdef __len__(A):return len(A._elements)\n\tdef __repr__(A):return f\"{A.__class__.__name__} (length: {len(A._elements)}) {A._elements}\"\n\tdef __getattr__(A,name):return[getattr(A,name)for A in A._elements]\n\tdef __setattr__(C,name,value):\n\t\tB=value;A=name\n\t\tif A.startswith('_'):super().__setattr__(A,B)\n\t\telse:\n\t\t\tfor D in C._elements:setattr(D,A,B)\n\t@property\n\tdef classes(self):return self._classes\n\t@property\n\tdef elements(self):return self._elements\n\t@property\n\tdef style(self):return self._style\n\tdef find(B,selector):\n\t\tA=[]\n\t\tfor C in B._elements:A.extend(C.find(selector))\n\t\treturn ElementCollection(A)\nclass a(ContainerElement):0\nclass abbr(ContainerElement):0\nclass address(ContainerElement):0\nclass area(Element):0\nclass article(ContainerElement):0\nclass aside(ContainerElement):0\nclass audio(ContainerElement):0\nclass b(ContainerElement):0\nclass base(Element):0\nclass blockquote(ContainerElement):0\nclass body(ContainerElement):0\nclass br(Element):0\nclass button(ContainerElement):0\nclass canvas(ContainerElement):\n\tdef download(A,filename='snapped.png'):B=a(download=filename,href=A._dom_element.toDataURL());A.append(B);B._dom_element.click()\n\tdef draw(E,what,width=_A,height=_A):\n\t\tC=height;B=width;A=what\n\t\tif isinstance(A,Element):A=A._dom_element\n\t\tD=E._dom_element.getContext('2d')\n\t\tif B or C:D.drawImage(A,0,0,B,C)\n\t\telse:D.drawImage(A,0,0)\nclass caption(ContainerElement):0\nclass cite(ContainerElement):0\nclass code(ContainerElement):0\nclass col(Element):0\nclass colgroup(ContainerElement):0\nclass data(ContainerElement):0\nclass datalist(ContainerElement,HasOptions):0\nclass dd(ContainerElement):0\nclass del_(ContainerElement):0\nclass details(ContainerElement):0\nclass dialog(ContainerElement):0\nclass div(ContainerElement):0\nclass dl(ContainerElement):0\nclass dt(ContainerElement):0\nclass em(ContainerElement):0\nclass embed(Element):0\nclass fieldset(ContainerElement):0\nclass figcaption(ContainerElement):0\nclass figure(ContainerElement):0\nclass footer(ContainerElement):0\nclass form(ContainerElement):0\nclass h1(ContainerElement):0\nclass h2(ContainerElement):0\nclass h3(ContainerElement):0\nclass h4(ContainerElement):0\nclass h5(ContainerElement):0\nclass h6(ContainerElement):0\nclass head(ContainerElement):0\nclass header(ContainerElement):0\nclass hgroup(ContainerElement):0\nclass hr(Element):0\nclass html(ContainerElement):0\nclass i(ContainerElement):0\nclass iframe(ContainerElement):0\nclass img(Element):0\nclass input_(Element):0\nclass ins(ContainerElement):0\nclass kbd(ContainerElement):0\nclass label(ContainerElement):0\nclass legend(ContainerElement):0\nclass li(ContainerElement):0\nclass link(Element):0\nclass main(ContainerElement):0\nclass map_(ContainerElement):0\nclass mark(ContainerElement):0\nclass menu(ContainerElement):0\nclass meta(ContainerElement):0\nclass meter(ContainerElement):0\nclass nav(ContainerElement):0\nclass object_(ContainerElement):0\nclass ol(ContainerElement):0\nclass optgroup(ContainerElement,HasOptions):0\nclass option(ContainerElement):0\nclass output(ContainerElement):0\nclass p(ContainerElement):0\nclass param(ContainerElement):0\nclass picture(ContainerElement):0\nclass pre(ContainerElement):0\nclass progress(ContainerElement):0\nclass q(ContainerElement):0\nclass s(ContainerElement):0\nclass script(ContainerElement):0\nclass section(ContainerElement):0\nclass select(ContainerElement,HasOptions):0\nclass small(ContainerElement):0\nclass source(Element):0\nclass span(ContainerElement):0\nclass strong(ContainerElement):0\nclass style(ContainerElement):0\nclass sub(ContainerElement):0\nclass summary(ContainerElement):0\nclass sup(ContainerElement):0\nclass table(ContainerElement):0\nclass tbody(ContainerElement):0\nclass td(ContainerElement):0\nclass template(ContainerElement):0\nclass textarea(ContainerElement):0\nclass tfoot(ContainerElement):0\nclass th(ContainerElement):0\nclass thead(ContainerElement):0\nclass time(ContainerElement):0\nclass title(ContainerElement):0\nclass tr(ContainerElement):0\nclass track(Element):0\nclass u(ContainerElement):0\nclass ul(ContainerElement):0\nclass var(ContainerElement):0\nclass video(ContainerElement):\n\tdef snap(E,to=_A,width=_A,height=_A):\n\t\tH='CANVAS';G='Element to snap to must be a canvas.';C=height;B=width;A=to;B=B if B is not _A else E.videoWidth;C=C if C is not _A else E.videoHeight\n\t\tif A is _A:A=canvas(width=B,height=C)\n\t\telif isinstance(A,Element):\n\t\t\tif A.tag!='canvas':D=G;raise TypeError(D)\n\t\telif getattr(A,'tagName','')==H:A=canvas(dom_element=A)\n\t\telif isinstance(A,str):\n\t\t\tF=document.querySelectorAll(A)\n\t\t\tif F.length==0:D='No element with selector {to} to snap to.';raise TypeError(D)\n\t\t\tif F[0].tagName!=H:D=G;raise TypeError(D)\n\t\t\tA=canvas(dom_element=F[0])\n\t\tA.draw(E,B,C);return A\nclass wbr(Element):0\nELEMENT_CLASSES=[a,abbr,address,area,article,aside,audio,b,base,blockquote,body,br,button,canvas,caption,cite,code,col,colgroup,data,datalist,dd,del_,details,dialog,div,dl,dt,em,embed,fieldset,figcaption,figure,footer,form,h1,h2,h3,h4,h5,h6,head,header,hgroup,hr,html,i,iframe,img,input_,ins,kbd,label,legend,li,link,main,map_,mark,menu,meta,meter,nav,object_,ol,optgroup,option,output,p,param,picture,pre,progress,q,s,script,section,select,small,source,span,strong,style,sub,summary,sup,table,tbody,td,template,textarea,tfoot,th,thead,time,title,tr,track,u,ul,var,video,wbr]\nElement.register_element_classes(ELEMENT_CLASSES)\nclass Page:\n\tdef __init__(A):A.html=Element.wrap_dom_element(document.documentElement);A.body=Element.wrap_dom_element(document.body);A.head=Element.wrap_dom_element(document.head)\n\tdef __getitem__(A,selector):return A.find(selector)\n\t@property\n\tdef title(self):return document.title\n\t@title.setter\n\tdef title(self,value):document.title=value\n\tdef append(A,*B):A.body.append(*B)\n\tdef find(A,selector):return ElementCollection.wrap_dom_elements(document.querySelectorAll(selector))\npage=Page()",
    "websocket.py": "import js\nfrom pyscript.ffi import create_proxy\nfrom pyscript.util import as_bytearray\ncode='code'\nprotocols='protocols'\nreason='reason'\nmethods=['onclose','onerror','onmessage','onopen']\nclass EventMessage:\n\tdef __init__(A,event):A._event=event\n\tdef __getattr__(B,attr):\n\t\tA=getattr(B._event,attr)\n\t\tif attr=='data'and not isinstance(A,str):\n\t\t\tif hasattr(A,'to_py'):return A.to_py()\n\t\t\treturn memoryview(as_bytearray(A))\n\t\treturn A\nclass WebSocket:\n\tCONNECTING=0;OPEN=1;CLOSING=2;CLOSED=3\n\tdef __init__(E,**A):\n\t\tD=A['url']\n\t\tif protocols in A:B=js.WebSocket.new(D,A[protocols])\n\t\telse:B=js.WebSocket.new(D)\n\t\tobject.__setattr__(E,'_ws',B)\n\t\tfor C in methods:\n\t\t\tif C in A:setattr(B,C,create_proxy(A[C]))\n\tdef __getattr__(A,attr):return getattr(A._ws,attr)\n\tdef __setattr__(B,attr,value):\n\t\tC=value;A=attr\n\t\tif A in methods:D=lambda e:C(EventMessage(e));setattr(B._ws,A,create_proxy(D))\n\t\telse:setattr(B._ws,A,C)\n\tdef close(B,**A):\n\t\tif code in A and reason in A:B._ws.close(A[code],A[reason])\n\t\telif code in A:B._ws.close(A[code])\n\t\telse:B._ws.close()\n\tdef send(B,data):\n\t\tA=data\n\t\tif isinstance(A,str):B._ws.send(A)\n\t\telse:\n\t\t\tC=js.Uint8Array.new(len(A))\n\t\t\tfor(D,E)in enumerate(A):C[D]=E\n\t\t\tB._ws.send(C)",
    "workers.py": "import js as _js\nfrom polyscript import workers as _workers\n_get=_js.Reflect.get\ndef _set(script,name,value=''):script.setAttribute(name,value)\nclass _ReadOnlyProxy:\n\tdef __getitem__(A,name):return _get(_workers,name)\n\tdef __getattr__(A,name):return _get(_workers,name)\nworkers=_ReadOnlyProxy()\nasync def create_named_worker(src='',name='',config=None,type='py'):\n\tC=name;B=config;from json import dumps\n\tif not src:D='Named workers require src';raise ValueError(D)\n\tif not C:D='Named workers require a name';raise ValueError(D)\n\tA=_js.document.createElement('script');A.type=type;A.src=src;_set(A,'worker');_set(A,'name',C)\n\tif B:_set(A,'config',isinstance(B,str)and B or dumps(B))\n\t_js.document.body.append(A);return await workers[C]"
  }
};

/**
 * Create through Python the pyscript module through
 * the artifact generated at build time.
 * This the returned value is a string that must be used
 * either before a worker execute code or when the module
 * is registered on the main thread.
 */


class Ignore extends Array {
    #add = false;
    #paths;
    #array;
    constructor(array, ...paths) {
        super();
        this.#array = array;
        this.#paths = paths;
    }
    push(...values) {
        if (this.#add) super.push(...values);
        return this.#array.push(...values);
    }
    path(path) {
        for (const _path of this.#paths) {
            // bails out at the first `true` value
            if ((this.#add = path.startsWith(_path))) break;
        }
    }
}

const { entries } = Object;

const python = [
    "import os as _os",
    "from pathlib import Path as _Path",
    "_path = None",
];

const ignore = new Ignore(python, "-");

const write = (base, literal) => {
    for (const [key, value] of entries(literal)) {
        ignore.path(`${base}/${key}`);
        ignore.push(`_path = _Path("${base}/${key}")`);
        if (typeof value === "string") {
            const code = JSON.stringify(value);
            ignore.push(`_path.write_text(${code},encoding="utf-8")`);
        } else {
            // @see https://github.com/pyscript/pyscript/pull/1813#issuecomment-1781502909
            ignore.push(`if not _os.path.exists("${base}/${key}"):`);
            ignore.push("    _path.mkdir(parents=True, exist_ok=True)");
            write(`${base}/${key}`, value);
        }
    }
};

write(".", pyscript);

// in order to fix js.document in the Worker case
// we need to bootstrap pyscript module ASAP
python.push("import pyscript as _pyscript");

python.push(
    ...["_Path", "_path", "_os", "_pyscript"].map((ref) => `del ${ref}`),
);
python.push("\n");

const stdlib = python.join("\n");
const optional = ignore.join("\n");

const main = (name) => hooks.main[name];
const worker = (name) => hooks.worker[name];

const code = (hooks, branch, key, lib) => {
    hooks[key] = () => {
        const arr = lib ? [lib] : [];
        arr.push(...branch(key));
        return arr.map(dedent).join("\n");
    };
};

const codeFor = (branch, type) => {
    const pylib = type === "mpy" ? stdlib.replace(optional, "") : stdlib;
    const hooks = {};
    code(hooks, branch, `codeBeforeRun`, pylib);
    code(hooks, branch, `codeBeforeRunAsync`, pylib);
    code(hooks, branch, `codeAfterRun`);
    code(hooks, branch, `codeAfterRunAsync`);
    return hooks;
};

const createFunction = (self, name) => {
    const cbs = [...worker(name)];
    if (cbs.length) {
        const cb = toJSONCallback(
            self[`_${name}`] ||
                (name.endsWith("Async")
                    ? async (wrap, xworker, ...cbs) => {
                          for (const cb of cbs) await cb(wrap, xworker);
                      }
                    : (wrap, xworker, ...cbs) => {
                          for (const cb of cbs) cb(wrap, xworker);
                      }),
        );
        const a = cbs.map(toJSONCallback).join(", ");
        return Function(`return(w,x)=>(${cb})(w,x,...[${a}])`)();
    }
};

const SetFunction = typedSet({ typeof: "function" });
const SetString = typedSet({ typeof: "string" });

const inputFailure = `
    import builtins
    def input(prompt=""):
        raise Exception("\\n           ".join([
            "input() doesn't work when PyScript runs in the main thread.",
            "Consider using the worker attribute: https://pyscript.github.io/docs/2023.11.2/user-guide/workers/"
        ]))

    builtins.input = input
    del builtins
    del input
`;

const hooks = {
    main: {
        /** @type {Set<function>} */
        onWorker: new SetFunction(),
        /** @type {Set<function>} */
        onReady: new SetFunction(),
        /** @type {Set<function>} */
        onBeforeRun: new SetFunction(),
        /** @type {Set<function>} */
        onBeforeRunAsync: new SetFunction(),
        /** @type {Set<function>} */
        onAfterRun: new SetFunction(),
        /** @type {Set<function>} */
        onAfterRunAsync: new SetFunction(),
        /** @type {Set<string>} */
        codeBeforeRun: new SetString([inputFailure]),
        /** @type {Set<string>} */
        codeBeforeRunAsync: new SetString(),
        /** @type {Set<string>} */
        codeAfterRun: new SetString(),
        /** @type {Set<string>} */
        codeAfterRunAsync: new SetString(),
    },
    worker: {
        /** @type {Set<function>} */
        onReady: new SetFunction(),
        /** @type {Set<function>} */
        onBeforeRun: new SetFunction(),
        /** @type {Set<function>} */
        onBeforeRunAsync: new SetFunction([
            ({ interpreter }) => {
                interpreter.registerJsModule("_pyscript", {
                    // cannot be imported from fs.js
                    // because this code is stringified
                    fs: {
                        ERROR: "storage permissions not granted",
                        NAMESPACE: "@pyscript.fs",
                    },
                    interpreter,
                });
            },
        ]),
        /** @type {Set<function>} */
        onAfterRun: new SetFunction(),
        /** @type {Set<function>} */
        onAfterRunAsync: new SetFunction(),
        /** @type {Set<string>} */
        codeBeforeRun: new SetString(),
        /** @type {Set<string>} */
        codeBeforeRunAsync: new SetString(),
        /** @type {Set<string>} */
        codeAfterRun: new SetString(),
        /** @type {Set<string>} */
        codeAfterRunAsync: new SetString(),
    },
};

// lazy loaded on-demand codemirror related files
var codemirror = {
    get core() {
        return import(/* webpackIgnore: true */ './codemirror-BzXPW6J5.js');
    },
    get state() {
        return import(
            /* webpackIgnore: true */ './codemirror_state-CHwVj1Bg.js'
        );
    },
    get python() {
        return import(
            /* webpackIgnore: true */ './codemirror_lang-python-CizS0RIx.js'
        );
    },
    get language() {
        return import(
            /* webpackIgnore: true */ './codemirror_language-BY_fbsPX.js'
        ).then(function (n) { return n.x; });
    },
    get view() {
        return import(
            /* webpackIgnore: true */ './codemirror_view-DJs98ugv.js'
        ).then(function (n) { return n.t; });
    },
    get commands() {
        return import(
            /* webpackIgnore: true */ './codemirror_commands-DSpbNciD.js'
        );
    },
};

var codemirror$1 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    default: codemirror
});

/*! (c) PyScript Development Team */


const donkey = (options) =>
    import(/* webpackIgnore: true */ './donkey-C7TYn_Hu.js').then((module) =>
        module.default(options),
    );

// generic helper to disambiguate between custom element and script
const isScript = ({ tagName }) => tagName === "SCRIPT";

// Used to create either Pyodide or MicroPython workers
// with the PyScript module available within the code
const [PyWorker, MPWorker] = [...TYPES.entries()].map(
    ([TYPE, interpreter]) =>
        /**
         * A `Worker` facade able to bootstrap on the worker thread only a PyScript module.
         * @param {string} file the python file to run ina worker.
         * @param {{config?: string | object, async?: boolean}} [options] optional configuration for the worker.
         * @returns {Promise<Worker & {sync: object}>}
         */
        async function PyScriptWorker(file, options) {
            await configs.get(TYPE).plugins;
            const xworker = XWorker.call(
                new Hook(null, hooked.get(TYPE)),
                file,
                {
                    ...options,
                    type: interpreter,
                },
            );
            assign$3(xworker.sync, sync);
            return xworker.ready;
        },
);

// avoid multiple initialization of the same library
const [
    {
        PyWorker: exportedPyWorker,
        MPWorker: exportedMPWorker,
        hooks: exportedHooks,
        config: exportedConfig,
        whenDefined: exportedWhenDefined,
    },
    alreadyLive,
] = stickyModule$1("@pyscript/core", {
    PyWorker,
    MPWorker,
    hooks,
    config: {},
    whenDefined,
});

const offline_interpreter = (config) =>
    config?.interpreter && relative_url(config.interpreter);

const hooked = new Map();

for (const [TYPE, interpreter] of TYPES) {
    // avoid any dance if the module already landed
    if (alreadyLive) break;

    const dispatchDone = (element, isAsync, result) => {
        if (isAsync) result.then(() => dispatch(element, TYPE, "done"));
        else dispatch(element, TYPE, "done");
    };

    const { config, configURL, plugins, error } = configs.get(TYPE);

    // create a unique identifier when/if needed
    let id = 0;
    const getID = (prefix = TYPE) => `${prefix}-${id++}`;

    /**
     * Given a generic DOM Element, tries to fetch the 'src' attribute, if present.
     * It either throws an error if the 'src' can't be fetched or it returns a fallback
     * content as source.
     */
    const fetchSource = async (tag, io, asText) => {
        if (tag.hasAttribute("src")) {
            try {
                return await robustFetch(tag.getAttribute("src")).then(getText);
            } catch (error) {
                io.stderr(error);
            }
        }

        if (asText) return dedent(tag.textContent);

        const code = dedent(unescape(tag.innerHTML));
        console.warn(
            `Deprecated: use <script type="${TYPE}"> for an always safe content parsing:\n`,
            code,
        );
        return code;
    };

    // register once any interpreter
    let alreadyRegistered = false;

    // allows lazy element features on code evaluation
    let currentElement;

    const registerModule = ({ XWorker, interpreter, io }) => {
        // avoid multiple registration of the same interpreter
        if (alreadyRegistered) return;
        alreadyRegistered = true;

        // automatically use the pyscript stderr (when/if defined)
        // this defaults to console.error
        function PyWorker(...args) {
            const worker = XWorker(...args);
            worker.onerror = ({ error }) => io.stderr(error);
            return worker;
        }

        // enrich the Python env with some JS utility for main
        interpreter.registerJsModule("_pyscript", {
            PyWorker,
            fs,
            interpreter,
            js_import: (...urls) => Promise.all(urls.map((url) => import(url))),
            get target() {
                return isScript(currentElement)
                    ? currentElement.target.id
                    : currentElement.id;
            },
        });
    };

    // define the module as both `<script type="py">` and `<py-script>`
    // but only if the config didn't throw an error
    if (!error) {
        // ensure plugins are bootstrapped already before custom type definition
        // NOTE: we cannot top-level await in here as plugins import other utilities
        //       from core.js itself so that custom definition should not be blocking.
        plugins().then(() => {
            // possible early errors sent by polyscript
            const errors = new Map();

            // specific main and worker hooks
            const hooks = {
                main: {
                    ...codeFor(main, TYPE),
                    async onReady(wrap, element) {
                        registerModule(wrap);

                        // allows plugins to do whatever they want with the element
                        // before regular stuff happens in here
                        for (const callback of main("onReady"))
                            await callback(wrap, element);

                        // now that all possible plugins are configured,
                        // bail out if polyscript encountered an error
                        if (errors.has(element)) {
                            let { message } = errors.get(element);
                            errors.delete(element);
                            const clone = message === INVALID_CONTENT;
                            message = `(${ErrorCode.CONFLICTING_CODE}) ${message} for `;
                            message += element.cloneNode(clone).outerHTML;
                            wrap.io.stderr(message);
                            return;
                        }

                        if (isScript(element)) {
                            const isAsync = !isSync(element);
                            const target = element.getAttribute("target");
                            const show = target
                                ? queryTarget(element, target)
                                : document.createElement("script-py");

                            if (!target) {
                                const { head, body } = document;
                                if (head.contains(element)) body.append(show);
                                else element.after(show);
                            }
                            if (!show.id) show.id = getID();

                            // allows the code to retrieve the target element via
                            // document.currentScript.target if needed
                            defineProperty$3(element, "target", { value: show });

                            // notify before the code runs
                            dispatch(element, TYPE, "ready");
                            dispatchDone(
                                element,
                                isAsync,
                                wrap[`run${isAsync ? "Async" : ""}`](
                                    await fetchSource(element, wrap.io, true),
                                ),
                            );
                        } else {
                            // resolve PyScriptElement to allow connectedCallback
                            element._wrap.resolve(wrap);
                        }
                        console.debug("[pyscript/main] PyScript Ready");
                    },
                    onWorker(_, xworker) {
                        assign$3(xworker.sync, sync);
                        for (const callback of main("onWorker"))
                            callback(_, xworker);
                    },
                    onBeforeRun(wrap, element) {
                        currentElement = element;
                        bootstrapNodeAndPlugins(
                            main,
                            wrap,
                            element,
                            "onBeforeRun",
                        );
                    },
                    onBeforeRunAsync(wrap, element) {
                        currentElement = element;
                        return bootstrapNodeAndPlugins(
                            main,
                            wrap,
                            element,
                            "onBeforeRunAsync",
                        );
                    },
                    onAfterRun(wrap, element) {
                        bootstrapNodeAndPlugins(
                            main,
                            wrap,
                            element,
                            "onAfterRun",
                        );
                    },
                    onAfterRunAsync(wrap, element) {
                        return bootstrapNodeAndPlugins(
                            main,
                            wrap,
                            element,
                            "onAfterRunAsync",
                        );
                    },
                },
                worker: {
                    ...codeFor(worker, TYPE),
                    // these are lazy getters that returns a composition
                    // of the current hooks or undefined, if no hook is present
                    get onReady() {
                        return createFunction(this, "onReady");
                    },
                    get onBeforeRun() {
                        return createFunction(this, "onBeforeRun");
                    },
                    get onBeforeRunAsync() {
                        return createFunction(this, "onBeforeRunAsync");
                    },
                    get onAfterRun() {
                        return createFunction(this, "onAfterRun");
                    },
                    get onAfterRunAsync() {
                        return createFunction(this, "onAfterRunAsync");
                    },
                },
            };

            hooked.set(TYPE, hooks);

            define(TYPE, {
                config,
                configURL,
                interpreter,
                hooks,
                env: `${TYPE}-script`,
                version: offline_interpreter(config),
                onerror(error, element) {
                    errors.set(element, error);
                },
            });

            customElements.define(
                `${TYPE}-script`,
                class extends HTMLElement {
                    constructor() {
                        assign$3(super(), {
                            _wrap: withResolvers$5(),
                            srcCode: "",
                            executed: false,
                        });
                    }
                    get id() {
                        return super.id || (super.id = getID());
                    }
                    set id(value) {
                        super.id = value;
                    }
                    async connectedCallback() {
                        if (!this.executed) {
                            this.executed = true;
                            const isAsync = !isSync(this);
                            const { io, run, runAsync } = await this._wrap
                                .promise;
                            this.srcCode = await fetchSource(
                                this,
                                io,
                                !this.childElementCount,
                            );
                            this.replaceChildren();
                            this.style.display = "block";
                            dispatch(this, TYPE, "ready");
                            dispatchDone(
                                this,
                                isAsync,
                                (isAsync ? runAsync : run)(this.srcCode),
                            );
                        }
                    }
                },
            );
        });
    }

    // export the used config without allowing leaks through it
    exportedConfig[TYPE] = structuredClone(config);
}

export { Hook as H, TYPES as T, XWorker as X, dedent as a, customObserver as b, codemirror as c, defineProperties as d, exportedHooks as e, buffered as f, assign$3 as g, registry$1 as h, inputFailure as i, define as j, configDetails as k, loadProgress as l, getText as m, createProgress as n, offline_interpreter as o, optional as p, donkey as q, relative_url as r, stdlib as s, exportedPyWorker as t, exportedMPWorker as u, exportedConfig as v, withResolvers$5 as w, exportedWhenDefined as x };
//# sourceMappingURL=core-U_kQgoO-.js.map
