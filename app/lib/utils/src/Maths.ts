module Utils.Maths {

    export class Vector {

        public X: number;
        public Y: number;

        constructor(x: number, y: number) {
            this.X = x;
            this.Y = y;
        }

        get(): Vector {
            return new Vector(this.X, this.Y);
        }

        set(x: number, y: number): void{
            this.X = x;
            this.Y = y;
        }

        //get X(): number {
        //    return this._X;
        //}
        //
        //set X(value: number) {
        //    this._X = value;
        //    //this.OnPropertyChanged("X");
        //}
        //
        //get Y(): number {
        //    return this._Y;
        //}
        //
        //set Y(value: number) {
        //    this._Y = value;
        //    //this.OnPropertyChanged("Y");
        //}

        add(v: Vector): void {
            this.X += v.X;
            this.Y += v.Y;
        }

        static add(v1: Vector, v2: Vector): Vector {
            return new Vector(v1.X + v2.X, v1.Y + v2.Y);
        }

        sub(v: Vector): void {
            this.X -= v.X;
            this.Y -= v.Y;
        }

        static sub(v1: Vector, v2: Vector): Vector {
            return new Vector(v1.X - v2.X, v1.Y - v2.Y);
        }

        mult(n: number): void {
            this.X = this.X * n;
            this.Y = this.Y * n;
        }

        static mult(v1: Vector, v2: Vector): Vector {
            return new Vector(v1.X * v2.X, v1.Y * v2.Y);
        }

        static multN(v1: Vector, n: number): Vector {
            return new Vector(v1.X * n, v1.Y * n);
        }

        Div(n: number): void {
            this.X = this.X / n;
            this.Y = this.Y / n;
        }

        static div(v1: Vector, v2: Vector): Vector {
            return new Vector(v1.X / v2.X, v1.Y / v2.Y);
        }

        static divN(v1: Vector, n: number): Vector {
            return new Vector(v1.X / n, v1.Y / n);
        }

        mag(): number {
            return Math.sqrt(this.X * this.X + this.Y * this.Y);
        }

        magSq(): number {
            return (this.X * this.X + this.Y * this.Y);
        }

        normalise(): void {
            var m = this.mag();
            if (m != 0 && m != 1) {
                this.Div(m);
            }
        }

        limit(max: number){
            if (this.magSq() > max * max) {
                this.normalise();
                this.mult(max);
            }
        }

        equals(v: Vector): boolean {
            return (this.X == v.X && this.Y == v.Y);
        }

        heading() {
            var angle = Math.atan2(-this.Y, this.X);
            return -1*angle;
        }

        static random2D(): Vector{
            return Vector.fromAngle((Math.random() * Math.TAU));
        }

        static fromAngle(angle: number): Vector {
            return new Vector(Math.cos(angle), Math.sin(angle));
        }
    }
}