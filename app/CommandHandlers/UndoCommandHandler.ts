import ICommandHandler = require("../Core/Commands/ICommandHandler");

import IApp = require("../IApp");

declare var App: IApp;

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