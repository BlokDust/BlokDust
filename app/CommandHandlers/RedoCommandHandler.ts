import {ICommandHandler} from '../Core/Commands/ICommandHandler';

export class RedoCommandHandler implements ICommandHandler {

    constructor() {

    }

    Execute(): Promise<any>{
        if (App.OperationManager.CanRedo()){
            return App.OperationManager.Redo();
        }
    }
}