import {Commands} from '../Commands';
import {IApp} from '../IApp';
import {ICommandHandler} from '../Core/Commands/ICommandHandler';
import {IOperation} from '../Core/Operations/IOperation';
import {SaveOperation} from '../Operations/SaveOperation';
import {CommandCategories} from '../CommandCategories';
import {Errors} from '../Errors';

declare var App: IApp;

export class SaveCommandHandler implements ICommandHandler {

    constructor() {

    }

    Execute(): Promise<any>{
        var op:IOperation = new SaveOperation(App.Serialize(), App.CompositionId, App.SessionId);
        return App.OperationManager.Do(op).then((result) => {
            if (!result) {
                App.TrackEvent(CommandCategories.COMPOSITIONS.toString(), Errors.SAVE_FAILED.toString(), App.CompositionId);
                App.MainScene.SharePanel.ClosePanel();
                App.Message(App.L10n.Errors.SaveError);
            } else {
                App.TrackEvent(CommandCategories.COMPOSITIONS.toString(), Commands.SAVE.toString(), App.CompositionId);
                App.CompositionId = result.Id;
                App.MainScene.SharePanel.ReturnLink(result.Id);
                App.SessionId = result.SessionId;
            }
        });
    }
}