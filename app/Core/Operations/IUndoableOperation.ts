import IOperation = require("./IOperation");

interface IUndoableOperation extends IOperation
{
    Undo(): Promise<any>;
}

export = IUndoableOperation;