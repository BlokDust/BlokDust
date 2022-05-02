module Fayde.Input {
    // http://msdn.microsoft.com/en-us/library/system.windows.input.keyboardnavigationmode.aspx
    export enum KeyboardNavigationMode {
        Continue = 0,
        Once = 1,
        Cycle = 2,
        None = 3,
        Contained = 4,
        Local = 5,
    }
    Fayde.CoreLibrary.addEnum(KeyboardNavigationMode, "KeyboardNavigationMode");

    export enum ModifierKeys {
        None = 0,
        Alt = 1,
        Control = 2,
        Shift = 4,
        Windows = 8,
        Apple = 16,
    }

    export interface IModifiersOn {
        Shift: boolean;
        Ctrl: boolean;
        Alt: boolean;
    }

    export class Keyboard {
        static Modifiers: ModifierKeys = ModifierKeys.None;

        static RefreshModifiers(e: Fayde.Input.IModifiersOn) {
            if (e.Shift)
                Keyboard.Modifiers |= ModifierKeys.Shift;
            else
                Keyboard.Modifiers &= ~ModifierKeys.Shift;
            if (e.Ctrl)
                Keyboard.Modifiers |= ModifierKeys.Control;
            else
                Keyboard.Modifiers &= ~ModifierKeys.Control;
            if (e.Alt)
                Keyboard.Modifiers |= ModifierKeys.Alt;
            else
                Keyboard.Modifiers &= ~ModifierKeys.Alt;
        }

        static HasControl() {
            return (Keyboard.Modifiers & ModifierKeys.Control) === ModifierKeys.Control;
        }
        static HasAlt() {
            return (Keyboard.Modifiers & ModifierKeys.Alt) === ModifierKeys.Alt;
        }
        static HasShift() {
            return (Keyboard.Modifiers & ModifierKeys.Shift) === ModifierKeys.Shift;
        }
    }
    Fayde.CoreLibrary.add(Keyboard);
}