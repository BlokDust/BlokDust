import {ICommandHandler} from '../Core/Commands/ICommandHandler';
import {IApp} from '../IApp';

declare var App: IApp;

export class UndoCommandHandler implements ICommandHandler {

    constructor() {

    }

    Execute(): Promise<any>{
        if (App.OperationManager.CanUndo()) {
            return App.OperationManager.Undo();
        }
    }
}