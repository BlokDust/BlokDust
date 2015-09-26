import {IApp} from '../IApp';
import {IBlock} from '../Blocks/IBlock';
import {ICommandHandler} from '../Core/Commands/ICommandHandler';
import {IUndoableOperation} from '../Core/Operations/IUndoableOperation';
import {MoveBlockOperation} from '../Operations/MoveBlockOperation';

declare var App: IApp;

export class MoveBlockCommandHandler implements ICommandHandler {

    constructor() {

    }

    Execute(block: IBlock): Promise<any>{
        var op = new MoveBlockOperation(block);
        return App.OperationManager.Do(op);
    }
}
