import ICommandHandler = require("../Core/Commands/ICommandHandler");
import IBlock = require("../Blocks/IBlock");
import IUndoableOperation = require("../Core/Operations/IUndoableOperation");
import DeleteBlockOperation = require("../Core/Operations/DeleteBlockOperation");

class DeleteBlockCommandHandler implements ICommandHandler {

    constructor() {

    }

    Execute(block: IBlock): Promise<any>{
        var op = new DeleteBlockOperation(block);
        return App.OperationManager.Do(op);
    }
}

export = DeleteBlockCommandHandler;
