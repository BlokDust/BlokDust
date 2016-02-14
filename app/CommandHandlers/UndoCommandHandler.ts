import {ICommandHandler} from '../Core/Commands/ICommandHandler';
import {IApp} from '../IApp';
import {Commands} from "../Commands";
import {CommandCategories} from "../CommandCategories";

declare var App: IApp;

export class UndoCommandHandler implements ICommandHandler {

    constructor() {

    }

    Execute(): Promise<any>{
        if (App.OperationManager.CanUndo()) {
            App.TrackEvent(CommandCategories.COMPOSITIONS.toString(), Commands.UNDO.toString());
            return App.OperationManager.Undo();
        }
    }
}