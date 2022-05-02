module Fayde.Media {
    export class Matrix {
        _Raw: number[];
        private _Inverse: Matrix = null;

        constructor(raw?: number[]) {
            this._Raw = raw || mat3.identity();
        }

        static get Identity(): Matrix {
            return new Matrix(mat3.identity());
        }

        get M11() { return this._Raw[0]; }
        set M11(val: number) { this._Raw[0] = val; this._OnChanged(); }

        get M12() { return this._Raw[1]; }
        set M12(val: number) { this._Raw[1] = val; this._OnChanged(); }

        get M21() { return this._Raw[2]; }
        set M21(val: number) { this._Raw[2] = val; this._OnChanged(); }

        get M22() { return this._Raw[3]; }
        set M22(val: number) { this._Raw[3] = val; this._OnChanged(); }

        get OffsetX() { return this._Raw[4]; }
        set OffsetX(val: number) { this._Raw[4] = val; this._OnChanged(); }

        get OffsetY() { return this._Raw[5]; }
        set OffsetY(val: number) { this._Raw[5] = val; this._OnChanged(); }

        get Inverse(): Matrix {
            var inverse = this._Inverse;
            if (!inverse) {
                inverse = new Matrix();
                inverse._Raw = mat3.inverse(this._Raw, mat3.identity());
                if (!inverse._Raw)
                    return undefined;
                this._Inverse = inverse;
            }
            return inverse;
        }

        private _OnChanged() {
            this._Inverse = null;
            Incite(this);
        }

        Clone(): Matrix {
            if (!this._Raw)
                return new Matrix();
            return new Matrix(mat3.create(this._Raw));
        }
    }
    Fayde.CoreLibrary.add(Matrix);
}
