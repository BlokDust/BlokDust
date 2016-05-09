import {IApp} from '../../IApp';
import {KeyboardInputManager} from './KeyboardInputManager';
import {KeyDownEventArgs} from './KeyDownEventArgs';
import {KeyUpEventArgs} from './KeyUpEventArgs';

declare var App: IApp;

export class PianoKeyboardManager extends KeyboardInputManager {

    public PianoKeyboardMap: any;
    public PianoKeyboardMapFallBack: any;
    public KeyDown: number;
    public KeyUp: number;

    KeyDownChange = new nullstone.Event<KeyDownEventArgs>();
    KeyUpChange = new nullstone.Event<KeyUpEventArgs>();

    constructor() {
        super();

        /**
         * Piano Keyboard Map
         * Musical notes follow
         * note_ + (musical note letter) + _octave (A is lowest)
         */
        /*this.PianoKeyboardMap = {
            'ArrowUp': 'octave-up',
            'ArrowDown': 'octave-down',
            'Digit0': 'note_G#_b',
            'Digit2': 'note_F#_a',
            'Digit3': 'note_G#_a',
            'Digit4': 'note_A#_a',
            'Digit6': 'note_C#_b',
            'Digit7': 'note_D#_b',
            'Digit9': 'note_F#_b',
            'KeyB': 'note_G_c',
            'KeyC': 'note_E_c',
            'KeyD': 'note_D#_c',
            'KeyE': 'note_A_a',
            'KeyG': 'note_F#_c',
            'KeyH': 'note_G#_c',
            'KeyI': 'note_F_b',
            'KeyJ': 'note_A#_c',
            'KeyL': 'note_C#_d',
            'KeyM': 'note_B_c',
            'KeyN': 'note_A_c',
            'KeyO': 'note_G_b',
            'KeyP': 'note_A_b',
            'KeyQ': 'note_F_a',
            'KeyR': 'note_B_a',
            'KeyS': 'note_C#_c',
            'KeyT': 'note_C_b',
            'KeyU': 'note_E_b',
            'KeyV': 'note_F_c',
            'KeyW': 'note_G_a',
            'KeyX': 'note_D_c',
            'KeyY': 'note_D_b',
            'KeyZ': 'note_C_c',
            'NumpadAdd': 'octave-up',
            'NumpadSubtract': 'octave-down',
            'Semicolon': 'note_D#_d',
            'Comma': 'note_C_d',
            'Minus': 'note_A#_b',
            'Period': 'note_D_d',
            'Slash': 'note_E_d',
            'BracketLeft': 'note_B_b',
            'BracketRight': 'note_C_c',
            'OSLeft': 'blank',
            'OSRight': 'blank',
        };*/

        // MIDI NOTE CODES //

        // 1000 transpose down
        // 1001 transpose up
        // this.PianoKeyboardMap = {
        //     'ArrowUp': 1001,
        //     'ArrowDown': 1000,
        //     'Digit0': 68,
        //     'Digit2': 54,
        //     'Digit3': 56,
        //     'Digit4': 58,
        //     'Digit6': 61,
        //     'Digit7': 63,
        //     'Digit9': 66,
        //     'KeyB': 79,
        //     'KeyC': 76,
        //     'KeyD': 75,
        //     'KeyE': 57,
        //     'KeyG': 78,
        //     'KeyH': 80,
        //     'KeyI': 65,
        //     'KeyJ': 82,
        //     'KeyL': 85,
        //     'KeyM': 83,
        //     'KeyN': 81,
        //     'KeyO': 67,
        //     'KeyP': 69,
        //     'KeyQ': 53,
        //     'KeyR': 59,
        //     'KeyS': 73,
        //     'KeyT': 60,
        //     'KeyU': 64,
        //     'KeyV': 77,
        //     'KeyW': 55,
        //     'KeyX': 74,
        //     'KeyY': 62,
        //     'KeyZ': 72,
        //     'NumpadAdd': 1001,
        //     'NumpadSubtract': 1000,
        //     'Semicolon': 87,
        //     'Comma': 84,
        //     'Minus': 70,
        //     'Period': 86,
        //     'Slash': 88,
        //     'BracketLeft': 71,
        //     'BracketRight': 72,
        //     'OSLeft': -1,
        //     'OSRight': -1,
        // };

        this.PianoKeyboardMap = {
            'ArrowUp': 1001,
            'ArrowDown': 1000,
            'Digit0': 75,
            'Digit2': 61,
            'Digit3': 63,
            'Digit5': 66,
            'Digit6': 68,
            'Digit7': 70,
            'Digit9': 73,
            'KeyB': 55,
            'KeyC': 52,
            'KeyD': 51,
            'KeyE': 64,
            'KeyG': 54,
            'KeyH': 56,
            'KeyI': 72,
            'KeyJ': 58,
            'KeyL': 61,
            'KeyM': 59,
            'KeyN': 57,
            'KeyO': 74,
            'KeyP': 76,
            'KeyQ': 60,
            'KeyR': 65,
            'KeyS': 49,
            'KeyT': 67,
            'KeyU': 71,
            'KeyV': 53,
            'KeyW': 62,
            'KeyX': 50,
            'KeyY': 69,
            'KeyZ': 48,
            'NumpadAdd': 1001,
            'NumpadSubtract': 1000,
            'Semicolon': 63,
            'Comma': 60,
            'Equal': 78,
            'Period': 62,
            'Slash': 64,
            'BracketLeft': 77,
            'BracketRight': 79,
            'OSLeft': -1,
            'OSRight': -1,
        };

        /**
         * This is used for browsers that haven't implemented KeyboardEvent.code yet.
         * Using KeyboardEvent.code means that the piano will work using all keyboard layouts
         */
        this.PianoKeyboardMapFallBack = {
            38: this.PianoKeyboardMap['ArrowUp'],
            40: this.PianoKeyboardMap['ArrowDown'],
            48: this.PianoKeyboardMap['Digit0'],
            50: this.PianoKeyboardMap['Digit2'],
            51: this.PianoKeyboardMap['Digit3'],
            52: this.PianoKeyboardMap['Digit4'],
            54: this.PianoKeyboardMap['Digit6'],
            55: this.PianoKeyboardMap['Digit7'],
            57: this.PianoKeyboardMap['Digit9'],
            66: this.PianoKeyboardMap['KeyB'],
            67: this.PianoKeyboardMap['KeyC'],
            68: this.PianoKeyboardMap['KeyD'],
            69: this.PianoKeyboardMap['KeyE'],
            71: this.PianoKeyboardMap['KeyG'],
            72: this.PianoKeyboardMap['KeyH'],
            73: this.PianoKeyboardMap['KeyI'],
            74: this.PianoKeyboardMap['KeyJ'],
            76: this.PianoKeyboardMap['KeyL'],
            77: this.PianoKeyboardMap['KeyM'],
            78: this.PianoKeyboardMap['KeyN'],
            79: this.PianoKeyboardMap['KeyO'],
            80: this.PianoKeyboardMap['KeyP'],
            81: this.PianoKeyboardMap['KeyQ'],
            82: this.PianoKeyboardMap['KeyR'],
            83: this.PianoKeyboardMap['KeyS'],
            84: this.PianoKeyboardMap['KeyT'],
            85: this.PianoKeyboardMap['KeyU'],
            86: this.PianoKeyboardMap['KeyV'],
            87: this.PianoKeyboardMap['KeyW'],
            88: this.PianoKeyboardMap['KeyX'],
            89: this.PianoKeyboardMap['KeyY'],
            90: this.PianoKeyboardMap['KeyZ'],
            91: this.PianoKeyboardMap['OSLeft'],
            93: this.PianoKeyboardMap['OSRight'],
            107: this.PianoKeyboardMap['NumpadAdd'],
            109: this.PianoKeyboardMap['NumpadSubtract'],
            186: this.PianoKeyboardMap['Semicolon'],
            188: this.PianoKeyboardMap['Comma'],
            189: this.PianoKeyboardMap['Minus'],
            190: this.PianoKeyboardMap['Period'],
            191: this.PianoKeyboardMap['Slash'],
            219: this.PianoKeyboardMap['BracketLeft'],
            221: this.PianoKeyboardMap['BracketRight'],
        };
    }

    set IsEnabled(val: boolean) {
        if (val === false) {
            /*App.Sources.forEach((s) => {
                s.TriggerRelease('all');
            })*/
        }
        this._isEnabled = val;
    }

    get IsEnabled(): boolean {
        return this._isEnabled;
    }

    KeyboardDown(e) {
        if (!this.IsEnabled) return;

        var k: number;
        if (e.code){
            k = this.PianoKeyboardMap[e.code];
        } else {
            k = this.PianoKeyboardMapFallBack[e.keyCode];
        }

        //Check if this key released is in our key_map
        if (typeof k !== undefined) {
            //if it's already pressed (holding note)
            if (k in this.KeysDown) {
                return;
            }
            //pressed first time, add to object
            this.KeysDown[k] = true;
            this.KeyDown = k;
            this.KeyDownChange.raise(this, new KeyDownEventArgs(this.KeyDown));
        }
    }

    KeyboardUp(e) {
        if (!this.IsEnabled) return;

        var k: number;
        if (e.code){
            k = this.PianoKeyboardMap[e.code];
        } else {
            k = this.PianoKeyboardMapFallBack[e.keyCode];
        }

        //Check if this key released is in out key_map
        if (typeof k !== undefined) {
            if (k === -1){
                // if it's a blank key remove all
                this.KeysDown = {};
            } else {
                // remove this key from the keysDown object
                delete this.KeysDown[k];
            }
            this.KeyUp = k;
            this.KeyUpChange.raise(this, new KeyUpEventArgs(this.KeyUp));
        }

    }

    /*KeyboardDown(e) {
        if (!this.IsEnabled) return;

        var k: string;
        if (e.code){
            k = this.PianoKeyboardMap[e.code];
        } else {
            k = this.PianoKeyboardMapFallBack[e.keyCode];
        }

        //Check if this key released is in our key_map
        if (typeof k !== 'undefined' && k !== '') {
            //if it's already pressed (holding note)
            if (k in this.KeysDown) {
                return;
            }
            //pressed first time, add to object
            this.KeysDown[k] = true;
            this.KeyDown = k;
            this.KeyDownChange.raise(this, new KeyDownEventArgs(this.KeyDown));
        }
    }

    KeyboardUp(e) {
        if (!this.IsEnabled) return;

        var k: string;
        if (e.code){
            k = this.PianoKeyboardMap[e.code];
        } else {
            k = this.PianoKeyboardMapFallBack[e.keyCode];
        }

        //Check if this key released is in out key_map
        if (typeof k !== 'undefined' && k !== '') {
            if (k === 'blank'){
                // if it's a blank key remove all
                this.KeysDown = {};
            } else {
                // remove this key from the keysDown object
                delete this.KeysDown[k];
            }
            this.KeyUp = k;
            this.KeyUpChange.raise(this, new KeyUpEventArgs(this.KeyUp));
        }

    }*/
}