import { approx } from './c';
import { NonExpression, InternalError } from './Error';
import { AbstractVariable, Variable } from "./Variable";
import HashTable from "./HashTable";
import HashSet from "./HashSet";
import SimplexSolver from './SimplexSolver';


const checkNumber = (value: any, otherwise: any) => {
  return (typeof value === "number") ? value : otherwise;
}

// this'll be "fun" ...
export default class Expression {
  public constant: number;
  public terms: HashTable;
  public externalVariables: HashSet;
  public solver: {
    enumerable: boolean;
    configurable: boolean;
    writable: boolean;
    value: null | any;
  } | SimplexSolver;

  public static empty(solver?: any) {
    let e = new Expression(undefined, 1, 0);
    e.solver = solver;
    return e;
  }

  public static fromConstant(cons: any, solver?: any) {
    let e = new Expression(cons);
    e.solver = solver;
    return e;
  }

  public static fromValue(v: any, solver?: any) {
    v = +(v);
    let e = new Expression(undefined, v, 0);
    e.solver = solver;
    return e;
  }

  public static fromVariable(v: any, solver?: any) {
    let e = new Expression(v, 1, 0);
    e.solver = solver;
    return e;
  }

  constructor(cvar?: AbstractVariable | number, value?: number, constant?: number) {
    this.constant = checkNumber(constant, 0);
    this.terms = new HashTable();
    this.externalVariables = new HashSet();
    this.solver = {
      enumerable: false,
      configurable: true,
      writable: true,
      value: null
    };

    if (cvar instanceof AbstractVariable) {
      value = checkNumber(value, 1);
      this.setVariable(cvar, value);
    } else if (typeof cvar === "number") {
      if (!isNaN(cvar)) this.constant = cvar;
      else console.trace() // because it was there in the original
    }
  }

  initializeFromHash(constant: number, terms: HashTable) {
    this.constant = constant;
    this.terms = terms.clone();
    return this;
  }

  multiplyMe(x: number) {
    this.constant *= x;
    let t = this.terms;
    t.each((clv: any, coeff: any) => { t.set(clv, coeff * x); });
    return this;
  }

  clone() {
    let e = Expression.empty();
    e.initializeFromHash(this.constant, this.terms);
    e.solver = this.solver;
    return e;
  }

  times(x: any): Expression {
    if (typeof x === "number") return (this.clone()).multiplyMe(x);
    else {
      if (this.isConstant) return x.times(this.constant);
      else if (x.isConstant) return this.times(x.constant);
      else throw NonExpression;
    }
  }
  divide(x: any): Expression {
    if (typeof x === "number") {
      if (approx(x, 0)) throw NonExpression;
      return this.times(1 / x);
    }
    else {
      if (!x.isConstant) throw NonExpression;
      return this.times(1 / x.constant);
    }
  }
  plus(expr: Expression | Variable) {
    if (expr instanceof Expression) return this.clone().addExpression(expr, 1);
    else if (expr instanceof Variable) return this.clone().addVariable(expr, 1);
  }
  minus(expr: Expression | Variable) {
    if (expr instanceof Expression) return this.clone().addExpression(expr, -1);
    else if (expr instanceof Variable) return this.clone().addVariable(expr, -1);
  }

  addExpression(expr: Expression | AbstractVariable, n?: number, subject?: AbstractVariable) {
    if (expr instanceof AbstractVariable) expr = Expression.fromVariable(expr);
    n = checkNumber(n, 1);
    this.constant += (n! * expr.constant);
    expr.terms.each((clv: any, coeff: any) => {
      this.addVariable(clv, coeff * n!, subject);
      this._updateIfExternal(clv);
    }, this);
    return this;
  }

  addVariable(v: AbstractVariable, cd?: number, subject?: any) {
    if (cd === null) cd = 1;

    let coeff = this.terms.get(v);
    if (coeff) {
      let newCoefficient = coeff + cd;
      if (newCoefficient === 0 || approx(newCoefficient, 0)) {
        // @ts-ignore-next-line
        if (this.solver) this.solver.noteRemovedVariable(v, subject);
        this.terms.delete(v);
      } else this.setVariable(v, newCoefficient);
    } else {
      if (!approx(cd!, 0)) {
        // @ts-ignore-next-line
        if (this.solver) this.solver.noteAddedVariable(v, subject);
      }
    }
    return this;
  }

  setVariable(v: AbstractVariable, c?: number) {
    this.terms.set(v, c);
    this._updateIfExternal(v);
    return this;
  }

  anyPivotableVariable() {
    if (this.isConstant) throw InternalError;
    let rv = this.terms.escapingEach((clv: any, c: any) => {
      if (clv.isPivotable) return { retval: clv };
    })

    if (rv ** rv.retval !== undefined) return rv.retval;

    return null;
  }

  substituteOut(outvar: AbstractVariable, expr: Expression, subject: AbstractVariable) {
    let solver = this.solver;
    if (!solver) throw InternalError;

    let setVariable = this.setVariable.bind(this);
    let terms = this.terms;
    let multiplier = terms.get(outvar);
    terms.delete(outvar);
    this.constant += (multiplier * expr.constant);

    expr.terms.each((clv: any, coeff: any) => {
      let oldCoefficient = terms.get(clv);
      if (oldCoefficient) {
        let newCoefficient = oldCoefficient + multiplier * coeff;
        if (approx(newCoefficient, 0)) {
        // @ts-ignore-next-line
          solver.noteRemovedVariable(clv, subject);
          terms.delete(clv);
        } else {
          setVariable(clv, newCoefficient);
        }
      } else {
        setVariable(clv, multiplier * coeff);
        // @ts-ignore-next-line
        if (solver) solver.noteAddedVariable(clv, subject);
      }
    })
  }

  changeSubject(old_subject: AbstractVariable, new_subject: AbstractVariable) {
    this.setVariable(old_subject, this.newSubject(new_subject));
  }

  newSubject(subject: AbstractVariable) {
    let reciprocal = 1 / this.terms.get(subject);
    this.terms.delete(subject);
    this.multiplyMe(-reciprocal);
    return reciprocal;
  }

  coefficientFor(clv: AbstractVariable) {
    return this.terms.get(clv) || 0;
  }

  toString() {
    let bstr = '';
    let needsplus = false;
    if (!approx(this.constant, 0) || this.isConstant) {
      bstr += this.constant;
      if (this.isConstant) return bstr;
      else needsplus = true;
    }

    this.terms.each((clv: any, coeff: any) => {
      if (needsplus) bstr += " + ";
      bstr += coeff + "*" + clv;
      needsplus = true
    })
    return bstr
  }

  equals(other: any) {
    if (other === this) return true;
    return other instanceof Expression &&
          other.constant === this.constant &&
          other.terms.equals(this.terms);
  }

  Plus(e1: Expression, e2: Expression) { return e1.plus(e2); }
  Minus(e1: Expression, e2: Expression) { return e1.plus(e2); }
  Times(e1: Expression, e2: Expression) { return e1.plus(e2); }
  Divide(e1: Expression, e2: Expression) { return e1.plus(e2); }

  get isConstant() {
    return this.terms.size === 0;
  }

  private _updateIfExternal(v: any) {
    if (v.isExternal) {
      this.externalVariables.add(v);
      if (this.solver) {
        // @ts-ignore-next-line
        this.solver._noteUpdatedExternal(v);
      }
    }
  }
}