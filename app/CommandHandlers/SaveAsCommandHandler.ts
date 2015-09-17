import {ICommandHandler} from '../Core/Commands/ICommandHandler';
import {IOperation} from '../Core/Operations/IOperation';
import {SaveOperation} from '../Operations/SaveOperation';

export class SaveAsCommandHandler implements ICommandHandler {

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