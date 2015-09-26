import {IOperation} from './IOperation';

export interface IUndoableOperation extends IOperation {
    Undo(): Promise<any>;
}