import IUndoableOperation = require("./IUndoableOperation");
import ICompoundOperation = require("./ICompoundOperation");
import CompoundOperation = require("./CompoundOperation");
import IncrementNumberOperation = require("./IncrementNumberOperation");

class IncrementNumberCompoundOperation<Number> extends CompoundOperation<Number> implements IUndoableOperation, ICompoundOperation
{
    private _Number: number;

    constructor(n: number) {
        super();
        this._Number = n;

        this.Operations.push(new IncrementNumberOperation(n));
        this.Operations.push(new IncrementNumberOperation(n + 1));
        this.Operations.push(new IncrementNumberOperation(n + 2));
    }

    Do(): Promise<Number> {
        return super.Do();
    }

    Undo(): Promise<Number> {
        return super.Undo();
    }
}

export = IncrementNumberCompoundOperation;