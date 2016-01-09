import {Commands} from '../../Commands';
import {CommandManager}from '../Commands/CommandManager';
import {IApp} from '../../IApp';
import {InputManager} from './InputManager';
import {KeyDownEventArgs} from './KeyDownEventArgs';
import {KeyUpEventArgs} from './KeyUpEventArgs';

declare var App: IApp;

export class CommandsInputManager extends InputManager {

    private _CommandManager;

    constructor(commandManager: CommandManager) {
        super();

        this._CommandManager = commandManager;
    }

    KeyboardDown(e) {
        super.KeyboardDown(e);
        if (!this.IsEnabled) return;
        this.CreateCommand(e);
    }

    KeyboardUp(e) {
        super.KeyboardUp(e);
        if (!this.IsEnabled) return;
        this.CreateCommand(e);
    }

    CreateCommand(e: KeyboardEvent) {
        // check key combinations and create associated commands

        //console.log(this.KeysDown);

        if (!App.TypingManager.IsEnabled) {
            if ((this.IsKeyCodeDown(KeyCode.Ctrl) || this.IsKeyCodeDown(KeyCode.LeftWindowKey) || this.IsKeyCodeDown(KeyCode.CommandFF)) && this.IsKeyCodeDown(KeyCode.s)){
                e.preventDefault();
                 App.MainScene.SharePanel.OpenPanel();
                return;
            }

            if ((this.IsKeyCodeDown(KeyCode.Ctrl) || this.IsKeyCodeDown(KeyCode.LeftWindowKey) || this.IsKeyCodeDown(KeyCode.CommandFF)) && this.IsKeyCodeDown(KeyCode.Shift) && this.IsKeyCodeDown(KeyCode.z)){
                e.preventDefault();
                this._CommandManager.ExecuteCommand(Commands.REDO);
                return;
            }

            if ((this.IsKeyCodeDown(KeyCode.Ctrl) || this.IsKeyCodeDown(KeyCode.LeftWindowKey) || this.IsKeyCodeDown(KeyCode.CommandFF)) && this.IsKeyCodeDown(KeyCode.z)){
                e.preventDefault();
                this._CommandManager.ExecuteCommand(Commands.UNDO);
                return;
            }
        }
    }
}