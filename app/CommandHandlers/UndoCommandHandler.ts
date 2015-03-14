import ICommandHandler = require("../Core/Commands/ICommandHandler");

class UndoCommandHandler implements ICommandHandler {

    constructor() {

    }

    Execute(): void{
        if (App.OperationManager.CanUndo()) {
            App.OperationManager.Undo();
        }
    }
}

export = UndoCommandHandler;