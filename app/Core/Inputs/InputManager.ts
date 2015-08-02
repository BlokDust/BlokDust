
import KeyDownEventArgs = require("./KeyDownEventArgs");
import KeyUpEventArgs = require("./KeyUpEventArgs");
import Commands = require("../../Commands");
import CommandManager = require("../Commands/CommandManager");


enum KeyMap {
    Backspace = 8,
    Tab = 9,
    Enter = 13,
    Shift = 16,
    Ctrl = 17,
    Alt = 18,
    PauseBreak = 19,
    CapsLock = 20,
    Escape = 27,
    Spacebar = 32,
    PageUp = 33,
    PageDown = 34,
    End = 35,
    Home = 36,
    LeftArrow = 37,
    UpArrow = 38,
    RightArrow = 39,
    DownArrow = 40,
    Insert = 45,
    Delete = 46,
    Zero = 48,
    One = 49,
    Two = 50,
    Three = 51,
    Four = 52,
    Five = 53,
    Six = 54,
    Seven = 55,
    Eight = 56,
    Nine = 57,
    a = 65,
    b = 66,
    c = 67,
    d = 68,
    e = 69,
    f = 70,
    g = 71,
    h = 72,
    i = 73,
    j = 74,
    k = 75,
    l = 76,
    m = 77,
    n = 78,
    o = 79,
    p = 80,
    q = 81,
    r = 82,
    s = 83,
    t = 84,
    u = 85,
    v = 86,
    w = 87,
    x = 88,
    y = 89,
    z = 90,
    LeftWindowKey = 91,
    RightWindowKey = 92,
    SelectKey = 93,
    Numpad0 = 96,
    Numpad1 = 97,
    Numpad2 = 98,
    Numpad3 = 99,
    Numpad4 = 100,
    Numpad5 = 101,
    Numpad6 = 102,
    Numpad7 = 103,
    Numpad8 = 104,
    Numpad9 = 105,
    Multiply = 106,
    Add = 107,
    Subtract = 109,
    DecimalPoint = 110,
    Divide = 111,
    F1 = 112,
    F2 = 113,
    F3 = 114,
    F4 = 115,
    F5 = 116,
    F6 = 117,
    F7 = 118,
    F8 = 119,
    F9 = 120,
    F10 = 121,
    F11 = 122,
    F12 = 123,
    NumLock = 144,
    ScrollLock = 145,
    Semicolon = 186,
    EqualSign = 187,
    Comma = 188,
    Dash = 189,
    Period = 190,
    ForwardSlash = 191,
    GraveAccent = 192,
    OpenBracket = 219,
    BackSlash = 220,
    CloseBracket = 221,
    SingleQuote = 222,
    CommandFF = 224
}

class InputManager {


    public KeysDown: any;
    public KeyMap: any;

    KeyDownChange = new nullstone.Event<KeyDownEventArgs>();
    KeyUpChange = new nullstone.Event<KeyUpEventArgs>();

    constructor() {

        this.KeyMap = KeyMap;
        this.KeysDown = {};

        document.addEventListener('keydown', (e) => {
            this.KeyboardDown(e);
        });

        document.addEventListener('keyup', (e) => {
            this.KeyboardUp(e);
        });
    }

    KeyboardDown(e) {

        var k: number = this.GetKeyByCode(e.keyCode);

        // if it's undefined
        if (typeof k === 'undefined') return;

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

    // todo: use method overloading when available
    IsKeyCodeDown(code: number): boolean {
        return !!this.KeysDown[KeyMap[code]];
    }

    // todo: use method overloading when available
    IsKeyNameDown(name: KeyMap): boolean {
        return !!this.KeysDown[name];
    }

    /*IsKeyNameTouched(name: KeyMap,code: number): boolean {
        return KeyMap[name]==code;
    }*/
}

export = InputManager;