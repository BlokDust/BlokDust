import ICommandHandler = require("../Core/Commands/ICommandHandler");

import IApp = require("../IApp");

declare var App: IApp;

class RedoCommandHandler implements ICommandHandler {

    constructor() {

    }

    Execute(): Promise<any>{
        if (App.OperationManager.CanRedo()){
            return App.OperationManager.Redo();
        }
    }
}

export = RedoCommandHandler;