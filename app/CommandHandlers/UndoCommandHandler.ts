import {ICommandHandler} from '../Core/Commands/ICommandHandler';

export class UndoCommandHandler implements ICommandHandler {

    constructor() {

    }

    Execute(): Promise<any>{
        if (App.OperationManager.CanUndo()) {
            return App.OperationManager.Undo();
        }
    }
}