import HashSet from "./HashSet";
import HashTable from "./HashTable";
import { AbstractVariable, Variable } from "./Variable";
import Expression from "./Expression";


export default class Tableau {
  // because it's accessed in its child it must be public
  public _externalRows: HashSet;
  public _externalParametricVars: HashSet;

  public infeasibleRows: HashSet;
  public columns: HashTable;
  public rows: HashTable;

  constructor() {
    this.columns = new HashTable();
    this.rows = new HashTable();

    this.infeasibleRows = new HashSet();
    this._externalRows = new HashSet();
    this._externalParametricVars = new HashSet();
  }

  noteRemovedVariable(v: AbstractVariable, subject: AbstractVariable) {
    let column = this.columns.get(v);
    if (subject && column) column.delete(subject);
  }

  noteAddedVariable(v: AbstractVariable, subject: AbstractVariable) {
    if (subject) this.insertColVar(v, subject);
  }

  getInternalInfo() {
    return "Tableau Information:\n" +
           "Rows: " + this.rows.size +
            " (= " + (this.rows.size - 1) + " constraints)" +
            "\nColumns: " + this.columns.size +
            "\nInfeasible Rows: " + this.infeasibleRows.size +
            "\nExternal basic variables: " + this._externalRows.size;
  }

  toString() {
    let str = "Tableau:\n";
    this.rows.each(function(clv: any, expr: any) {
      str += clv + " <==> " + expr + "\n";
    });
    str += "\nColumns:\n";
    str += this.columns;
    str += "\nInfeasible rows: ";
    str += this.infeasibleRows;
    str += "External basic variables: ";
    str += this._externalRows;
    return str;
  }

  insertColVar(param_var: AbstractVariable, rowvar: AbstractVariable) {
    let rowset = this.columns.get(param_var);
    if (!rowset) {
      rowset = new HashSet();
      this.columns.set(param_var, rowset);
    }
    rowset.add(rowvar);
  }

  addRow(aVar: AbstractVariable, expr: Expression) {
    this.rows.set(aVar, expr);
    expr.terms.each((clv: any) => {
      this.insertColVar(clv, aVar);
      if (clv.isExternal) this._externalParametricVars.add(clv);
    }, this)
    if (aVar.isExternal) this._externalRows.add(aVar);
  }

  removeColumn(aVar: AbstractVariable) {
    let rows = this.columns.get(aVar);
    if (rows != null) {
      this.columns.delete(aVar);
      rows.each((clv: any) => {
        let expr = this.rows.get(clv);
        expr.terms.delete(aVar);
      })
    }
    if (aVar.isExternal) {
      this._externalRows.delete(aVar);
      this._externalParametricVars.delete(aVar);
    }
  }

  removeRow(aVar: AbstractVariable) {
    let expr: Expression = this.rows.get(aVar);
    // hopefully this isn't null
    expr.terms.each((clv: any) => {
      // @ts-ignore-next-line
      let varset = this.columns.get(clv);
      if (varset != null) varset.delete(aVar);
    }, this);
    this.infeasibleRows.delete(aVar);
    if (aVar.isExternal) this._externalRows.delete(aVar);
    this.rows.delete(aVar);
    return expr;
  }

  substituteOut(oldVar: AbstractVariable, expr: Expression) {
    let varset = this.columns.get(oldVar);
    // forgive me...
    varset.each((v: any) => {
      let row = this.rows.get(v);
      row.substituteOut(oldVar, expr, v, this);
      if (v.isRestricted && row.constant < 0) this.infeasibleRows.add(v);
    });

    if (oldVar.isExternal) {
      this._externalRows.add(oldVar);
      this._externalParametricVars.delete(oldVar);
    }

    this.columns.delete(oldVar);
  }

  columnsHasKey(subject: AbstractVariable) {
    return !!this.columns.get(subject);
  }
}