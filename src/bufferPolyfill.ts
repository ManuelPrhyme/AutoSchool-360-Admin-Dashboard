// @ts-nocheck
/**
 * Browser-native Buffer polyfill.
 * Replaces the CJS 'buffer' npm package (which Vite cannot bundle
 * because it uses require('base64-js') and require('ieee754')).
 * Uses Uint8Array + TextEncoder/Decoder - zero dependencies.
 */

declare global {
  interface Window { Buffer?: any }
  interface Global { Buffer?: any }
}

class BrowserBuffer extends Uint8Array {
  constructor(a?, b?, c?) {
    if (typeof a === 'number') {
      if (a < 0 || a > BrowserBuffer.MAX_LENGTH) throw new RangeError('Invalid size: ' + a);
      super(a); return;
    }
    if (a instanceof Uint8Array || a instanceof ArrayBuffer || a instanceof DataView) {
      let src: Uint8Array;
      if (a instanceof Uint8Array) src = a;
      else if (a instanceof ArrayBuffer) src = new Uint8Array(a);
      else src = new Uint8Array(a.buffer, a.byteOffset, a.byteLength);
      const off = typeof b === 'number' ? b : 0;
      const len = typeof c === 'number' ? c : src.length - off;
      if (len < 0 || off + len > src.length) throw new RangeError('Offset+length out of bounds');
      super(len); this.set(src.subarray(off, off + len)); return;
    }
    if (typeof a === 'string') {
      const enc = typeof b === 'string' ? b : 'utf8';
      super(BrowserBuffer.from(a, enc)); return;
    }
    super(0);
  }


  static MAX_LENGTH = 0x7fffffff;

  static isBuffer(x: any): x is BrowserBuffer {
    return x instanceof BrowserBuffer;
  }

  static from(v: any, enc?: string): BrowserBuffer {
    if (typeof v === 'string') {
      const e = (enc || 'utf8').toLowerCase();
      if (e === 'utf8' || e === 'utf-8') return new BrowserBuffer(new TextEncoder().encode(v));
      if (e === 'base64') return BrowserBuffer._fromB64(v);
      if (e === 'hex') return BrowserBuffer._fromHex(v);
      if (e === 'latin1' || e === 'binary') {
        const o = new BrowserBuffer(v.length);
        for (let i = 0; i < v.length; i++) o[i] = v.charCodeAt(i) & 0xff;
        return o;
      }
      return new BrowserBuffer(new TextEncoder().encode(v));
    }
    if (v instanceof ArrayBuffer) return new BrowserBuffer(v);
    if (v instanceof Uint8Array) return new BrowserBuffer(v);
    if (ArrayBuffer.isView(v)) {
      const src = new Uint8Array(v.buffer, v.byteOffset, v.byteLength);
      return new BrowserBuffer(src);
    }
    const a = new BrowserBuffer(v.length);
    for (let i = 0; i < v.length; i++) a[i] = v[i] & 0xff;
    return a;
  }

  static _fromB64(s: string): BrowserBuffer {
    try {
      const bin = atob(s.replace(/\s/g, ''));
      const o = new BrowserBuffer(bin.length);
      for (let i = 0; i < bin.length; i++) o[i] = bin.charCodeAt(i);
      return o;
    } catch {
      throw new TypeError('Bad base64: ' + s);
    }
  }

  static _fromHex(s: string): BrowserBuffer {
    const c = s.replace(/\s/g, '');
    if (c.length % 2) throw new TypeError('Bad hex length');
    const o = new BrowserBuffer(c.length / 2);
    for (let i = 0; i < c.length; i += 2) {
      const b = parseInt(c.substring(i, i + 2), 16);
      if (isNaN(b)) throw new TypeError('Bad hex at ' + i);
      o[i / 2] = b;
    }
    return o;
  }

  toString(e?) {
    const x = (e || 'utf8').toLowerCase();
    if (x === 'utf8' || x === 'utf-8') return new TextDecoder().decode(this);
    if (x === 'base64') return this.toBase64();
    if (x === 'hex') return this.toHex();
    if (x === 'latin1' || x === 'binary') {
      let o = ''; for (let i = 0; i < this.length; i++) o += String.fromCharCode(this[i] & 0xff); return o;
    }
    return new TextDecoder().decode(this);
  }

  toBase64() {
    let b = ''; for (let i = 0; i < this.length; i++) b += String.fromCharCode(this[i]);
    return btoa(b);
  }

  toHex() {
    let o = ''; for (let i = 0; i < this.length; i++) { const h = this[i].toString(16); o += h.length === 1 ? '0' + h : h; } return o;
  }

  write(str, off = 0, len = this.length - off, enc = 'utf8') {
    let e;
    const x = enc.toLowerCase();
    if (x === 'utf8' || x === 'utf-8') e = new TextEncoder().encode(str);
    else if (x === 'base64') e = BrowserBuffer._fromB64(str);
    else if (x === 'hex') e = BrowserBuffer._fromHex(str);
    else if (x === 'latin1' || x === 'binary') {
      e = new Uint8Array(str.length); for (let i = 0; i < str.length; i++) e[i] = str.charCodeAt(i) & 0xff;
    } else e = new TextEncoder().encode(str);
    const n = Math.min(e.length, len);
    for (let i = 0; i < n; i++) this[off + i] = e[i];
    return n;
  }

  equals(o) { if (this.length !== o.length) return false; for (let i = 0; i < this.length; i++) if (this[i] !== o[i]) return false; return true; }

  compare(o) {
    const n = Math.min(this.length, o.length);
    for (let i = 0; i < n; i++) { if (this[i] !== o[i]) return this[i] < o[i] ? -1 : 1; }
    return this.length - o.length;
  }

  copy(t, off = 0) { const n = Math.min(this.length, t.length - off); for (let i = 0; i < n; i++) t[off + i] = this[i]; return n; }

  slice(s = 0, e?) {
    const a = s < 0 ? this.length + s : s;
    const b = e !== undefined ? (e < 0 ? this.length + e : e) : this.length;
    const o = new BrowserBuffer(Math.max(0, b - a));
    for (let i = 0; i < o.length; i++) o[i] = this[a + i];
    return o;
  }

  fill(v, off = 0, e?) {
    const end = e !== undefined ? e : this.length;
    if (typeof v === 'number') { for (let i = off; i < end; i++) this[i] = v & 0xff; }
    else if (v instanceof Uint8Array) { for (let i = off; i < end; i++) this[i] = v[i % v.length]; }
    return this;
  }

  indexOf(v, off = 0, enc?) {
    if (typeof v === 'string' && enc) v = BrowserBuffer.from(v, enc);
    if (v instanceof BrowserBuffer || v instanceof Uint8Array) {
      if (!v.length) return off;
      if (v.length > this.length) return -1;
      const s = off < 0 ? this.length + off : off;
      for (let i = s; i <= this.length - v.length; i++) {
        let m = true; for (let j = 0; j < v.length; j++) { if (this[i + j] !== v[j]) { m = false; break; } }
        if (m) return i;
      }
      return -1;
    }
    const b = typeof v === 'number' ? v & 0xff : v;
    const s = off < 0 ? this.length + off : off;
    for (let i = s; i < this.length; i++) if (this[i] === b) return i;
    return -1;
  }

  lastIndexOf(v, off = this.length - 1, enc?) {
    if (typeof v === 'string' && enc) v = BrowserBuffer.from(v, enc);
    if (v instanceof BrowserBuffer || v instanceof Uint8Array) {
      if (!v.length) return Math.min(off, this.length - 1);
      if (v.length > this.length) return -1;
      let s = off; if (s < 0) s = this.length + s; if (s >= this.length) s = this.length - 1;
      for (let i = s; i >= 0; i--) {
        if (i + v.length > this.length) continue;
        let m = true; for (let j = 0; j < v.length; j++) { if (this[i + j] !== v[j]) { m = false; break; } }
        if (m) return i;
      }
      return -1;
    }
    const b = typeof v === 'number' ? v & 0xff : v;
    let s = off; if (s < 0) s = this.length + s; if (s >= this.length) s = this.length - 1;
    for (let i = s; i >= 0; i--) if (this[i] === b) return i;
    return -1;
  }

  static byteLength(v, enc?) {
    if (typeof v === 'string') {
      const x = enc ? enc.toLowerCase() : 'utf8';
      if (x === 'utf8' || x === 'utf-8') return new TextEncoder().encode(v).length;
      if (x === 'base64') return BrowserBuffer._fromB64(v).length;
      if (x === 'hex') return BrowserBuffer._fromHex(v).length;
      if (x === 'latin1' || x === 'binary') return v.length;
      return new TextEncoder().encode(v).length;
    }
    if (v instanceof ArrayBuffer) return v.byteLength;
    if (v instanceof Uint8Array) return v.length;
    return 0;
  }

  static isEncoding(e) {
    const x = e.toLowerCase();
    return x === 'utf8' || x === 'utf-8' || x === 'ascii' || x === 'latin1' || x === 'binary' || x === 'base64' || x === 'hex' || x === 'ucs2' || x === 'ucs-2' || x === 'utf16le' || x === 'utf-16le';
  }

  readUInt8(i = 0) { return this[i] || 0; }
  readUInt16BE(i = 0) { return (this[i] << 8) | (this[i + 1] || 0); }
  readUInt16LE(i = 0) { return this[i] | ((this[i + 1] || 0) << 8); }
  readUInt32BE(i = 0) { return (((this[i] << 24) | ((this[i+1]||0) << 16) | ((this[i+2]||0) << 8) | (this[i+3]||0)) >>> 0); }
  readUInt32LE(i = 0) { return this[i] | ((this[i+1]||0) << 8) | ((this[i+2]||0) << 16) | ((this[i+3]||0) << 24); }

  writeUInt8(v, i = 0) { this[i] = v & 0xff; return i + 1; }
  writeUInt16BE(v, i = 0) { this[i] = (v >> 8) & 0xff; this[i+1] = v & 0xff; return i + 2; }
  writeUInt16LE(v, i = 0) { this[i] = v & 0xff; this[i+1] = (v >> 8) & 0xff; return i + 2; }
  writeUInt32BE(v, i = 0) { this[i] = (v >> 24) & 0xff; this[i+1] = (v >> 16) & 0xff; this[i+2] = (v >> 8) & 0xff; this[i+3] = v & 0xff; return i + 4; }
  writeUInt32LE(v, i = 0) { this[i] = v & 0xff; this[i+1] = (v >> 8) & 0xff; this[i+2] = (v >> 16) & 0xff; this[i+3] = (v >> 24) & 0xff; return i + 4; }

  toJSON() { const d = []; for (let i = 0; i < this.length; i++) d.push(this[i]); return { type: 'Buffer', data: d }; }

  [Symbol.for('nodejs.util.inspect.custom')]() { return '<Buffer ' + this.toHex() + '>'; }
}

// Minimal `global`/`process` shims (what the node-polyfills plugin's
// `globals` option would have injected) — some browserified deps check
// `process.env.NODE_ENV` or reference `global` at module scope.
if (typeof (globalThis as any).global === 'undefined') {
  (globalThis as any).global = globalThis;
}
if (typeof (globalThis as any).process === 'undefined') {
  (globalThis as any).process = { env: { NODE_ENV: 'production' }, browser: true, nextTick: (fn: Function, ...args: any[]) => setTimeout(() => fn(...args), 0) };
}

if (typeof globalThis !== 'undefined') globalThis.Buffer = BrowserBuffer;

export { BrowserBuffer };
export default BrowserBuffer;
