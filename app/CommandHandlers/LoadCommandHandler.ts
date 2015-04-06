import ICommandHandler = require("../Core/Commands/ICommandHandler");
import IOperation = require("../Core/Operations/IOperation");
import LoadOperation = require("../Operations/LoadOperation");

class LoadCommandHandler implements ICommandHandler {

    constructor() {

    }

    Execute(id: string): Promise<any>{
        var op:IOperation = new LoadOperation(id);
        return App.OperationManager.Do(op);
    }
}

export = LoadCommandHandler;