import { _inc, Equalities } from './c';
import Strength from "./Strength";
import Expression from './Expression';
import { Variable, AbstractVariable } from './Variable';
import { InternalError } from './Error';

// I'm going to have ptsd from rewriting this file (again) and I haven't
// even gotten into a real job yet

export class AbstractConstraint {
  public hashCode: number;
  public strength: Strength;
  public weight: number;

  public isEdit = false;
  public isInequality = false;
  public isStay = false;

  expression?: Expression;

  constructor(strength?: Strength, weight?: number) {
    this.hashCode = _inc();
    this.strength = strength || Strength.required;
    this.weight = weight || 1;
  }

  get required() { return (this.strength === Strength.required ); }

  toString() {
    return `${this.strength} {${this.weight}} (${this.expression})`
  }
}

export class EditConstraint extends AbstractConstraint {
  public variable: AbstractVariable;
  isEdit = true;

  constructor(cv: AbstractVariable, strength: Strength, weight?: number) {
    super(strength || Strength.strong, weight);
    this.variable = cv;
    this.expression = new Expression(cv, -1, cv.value as number);
  }

  toString() { return "edit:" + super.toString(); }
}

export class StayConstraint extends AbstractConstraint {
  public variable: AbstractVariable;
  isStay = true;

  constructor(cv: AbstractVariable, strength: Strength, weight: number) {
    super(strength || Strength.strong, weight);
    this.variable = cv;
    this.expression = new Expression(cv, -1, cv.value as number);
  }

  toString() { return "stay:" + super.toString(); }
}

export class Constraint extends AbstractConstraint {

  constructor(cle: Expression, strength?: Strength, weight?: number) {
    super(strength, weight);
    this.expression = cle;
  }
}


const cloneOrNewCle = (cle: {clone?: any, [key: string]: any} | number) => {
  if ((cle as any).clone) return (cle as any).clone();
  else return new Expression(cle as any);
}

export class Inequality extends Constraint {

  // coding this was HELL - 0/10 would not recommend
  constructor(
    a1: Expression | AbstractVariable | number,
    a2: Equalities | Strength,
    a3: Expression | AbstractVariable | number,
    a4?: Strength,
    a5?: number) {
      let a1IsExp = a1 instanceof Expression,
          a3IsExp = a3 instanceof Expression,
          a1IsVar = a1 instanceof AbstractVariable,
          a3IsVar = a3 instanceof AbstractVariable,
          a1IsNum = typeof(a1) === "number",
          a3IsNum = typeof(a3) === "number";

      if ((a1IsExp || a1IsNum) && a3IsVar) {
        let cle = a1,
            op = a2,
            cv = a3 as AbstractVariable,
            strength = a4,
            weight = a5;

        super(cloneOrNewCle(cle), strength, weight);
        if (op === Equalities.LEQ) {
          // the ! tells the compiler that it WILL exist even if it's
          // not immediately clear
          this.expression!.multiplyMe(-1);
          this.expression!.addVariable(cv);
        } else if (op === Equalities.GEQ) this.expression!.addVariable(cv, -1);
        else {
          // invalid operator in Inequality constructor
          throw InternalError;
        }
      }
      else if (a1IsVar && (a3IsExp || a3IsNum)) {
        let cle = a3,
            op = a2,
            cv = a1 as AbstractVariable,
            strength = a4,
            weight = a5;

        super(cloneOrNewCle(cle), strength, weight);
        if (op === Equalities.GEQ) {
          this.expression!.multiplyMe(-1);
          this.expression!.addVariable(cv);
        } else if (op === Equalities.LEQ) this.expression!.addVariable(cv, -1);
        else throw InternalError;
      }
      else if (a1IsExp && a3IsNum) {
        let cle1 = a1, op = a2, cle2 = a3, strength = a4, weight = a5;
        super(cloneOrNewCle(cle1), strength, weight);
        if (op === Equalities.LEQ) {
          this.expression!.multiplyMe(-1);
          this.expression!.addExpression(cloneOrNewCle(cle2));
        } else if (op === Equalities.GEQ) this.expression!.addExpression(cloneOrNewCle(cle2), -1);
        else throw InternalError

        this.isInequality = true;
        return this;
      }
      else if (a1IsNum && a3IsExp) {
        var cle1 = a3, op = a2, cle2 = a1, strength = a4, weight = a5;
        super(cloneOrNewCle(cle1), strength, weight);
        if (op == Equalities.GEQ) {
          this.expression!.multiplyMe(-1);
          this.expression!.addExpression(cloneOrNewCle(cle2));
        } else if (op == Equalities.LEQ) {
          this.expression!.addExpression(cloneOrNewCle(cle2), -1);
        } else {
          throw InternalError;
        }
        this.isInequality = true;
        return this;
      }
      else if (a1IsExp && a3IsExp) {
        let cle1 = a1, op = a2, cle2 = a3, strength = a4, weight = a5;
        super(cloneOrNewCle(cle2), strength, weight);
        if (op === Equalities.GEQ) {
          this.expression!.multiplyMe(-1);
          this.expression!.addExpression(cloneOrNewCle(cle1));
        } else if (op === Equalities.LEQ) this.expression!.addExpression(cloneOrNewCle(cle1), -1);
        else throw InternalError;
      }
      else if (a1IsExp) {
        super(a1 as Expression, a2 as Strength, a3 as number);
        this.isInequality = true;
        return this;
      }
      else if (a2 === Equalities.GEQ) {
        super(new Expression(a3 as AbstractVariable | number), a4 as Strength, a5 as number);
        this.expression!.multiplyMe(-1);
        this.expression!.addVariable(a1 as AbstractVariable);
      }
      else if (a2 === Equalities.LEQ) {
        super(new Expression(a3 as AbstractVariable | number), a4 as Strength, a5 as number);
        this.expression!.addVariable(a1 as AbstractVariable, -1);
      }
      else throw InternalError;

    this.isInequality = true;
  }

  toString() {
    return this.strength + " {" + this.weight + "} (" + this.expression +")" + " >= 0) id: " + this.hashCode;
  }
}

export class Equation extends Constraint {
  constructor(a1: any, a2: any, a3?: any, a4?: any) {
    if (a1 instanceof Expression && !a2 || a2 instanceof Strength) {
      super(a1, a2, a3);
    }
    else if ((a1 instanceof AbstractVariable) && (a2 instanceof Expression)) {
      let cv = a1, cle = a2, strength = a3, weight = a4;
      super(cle.clone(), strength, weight);
      this.expression!.addVariable(cv, -1);
    }
    else if ((a1 instanceof AbstractVariable) && (typeof(a2) === "number")) {
      let cv = a1, val = a2, strength = a3, weight = a4;
      super(new Expression(val), strength, weight);
      this.expression!.addVariable(cv, -1);
    }
    else if ((a1 instanceof Expression) && (a2 instanceof AbstractVariable)) {
      let cle = a1, cv = a2, strength = a3, weight = a4;
      super(cle.clone(), strength, weight);
      this.expression!.addVariable(cv, -1);
    }
    else if (((a1 instanceof Expression) || (a1 instanceof AbstractVariable) ||
              (typeof(a1) == 'number')) &&
            ((a2 instanceof Expression) || (a2 instanceof AbstractVariable) ||
              (typeof(a2) == 'number'))) {
      if (a1 instanceof Expression) a1 = a1.clone();
      else a1 = new Expression(a1);

      if (a2 instanceof Expression) a2 = a2.clone();
      else a2 = new Expression(a2);

      super(a1, a3, a4);
      this.expression!.addExpression(a2, -1);
    }
    else {
      throw "Bad initializer to Equation";
    }
    // not going to worry about the assertion.
    // somehow it'll come back to haunt me but oh well
  }

  toString() {
    return this.strength + " {" + this.weight + "} (" + this.expression +")" + " = 0)";
  }
}