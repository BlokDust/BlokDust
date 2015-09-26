import {CompoundOperation} from '../Core/Operations/CompoundOperation';
import {ICompoundOperation} from '../Core/Operations/ICompoundOperation';
import {IncrementNumberOperation} from '../Core/Operations/IncrementNumberOperation';
import {IUndoableOperation} from '../Core/Operations/IUndoableOperation';

export class IncrementNumberCompoundOperation<Number> extends CompoundOperation<Number> implements IUndoableOperation, ICompoundOperation
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