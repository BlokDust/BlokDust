import IEffect = require("../IEffect");
import IModifiable = require("../IModifiable");


class KeyboardComponent implements IEffect {
    keysDown = {};
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
    settings = {
        startOctave: null,
        startNote: 'A3',
        keyPressOffset: null
    };


    constructor() {
        //Get the Start Octave from the start Note
        this.settings.startOctave = parseInt(this.settings.startNote.charAt(1), 10);
    }

    Connect(modifiable: IModifiable): void{
        this.addListeners();
    }

    Disconnect(modifiable: IModifiable): void{
        this.removeListeners();
    }

    KeyDown(frequency): void {
        console.log('Play '+frequency);
        //TODO: Pass this frequency to modifiable.Osc.frequency
    }

    KeyUp(frequency): void {
        console.log('Stop '+frequency);
        //TODO: Pass this frequency to modifiable.Osc.frequency
    }

    addListeners(): void {
        var _this = this;
        window.addEventListener('keydown', function(key) {
            _this.keyboardDown(key);
        });
        window.addEventListener('keyup', function(key) {
            _this.keyboardUp(key);
        });
    }

    removeListeners(): void {
        var _this = this;
        window.removeEventListener('keydown', function(key) {
            _this.keyboardDown(key);
        });
        window.removeEventListener('keyup', function(key) {
            _this.keyboardUp(key);
        });
    }

    keyboardDown(key): void {
        //if it's already pressed (holding note)
        if (key.keyCode in this.keysDown) {
            return;
        }
        //pressed first time, add to object
        this.keysDown[key.keyCode] = true;

        //If this is key is in our key_map get the pressed key and pass to getFrequency
        if (typeof this.key_map[key.keyCode] !== 'undefined') {
            var keyPressed = this.getKeyPressed(key.keyCode);
            var frequency = this.getFrequencyOfNote(keyPressed);
            this.KeyDown(frequency);
        }
    }

    keyboardUp(key): void {
        // remove this key from the keysDown object
        delete this.keysDown[key.keyCode];

        //If this is key is in our key_map get the pressed key and pass to getFrequency
        if (typeof this.key_map[key.keyCode] !== 'undefined') {
            var keyPressed = this.getKeyPressed(key.keyCode);
            var frequency = this.getFrequencyOfNote(keyPressed);
            this.KeyUp(frequency);
        }
    }

    getKeyPressed(keyCode): string {
        // Replaces keycode with keynote & octave string
        return (this.key_map[keyCode]
            .replace('l', parseInt(this.settings.startOctave, 10) + this.settings.keyPressOffset)
            .replace('u', (parseInt(this.settings.startOctave, 10) + this.settings.keyPressOffset + 1)
                .toString()));
    }

    getFrequencyOfNote(note): number {
        var notes = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'],
            key_number,
            octave;

        if (note.length === 3) {
            //sharp note - octave is 3rd char
            octave = note.charAt(2);
        } else {
            //natural note - octave number is 2nd char
            octave = note.charAt(1);
        }

        // math to return frequency number from note & octave
        key_number = notes.indexOf(note.slice(0, -1));
        if (key_number < 3) {
            key_number = key_number + 12 + ((octave - 1) * 12) + 1;
        } else {
            key_number = key_number + ((octave - 1) * 12) + 1;
        }
        return 440 * Math.pow(2, (key_number - 49) / 12);
    }

}

export = KeyboardComponent;