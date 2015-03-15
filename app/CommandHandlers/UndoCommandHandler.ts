import ICommandHandler = require("../Core/Commands/ICommandHandler");

class UndoCommandHandler implements ICommandHandler {

    constructor() {

    }

    Execute(): Promise<any>{
        if (App.OperationManager.CanUndo()) {
            return App.OperationManager.Undo();
        }
    }
}

export = UndoCommandHandler;