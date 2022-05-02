module Fayde.Utils{
    export class Size extends Fayde.MVVM.ObservableObject {
        private _Width: number;
        private _Height: number;

        constructor(width: number, height: number){
            super();

            this.Width = width;
            this.Height = height;
        }

        get Width(): number {
            return this._Width;
        }

        set Width(width: number) {
            this._Width = width;
            this.OnPropertyChanged("Width");
        }

        get Height(): number {
            return this._Height;
        }

        set Height(height: number) {
            this._Height = height;
            this.OnPropertyChanged("Height");
        }

        // ratio of width to height
        // width 10 and height 5 = 5/10 = 0.5
        get AspectRatio(): number {
            return this.Height / this.Width;
        }
    }
}