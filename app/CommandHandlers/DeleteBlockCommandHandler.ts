import ICommandHandler = require("../Core/Commands/ICommandHandler");
import IBlock = require("../Blocks/IBlock");
import IUndoableOperation = require("../Core/Operations/IUndoableOperation");
import RemoveItemFromObservableCollectionOperation = require("../Core/Operations/RemoveItemFromObservableCollectionOperation");

class DeleteBlockCommandHandler implements ICommandHandler {

    constructor() {

    }

    Execute(block: IBlock): void{
        var op:IUndoableOperation = new RemoveItemFromObservableCollectionOperation(block, App.Blocks);
        App.OperationManager.Do(op);
    }
}

export = DeleteBlockCommandHandler;
