import App = require("../App");
import ICommandHandler = require("../Core/Commands/ICommandHandler");
import IBlock = require("../Blocks/IBlock");
import IUndoableOperation = require("../Core/Operations/IUndoableOperation");
import RemoveItemFromObservableCollectionOperation = require("../Core/Operations/RemoveItemFromObservableCollectionOperation");

class DeleteBlockCommandHandler implements ICommandHandler {

    constructor() {

    }

    Execute(block: IBlock): void{
        var op:IUndoableOperation = new RemoveItemFromObservableCollectionOperation(block, App.GetInstance().Blocks);
        App.GetInstance().OperationManager.Do(op);
    }
}

export = DeleteBlockCommandHandler;
