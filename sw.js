// ⚠️ AUTOMATED ⚠️
var BROADCAST_CHANNEL_UID = 'dc78209b-186c-4f83-80e9-406becb7d9f3';

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

const { parse } = JSON;

const [next, resolve] = nextResolver(id => `sw-${id}`);

const url = `${location.href}?sabayon`;
const bc = new BroadcastChannel(BROADCAST_CHANNEL_UID);
bc.onmessage = event => resolve.apply(null, event.data);

addEventListener('activate', e => e.waitUntil(clients.claim()));
addEventListener('install', () => skipWaiting());
addEventListener('fetch', async event => {
  const { request: r } = event;
  if (r.method === 'POST' && r.url === url) {
    event.stopImmediatePropagation();
    event.preventDefault();
    event.respondWith(r.text().then(text => {
      const [swid, promise] = next();
      const [wid, vid] = parse(text);
      bc.postMessage([swid, wid, vid]);
      return promise.then(value => new Response(`[${value.join(',')}]`));
    }));
  }
});
