import IOperation = require("IOperation");
import IUndoableOperation = require("IUndoableOperation");
import ICompoundOperation = require("ICompoundOperation");

class CompoundOperation<T> implements ICompoundOperation {
    public Operations: IOperation[] = [];

    public AddOperation(operation: IOperation): void {
        this.Operations.push(operation);
    }

    public RemoveOperation(operation: IOperation): void {
        this.Operations.remove(operation);
    }

    public Do(): Promise<T> {
        var sequence = Promise.resolve();

        this.Operations.forEach((op: IOperation) => {
            sequence = sequence.then(() => {
                return op.Do()
            });
        });

        return sequence;
    }

    public Undo(): Promise<T> {
        var ops = this.Operations.clone().reverse();

        var sequence = Promise.resolve();

        ops.forEach((op: IUndoableOperation) => {
            sequence = sequence.then(() => {
                return op.Undo()
            });
        });

        return sequence;
    }

    Dispose(): void {
        this.Operations.forEach((op: IOperation) => {
            op.Dispose();
        });
    }
}

export = CompoundOperation;