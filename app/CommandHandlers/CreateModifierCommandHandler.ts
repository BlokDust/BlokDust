/// <reference path="../refs" />
import App = require("../App");
import ICommandHandler = require("../Core/Commands/ICommandHandler");
import IModifier = require("../Blocks/IModifier");
import IUndoableOperation = require("../Core/Operations/IUndoableOperation");
import AddItemToObservableCollectionOperation = require("../Core/Operations/AddItemToObservableCollectionOperation");

class CreateModifierCommandHandler implements ICommandHandler {

    constructor() {

    }

    Execute(modifier: IModifier): void{
        var op:IUndoableOperation = new AddItemToObservableCollectionOperation(modifier, App.Modifiers);
        App.OperationManager.Do(op);
    }
}

export = CreateModifierCommandHandler;