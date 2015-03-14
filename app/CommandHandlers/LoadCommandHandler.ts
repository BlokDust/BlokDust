import ICommandHandler = require("../Core/Commands/ICommandHandler");
import IOperation = require("../Core/Operations/IOperation");
import LoadOperation = require("../Core/Operations/LoadOperation");

class LoadCommandHandler implements ICommandHandler {

    constructor() {

    }

    Execute(id: string): void{
        var op:IOperation = new LoadOperation(id);
        App.OperationManager.Do(op).then((result) => {
            console.log(result);
        });
    }
}

export = LoadCommandHandler;