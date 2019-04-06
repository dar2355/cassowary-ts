
export default class Error {
  private _name = "Error";
  private _description = "An error has occured in Cassowary-ts";

  constructor(name?: string, message?: string) {
    if (name) this._name = name;
    if (message) this._description = message;
  }

  set description(newDescription: string) { this._description = newDescription; }
  get description() { return `(${this._name}) ${this._description}`; }
  get message() { return this.description; }
  toString() { return this.description; }
}

export const ConstraintNotFound = new Error("ConstraintNotFound", "Tried to remove a constraint never added to the tableu");
export const InternalError = new Error("InternalError");
export const NonExpression = new Error("NonExpression", "The resulting expression would be a non");
export const NotEnoughStays = new Error("NotEnoughStays",
"There are not enough stays to give specific values to every variable");
export const RequiredFailure = new Error("RequiredFailure", "A required constraint cannot be satisfied");
export const TooDifficult = new Error("TooDifficult", "The constraints are too difficult to solve");