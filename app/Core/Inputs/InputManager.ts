import App = require("../../App");
import IInputManager = require("../Inputs/IInputManager");
import IModifier = require("../../Blocks/IModifier");

class InputManager {

    public MasterKeyboardMap: Object;


    constructor() {

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
            33: '', //page up
            34: '', //page down
            35: '', //end
            36: '', //home
            37: '', //left arrow
            38: '', //up arrow
            39: '', //right arrow
            40: '', //down arrow
            45: '', //insert
            46: '', //delete
            48: 'G#b', //0
            49: '', //1
            50: 'F#a', //2
            51: 'G#a', //3
            52: 'A#a', //4
            53: '', //5
            54: 'C#b', //6
            55: 'D#b', //7
            56: '', //8
            57: 'F#b', //9
            65: '', //a
            66: 'Gc', //b
            67: 'Ec', //c
            68: 'D#c', //d
            69: 'Aa', //e
            70: '', //f
            71: 'F#c', //g
            72: 'G#c', //h
            73: 'Fb', //i
            74: 'A#c', //j
            75: '', //k
            76: 'C#d', //l
            77: 'Bc', //m
            78: 'Ac', //n
            79: 'Gb', //o
            80: 'Ab', //p
            81: 'Fa', //q
            82: 'Ba', //r
            83: 'C#c', //s
            84: 'Cb', //t
            85: 'Eb', //u
            86: 'Fc', //v
            87: 'Ga', //w
            88: 'Dc', //x
            89: 'Db', //y
            90: 'Cc', //z
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
            107: '', //add
            109: 'A#b', //subtract //TODO: This is in the wrong place
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
            186: 'D#d', //semi-colon
            187: 'OctaveUp', //equal sign
            188: 'Cd', //comma
            189: 'OctaveDown', //dash
            190: 'Dd', //full stop
            191: 'Ed', //forward slash
            192: '', //grave accent
            219: 'Bb', //open bracket
            220: '', //back slash
            221: 'Cc', //close bracket
            222: '' //single quote
        }
    }


    AddKeyboardListener(keyDownHandler, keyUpHandler, keyboard?): void {
        document.addEventListener('keydown', keyDownHandler);
        document.addEventListener('keyup', keyUpHandler);
    }

    RemoveKeyboardListener(keyDownHandler, keyUpHandler, keyboard?): void {
        document.removeEventListener('keydown', keyDownHandler);
        document.removeEventListener('keyup', keyUpHandler);

    }

}

export = InputManager;