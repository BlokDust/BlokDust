import {DeleteBlockOperation} from '../Operations/DeleteBlockOperation';
import {IApp} from '../IApp';
import {IBlock} from '../Blocks/IBlock';
import {ICommandHandler} from '../Core/Commands/ICommandHandler';
import {IUndoableOperation} from '../Core/Operations/IUndoableOperation';

declare var App: IApp;

export class DeleteBlockCommandHandler implements ICommandHandler {

    constructor() {

    }

    Execute(block: IBlock): Promise<any>{
        var op = new DeleteBlockOperation(block);
        return App.OperationManager.Do(op);
    }
}