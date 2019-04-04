// Type definitions for cassorway.js
// Project: [~THE PROJECT NAME~]
// Definitions by: Dominick Reba <https://github.com/dar2355/>

export module cassowary {

  export enum Constraints {
    GEQ = 1,
    LEQ = 2
  }

  export function inherit(props: any): any; //unsure of specifics
  export function own(obj: any, cb: Function, context: any): any;
  export function extend(obj: any, props: any): any;
  export function assert(f: boolean, description: string): void;

  type varOrValue = number | Variable;
  export function plus(e1: varOrValue, e2: varOrValue): Expression;
  export function minus(e1: varOrValue, e2: varOrValue): Expression;
  export function times(e1: varOrValue, e2: varOrValue): Expression;
  export function divide(e1: varOrValue, e2: varOrValue): Expression;

  export function approx(a: number, b: number): boolean;

  export function _inc(): number;
  export function parseJSON(str: string): any;

  export class HashTable {
    _store: Map<any, any>;

    hashCode: number;

    initialize(ht: HashTable | any): void;

    clone(): HashTable;
    get(key: any): null | any;
    clear(): void;

    size(): number; // getter
    set(key: {hashCode: any, [key: string]: any}, value: any): boolean;
    has(key: {hashCode: any, [key: string]: any}): boolean;
    delete(key: {hashCode: any, [key: string]: any}): boolean;
    each(callback: Function, scope: any): any;
    escapingEach(callback: Function, scope: any): null | any;
    equals(other: any): boolean;
  }

  export class HashSet {
    _store: Map<any, any>;

    hashCode: number;

    initialize(hs: HashSet | any): void;

    add(item: any): boolean;
    has(item: any): boolean;

    size(): number; // getter
    clear(): void;
    values(): any[];
    first(): any;
    delete(item: {hashCode: any, [key: string]: any}): void;
    each(callback: Function, scope: any): any;
    escapingEach(func: Function, scope: any): void; // doesn't actually escape lmao
    toString(): string;
    toJSON(): {_t: "c.HashSet", data: any};
    fromJSON(): HashSet;
  }

  export class CWError {
    _name: string; // c.Error
    _description: string; // default: "An error has occured in Cassowary"

    initialize(s: string): void;
    description(v: string): void;
    description(): string;
    message(): string;
    toString(): string;
  }

  export class ConstraintNotFound extends CWError{}
  export class InternalError extends CWError{}
  export class NonExpression extends CWError{}
  export class NotEnoughStays extends CWError{}
  export class RequiredFailure extends CWError{}
  export class TooDifficult extends CWError{}

  export class SymbolicWeight {
    _t: "c.SymbolicWeight";

    value: 0;

    initialize(): void;
    // initialize(...args): void // might be this instead

    toJSON(): {
      _t: "c.SymbolicWeight";
      value: number;
    }
  }

  export class Strength {
    name: string;

    initialize(name: string, symbolicWeight: SymbolicWeight | any, w2: any, w3: any): void;
    required(): boolean; // getter
    toString(): string;

    static required: Strength;
    static strong: Strength;
    static medium: Strength;
    static weak: Strength;
  }

  export class AbstractVariable {
    _prefix: any;

    isDummy: boolean;
    isExternal: boolean;
    isPivotable: boolean;
    isRestricted: boolean;

    hashCode: number;
    name: string | number;
    value: number;

    _init(
      args: {
        name?: string | number;
        value?: number;
        prefix?: string
      },
      varNamePrefix: string | number
    ): void;

    valueOf(): number;
    toJSON(): {
      _t: any;
      name: string | number;
      value: number;
      prefix: string;
    }

    fromJSON(o: any, Ctor: any): any;

    toString(): string;
  }

  export class Variable extends AbstractVariable {
    initalize(args: {
      name?: string | number;
      value?: number;
      prefix?: string
    }): void;
  }
  export class DummyVariable extends AbstractVariable {
    initalize(args: {
      name?: string | number;
      value?: number;
      prefix?: string
    }): void;
  }
  export class ObjectiveVariable extends AbstractVariable {
    initalize(args: {
      name?: string | number;
      value?: number;
      prefix?: string
    }): void;
  }
  export class SlackVariable extends AbstractVariable {
    initalize(args: {
      name?: string | number;
      value?: number;
      prefix?: string
    }): void;
  }

  export class Point {
    _x: Variable;
    _y: Variable;

    initialize(x: Variable | number, y: Variable | number, suffix: string): void;
    x(): Variable; // getter
    x(xVar: Variable | number): void; // setter

    y(): Variable; // getter
    y(yVar: Variable | number): void; // setter

    toString(): string;
  }

  export class Expression {
    constant: number;
    terms: HashTable;
    externalVariables: HashSet;
    solver: {
      enumerable: boolean;
      configurable: boolean;
      writable: boolean;
      value: null | any;
    };

    initialize(cvar: AbstractVariable | number, value: number, constant: number): void;
    initializeFromHash(constant: number, terms: HashTable): Expression;

    multiplyMe(x: number): Expression;
    clone(): Expression;

    // REVIEW Check typings
    times(x: AbstractVariable | number): Expression;
    plus(x: Expression | Variable): Expression;
    minus(x: Expression | Variable): Expression;
    divide(x: Expression | number): Expression;

    addExpression(expr: Expression, n: number, subject: AbstractVariable): Expression;
    addVariable(v: AbstractVariable, cd: number, subject: any): Expression;
    setVariable(v: AbstractVariable, c: number): Expression;

    anyPivotableVariable(): null | boolean;

    substituteOut(outVar: AbstractVariable, expr: Expression, subject: AbstractVariable): void;
    changeSubject(old_subject: AbstractVariable, new_subject: AbstractVariable): void;
    newSubject(new_subject: AbstractVariable): number; // REVIEW I THINK that's right

    coefficientFor(clv: AbstractVariable): number;

    isConstant(): boolean; // getter

    toString(): string;

    Equals(other: Expression): boolean;
    Plus(e1: Expression, e2: Expression): Expression;
    Minus(e1: Expression, e2: Expression): Expression;
    Times(e1: Expression, e2: Expression): Expression;
    Divide(e1: Expression, e2: Expression): Expression;


  // methods
    _updateIfExternal(v: any): void;

  // static methods
    static empty(solver: SimplexSolver): Expression;
    static fromConstant(cons: any, solver: SimplexSolver): Expression;
    static fromValue(v: any, solver: SimplexSolver): Expression;
    static fromVariable(v: any, solver: SimplexSolver): Expression;
  }

  export class AbstractConstraint {
    hashCode: number;
    strength: Strength;
    weight: number;

    isEdit: boolean;
    isInequality: boolean;
    isStay: boolean;

    initialize(strength: Strength, weight: number): void;
    required(): boolean; // getter

    toString(): string;
  }

  export class EditConstraint extends AbstractConstraint {
    initialize(): void;
    toString(): string;
  }
  export class StayConstraint extends AbstractConstraint {
    initialize(): void;
    toString(): string;
  }

  export class Constraint extends AbstractConstraint {
    expression: Expression;
    // initialize(cle: Expression, strength: Strength, weight: number): void;
  }
  export class Inequality extends Constraint {
    isInequality: boolean;

    // REVIEW oh god this one is so dynamic
    // also typescript won't shutup unless I exclude this
    // initialize(
    //   a1: Expression | AbstractVariable | number,
    //   a2: Constraints,
    //   a3: Expression | AbstractVariable | number,
    //   a4: any,
    //   a5: any
    // ): void;

    toString(): string;

  // methods
    _cloneOrNewCle(cle: any): Expression;
  }
  export class Equation extends Constraint {

    // REVIEW oh god this one is even MORE dynamic
    // REVIEW also typescript won't shutup unless I exclude this
    // initialize(
    //   a1: Expression | AbstractVariable | number,
    //   a2: Strength | Expression | AbstractVariable | number,
    //   a3?: any,
    //   a4?: any,
    // ): void;

    toString(): string;
  }

  export class EditInfo {
    contraint: Constraint;
    editPlus: SlackVariable;
    editMinus: SlackVariable;
    prevEditConstraint: number;
    index: number;

    initialize(
      cn: Constraint,
      eplus: SlackVariable,
      eminus: SlackVariable,
      prevEditConstraint: number,
      i: number
    ): void;

    toString(): string;
  }

  export class Tableau {
    _infeasableRows: HashSet;
    _externalRows: HashSet;

    columns: HashTable;
    rows: HashTable;

    initialize(): void;

    noteRemovedVariable(v: AbstractVariable, subject: AbstractVariable): void;
    noteAddedVariable(v: AbstractVariable, subject: AbstractVariable): void;
    getInternalInfo(): string;
    toString(): string;

    insertColVar(param_var: Variable, expr: Expression): void;
    addRow(aVar: Variable, expr: Expression): void;
    removeColumn(aVar: AbstractVariable): void;
    removeRow(aVar: AbstractVariable): Expression;

    substituteOut(oldVar: AbstractVariable, expr: Expression): void;
    columnHasKey(subject: AbstractVariable): boolean;
  }

  export class SimplexSolver extends Tableau {
    _stayMinusErrorVars: any[];
    _stayPlusErrorVars: any[];
    _errorVars: HashTable;
    _markerVars: HashTable;
    _objective: ObjectiveVariable;
    _editVarMap: HashTable;
    _editVarList: any[];

    _slackCounter: number;
    _artificialCounter: number;
    _dummyCounter: number;
    _needsSolving: boolean;
    _optimizeCount: number;

    _editVariableStack: number[];
    _updatedExternals: HashSet;

    autoSolve: boolean;


    initialize(): void;

    add(...args: Constraint[]): SimplexSolver;
    addEditVar(v: Variable, strength: Strength, weight: number): SimplexSolver;
    addEditConstraint(): SimplexSolver;
    addConstraint(cn: Constraint | number | any): SimplexSolver;
    addConstraintNoException(cn: Constraint): boolean;

    beginEdit(): SimplexSolver;
    endEdit(): SimplexSolver;
    removeAllEditVars(): SimplexSolver;
    removeEditVarsTo(n: number): SimplexSolver;

    addPointStays(points: Array<{x: any, y: any, [key: string]: any}>): SimplexSolver;
    addStay(v: Variable, strength: Strength, weight: number): SimplexSolver;
    // setConstant(cn, constant): // NOTE calls a function that does not exist (https://github.com/slightlyoff/cassowary.js/blob/master/src/SimplexSolver.js#L186)

    removeConstraint(cn: Constraint): SimplexSolver;

    // reset(): ; // NOTE literally just throws an error (https://github.com/slightlyoff/cassowary.js/blob/master/src/SimplexSolver.js#L361)
    resolveArray(newEditConstraints: any): void;
    resolvePair(x: number, y: number): void;
    resolve(): void;

    suggestValue(v: Variable, x: number): SimplexSolver;
    solve(): SimplexSolver;

    setEditedValue(v: Variable, n: number): SimplexSolver;
    addVar(v: Variable): SimplexSolver;

    getInternalInfo(): string;
    getDebugInfo(): string;
    toString(): string;

    addWithArtificialVariable(expr: Expression): void;

    tryAddingDirectly(expr: Expression): boolean;
    chooseSubject(expr: Expression): any;
    deltaEditConstant(delta: number, plusErrorVar: AbstractVariable, minusErrorVar: AbstractVariable): void;
    dualOptimize(): void;

    newExpression(cn: Constraint): Expression;
    optimize(zVar: ObjectiveVariable): void;
    pivot(entryVar: AbstractVariable, exitVar: AbstractVariable): void;

    // NOTE: stub used for monkey patching. But please, for the love of god, just don't
    onSolved(): void;

    insertErrorVar(cn: Constraint, aVar: AbstractVariable): void;

  // methods
    _noteUpdatedExternal(v: any, expr: Expression): void;
    _addEditConstraint(cn: any, cvEplus: any, cvEminus: any, prevEConstraint: any): void;
    _resetStayConstants(): void;
    _setExternalVariables(): void;
    _informCallbacks(changes: any): void;
    _addCallback(fn: Function): void;
  }

  export class Timer {
    _elapsedMs: number;
    _startReading: Date;

    isRunning: boolean;

    initialize(): void;
    start(): Timer;
    stop(): Timer;
    reset(): Timer;
    elapsedTime(): number;

  }

  export function _api(...args: any): any;

  // NOTE parser isn't included because it seems irrelevant

}