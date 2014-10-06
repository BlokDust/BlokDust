import IEffect = require("../IEffect");
import IModifiable = require("../IModifiable");


class KeyboardComponent implements IEffect {

    key_map = {
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
        220: 'Gu'
    };


    constructor() {
        //Setup keyboard

    }

    Connect(modifiable: IModifiable): void{
        this.addListeners();
    }

    Disconnect(modifiable: IModifiable): void{
        this.removeListeners();
    }

    KeyDown(): void {
        console.log('keydown ');
    }

    KeyUp(): void {
        console.log('keyup ');
    }

    addListeners() {
        window.addEventListener('keydown', this.KeyDown);
        window.addEventListener('keyup', this.KeyUp);
    }

    removeListeners(){
        window.removeEventListener('keydown', this.KeyDown);
        window.removeEventListener('keyup', this.KeyUp);
    }

}

export = KeyboardComponent;