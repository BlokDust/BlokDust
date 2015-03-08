import ICommandHandler = require("../Core/Commands/ICommandHandler");
import IBlock = require("../Blocks/IBlock");
import IOperation = require("../Core/Operations/IOperation");
import SaveOperation = require("../Core/Operations/SaveOperation");

class SaveCommandHandler implements ICommandHandler {

    constructor() {

    }

    Execute(): void{
        var op:IOperation = new SaveOperation(App.Serialize(), App.CompositionId);
        App.OperationManager.Do(op).then((result) => {
            App.CompositionId = result.Id;
            console.log(result.Id, result.Message);
        });
    }
}

export = SaveCommandHandler;