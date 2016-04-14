import {IApp} from '../IApp';
import {ICommandHandler} from '../Core/Commands/ICommandHandler';
import {Commands} from '../Commands';
import {CommandCategories} from '../CommandCategories';

declare var App: IApp;

export class RedoCommandHandler implements ICommandHandler {

    constructor() {

    }

    Execute(): Promise<any>{
        if (App.OperationManager.CanRedo()){
            App.TrackEvent(CommandCategories.COMPOSITIONS.toString(), Commands.REDO.toString());
            return App.OperationManager.Redo();
        }
    }
}