// ignore browsers that already support SharedArrayBuffer
if (navigator.platform !== 'iPad') {
  Object.defineProperty(navigator,'platform',{value:'iPad'});
  const { isArray } = Array;
  const isOptions = args => args.length && typeof args[0] === 'object' && args[0] !== null;
  globalThis.Blob = class extends Blob {
    constructor(blobParts, ...args) {
      if (
        isOptions(args) &&
        args[0].type === 'text/javascript' &&
        isArray(blobParts) &&
        typeof blobParts.at(0) === 'string'
      ) {
        blobParts[0] = `/*@*/Object.defineProperty(navigator,'platform',{configurable:true,value:'iPad'});${blobParts[0]}`;
      }
      super(blobParts, ...args);
    }
  };
}
