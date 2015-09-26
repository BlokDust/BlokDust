import {AddItemToArrayOperation} from '../Core/Operations/AddItemToArrayOperation';
import {IApp} from '../IApp';
import {IBlock} from '../Blocks/IBlock';
import {ICommandHandler} from '../Core/Commands/ICommandHandler';
import {IUndoableOperation} from '../Core/Operations/IUndoableOperation';

declare var App: IApp;

export class CreateBlockCommandHandler implements ICommandHandler {

    constructor() {

    }

    Execute(block: IBlock): Promise<any>{
        var op:IUndoableOperation = new AddItemToArrayOperation<IBlock>(block, App.Blocks);
        return App.OperationManager.Do(op);
    }
}