import ICommandHandler = require("../Core/Commands/ICommandHandler");
import IBlock = require("../Blocks/IBlock");
import IUndoableOperation = require("../Core/Operations/IUndoableOperation");
import RemoveItemFromArrayOperation = require("../Core/Operations/RemoveItemFromArrayOperation");

class DeleteBlockCommandHandler implements ICommandHandler {

    constructor() {

    }

    Execute(block: IBlock): Promise<any>{
        var op:IUndoableOperation = new RemoveItemFromArrayOperation<IBlock>(block, App.Blocks);
        return App.OperationManager.Do(op);
    }
}

export = DeleteBlockCommandHandler;
