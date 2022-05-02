module Fayde.Utils{
    export class Vector extends Fayde.MVVM.ObservableObject {

        private _X: number;
        private _Y: number;

        constructor(x: number, y: number) {
            super();

            this.X = x;
            this.Y = y;
        }

        Get(): Vector {
            return new Vector(this.X, this.Y);
        }

        Set(x: number, y: number): void{
            this.X = x;
            this.Y = y;
        }

        get X(): number {
            return this._X;
        }

        set X(value: number) {
            this._X = value;
            this.OnPropertyChanged("X");
        }

        get Y(): number {
            return this._Y;
        }

        set Y(value: number) {
            this._Y = value;
            this.OnPropertyChanged("Y");
        }

        Add(v: Vector): void {
            this.X += v.X;
            this.Y += v.Y;
        }

        static Add(v1: Vector, v2: Vector): Vector {
            return new Vector(v1.X + v2.X, v1.Y + v2.Y);
        }

        Sub(v: Vector): void {
            this.X -= v.X;
            this.Y -= v.Y;
        }

        static Sub(v1: Vector, v2: Vector): Vector {
            return new Vector(v1.X - v2.X, v1.Y - v2.Y);
        }

        Mult(n: number): void {
            this.X = this.X * n;
            this.Y = this.Y * n;
        }

        static Mult(v1: Vector, v2: Vector): Vector {
            return new Vector(v1.X * v2.X, v1.Y * v2.Y);
        }

        static MultN(v1: Vector, n: number): Vector {
            return new Vector(v1.X * n, v1.Y * n);
        }

        Div(n: number): void {
            this.X = this.X / n;
            this.Y = this.Y / n;
        }

        static Div(v1: Vector, v2: Vector): Vector {
            return new Vector(v1.X / v2.X, v1.Y / v2.Y);
        }

        static DivN(v1: Vector, n: number): Vector {
            return new Vector(v1.X / n, v1.Y / n);
        }

        Mag(): number {
            return Math.sqrt(this.X * this.X + this.Y * this.Y);
        }

        MagSq(): number {
            return (this.X * this.X + this.Y * this.Y);
        }

        Normalise(): void {
            var m = this.Mag();
            if (m != 0 && m != 1) {
                this.Div(m);
            }
        }

        Limit(max: number){
            if (this.MagSq() > max * max) {
                this.Normalise();
                this.Mult(max);
            }
        }

        Equals(v: Vector): boolean {
            return (this.X == v.X && this.Y == v.Y);
        }

        Heading() {
            var angle = Math.atan2(-this.Y, this.X);
            return -1*angle;
        }

        static Random2D(): Vector{
            return Vector.FromAngle((Math.random() * Math.TAU));
        }

        static FromAngle(angle: number): Vector {
            return new Vector(Math.cos(angle), Math.sin(angle));
        }
    }
}