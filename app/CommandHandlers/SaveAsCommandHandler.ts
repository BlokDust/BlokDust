import ICommandHandler = require("../Core/Commands/ICommandHandler");
import IOperation = require("../Core/Operations/IOperation");
import SaveOperation = require("../Operations/SaveOperation");

import IApp = require("../IApp");

declare var App: IApp;

class SaveAsCommandHandler implements ICommandHandler {

    constructor() {

    }

    Execute(): Promise<any>{
        var op:IOperation = new SaveOperation(App.Serialize(), null, null);
        return App.OperationManager.Do(op).then((result) => {
            App.CompositionId = result.Id;
            App.MainScene.SharePanel.ReturnLink(result.Id);
            App.SessionId = result.SessionId;
            //console.log(result.Id, result.Message);
        });
    }
}

export = SaveAsCommandHandler;