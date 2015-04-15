import IUndoableOperation = require("./IUndoableOperation");

class IncrementNumberOperation<Number> implements IUndoableOperation
{
    private _Number: number;

    constructor(n: number) {
        this._Number = n;
    }

    Do(): Promise<Number> {
        var that = this;

        return new Promise((resolve) => {

            that._Number = that._Number + 1;

            console.log(that._Number);

            resolve(that._Number);
        });
    }

    Undo(): Promise<Number> {
        var that = this;

        return new Promise((resolve) => {

            that._Number = that._Number - 1;

            console.log(that._Number);

            resolve(that._Number);
        });
    }

    Dispose(): void {

    }
}

export = IncrementNumberOperation;