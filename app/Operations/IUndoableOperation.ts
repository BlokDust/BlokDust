import IOperation = require("./IOperation");

interface IUndoableOperation extends IOperation
{
    Undo():void;
}

export = IUndoableOperation;