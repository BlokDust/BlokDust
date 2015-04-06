import ICommandHandler = require("../Core/Commands/ICommandHandler");
import IBlock = require("../Blocks/IBlock");
import IUndoableOperation = require("../Core/Operations/IUndoableOperation");
import MoveBlockOperation = require("../Operations/MoveBlockOperation");

class MoveBlockCommandHandler implements ICommandHandler {

    constructor() {

    }

    Execute(block: IBlock): Promise<any>{
        var op = new MoveBlockOperation(block);
        return App.OperationManager.Do(op);
    }
}

export = MoveBlockCommandHandler;

