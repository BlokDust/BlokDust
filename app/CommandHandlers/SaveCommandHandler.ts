import App = require("../App");
import ICommandHandler = require("../Core/Commands/ICommandHandler");
import IBlock = require("../Blocks/IBlock");
import IOperation = require("../Core/Operations/IOperation");
import SaveOperation = require("../Core/Operations/SaveOperation");

class SaveCommandHandler implements ICommandHandler {

    constructor() {

    }

    Execute(block: IBlock): void{
        var op:IOperation = new SaveOperation(App.Serialize());
        App.OperationManager.Do(op);
    }
}

export = SaveCommandHandler;