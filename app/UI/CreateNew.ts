import Dimensions = Utils.Measurements.Dimensions;
import DisplayObject = etch.drawing.DisplayObject;
import Size = minerva.Size;
import {IApp} from '../IApp';
import Point = minerva.Point;

declare var App: IApp;

export class CreateNew extends DisplayObject{

    private _RollOvers: boolean[] = [];
    public BlockCount: number;
    public Hover: boolean;
    public IconPos: Point;
    public IconOffset: Point;
    public Message: string;
    public MessagePos: Point;
    public Open: boolean;
    public PanelOffset: Point;
    public PanelOffset2: Point;
    public Selected: number;
    //public ShowMessage: boolean = false;
    public Tweens: any[];
    public Verify: string;
    public TickX: number;
    public CrossX: number;

    Init(drawTo: IDisplayContext): void {
        super.Init(drawTo);

        this.BlockCount = 0;
        this.Hover = false;
        this.IconPos = new Point(25, App.Metrics.HeaderHeight*0.5);
        this.IconOffset = new Point(-1,0);
        this.Open = false;
        this.PanelOffset = new Point(0,-1);
        this.PanelOffset2 = new Point(0,1);
        this.Selected = 0;
        this.Tweens = [];
        this.Verify = App.L10n.UI.CreateNew.Verify.toUpperCase();
        this.Message = App.L10n.UI.CreateNew.NewMessage.toUpperCase();
        this.MessagePos = new Point(100, 30);
        this.TickX = 130;
        this.CrossX = this.TickX+60;
    }

    CheckState() {
        if (App.Blocks.length>1) {
            if (this.IconOffset.x<0 && (App.Blocks.length!==this.BlockCount)) {
                this.StopAllTweens();
                this.DelayTo(this.IconOffset,0,0.6,0,"x");
                this.DelayTo(App.MainScene.Header,30,0.6,0,"CreateNewMargin");
            }
        } else {
            if (this.IconOffset.x>-1) {
                this.StopAllTweens();
                if (this.Open) {
                    this.Open = false;
                    this.DelayTo(this,0,0.3,0,"Selected");
                    this.DelayTo(this.PanelOffset,-1,0.3,0,"y");
                }
                if (this.PanelOffset2.y===0) {
                    this.CloseMessage();
                }
                this.DelayTo(this.IconOffset,-1,0.6,0,"x");
                this.DelayTo(App.MainScene.Header,0,0.6,0,"CreateNewMargin");
            }
        }
        this.BlockCount = App.Blocks.length;
    }


    //-------------------------------------------------------------------------------------------
    //  DRAW
    //-------------------------------------------------------------------------------------------


    Draw() {
        var ctx = this.Ctx;
        var units = App.Unit;
        var midType = App.Metrics.TxtMid;
        var italicType = App.Metrics.TxtItalic2;
        var x = this.IconPos.x;
        var y = this.IconPos.y;
        var yx = this.TickX*units;
        var nx = this.CrossX*units;

        var xOffset = this.IconOffset.x*((this.IconPos.x*units)*2);
        var header = App.MainScene.Header;
        var height = header.Height*units;
        var width = 50*units;
        var panelOffset = this.PanelOffset.y * ((header.Height*2)*units);
        var panelOffset2 = this.PanelOffset2.y * (500*units);


        if (this.PanelOffset.y > -1) { // draw if on screen


            var ym = 1;
            if (this._RollOvers[1]) {
                ym = 1.2;
            }
            var nm = 1;
            if (this._RollOvers[2]) {
                nm = 1.2;
            }


            ctx.textAlign = "left";
            ctx.font = midType;

            // CLIPPING BOX //
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(0, Math.round((header.Height * header.Rows)*units));
            ctx.lineTo((App.Width), Math.round((header.Height * header.Rows)*units));
            ctx.lineTo((App.Width), App.Height*0.5);
            ctx.lineTo(0, (App.Height*0.5));
            ctx.closePath();
            ctx.clip();

            // BG //
            App.FillColor(ctx,App.Palette[2]);
            ctx.globalAlpha = 0.16;
            ctx.fillRect(0,Math.round(((header.Height * header.Rows)*units) + panelOffset),nx + (30*units),height + (5*units));
            ctx.globalAlpha = 0.9;
            ctx.fillRect(0,Math.round(((header.Height * header.Rows)*units) + panelOffset),nx + (30*units),height);


            // VERIFY //
            var sy = Math.round(((header.Height * (header.Rows+0.5))*units) + panelOffset);
            ctx.globalAlpha = 1;
            App.FillColor(ctx,App.Palette[App.ThemeManager.Txt]);
            ctx.fillText(this.Verify, x ,sy + ((10*units) * 0.38));

            App.StrokeColor(ctx,App.Palette[App.ThemeManager.Txt]);
            ctx.lineWidth = 2;

            // TICK //
            ctx.beginPath();
            ctx.moveTo(yx - ((12*ym)*units), sy);
            ctx.lineTo(yx - ((4*ym)*units), sy + ((8*ym)*units));
            ctx.lineTo(yx + ((12*ym)*units), sy - ((8*ym)*units));


            // CROSS //
            ctx.moveTo(nx - ((8*nm)*units), sy - ((8*nm)*units));
            ctx.lineTo(nx + ((8*nm)*units), sy + ((8*nm)*units));
            ctx.moveTo(nx + ((8*nm)*units), sy - ((8*nm)*units));
            ctx.lineTo(nx - ((8*nm)*units), sy + ((8*nm)*units));
            ctx.stroke();

            App.StrokeColor(ctx,App.Palette[1]);
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(yx + (30*units), sy - (16*units));
            ctx.lineTo(yx + (30*units), sy + (16*units));
            ctx.stroke();

            // END CLIPPING //
            ctx.restore();


            // DIVIDE //
            App.StrokeColor(ctx,App.Palette[1]);
            ctx.lineWidth = 1;
            if (this.PanelOffset.y>-0.5) {
                ctx.beginPath();
                ctx.moveTo(20*units, Math.round(((header.Height * header.Rows)*units)));
                ctx.lineTo(nx + (10*units), Math.round(((header.Height * header.Rows)*units)));
                ctx.stroke();
            }

        }




        // SELECTION COLOR //
        if (this.Selected) { // draw if on screen
            App.FillColor(ctx,App.Palette[App.ThemeManager.MenuOrder[1]]);
            ctx.beginPath();
            ctx.moveTo(0,0);
            ctx.lineTo(width , 0);
            ctx.lineTo(width,(height*this.Selected));
            ctx.lineTo((width*0.5) + (10*units),(height*this.Selected));
            ctx.lineTo((width*0.5),((height + (10*units))*this.Selected));
            ctx.lineTo((width*0.5) - (10*units),(height*this.Selected));
            ctx.lineTo(0,(height*this.Selected));
            ctx.closePath();
            ctx.fill();
        }


        // ICON //
        var m = 1;
        if (this._RollOvers[0]) {
            m = 1.2;
        }
        ctx.globalAlpha = 1;
        App.StrokeColor(ctx,App.Palette[App.ThemeManager.Txt]);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(((x-(2*m))*units) + xOffset, (y-(2*m))*units);
        ctx.lineTo(((x+(8*m))*units) + xOffset, (y-(2*m))*units);
        ctx.moveTo(((x+(3*m))*units) + xOffset, (y-(7*m))*units);
        ctx.lineTo(((x+(3*m))*units) + xOffset, (y+(3*m))*units);
        ctx.moveTo(((x-(5*m))*units) + xOffset, (y-(2*m))*units);
        ctx.lineTo(((x-(5*m))*units) + xOffset, (y+(6*m))*units);
        ctx.lineTo(((x+(3*m))*units) + xOffset, (y+(6*m))*units);
        ctx.stroke();


        // MESSAGE BUTTON //
        if (this.PanelOffset2.y < 0.5) { // draw if on screen
            var mm = 1;
            if (this._RollOvers[3]) {
                mm = 1.01;
            }
            var w = this.MessagePos.x;
            y = this.MessagePos.y;
            ctx.beginPath();
            ctx.moveTo((App.Width*0.5)-((w*mm)*units), (App.Height - (y*units)) - ((16*mm)*units) + panelOffset2);
            ctx.lineTo((App.Width*0.5)+((w*mm)*units), (App.Height - (y*units)) - ((16*mm)*units) + panelOffset2);
            ctx.lineTo((App.Width*0.5)+((w*mm)*units), (App.Height - (y*units)) + ((16*mm)*units) + panelOffset2);
            ctx.lineTo((App.Width*0.5)-((w*mm)*units), (App.Height - (y*units)) + ((16*mm)*units) + panelOffset2);
            ctx.closePath();
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo((App.Width*0.5)+((w+6)*units), (App.Height - ((y+19)*units)) + panelOffset2);
            ctx.lineTo((App.Width*0.5)+((w+14)*units), (App.Height - ((y+11)*units)) + panelOffset2);
            ctx.moveTo((App.Width*0.5)+((w+14)*units), (App.Height - ((y+19)*units)) + panelOffset2);
            ctx.lineTo((App.Width*0.5)+((w+6)*units), (App.Height - ((y+11)*units)) + panelOffset2);
            ctx.stroke();

            ctx.textAlign = "center";
            //ctx.font = italicType;
            App.FillColor(ctx,App.Palette[App.ThemeManager.Txt]);
            ctx.fillText(this.Message, (App.Width*0.5), (App.Height - (30*units)) + ((10*units) * 0.38) + panelOffset2);
        }



    }


    //-------------------------------------------------------------------------------------------
    //  TWEEN
    //-------------------------------------------------------------------------------------------


    DelayTo(panel,destination,t,delay,v){

        var offsetTween = new window.TWEEN.Tween({x: panel[""+v]});
        offsetTween.to({x: destination}, t*1000);
        offsetTween.onUpdate(function () {
            panel[""+v] = this.x;
        });

        offsetTween.onComplete(function() {
            if (v=="OffsetY") {
                if (destination!==0) {
                    panel.Open = false;
                }
            }
        });
        offsetTween.easing(window.TWEEN.Easing.Exponential.InOut);
        offsetTween.delay(delay);
        offsetTween.start(this.LastVisualTick);

        this.Tweens.push(offsetTween);
    }

    StopAllTweens() {
        if (this.Tweens.length) {
            for (var j=0; j<this.Tweens.length; j++) {
                this.Tweens[j].stop();
            }
            this.Tweens = [];
        }
    }


    //-------------------------------------------------------------------------------------------
    //  INTERACTION
    //-------------------------------------------------------------------------------------------


    OpenPanel() {
        this.Open = true;
        App.MainScene.Header.ClosePanel();
        this.DelayTo(this,1,0.3,0,"Selected");
        this.DelayTo(this.PanelOffset,0,0.5,0.1,"y");
        this.DelayTo(App.MainScene.Header,50,0.3,0,"CreateNewMargin");
    }

    ClosePanel() {
        this.Open = false;
        this.DelayTo(this,0,0.3,0,"Selected");
        this.DelayTo(this.PanelOffset,-1,0.3,0,"y");
        this.DelayTo(App.MainScene.Header,30,0.3,0,"CreateNewMargin");
    }

    ShowMessage() {
        this.PanelOffset2.y = 0;
    }

    CloseMessage() {
        this.DelayTo(this.PanelOffset2,1,0.6,0,"y");
    }

    MouseDown(point) {
        this.HitTests(point);

        // ICON //
        if (this._RollOvers[0]) {
            this.OpenPanel();
            return;
        }

        // Y | N //
        if (this.Open) {
            if (this._RollOvers[1]) {
                this.CreateNewScene();
                return;
            } else {
                this.ClosePanel();
                return;
            }
        }

        // CREATE YOUR OWN //
        if (this._RollOvers[3]) {
            this.CreateNewScene();
            App.MainScene.Tutorial.CheckLaunch();
            return;
        }
        // CLOSE MESSAGE //
        if (this._RollOvers[4]) {
            this.CloseMessage();
        }
    }

    MouseUp(point) {
    }

    MouseMove(point) {
        this.HitTests(point);
    }

    HitTests(point) {
        this.Hover = false;
        var ctx = this.Ctx;
        var units = App.Unit;
        var xOffset = this.IconOffset.x*((this.IconPos.x*units)*2);
        var yx = this.TickX*units;
        var nx = this.CrossX*units;
        var header = App.MainScene.Header;
        var height = header.Height*units;

        var panelOffset = this.PanelOffset.y * ((header.Height*2)*units);
        var panelOffset2 = this.PanelOffset2.y * (500*units);



        this._RollOvers[0] = Dimensions.HitRect(((this.IconPos.x - 20)*units) + xOffset, (this.IconPos.y - 20)*units, 40*units, 40*units, point.x, point.y); // verify
        this._RollOvers[1] = Dimensions.HitRect(yx - (20*units), (height * (header.Rows+0.5)) - (20*units) + panelOffset, 40*units, 40*units, point.x, point.y); // y
        this._RollOvers[2] = Dimensions.HitRect(nx - (20*units), (height * (header.Rows+0.5)) - (20*units) + panelOffset, 40*units, 40*units, point.x, point.y); // n
        this._RollOvers[3] = Dimensions.HitRect((App.Width*0.5) - (this.MessagePos.x*units), (App.Height - ((this.MessagePos.y+20)*units)) + panelOffset2, (this.MessagePos.x*2)*units, 40*units, point.x, point.y); // message
        this._RollOvers[4] = Dimensions.HitRect((App.Width*0.5) + (this.MessagePos.x*units), (App.Height - ((this.MessagePos.y+31)*units)) + panelOffset2, 30*units, 30*units, point.x, point.y); // close


        if (this._RollOvers[0]||this._RollOvers[1]||this._RollOvers[2]||this._RollOvers[3]||this._RollOvers[4]) {
            this.Hover = true;
        }
    }

    CreateNewScene() {
        this.BlockCount = 0;
        App.Stage.MainScene.ResetScene();
    }
}
