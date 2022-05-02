module Utils {
    export class Keyboard {
        public static getCharCode(e: KeyboardEvent): number {
            var charCode: number = (typeof e.which == "number") ? e.which : e.keyCode;
            return charCode;
        }
    }
}