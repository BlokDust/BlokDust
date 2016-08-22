import Dimensions = Utils.Measurements.Dimensions;
import DisplayObject = etch.drawing.DisplayObject;
import Size = minerva.Size;
import {IApp} from '../IApp';
import {MainScene} from './../MainScene';

declare var App: IApp;

export class MessagePanel extends DisplayObject {

    private _Roll:boolean[];
    public Hover:boolean;
    private _Defaults:any;
    private _Value: any;
    private _Alpha: number;
    public Open: boolean;
    private _Timeout: any;
    private _CloseX: number;
    private _Lines: number;
    private _ButtonWidth: number;

    Init(drawTo: IDisplayContext):void {
        super.Init(drawTo);

        this._Roll = [];
        this.Hover = false;
        this.Open = false;
        this._CloseX = 0;
        this._Lines = 0;

        // DEFAULT MESSAGING ARGUMENTS //
        this._Defaults = {
            string: "Message Text Missing...",
            seconds: 3,
            confirmation: false,
            buttonText: "",
            buttonEvent: this.DefaultFunction
        };

        this._Value = {
            string: this._Defaults.string,
            seconds: this._Defaults.seconds,
            confirmation: this._Defaults.confirmation,
            buttonText: this._Defaults.buttonText,
            buttonEvent: this._Defaults.buttonEvent
        };


    }

    //-------------------------------------------------------------------------------------------
    //  DRAWING
    //-------------------------------------------------------------------------------------------


    Draw() {
        var units = App.Unit;
        var ctx = this.Ctx;
        var midType = App.Metrics.TxtMid;
        var y = (<MainScene>this.DrawTo).Height*0.75;
        var cx = (<MainScene>this.DrawTo).Width*0.5;
        var w = (<MainScene>this.DrawTo).Width;

        if (this._Alpha>0) {
            ctx.textAlign = "center";
            ctx.font = midType;
            var clx = this._CloseX;

            // DRAW PANEL //
            App.FillColor(ctx,App.Palette[2]);
            ctx.globalAlpha = this._Alpha * 0.16;
            ctx.fillRect(0, y - (25*units), w, (60*units) + (this._Lines * (16*units)));

            ctx.globalAlpha = this._Alpha * 0.9;
            ctx.fillRect(0, y - (30*units), w, (60*units) + (this._Lines * (16*units)));


            // MESSAGE TEXT //
            ctx.globalAlpha = this._Alpha;
            App.FillColor(ctx,App.Palette[App.ThemeManager.Txt]);
            App.StrokeColor(ctx,App.Palette[App.ThemeManager.Txt]);
            //ctx.fillText(this._Value.string.toUpperCase(), cx, y + (5 * units));
            this.WordWrap(ctx,this._Value.string.toUpperCase(), cx, y + (5 * units), 16*units, w - (30*units));

            // CLOSE //
            if (this._Value.confirmation) {

                App.FillColor(ctx,App.Palette[2]);
                ctx.globalAlpha = this._Alpha * 0.9;
                ctx.beginPath();
                ctx.moveTo(clx - (20 * units), y - (30 * units));
                ctx.lineTo(clx + (20 * units), y - (30 * units));
                ctx.lineTo(clx, y - (50 * units));
                ctx.closePath();
                ctx.fill();

                // CLOSE X //
                ctx.globalAlpha = this._Alpha;
                App.StrokeColor(ctx,App.Palette[App.ThemeManager.Txt]);
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(clx - (4 * units), y - (34 * units));
                ctx.lineTo(clx + (4 * units), y - (26 * units));
                ctx.moveTo(clx - (4 * units), y - (26 * units));
                ctx.lineTo(clx + (4 * units), y - (34 * units));
                ctx.stroke();
                ctx.lineWidth = 1;

            }

            // BUTTON //
            if (this._Value.buttonText!=="") {
                App.FillColor(ctx,App.Palette[4]);
                ctx.fillRect(clx,y - (15*units),this._ButtonWidth,30*units);
                if (this._Roll[1]) {
                    ctx.beginPath();
                    ctx.moveTo(clx + (this._ButtonWidth*0.5) - (10 * units), y + (15 * units) - 1);
                    ctx.lineTo(clx + (this._ButtonWidth*0.5) + (10 * units), y + (15 * units) - 1);
                    ctx.lineTo(clx + (this._ButtonWidth*0.5), y + (25 * units) - 1);
                    ctx.closePath();
                    ctx.fill();
                }
                ctx.textAlign = "left";
                App.FillColor(ctx,App.Palette[App.ThemeManager.Txt]);
                ctx.fillText(this._Value.buttonText.toUpperCase(), clx + (10*units), y + (5 * units));
            }
        }
    }


    //-------------------------------------------------------------------------------------------
    //  STRING FUNCTIONS
    //-------------------------------------------------------------------------------------------


    WordWrap( context , text, x, y, lineHeight, fitWidth) {
        fitWidth = fitWidth || 0;

        if (fitWidth <= 0) {
            context.fillText( text, x, y );
            return;
        }
        var words = text.split(' ');
        var currentLine = 0;
        var idx = 1;
        while (words.length > 0 && idx <= words.length) {
            var str = words.slice(0,idx).join(' ');
            var w = context.measureText(str).width;
            if ( w > fitWidth ) {
                if (idx==1)
                {
                    idx=2;
                }
                context.fillText( words.slice(0,idx-1).join(' '), x, y + (lineHeight*currentLine) );
                currentLine++;
                words = words.splice(idx-1);
                idx = 1;
            }
            else
            {idx++;}
        }
        if  (idx > 0)
            context.fillText( words.join(' '), x, y + (lineHeight*currentLine) );
    }


    LineCount( context , text, fitWidth) {
        fitWidth = fitWidth || 0;

        this._Lines = 0;
        if (fitWidth <= 0) {
            return;
        }
        var words = text.split(' ');
        var currentLine = 0;
        var idx = 1;
        while (words.length > 0 && idx <= words.length) {
            var str = words.slice(0,idx).join(' ');
            var w = context.measureText(str).width;
            if ( w > fitWidth ) {
                if (idx==1)
                {
                    idx=2;
                }
                this._Lines += 1;
                currentLine++;
                words = words.splice(idx-1);
                idx = 1;
            }
            else
            {idx++;}
        }
    }

    //-------------------------------------------------------------------------------------------
    //  MESSAGING
    //-------------------------------------------------------------------------------------------
    NewMessage(string?: string, options?: any) {
        options = options || {};
        this._Value.string = string || this._Defaults.string;
        this._Value.seconds = options.seconds || this._Defaults.seconds;
        this._Value.confirmation = options.confirmation || this._Defaults.confirmation;
        this._Value.buttonText = options.buttonText || this._Defaults.buttonText;
        this._Value.buttonEvent = options.buttonEvent || this._Defaults.buttonEvent;

        // IF BUTTON, FORCE CONFIRMATION //
        if (this._Value.buttonText!=="") {
            this._Value.confirmation = true;
        }

        // LINE COUNT //
        var units = App.Unit;
        var ctx = this.Ctx;
        ctx.font = App.Metrics.TxtMid;
        this.LineCount(ctx,this._Value.string.toUpperCase(), App.Width - (30*units));

        // CLOSE POSITION //
        if (this._Value.confirmation) {
            var cx = (<MainScene>this.DrawTo).Width*0.5;
            this._CloseX = cx + (20*units) + (ctx.measureText(this._Value.string.toUpperCase()).width * 0.5);
            this._ButtonWidth = (20*units) + ctx.measureText(this._Value.buttonText.toUpperCase()).width;
        }




        // START OPEN TWEEN //
        if (!this.Open) {
            this.Tween(this,"_Alpha",1,0,400);
            this.Open = true;
        }

        // CLOSE TIMER//
        clearTimeout(this._Timeout);
        var message = this;
        this._Timeout = setTimeout(function(){
            if (!message._Value.confirmation) {
                message.Close();
            }
        },this._Value.seconds*1000);


    }

    Close() {
        this.Tween(this,"_Alpha",0,0,1000);
        this.Hover = false;
        this.Open = false;
    }

    DefaultFunction() {
        // console.log("default function");
    }


    //-------------------------------------------------------------------------------------------
    //  TWEEN
    //-------------------------------------------------------------------------------------------


    Tween(panel,value,destination,delay,time) {

        var pTween = new window.TWEEN.Tween({x:panel[""+value]});
        pTween.to({ x: destination }, time);
        pTween.onUpdate(function() {
            panel[""+value] = this.x;
        });
        pTween.delay(delay);
        pTween.start(this.LastVisualTick);
        pTween.easing( window.TWEEN.Easing.Quintic.InOut );
    }

    //-------------------------------------------------------------------------------------------
    //  INTERACTION
    //-------------------------------------------------------------------------------------------

    MouseDown(point) {
        this.RolloverCheck(point);

        if (this.Open && this._Roll[0]) {
            this.Close();
        }
        if (this.Open && this._Roll[1]) {
            this._Value.buttonEvent();
            this.Close();
        }
    }

    MouseMove(point) {
        this.RolloverCheck(point);
    }


    RolloverCheck(point) {
        this.Hover = false;
        var units = App.Unit;

        if (this._Value.confirmation) {
            this._Roll[0] = Dimensions.hitRect(this._CloseX  - (20*units), ((<MainScene>this.DrawTo).Height*0.75) - (50*units), (40*units), (40*units), point.x, point.y);
        } else {
            this._Roll[0] = false;
        }
        if (this._Value.buttonText!=="") {
            this._Roll[1] = Dimensions.hitRect(this._CloseX, ((<MainScene>this.DrawTo).Height*0.75) - (15*units), this._ButtonWidth, (30*units), point.x, point.y);
        } else {
            this._Roll[1] = false;
        }

        if (this._Roll[0] || this._Roll[1]) {
            this.Hover = true;
        }
    }
}