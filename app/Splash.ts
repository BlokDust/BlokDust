/**
 * Created by luketwyman on 21/07/2015.
 */

import DisplayObject = require("./DisplayObject");


class Splash extends DisplayObject{

    private _Ctx: CanvasRenderingContext2D;
    public XOffset: number;
    public YOffset: number;
    public LoadOffset: number;
    private _Scale: number;
    private _Center: Point;
    private _Offset: Point;


    Init(sketch?: any): void {
        super.Init(sketch);
        this._Ctx = App.Canvas.getContext("2d");
        this._Offset = new Point(0,0);
        this.XOffset = 0;
        this.YOffset = -1;
        this.LoadOffset = 0;
    }



    get Ctx(): CanvasRenderingContext2D{
        return this._Ctx;
    }

    //-------------------------------------------------------------------------------------------
    //  DRAWING
    //-------------------------------------------------------------------------------------------


    public Draw() {

        var colorful = false;
        var ctx = this._Ctx;
        var units = App.Unit;

        this._Scale = 100 * units;

        // LOADING //
        if (App.Scene==2 && !App.LoadCued && App.CompositionId) {
            var dx = 0;
            var dy = (App.Height*(this.LoadOffset));
            ctx.fillStyle = App.Palette[0];
            ctx.fillRect(dx,dy,App.Width,App.Height);

            var dx = (App.Width*0.5);
            var dy = (App.Height*0.5) + (App.Height*this.LoadOffset);
            ctx.fillStyle = App.Palette[8];// white
            ctx.textAlign = "center";
            ctx.font = App.Metrics.TxtHeader;
            ctx.fillText("LOADING SCENE",dx,dy + (26 * units));
            App.AnimationsLayer.Spin();
            App.AnimationsLayer.DrawSprite('loading',dx, dy - (16 * units),16,true);
        }



        //TODO use blocksprites with multiplier argument
        this._Offset = new Point(0,1);
        ctx.fillStyle = "#111";
        this.CenterRect();


        // Convolution
        this._Center = new Point(-0.5,-0.5);
        this._Offset = new Point(0,0);
        ctx.fillStyle = App.Palette[3];// BLUE
        if (!colorful) {this.Ctx.fillStyle = App.Palette[2];}
        this.CenterRect();
        ctx.beginPath();
        ctx.fillStyle = App.Palette[8];// WHITE
        this.DrawMoveTo(-1,-1);
        this.DrawLineTo(1,-1);
        this.DrawLineTo(2,0);
        this.DrawLineTo(0,2);
        this.DrawLineTo(-1,1);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.fillStyle = App.Palette[4];// GREEN
        this.DrawMoveTo(-1,-1);
        this.DrawLineTo(0,0);
        this.DrawLineTo(0,2);
        this.DrawLineTo(-1,1);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.fillStyle = App.Palette[6];// YELLOW
        this.DrawMoveTo(0,0);
        this.DrawLineTo(1,0);
        this.DrawLineTo(0,1);
        ctx.closePath();
        ctx.fill();


        // gain
        this._Center = new Point(-0.5,0);
        this._Offset = new Point(-1,0);
        ctx.fillStyle = App.Palette[4];// GREEN
        if (!colorful) {this.Ctx.fillStyle = App.Palette[0];}
        this.CenterRect();
        ctx.beginPath();
        ctx.fillStyle = App.Palette[5];// PURPLE
        this.DrawMoveTo(-1,0);
        this.DrawLineTo(0,-1);
        this.DrawLineTo(2,1);
        this.DrawLineTo(0,1);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.fillStyle = App.Palette[3];// BLUE
        this.DrawMoveTo(-1,0);
        this.DrawLineTo(0,0);
        this.DrawLineTo(1,1);
        this.DrawLineTo(0,1);
        ctx.closePath();
        ctx.fill();

        // noise
        this._Center = new Point(0,-0.5);
        this._Offset = new Point(-1,-1);
        ctx.fillStyle = App.Palette[5];// PURPLE
        if (!colorful) {this.Ctx.fillStyle = App.Palette[2];}
        this.CenterRect();
        ctx.beginPath();
        ctx.fillStyle = App.Palette[4];// GREEN
        this.DrawMoveTo(-1,0);
        this.DrawLineTo(0,-1);
        this.DrawLineTo(1,-1);
        this.DrawLineTo(1,0);
        this.DrawLineTo(-1,2);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.fillStyle = App.Palette[8];// WHITE
        this.DrawMoveTo(-1,0);
        this.DrawLineTo(0,-1);
        this.DrawLineTo(1,-1);
        this.DrawLineTo(0,0);
        ctx.closePath();
        ctx.fill();


        // distortion
        this._Center = new Point(0,-0.5);
        this._Offset = new Point(0,-1);
        this.Ctx.fillStyle = App.Palette[6];// PURPLE
        if (!colorful) {this.Ctx.fillStyle = App.Palette[0];}
        this.CenterRect();
        ctx.beginPath();
        ctx.fillStyle = App.Palette[7];// RED
        this.DrawMoveTo(-1,-1);
        this.DrawLineTo(1,-1);
        this.DrawLineTo(1,0);
        this.DrawLineTo(-1,2);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.fillStyle = App.Palette[9];// PINK
        this.DrawLineTo(-1,-1);
        this.DrawLineTo(0,-1);
        this.DrawLineTo(0,0);
        this.DrawLineTo(-1,1);
        ctx.closePath();
        ctx.fill();


        this._Center = new Point(0,0);
        this._Offset = new Point(1,-1);
        ctx.fillStyle = App.Palette[2];// DARK
        this.CenterRect();
        var dx = (App.Width*0.5) + (this._Center.x*this._Scale) + (App.Width*(this._Offset.x+this.XOffset));
        var dy = (App.Height*0.5) + (this._Center.y*this._Scale) + (App.Height*(this._Offset.y+this.YOffset));
        var headerType = 100*units;
        ctx.fillStyle = App.Palette[8];// Grey
        ctx.textAlign = "center";
        ctx.font = "200 " + headerType + "px Dosis";
        ctx.fillText("BLOKDUST",dx,dy + (headerType * 0.38));

    }

    DrawMoveTo(x,y) {
        var scale = this._Scale;
        var dx = (App.Width*0.5) + (this._Center.x*scale) + (App.Width*(this._Offset.x+this.XOffset));
        var dy = (App.Height*0.5) + (this._Center.y*scale) + (App.Height*(this._Offset.y+this.YOffset));

        this.Ctx.moveTo(dx + (x*scale),dy + (y*scale));
    }
    DrawLineTo(x,y) {
        var scale = this._Scale;
        var dx = (App.Width*0.5) + (this._Center.x*scale) + (App.Width*(this._Offset.x+this.XOffset));
        var dy = (App.Height*0.5) + (this._Center.y*scale) + (App.Height*(this._Offset.y+this.YOffset));

        this.Ctx.lineTo(dx + (x*scale),dy + (y*scale));
    }

    CenterRect() {
        var dx = (App.Width*(this._Offset.x+this.XOffset));
        var dy = (App.Height*(this._Offset.y+this.YOffset));

        this._Ctx.fillRect(dx,dy,App.Width,App.Height);
    }

    //-------------------------------------------------------------------------------------------
    //  TWEEN
    //-------------------------------------------------------------------------------------------


    DelayTo(panel,destination,t,delay,v,s){

        var offsetTween = new TWEEN.Tween({x: s});
        offsetTween.to({x: destination}, t);
        offsetTween.onUpdate(function () {
            panel[""+v] = this.x;
        });
        offsetTween.easing(TWEEN.Easing.Exponential.InOut);
        offsetTween.delay(delay);
        offsetTween.start(this.LastVisualTick);
    }

    StartTween() {
        var initDelay = 300;
        var tweenLength = 250;
        var viewLength = 350;

        this.DelayTo(this,0,tweenLength,initDelay,'YOffset',-1);
        this.DelayTo(this,1,tweenLength,viewLength + tweenLength + initDelay,'XOffset',0);
        this.DelayTo(this,1,tweenLength,(viewLength*2) + (tweenLength*2) + initDelay,'YOffset',0);
        this.DelayTo(this,0,tweenLength,(viewLength*3) + (tweenLength*3) + initDelay,'XOffset',1);
        this.DelayTo(this,-1,tweenLength,(viewLength*4) + (tweenLength*4) + initDelay,'XOffset',0);
        this.DelayTo(this,2,tweenLength + 200,(viewLength*5) + (tweenLength*5) + initDelay + 200,'YOffset',1);
        setTimeout(function() {
            App.Scene = 2;
            if (App.LoadCued) {
                App.Stage.CompositionLoaded();
            }
        },(viewLength*5) + (tweenLength*5) + initDelay + 200);
    }

    EndLoad() {
        this.DelayTo(this,1,450,300,'LoadOffset',0);
    }

}

export = Splash;