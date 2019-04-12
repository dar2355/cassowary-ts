import { _inc } from './c';

export type varArgs = {
  name?: string;
  value?: number;
  prefix?: string
};
export class AbstractVariable {
  private _prefix: any = "";

  public isDummy = false;
  public isExternal = false;
  public isPivotable = false;
  public isRestricted = false;

  public hashCode: number;
  public name: string = "";
  public value: number | string = 0;

  constructor(args?: varArgs, varNamePrefix?: string) {
    this.hashCode = _inc();
    this.name = (varNamePrefix || "")  + this.hashCode;
    if (args) {
      if (args.name) this.name = args.name;
      if (args.value) this.value = args.value;
      if (args.prefix) this._prefix = args.prefix;
    }
  }

  valueOf() { return this.value; }
  toJSON() {
    return {
      _t: "<unimplemented in typescript>",
      name: this.name,
      value: this.value,
      _prefix: this._prefix,
    };
  }
  fromJSON(input: any, Ctor: any) {
    // console.log(input, Ctor);

    // TODO: unsure of how to implement this in typescript atm
    // also too lazy to figure out how
  }
  toString() { return `${this._prefix}[${this.name}:${this.value}]` }
}

export class Variable extends AbstractVariable {
  // REVIEW idk why this is here but it's commented out in the base library
  // private static _map = new Map();

  private _t = "Variable";

  public isExternal = true;

  constructor(args?: varArgs) {
    super(args, "v");

    // no idea what these do - but they aren't needed in the base library
    // let vm = Variable._map;
    // if (vm) { vm[this.name] = this; }
  }
}

export class DummyVariable extends AbstractVariable {
  private _t = "DummyVariable";

  public isDummy = true;
  public isRestricted = true;
  public value = "dummy";

  constructor(args?: varArgs) {
    super(args, "d");
  }
}

export class ObjectiveVariable extends AbstractVariable {
  private _t = "ObjectiveVariable";

  public value = "obj";

  constructor(args?: varArgs) {
    super(args, "o");
  }
}

export class SlackVariable extends AbstractVariable {
  private _t = "SlackVariable";

  public isPivotable = true;
  public isRestricted = true;
  public value = "slack";

  constructor(args?: varArgs) {
    super(args, "s");
  }
}