/**
 * Created by luketwyman on 11/01/2015.
 */
import App = require("./App");
import Size = Fayde.Utils.Size;
import Grid = require("./Grid");
import IBlock = require("./Blocks/IBlock");
import BlocksSketch = require("./BlocksSketch");
import Option = require("./Option");
import IOptionSlider = require("./IOptionSlider");
import Slider = require("./OptionSlider");
import Buttons = require("./OptionButtonSelect");
import ADSR = require("./OptionADSR");
import OptionHandle = require("./OptionHandle");

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
    public Options: Option[];
    private _SliderColours: string[];
    private _Ctx: CanvasRenderingContext2D;
    private _Units: number;
    private _SliderRoll: boolean[];
    private _PanelCloseRoll: boolean;
    public SelectedBlock: IBlock;
    public InitJson;
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



        this.InitJson =
        {
            "name" : "Init",
            "parameters" : [
            ]
        };


        this.Populate(this.InitJson,false);
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
        var maxHeight = 240;
        var getHeight = 0;
        var heightScale = 1;
        var optionHeight = [];
        for (var i=0;i<n;i++) {
            if (json.parameters[i].type == "slider") {
                getHeight += 48;
                optionHeight[i] = 48 * units;
            } else if (json.parameters[i].type == "buttons") {
                getHeight += 144;
                optionHeight[i] = 144 * units;
            } else if (json.parameters[i].type == "ADSR") {
                getHeight += 120;
                optionHeight[i] = 120 * units;
            }else {
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

        if (n==1 && json.parameters[0].type=="ADSR") { // NO MARGIN FOR STANDALONE ENVELOPE
            panelM = (69*units);
        } else {
            for (var i=0;i<n;i++) {
                if (ctx.measureText(json.parameters[i].name.toUpperCase()).width > panelM) {
                    panelM = ctx.measureText(json.parameters[i].name.toUpperCase()).width;
                }
            }
            panelM += (79*units);
        }



        var panelW = 450*units;
        var panelR = panelW - (panelM + (25*units));


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
        for (var i=0;i<n;i++) {
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

            // ENVELOPE //
            else if (option.type == "ADSR") {

                /*var nodes = [];


                for (var j=0;j<4;j++) {

                    var range = option.nodes[j].max - option.nodes[j].min;
                    var perc = ((this.Range*0.25)/range) * (option.nodes[j].value-option.nodes[j].min);
                    if (j==2) { // SUSTAIN (has different range) //
                        perc = ((optionHeight[i]*0.8)/range) * (option.nodes[j].value-option.nodes[j].min);
                    }
                    if (j==3) { // RELEASE (has different range) //
                        //perc = ((this.Range*0.5)/range) * (option.nodes[j].value-option.nodes[j].min);
                        var logRange = Math.log(option.nodes[j].max+1000) - Math.log(option.nodes[j].min+1000);
                        var scale = logRange / (this.Range*0.5);
                        perc = (Math.log(option.nodes[j].value+1000) - option.nodes[j].min) / scale;
                        //perc = (Math.log(option.nodes[j].value)-option.nodes[j].min) / ((this.Range*0.5)/range);
                        console.log("perc: "+perc);

                    }


                    nodes[j] = { value:option.nodes[j].value , min:option.nodes[j].min, max:option.nodes[j].max, perc: perc};
                }*/

                var Xrange, handleX, Yrange, handleY;
                var handles = [];


                Xrange = option.nodes[0].max - option.nodes[0].min;
                handleX = ( (this.Range*0.28) / Xrange ) * (option.nodes[0].value-option.nodes[0].min);
                Yrange = option.nodes[2].max - option.nodes[2].min;
                handleY = ( (optionHeight[i]*0.8) / Yrange ) * (option.nodes[2].value-option.nodes[2].min);

                handles[0] = new OptionHandle(new Point(handleX,handleY),option.nodes[0].value,option.nodes[0].min,option.nodes[0].max,this.Range*0.28,0,0,0,0,option.nodes[0].setting,"");

                Xrange = option.nodes[1].max - option.nodes[1].min;
                handleX = ( (this.Range*0.28) / Xrange ) * (option.nodes[1].value-option.nodes[1].min);
                Yrange = option.nodes[2].max - option.nodes[2].min;
                handleY = ( (optionHeight[i]*0.8) / Yrange ) * (option.nodes[2].value-option.nodes[2].min);

                handles[1] = new OptionHandle(new Point(handleX,handleY),option.nodes[1].value,option.nodes[1].min,option.nodes[1].max,this.Range*0.28,option.nodes[2].value,option.nodes[2].min,option.nodes[2].max,(optionHeight[i]*0.8),option.nodes[1].setting,option.nodes[2].setting);

                Xrange = option.nodes[3].max - option.nodes[3].min;
                handleX = ( (this.Range*0.4) / Xrange ) * (option.nodes[3].value-option.nodes[3].min);
                Yrange = option.nodes[2].max - option.nodes[2].min;
                handleY = ( (optionHeight[i]*0.8) / Yrange ) * (option.nodes[2].value-option.nodes[2].min);

                handles[2] = new OptionHandle(new Point(handleX,handleY),option.nodes[3].value,option.nodes[3].min,option.nodes[3].max,this.Range*0.4,0,0,0,0,option.nodes[3].setting,"");



                optionList.push(new ADSR(new Point(0,optionY),new Size(this.Range,optionHeight[i]),option.name,handles[0],handles[1],handles[2]));


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
        for (var i = 0; i < this.Options.length; i++) {

            ctx.setTransform(this.Scale, 0, 0, this.Scale, this.Position.x, this.Position.y);

            // DRAW SLIDER //
            if (this.Options[i].Type=="slider") {
                this.sliderDraw(ctx,units,i,this.Options[i].Position.x,this.Options[i].Position.y,this.Options[i].Size.Height,this.Options[i].Origin);
            }

            // DRAW BUTTONS //
            else if (this.Options[i].Type == "buttons") {
                this.buttonsDraw(ctx,units,i,this.Options[i].Position.x,this.Options[i].Position.y,this.Options[i].Size.Height);
            }

            // DRAW ENVELOPE //
            else if (this.Options[i].Type == "ADSR") {
                this.ADSRDraw(ctx,units,this.Options[i],this.Options[i].Position.x,this.Options[i].Position.y,this.Options[i].Size.Height,this.Options[i].Handles[0].Position.x,this.Options[i].Handles[1].Position.x,this.Options[i].Handles[1].Position.y,this.Options[i].Handles[2].Position.x);
            }



            ctx.setTransform(1, 0, 0, 1, 0, 0);

        }

        ctx.setTransform(1, 0, 0, 1, 0, 0);
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
        ctx.globalAlpha = 1;
        ctx.fillStyle = ctx.strokeStyle = "#393d43";
        if (i !== (this.Options.length - 1)) {
            ctx.beginPath();
            ctx.moveTo(this.Margin - units, y + height);
            ctx.lineTo(this.Range + this.Margin + units, y + height);
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


    ADSRDraw(ctx,units,option,x,y,height,a,d,s,r) {
        ctx.globalAlpha = 1;

        var headerType = Math.round(units*33);

        var curved = false;
        var vert = 0.6;


        // MARKERS //
        ctx.fillStyle = ctx.strokeStyle = "#393d43";
        ctx.beginPath();
        ctx.moveTo(this.Margin - units, y + (height*0.1));
        ctx.lineTo(this.Margin - units, y + (height*0.9));

        ctx.moveTo((this.Range*vert) + this.Margin + units, y + (height*0.1));
        ctx.lineTo((this.Range*vert) + this.Margin + units, y + (height*0.9));

        ctx.moveTo(this.Range + this.Margin + units, y + (height*0.1));
        ctx.lineTo(this.Range + this.Margin + units, y + (height*0.9));
        ctx.stroke();


        // ENVELOPE LINE //

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(this.Margin, y + (height*0.9));
        ctx.lineTo(this.Margin + a, y + (height*0.1)); // ATTACK
        if (curved) {
            ctx.bezierCurveTo(this.Margin + a, y + (height*0.1) + (((height*0.8) - s) *0),this.Margin + a + (d*0.5),y + (height*0.9) - s, this.Margin + a + d, y + (height*0.9) - s ); // DECAY

        } else {
            ctx.lineTo(this.Margin + a + d, y + (height*0.9) - s); // DECAY
        }
        ctx.lineTo(this.Margin + (this.Range*vert), y + (height*0.9) - s); // SUSTAIN
        if (curved) {
            ctx.bezierCurveTo(this.Margin + (this.Range * vert), y + (height * 0.9) - s, this.Margin + (this.Range * 0.5) + (r * 0.5), y + (height * 0.9), this.Margin + (this.Range * 0.5) + r, y + (height * 0.9)); // RELEASE
        } else {
            ctx.lineTo(this.Margin + (this.Range*vert) + r, y + (height*0.9)); // RELEASE
        }
        ctx.lineTo(this.Range + this.Margin + units, y + (height*0.9));
        ctx.closePath();
        ctx.clip();
        ctx.fillStyle = ctx.strokeStyle = "#282b31";
        this.diagonalFill(this.Margin - units, y + units, this.Range + (2 * units), height - (2 * units), 9);
        ctx.restore();


        /*ctx.globalAlpha = 0.2;
        ctx.fillStyle = App.Palette[5];
        ctx.beginPath();
        ctx.moveTo(this.Margin, y + (height*0.9));
        ctx.lineTo(this.Margin + a, y + (height*0.1)); // ATTACK
        ctx.lineTo(this.Margin + a + d, y + (height*0.9) - s); // DECAY
        ctx.lineTo(this.Margin + (this.Range*0.5), y + (height*0.9) - s); // SUSTAIN
        ctx.lineTo(this.Margin + (this.Range*0.5) + r, y + (height*0.9)); // RELEASE
        ctx.lineTo(this.Range + this.Margin + units, y + (height*0.9));
        ctx.closePath();
        ctx.fill();*/


        ctx.lineWidth = 2;
        ctx.globalAlpha = 1;
        ctx.strokeStyle = App.Palette[8];
        ctx.beginPath();
        ctx.moveTo(this.Margin, y + (height*0.9));
        ctx.lineTo(this.Margin + a, y + (height*0.1)); // ATTACK
        if (curved) {
            ctx.bezierCurveTo(this.Margin + a, y + (height*0.1) + (((height*0.8) - s) *0),this.Margin + a + (d*0.5),y + (height*0.9) - s, this.Margin + a + d, y + (height*0.9) - s ); // DECAY

        } else {
            ctx.lineTo(this.Margin + a + d, y + (height*0.9) - s); // DECAY
        }
        ctx.lineTo(this.Margin + (this.Range*vert), y + (height*0.9) - s); // SUSTAIN
        if (curved) {
            ctx.bezierCurveTo(this.Margin + (this.Range * vert), y + (height * 0.9) - s, this.Margin + (this.Range * vert) + (r * 0.5), y + (height * 0.9), this.Margin + (this.Range * vert) + r, y + (height * 0.9)); // RELEASE
        } else {
            ctx.lineTo(this.Margin + (this.Range*vert) + r, y + (height*0.9)); // RELEASE
        }
        ctx.lineTo(this.Range + this.Margin + units, y + (height*0.9));
        ctx.stroke();
        ctx.lineWidth = 1;

        // GRAB DIAMONDS //
        var dragWidth = height * 0.06;

        ctx.fillStyle = App.Palette[3];
        ctx.beginPath();
        ctx.moveTo(a + this.Margin - dragWidth, y + (height * 0.1));
        ctx.lineTo(a + this.Margin, y + (height * 0.1) - dragWidth);
        ctx.lineTo(a + this.Margin + dragWidth, y + (height * 0.1));
        ctx.lineTo(a + this.Margin, y + (height * 0.1) + dragWidth);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = App.Palette[4];
        ctx.beginPath();
        ctx.moveTo(a + d + this.Margin - dragWidth, y + (height * 0.9) - s);
        ctx.lineTo(a + d + this.Margin, y + (height * 0.9) - dragWidth - s);
        ctx.lineTo(a + d + this.Margin + dragWidth, y + (height * 0.9) - s);
        ctx.lineTo(a + d + this.Margin, y + (height * 0.9) + dragWidth - s);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = App.Palette[5];
        ctx.beginPath();
        ctx.moveTo((this.Range*vert) + r + this.Margin - dragWidth, y + (height * 0.9));
        ctx.lineTo((this.Range*vert) + r + this.Margin, y + (height * 0.9) - dragWidth);
        ctx.lineTo((this.Range*vert) + r + this.Margin + dragWidth, y + (height * 0.9));
        ctx.lineTo((this.Range*vert) + r + this.Margin, y + (height * 0.9) + dragWidth);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = App.Palette[8];
        ctx.beginPath();
        ctx.moveTo(a + this.Margin - dragWidth, y + (height * 0.1));
        ctx.lineTo(a + this.Margin, y + (height * 0.1) - dragWidth);
        ctx.lineTo(a + this.Margin + (dragWidth * 0.5), y + (height * 0.1) - (dragWidth * 0.5));
        ctx.lineTo(a + this.Margin - (dragWidth * 0.5), y + (height * 0.1) + (dragWidth * 0.5));
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(a + d + this.Margin - dragWidth, y + (height * 0.9) - s);
        ctx.lineTo(a + d + this.Margin, y + (height * 0.9) - dragWidth - s);
        ctx.lineTo(a + d + this.Margin + (dragWidth * 0.5), y + (height * 0.9) - s - (dragWidth * 0.5));
        ctx.lineTo(a + d + this.Margin - (dragWidth * 0.5), y + (height * 0.9) - s + (dragWidth * 0.5));
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo((this.Range*vert) + r + this.Margin - dragWidth, y + (height * 0.9));
        ctx.lineTo((this.Range*vert) + r + this.Margin, y + (height * 0.9) - dragWidth);
        ctx.lineTo((this.Range*vert) + r + this.Margin + (dragWidth * 0.5), y + (height * 0.9) - (dragWidth * 0.5));
        ctx.lineTo((this.Range*vert) + r + this.Margin - (dragWidth * 0.5), y + (height * 0.9) + (dragWidth * 0.5));
        ctx.closePath();
        ctx.fill();



        /*ctx.textAlign = "left";
        ctx.font = "200 " + headerType + "px Dosis";

        var logRange = Math.log(option.EMax[3]) - Math.log(option.EMin[3]);
        var scale = logRange / (this.Range*0.5);

        var pos = Math.round(( 100 / (this.Range*0.5) ) * option.EPerc[3]);
        var math = Math.exp( pos * scale + (option.EMin[3]) );
        math = option.Handles[2].XValue;
        var string = this.NumberWithCommas("" + math );

        ctx.fillText(string, (this.Range*0.5) + r + this.Margin + (25 * units), y + (height * 0.5) + (headerType * 0.35));*/
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
        for (var j=0;j<lineNo;j++) {

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
            console.log(this.x);
        });

        psTween.easing( TWEEN.Easing.Quintic.InOut );
        psTween.start();



    }

    //-------------------------------------------------------------------------------------------
    //  INTERACTION
    //-------------------------------------------------------------------------------------------


    MouseDown(mx,my) {

        this.RolloverCheck(mx,my);
        for (var i=0;i<this.Options.length;i++) {

            if (this._SliderRoll[i]) {
                this.Options[i].Selected = true;
                this.SliderSet(i,mx);
            }
            if (this.Options[i].Type=="ADSR") {
                var xStart = [0, this.Options[i].Handles[0].Position.x,this.Range*0.6];
                for (var j=0;j<this.Options[i].Handles.length;j++) {
                    if (this.Options[i].HandleRoll[j]) {
                        this.Options[i].Handles[j].Selected = true;
                        this.HandleSet(i, j, xStart[j],mx, my);
                    }
                }
            }

        }

        if (this._PanelCloseRoll) {
            this.PanelScale(this,0,1500);
        }

    }

    MouseUp() {
        for (var i=0;i<this.Options.length;i++) {
            this.Options[i].Selected = false;
            if (this.Options[i].Type=="ADSR") {
                for (var j=0;j<this.Options[i].Handles.length;j++) {
                    this.Options[i].Handles[j].Selected = false;
                }
            }
        }

    }



    MouseMove(mx,my) {

        this.RolloverCheck(mx,my);
        for (var i=0;i<this.Options.length;i++) {
            if (this.Options[i].Type=="slider") {
                if (this.Options[i].Selected) {
                    this.SliderSet(i, mx);
                }
            }
            if (this.Options[i].Type=="ADSR") {
                var xStart = [0, this.Options[i].Handles[0].Position.x,this.Range*0.6];
                for (var j=0;j<this.Options[i].Handles.length;j++) {
                    if (this.Options[i].HandleRoll[j]) {
                        console.log("HandleRoll " + j );
                    }
                    if (this.Options[i].Handles[j].Selected) {
                        this.HandleSet(i, j, xStart[j], mx, my);

                    }
                }
            }
        }
    }

    HandleSet(n,h,xStart,mx,my) {
        var mPosX = mx - (this.Position.x + this.Margin + xStart);
        var mPosY = my - (this.Position.y + this.Options[n].Position.y + (this.Options[n].Size.Height*0.9));

        this.Options[n].Handles[h].Position.x =  mPosX;
        this.Options[n].Handles[h].Position.y =  -mPosY;

        // FLOOR //
        if (this.Options[n].Handles[h].Position.x < 0) {
            this.Options[n].Handles[h].Position.x = 0;
        }
        // CEILING //
        if (this.Options[n].Handles[h].Position.x > this.Options[n].Handles[h].XRange) {
            this.Options[n].Handles[h].Position.x = this.Options[n].Handles[h].XRange;
        }

        // FLOOR //
        if (this.Options[n].Handles[h].Position.y < 0) {
            this.Options[n].Handles[h].Position.y = 0;
        }
        // CEILING //
        if (this.Options[n].Handles[h].Position.y > this.Options[n].Handles[h].YRange) {
            this.Options[n].Handles[h].Position.y = this.Options[n].Handles[h].YRange;
        }

        // X
        this.UpdateValue(this.Options[n].Handles[h],"XValue","XMin","XMax","XRange","XSetting","x");

        // Y
        if (this.Options[n].Handles[h].YSetting!=="") {
            this.UpdateValue(this.Options[n].Handles[h],"YValue","YMin","YMax","YRange","YSetting","y");
        }


    }

    UpdateValue(object,value,min,max,thisrange,setting,axis) {
        // CALCULATE VALUE //
        var range = object[""+max] - object[""+min];
        var perc = (object.Position[""+axis]/object[""+thisrange]) * 100;
        object[""+value] = ((range/100)*perc) + object[""+min];

        // QUANTIZE //
        if (object.Quantised) {
            object[""+value] = Math.round(object[""+value]);
            object.Position[""+axis] = (object[""+thisrange]/range)*(object[""+value]-object[""+min]);
        }

        console.log("" + object[""+setting] +" | "+ object[""+value]);
        // SET VALUE IN BLOCK //
        this.SelectedBlock.SetValue(object[""+setting],object[""+value]);
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
        for (var i=0;i<this.Options.length;i++) {
            if (this.Options[i].Type == "slider") {
                this._SliderRoll[i] = this.HudCheck(this.Position.x + this.Margin - (10*this._Units),this.Position.y + this.Options[i].Position.y,this.Range + (20*this._Units),this.Options[i].Size.Height,mx,my);
            }
            else if (this.Options[i].Type == "ADSR") {
                this.Options[i].HandleRoll[0] = this.HudCheck(this.Position.x + this.Margin + this.Options[i].Handles[0].Position.x - (10 * this._Units), this.Position.y + this.Options[i].Position.y + (this.Options[i].Size.Height * 0.1) - (10 * this._Units), (20 * this._Units), (20 * this._Units), mx, my);
                this.Options[i].HandleRoll[1] = this.HudCheck(this.Position.x + this.Margin + this.Options[i].Handles[0].Position.x + this.Options[i].Handles[1].Position.x - (10 * this._Units), this.Position.y + this.Options[i].Position.y + (this.Options[i].Size.Height * 0.9) - this.Options[i].Handles[1].Position.y - (10 * this._Units), (20 * this._Units), (20 * this._Units), mx, my);
                this.Options[i].HandleRoll[2] = this.HudCheck(this.Position.x + this.Margin + (this.Range * 0.6) + this.Options[i].Handles[2].Position.x - (10 * this._Units), this.Position.y + this.Options[i].Position.y + (this.Options[i].Size.Height * 0.9) - (10 * this._Units), (20 * this._Units), (20 * this._Units), mx, my);
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