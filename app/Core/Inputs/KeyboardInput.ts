import App = require("../../App");
import InputManager = require("../Inputs/InputManager");

class KeyboardInput extends InputManager {

    public KeysDown: Object;
    constructor() {
        super();
        this.KeysDown = {};

        document.addEventListener('keydown', (e) => {
            this.KeyboardDown(e);
        });

        document.addEventListener('keyup', (e) => {
            this.KeyboardUp(e);
        });
    }


    KeyboardDown(e) {
        var k = this.MasterKeyboardMap[e.keyCode];

        //Check if this key released is in out key_map
        if (typeof k !== 'undefined' && k !== '') {
            //if it's already pressed (holding note)
            if (e.keyCode in this.KeysDown) {
                return;
            }
            //pressed first time, add to object
            this.KeysDown[k] = true;

            console.log('KeyCode: ' + e.keyCode + ': ' + k + ', shift = '+e.shiftKey + ', alt = '+e.altKey + ', ctrl = '+e.ctrlKey);

        }
    }

    KeyboardUp(e) {
        var k = this.MasterKeyboardMap[e.keyCode];

        //Check if this key released is in out key_map
        if (typeof k !== 'undefined' && k !== '') {
            // remove this key from the keysDown object
            delete this.KeysDown[k];
        }
    }
}

export = KeyboardInput;