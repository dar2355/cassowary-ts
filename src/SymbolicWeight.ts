

const multiplier = 1000;

export default class SymbolicWeight {
  private _t = "SymbolicWeight";

  public value = 0;

  constructor(...args: any[]) {
    let factor = 1;
    for (let i = args.length - 1; i >= 0; --i) {
      this.value += args[i] * factor;
      factor *= multiplier;
    }
  }

  toJSON() {
    return {
      _t: this._t,
      value: this.value
    }
  }
}