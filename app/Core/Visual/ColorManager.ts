import {IApp} from '../../IApp';
import {RGBA} from './RGBA';
declare var App: IApp;


export class ColorManager  {

    public Master: RGBA;
    public HighPass: RGBA;
    public LowPass: RGBA;
    public Passes: boolean;

    //-------------------------------------------------------------------------------------------
    //  SETUP
    //-------------------------------------------------------------------------------------------

    constructor() {
        this.Master = new RGBA(0,0,0,0);
        this.HighPass = new RGBA(0,-100,0,0);
        this.LowPass = new RGBA(-100,0,0,0);
        this.Passes = false;
    }

    //-------------------------------------------------------------------------------------------
    //  DRAW FUNCTIONS
    //-------------------------------------------------------------------------------------------

    FillColor(ctx,col) {
        this.SetRGBA(ctx,col.R,col.G,col.B,col.A,"fill");
    }
    StrokeColor(ctx,col) {
        this.SetRGBA(ctx,col.R,col.G,col.B,col.A,"stroke");
    }
    FillRGBA(ctx,r,g,b,a) {
        this.SetRGBA(ctx,r,g,b,a,"fill");
    }
    StrokeRGBA(ctx,r,g,b,a) {
        this.SetRGBA(ctx,r,g,b,a,"stroke");
    }

    // PASS R G B A //
    SetRGBA(ctx,r,g,b,a,mode) {
        // master color filter //
        var red = Math.round(r + this.Master.R);
        var green = Math.round(g + this.Master.G);
        var blue = Math.round(b + this.Master.B);
        var alpha = a + this.Master.A;

        // high & low pass color filters //
        if (this.Passes) {
            var av = ((red + green + blue) / 3);
            var hp = av/255;
            var lp = 1 - (av/255);
            red += Math.round((this.HighPass.R*hp) + (this.LowPass.R*lp));
            green += Math.round((this.HighPass.G*hp) + (this.LowPass.G*lp));
            blue += Math.round((this.HighPass.B*hp) + (this.LowPass.B*lp));
        }

        // set to string //
        if (mode==="stroke") {
            ctx.strokeStyle = this.BuildColour(red,green,blue,alpha);
        } else {
            ctx.fillStyle = this.BuildColour(red,green,blue,alpha);
        }
    }

    BuildColour(red,green,blue,alpha) {
        // RANGE //
        red = this.ValueInRange(red,0,255);
        green = this.ValueInRange(green,0,255);
        blue = this.ValueInRange(blue,0,255);
        alpha = this.ValueInRange(alpha,0,1);
        return "rgba("+red+","+green+","+blue+","+alpha+")";
    }

    //-------------------------------------------------------------------------------------------
    //  MATHS
    //-------------------------------------------------------------------------------------------


    ValueInRange(value,floor,ceiling) {
        if (value < floor) {
            value = floor;
        }
        if (value> ceiling) {
            value = ceiling;
        }
        return value;
    }

}