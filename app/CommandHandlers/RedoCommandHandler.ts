import ICommandHandler = require("../Core/Commands/ICommandHandler");

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