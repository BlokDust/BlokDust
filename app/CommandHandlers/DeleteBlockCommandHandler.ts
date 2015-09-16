import ICommandHandler = require("../Core/Commands/ICommandHandler");
import IBlock = require("../Blocks/IBlock");
import IUndoableOperation = require("../Core/Operations/IUndoableOperation");
import DeleteBlockOperation = require("../Operations/DeleteBlockOperation");

import IApp = require("../IApp");

declare var App: IApp;

class DeleteBlockCommandHandler implements ICommandHandler {

    constructor() {

    }

    Execute(block: IBlock): Promise<any>{
        var op = new DeleteBlockOperation(block);
        return App.OperationManager.Do(op);
    }
}

export = DeleteBlockCommandHandler;
