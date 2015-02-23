import App = require("../App");
import ICommandHandler = require("../Core/Commands/ICommandHandler");
import IBlock = require("../Blocks/IBlock");
import IOperation = require("../Core/Operations/IOperation");
import LoadOperation = require("../Core/Operations/LoadOperation");

class LoadCommandHandler implements ICommandHandler {

    constructor() {

    }

    Execute(id: string): void{
        var op:IOperation = new LoadOperation(id);
        App.OperationManager.Do(op);
    }
}

export = LoadCommandHandler;