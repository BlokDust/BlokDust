/**
 * Created by luketwyman on 11/01/2015.
 */
import App = require("./App");
import Size = Fayde.Utils.Size;
import Grid = require("./Grid");
import IBlock = require("./Blocks/IBlock");
import BlocksSketch = require("./BlocksSketch");
import IOption = require("./IOption");
import Slider = require("./OptionSlider");
import Buttons = require("./OptionButtonSelect");

var MAX_FPS: number = 100;
var MAX_MSPF: number = 1000 / MAX_FPS;

class ParametersPanel {

    public Position: Point;
    public Size: Size;
    public Margin: number;
    public Range: number;
    private _NameWidth: number;
    private _Name: string;
    public Scale: number;
    public Sketch;
    public Options: IOption[];
    private _SliderColours: string[];
    private _Ctx: CanvasRenderingContext2D;
    private _Units: number;
    private _SliderRoll: boolean[];
    private _PanelCloseRoll: boolean;
    public SelectedBlock: IBlock;
    private _Timer: Fayde.ClockTimer;
    private _LastVisualTick: number = new Date(0).getTime();

    constructor(ctx: CanvasRenderingContext2D) {

        this._Ctx = ctx;
        this._Units = 1.7;
        this.Position = new Point(0,0);
        this.Size = new Size(1,1);
        this.Scale = 0;
        this.Margin = 0;
        this.Range = 100;
        this._Name = "";
        this._NameWidth = 0;

        this.Sketch = BlocksSketch;
        this.Options = [];
        this._SliderColours = [App.Palette[3],App.Palette[4],App.Palette[9],App.Palette[7],App.Palette[5]];
        this._SliderRoll = [];

        this._Timer = new Fayde.ClockTimer();
        this._Timer.RegisterTimer(this);

        var initJson =
        {
            "name" : "Init",
            "parameters" : [
                {
                    "type" : "slider",
                    "name" : "Gain",
                    "props" : {
                        "value" : 12,
                        "min" : 10,
                        "max" : 20,
                        "quantised" : true,
                        "centered" : false
                    }
                }
            ]

        };



        this.Populate(initJson,false);
    }

    OnTicked (lastTime: number, nowTime: number) {
        var now = new Date().getTime();
        if (now - this._LastVisualTick < MAX_MSPF) return;
        this._LastVisualTick = now;

        TWEEN.update(nowTime);
    }

    //-------------------------------------------------------------------------------------------
    //  POPULATE
    //-------------------------------------------------------------------------------------------

    Populate(json,open) {

        console.log("POPULATED PANEL");

        var units = this._Units;
        var ctx = this._Ctx;
        var dataType = units*10;


        // GET NUMBER OF SLIDERS //
        var n = json.parameters.length;


        // FIXED or ACCORDION //
        var panelH;
        /*if (n<6) {
            panelH = (40 + (48 * n)) * units;
        } else {
            panelH = 280 * units;
        }*/

        var maxHeight = 240;
        var getHeight = 0;
        var heightScale = 1;
        var optionHeight = [];
        var i;
        for (i=0;i<n;i++) {
            if (json.parameters[i].type == "slider") {
                getHeight += 48;
                optionHeight[i] = 48 * units;
            } else if (json.parameters[i].type == "buttons") {
                getHeight += 144;
                optionHeight[i] = 144 * units;
            } else {
                console.log("Option type not recognised");
            }
        }
        if (getHeight > maxHeight) {
            heightScale = (1/getHeight) * maxHeight;
            getHeight = maxHeight;
        }

        panelH = (getHeight + 40) * units;


        // TEXT MARGIN //
        var panelM = 0;
        ctx.font = "300 "+dataType+"px Dosis";
        var i;
        for (i=0;i<n;i++) {
            if (ctx.measureText(json.parameters[i].name.toUpperCase()).width > panelM) {
                panelM = ctx.measureText(json.parameters[i].name.toUpperCase()).width;
            }
        }
        panelM += (79*units);
        var panelW = 445*units;
        var panelR = panelW - (panelM + (20*units));


        // NAME //
        var name = json.name;
        var nameW = ctx.measureText(name.toUpperCase()).width;


        // POPULATE PANEL //
        this.Position.x = 250*units;
        this.Position.y = Math.round(this._Ctx.canvas.height/2);
        this.Size.Width = panelW;
        this.Size.Height = panelH;
        this.Margin = panelM;
        this.Range = panelR;
        this._Name = json.name;
        this._NameWidth = nameW;


        // POPULATE OPTIONS //
        var optionTotalY = 0;
        var optionList = [];
        for (i=0;i<n;i++) {
            var option = json.parameters[i];

            // SET HEIGHT //
            optionHeight[i] = Math.round(optionHeight[i] * heightScale); // scale heights
            var optionY = Math.round((- (this.Size.Height*0.5)) + (20*units) + optionTotalY);


            // SLIDER //
            if (option.type == "slider") {

                var range = option.props.max - option.props.min;
                var sliderO = this.Margin;
                if (option.props.centered==true) {
                    sliderO += ((this.Range/100) * 50);
                }
                var sliderX = (this.Range/range) * (option.props.value-option.props.min);
                var sliderW = (this.Range/100) * option.props.value;

                optionList.push(new Slider(new Point(sliderX,optionY),new Size(sliderW,optionHeight[i]),sliderO,false,option.props.value,option.props.min,option.props.max,option.props.quantised,option.name,option.setting));

            }

            // BUTTONS //
            else if (option.type == "buttons") {
                var value = 0;
                optionList.push(new Buttons(new Point(0,optionY),new Size(this.Range,optionHeight[i]),value,option.name,option.setting));

            }

            optionTotalY += optionHeight[i];

        }
        this.Options = optionList; // update slider array

        if (open){
            this.PanelScale(this,1,1500);
        }


    }

    //-------------------------------------------------------------------------------------------
    //  DRAWING
    //-------------------------------------------------------------------------------------------

    Draw() {

        var units = this._Units;
        var ctx = this._Ctx;
        var dataType = Math.round(units*10);
        var headerType = Math.round(units*33);

        // START A TRANSFORM HERE //
        ctx.setTransform(this.Scale, 0, 0, this.Scale, this.Position.x, this.Position.y);
//
        var sx = 0;
        var sy = 0;


        // PANEL //
        ctx.fillStyle = "#000";
        ctx.font = "400 " + dataType + "px Dosis";
        ctx.textAlign = "right";


        // DRAW PANEL //
        ctx.globalAlpha = 0.16;
        this.panelDraw(sx, sy + (5 * units));
        ctx.globalAlpha = 0.8;
        this.panelDraw(sx, sy);


        // DOTTED LINE //
        ctx.globalAlpha = 1;


        // CLOSE X //
        ctx.strokeStyle = App.Palette[8];// WHITE
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sx + this.Size.Width - (24 * units), sy - (this.Size.Height * 0.5) + (4 * units));
        ctx.lineTo(sx + this.Size.Width - (16 * units), sy - (this.Size.Height * 0.5) - (4 * units));
        ctx.moveTo(sx + this.Size.Width - (24 * units), sy - (this.Size.Height * 0.5) - (4 * units));
        ctx.lineTo(sx + this.Size.Width - (16 * units), sy - (this.Size.Height * 0.5) + (4 * units));
        ctx.stroke();
        ctx.lineWidth = 1;


        // TITLE //
        ctx.fillStyle = App.Palette[8];// WHITE
        ctx.textAlign = "left";
        ctx.fillText(this._Name.toUpperCase(), this.Margin, (-this.Size.Height * 0.5));


        // DRAW OPTIONS //
        var i;
        for (i = 0; i < this.Options.length; i++) {

            ctx.setTransform(this.Scale, 0, 0, this.Scale, this.Position.x, this.Position.y);

            // DRAW SLIDER //
            if (this.Options[i].Type=="slider") {
                this.sliderDraw(ctx,units,i,this.Options[i].Position.x,this.Options[i].Position.y,this.Options[i].Size.Height,this.Options[i].Origin);
            }

            // DRAW BUTTONS //
            else if (this.Options[i].Type == "buttons") {
                this.buttonsDraw(ctx,units,i,this.Options[i].Position.x,this.Options[i].Position.y,this.Options[i].Size.Height);
            }

            ctx.setTransform(1, 0, 0, 1, 0, 0);

        }
    }


    panelDraw(x,y) {

        var units = this._Units;
        var ctx = this._Ctx;

        ctx.beginPath();
        ctx.moveTo(x + (44*units), y - (this.Size.Height*0.5)); // tl

        ctx.lineTo(x + this.Margin - (25*units), y - (this.Size.Height*0.5)); // name tab start
        ctx.lineTo(x + this.Margin - (5*units), y - (this.Size.Height*0.5) - (20*units));
        ctx.lineTo(x + this.Margin + (5*units) + this._NameWidth, y - (this.Size.Height*0.5) - (20*units));
        ctx.lineTo(x + this.Margin + (25*units) + this._NameWidth, y - (this.Size.Height*0.5)); // name tab end

        ctx.lineTo(x + this.Size.Width - (40*units), y - (this.Size.Height*0.5)); // close start
        ctx.lineTo(x + this.Size.Width - (20*units), y - (this.Size.Height*0.5) - (20*units));
        ctx.lineTo(x + this.Size.Width, y - (this.Size.Height*0.5)); // tr
        ctx.lineTo(x + this.Size.Width, y + (this.Size.Height*0.5)); // br
        ctx.lineTo(x + (44*units), y + (this.Size.Height*0.5)); // bl
        ctx.lineTo(x + (44*units), y + (44*units));
        ctx.lineTo(x, y); // block
        ctx.lineTo(x + (44*units), y);
        ctx.closePath();
        ctx.fill();
    }



    sliderDraw(ctx,units,i,x,y,height,origin) {

        var dataType = Math.round(units*10);
        var headerType = Math.round(units*33);

        // DIVIDERS //
        ctx.fillStyle = ctx.strokeStyle = "#393d43";
        if (i !== (this.Options.length - 1)) {
            ctx.beginPath();
            ctx.moveTo(this.Margin - units, y + height);
            ctx.lineTo(this.Range + this.Margin + units, y + height);
            ctx.closePath();
            ctx.stroke();
        }


        // MID POINT //
        ctx.beginPath();
        ctx.moveTo((this.Range * 0.5) + this.Margin - (2 * units), y + (height * 0.5));
        ctx.lineTo((this.Range * 0.5) + this.Margin, y + (height * 0.5) - (2 * units));
        ctx.lineTo((this.Range * 0.5) + this.Margin + (2 * units), y + (height * 0.5));
        ctx.lineTo((this.Range * 0.5) + this.Margin, y + (height * 0.5) + (2 * units));
        ctx.closePath();
        ctx.fill();


        // BAR //
        ctx.fillStyle = ctx.strokeStyle = "#282b31";
        if (origin !== this.Margin) {
            this.diagonalFill(this.Margin - units, y + units, this.Range + (2 * units), height - (2 * units), 9);
        }
        var offset = 0;
        if (origin == this.Margin) {
            offset = -units;
        }
        ctx.globalAlpha = 1;
        var col = this._SliderColours[i - (Math.floor(i/this._SliderColours.length)*(this._SliderColours.length))];
        ctx.fillStyle = ctx.strokeStyle = col;
        ctx.beginPath();
        ctx.moveTo(origin + offset, y);
        ctx.lineTo(x + this.Margin, y);
        ctx.lineTo(x + this.Margin, y + height);
        ctx.lineTo(origin + offset, y + height);
        ctx.closePath();
        ctx.fill();


        // LINE //
        ctx.fillRect(x + this.Margin - (units), y, 2 * units, height);


        // GRAB TRIANGLES //
        var dragWidth = height * 0.2;
        ctx.beginPath();
        ctx.moveTo(x + this.Margin - dragWidth, y + (height * 0.5));
        ctx.lineTo(x + this.Margin, y + (height * 0.5) - dragWidth);
        ctx.lineTo(x + this.Margin + dragWidth, y + (height * 0.5));
        ctx.lineTo(x + this.Margin, y + (height * 0.5) + dragWidth);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = App.Palette[8];// WHITE
        ctx.beginPath();
        ctx.moveTo(x + this.Margin - dragWidth, y + (height * 0.5));
        ctx.lineTo(x + this.Margin, y + (height * 0.5) - dragWidth);
        ctx.lineTo(x + this.Margin + (dragWidth * 0.5), y + (height * 0.5) - (dragWidth * 0.5));
        ctx.lineTo(x + this.Margin - (dragWidth * 0.5), y + (height * 0.5) + (dragWidth * 0.5));
        ctx.closePath();
        ctx.fill();


        // PARAM NAME //
        ctx.font = "400 " + dataType + "px Dosis";
        ctx.textAlign = "right";
        ctx.fillText(this.Options[i].Name.toUpperCase(), this.Margin - (15 * units), y + (height * 0.5) + (dataType * 0.4));


        // VALUE TOOLTIP //
        if (this.Options[i].Selected) {
            ctx.textAlign = "left";
            ctx.font = "200 " + headerType + "px Dosis";
            var string = this.NumberWithCommas("" + (Math.round(this.Options[i].Value * 100) / 100));
            ctx.fillText(string, x + this.Margin + (25 * units), y + (height * 0.5) + (headerType * 0.35));
        }
    }




    buttonsDraw(ctx,units,i,x,y,height) {

        var dataType = Math.round(units*10);
        var headerType = Math.round(units*33);

        // DIVIDERS //
        ctx.fillStyle = ctx.strokeStyle = "#393d43";
        if (i !== (this.Options.length - 1)) {
            ctx.beginPath();
            ctx.moveTo(this.Margin - units, y + height);
            ctx.lineTo(this.Range + this.Margin + units, y + height);
            ctx.closePath();
            ctx.stroke();
        }

        // PARAM NAME //
        ctx.fillStyle = App.Palette[8];// WHITE
        ctx.font = "400 " + dataType + "px Dosis";
        ctx.textAlign = "right";
        ctx.fillText(this.Options[i].Name.toUpperCase(), this.Margin - (15 * units), y + (height * 0.5) + (dataType * 0.4));

    }




    diagonalFill(x,y,w,h,s) {
        var ctx = this._Ctx;
        var lineNo = Math.round((w+h) / s);
        var pos1 = new Point(0,0);
        var pos2 = new Point(0,0);

        ctx.beginPath();
        var j;
        for (j=0;j<lineNo;j++) {

            pos1.x = (s * 0.5) + (s * j);
            pos1.y = 0;
            pos2.x = pos1.x - h;
            pos2.y = h;

            if (pos2.x<0) {
                pos2.y = h + pos2.x;
                pos2.x = 0;
            }

            if (pos1.x>w) {
                pos1.y = (pos1.x-w);
                pos1.x = w;
            }

            ctx.moveTo(x + pos1.x, y + pos1.y);
            ctx.lineTo(x + pos2.x, y + pos2.y);
        }
        ctx.stroke();

    }

    NumberWithCommas(x) {
        return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    //-------------------------------------------------------------------------------------------
    //  TWEEN
    //-------------------------------------------------------------------------------------------


    PanelScale(panel,destination,t) {

        var psTween = new TWEEN.Tween({x:panel.Scale})
            .to( {x: destination}, t)
            .easing(TWEEN.Easing.Quintic.InOut)
            .onUpdate((obj) => {
                panel.Scale = obj;
            });

        psTween.start(this._LastVisualTick);
    }

    //-------------------------------------------------------------------------------------------
    //  INTERACTION
    //-------------------------------------------------------------------------------------------


    MouseDown(mx,my) {

        this.RolloverCheck(mx,my);
        var i;
        for (i=0;i<this.Options.length;i++) {

            if (this._SliderRoll[i]) {
                this.Options[i].Selected = true;
                this.SliderSet(i,mx);
            }

        }

        if (this._PanelCloseRoll) {
            this.PanelScale(this,0,1500);
        }

    }

    MouseUp() {
        var i;
        for (i=0;i<this.Options.length;i++) {
            this.Options[i].Selected = false;
        }

    }



    MouseMove(mx,my) {

        this.RolloverCheck(mx,my);
        var i;
        for (i=0;i<this.Options.length;i++) {
            if (this.Options[i].Type=="slider") {
                if (this.Options[i].Selected) {
                    this.SliderSet(i, mx);
                }
            }
        }
    }

    SliderSet(n,mx) {

        // SLIDER POSITION //
        var mPos = mx - (this.Position.x + this.Margin);
        this.Options[n].Position.x = mPos;

        // FLOOR //
        if (this.Options[n].Position.x < 0) {
            this.Options[n].Position.x = 0;
        }
        // CEILING //
        if (this.Options[n].Position.x > this.Range) {
            this.Options[n].Position.x = this.Range;
        }

        // CALCULATE VALUE //
        var range = this.Options[n].Max - this.Options[n].Min;
        var perc = (this.Options[n].Position.x/this.Range) * 100;
            this.Options[n].Value = ((range/100)*perc) + this.Options[n].Min;

        // QUANTIZE //
        if (this.Options[n].Quantised) {
            this.Options[n].Value = Math.round(this.Options[n].Value);
            this.Options[n].Position.x = (this.Range/range)*(this.Options[n].Value-this.Options[n].Min);
        }

        // SET VALUE IN BLOCK //
        this.SelectedBlock.SetValue(this.Options[n].Setting,this.Options[n].Value);

    }

    RolloverCheck(mx,my) {
        var i;
        for (i=0;i<this.Options.length;i++) {
            if (this.Options[i].Type == "slider") {
                this._SliderRoll[i] = this.HudCheck(this.Position.x + this.Margin - (10*this._Units),this.Position.y + this.Options[i].Position.y,this.Range + (20*this._Units),this.Options[i].Size.Height,mx,my);
            }
        }

        if (this.Scale==1) {
            this._PanelCloseRoll = this.HudCheck(this.Position.x + this.Size.Width - (30*this._Units),this.Position.y - (this.Size.Height*0.5) - (10*this._Units),20*this._Units,20*this._Units,mx,my);
        }

    }

    HudCheck(x,y,w,h,mx,my) { // IS CURSOR WITHIN GIVEN BOUNDARIES

        return (mx>x && mx<(x+w) && my>y && my<(y+h));

    }

}

export = ParametersPanel;