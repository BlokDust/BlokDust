import IOperation = require("./IOperation");

interface ICompoundOperation extends IOperation {
    Operations: IOperation[];
    AddOperation: (op: IOperation) => void;
    RemoveOperation: (op: IOperation) => void;
}

export = ICompoundOperation;