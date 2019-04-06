import { Constraint } from "./Constraint";
import { SlackVariable } from "./Variable";


export default class Editinfo {

  public constraint: Constraint;
  public editPlus: SlackVariable;
  public editMinus: SlackVariable;
  public prevEditConstant: number;
  public index: number;


  constructor(cn: Constraint,
              eplus: SlackVariable,
              eminus: SlackVariable,
              prevEditConstant: number,
              i: number) {
    this.constraint = cn;
    this.editPlus = eplus;
    this.editMinus = eminus;
    this.prevEditConstant = prevEditConstant;
    this.index = i;
  }

  toString() {
    return "<cn=" + this.constraint +
           ", ep=" + this.editPlus +
           ", em=" + this.editMinus +
           ", pec=" + this.prevEditConstant +
           ", index=" + this.index + ">";
  }
}