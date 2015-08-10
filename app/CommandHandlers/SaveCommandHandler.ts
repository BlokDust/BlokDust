import ICommandHandler = require("../Core/Commands/ICommandHandler");
import IOperation = require("../Core/Operations/IOperation");
import SaveOperation = require("../Operations/SaveOperation");

class SaveCommandHandler implements ICommandHandler {

    constructor() {

    }

    Execute(): Promise<any>{
        var op:IOperation = new SaveOperation(App.Serialize(), App.CompositionId, App.SessionId);
        return App.OperationManager.Do(op).then((result) => {
            App.CompositionId = result.Id;
            App.MainScene.SharePanel.ReturnLink(result.Id);
            App.SessionId = result.SessionId;
            //console.log(result.Id, result.Message);
        });
    }
}

export = SaveCommandHandler;