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

        // increment a number 5 times
        this.Operations.push(new IncrementNumberOperation(n));
        this.Operations.push(new IncrementNumberOperation(n));
        this.Operations.push(new IncrementNumberOperation(n));
        this.Operations.push(new IncrementNumberOperation(n));
        this.Operations.push(new IncrementNumberOperation(n));
    }

    Do(): Promise<Number> {
        return super.Do();
    }

    Undo(): Promise<Number> {
        return super.Undo();
    }
}

export = IncrementNumberCompoundOperation;