///<amd-dependency path="etch"/>.
import DisplayObject = etch.drawing.DisplayObject;
import {IApp} from './IApp';
import IDisplayContext = etch.drawing.IDisplayContext;
import Point = etch.primitives.Point;
import {unlockAudioContext, isIOS, hasAudioContextStarted} from './Core/Audio/Utils/Utils';

declare var App: IApp;

export class Splash extends DisplayObject{

    public XOffset: number;
    public YOffset: number;
    public LoadOffset: number;
    public ButtonOffset: number;
    private _Scale: number;
    private _Center: Point;
    private _Offset: Point;
    public IOSPause: boolean = false;
    IsAnimationFinished: boolean = false;
    IsTransitionFinished: boolean = false;
    AnimationFinished = new nullstone.Event<{}>();
    _hasTouchMoved: boolean = false;

    Init(drawTo: IDisplayContext): void {
        super.init(drawTo);
    }

    public setup() {
        super.setup();

        this._Offset = new Point(0,0);
        this.XOffset = 0;
        this.YOffset = -1;
        this.LoadOffset = -1;
        this.ButtonOffset = -1;

        App.PointerInputManager.MouseDown.on((s: any, e: MouseEvent) => {
            this.MouseDown(e);
        }, this);

        App.PointerInputManager.TouchEnd.on((s: any, e: TouchEvent) => {
            this.TouchEnd(e);
        }, this);

        App.PointerInputManager.TouchMove.on((s: any, e: TouchEvent) => {
            this._hasTouchMoved = true;
        }, this);
    }

    //-------------------------------------------------------------------------------------------
    //  DRAWING
    //-------------------------------------------------------------------------------------------

    public draw() {

        super.draw();

        if (this.IsTransitionFinished) {
            return;
        }

        if (this.isFirstFrame()){
            this.TransitionIn();
        }

        var colorful = false;
        var units = App.Unit;
        var ctx = this.ctx;

        this._Scale = 100 * units;
        this.ctx.globalAlpha = 1;

        // LOADING //
        if (App.IsLoadingComposition) {
            var dx = 0;
            var dy = (App.Height*(this.LoadOffset));
            App.FillColor(this.ctx,App.Palette[0]);
            this.ctx.fillRect(dx,dy,App.Width,App.Height);

            var dx = (App.Width*0.5);
            var dy = (App.Height*0.5) + (App.Height*this.LoadOffset);
            App.FillColor(this.ctx,App.Palette[App.ThemeManager.Txt]);
            this.ctx.textAlign = "center";
            this.ctx.font = App.Metrics.TxtHeader;
            this.ctx.fillText("LOADING SCENE",dx,dy + (26 * units)); // todo: use l10n
            //App.AnimationsLayer.Spin();
            App.AnimationsLayer.DrawSprite(this.ctx,'loading',dx, dy - (16 * units),16,true);
        }

        //TODO use blocksprites with multiplier argument
        this._Offset = new Point(0,1);
        App.FillRGBA(this.ctx,10,10,10,1);
        this.CenterRect();

        // Convolution
        this._Center = new Point(-0.5,-0.5);
        this._Offset = new Point(0,0);
        App.FillColor(this.ctx,App.Palette[3]);
        if (!colorful) {App.FillColor(this.ctx,App.Palette[2]);}
        this.CenterRect();
        this.ctx.beginPath();
        App.FillColor(this.ctx,App.Palette[8]);
        this.DrawMoveTo(-1,-1);
        this.DrawLineTo(1,-1);
        this.DrawLineTo(2,0);
        this.DrawLineTo(0,2);
        this.DrawLineTo(-1,1);
        this.ctx.closePath();
        this.ctx.fill();

        this.ctx.beginPath();
        App.FillColor(this.ctx,App.Palette[4]);
        this.DrawMoveTo(-1,-1);
        this.DrawLineTo(0,0);
        this.DrawLineTo(0,2);
        this.DrawLineTo(-1,1);
        this.ctx.closePath();
        this.ctx.fill();

        this.ctx.beginPath();
        App.FillColor(this.ctx,App.Palette[6]);
        this.DrawMoveTo(0,0);
        this.DrawLineTo(1,0);
        this.DrawLineTo(0,1);
        this.ctx.closePath();
        this.ctx.fill();

        // gain
        this._Center = new Point(-0.5,0);
        this._Offset = new Point(-1,0);
        App.FillColor(this.ctx,App.Palette[4]);
        if (!colorful) {App.FillColor(this.ctx,App.Palette[0]);}
        this.CenterRect();
        this.ctx.beginPath();
        App.FillColor(this.ctx,App.Palette[5]);
        this.DrawMoveTo(-1,0);
        this.DrawLineTo(0,-1);
        this.DrawLineTo(2,1);
        this.DrawLineTo(0,1);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.beginPath();
        App.FillColor(this.ctx,App.Palette[3]);
        this.DrawMoveTo(-1,0);
        this.DrawLineTo(0,0);
        this.DrawLineTo(1,1);
        this.DrawLineTo(0,1);
        this.ctx.closePath();
        this.ctx.fill();

        // noise
        this._Center = new Point(0,-0.5);
        this._Offset = new Point(-1,-1);
        App.FillColor(this.ctx,App.Palette[5]);
        if (!colorful) {App.FillColor(this.ctx,App.Palette[2]);}
        this.CenterRect();
        this.ctx.beginPath();
        App.FillColor(this.ctx,App.Palette[4]);
        this.DrawMoveTo(-1,0);
        this.DrawLineTo(0,-1);
        this.DrawLineTo(1,-1);
        this.DrawLineTo(1,0);
        this.DrawLineTo(-1,2);
        this.ctx.closePath();
        this.ctx.fill();

        this.ctx.beginPath();
        App.FillColor(this.ctx,App.Palette[8]);
        this.DrawMoveTo(-1,0);
        this.DrawLineTo(0,-1);
        this.DrawLineTo(1,-1);
        this.DrawLineTo(0,0);
        this.ctx.closePath();
        this.ctx.fill();

        // distortion
        this._Center = new Point(0,-0.5);
        this._Offset = new Point(0,-1);
        App.FillColor(this.ctx,App.Palette[6]);
        if (!colorful) {App.FillColor(this.ctx,App.Palette[0]);}
        this.CenterRect();
        this.ctx.beginPath();
        App.FillColor(this.ctx,App.Palette[7]);
        this.DrawMoveTo(-1,-1);
        this.DrawLineTo(1,-1);
        this.DrawLineTo(1,0);
        this.DrawLineTo(-1,2);
        this.ctx.closePath();
        this.ctx.fill();

        this.ctx.beginPath();
        App.FillColor(this.ctx,App.Palette[9]);
        this.DrawLineTo(-1,-1);
        this.DrawLineTo(0,-1);
        this.DrawLineTo(0,0);
        this.DrawLineTo(-1,1);
        this.ctx.closePath();
        this.ctx.fill();

        this._Center = new Point(0,0);
        this._Offset = new Point(1,-1);
        App.FillColor(this.ctx,App.Palette[2]);
        this.CenterRect();
        var dx = (App.Width*0.5) + (this._Center.x*this._Scale) + (App.Width*(this._Offset.x+this.XOffset));
        var dy = (App.Height*0.5) + (this._Center.y*this._Scale) + (App.Height*(this._Offset.y+this.YOffset));
        var headerType = 100*units;
        App.FillColor(this.ctx,App.Palette[App.ThemeManager.Txt]);
        this.ctx.textAlign = "center";
        this.ctx.font = "200 " + headerType + "px Dosis";
        this.ctx.fillText("BLOKDUST",dx,dy + (headerType * 0.38));


        // IOS BUTTON //
        var by = App.Height*this.ButtonOffset;
        App.FillColor(this.ctx,App.Palette[0]);
        this.ctx.fillRect(0,by,App.Width,App.Height);

        App.FillColor(this.ctx,App.Palette[7]);
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
        ctx.fillText('Chrome Recommended', App.Width*0.5, chY + this.drawTo.height - (20 * units));

        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo((App.Width*0.5) - (60*units), chY + this.drawTo.height - (27 * units));
        ctx.lineTo((App.Width*0.5) - (63.89*units), chY + this.drawTo.height - (20 * units));
        ctx.lineTo((App.Width*0.5) - (56.11*units), chY + this.drawTo.height - (20 * units));
        ctx.closePath();
        ctx.stroke();
    }

    DrawMoveTo(x, y) {
        var scale = this._Scale;
        var dx = (App.Width*0.5) + (this._Center.x*scale) + (App.Width*(this._Offset.x+this.XOffset));
        var dy = (App.Height*0.5) + (this._Center.y*scale) + (App.Height*(this._Offset.y+this.YOffset));

        this.ctx.moveTo(dx + (x*scale),dy + (y*scale));
    }

    DrawLineTo(x, y) {
        var scale = this._Scale;
        var dx = (App.Width*0.5) + (this._Center.x*scale) + (App.Width*(this._Offset.x+this.XOffset));
        var dy = (App.Height*0.5) + (this._Center.y*scale) + (App.Height*(this._Offset.y+this.YOffset));

        this.ctx.lineTo(dx + (x*scale),dy + (y*scale));
    }

    CenterRect() {
        var dx = (App.Width*(this._Offset.x+this.XOffset));
        var dy = (App.Height*(this._Offset.y+this.YOffset));

        this.ctx.fillRect(dx,dy,App.Width,App.Height);
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
        offsetTween.start(this.lastVisualTick);
    }

    TransitionIn() {
        var initDelay = 300;
        var tweenLength = 250;
        var viewLength = 350;
        this.DelayTo(this,0,tweenLength,initDelay,'LoadOffset',-1);

        // iOS needs a start button //
        if (isIOS()) {
            // SHOW BUTTON //
            this.DelayTo(this,0,tweenLength,initDelay,'ButtonOffset',-1);
            this.IOSPause = true;
        }

        else {
            // DONT SHOW BUTTON //
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
        if (this.IOSPause) {
            this.StartButtonPressed();
        }
    }

    TouchEnd(e: any){
        // iOS audio wont initialize if there's a touchMove event
        if (this.IOSPause && !this._hasTouchMoved) {
            this.StartButtonPressed();
        }
        this._hasTouchMoved = false;
    }

    StartButtonPressed() {
        // Check to see if audio context has started
        if (hasAudioContextStarted(App.Audio.ctx)){
            // START APP //
            this.StartAppAfterPause();
        } else {
            // UNLOCK AUDIO CONTEXT //
            unlockAudioContext(App.Audio.ctx, () => {
                // START APP //
                this.StartAppAfterPause();
            });
        }
    }

    StartAppAfterPause() {
        // ANIM //
        this.IOSPause = false;
        var initDelay = 300;
        var tweenLength = 250;
        var viewLength = 350;
        this.DelayTo(this,1,tweenLength,initDelay,'ButtonOffset',0);
        this.Animate(initDelay,tweenLength,viewLength);
        if (!App.IsLoadingComposition) {
            App.MainScene.Begin();
        }
    }

}
