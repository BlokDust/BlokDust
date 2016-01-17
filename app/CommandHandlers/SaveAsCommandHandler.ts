import {IApp} from '../IApp';
import {ICommandHandler} from '../Core/Commands/ICommandHandler';
import {IOperation} from '../Core/Operations/IOperation';
import {SaveOperation} from '../Operations/SaveOperation';

declare var App: IApp;

export class SaveAsCommandHandler implements ICommandHandler {

    constructor() {

    }

    Execute(): Promise<any>{
        var op:IOperation = new SaveOperation(App.Serialize(), null, null);
        return App.OperationManager.Do(op).then((result) => {
            if (!result) {
                App.MainScene.SharePanel.ClosePanel();
                App.Message(App.L10n.Errors.SaveError);
            } else {
                App.CompositionId = result.Id;
                App.MainScene.SharePanel.ReturnLink(result.Id);
                App.SessionId = result.SessionId;
                //console.log(result.Id, result.Message);
            }
        });
    }
}