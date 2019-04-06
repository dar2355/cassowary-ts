import { _inc } from './c';

export default class HashSet {
  private _t = "HashSet";
  private _store: Map<any, any>;

  public hashCode: number;

  constructor(hs?: HashSet | any) {
    this.hashCode = _inc();
    if (hs instanceof HashSet) this._store = new Map(hs._store);
    else this._store = new Map();
  }

  add(item: {hashCode: any, [key: string]: any}) { return this._store.set(item.hashCode, item)}
  has(item: {hashCode: any, [key: string]: any}) { return this._store.has(item.hashCode); }
  clear() { this._store.clear(); }
  delete(item: {hashCode: any, [key: string]: any}) { this._store.delete(item.hashCode); }
  values() {
    let values = [],
        vi = this._store.values(),
        rec = vi.next();
    while (!rec.done) {
      values.push(rec.value);
      rec = vi.next();
    }
    return values;
  }
  first() {
    let vi = this._store.values(),
        rec = vi.next();
    if (rec.done) return null;
    return rec.value;
  }
  each(callback: Function, scope?: any) {
    this._store.forEach((item) => {
      return callback.call(scope || null, item, item, this)
    }, scope);
  }
  // doesn't actually escape
  escapingEach(func: (() => any), scope?: any) {
    if (this.size) this._store.forEach(func, scope);
  }

  toString() {
    let answer = this.size + " {";
    let first = true;
    this.each((e: any) => {
      if (!first) answer += ", ";
      else first = false;
      answer += e;
    });
    answer += "}\n";
    return answer;
  }

  toJSON() {
    let d: any[] = [];
    this.each((e: any) => {
      d[d.length] = e.toJSON();
    });
    return {
      _t: "c.HashSet",
      data: d
    }
  }

  fromJSON(input: any) {
    let out = new HashSet();
    if (input.data) out._store = input.data;
    return out;
  }

  get size() { return this._store.size; }
}