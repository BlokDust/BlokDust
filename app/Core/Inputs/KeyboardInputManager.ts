import {InputManager} from './InputManager';
import {KeyDownEventArgs} from './KeyDownEventArgs';
import {KeyUpEventArgs} from './KeyUpEventArgs';

export class KeyboardInputManager extends InputManager {

    public MasterKeyboardMap: any;
    //public KeysDown: any;
    public KeyDown: string;
    public KeyUp: string;

    constructor() {
        super();
        //this.KeysDown = {};

        /*document.addEventListener('keydown', (e) => {
            this.KeyboardDown(e);
        });

        document.addEventListener('keyup', (e) => {
            this.KeyboardUp(e);
        });*/

        /**
         * Master Keyboard Map
         * Musical notes follow
         * note_ + (musical note letter) + _octave (A is lowest)
         */
        this.MasterKeyboardMap = {
            8: '', //backspace
            9: '', //tab
            13: '', //enter
            16: 'shift', //shift
            17: 'ctrl', //ctrl
            18: 'alt', //alt
            19: '', //pause/break
            20: '', //caps lock
            27: '', //escape
            32: 'spacebar', //space bar
            33: '', //page up
            34: '', //page down
            35: '', //end
            36: '', //home
            37: '', //left arrow
            38: 'octave-up', //up arrow
            39: '', //right arrow
            40: 'octave-down', //down arrow
            45: '', //insert
            46: '', //delete
            48: 'note_G#_b', //0
            49: '', //1
            50: 'note_F#_a', //2
            51: 'note_G#_a', //3
            52: 'note_A#_a', //4
            53: '', //5
            54: 'note_C#_b', //6
            55: 'note_D#_b', //7
            56: '', //8
            57: 'note_F#_b', //9
            65: '', //a
            66: 'note_G_c', //b
            67: 'note_E_c', //c
            68: 'note_D#_c', //d
            69: 'note_A_a', //e
            70: '', //f
            71: 'note_F#_c', //g
            72: 'note_G#_c', //h
            73: 'note_F_b', //i
            74: 'note_A#_c', //j
            75: '', //k
            76: 'note_C#_d', //l
            77: 'note_B_c', //m
            78: 'note_A_c', //n
            79: 'note_G_b', //o
            80: 'note_A_b', //p
            81: 'note_F_a', //q
            82: 'note_B_a', //r
            83: 'note_C#_c', //s
            84: 'note_C_b', //t
            85: 'note_E_b', //u
            86: 'note_F_c', //v
            87: 'note_G_a', //w
            88: 'note_D_c', //x
            89: 'note_D_b', //y
            90: 'note_C_c', //z
            91: '', //left window key
            92: '', //right window key
            93: '', //select key
            96: '', //numpad 0
            97: '', //numpad 1
            98: '', //numpad 2
            99: '', //numpad 3
            100: '', //numpad 4
            101: '', //numpad 5
            102: '', //numpad 6
            103: '', //numpad 7
            104: '', //numpad 8
            105: '', //numpad 9
            106: '', //multiply
            107: 'octave-up', //add
            109: 'octave-down', //subtract
            110: '', //decimal point
            111: '', //divide
            112: '', //f1
            113: '', //f2
            114: '', //f3
            115: '', //f4
            116: '', //f5
            117: '', //f6
            118: '', //f7
            119: '', //f8
            120: '', //f9
            121: '', //f10
            122: '', //f11
            123: '', //f12
            144: '', //num lock
            145: '', //scroll lock
            186: 'note_D#_d', //semi-colon
            187: 'OctaveUp', //equal sign
            188: 'note_C_d', //comma
            189: 'note_A#_b', //dash
            190: 'note_D_d', //full stop
            191: 'note_E_d', //forward slash
            192: '', //grave accent
            219: 'note_B_b', //open bracket
            220: '', //back slash
            221: 'note_C_c', //close bracket
            222: '' //single quote
        }
    }

    KeyboardDown(e) {
        if (!this.IsEnabled) return;

        var k = this.MasterKeyboardMap[e.keyCode];

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

        super.KeyboardDown(e);
    }

    KeyboardUp(e) {
        super.KeyboardUp(e);
        if (!this.IsEnabled) return;

        var k = this.MasterKeyboardMap[e.keyCode];

        //Check if this key released is in out key_map
        if (typeof k !== 'undefined' && k !== '') {
            // remove this key from the keysDown object
            delete this.KeysDown[k];
        }

        this.KeyUp = k;
        this.KeyUpChange.raise(this, new KeyUpEventArgs(this.KeyUp));

    }
}