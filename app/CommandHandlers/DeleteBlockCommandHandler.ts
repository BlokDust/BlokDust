import {DeleteBlockOperation} from '../Operations/DeleteBlockOperation';
import {IApp} from '../IApp';
import {IBlock} from '../Blocks/IBlock';
import {ICommandHandler} from '../Core/Commands/ICommandHandler';
import {Commands} from '../Commands';
import {CommandCategories} from '../CommandCategories';

declare var App: IApp;

export class DeleteBlockCommandHandler implements ICommandHandler {

    constructor() {

    }

    Execute(block: IBlock): Promise<any>{
        App.TrackEvent(CommandCategories.COMPOSITIONS.toString(), Commands.DELETE_BLOCK.toString(), block.BlockName);
        var op = new DeleteBlockOperation(block);
        return App.OperationManager.Do(op);
    }
}