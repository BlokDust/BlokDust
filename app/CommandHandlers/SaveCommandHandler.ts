import {IApp} from '../IApp';
import {ICommandHandler} from '../Core/Commands/ICommandHandler';
import {IOperation} from '../Core/Operations/IOperation';
import {SaveOperation} from '../Operations/SaveOperation';

declare var App: IApp;

export class SaveCommandHandler implements ICommandHandler {

    constructor() {

    }

    Execute(): Promise<any>{
        var op:IOperation = new SaveOperation(App.Serialize(), App.CompositionId, App.SessionId);
        return App.OperationManager.Do(op).then((result) => {
            if (!result) {
                App.MainScene.SharePanel.ClosePanel();
                App.Message(App.Config.Errors.SaveError);
            } else {
                App.CompositionId = result.Id;
                App.MainScene.SharePanel.ReturnLink(result.Id);
                App.SessionId = result.SessionId;
            }
        });
    }
}