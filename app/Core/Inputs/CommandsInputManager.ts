import {Commands} from '../../Commands';
import {CommandManager}from '../Commands/CommandManager';
import {IApp} from '../../IApp';
import {InputManager} from './InputManager';
import {KeyMap} from './KeyMap';
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

        if (!App.TypingManager.IsEnabled) { // todo: use flux
            if ((this.IsKeyNameDown(KeyMap.Ctrl) || this.IsKeyNameDown(KeyMap.LeftWindowKey) || this.IsKeyNameDown(KeyMap.CommandFF)) && this.IsKeyNameDown(KeyMap.s)){
                e.preventDefault();
                // todo: use flux
                App.MainScene.SharePanel.OpenPanel();
                return;
            }

            if ((this.IsKeyNameDown(KeyMap.Ctrl) || this.IsKeyNameDown(KeyMap.LeftWindowKey) || this.IsKeyNameDown(KeyMap.CommandFF)) && this.IsKeyNameDown(KeyMap.Shift) && this.IsKeyNameDown(KeyMap.z)){
                e.preventDefault();
                this._CommandManager.ExecuteCommand(Commands.REDO);
                return;
            }

            if ((this.IsKeyNameDown(KeyMap.Ctrl) || this.IsKeyNameDown(KeyMap.LeftWindowKey) || this.IsKeyNameDown(KeyMap.CommandFF)) && this.IsKeyNameDown(KeyMap.z)){
                e.preventDefault();
                this._CommandManager.ExecuteCommand(Commands.UNDO);
                return;
            }
        }


    }
}