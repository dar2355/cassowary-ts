import { _inc } from './c';

// SECTION

// export default class HashTable {
//   private _store: Map<any, any>;

//   public hashCode: number;

//   constructor(ht?: HashTable) {
//     this.hashCode = _inc();
//     if (ht) this._store = new Map(ht._store);
//     else this._store = new Map();
//   }

//   clone() { return new HashTable(this); }

//   get(key: {hashCode: any, [key: string]: any}) {
//     let out = this._store.get(key.hashCode);
//     if (out === undefined) return null;
//     return out[1];
//   }
//   set(key: {hashCode: any, [key: string]: any}, value: any) { return this._store.set(key.hashCode, [key, value]); }
//   has(key: {hashCode: any, [key: string]: any}) { return this._store.has(key.hashCode); }
//   delete(key: {hashCode: any, [key: string]: any}) { return this._store.delete(key.hashCode); }

//   each(callback: Function, scope?: any) {
//     this._store.forEach((v) => {
//       return callback.call(scope || null, v[0], v[1])
//     }, scope)
//   }

//   escapingEach(callback: Function, scope?: any) {
//     if (!this._store.size) return;

//     this._perhapsCompact();

//     let context,
//         keys = [],
//         vi = this._store.values(),
//         rec = vi.next();

//     while (!rec.done) {
//       context = callback.call(scope || null, rec.value[0], rec.value[1]);
//       if (context) {
//         if (context.retval !== undefined) return context;
//         if (context.brk) break;
//       }
//       rec = vi.next();
//     }
//   }

//   equals(other: any) {
//     if (other === this) return true;
//     if (!(other instanceof HashTable) || other.size !== this.size) return false;
//     for (let x of this._store.keys()) {
//       if (other._store.get(x) == undefined) return false;
//     }
//     return true;
//   }

//   clear() { this._store.clear(); }

//   get size(): number { return this._store.size }

//   private _perhapsCompact() {
//     if this.
//   }
// }

// !SECTION

const defaultContext: any = {};

const keyCode = (key: any) => {
  let kc = (!!key.hashCode) ? key.hashCode : key.toString();
  return kc;
}

const copyOwn = (src: any, dest: any) => {
  Object.keys(src).forEach((x) => { dest[x] = src[x]; })
}

export default class HashTable {
  private _store: any = {};
  private _keyStrMap: any = {};
  private _deleted = 0;

  public size = 0;

  constructor() {
    this.size = 0;
    this._store = {};
    this._keyStrMap = {};
    this._deleted = 0;
  }

  set(key: any, value: any) {
    let hash = keyCode(key);

    if (!this._store.hasOwnProperty(hash)) {
      // FIXME(slightlyoff): if size gooes above the V8 property limit,
      // compact or go to a tree.
      this.size++;
    }
    this._store[hash] = value;
    this._keyStrMap[hash] = key;
  }

  get(key: any) {
    if (!this.size) return null;

    key = keyCode(key);

    let v = this._store[key];
    if (typeof v !== "undefined") return this._store[key];
    return null;
  }

  clear() {
    this.size = 0;
    this._store = {};
    this._keyStrMap = {};
  }

  private _compact() {
    let ns = {};
    copyOwn(this._store, ns);
    this._store = ns;
  }

  private _compactThreshold = 100;
  private _perhapsCompact() {
    // I honestly have no idea what _size does
    // maybe it was an old property that was on objects...?
    // it's not initialized anywhere else here

    // if (this._size > 30) return;
    if (this._deleted > this._compactThreshold) {
      this._compact();
      this._deleted = 0;
    }
  }

  delete(key: any) {
    key = keyCode(key);
    if (!this._store.hasOwnProperty(key)) return;

    this._deleted++;
    delete this._store[key];

    if (this.size > 0) this.size--;
  }

  each(callback: any, scope?: any) {
    if (!this.size) return;

    this._perhapsCompact();

    let store = this._store;
    let keyMap = this._keyStrMap;

    Object.keys(this._store).forEach((k: any) => {
      callback.call(scope || null, keyMap[k], store[k]);
    })
  }

  escapingEach(callback: any, scope?: any) {
    if (!this.size) return;

    this._perhapsCompact();

    let that = this;
    let store = this._store;
    let keyMap = this._keyStrMap;
    let context = defaultContext;
    let kl = Object.keys(store);
    for (let x = 0; x < kl.length; x++) {
      (function(v) { // unfamiliar syntax - I'm not touching this
        if (that._store.hasOwnProperty(v)) {
          context = callback.call(scope||null, keyMap[v], store[v]);
        }
      })(kl[x]);

      if (context) {
        if (context.retval !== undefined) {
          return context;
        }
        if (context.brk) {
          break;
        }
      }
    }
  }

  clone() {
    let n = new HashTable();
    if (this.size) {
      n.size = this.size;
      copyOwn(this._store, n._store);
      copyOwn(this._keyStrMap, n._keyStrMap);
    }
    return n;
  }

  equals(other: any) {
    if (other === this) return true;
    if (!(other instanceof HashTable)) return false;

    let codes = Object.keys(this._store);
    for (let i = 0; i < codes.length; i++) {
      let code = codes[i];
      if (this._keyStrMap[code] !== other._keyStrMap[code] ||
         this._store[code][0] !== other._store[code][0]) {
        return false;
      }
    }

    return true;
  }

  toString() {
    let answer = "";
    this.each(function(k: any, v: any) {
      answer += k + " => " + v + "\n";
    })
    return answer;
  }

  toJSON() {
    /*
    var d = {};
    this.each(function(key, value) {
      d[key.toString()] = (value.toJSON) ? value.toJSON : value.toString();
    });
    */
    return {
      _t: "HashTable",
      /*
      store: d
      */
    };
  }

  fromJSON() {
    var r = new HashTable();
    /*
    if (o.data) {
      r.size = o.data.length;
      r._store = o.data;
    }
    */
    return r;
  }
}