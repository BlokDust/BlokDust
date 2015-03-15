import ICommandHandler = require("../Core/Commands/ICommandHandler");
import IBlock = require("../Blocks/IBlock");
import IUndoableOperation = require("../Core/Operations/IUndoableOperation");
import AddItemToArrayOperation = require("../Core/Operations/AddItemToArrayOperation");

class CreateBlockCommandHandler implements ICommandHandler {

    constructor() {

    }

    Execute(block: IBlock): Promise<any>{
        var op:IUndoableOperation = new AddItemToArrayOperation<IBlock>(block, App.Blocks);
        return App.OperationManager.Do(op);
    }
}

export = CreateBlockCommandHandler;