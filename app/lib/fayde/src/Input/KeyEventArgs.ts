/// <reference path="../Core/RoutedEventArgs.ts" />

module Fayde.Input {
    export enum Key {
        //     A special value indicating no key.
        None = 0,
        //     The BACKSPACE key.
        Back = 1,
        //     The TAB key.
        Tab = 2,
        //     The ENTER key.
        Enter = 3,
        //     The SHIFT key.
        Shift = 4,
        //     The CTRL (control) key.
        Ctrl = 5,
        //     The ALT key.
        Alt = 6,
        //     The CAPSLOCK key.
        CapsLock = 7,
        //     The ESC (also known as ESCAPE) key.
        Escape = 8,
        //     The SPACE key.
        Space = 9,
        //     The PAGEUP key.
        PageUp = 10,
        //     The PAGEDOWN key.
        PageDown = 11,
        //     The END key.
        End = 12,
        //     The HOME key.
        Home = 13,
        //     The left arrow key.
        Left = 14,
        //     The up arrow key.
        Up = 15,
        //     The right arrow key.
        Right = 16,
        //     The down arrow key.
        Down = 17,
        //     The INSERT key.
        Insert = 18,
        //     The DEL (also known as DELETE) key.
        Delete = 19,
        //     The 0 (zero) key.
        D0 = 20,
        //     The 1 key.
        D1 = 21,
        //     The 2 key.
        D2 = 22,
        //     The 3 key.
        D3 = 23,
        //     The 4 key.
        D4 = 24,
        //     The 5 key.
        D5 = 25,
        //     The 6 key.
        D6 = 26,
        //     The 7 key.
        D7 = 27,
        //     The 8 key.
        D8 = 28,
        //     The 9 key.
        D9 = 29,
        //     The A key.
        A = 30,
        //     The B key.
        B = 31,
        //     The C key.
        C = 32,
        //     The D key.
        D = 33,
        //     The E key.
        E = 34,
        //     The F key.
        F = 35,
        //     The G key.
        G = 36,
        //     The H key.
        H = 37,
        //     The I key.
        I = 38,
        //     The J key.
        J = 39,
        //     The K key.
        K = 40,
        //     The L key.
        L = 41,
        //     The M key.
        M = 42,
        //     The N key.
        N = 43,
        //     The O key.
        O = 44,
        //     The P key.
        P = 45,
        //     The Q key.
        Q = 46,
        //     The R key.
        R = 47,
        //     The S key.
        S = 48,
        //     The T key.
        T = 49,
        //     The U key.
        U = 50,
        //     The V key.
        V = 51,
        //     The W key.
        W = 52,
        //     The X key.
        X = 53,
        //     The Y key.
        Y = 54,
        //     The Z key.
        Z = 55,
        //     The F1 key.
        F1 = 56,
        //     The F2 key.
        F2 = 57,
        //     The F3 key.
        F3 = 58,
        //     The F4 key.
        F4 = 59,
        //     The F5 key.
        F5 = 60,
        //     The F6 key.
        F6 = 61,
        //     The F7 key.
        F7 = 62,
        //     The F8 key.
        F8 = 63,
        //     The F9 key.
        F9 = 64,
        //     The F10 key.
        F10 = 65,
        //     The F11 key.
        F11 = 66,
        //     The F12 key.
        F12 = 67,
        //     The 0 key on the number pad.
        NumPad0 = 68,
        //     The 1 key on the number pad.
        NumPad1 = 69,
        //     The 2 key on the number pad.
        NumPad2 = 70,
        //     The 3 key on the number pad.
        NumPad3 = 71,
        //     The 4 key on the number pad.
        NumPad4 = 72,
        //     The 5 key on the number pad.
        NumPad5 = 73,
        //     The 6 key on the number pad.
        NumPad6 = 74,
        //     The 7 key on the number pad.
        NumPad7 = 75,
        //     The 8 key on the number pad.
        NumPad8 = 76,
        //     The 9 key on the number pad.
        NumPad9 = 77,
        //     The * (MULTIPLY) key.
        Multiply = 78,
        //     The + (ADD) key.
        Add = 79,
        //     The - (SUBTRACT) key.
        Subtract = 80,
        //     The . (DECIMAL) key.
        Decimal = 81,
        //     The / (DIVIDE) key.
        Divide = 82,
        //     A special value indicating the key is out of range of this enumeration.
        Unknown = 255,
    }
    Fayde.CoreLibrary.addEnum(Key, "Key");

    export class KeyboardEventArgs extends RoutedEventArgs {
    }
    Fayde.CoreLibrary.add(KeyboardEventArgs);

    ///Modifers = { Shift: <boolean>, Ctrl: <boolean>, Alt: <boolean> }
    export class KeyEventArgs extends KeyboardEventArgs {
        Modifiers: IModifiersOn;
        PlatformKeyCode: number;
        Key: Key;
        Char: string;
        constructor(modifiers: IModifiersOn, keyCode: number, key: Key, c?: string) {
            super();
            this.Modifiers = modifiers;
            this.PlatformKeyCode = keyCode;
            this.Key = key;
            if (this.Key == null)
                this.Key = Key.Unknown;
            this.Char = c;
        }
    }
    Fayde.CoreLibrary.add(KeyEventArgs);
}