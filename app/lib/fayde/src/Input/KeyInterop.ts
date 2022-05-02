/// <reference path="KeyEventArgs.ts" />


// Good Resource: http://unixpapa.com/js/key.html

module Fayde.Input {
    export interface IKeyInterop {
        RegisterEvents(inputHandler: Engine.InputManager);
    }
    export function CreateKeyInterop(): IKeyInterop {
        //Figure out which KeyInterop
        if (navigator.appName === "Microsoft Internet Explorer")
            return new IEKeyInterop();
        if (navigator.appName === "Netscape") {
            if (!!navigator.userAgent.match(/Trident\//)) //IE11 masquerading as Netscape
                return new IEKeyInterop();
            return new NetscapeKeyInterop();
        }
        return new KeyInterop();
    }

    var keyFromKeyCode: Key[] = [];
    keyFromKeyCode[8] = Key.Back;
    keyFromKeyCode[9] = Key.Tab;
    keyFromKeyCode[13] = Key.Enter;
    keyFromKeyCode[16] = Key.Shift;
    keyFromKeyCode[17] = Key.Ctrl;
    keyFromKeyCode[18] = Key.Alt;
    //keyFromKeyCode[19] = Key.Pause/Break;
    keyFromKeyCode[20] = Key.CapsLock;
    keyFromKeyCode[27] = Key.Escape;
    keyFromKeyCode[32] = Key.Space;
    keyFromKeyCode[33] = Key.PageUp;
    keyFromKeyCode[34] = Key.PageDown;
    keyFromKeyCode[35] = Key.End;
    keyFromKeyCode[36] = Key.Home;
    keyFromKeyCode[37] = Key.Left;
    keyFromKeyCode[38] = Key.Up;
    keyFromKeyCode[39] = Key.Right;
    keyFromKeyCode[40] = Key.Down;
    keyFromKeyCode[45] = Key.Insert;
    keyFromKeyCode[46] = Key.Delete;
    keyFromKeyCode[48] = Key.D0;
    keyFromKeyCode[49] = Key.D1;
    keyFromKeyCode[50] = Key.D2;
    keyFromKeyCode[51] = Key.D3;
    keyFromKeyCode[52] = Key.D4;
    keyFromKeyCode[53] = Key.D5;
    keyFromKeyCode[54] = Key.D6;
    keyFromKeyCode[55] = Key.D7;
    keyFromKeyCode[56] = Key.D8;
    keyFromKeyCode[57] = Key.D9;
    //keyFromKeyCode[59] = Key.Semicolon/Colon;
    //keyFromKeyCode[61] = Key.Equals/Plus;
    keyFromKeyCode[65] = Key.A;
    keyFromKeyCode[66] = Key.B;
    keyFromKeyCode[67] = Key.C;
    keyFromKeyCode[68] = Key.D;
    keyFromKeyCode[69] = Key.E;
    keyFromKeyCode[70] = Key.F;
    keyFromKeyCode[71] = Key.G;
    keyFromKeyCode[72] = Key.H;
    keyFromKeyCode[73] = Key.I;
    keyFromKeyCode[74] = Key.J;
    keyFromKeyCode[75] = Key.K;
    keyFromKeyCode[76] = Key.L;
    keyFromKeyCode[77] = Key.M;
    keyFromKeyCode[78] = Key.N;
    keyFromKeyCode[79] = Key.O;
    keyFromKeyCode[80] = Key.P;
    keyFromKeyCode[81] = Key.Q;
    keyFromKeyCode[82] = Key.R;
    keyFromKeyCode[83] = Key.S;
    keyFromKeyCode[84] = Key.T;
    keyFromKeyCode[85] = Key.U;
    keyFromKeyCode[86] = Key.V;
    keyFromKeyCode[87] = Key.W;
    keyFromKeyCode[88] = Key.X;
    keyFromKeyCode[89] = Key.Y;
    keyFromKeyCode[90] = Key.Z;
    //keyFromKeyCode[91] = Key.Window;
    keyFromKeyCode[96] = Key.NumPad0;
    keyFromKeyCode[97] = Key.NumPad1;
    keyFromKeyCode[98] = Key.NumPad2;
    keyFromKeyCode[99] = Key.NumPad3;
    keyFromKeyCode[100] = Key.NumPad4;
    keyFromKeyCode[101] = Key.NumPad5;
    keyFromKeyCode[102] = Key.NumPad6;
    keyFromKeyCode[103] = Key.NumPad7;
    keyFromKeyCode[104] = Key.NumPad8;
    keyFromKeyCode[105] = Key.NumPad9;
    keyFromKeyCode[106] = Key.Multiply;
    keyFromKeyCode[107] = Key.Add;
    keyFromKeyCode[109] = Key.Subtract;
    keyFromKeyCode[110] = Key.Decimal;
    keyFromKeyCode[111] = Key.Divide;
    keyFromKeyCode[112] = Key.F1;
    keyFromKeyCode[113] = Key.F2;
    keyFromKeyCode[114] = Key.F3;
    keyFromKeyCode[115] = Key.F4;
    keyFromKeyCode[116] = Key.F5;
    keyFromKeyCode[117] = Key.F6;
    keyFromKeyCode[118] = Key.F7;
    keyFromKeyCode[119] = Key.F8;
    keyFromKeyCode[120] = Key.F9;
    keyFromKeyCode[121] = Key.F10;
    keyFromKeyCode[122] = Key.F11;
    keyFromKeyCode[123] = Key.F12;

    class KeyInterop implements IKeyInterop {
        RegisterEvents(input: Engine.InputManager) {
            document.onkeypress = (e) => {
                var args = this.CreateArgsPress(e);
                if (args) {
                    input.HandleKeyDown(args);
                    if (args.Handled) {
                        e.preventDefault();
                        return false;
                    }
                }
            };
            document.onkeydown = (e) => {
                var args = this.CreateArgsDown(e);
                if (args) {
                    input.HandleKeyDown(args);
                    if (args.Handled) {
                        e.preventDefault();
                        return false;
                    }
                }
            };
        }
        CreateArgsPress(e): Fayde.Input.KeyEventArgs { return undefined; }
        CreateArgsDown(e): Fayde.Input.KeyEventArgs { return undefined; }
    }
    
    var udkie = [];
    udkie[41] = 48;
    udkie[33] = 49;
    udkie[64] = 50;
    udkie[35] = 51;
    udkie[36] = 52;
    udkie[37] = 53;
    udkie[94] = 54;
    udkie[38] = 55;
    udkie[42] = 56;
    udkie[34] = Key.Unknown;
    class IEKeyInterop extends KeyInterop {
        CreateArgsPress(e): Fayde.Input.KeyEventArgs {
            if (!e["char"])
                return;

            var modifiers = {
                Shift: e.shiftKey,
                Ctrl: e.ctrlKey,
                Alt: e.altKey
            };

            var keyCode = e.keyCode;
            var unshifted = udkie[keyCode];
            if (unshifted)
                keyCode = unshifted;

            var args = new Fayde.Input.KeyEventArgs(modifiers, keyCode, keyFromKeyCode[keyCode], e["char"]);
            if (args.Key === Key.Unknown && e.key) {
                args.Char = e.key;
                var code = args.Char.toUpperCase().charCodeAt(0);
                args.Key = keyFromKeyCode[code];
                if (args.Key == null) args.Key = Key.Unknown;
            }
            return args;
        }
        CreateArgsDown(e): Fayde.Input.KeyEventArgs {
            if (e["char"] && e.keyCode !== 8 && e.keyCode !== 9)
                return;
            var modifiers = {
                Shift: e.shiftKey,
                Ctrl: e.ctrlKey,
                Alt: e.altKey
            };
            return new Fayde.Input.KeyEventArgs(modifiers, e.keyCode, keyFromKeyCode[e.keyCode]);
        }
    }
    
    var sknet = [];
    sknet[8] = Key.Back;
    sknet[9] = Key.Tab;
    sknet[20] = Key.CapsLock;
    sknet[27] = Key.Escape;
    sknet[33] = Key.PageUp;
    sknet[34] = Key.PageDown;
    sknet[35] = Key.End;
    sknet[36] = Key.Home;
    sknet[37] = Key.Left;
    sknet[38] = Key.Up;
    sknet[39] = Key.Right;
    sknet[40] = Key.Down;
    sknet[45] = Key.Insert;
    sknet[46] = Key.Delete;
    
    var udknet = [];
    udknet[41] = 48;
    udknet[33] = 49;
    udknet[64] = 50;
    udknet[35] = 51;
    udknet[36] = 52;
    udknet[37] = 53;
    udknet[94] = 54;
    udknet[38] = 55;
    udknet[42] = 56;
    udknet[34] = Key.Unknown;
    class NetscapeKeyInterop extends KeyInterop {
        CreateArgsPress(e): Fayde.Input.KeyEventArgs {
            var modifiers = {
                Shift: e.shiftKey,
                Ctrl: e.ctrlKey,
                Alt: e.altKey
            };

            var keyCode = e.keyCode;
            var unshifted = udknet[keyCode];
            if (unshifted)
                keyCode = unshifted;

            var args = new Fayde.Input.KeyEventArgs(modifiers, keyCode, keyFromKeyCode[keyCode], String.fromCharCode(e.which || e.keyCode));
            if (args.Char === "'")
                args.Key = Key.Unknown;
            return args;
        }
        CreateArgsDown(e): Fayde.Input.KeyEventArgs {
            //only do for special keys
            if (sknet[e.keyCode] === undefined)
                return null;

            var modifiers = {
                Shift: e.shiftKey,
                Ctrl: e.ctrlKey,
                Alt: e.altKey
            };
            return new Fayde.Input.KeyEventArgs(modifiers, e.keyCode, keyFromKeyCode[e.keyCode]);
        }
    }
}