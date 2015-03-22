import ICommandHandler = require("../Core/Commands/ICommandHandler");
import IBlock = require("../Blocks/IBlock");
import IUndoableOperation = require("../Core/Operations/IUndoableOperation");
import IncrementNumberCompoundOperation = require("../Core/Operations/IncrementNumberCompoundOperation");

class IncrementNumberCommandHandler implements ICommandHandler {

    constructor() {

    }

    Execute(n: number): Promise<number>{
        var op = new IncrementNumberCompoundOperation(n);
        return App.OperationManager.Do(op).then((n) => {
            //console.log(n);
        });
    }
}

export = IncrementNumberCommandHandler;
