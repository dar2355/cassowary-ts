import SymbolicWeight from "./SymbolicWeight";


export default class Strength {
  public static required = new Strength("<Required>", 1000, 1000, 1000);
  public static strong = new Strength("strong", 1, 0, 0);
  public static medium = new Strength("medium", 0, 1, 0);
  public static weak = new Strength("weak", 0, 0, 1);

  public name: string;
  public symbolicWeight: SymbolicWeight;

  constructor(name: string, symbolicWeight: SymbolicWeight | any, w2?: any, w3?: any) {
    this.name = name;
    if (symbolicWeight instanceof SymbolicWeight) this.symbolicWeight = symbolicWeight;
    else this.symbolicWeight = new SymbolicWeight(symbolicWeight, w2, w3);
  }

  get required() { return this === Strength.required; }

  toString() { return this.name + (!this.required ? (":" + this.symbolicWeight) : ""); }
}