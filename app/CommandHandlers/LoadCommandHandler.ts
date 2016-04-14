import {IApp} from '../IApp';
import {ICommandHandler} from '../Core/Commands/ICommandHandler';
import {IOperation} from '../Core/Operations/IOperation';
import {LoadOperation} from '../Operations/LoadOperation';
import {Commands} from '../Commands';
import {CommandCategories} from '../CommandCategories';

declare var App: IApp;

export class LoadCommandHandler implements ICommandHandler {

    constructor() {

    }

    Execute(id: string): Promise<any>{
        App.TrackEvent(CommandCategories.COMPOSITIONS.toString(), Commands.LOAD.toString(), id);
        var op:IOperation = new LoadOperation(id);
        return App.OperationManager.Do(op);
    }
}