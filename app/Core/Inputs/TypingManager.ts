import {InputManager} from './InputManager';

export class TypingManager extends InputManager {

    private _CharLimit: number;
    private _String: string;
    private _Panel: any;

    constructor() {
        super();

        this.IsEnabled = false;
        this._String = "";
        this._CharLimit = 20;
    }

    KeyboardDown(e) {
        super.KeyboardDown(e);
        if (!this.IsEnabled) return;

        var code = e.keyCode;
        this.AddToString(code);
        this.RemoveFromString();
        this.StringReturn();
    }

    KeyboardUp(e) {
        super.KeyboardUp(e);
        if (!this.IsEnabled) return;
    }

    AddToString(code) {
        //TODO special / secondary characters
        if (!this.IsModifierDown()) {
            if (this._String.length<this._CharLimit) {
                if ((code > 47 && code < 91) || (code > 105 && code < 112) || (code > 185 && code < 193) || (code > 218 && code < 223) || code == 32) {
                    var key = ""+String.fromCharCode(code);
                    this._String = "" + this._String + key;
                    this._Panel.UpdateString(this._String);
                }
            }
        }
    }

    RemoveFromString() {
        if (this.IsKeyCodeDown(KeyCodes.KeyDown.Backspace)) {
            this._String = this._String.substring(0, this._String.length-1);
            this._Panel.UpdateString(this._String);
        }
    }

    StringReturn() {
        if (this.IsKeyCodeDown(KeyCodes.KeyDown.Enter)) {
            this._Panel.StringReturn();
        }
    }

    Enable(panel) {
        this.IsEnabled = true;
        this._Panel = panel;
        this._String = panel.GetString();
    }

    Disable() {
        this.IsEnabled = false;
    }
}