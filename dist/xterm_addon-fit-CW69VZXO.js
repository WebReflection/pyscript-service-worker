/**
 * Bundled by jsDelivr using Rollup v2.79.2 and Terser v5.39.0.
 * Original file: /npm/@xterm/addon-fit@0.10.0/lib/addon-fit.js
 *
 * Do NOT use SRI with dynamically generated files! More information: https://www.jsdelivr.com/using-sri-with-dynamic-files
 */
var e,t,r={exports:{}};var s=r.exports=(e=t={},Object.defineProperty(e,"__esModule",{value:true}),e.FitAddon=void 0,e.FitAddon=class{activate(e){this._terminal=e;}dispose(){}fit(){const e=this.proposeDimensions();if(!e||!this._terminal||isNaN(e.cols)||isNaN(e.rows))return;const t=this._terminal._core;this._terminal.rows===e.rows&&this._terminal.cols===e.cols||(t._renderService.clear(),this._terminal.resize(e.cols,e.rows));}proposeDimensions(){if(!this._terminal)return;if(!this._terminal.element||!this._terminal.element.parentElement)return;const e=this._terminal._core,t=e._renderService.dimensions;if(0===t.css.cell.width||0===t.css.cell.height)return;const r=0===this._terminal.options.scrollback?0:e.viewport.scrollBarWidth,s=window.getComputedStyle(this._terminal.element.parentElement),i=parseInt(s.getPropertyValue("height")),o=Math.max(0,parseInt(s.getPropertyValue("width"))),n=window.getComputedStyle(this._terminal.element),l=i-(parseInt(n.getPropertyValue("padding-top"))+parseInt(n.getPropertyValue("padding-bottom"))),a=o-(parseInt(n.getPropertyValue("padding-right"))+parseInt(n.getPropertyValue("padding-left")))-r;return {cols:Math.max(2,Math.floor(a/t.css.cell.width)),rows:Math.max(1,Math.floor(l/t.css.cell.height))}}},t),i=r.exports.FitAddon,o=r.exports.__esModule;

export { i as FitAddon, o as __esModule, s as default };
//# sourceMappingURL=xterm_addon-fit-CW69VZXO.js.map
