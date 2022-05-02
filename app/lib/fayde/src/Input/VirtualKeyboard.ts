module Fayde.Input {
    var keyboardInput: HTMLInputElement;

    export class VirtualKeyboard {
        static Init () {
            keyboardInput = document.createElement('input');
            keyboardInput.type = "text";
            var style = keyboardInput.style;
            style.opacity = "0";
            style.cssFloat = "left";
            style.width = "0";
            style.height = "0";
            style.borderWidth = "0";
            document.body.insertBefore(keyboardInput, document.body.firstElementChild);
        }

        static Launch () {
            console.log("Launch");
            keyboardInput.focus();
        }
    }
}