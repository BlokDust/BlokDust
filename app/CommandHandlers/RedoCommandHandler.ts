import ICommandHandler = require("../Core/Commands/ICommandHandler");

class RedoCommandHandler implements ICommandHandler {

    constructor() {

    }

    Execute(): void{
        if (App.OperationManager.CanRedo()){
            App.OperationManager.Redo();
        }
    }
}

export = RedoCommandHandler;