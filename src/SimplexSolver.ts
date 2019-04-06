import Tableau from "./Tableau";
import HashTable from "./HashTable";
import { ObjectiveVariable, Variable, SlackVariable, AbstractVariable, DummyVariable } from "./Variable";
import Expression from "./Expression";
import HashSet from "./HashSet";
import { Constraint, EditConstraint, StayConstraint } from "./Constraint";
import Strength from "./Strength";
import Editinfo from "./EditInfo";
import { InternalError, RequiredFailure } from "./Error";
import { approx } from "./c";


const _newExpressionInternalReturn: any = {
  eplus: null,
  eminus: null,
  prevEConstant: null
};
const epsilon = 1e-8;

export default class SimplexSolver extends Tableau {
  private _stayMinusErrorVars: any[];
  private _stayPlusErrorVars: any[];
  private _errorVars: HashTable;
  private _markerVars: HashTable;
  private _objective: ObjectiveVariable;
  private _editVarMap: HashTable;
  private _editVarList: any[];

  private _slackCounter: number;
  private _artificialCounter: number;
  private _dummyCounter: number;
  private _needsSolving: boolean;
  private _optimizeCount: number;

  private _editVariableStack: number[];
  private _updatedExternals: HashSet;

  private _callbacks: any;

  public autoSolve: boolean;

  constructor() {
    super();

    this._stayMinusErrorVars = [];
    this._stayPlusErrorVars = [];

    this._errorVars = new HashTable();

    this._markerVars = new HashTable();

    this._objective = new ObjectiveVariable({ name: "Z" })

    this._editVarMap = new HashTable();
    this._editVarList = [];

    this._slackCounter = 0;
    this._artificialCounter = 0;
    this._dummyCounter = 0;
    this.autoSolve = true;
    this._needsSolving = false;

    this._optimizeCount = 0;

    this.rows.set(this._objective, Expression.empty(this));
    this._editVariableStack = [0];
    this._updatedExternals = new HashSet();
  }

  add(...args: Constraint[]) {
    for (let x = 0; x < args.length; x++) {
      this.addConstraint(args[x]);
    }
    return this;
  }

  addEditVar(v: Variable, strength?: Strength, weight?: number) {
    // REVIEW big guess here as to what was wanted with weight as a default
    let cn = new EditConstraint(v, strength || Strength.strong, weight || 1);
    this.addEditConstraint(cn);
    return this;
  }

  addEditConstraint(cn: any) {
    let ir = _newExpressionInternalReturn;
    this.addEditConstraint(cn);
    this._addEditConstraint(cn, ir.eplus, ir.eminus, ir.prevEConstant);
    return this;
  }

  addConstraint(cn: Constraint) {
    if (cn instanceof Constraint) {
      cn.expression!.externalVariables.each((v: any) => {
        this._noteUpdatedExternal(v);
      });
    }
    let expr = this.newExpression(cn);
    expr.solver = this;

    if (!this.tryAddingDirectly(expr)) {
      this.addWithArtificialVariable(expr);
    }

    this._needsSolving = true;
    if (this.autoSolve) {
      this.optimize(this._objective);
      this._setExternalVariables();
    }
    return this;
  }

  addConstraintNoException(cn: Constraint) {
    try {
      this.addConstraint(cn);
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  beginEdit() {
    this.infeasibleRows.clear();
    this._resetStayConstants();
    this._editVariableStack[this._editVariableStack.length] = this._editVarMap.size;
    return this;
  }

  endEdit() {
    this.resolve();
    this._editVariableStack.pop();
    this.removeEditVarsTo(this._editVariableStack[this._editVariableStack.length - 1])
  }

  removeAllEditVars() { return this.removeEditVarsTo(0); }

  removeEditVarsTo(n: number) {
    try {
      let evll = this._editVarList.length;
      for (let x = n; x < evll; x++) {
        if (this._editVarList[x]) {
          this.removeConstraint(this._editVarMap.get(this._editVarList[x].v).constraint)
        }
      }
      this._editVarList.length = n;
      return this;
    } catch (e) {
      throw InternalError;
    }
  }

  addPointStays(...points: Array<{x: any, y: any, [key: string]: any}>) {
    points.forEach((p, idx) => {
      this.addStay(p.x, Strength.weak, Math.pow(2, idx));
      this.addStay(p.y, Strength.weak, Math.pow(2, idx));
    }, this);
    return this;
  }

  addStay(v: Variable, strength?: Strength, weight?: number) {
    let cn = new StayConstraint(v, strength || Strength.weak, weight || 1);
    return this.addConstraint(cn);
  }

  // calls a function that does not exist
  // setConstant(cn, constant) {
  //   this.setConstant(cn, constant);
  //   this.resolve();
  // }

  removeConstraint(cn: Constraint) {
    this._needsSolving = true;
    this._resetStayConstants();
    let zRow = this.rows.get(this._objective);
    let eVars = this._errorVars.get(cn);
    if (eVars !== null) {
      eVars.each((cv: any) => {
        let expr = this.rows.get(cv);
        if (expr === null) {
          zRow.addVariable(
            cv,
            -cn.weight * cn.strength.symbolicWeight.value,
            this._objective,
            this
          );
        }
        else {
          zRow.addExpression(
            expr,
            -cn.weight * cn.strength.symbolicWeight.value,
            this._objective,
            this
          );
        }
      }, this)
    }
    let marker = this._markerVars.get(cn);
    this._markerVars.delete(cn);
    if (marker === null) throw InternalError;
    if (this.rows.get(marker) === null) {
      let col = this.columns.get(marker);
      let exitVar: any = null;
      let minRatio = 0;
      col.each((v: any) => {
        if (v.isRestricted) {
          let expr = this.rows.get(v);
          let coeff = expr.coefficientFor(marker);
          if (coeff < 0) {
            let r = -expr.constant / coeff;
            if (exitVar ===  null || r < minRatio || (approx(r, minRatio) && v.hashCode < exitVar.hashCode)) {
              minRatio = r;
              exitVar = v;
            }
          }
        }
      }, this);
      if (exitVar === null) {
        col.each((v: any) => {
          if (v.isRestricted) {
            let expr = this.rows.get(v);
            let coeff = expr.coefficientFor(marker);
            let r = expr.constant / coeff;
            if (exitVar === null || r < minRatio) {
              minRatio = r;
              exitVar = v;
            }
          }
        }, this);
      }
      if (exitVar === null) {
        if (col.size === 0) {
          this.removeColumn(marker);
        } else {
          col.escapingEach((v: any) => {
            if (v !== this._objective) {
              exitVar = v;
              return { brk: true };
            }
          }, this);
        }
      }
      if (exitVar !== null) this.pivot(marker, exitVar);
    }
    // if (this.rows.get(marker) !== null) let expr = this.removeRow(marker); // unused
    if (eVars !== null) {
      eVars.each((v: any) => {
        if (v !== marker) this.removeColumn(v);
      }, this);
    }

    if (cn.isStay) {
      if (eVars !== null) {
        for (let i = 0; i < this._stayPlusErrorVars.length; i++) {
          eVars.delete(this._stayPlusErrorVars[i]);
          eVars.delete(this._stayMinusErrorVars[i]);
        }
      }
    } else if (cn.isEdit) {
      let cei = this._editVarMap.get((cn as EditConstraint).variable);
      this.removeColumn(cei.editMinus);
      this._editVarMap.delete((cn as EditConstraint).variable);
    }

    if (eVars !== null) this._errorVars.delete(eVars);

    if (this.autoSolve) {
      this.optimize(this._objective);
      this._setExternalVariables();
    }

    return this;
  }

  // not implemented
  reset() { throw InternalError; }

  resolveArray(newEditConstants: any) {
    let l = newEditConstants.length;
    this._editVarMap.each((v: any, cei: any) => {
      let i = cei.index;
      if (i < l) this.suggestValue(v, newEditConstants[i]);
    }, this)
    this.resolve();
  }

  resolvePair(x: number, y: number) {
    this.suggestValue(this._editVarList[0].v, x);
    this.suggestValue(this._editVarList[1].v, y);
    this.resolve();
  }

  resolve(): void {
    this.dualOptimize();
    this._setExternalVariables();
    this.infeasibleRows.clear();
    this._resetStayConstants();
  }

  suggestValue(v: Variable, x: number): SimplexSolver {
    var cei = this._editVarMap.get(v);
    if (!cei) {
      throw new Error("suggestValue for variable " + v + ", but var is not an edit variable");
    }
    var delta = x - cei.prevEditConstant;
    cei.prevEditConstant = x;
    this.deltaEditConstant(delta, cei.editPlus, cei.editMinus);
    return this;
  }

  solve(): SimplexSolver {
    if (this._needsSolving) {
      this.optimize(this._objective);
      this._setExternalVariables();
    }
    return this;
  };

  setEditedValue(v: Variable, n: number): SimplexSolver {
    if (!(this.columnsHasKey(v) || (this.rows.get(v) !== null))) {
      v.value = n;
      return this;
    }

    if (!approx(n, v.value as number)) {
      this.addEditVar(v);
      this.beginEdit();

      try {
        this.suggestValue(v, n);
      } catch (e) {
        throw InternalError;
      }

      this.endEdit();
    }
    return this;
  };

  addVar(v: Variable): SimplexSolver {
    if (!(this.columnsHasKey(v) || (this.rows.get(v) != null))) {
      try {
        this.addStay(v);
      } catch (e /*RequiredFailure*/){
        throw InternalError;
      }
    }
    return this;
  };

  getInternalInfo(): string {
    var retstr = Tableau.prototype.getInternalInfo.call(this);
    retstr += "\nSolver info:\n";
    retstr += "Stay Error Variables: ";
    retstr += this._stayPlusErrorVars.length + this._stayMinusErrorVars.length;
    retstr += " (" + this._stayPlusErrorVars.length + " +, ";
    retstr += this._stayMinusErrorVars.length + " -)\n";
    retstr += "Edit Variables: " + this._editVarMap.size;
    retstr += "\n";
    return retstr;
  };
  getDebugInfo(): string {
    return this.toString() + this.getInternalInfo() + "\n";
  };
  toString(): string {
    var bstr = Tableau.prototype.getInternalInfo.call(this);
    bstr += "\n_stayPlusErrorVars: ";
    bstr += '[' + this._stayPlusErrorVars + ']';
    bstr += "\n_stayMinusErrorVars: ";
    bstr += '[' + this._stayMinusErrorVars + ']';
    bstr += "\n";
    bstr += "_editVarMap:\n" + this._editVarMap;
    bstr += "\n";
    return bstr;
  };

  addWithArtificialVariable(expr: Expression): void {
    let av = new SlackVariable({
      value: ++this._artificialCounter,
      prefix: "a"
    });
    let az = new ObjectiveVariable({ name: "az" });
    let azRow = /* Expression */expr.clone();
    this.addRow(az, azRow);
    this.addRow(av, expr);
    this.optimize(az);
    let azTableauRow = this.rows.get(az);
    if (!approx(azTableauRow.constant, 0)) {
      this.removeRow(az);
      this.removeColumn(av);
      throw RequiredFailure;
    }
    let e = this.rows.get(av);
    if (e != null) {
      if (e.isConstant) {
        this.removeRow(av);
        this.removeRow(az);
        return;
      }
      let entryVar = e.anyPivotableVariable();
      this.pivot(entryVar, av);
    }
    // assert(this.rows.get(av) == null, "rowExpression(av) == null");
    this.removeColumn(av);
    this.removeRow(az);
  };

  tryAddingDirectly(expr: Expression): boolean {
    var subject = this.chooseSubject(expr);
    if (subject === null) {
      return false;
    }
    expr.newSubject(subject);
    if (this.columnsHasKey(subject)) {
      this.substituteOut(subject, expr);
    }
    this.addRow(subject, expr);
    return true;
  };
  chooseSubject(expr: Expression): any {
    let subject = null;
    let foundUnrestricted = false;
    let foundNewRestricted = false;
    let terms = expr.terms;
    let rv = terms.escapingEach((v: any, c: any) => {
      if (foundUnrestricted) {
        if (!v.isRestricted) {
          if (!this.columnsHasKey(v)) {
            return { retval: v };
          }
        }
      } else {
        if (v.isRestricted) {
          if (!foundNewRestricted && !v.isDummy && c < 0) {
            let col = this.columns.get(v);
            if (col == null ||
                (col.size == 1 && this.columnsHasKey(this._objective))
            ) {
              subject = v;
              foundNewRestricted = true;
            }
          }
        } else {
          subject = v;
          foundUnrestricted = true;
        }
      }
    }, this);
    if (rv && rv.retval !== undefined) {
      return rv.retval;
    }

    if (subject != null) {
      return subject;
    }

    let coeff = 0;

    // subject is nil.
    // Make one last check -- if all of the letiables in expr are dummy
    // letiables, then we can pick a dummy letiable as the subject
    rv = terms.escapingEach((v: any, c: any) => {
      if (!v.isDummy)  {
        return {retval:null};
      }
      if (!this.columnsHasKey(v)) {
        subject = v;
        coeff = c;
      }
    }, this);
    if (rv && rv.retval !== undefined) return rv.retval;

    if (!approx(expr.constant, 0)) {
      throw RequiredFailure;
    }
    if (coeff > 0) expr.multiplyMe(-1);

    return subject;
  }
  deltaEditConstant(delta: number, plusErrorVar: AbstractVariable, minusErrorVar: AbstractVariable): void {
    var exprPlus = this.rows.get(plusErrorVar);
    if (exprPlus !== null) {
      exprPlus.constant += delta;
      if (exprPlus.constant < 0) {
        this.infeasibleRows.add(plusErrorVar);
      }
      return;
    }
    var exprMinus = this.rows.get(minusErrorVar);
    if (exprMinus !== null) {
      exprMinus.constant += -delta;
      if (exprMinus.constant < 0) {
        this.infeasibleRows.add(minusErrorVar);
      }
      return;
    }
    var columnVars = this.columns.get(minusErrorVar);
    if (!columnVars) {
      console.log("columnVars is null -- tableau is:\n" + this);
    }
    columnVars.each((basicVar: any) => {
      var expr = this.rows.get(basicVar);
      var c = expr.coefficientFor(minusErrorVar);
      expr.constant += (c * delta);
      if (basicVar.isExternal) {
        this._noteUpdatedExternal(basicVar);
      }
      if (basicVar.isRestricted && expr.constant < 0) {
        this.infeasibleRows.add(basicVar);
      }
    }, this);
  }
  dualOptimize(): void {
    let zRow = this.rows.get(this._objective);
    // need to handle infeasible rows
    while (this.infeasibleRows.size) {
      let exitVar = this.infeasibleRows.first();
      this.infeasibleRows.delete(exitVar);
      let entryVar: any = null;
      let expr = this.rows.get(exitVar);
      // exitVar might have become basic after some other pivoting
      // so allow for the case of its not being there any longer
      if (expr) {
        if (expr.constant < 0) {
          let ratio = Number.MAX_VALUE;
          let r;
          let terms = expr.terms;
          terms.each(function(v: any, cd: any) {
            if (cd > 0 && v.isPivotable) {
              let zc = zRow.coefficientFor(v);
              r = zc / cd;
              if (r < ratio ||
                  (approx(r, ratio) && v.hashCode < entryVar.hashCode)
              ) {
                entryVar = v;
                ratio = r;
              }
            }
          });
          if (ratio == Number.MAX_VALUE) {
            throw InternalError;
          }
          this.pivot(entryVar, exitVar);
        }
      }
    }
  };

  newExpression(cn: Constraint): Expression {
    let ir = _newExpressionInternalReturn;
    ir.eplus = null;
    ir.eminus = null;
    ir.prevEConstant = null;

    let cnExpr = cn.expression!;
    let expr = Expression.fromConstant(cnExpr.constant, this);
    let slackVar = new SlackVariable();
    let dummyVar = new DummyVariable();
    let eminus = new SlackVariable();
    let eplus = new SlackVariable();
    let cnTerms = cnExpr.terms;

    // FIXME(slightlyoff): slow!!
    cnTerms.each((v: any, c: any) => {
      let e = this.rows.get(v);
      if (!e) {
        expr.addVariable(v, c);
      } else {
        expr.addExpression(e, c);
      }
    }, this);

    if (cn.isInequality) {
      // cn is an inequality, so Add a slack letiable. The original constraint
      // is expr>=0, so that the resulting equality is expr-slackVar=0. If cn is
      // also non-required Add a negative error letiable, giving:
      //
      //    expr - slackVar = -errorVar
      //
      // in other words:
      //
      //    expr - slackVar + errorVar = 0
      //
      // Since both of these letiables are newly created we can just Add
      // them to the Expression (they can't be basic).
      ++this._slackCounter;
      slackVar = new SlackVariable({
        value: this._slackCounter,
        prefix: "s"
      });
      expr.setVariable(slackVar, -1);

      this._markerVars.set(cn, slackVar);
      if (!cn.required) {
        ++this._slackCounter;
        eminus = new SlackVariable({
          value: this._slackCounter,
          prefix: "em"
        });
        expr.setVariable(eminus, 1);
        let zRow = this.rows.get(this._objective);
        zRow.setVariable(eminus, cn.strength.symbolicWeight.value * cn.weight);
        this.insertErrorVar(cn, eminus);
        this.noteAddedVariable(eminus, this._objective);
      }
    } else {
      if (cn.required) {
        // Add a dummy letiable to the Expression to serve as a marker for this
        // constraint.  The dummy letiable is never allowed to enter the basis
        // when pivoting.
        ++this._dummyCounter;
        dummyVar = new DummyVariable({
          value: this._dummyCounter,
          prefix: "d"
        });
        ir.eplus = dummyVar;
        ir.eminus = dummyVar;
        ir.prevEConstant = cnExpr.constant;
        expr.setVariable(dummyVar, 1);
        this._markerVars.set(cn, dummyVar);
      } else {
        // cn is a non-required equality. Add a positive and a negative error
        // letiable, making the resulting constraint
        //       expr = eplus - eminus
        // in other words:
        //       expr - eplus + eminus = 0
        ++this._slackCounter;
        eplus = new SlackVariable({
          value: this._slackCounter,
          prefix: "ep"
        });
        eminus = new SlackVariable({
          value: this._slackCounter,
          prefix: "em"
        });
        expr.setVariable(eplus, -1);
        expr.setVariable(eminus, 1);
        this._markerVars.set(cn, eplus);
        let zRow = this.rows.get(this._objective);
        let swCoeff = cn.strength.symbolicWeight.value * cn.weight;

        zRow.setVariable(eplus, swCoeff);
        this.noteAddedVariable(eplus, this._objective);
        zRow.setVariable(eminus, swCoeff);
        this.noteAddedVariable(eminus, this._objective);

        this.insertErrorVar(cn, eminus);
        this.insertErrorVar(cn, eplus);

        if (cn.isStay) {
          this._stayPlusErrorVars[this._stayPlusErrorVars.length] = eplus;
          this._stayMinusErrorVars[this._stayMinusErrorVars.length] = eminus;
        } else if (cn.isEdit) {
          ir.eplus = eplus;
          ir.eminus = eminus;
          ir.prevEConstant = cnExpr.constant;
        }
      }
    }
    // the Constant in the Expression should be non-negative. If necessary
    // normalize the Expression by multiplying by -1
    if (expr.constant < 0) expr.multiplyMe(-1);
    return expr;
  };
  optimize(zVar: ObjectiveVariable): void {
    this._optimizeCount++;

    let zRow = this.rows.get(zVar);
    // c.assert(zRow != null, "zRow != null");
    let entryVar: any = null;
    let exitVar: any = null;
    let objectiveCoeff: any, terms;

    while (true) {
      objectiveCoeff = 0;
      terms = zRow.terms;

      // Find the most negative coefficient in the objective function (ignoring
      // the non-pivotable dummy letiables). If all coefficients are positive
      // we're done
      terms.escapingEach((v: any, c: any) => {
        if (v.isPivotable && c < objectiveCoeff) {
          objectiveCoeff = c;
          entryVar = v;
          // Break on success
          return { brk: 1 };
        }
      }, this);

      if (objectiveCoeff >= -epsilon) {
        return;
      }

      // choose which letiable to move out of the basis
      // Only consider pivotable basic letiables
      // (i.e. restricted, non-dummy letiables)
      let minRatio = Number.MAX_VALUE;
      let columnVars = this.columns.get(entryVar);
      let r = 0;

      columnVars.each((v: any) => {
        if (v.isPivotable) {
          let expr = this.rows.get(v);
          let coeff = expr.coefficientFor(entryVar);
          // only consider negative coefficients
          if (coeff < 0) {
            r = -expr.constant / coeff;
            // Bland's anti-cycling rule:
            // if multiple letiables are about the same,
            // always pick the lowest via some total
            // ordering -- I use their addresses in memory
            //    if (r < minRatio ||
            //              (c.approx(r, minRatio) &&
            //               v.get_pclv() < exitVar.get_pclv()))
            if (r < minRatio ||
                (approx(r, minRatio) &&
                 v.hashCode < exitVar.hashCode)
            ) {
              minRatio = r;
              exitVar = v;
            }
          }
        }
      }, this);

      // If minRatio is still nil at this point, it means that the
      // objective function is unbounded, i.e. it can become
      // arbitrarily negative.  This should never happen in this
      // application.
      if (minRatio == Number.MAX_VALUE) {
        throw InternalError; // c.InternalError("Objective function is unbounded in optimize");
      }

      // console.time("SimplexSolver::optimize pivot()");
      this.pivot(entryVar, exitVar);
      // console.timeEnd("SimplexSolver::optimize pivot()");
    }
  };
  pivot(entryVar: AbstractVariable, exitVar: AbstractVariable): void {
    let time = false;
    time && console.time(" SimplexSolver::pivot");

    // the entryVar might be non-pivotable if we're doing a RemoveConstraint --
    // otherwise it should be a pivotable variable -- enforced at call sites,
    // hopefully
    if (entryVar == null) {
      console.warn("pivot: entryVar == null");
    }

    if (exitVar == null) {
      console.warn("pivot: exitVar == null");
    }
    // console.log("SimplexSolver::pivot(", entryVar, exitVar, ")")

    // expr is the Expression for the exit variable (about to leave the basis) --
    // so that the old tableau includes the equation:
    //   exitVar = expr
    time && console.time("  removeRow");
    let expr = this.removeRow(exitVar);
    time && console.timeEnd("  removeRow");

    // Compute an Expression for the entry variable.  Since expr has
    // been deleted from the tableau we can destructively modify it to
    // build this Expression.
    time && console.time("  changeSubject");
    expr.changeSubject(exitVar, entryVar);
    time && console.timeEnd("  changeSubject");

    time && console.time("  substituteOut");
    this.substituteOut(entryVar, expr);
    time && console.timeEnd("  substituteOut");

    time && console.time("  addRow")
    this.addRow(entryVar, expr);
    time && console.timeEnd("  addRow")

    time && console.timeEnd(" SimplexSolver::pivot");
  };

  // NOTE: stub used for monkey patching. But please, for the love of god, just don't
  onSolved(): void {}; // I ain't touching this no worries

  insertErrorVar(cn: Constraint, aVar: AbstractVariable): void {
    let constraintSet = /* Set */this._errorVars.get(cn);
    if (!constraintSet) {
      constraintSet = new HashSet();
      this._errorVars.set(cn, constraintSet);
    }
    constraintSet.add(aVar);
  };

  private _noteUpdatedExternal(v: any, expr?: Expression) {
    this._updatedExternals.add(v);
  }

  private _addEditConstraint(cn: any, cvEplus: any, cvEminus: any, prevEConstant: any) {
    let i = this._editVarMap.size;
    let ei = new Editinfo(cn, cvEplus, cvEminus, prevEConstant, i);
    this._editVarMap.set(cn.variable, ei);
    this._editVarList[i] = { v: cn.variable, info: ei };
  }

  private _resetStayConstants(): void {
    var spev = this._stayPlusErrorVars;
    var l = spev.length;
    for (var i = 0; i < l; i++) {
      var expr = this.rows.get(spev[i]);
      if (expr === null) {
        expr = this.rows.get(this._stayMinusErrorVars[i]);
      }
      if (expr != null) {
        expr.constant = 0;
      }
    }
  };

  private _setExternalVariables(): void {
    var changes: any[] = [];
    this._updatedExternals.each((v: any) => {
      // console.log("got updated", v.name, v.hashCode);
      var iv = v.value;
      // var expr = this._externalRows.get(v);
      var expr = this._externalRows.get(v);
      if (!expr) {
        v.value = 0;
        return;
      }
      v.value = expr.constant;
      if (iv !== v.value) {
        // console.log(v.name, iv, "-->", v.value, iv === v.value);
        changes.push({
          type: "update",
          name: v.name,
          variable: v,
          oldValue: iv
        });
      }
    }, this);

    this._updatedExternals.clear();
    this._needsSolving = false;
    this._informCallbacks(changes);
    // nope
    // if (changes.length) {
    //   // this.onSolved(changes);
    // }
  };
  private _informCallbacks(changes: any): void {
    if(!this._callbacks) return;

    this._callbacks.forEach((fn: any) => {
      fn(changes);
    });
  };
  private _addCallback(fn: Function): void {
    var a = (this._callbacks || (this._callbacks = []));
    a[a.length] = fn;
  };


}