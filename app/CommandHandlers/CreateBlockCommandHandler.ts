import {AddItemToArrayOperation} from '../Core/Operations/AddItemToArrayOperation';
import {IApp} from '../IApp';
import {IBlock} from '../Blocks/IBlock';
import {ICommandHandler} from '../Core/Commands/ICommandHandler';
import {IUndoableOperation} from '../Core/Operations/IUndoableOperation';
import {Commands} from "../Commands";
import {CommandCategories} from "../CommandCategories";

declare var App: IApp;

export class CreateBlockCommandHandler implements ICommandHandler {

    constructor() {

    }

    Execute(block: IBlock): Promise<any>{
        App.TrackEvent(CommandCategories.COMPOSITIONS.toString(), Commands.CREATE_BLOCK.toString(), block.BlockName);
        var op:IUndoableOperation = new AddItemToArrayOperation<IBlock>(block, App.Blocks);
        return App.OperationManager.Do(op);
    }
}