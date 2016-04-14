import {IApp} from '../IApp';
import {IBlock} from '../Blocks/IBlock';
import {ICommandHandler} from '../Core/Commands/ICommandHandler';
import {MoveBlockOperation} from '../Operations/MoveBlockOperation';
import {Commands} from '../Commands';
import {CommandCategories} from '../CommandCategories';

declare var App: IApp;

export class MoveBlockCommandHandler implements ICommandHandler {

    constructor() {

    }

    Execute(block: IBlock): Promise<any>{
        App.TrackEvent(CommandCategories.COMPOSITIONS.toString(), Commands.MOVE_BLOCK.toString(), block.BlockName);
        var op = new MoveBlockOperation(block);
        return App.OperationManager.Do(op);
    }
}
