/// <reference path="../refs" />
import App = require("../App");
import ICommandHandler = require("../Core/Commands/ICommandHandler");
import IModifiable = require("../Blocks/IModifiable");
import IUndoableOperation = require("../Core/Operations/IUndoableOperation");
import AddItemToObservableCollectionOperation = require("../Core/Operations/AddItemToObservableCollectionOperation");

class CreateModifierCommandHandler implements ICommandHandler {

    constructor() {

    }

    Execute(modifiable: IModifiable): void{
        var op:IUndoableOperation = new AddItemToObservableCollectionOperation(modifiable, App.Modifiables);
        App.OperationManager.Do(op);
    }
}

export = CreateModifierCommandHandler;