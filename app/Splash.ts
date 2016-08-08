///<amd-dependency path="etch"/>.
import DisplayObject = etch.drawing.DisplayObject;
import {IApp} from './IApp';
import IDisplayContext = etch.drawing.IDisplayContext;
import Point = minerva.Point;

declare var App: IApp;

export class Splash extends DisplayObject{

    public XOffset: number;
    public YOffset: number;
    public LoadOffset: number;
    public ButtonOffset: number;
    private _Scale: number;
    private _Center: Point;
    private _Offset: Point;
    private _IOSPause: boolean = false;
    IsAnimationFinished: boolean = false;
    IsTransitionFinished: boolean = false;
    AnimationFinished = new nullstone.Event<{}>();

    Init(drawTo: IDisplayContext): void {
        super.Init(drawTo);
    }

    public Setup() {
        super.Setup();

        this._Offset = new Point(0,0);
        this.XOffset = 0;
        this.YOffset = -1;
        this.LoadOffset = -1;
        this.ButtonOffset = -1;

        App.PointerInputManager.MouseDown.on((s: any, e: MouseEvent) => {
            this.MouseDown(e);
        }, this);

        App.PointerInputManager.TouchStart.on((s: any, e: TouchEvent) => {
            this.TouchStart(e);
        }, this);
    }

    //-------------------------------------------------------------------------------------------
    //  DRAWING
    //-------------------------------------------------------------------------------------------

    public Draw() {

        super.Draw();

        if (this.IsTransitionFinished) {
            return;
        }

        if (this.IsFirstFrame()){
            this.TransitionIn();
        }

        var colorful = false;
        var units = App.Unit;
        var ctx = this.Ctx;

        this._Scale = 100 * units;
        this.Ctx.globalAlpha = 1;

        // LOADING //
        if (App.IsLoadingComposition) {
            var dx = 0;
            var dy = (App.Height*(this.LoadOffset));
            App.FillColor(this.Ctx,App.Palette[0]);
            this.Ctx.fillRect(dx,dy,App.Width,App.Height);

            var dx = (App.Width*0.5);
            var dy = (App.Height*0.5) + (App.Height*this.LoadOffset);
            App.FillColor(this.Ctx,App.Palette[App.ThemeManager.Txt]);
            this.Ctx.textAlign = "center";
            this.Ctx.font = App.Metrics.TxtHeader;
            this.Ctx.fillText("LOADING SCENE",dx,dy + (26 * units)); // todo: use l10n
            //App.AnimationsLayer.Spin();
            App.AnimationsLayer.DrawSprite(this.Ctx,'loading',dx, dy - (16 * units),16,true);
        }

        //TODO use blocksprites with multiplier argument
        this._Offset = new Point(0,1);
        App.FillRGBA(this.Ctx,10,10,10,1);
        this.CenterRect();

        // Convolution
        this._Center = new Point(-0.5,-0.5);
        this._Offset = new Point(0,0);
        App.FillColor(this.Ctx,App.Palette[3]);
        if (!colorful) {App.FillColor(this.Ctx,App.Palette[2]);}
        this.CenterRect();
        this.Ctx.beginPath();
        App.FillColor(this.Ctx,App.Palette[8]);
        this.DrawMoveTo(-1,-1);
        this.DrawLineTo(1,-1);
        this.DrawLineTo(2,0);
        this.DrawLineTo(0,2);
        this.DrawLineTo(-1,1);
        this.Ctx.closePath();
        this.Ctx.fill();

        this.Ctx.beginPath();
        App.FillColor(this.Ctx,App.Palette[4]);
        this.DrawMoveTo(-1,-1);
        this.DrawLineTo(0,0);
        this.DrawLineTo(0,2);
        this.DrawLineTo(-1,1);
        this.Ctx.closePath();
        this.Ctx.fill();

        this.Ctx.beginPath();
        App.FillColor(this.Ctx,App.Palette[6]);
        this.DrawMoveTo(0,0);
        this.DrawLineTo(1,0);
        this.DrawLineTo(0,1);
        this.Ctx.closePath();
        this.Ctx.fill();

        // gain
        this._Center = new Point(-0.5,0);
        this._Offset = new Point(-1,0);
        App.FillColor(this.Ctx,App.Palette[4]);
        if (!colorful) {App.FillColor(this.Ctx,App.Palette[0]);}
        this.CenterRect();
        this.Ctx.beginPath();
        App.FillColor(this.Ctx,App.Palette[5]);
        this.DrawMoveTo(-1,0);
        this.DrawLineTo(0,-1);
        this.DrawLineTo(2,1);
        this.DrawLineTo(0,1);
        this.Ctx.closePath();
        this.Ctx.fill();
        this.Ctx.beginPath();
        App.FillColor(this.Ctx,App.Palette[3]);
        this.DrawMoveTo(-1,0);
        this.DrawLineTo(0,0);
        this.DrawLineTo(1,1);
        this.DrawLineTo(0,1);
        this.Ctx.closePath();
        this.Ctx.fill();

        // noise
        this._Center = new Point(0,-0.5);
        this._Offset = new Point(-1,-1);
        App.FillColor(this.Ctx,App.Palette[5]);
        if (!colorful) {App.FillColor(this.Ctx,App.Palette[2]);}
        this.CenterRect();
        this.Ctx.beginPath();
        App.FillColor(this.Ctx,App.Palette[4]);
        this.DrawMoveTo(-1,0);
        this.DrawLineTo(0,-1);
        this.DrawLineTo(1,-1);
        this.DrawLineTo(1,0);
        this.DrawLineTo(-1,2);
        this.Ctx.closePath();
        this.Ctx.fill();

        this.Ctx.beginPath();
        App.FillColor(this.Ctx,App.Palette[8]);
        this.DrawMoveTo(-1,0);
        this.DrawLineTo(0,-1);
        this.DrawLineTo(1,-1);
        this.DrawLineTo(0,0);
        this.Ctx.closePath();
        this.Ctx.fill();

        // distortion
        this._Center = new Point(0,-0.5);
        this._Offset = new Point(0,-1);
        App.FillColor(this.Ctx,App.Palette[6]);
        if (!colorful) {App.FillColor(this.Ctx,App.Palette[0]);}
        this.CenterRect();
        this.Ctx.beginPath();
        App.FillColor(this.Ctx,App.Palette[7]);
        this.DrawMoveTo(-1,-1);
        this.DrawLineTo(1,-1);
        this.DrawLineTo(1,0);
        this.DrawLineTo(-1,2);
        this.Ctx.closePath();
        this.Ctx.fill();

        this.Ctx.beginPath();
        App.FillColor(this.Ctx,App.Palette[9]);
        this.DrawLineTo(-1,-1);
        this.DrawLineTo(0,-1);
        this.DrawLineTo(0,0);
        this.DrawLineTo(-1,1);
        this.Ctx.closePath();
        this.Ctx.fill();

        this._Center = new Point(0,0);
        this._Offset = new Point(1,-1);
        App.FillColor(this.Ctx,App.Palette[2]);
        this.CenterRect();
        var dx = (App.Width*0.5) + (this._Center.x*this._Scale) + (App.Width*(this._Offset.x+this.XOffset));
        var dy = (App.Height*0.5) + (this._Center.y*this._Scale) + (App.Height*(this._Offset.y+this.YOffset));
        var headerType = 100*units;
        App.FillColor(this.Ctx,App.Palette[App.ThemeManager.Txt]);
        this.Ctx.textAlign = "center";
        this.Ctx.font = "200 " + headerType + "px Dosis";
        this.Ctx.fillText("BLOKDUST",dx,dy + (headerType * 0.38));


        // IOS BUTTON //
        var by = App.Height*this.ButtonOffset;
        App.FillColor(this.Ctx,App.Palette[0]);
        this.Ctx.fillRect(0,by,App.Width,App.Height);

        App.FillColor(this.Ctx,App.Palette[7]);
        ctx.beginPath();
        ctx.moveTo((App.Width*0.5) - (this._Scale*0.5),by + (App.Height*0.5) - (this._Scale));
        ctx.lineTo((App.Width*0.5) - (this._Scale*0.5),by + (App.Height*0.5) + (this._Scale));
        ctx.lineTo((App.Width*0.5) + (this._Scale*0.5),by + (App.Height*0.5));
        ctx.fill();


        // CHROME RECOMMENDED //
        var chY = (this.LoadOffset * App.Height);

        App.FillColor(ctx,App.Palette[App.ThemeManager.Txt]);
        App.StrokeColor(ctx,App.Palette[App.ThemeManager.Txt]);
        ctx.font = App.Metrics.TxtLarge;
        ctx.textAlign = "center";
        ctx.fillText('Chrome Recommended', App.Width*0.5, chY + this.DrawTo.Height - (20 * units));

        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo((App.Width*0.5) - (60*units), chY + this.DrawTo.Height - (27 * units));
        ctx.lineTo((App.Width*0.5) - (63.89*units), chY + this.DrawTo.Height - (20 * units));
        ctx.lineTo((App.Width*0.5) - (56.11*units), chY + this.DrawTo.Height - (20 * units));
        ctx.closePath();
        ctx.stroke();
    }

    DrawMoveTo(x, y) {
        var scale = this._Scale;
        var dx = (App.Width*0.5) + (this._Center.x*scale) + (App.Width*(this._Offset.x+this.XOffset));
        var dy = (App.Height*0.5) + (this._Center.y*scale) + (App.Height*(this._Offset.y+this.YOffset));

        this.Ctx.moveTo(dx + (x*scale),dy + (y*scale));
    }

    DrawLineTo(x, y) {
        var scale = this._Scale;
        var dx = (App.Width*0.5) + (this._Center.x*scale) + (App.Width*(this._Offset.x+this.XOffset));
        var dy = (App.Height*0.5) + (this._Center.y*scale) + (App.Height*(this._Offset.y+this.YOffset));

        this.Ctx.lineTo(dx + (x*scale),dy + (y*scale));
    }

    CenterRect() {
        var dx = (App.Width*(this._Offset.x+this.XOffset));
        var dy = (App.Height*(this._Offset.y+this.YOffset));

        this.Ctx.fillRect(dx,dy,App.Width,App.Height);
    }

    //-------------------------------------------------------------------------------------------
    //  TWEEN
    //-------------------------------------------------------------------------------------------


    DelayTo(panel,destination,t,delay,v,s){

        var offsetTween = new window.TWEEN.Tween({x: s});
        offsetTween.to({x: destination}, t);
        offsetTween.onUpdate(function () {
            panel[""+v] = this.x;
        });
        offsetTween.easing(window.TWEEN.Easing.Exponential.InOut);
        offsetTween.delay(delay);
        offsetTween.start(this.LastVisualTick);
    }

    TransitionIn() {
        var initDelay = 300;
        var tweenLength = 250;
        var viewLength = 350;
        this.DelayTo(this,0,tweenLength,initDelay,'LoadOffset',-1);


        // SHOW BUTTON //
        var ios = false;
        // check for device here //
        if (ios) {
            this.DelayTo(this,0,tweenLength,initDelay,'ButtonOffset',-1);
            this._IOSPause = true;
        }

        // DONT SHOW BUTTON //
        else {
            this.Animate(initDelay,tweenLength,viewLength);
        }

    }

    Animate(initDelay, tweenLength, viewLength) {
        this.DelayTo(this,0,tweenLength,initDelay,'YOffset',-1);
        this.DelayTo(this,1,tweenLength,viewLength + tweenLength + initDelay,'XOffset',0);
        this.DelayTo(this,1,tweenLength,(viewLength*2) + (tweenLength*2) + initDelay,'YOffset',0);
        this.DelayTo(this,0,tweenLength,(viewLength*3) + (tweenLength*3) + initDelay,'XOffset',1);
        this.DelayTo(this,-1,tweenLength,(viewLength*4) + (tweenLength*4) + initDelay,'XOffset',0);
        this.DelayTo(this,2,tweenLength + 200,(viewLength*5) + (tweenLength*5) + initDelay + 200,'YOffset',1);

        // when pre-roll is finished
        setTimeout(() => {
            this.IsAnimationFinished = true;
            this.AnimationFinished.raise(this, null);
        },(viewLength*5) + (tweenLength*5) + initDelay + 200);
    }

    TransitionOut() {
        this.DelayTo(this,1,450,300,'LoadOffset',0);
        // when pre-roll is finished
        setTimeout(() => {
            this.IsTransitionFinished = true;
        },800);
    }


    //-------------------------------------------------------------------------------------------
    //  INTERACTION
    //-------------------------------------------------------------------------------------------


    MouseDown(e: MouseEvent): void {
        if (this._IOSPause) {
            this.StartButton();
        }
    }



    TouchStart(e: any){
        if (this._IOSPause) {
            this.StartButton();
        }
    }

    StartButton() {

        // AUDIO //
        // initiate audio context here //


        // ANIM //
        this._IOSPause = false;
        var initDelay = 300;
        var tweenLength = 250;
        var viewLength = 350;
        this.DelayTo(this,1,tweenLength,initDelay,'ButtonOffset',0);
        this.Animate(initDelay,tweenLength,viewLength);
    }
}
