import IInputManager = require("../Inputs/IInputManager");

class InputManager {

    public KeyMap: Object;
    public KeysDown: Object;
    public EventListenerCount: number = 0;
    public EventsInUse;



    constructor() {


        this.EventsInUse = [];
        this.KeysDown = {};

        this.KeyMap = {
            65: 'Cl',
            87: 'C#l',
            83: 'Dl',
            69: 'D#l',
            68: 'El',
            70: 'Fl',
            84: 'F#l',
            71: 'Gl',
            89: 'G#l',
            90: 'G#l',
            72: 'Al',
            85: 'A#l',
            74: 'Bl',
            75: 'Cu',
            79: 'C#u',
            76: 'Du',
            80: 'D#u',
            59: 'Eu',
            186: 'Eu',
            222: 'Fu',
            221: 'F#u',
            220: 'Gu',
            187: 'OctaveUp',
            189: 'OctaveDown'
        };
    }

    AddEventListener(event, eventHandler, _this): void {
        document.addEventListener(event, eventHandler);
        this.EventListenerCount ++;

    }

    RemoveEventListener(event, eventHandler): void {
        document.removeEventListener(event, eventHandler);


    }

}

export = InputManager;