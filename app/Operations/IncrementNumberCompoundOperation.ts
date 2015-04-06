import IUndoableOperation = require("../Core/Operations/IUndoableOperation");
import ICompoundOperation = require("../Core/Operations/ICompoundOperation");
import CompoundOperation = require("../Core/Operations/CompoundOperation");
import IncrementNumberOperation = require("../Core/Operations/IncrementNumberOperation");

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

    Dispose(): void {

    }
}

export = IncrementNumberCompoundOperation;