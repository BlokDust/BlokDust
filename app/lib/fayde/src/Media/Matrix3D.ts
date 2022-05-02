module Fayde.Media {
    export interface IMatrix3DChangedListener {
        Callback: (newMatrix3D: Matrix3D) => void;
        Detach();
    }

    export class Matrix3D {
        _Raw: number[];
        private _Inverse: Matrix3D = null;

        static FromRaw(raw: number[]): Matrix3D {
            var r = new Matrix3D();
            r._Raw = raw;
            return r;
        }

        get M11() { return this._Raw[0]; }
        set M11(val: number) { this._Raw[0] = val; this._OnChanged(); }

        get M12() { return this._Raw[1]; }
        set M12(val: number) { this._Raw[1] = val; this._OnChanged(); }

        get M13() { return this._Raw[2]; }
        set M13(val: number) { this._Raw[2] = val; this._OnChanged(); }

        get M14() { return this._Raw[3]; }
        set M14(val: number) { this._Raw[3] = val; this._OnChanged(); }

        get M21() { return this._Raw[4]; }
        set M21(val: number) { this._Raw[4] = val; this._OnChanged(); }

        get M22() { return this._Raw[5]; }
        set M22(val: number) { this._Raw[5] = val; this._OnChanged(); }

        get M23() { return this._Raw[6]; }
        set M23(val: number) { this._Raw[6] = val; this._OnChanged(); }

        get M24() { return this._Raw[7]; }
        set M24(val: number) { this._Raw[7] = val; this._OnChanged(); }

        get M31() { return this._Raw[8]; }
        set M31(val: number) { this._Raw[8] = val; this._OnChanged(); }

        get M32() { return this._Raw[9]; }
        set M32(val: number) { this._Raw[9] = val; this._OnChanged(); }

        get M33() { return this._Raw[10]; }
        set M33(val: number) { this._Raw[10] = val; this._OnChanged(); }

        get M34() { return this._Raw[11]; }
        set M34(val: number) { this._Raw[11] = val; this._OnChanged(); }

        get OffsetX() { return this._Raw[12]; }
        set OffsetX(val: number) { this._Raw[12] = val; this._OnChanged(); }

        get OffsetY() { return this._Raw[13]; }
        set OffsetY(val: number) { this._Raw[13] = val; this._OnChanged(); }

        get OffsetZ() { return this._Raw[14]; }
        set OffsetZ(val: number) { this._Raw[14] = val; this._OnChanged(); }

        get M44() { return this._Raw[15]; }
        set M44(val: number) { this._Raw[15] = val; this._OnChanged(); }

        get Inverse(): Matrix3D {
            var inverse = this._Inverse;
            if (!inverse) {
                inverse = new Matrix3D();
                inverse._Raw = mat4.inverse(this._Raw, mat4.identity());
                if (!inverse._Raw)
                    return undefined;
                this._Inverse = inverse;
            }
            return inverse;
        }

        private _Listeners: IMatrix3DChangedListener[] = [];
        Listen(func: (newMatrix: Matrix3D) => void ): IMatrix3DChangedListener {
            var listeners = this._Listeners;
            var listener = {
                Callback: func,
                Detach: () => {
                    var index = listeners.indexOf(listener);
                    if (index > -1)
                        listeners.splice(index, 1);
                }
            };
            listeners.push(listener);
            return listener;
        }
        private _OnChanged() {
            this._Inverse = null;
            var listeners = this._Listeners;
            var len = listeners.length;
            for (var i = 0; i < len; i++) {
                listeners[i].Callback(this);
            }
        }
    }
    Fayde.CoreLibrary.add(Matrix3D);
}