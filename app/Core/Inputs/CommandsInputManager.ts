import InputManager = require("./InputManager");
import KeyDownEventArgs = require("./KeyDownEventArgs");
import KeyUpEventArgs = require("./KeyUpEventArgs");
import Commands = require("../../Commands");
import CommandManager = require("../Commands/CommandManager");

import IApp = require("../../IApp");

declare var App: IApp;

class CommandsInputManager extends InputManager {

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
            if ((this.IsKeyNameDown(this.KeyMap.Ctrl) || this.IsKeyNameDown(this.KeyMap.LeftWindowKey) || this.IsKeyNameDown(this.KeyMap.CommandFF)) && this.IsKeyNameDown(this.KeyMap.s)){
                e.preventDefault();
                // todo: use flux
                App.MainScene.SharePanel.OpenPanel();
                return;
            }

            if ((this.IsKeyNameDown(this.KeyMap.Ctrl) || this.IsKeyNameDown(this.KeyMap.LeftWindowKey) || this.IsKeyNameDown(this.KeyMap.CommandFF)) && this.IsKeyNameDown(this.KeyMap.Shift) && this.IsKeyNameDown(this.KeyMap.z)){
                e.preventDefault();
                this._CommandManager.ExecuteCommand(Commands[Commands.REDO]);
                return;
            }

            if ((this.IsKeyNameDown(this.KeyMap.Ctrl) || this.IsKeyNameDown(this.KeyMap.LeftWindowKey) || this.IsKeyNameDown(this.KeyMap.CommandFF)) && this.IsKeyNameDown(this.KeyMap.z)){
                e.preventDefault();
                this._CommandManager.ExecuteCommand(Commands[Commands.UNDO]);
                return;
            }
        }


    }
}

export = CommandsInputManager;