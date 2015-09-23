/**
 * Created by luketwyman on 11/01/2015.
 */

import Size = minerva.Size;
import Grid = require("./../Grid");
import IBlock = require("./../Blocks/IBlock");
import MainScene = require("./../MainScene");
import Option = require("./Options/Option");
import Slider = require("./Options/OptionSlider");
import WaveSlider = require("./Options/OptionWaveSlider");
import WaveRegion = require("./Options/OptionWaveRegion");
import WaveImage = require("./Options/OptionWaveImage");
import Sample = require("./Options/OptionSample");
import ActionButton = require("./Options/OptionActionButton");
import ButtonArray = require("./Options/OptionButtonArray");
import SwitchArray = require("./Options/OptionSwitchArray");
import Button = require("./Options/OptionButton");
import Switch = require("./Options/OptionSwitch");
import ADSR = require("./Options/OptionADSR");
import Parametric = require("./Options/OptionParametric");
import OptionHandle = require("./Options/OptionHandle");
import OptionSubHandle = require("./Options/OptionSubHandle");
import DisplayObject = require("../DisplayObject");
import ISketchContext = Fayde.Drawing.ISketchContext;

class OptionsPanel extends DisplayObject {

    public Position: Point;
    public Size: Size;
    public Margin: number;
    public Range: number;
    private _NameWidth: number;
    private _Name: string;
    public Scale: number;
    public Sketch;
    public Options: Option[];
    public SliderColours: string[];
    private _Units: number;
    private _SliderRoll: boolean[];
    private _PanelCloseRoll: boolean;
    public SelectedBlock: IBlock;
    public InitJson;
    private _JsonMemory;
    public Hover: boolean;
    public Opening: boolean;
    public Outline: Point[] = [];
    private _DrawReady: boolean;
    public Canvas: any;
    private _Img: any;

    constructor() {
        super();
    }

    Init(sketch: ISketchContext): void {
        super.Init(sketch);

        this._Units = 1.7;
        this.Position = new Point(0,0);
        this.Size = new Size(1,1);
        this.Scale = 0;
        this.Margin = 0;
        this.Range = 100;
        this._Name = "";
        this._NameWidth = 0;
        this.Hover = false;
        this.Opening = false;
        this._DrawReady = false;

        this.Options = [];
        this.SliderColours = [];
        this._SliderRoll = [];

        this.InitJson =
        {
            "name" : "Init",
            "parameters" : [
            ]
        };


        //this.CreateCanvas();
        this.Canvas = App.SubCanvas[0];



        this.Populate(this.InitJson,false);
    }

    /*CreateCanvas() {
        this.Canvas = document.createElement("canvas");
        document.body.appendChild(this.Canvas);
    }*/

    get Ctx(): CanvasRenderingContext2D{
        return this.Canvas.getContext("2d");
    }

    //-------------------------------------------------------------------------------------------
    //  POPULATE
    //-------------------------------------------------------------------------------------------

    Populate(json,open) {

        this._JsonMemory = json;
        var units = App.Unit;
        var ctx = this.Ctx;
        var dataType = units*10;
        this._PanelCloseRoll = false;

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
            } else if (json.parameters[i].type == "sample") {
                getHeight += 48;
                optionHeight[i] = 48 * units;
            } else if (json.parameters[i].type == "actionbutton") {
                getHeight += 48;
                optionHeight[i] = 48 * units;
            } else if (json.parameters[i].type == "waveslider") {
                getHeight += 48;
                optionHeight[i] = 48 * units;
            } else if (json.parameters[i].type == "waveimage") {
                getHeight += 48;
                optionHeight[i] = 48 * units;
            } else if (json.parameters[i].type == "waveregion") {
                getHeight += 60;
                optionHeight[i] = 60 * units;
            } else if (json.parameters[i].type == "buttons") {
                getHeight += 48;
                optionHeight[i] = 48 * units;
            } else if (json.parameters[i].type == "ADSR") {
                getHeight += 120;
                optionHeight[i] = 120 * units;
            } else if (json.parameters[i].type == "parametric") {
                getHeight += 140;
                optionHeight[i] = 140 * units;
            } else if (json.parameters[i].type == "switches") {
                getHeight += 60;
                optionHeight[i] = 60 * units;
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

        if (n==1 && (json.parameters[0].type=="ADSR" || json.parameters[0].type=="parametric")) { // NO MARGIN FOR STANDALONE ENVELOPE
            panelM = (69*units);
        } else {
            for (var i=0;i<n;i++) {
                if (ctx.measureText(json.parameters[i].name.toUpperCase()).width > panelM) {
                    panelM = ctx.measureText(json.parameters[i].name.toUpperCase()).width;
                }
            }
            panelM += (79*units);
        }



        var panelW;
        if (App.Metrics.Device!=="mobile") {
            panelW = 450*units;
        } else {
            panelW = App.Width + (44*units);
        }

        var panelR = panelW - (panelM + (25*units));




        // NAME //
        var name = json.name;
        var nameW = ctx.measureText(name.toUpperCase()).width;


        // POPULATE PANEL //
        this.Size.width = panelW;
        this.Size.height = panelH;
        this.Margin = panelM;
        this.Range = panelR;
        this._Name = json.name;
        this._NameWidth = nameW;
        this.SliderColours = [App.Palette[3],App.Palette[4],App.Palette[9],App.Palette[7],App.Palette[5]];


        // DEFINE OUTLINE FOR HITTEST
        var topY =  - (panelH*0.5);
        var margin = this.Margin;
        this.Outline = [];
        this.Outline.push(
            new Point(0, 0), // block
            new Point(44*units, 0),
            new Point(44*units,topY), // top left
            new Point(margin - (25*units), topY), // name tab start
            new Point(margin - (5*units), topY - (20*units)),
            new Point(margin + (5*units) + this._NameWidth, topY - (20*units)),
            new Point(margin + (25*units) + this._NameWidth, topY), // name tab end
            new Point(panelW - (40*units), topY), // close start
            new Point(panelW - (20*units), topY - (20*units)),
            new Point(panelW, topY), // top right
            new Point(panelW, panelH*0.5), // bottom right
            new Point(44*units, panelH*0.5), // bottom left
            new Point(44*units, 44*units)
        );


        // POPULATE OPTIONS //
        var optionTotalY = 0;
        var optionList = [];
        for (var i=0;i<n;i++) {
            var option = json.parameters[i];

            // SET HEIGHT //
            optionHeight[i] = Math.round(optionHeight[i] * heightScale); // scale heights
            var optionY = Math.round((- (this.Size.height*0.5)) + (20*units) + optionTotalY);


            // SLIDER //
            if (option.type == "slider") {
                var sliderO = this.Margin;
                if (option.props.centered==true) {
                    sliderO += ((this.Range/100) * 50);
                }
                var log = option.props.logarithmic;
                var sliderX;
                if (log==true) {
                    sliderX = this.logPosition(0, this.Range, option.props.min, option.props.max, option.props.value);
                } else {
                    sliderX = this.linPosition(0, this.Range, option.props.min, option.props.max, option.props.value);
                    log = false;
                }


                optionList.push(new Slider(new Point(sliderX,optionY),new Size(1,optionHeight[i]),sliderO,option.props.value,option.props.min,option.props.max,option.props.quantised,option.name,option.setting,log));
                if (option.props.convertDisplay) {
                    optionList[i].DisplayConversion = option.props.convertDisplay;
                }
            }

            // WAVE SLIDER //
            else if (option.type == "waveslider") {
                var sliderO = this.Margin;
                var waveform = [];
                if (option.props.wavearray) {
                    waveform = option.props.wavearray;
                }
                var log = option.props.logarithmic;
                var sliderX;
                if (log==true) {
                    sliderX = this.logPosition(0, this.Range, option.props.min, option.props.max, option.props.value);
                } else {
                    sliderX = this.linPosition(0, this.Range, option.props.min, option.props.max, option.props.value);
                    log = false;
                }
                optionList.push(new WaveSlider(new Point(sliderX,optionY),new Size(1,optionHeight[i]),sliderO,option.props.value,option.props.min,option.props.max,option.props.quantised,option.name,option.setting,log,waveform,option.props.spread));
            }

            // WAVE IMAGE //
            else if (option.type == "waveimage") {
                var sliderO = this.Margin;
                var waveform = [];
                if (option.props.wavearray) {
                    waveform = option.props.wavearray;
                }
                optionList.push(new WaveImage(new Point(0,optionY),new Size(1,optionHeight[i]),sliderO,option.name,waveform));
            }


            // WAVE REGION //
            else if (option.type == "waveregion") {

                var handles = [];

                var sliderO = this.Margin;
                var waveform = [];
                if (option.props.wavearray) {
                    waveform = option.props.wavearray;
                }
                var emptystring = "";
                if (option.props.emptystring) {
                    emptystring = option.props.emptystring;
                }
                var startX = this.linPosition(0, this.Range, option.props.min, option.props.max, option.nodes[0].value);
                var endX = this.linPosition(0, this.Range, option.props.min, option.props.max, option.nodes[1].value);
                var loopStartX = this.linPosition(0, this.Range, option.props.min, option.props.max, option.nodes[2].value);
                var loopEndX = this.linPosition(0, this.Range, option.props.min, option.props.max, option.nodes[3].value);

                var xs = [startX,endX,loopStartX,loopEndX];

                for (var j=0; j<4; j++) {
                    handles[j] = new OptionHandle(new Point(xs[j],optionY),option.nodes[j].value,option.props.min, option.props.max,this.Range,0,0,0,0,option.nodes[j].setting,"");
                }

                optionList.push(new WaveRegion(new Point(0,optionY),new Size(1,optionHeight[i]),sliderO,option.props.value,option.props.min,option.props.max,option.props.quantised,option.name,option.setting,log,waveform,handles,option.props.mode,emptystring));

            }

            // SAMPLE LOADER //
            else if (option.type == "sample") {
                optionList.push(new Sample(new Point(sliderX,optionY),new Size(1,optionHeight[i]),option.name,option.props.track,option.props.user,option.setting));
            }

            // ACTION BUTTON //
            else if (option.type == "actionbutton") {
                optionList.push(new ActionButton(new Point(sliderX,optionY),new Size(1,optionHeight[i]),option.name,option.props.text,option.setting));
            }


            // SWITCH ARRAY //
            else if (option.type == "switches") {

                var switches = [];
                var margin = 20*units;
                var switchWidth = 60*units;
                switchWidth = (this.Range - (margin * 3)) / 4;
                //var switchX = [0,(this.Range*0.5) - (switchWidth*0.5),this.Range - switchWidth];
                var switchStartX = (this.Range * 0.5) - (((switchWidth * option.switches.length) + (margin * (option.switches.length -1))) * 0.5);
                var switchX = 0;
                for (var j=0; j<option.switches.length; j++) {
                    switchX = switchStartX + (j * (switchWidth + margin));
                    switches[j] = new Switch(new Point(switchX,optionY), option.switches[j].name, option.switches[j].setting, option.switches[j].value,new Size(switchWidth,optionHeight[i]*0.43),option.switches[j].lit, option.switches[j].mode);
                }


                optionList.push(new SwitchArray(new Point(sliderX,optionY),new Size(1,optionHeight[i]),switches));

            }

            // BUTTONS //
            else if (option.type == "buttons") {
                var buttons = [];
                var margin = 20*units;
                var buttonWidth = (this.Range - (margin * (option.buttons.length-1))) / option.buttons.length;
                buttonWidth = this.Range / 5;
                var buttonStartX = (this.Range * 0.5) - (buttonWidth * (option.buttons.length * 0.5));
                var buttonX = 0;
                for (var j=0; j<option.buttons.length; j++) {
                    buttonX = buttonStartX + (j * (buttonWidth));
                    buttons[j] = new Button(new Point(buttonX,optionY), option.buttons[j].name, j==option.props.value, j, new Size(buttonWidth,optionHeight[i]));
                }


                optionList.push(new ButtonArray(new Point(0,optionY),new Size(this.Range,optionHeight[i]),option.name,option.setting,buttons,option.props.mode));

            }

            // ENVELOPE //
            else if (option.type == "ADSR") {

                var Xrange, handleX, Yrange, handleY;
                var handles = [];

                //TODO: tidy up this construction, is a mess. Move some within OptionADSR
                Xrange = option.nodes[0].max - option.nodes[0].min;
                handleX = ( (this.Range*0.28) / Xrange ) * (option.nodes[0].value-option.nodes[0].min);
                Yrange = option.nodes[2].max - option.nodes[2].min;
                handleY = ( (optionHeight[i]*0.8) / Yrange ) * (option.nodes[2].value-option.nodes[2].min);
                handles[0] = new OptionHandle(new Point(handleX,handleY),option.nodes[0].value,option.nodes[0].min,option.nodes[0].max,this.Range*0.28,0,0,0,0,option.nodes[0].setting,"");

                Xrange = option.nodes[1].max - option.nodes[1].min;
                handleX = ( (this.Range*0.28) / Xrange ) * (option.nodes[1].value-option.nodes[1].min);
                handles[1] = new OptionHandle(new Point(handleX,handleY),option.nodes[1].value,option.nodes[1].min,option.nodes[1].max,this.Range*0.28,option.nodes[2].value,option.nodes[2].min,option.nodes[2].max,(optionHeight[i]*0.8),option.nodes[1].setting,option.nodes[2].setting);

                Xrange = option.nodes[3].max - option.nodes[3].min;
                handleX = ( (this.Range*0.4) / Xrange ) * (option.nodes[3].value-option.nodes[3].min);
                handles[2] = new OptionHandle(new Point(handleX,handleY),option.nodes[3].value,option.nodes[3].min,option.nodes[3].max,this.Range*0.4,0,0,0,0,option.nodes[3].setting,"");

                optionList.push(new ADSR(new Point(0,optionY),new Size(this.Range,optionHeight[i]),option.name,handles[0],handles[1],handles[2]));

            }

            // PARAMETRIC //
            else if (option.type == "parametric") {

                // HANDLES //
                var handles = [];
                var subHandles = [];
                var Xmin, Xmax, Xval, Xrange, handleX, Ymin, Ymax, Yval, Yrange, handleY;
                var Qmin, Qmax, Qval, QRmin, QRmax, QX;
                for (var j=0; j<4; j++) {
                    Xmin = option.nodes[j].x_min;
                    Xmax = option.nodes[j].x_max;
                    Xval = option.nodes[j].x_value;
                    Ymin = option.nodes[j].y_min;
                    Ymax = option.nodes[j].y_max;
                    Yval = option.nodes[j].y_value;

                    Xrange = Xmax - Xmin;
                    handleX = ( this.Range / Xrange ) * (Xval-Xmin);
                    handleX = this.logPosition(0, this.Range, Xmin, Xmax, Xval);
                    Yrange = Ymax - Ymin;
                    handleY = ( (optionHeight[i]*0.7) / Yrange ) * (Yval-Ymin);
                    handles[j] = new OptionHandle(new Point(handleX,handleY),Xval,Xmin,Xmax,this.Range,Yval,Ymin,Ymax,(optionHeight[i]*0.7),option.nodes[j].x_setting,option.nodes[j].y_setting);
                    handles[j].XLog = true;

                    // SUB //
                    Qmin = option.nodes[j].q_min;
                    Qmax = option.nodes[j].q_max;
                    Qval = option.nodes[j].q_value;
                    QRmin = (this.Range/100) * 2;
                    QRmax = (this.Range/100) * 10;
                    QX = this.logPosition(QRmin, QRmax, Qmin, Qmax, Qval);

                    subHandles[j] = new OptionSubHandle(new Point(QX,handleY),Qval,Qmin,Qmax,QRmin,QRmax,option.nodes[j].q_setting);
                }

                // COMPONENT //
                optionList.push(new Parametric(new Point(0,optionY),new Size(this.Range,optionHeight[i]),option.name,handles[0],handles[1],handles[2],handles[3]));
                optionList[i].SubHandles = subHandles;
                optionList[i].PlotGraph();
            }


            // UPDATE TOTAL LIST HEIGHT //
            optionTotalY += optionHeight[i];

        }
        this.Options = optionList; // update slider array

        //if (open){
        //    this.PanelScale(this,1,200);
        //}

        this._DrawReady = true;
    }

    UpdateOptions() {
        this.SelectedBlock.UpdateOptionsForm();
        var json = this.SelectedBlock.OptionsForm;
        // GET NUMBER OF OPTIONS //
        var n = json.parameters.length;

        for (var i=0;i<n;i++) {

            var option = json.parameters[i];


            // SLIDER //
            if (option.type == "slider") {
                this.Options[i].Value = option.props.value;

                var sliderO = this.Margin;
                if (option.props.centered==true) {
                    sliderO += ((this.Range/100) * 50);
                }
                var log = option.props.logarithmic;
                if (log==true) {
                    this.Options[i].Position.x = this.logPosition(0, this.Range, option.props.min, option.props.max, option.props.value);
                } else {
                    this.Options[i].Position.x = this.linPosition(0, this.Range, option.props.min, option.props.max, option.props.value);
                }
            }

            // WAVE SLIDER //
            else if (option.type == "waveslider") {
                this.Options[i].Value = option.props.value;
                this.Options[i].Spread = option.props.spread;
                this.Options[i].Mode = option.props.mode;
            }

        }
        this._DrawReady = true;
    }


    Update() {
        if (this._JsonMemory.updateeveryframe==true) {
            //this.UpdateOptions();
        }
    }


    //-------------------------------------------------------------------------------------------
    //  DRAWING
    //-------------------------------------------------------------------------------------------


    Draw() {
        var units = App.Unit;
        var ctxOuter = App.Ctx;
        var ctx = this.Ctx;

        // DRAW OFFSCREEN //
        if (this._DrawReady) {
            this.DrawToOffscreenCanvas(ctx);
            this._DrawReady = false;
        }

        if (this.Scale>0) {

            ctxOuter.globalAlpha = 1;
            //ctxOuter.drawImage(this._Img,0,0);

            // START A TRANSFORM HERE //
            ctxOuter.setTransform(this.Scale, 0, 0, this.Scale, this.Position.x, this.Position.y);

            ctxOuter.drawImage(this.Canvas,0,-Math.round(App.Metrics.C.y));


            //this.DrawToOffscreenCanvas(ctx);
            /*var sx = 0;
             var sy = 0;


             // PANEL //
             ctx.font = App.Metrics.TxtMid;
             ctx.textAlign = "right";


             // DRAW PANEL //
             ctx.fillStyle = App.Palette[2];// Shadow
             ctx.globalAlpha = 0.16;
             this.panelDraw(sx, sy + (5 * units));
             ctx.fillStyle = App.Palette[2];// Black
             ctx.globalAlpha = 0.9;
             this.panelDraw(sx, sy);
             ctx.globalAlpha = 1;


             // CLOSE X //
             ctx.strokeStyle = App.Palette[App.Color.Txt];// WHITE
             ctx.lineWidth = 2;
             ctx.beginPath();
             ctx.moveTo(sx + this.Size.width - (24 * units), sy - (this.Size.height * 0.5) + (4 * units));
             ctx.lineTo(sx + this.Size.width - (16 * units), sy - (this.Size.height * 0.5) - (4 * units));
             ctx.moveTo(sx + this.Size.width - (24 * units), sy - (this.Size.height * 0.5) - (4 * units));
             ctx.lineTo(sx + this.Size.width - (16 * units), sy - (this.Size.height * 0.5) + (4 * units));
             ctx.stroke();
             ctx.lineWidth = 1;


             // TITLE //
             ctx.fillStyle = App.Palette[App.Color.Txt];// WHITE
             ctx.textAlign = "left";
             ctx.fillText(this._Name.toUpperCase(), this.Margin, (-this.Size.height * 0.5));


             // DRAW OPTIONS //
             for (var i = 0; i < this.Options.length; i++) {
             this.Options[i].Draw(ctx,units,i,this);
             }*/
            ctxOuter.setTransform(1, 0, 0, 1, 0, 0);

        }


    }

    DrawToOffscreenCanvas(ctx) {

        ctx.clearRect(0,0,App.Width,App.Height);

        ctx.setTransform(1, 0, 0, 1, 0, Math.round(App.Metrics.C.y));

        var units = App.Unit;
        var sx = 0;
        var sy = 0;


        // PANEL //
        ctx.font = App.Metrics.TxtMid;
        ctx.textAlign = "right";


        // DRAW PANEL //
        ctx.fillStyle = App.Palette[2];// Shadow
        ctx.globalAlpha = 0.16;
        this.panelDraw(sx, sy + (5 * units));
        ctx.fillStyle = App.Palette[2];// Black
        ctx.globalAlpha = 0.9;
        this.panelDraw(sx, sy);
        ctx.globalAlpha = 1;


        // CLOSE X //
        ctx.strokeStyle = App.Palette[App.Color.Txt];// WHITE
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sx + this.Size.width - (24 * units), sy - (this.Size.height * 0.5) + (4 * units));
        ctx.lineTo(sx + this.Size.width - (16 * units), sy - (this.Size.height * 0.5) - (4 * units));
        ctx.moveTo(sx + this.Size.width - (24 * units), sy - (this.Size.height * 0.5) - (4 * units));
        ctx.lineTo(sx + this.Size.width - (16 * units), sy - (this.Size.height * 0.5) + (4 * units));
        ctx.stroke();
        ctx.lineWidth = 1;


        // TITLE //
        ctx.fillStyle = App.Palette[App.Color.Txt];// WHITE
        ctx.textAlign = "left";
        ctx.fillText(this._Name.toUpperCase(), this.Margin, (-this.Size.height * 0.5));


        // DRAW OPTIONS //
        for (var i = 0; i < this.Options.length; i++) {
            this.Options[i].Draw(ctx,units,i,this);
        }
        ctx.setTransform(1, 0, 0, 1, 0, 0);
    }


    // PANEL BLACK BG //
    panelDraw(x,y) {
        var units = App.Unit;
        var ctx = this.Ctx;

        ctx.beginPath();
        ctx.moveTo(x + (44*units), y - (this.Size.height*0.5)); // tl
        ctx.lineTo(x + this.Margin - (25*units), y - (this.Size.height*0.5)); // name tab start
        ctx.lineTo(x + this.Margin - (5*units), y - (this.Size.height*0.5) - (20*units));
        ctx.lineTo(x + this.Margin + (5*units) + this._NameWidth, y - (this.Size.height*0.5) - (20*units));
        ctx.lineTo(x + this.Margin + (25*units) + this._NameWidth, y - (this.Size.height*0.5)); // name tab end
        ctx.lineTo(x + this.Size.width - (40*units), y - (this.Size.height*0.5)); // close start
        ctx.lineTo(x + this.Size.width - (20*units), y - (this.Size.height*0.5) - (20*units));
        ctx.lineTo(x + this.Size.width, y - (this.Size.height*0.5)); // tr
        ctx.lineTo(x + this.Size.width, y + (this.Size.height*0.5)); // br
        ctx.lineTo(x + (44*units), y + (this.Size.height*0.5)); // bl
        ctx.lineTo(x + (44*units), y + (44*units));
        ctx.lineTo(x, y); // block
        ctx.lineTo(x + (44*units), y);
        ctx.closePath();
        ctx.fill();
    }


    diagonalFill(x,y,w,h,s) {
        var ctx = this.Ctx;
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

    vertFill(x,y,w,h,s) {
        var ctx = this.Ctx;
        var lineNo = Math.round(w / s);
        x = Math.round(x);
        ctx.beginPath();
        for (var j=0;j<lineNo;j++) {
            ctx.moveTo(x + (s*j), y);
            ctx.lineTo(x + (s*j), y + h);
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
        psTween.start(this.LastVisualTick);
        psTween.easing( TWEEN.Easing.Quintic.InOut );
    }

    //-------------------------------------------------------------------------------------------
    //  INTERACTION
    //-------------------------------------------------------------------------------------------


    Open(block) {
        block.UpdateOptionsForm();
        if (block.OptionsForm) {
            var newBlock: boolean = (block!==this.SelectedBlock);
            if(this.Scale==1 && newBlock) {
                this.Close();
            }
            this.Opening = true;
            this.SelectedBlock = block;
            App.MainScene.MainSceneDragger.Jump(block.Position,new Point(App.Width*App.Metrics.OptionsPoint.x,App.Height*App.Metrics.OptionsPoint.y));

            var me = this;
            setTimeout(function() {
                me.Opening = false;
                me.Populate(block.OptionsForm,true);
                me.PanelScale(me,1,200);
            },400);
        }
    }

    Refresh() {
        if (this.Scale==1) {
            this.SelectedBlock.UpdateOptionsForm();
            this.Populate(this.SelectedBlock.OptionsForm, false);
        }
    }

    Resize() {
        if (App.Metrics.Device!=="mobile") {
            this.Position.x = Math.round(App.Width*App.Metrics.OptionsPoint.x);
            this.Position.y = Math.round(App.Height*App.Metrics.OptionsPoint.y);
        } else {
            this.Position.x = -44 * App.Unit;
            this.Position.y = Math.round(App.Height*0.65);
        }

    }

    Close() {
        this.PanelScale(this,0,200);
    }

    //TODO: move into interaction functions within option components, as with drawing
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
                        this.HandleSet(i, j, xStart[j],this.Options[i].Size.height*0.9,mx, my);
                    }
                }
            }
            if (this.Options[i].Type=="waveregion") {
                for (var j=this.Options[i].Handles.length-1;j>-1;j--) {
                    if (this.Options[i].HandleRoll[j]) {
                        this.Options[i].Handles[j].Selected = true;
                        this.HandleSet(i, j, 0,this.Options[i].Size.height,mx, my);
                        return;
                    }
                }
            }
            if (this.Options[i].Type=="switches") {
                for (var j=0;j<this.Options[i].Switches.length;j++) {
                    if (this.Options[i].HandleRoll[j]) {
                        this.SwitchValue(this.Options[i].Switches[j],"Selected","Setting");
                        return;
                    }
                }
            }
            if (this.Options[i].Type=="buttons") {
                for (var j=0;j<this.Options[i].Buttons.length;j++) {
                    if (this.Options[i].HandleRoll[j]) {
                        for (var h=0;h<this.Options[i].Buttons.length;h++) {
                            this.Options[i].Buttons[h].Selected = false;
                        }
                        this.Options[i].Buttons[j].Selected = true;
                        this.PushValue(this.Options[i],j,"Setting");
                        return;
                    }
                }
            }
            if (this.Options[i].Type=="parametric") {
                for (var j=0;j<this.Options[i].Handles.length;j++) {
                    if (this.Options[i].HandleRoll[j]) {
                        this.Options[i].Handles[j].Selected = true;
                        this.HandleSet(i, j, 0,this.Options[i].Size.height*0.8,mx, my);
                        this.Options[i].PlotGraph();
                        break;
                    }
                }
                for (var j=0;j<this.Options[i].SubHandles.length;j++) {
                    if (this.Options[i].SubHandleRoll[j]) {
                        this.Options[i].SubHandles[j].Selected = true;
                        this.SubHandleSet(this.Options[i].SubHandles[j],this.Options[i].Handles[j].Position.x, mx);
                        this.Options[i].PlotGraph();
                        break;
                    }
                }
            }
            if (this.Options[i].Type=="sample") {
                if (this.Options[i].HandleRoll[0]) {
                    this.Sketch.SoundcloudPanel.OpenPanel();
                    return;
                }
            }
            if (this.Options[i].Type=="actionbutton") {
                if (this.Options[i].HandleRoll[0]) {
                    var val = 0;
                    console.log("" + this.Options[i].Setting +" | "+ val);
                    // SET VALUE IN BLOCK //
                    this.SelectedBlock.SetParam(this.Options[i].Setting, val);
                    return;
                }
            }

        }
        if (this._PanelCloseRoll) {
            this.Close();
        }
    }


    MouseUp() {
        for (var i=0;i<this.Options.length;i++) {
            this.Options[i].Selected = false;
            if (this.Options[i].Type=="ADSR" || this.Options[i].Type=="waveregion") {
                for (var j=0;j<this.Options[i].Handles.length;j++) {
                    this.Options[i].Handles[j].Selected = false;
                }
            }
            if (this.Options[i].Type=="parametric") {
                for (var j=0;j<this.Options[i].Handles.length;j++) {
                    this.Options[i].Handles[j].Selected = false;
                    this.Options[i].SubHandles[j].Selected = false;
                }
            }
        }

        if (this.Hover) {
            this._DrawReady = true;
        }
    }


    MouseMove(mx,my) {
        this.RolloverCheck(mx,my);
        for (var i=0;i<this.Options.length;i++) {
            if (this.Options[i].Type=="slider" || this.Options[i].Type == "waveslider") {
                if (this.Options[i].Selected) {
                    this.SliderSet(i, mx);
                }
            }
            if (this.Options[i].Type=="ADSR") {
                var xStart = [0, this.Options[i].Handles[0].Position.x,this.Range*0.6];
                for (var j=0;j<this.Options[i].Handles.length;j++) {
                    if (this.Options[i].Handles[j].Selected) {
                        this.HandleSet(i, j, xStart[j], this.Options[i].Size.height*0.9, mx, my);
                    }
                }
            }
            if (this.Options[i].Type=="waveregion") {
                for (var j=0;j<this.Options[i].Handles.length;j++) {
                    var handles = this.Options[i].Handles;
                    if (handles[j].Selected) {
                        this.HandleSet(i, j, 0, this.Options[i].Size.height, mx, my);
                    }
                }

                if (handles[3].Position.x < (handles[2].Position.x+1)) { // loopend before loopstart
                    this.HandleSet(i, 3, 0, this.Options[i].Size.height, (handles[2].Position.x+1) + this.Position.x + this.Margin, my);
                }
                if (handles[1].Position.x < (handles[0].Position.x+1)) { // end before start
                    this.HandleSet(i, 1, 0, this.Options[i].Size.height, (handles[0].Position.x+1) + this.Position.x + this.Margin, my);
                }

            }
            if (this.Options[i].Type=="parametric") {
                for (var j=0;j<this.Options[i].Handles.length;j++) {
                    if (this.Options[i].Handles[j].Selected) {
                        this.HandleSet(i, j, 0, this.Options[i].Size.height*0.8, mx, my);
                        this.Options[i].PlotGraph();
                    }
                }
                for (var j=0;j<this.Options[i].SubHandles.length;j++) {
                    if (this.Options[i].SubHandles[j].Selected) {
                        this.SubHandleSet(this.Options[i].SubHandles[j],this.Options[i].Handles[j].Position.x, mx);
                        this.Options[i].PlotGraph();
                    }
                }


            }
        }
    }


    RolloverCheck(mx,my) {
        var units = App.Unit;

        //this.Hover = this.HitRect(this.Position.x,this.Position.y - (this.Size.height*0.5), this.Size.width, this.Size.height,mx,my);
        this.Hover = this.OutlineTest(new Point(mx,my));

        for (var i=0;i<this.Options.length;i++) {

            if (this.Options[i].Type == "slider" || this.Options[i].Type == "waveslider") {
                this._SliderRoll[i] = this.HitRect(this.Position.x + this.Margin - (10*units),this.Position.y + this.Options[i].Position.y,this.Range + (20*units),this.Options[i].Size.height,mx,my);
            }
            else if (this.Options[i].Type == "ADSR") {
                this.Options[i].HandleRoll[0] = this.HitRect(this.Position.x + this.Margin + this.Options[i].Handles[0].Position.x - (10 * units), this.Position.y + this.Options[i].Position.y + (this.Options[i].Size.height * 0.1) - (10 * units), (20 * units), (20 * units), mx, my);
                this.Options[i].HandleRoll[1] = this.HitRect(this.Position.x + this.Margin + this.Options[i].Handles[0].Position.x + this.Options[i].Handles[1].Position.x - (10 * units), this.Position.y + this.Options[i].Position.y + (this.Options[i].Size.height * 0.9) - this.Options[i].Handles[1].Position.y - (10 * units), (20 * units), (20 * units), mx, my);
                this.Options[i].HandleRoll[2] = this.HitRect(this.Position.x + this.Margin + (this.Range * 0.6) + this.Options[i].Handles[2].Position.x - (10 * units), this.Position.y + this.Options[i].Position.y + (this.Options[i].Size.height * 0.9) - (10 * units), (20 * units), (20 * units), mx, my);
            }
            else if (this.Options[i].Type == "waveregion") {
                for (var j=0; j<4; j++) {
                    if ( (!this.Options[i].Mode && j>1) || (this.Options[i].Mode && j==1)) {
                        this.Options[i].HandleRoll[j] = false;
                    } else {
                        this.Options[i].HandleRoll[j] = this.HitRect(this.Position.x + this.Margin + this.Options[i].Handles[j].Position.x - (10 * units), this.Position.y + this.Options[i].Position.y, (20 * units), this.Options[i].Size.height, mx, my);
                    }
                }
            }
            else if (this.Options[i].Type == "switches") {
                for (var j=0; j<this.Options[i].Switches.length; j++) {
                    this.Options[i].HandleRoll[j] = this.HitRect(this.Position.x + this.Margin + this.Options[i].Switches[j].Position.x, this.Position.y + this.Options[i].Position.y, this.Options[i].Switches[j].Size.width, this.Options[i].Size.height * 0.7, mx, my);
                }
            }
            else if (this.Options[i].Type == "buttons") {
                for (var j=0; j<this.Options[i].Buttons.length; j++) {
                    this.Options[i].HandleRoll[j] = this.HitRect(this.Position.x + this.Margin + this.Options[i].Buttons[j].Position.x, this.Position.y + this.Options[i].Position.y, this.Options[i].Buttons[j].Size.width, this.Options[i].Size.height, mx, my);
                }
            }
            else if (this.Options[i].Type == "parametric") {
                for (var j=0; j<this.Options[i].Handles.length; j++) {
                    this.Options[i].HandleRoll[j] = this.HitRect(this.Position.x + this.Margin + this.Options[i].Handles[j].Position.x - (10 * units), this.Position.y + this.Options[i].Position.y + (this.Options[i].Size.height * 0.8) - this.Options[i].Handles[j].Position.y - (10 * units), (20 * units), (20 * units), mx, my);

                    if (j!==0 && j!==this.Options[i].Handles.length-1) {
                        this.Options[i].SubHandleRoll[j] = this.HitRect(this.Position.x + this.Margin + this.Options[i].Handles[j].Position.x - this.Options[i].SubHandles[j].Position.x - (10 * units), this.Position.y + this.Options[i].Position.y + (this.Options[i].Size.height * 0.9) - (10 * units), (this.Options[i].SubHandles[j].Position.x * 2) + (20 * units), (20 * units), mx, my);
                    }
                }
            }
            else if (this.Options[i].Type == "sample") {
                this.Options[i].HandleRoll[0] = this.HitRect(this.Position.x + this.Margin + (this.Range * 0.5), this.Position.y + this.Options[i].Position.y, (this.Range * 0.5), this.Options[i].Size.height, mx, my);
            }
            else if (this.Options[i].Type == "actionbutton") {
                this.Options[i].HandleRoll[0] = this.HitRect(this.Position.x + this.Margin + (this.Range * 0.25), this.Position.y + this.Options[i].Position.y, (this.Range * 0.5), this.Options[i].Size.height, mx, my);
            }
        }

        if (this.Scale==1) {
            this._PanelCloseRoll = this.HitRect(this.Position.x + this.Size.width - (30*units),this.Position.y - (this.Size.height*0.5) - (10*units),20*units,20*units,mx,my);
        }
    }

    //-------------------------------------------------------------------------------------------
    //  MATHS
    //-------------------------------------------------------------------------------------------

    OutlineTest(point: Point): boolean {

        this.Ctx.beginPath();
        this.Ctx.moveTo(this.Position.x + this.Outline[0].x, this.Position.y + this.Outline[0].y);

        for (var i = 1; i < this.Outline.length; i++) {
            this.Ctx.lineTo(this.Position.x + this.Outline[i].x, this.Position.y + this.Outline[i].y);
        }

        this.Ctx.closePath();

        return this.Ctx.isPointInPath(point.x, point.y);
    }


    // DRAGGING A HANDLE //
    HandleSet(n,h,xStart,yRange,mx,my) {
        var mPosX = mx - (this.Position.x + this.Margin + xStart);
        var mPosY = my - (this.Position.y + this.Options[n].Position.y + (yRange));

        this.Options[n].Handles[h].Position.x =  mPosX;
        this.Options[n].Handles[h].Position.y =  -mPosY;

        this.Options[n].Handles[h].Position.x = this.ValueInRange(this.Options[n].Handles[h].Position.x,0,this.Options[n].Handles[h].XRange);
        this.Options[n].Handles[h].Position.y = this.ValueInRange(this.Options[n].Handles[h].Position.y,0,this.Options[n].Handles[h].YRange);

        var log = false;
        if (this.Options[n].Handles[h].Log==true) {
            log = true;
        }
        var xlog = false;
        if (this.Options[n].Handles[h].XLog==true) {
            xlog = true;
        }
        var ylog = false;
        if (this.Options[n].Handles[h].YLog==true) {
            ylog = true;
        }

        this.UpdateValue(this.Options[n].Handles[h],"XValue","XMin","XMax",0, this.Options[n].Handles[h].XRange,"XSetting","x",xlog);
        if (this.Options[n].Handles[h].YSetting!=="") {
            this.UpdateValue(this.Options[n].Handles[h],"YValue","YMin","YMax",0, this.Options[n].Handles[h].YRange,"YSetting","y",ylog);
        }
    }

    // DRAGGING A SUB HANDLE //
    SubHandleSet(handle,origin,mx) {
        var mPosX = mx - (this.Position.x + this.Margin + origin);

        if (mPosX<0) {
            mPosX = -mPosX;
        }

        handle.Position.x =  mPosX;
        handle.Position.x = this.ValueInRange(handle.Position.x,handle.RangeMin,handle.RangeMax);


        this.UpdateValue(handle,"Value","Min","Max",handle.RangeMin,handle.RangeMax,"Setting","x",true);

    }

    // DRAGGING A SLIDER //
    SliderSet(n,mx) {
        var mPos = mx - (this.Position.x + this.Margin);
        this.Options[n].Position.x = mPos;

        this.Options[n].Position.x = this.ValueInRange(this.Options[n].Position.x,0,this.Range);
        var log = false;
        if (this.Options[n].Log==true) {
            log = true;
        }
        this.UpdateValue(this.Options[n],"Value","Min","Max",0, this.Range,"Setting","x",log);
    }

    // UPDATE THE VALUE IN THE BLOCK //
    UpdateValue(object,value,min,max,rangemin,rangemax,setting,axis,log) {
        this._DrawReady = true;
        // CALCULATE VALUE //
        if (log==true) {
            object[""+value] = this.logValue(rangemin,rangemax,object[""+min],object[""+max],object.Position[""+axis]);
        } else {
            object[""+value] = this.linValue(rangemin,rangemax,object[""+min],object[""+max],object.Position[""+axis]);
        }

        // QUANTIZE //
        if (object.Quantised) {
            object[""+value] = Math.round(object[""+value]);
            if (log==true) {
                object.Position["" + axis] = this.logPosition(rangemin, rangemax, object["" + min], object["" + max], object["" + value]);
            } else {
                object.Position["" + axis] = this.linPosition(rangemin, rangemax, object["" + min], object["" + max], object["" + value]);
            }
        }

        console.log("" + object[""+setting] +" | "+ object[""+value]);
        // SET VALUE IN BLOCK //
        //Utils.Events.Debounce(function() {
            //console.log("debounce");
            this.SelectedBlock.SetParam(object[""+setting], object[""+value]);
        //}, 100);

        // UPDATE VALUES IN OTHER OPTIONS //
        if (this._Name.toUpperCase()=="GRANULAR" && ("" + object[""+setting])=="spread") {
            this.UpdateOptions();
        }

    }

    SwitchValue(object,value,setting) {
        this._DrawReady = true;
        console.log("from " + object[""+setting] +" | "+ object[""+value]);
        object[""+value] = ! object[""+value];

        var val = 0;
        if (object[""+value]) {
            val = 1;
        }

        console.log("to " + object[""+setting] +" | "+ val);
        // SET VALUE IN BLOCK //
        this.SelectedBlock.SetParam(object[""+setting], val);

    }

    PushValue(object,value,setting) {
        this._DrawReady = true;
        console.log("" + object[""+setting] +" | "+ value);
        // SET VALUE IN BLOCK //
        this.SelectedBlock.SetParam(object[""+setting], value);

    }


    ValueInRange(value,floor,ceiling) {
        if (value < floor) {
            value = floor;
        }
        if (value> ceiling) {
            value = ceiling;
        }
        return value;
    }


    logValue(minpos,maxpos,minval,maxval,position) {
        var minlval = Math.log(minval);
        var maxlval = Math.log(maxval);
        var scale = (maxlval - minlval) / (maxpos - minpos);
        //console.log("" +minval + " | " +maxval + " | " +position);
        return Math.exp((position - minpos) * scale + minlval);
    }

    logPosition(minpos,maxpos,minval,maxval,value) {
        var minlval = Math.log(minval);
        var maxlval = Math.log(maxval);
        var scale = (maxlval - minlval) / (maxpos - minpos);
        //console.log("" +minval + " | " +maxval + " | " +value);
        return minpos + (Math.log(value) - minlval) / scale;
    }

    linValue(minpos,maxpos,minval,maxval,position) {
        var scale = (maxval - minval) / (maxpos - minpos);
        //console.log("" +minval + " | " +maxval + " | " +position);
        return (position - minpos) * scale + minval;
    }

    linPosition(minpos,maxpos,minval,maxval,value) {
        var scale = (maxval - minval) / (maxpos - minpos);
        //console.log("" +minval + " | " +maxval + " | " +value);
        return minpos + (value - minval) / scale;
    }

}

export = OptionsPanel;
