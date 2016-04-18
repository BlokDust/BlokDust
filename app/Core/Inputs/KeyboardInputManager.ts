import {KeyDownEventArgs} from './KeyDownEventArgs';
import {KeyUpEventArgs} from './KeyUpEventArgs';
import {IApp} from '../IApp';

declare var App: IApp;

export class KeyboardInputManager {

    public KeysDown: any;
    protected _isEnabled: boolean = true;

    KeyDownChange = new nullstone.Event<KeyDownEventArgs>();
    KeyUpChange = new nullstone.Event<KeyUpEventArgs>();

    constructor() {

        this.ClearKeysDown();

        document.addEventListener('keydown', (e) => {
            if (!this.IsEnabled) return;
            this.KeyboardDown(e);
        });

        document.addEventListener('keyup', (e) => {
            if (!this.IsEnabled) return;
            this.KeyboardUp(e);
        });
    }

    set IsEnabled(val: boolean) {
        this._isEnabled = val;
    }

    get IsEnabled(): boolean {
        return this._isEnabled;
    }

    ClearKeysDown() {
        this.KeysDown = {};
    }

    KeyboardDown(e) {

        var k: number = e.keyCode;

        // if it's undefined
        if (typeof k === 'undefined') return;


        if (k === KeyCodes.KeyDown.Backspace && App.FocusManager.IsActive()) { // backspace prevent default
            e.preventDefault();
        }

        // add to dictionary
        this.KeysDown[k] = true;
    }

    KeyboardUp(e) {

        var k: number = e.keyCode;

        // if it's undefined
        if (typeof k === 'undefined') return;

        // remove from dictionary
        delete this.KeysDown[k];
    }

    IsKeyCodeDown(keycode: number): boolean {
        return !!this.KeysDown[keycode];
    }

    IsModifierDown(): boolean {
        return (this.KeysDown[KeyCodes.KeyDown.Ctrl] || this.KeysDown[KeyCodes.KeyDown.CommandFF] || this.KeysDown[KeyCodes.KeyDown.LeftWindowKey] || this.KeysDown[KeyCodes.KeyDown.RightWindowKey]);
    }
}