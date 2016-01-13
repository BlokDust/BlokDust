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
            if ((this.IsKeyCodeDown(KeyCodes.KeyDown.Ctrl) || this.IsKeyCodeDown(KeyCodes.KeyDown.LeftWindowKey) || this.IsKeyCodeDown(KeyCodes.KeyDown.CommandFF)) && this.IsKeyCodeDown(KeyCodes.KeyDown.s)){
                e.preventDefault();
                 App.MainScene.SharePanel.OpenPanel();
                return;
            }

            if ((this.IsKeyCodeDown(KeyCodes.KeyDown.Ctrl) || this.IsKeyCodeDown(KeyCodes.KeyDown.LeftWindowKey) || this.IsKeyCodeDown(KeyCodes.KeyDown.CommandFF)) && this.IsKeyCodeDown(KeyCodes.KeyDown.Shift) && this.IsKeyCodeDown(KeyCodes.KeyDown.z)){
                e.preventDefault();
                this._CommandManager.ExecuteCommand(Commands.REDO);
                return;
            }

            if ((this.IsKeyCodeDown(KeyCodes.KeyDown.Ctrl) || this.IsKeyCodeDown(KeyCodes.KeyDown.LeftWindowKey) || this.IsKeyCodeDown(KeyCodes.KeyDown.CommandFF)) && this.IsKeyCodeDown(KeyCodes.KeyDown.z)){
                e.preventDefault();
                this._CommandManager.ExecuteCommand(Commands.UNDO);
                return;
            }
        }
    }
}