import {Commands} from '../../Commands';
import {CommandManager} from '../Commands/CommandManager';
import {KeyDownEventArgs} from './KeyDownEventArgs';
import {KeyUpEventArgs} from './KeyUpEventArgs';
import {KeyMap} from './KeyMap';

declare var HumanInput: any;

export class InputManager {

    public KeysDown: any;
    public IsEnabled: boolean = true;

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

    ClearKeysDown() {
        this.KeysDown = {};
    }

    KeyboardDown(e) {

        var k: number = this.GetKeyByCode(e.keyCode);

        // if it's undefined
        if (typeof k === 'undefined') return;

        if (k === 8) { // backspace prevent default
            e.preventDefault();
        }

        // add to dictionary
        this.KeysDown[k] = true;

    }

    KeyboardUp(e) {

        var k: number = this.GetKeyByCode(e.keyCode);

        // if it's undefined
        if (typeof k === 'undefined') return;

        // remove from dictionary
        delete this.KeysDown[k];

    }

    GetKeyByCode(code: number): number {
        return KeyMap[KeyMap[code]];
    }

    IsKeyCodeDown(code: number): boolean {
        return !!this.KeysDown[KeyMap[code]];
    }

    IsKeyNameDown(name: KeyMap): boolean {
        return !!this.KeysDown[name];
    }

    IsModifierDown(): boolean {
        return (this.KeysDown[KeyMap.Ctrl] || this.KeysDown[KeyMap.CommandFF] || this.KeysDown[KeyMap.LeftWindowKey] || this.KeysDown[KeyMap.RightWindowKey]);
    }
}