import { Variable } from "./Variable";
import Expression from "./Expression";

console.log("butts");

const exprFromVarOrValue = (v: number | Variable) => {
  if (typeof v == "number" ) {
    return Expression.fromConstant(v);
  } else if(v instanceof Variable) {
    return Expression.fromVariable(v);
  }
  return v;
};

const epsilon = 1e-8;

export const GEQ = 1;
export const LEQ = 2;

export enum Equalities {
  GEQ = 1,
  LEQ = 2
}

type VarOrValue = number | Variable;
export const plus = (e1: VarOrValue, e2: VarOrValue) => {
  let o1 = exprFromVarOrValue(e1);
  let o2 = exprFromVarOrValue(e2);
  return o1.plus(o2);
}
export const minus = (e1: VarOrValue, e2: VarOrValue) => {
  let o1 = exprFromVarOrValue(e1);
  let o2 = exprFromVarOrValue(e2);
  return o1.minus(o2);
}
export const times = (e1: VarOrValue, e2: VarOrValue) => {
  let o1 = exprFromVarOrValue(e1);
  let o2 = exprFromVarOrValue(e2);
  return o1.times(o2);
}
export const divide = (e1: VarOrValue, e2: VarOrValue) => {
  let o1 = exprFromVarOrValue(e1);
  let o2 = exprFromVarOrValue(e2);
  return o1.divide(o2);
}

export const approx = (a: number | string, b: number | string) => {
  a = +(a);
  b = +(b);
  if (a === b) return true;
  if (a == 0) return (Math.abs(b) < epsilon);
  if (b == 0) return (Math.abs(a) < epsilon);
  return (Math.abs(a - b) < Math.abs(a) * epsilon);
}

var count = 0;
export const _inc = () => {
  console.log(count);
  return count++;
}