/**
 * Created by luketwyman on 11/01/2015.
 */
import App = require("./App");
import Size = Fayde.Utils.Size;
import Grid = require("./Grid");
import IBlock = require("./Blocks/IBlock");
import BlocksSketch = require("./BlocksSketch");
import Slider = require("./Slider");

class ParametersPanel {

    public Position: Point;
    public Size: Size;
    public Margin: number;
    public Range: number;
    private _NameWidth: number;
    private _Name: string;
    public Scale: number;
    public Sketch;
    public Sliders: Slider[];
    private _SliderColours: string[];
    private _Ctx: CanvasRenderingContext2D;
    private _Units: number;
    private _SliderRoll: boolean[];
    private _PanelCloseRoll: boolean;
    public SelectedBlock: IBlock;

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
        this.Sliders = [];
        this._SliderColours = [App.Palette[3],App.Palette[4],App.Palette[9],App.Palette[7],App.Palette[5]];
        this._SliderRoll = [];




        var initJson =
        {
            "name" : "Init",
            "parameters" : [
                {
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
        if (n<6) {
            panelH = (40 + (48 * n)) * units;
        } else {
            panelH = 280 * units;
        }


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


        // POPULATE SLIDERS //
        var sliderH = Math.round((panelH - (40*units)) / n);
        var sliderList = [];
        for (i=0;i<n;i++) {
            var range = json.parameters[i].props.max - json.parameters[i].props.min;
            var sliderO = this.Margin;
            if (json.parameters[i].props.centered==true) {
                sliderO += ((this.Range/100) * 50);
            }
            var sliderX = (this.Range/range) * (json.parameters[i].props.value-json.parameters[i].props.min);
            var sliderW = (this.Range/100) * json.parameters[i].props.value;
            var sliderY = Math.round((- (this.Size.Height*0.5)) + (20*units) + (i*sliderH));
            sliderList.push(new Slider(new Point(sliderX,sliderY),new Size(sliderW,sliderH),sliderO,false,json.parameters[i].props.value,json.parameters[i].props.min,json.parameters[i].props.max,json.parameters[i].props.quantised,json.parameters[i].name,json.parameters[i].setting));
        }
        this.Sliders = sliderList; // update slider array

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


        // DRAW SLIDERS //
        var i;
        for (i = 0; i < this.Sliders.length; i++) {

            var sliderX = this.Sliders[i].Position.x;
            var sliderY = this.Sliders[i].Position.y;
            var sliderH = this.Sliders[i].Size.Height;
            var sliderO = this.Sliders[i].Origin;

            ctx.setTransform(this.Scale, 0, 0, this.Scale, this.Position.x, this.Position.y);


            // DIVIDERS //
            ctx.fillStyle = ctx.strokeStyle = "#393d43";
            if (i !== (this.Sliders.length - 1)) {
                ctx.beginPath();
                ctx.moveTo(this.Margin - units, sliderY + sliderH);
                ctx.lineTo(this.Range + this.Margin + units, sliderY + sliderH);
                ctx.closePath();
                ctx.stroke();
            }


            // MID POINT //
            ctx.beginPath();
            ctx.moveTo((this.Range * 0.5) + this.Margin - (2 * units), sliderY + (sliderH * 0.5));
            ctx.lineTo((this.Range * 0.5) + this.Margin, sliderY + (sliderH * 0.5) - (2 * units));
            ctx.lineTo((this.Range * 0.5) + this.Margin + (2 * units), sliderY + (sliderH * 0.5));
            ctx.lineTo((this.Range * 0.5) + this.Margin, sliderY + (sliderH * 0.5) + (2 * units));
            ctx.closePath();
            ctx.fill();


            // BAR //
            ctx.fillStyle = ctx.strokeStyle = "#282b31";
            if (sliderO !== this.Margin) {
                this.diagonalFill(this.Margin - units, sliderY + units, this.Range + (2 * units), sliderH - (2 * units), 9);
            }
            var offset = 0;
            if (sliderO == this.Margin) {
                offset = -units;
            }
            ctx.globalAlpha = 1;
            var col = this._SliderColours[i - (Math.floor(i/this._SliderColours.length)*(this._SliderColours.length))];
            ctx.fillStyle = ctx.strokeStyle = col;
            ctx.beginPath();
            ctx.moveTo(sliderO + offset, sliderY);
            ctx.lineTo(sliderX + this.Margin, sliderY);
            ctx.lineTo(sliderX + this.Margin, sliderY + sliderH);
            ctx.lineTo(sliderO + offset, sliderY + sliderH);
            ctx.closePath();
            ctx.fill();


            // LINE //
            ctx.fillRect(sliderX + this.Margin - (units), sliderY, 2 * units, sliderH);


            // GRAB TRIANGLES //
            var dragWidth = this.Sliders[i].Size.Height * 0.2;
            ctx.beginPath();
            ctx.moveTo(sliderX + this.Margin - dragWidth, sliderY + (sliderH * 0.5));
            ctx.lineTo(sliderX + this.Margin, sliderY + (sliderH * 0.5) - dragWidth);
            ctx.lineTo(sliderX + this.Margin + dragWidth, sliderY + (sliderH * 0.5));
            ctx.lineTo(sliderX + this.Margin, sliderY + (sliderH * 0.5) + dragWidth);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = App.Palette[8];// WHITE
            ctx.beginPath();
            ctx.moveTo(sliderX + this.Margin - dragWidth, sliderY + (sliderH * 0.5));
            ctx.lineTo(sliderX + this.Margin, sliderY + (sliderH * 0.5) - dragWidth);
            ctx.lineTo(sliderX + this.Margin + (dragWidth * 0.5), sliderY + (sliderH * 0.5) - (dragWidth * 0.5));
            ctx.lineTo(sliderX + this.Margin - (dragWidth * 0.5), sliderY + (sliderH * 0.5) + (dragWidth * 0.5));
            ctx.closePath();
            ctx.fill();


            // PARAM NAME //
            ctx.font = "400 " + dataType + "px Dosis";
            ctx.textAlign = "right";
            ctx.fillText(this.Sliders[i].Name.toUpperCase(), this.Margin - (15 * units), sliderY + (sliderH * 0.5) + (dataType * 0.4));


            // VALUE TOOLTIP //
            if (this.Sliders[i].Selected) {
                ctx.textAlign = "left";
                ctx.font = "200 " + headerType + "px Dosis";
                var string = this.NumberWithCommas("" + (Math.round(this.Sliders[i].Value * 100) / 100));
                ctx.fillText(string, sliderX + this.Margin + (25 * units), sliderY + (sliderH * 0.5) + (headerType * 0.35));
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

        var psTween = new TWEEN.Tween({x:panel.Scale});
        psTween.to({ x: destination }, t);
        psTween.onUpdate(function() {
            panel.Scale = this.x;
        });
        psTween.start();
        psTween.easing( TWEEN.Easing.Quintic.InOut );
        TWEEN.add(psTween);
    }

    //-------------------------------------------------------------------------------------------
    //  INTERACTION
    //-------------------------------------------------------------------------------------------


    MouseDown(mx,my) {

        this.RolloverCheck(mx,my);
        var i;
        for (i=0;i<this.Sliders.length;i++) {

            if (this._SliderRoll[i]) {
                this.Sliders[i].Selected = true;
                this.SliderSet(i,mx);
            }

        }

        if (this._PanelCloseRoll) {
            this.PanelScale(this,0,1500);
        }

    }

    MouseUp() {
        var i;
        for (i=0;i<this.Sliders.length;i++) {
            this.Sliders[i].Selected = false;
        }

    }



    MouseMove(mx,my) {

        this.RolloverCheck(mx,my);
        var i;
        for (i=0;i<this.Sliders.length;i++) {
            if (this.Sliders[i].Selected) {
                this.SliderSet(i,mx);
            }
        }
    }

    SliderSet(n,mx) {

        // SLIDER POSITION //
        var mPos = mx - (this.Position.x + this.Margin);
        this.Sliders[n].Position.x = mPos;

        // FLOOR //
        if (this.Sliders[n].Position.x < 0) {
            this.Sliders[n].Position.x = 0;
        }
        // CEILING //
        if (this.Sliders[n].Position.x > this.Range) {
            this.Sliders[n].Position.x = this.Range;
        }

        // CALCULATE VALUE //
        var range = this.Sliders[n].Max - this.Sliders[n].Min;
        var perc = (this.Sliders[n].Position.x/this.Range) * 100;
            this.Sliders[n].Value = ((range/100)*perc) + this.Sliders[n].Min;

        // QUANTIZE //
        if (this.Sliders[n].Quantised) {
            this.Sliders[n].Value = Math.round(this.Sliders[n].Value);
            this.Sliders[n].Position.x = (this.Range/range)*(this.Sliders[n].Value-this.Sliders[n].Min);
        }

        // SET VALUE IN BLOCK //
        this.SelectedBlock.SetValue(this.Sliders[n].Setting,this.Sliders[n].Value);

    }

    RolloverCheck(mx,my) {
        var i;
        for (i=0;i<this.Sliders.length;i++) {
            this._SliderRoll[i] = this.HudCheck(this.Position.x + this.Margin - (10*this._Units),this.Position.y + this.Sliders[i].Position.y,this.Range + (20*this._Units),this.Sliders[i].Size.Height,mx,my);
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