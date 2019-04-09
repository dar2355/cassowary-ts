import { Variable, varArgs } from './Variable';


export default class Point {
  _x: Variable;
  _y: Variable;

  constructor(x: Variable | number, y: Variable | number, suffix?: string) {
    if (x instanceof Variable) this._x = x;
    else {
      let xArgs: varArgs = { value: x };
      if (suffix) xArgs.name = "x" + suffix;
      this._x = new Variable(xArgs);
    }
    if (y instanceof Variable) this._y = y;
    else {
      let yArgs: varArgs = { value: y };
      if (suffix) yArgs.name = "y" + suffix;
      this._y = new Variable(yArgs);
    }
  }

  get x() { return this._x; }
  set x(xVar: number | Variable) {
    if (xVar instanceof Variable) this._x = xVar;
    else this._x.value = xVar;
  }

  get y() { return this._y; }
  set y(yVar: number | Variable) {
    if (yVar instanceof Variable) this._y = yVar;
    else this._y.value = yVar;
  }

  toString() { return `(${this.x},${this.y})`; }
}