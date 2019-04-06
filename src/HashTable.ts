import { _inc } from './c';

export default class HashTable {
  private _store: Map<any, any>;

  public hashCode: number;

  constructor(ht?: HashTable) {
    this.hashCode = _inc();
    if (ht) this._store = new Map(ht._store);
    else this._store = new Map();
  }

  clone() { return new HashTable(this); }

  get(key: {hashCode: any, [key: string]: any}) {
    let out = this._store.get(key.hashCode);
    if (out === undefined) return null;
    return out[1];
  }
  set(key: {hashCode: any, [key: string]: any}, value: any) { return this._store.set(key.hashCode, [key, value]); }
  has(key: {hashCode: any, [key: string]: any}) { return this._store.has(key.hashCode); }
  delete(key: {hashCode: any, [key: string]: any}) { return this._store.delete(key.hashCode); }

  each(callback: Function, scope?: any) {
    this._store.forEach((v) => {
      return callback.call(scope || null, v[0], v[1])
    }, scope)
  }

  escapingEach(callback: Function, scope?: any) {
    if (!this._store.size) return;

    let context,
        keys = [],
        vi = this._store.values(),
        rec = vi.next();

    while (!rec.done) {
      context = callback.call(scope || null, rec.value[0], rec.value[1]);
      if (context) {
        if (context.retval !== undefined) return context;
        if (context.brk) break;
      }
      rec = vi.next();
    }
  }

  equals(other: any) {
    if (other === this) return true;
    if (!(other instanceof HashTable) || other.size !== this.size) return false;
    for (let x of this._store.keys()) {
      if (other._store.get(x) == undefined) return false;
    }
    return true;
  }

  clear() { this._store.clear(); }

  get size(): number { return this._store.size }
}