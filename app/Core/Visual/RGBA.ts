/**
 * Created by luketwyman on 14/01/2016.
 */

export class RGBA  {

    public R: number;
    public G: number;
    public B: number;
    public A: number;

    constructor(r,g,b,a) {
        this.R = r;
        this.G = g;
        this.B = b;
        this.A = a;
    }


    toString()  {
        return 'rgba(' + this.R + ',' + this.G + ',' + this.B + ',' + this.A + ')';
    }
    clone() {
        return new RGBA(this.R, this.G, this.B, this.A);
    }

}