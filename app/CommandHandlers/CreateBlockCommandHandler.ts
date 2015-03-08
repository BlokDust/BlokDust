import App = require("../App");
import ICommandHandler = require("../Core/Commands/ICommandHandler");
import IBlock = require("../Blocks/IBlock");
import IUndoableOperation = require("../Core/Operations/IUndoableOperation");
import AddItemToObservableCollectionOperation = require("../Core/Operations/AddItemToObservableCollectionOperation");

class CreateBlockCommandHandler implements ICommandHandler {

    constructor() {

    }

    Execute(block: IBlock): void{
        var op:IUndoableOperation = new AddItemToObservableCollectionOperation(block, window.App.Blocks);
        window.App.OperationManager.Do(op);
    }
}

export = CreateBlockCommandHandler;