import {IApp} from '../IApp';
import {ICommandHandler} from '../Core/Commands/ICommandHandler';

declare var App: IApp;

export class RedoCommandHandler implements ICommandHandler {

    constructor() {

    }

    Execute(): Promise<any>{
        if (App.OperationManager.CanRedo()){
            return App.OperationManager.Redo();
        }
    }
}