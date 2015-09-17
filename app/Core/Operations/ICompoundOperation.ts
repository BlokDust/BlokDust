import {IOperation} from './IOperation';

export interface ICompoundOperation extends IOperation {
    Operations: IOperation[];
    AddOperation: (op: IOperation) => void;
    RemoveOperation: (op: IOperation) => void;
}