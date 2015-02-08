/**
 * Created by luketwyman on 11/01/2015.
 */
import App = require("./../App");
import Size = Fayde.Utils.Size;
import Grid = require("./../Grid");
import IBlock = require("./../Blocks/IBlock");
import BlocksSketch = require("./../BlocksSketch");
import Option = require("./Option");
import Slider = require("./OptionSlider");
import Buttons = require("./OptionButtonSelect");
import ADSR = require("./OptionADSR");
import Parametric = require("./OptionParametric");
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
    public SliderColours: string[];
    private _Ctx: CanvasRenderingContext2D;
    private _Units: number;
    private _SliderRoll: boolean[];
    private _PanelCloseRoll: boolean;
    public SelectedBlock: IBlock;
    public InitJson;

    private _Timer: Fayde.ClockTimer;
    private _LastVisualTick: number = new Date(0).getTime();

    constructor(ctx: CanvasRenderingContext2D,sketch: BlocksSketch) {

        this._Ctx = ctx;
        this._Units = 1.7;
        this.Position = new Point(0,0);
        this.Size = new Size(1,1);
        this.Scale = 0;
        this.Margin = 0;
        this.Range = 100;
        this._Name = "";
        this._NameWidth = 0;

        this.Sketch = sketch;
        this.Options = [];
        this.SliderColours = [App.Palette[3],App.Palette[4],App.Palette[9],App.Palette[7],App.Palette[5]];
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

        var units = this.Sketch.Unit.width;
        var ctx = this._Ctx;
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
            } else if (json.parameters[i].type == "buttons") {
                getHeight += 144;
                optionHeight[i] = 144 * units;
            } else if (json.parameters[i].type == "ADSR" || json.parameters[i].type == "parametric") {
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



        var panelW = 450*units;
        var panelR = panelW - (panelM + (25*units));


        // NAME //
        var name = json.name;
        var nameW = ctx.measureText(name.toUpperCase()).width;


        // POPULATE PANEL //
        this.Position.x = 250*units;
        this.Position.y = Math.round(this._Ctx.canvas.height*0.6);
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

            }

            // BUTTONS //
            else if (option.type == "buttons") {
                var value = 0;
                optionList.push(new Buttons(new Point(0,optionY),new Size(this.Range,optionHeight[i]),value,option.name,option.setting));

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

                var handles = [];

                var Xmin, Xmax, Xval, Xrange, handleX, Ymin, Ymax, Yval, Yrange, handleY;


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
                    handleY = ( (optionHeight[i]*0.8) / Yrange ) * (Yval-Ymin);
                    console.log("x: "+handleX+" | y: "+handleY);
                    handles[j] = new OptionHandle(new Point(handleX,handleY),Xval,Xmin,Xmax,this.Range,Yval,Ymin,Ymax,(optionHeight[i]*0.8),option.nodes[j].x_setting,option.nodes[j].y_setting);
                    handles[j].XLog = true;
                }


                optionList.push(new Parametric(new Point(0,optionY),new Size(this.Range,optionHeight[i]),option.name,handles[0],handles[1],handles[2],handles[3]));

            }


            // UPDATE TOTAL LIST HEIGHT //
            optionTotalY += optionHeight[i];

        }
        this.Options = optionList; // update slider array

        if (open){
            this.PanelScale(this,1,200);
        }


    }

    //-------------------------------------------------------------------------------------------
    //  DRAWING
    //-------------------------------------------------------------------------------------------


    Draw() {
        var units = this.Sketch.Unit.width;
        var ctx = this._Ctx;
        var dataType = Math.round(units*10);
        var headerType = Math.round(units*33);

        // START A TRANSFORM HERE //
        ctx.setTransform(this.Scale, 0, 0, this.Scale, this.Position.x, this.Position.y);
        var sx = 0;
        var sy = 0;


        // PANEL //
        ctx.fillStyle = "#000";
        ctx.font = "400 " + dataType + "px Dosis";
        ctx.textAlign = "right";


        // DRAW PANEL //
        ctx.globalAlpha = 0.16;
        this.panelDraw(sx, sy + (5 * units));
        // SHADOW //
        ctx.globalAlpha = 0.9;
        this.panelDraw(sx, sy);
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

        /*var rx = sx + this.Size.Width - (20 * units);
        var ry = sy - (this.Size.Height * 0.5);
        var diamond = 12;

        if (this._PanelCloseRoll) {
            ctx.beginPath();
            ctx.moveTo(rx - (diamond*units), ry);
            ctx.lineTo(rx, ry - (diamond*units));
            ctx.lineTo(rx + (diamond*units), ry);
            ctx.lineTo(rx, ry + (diamond*units));
            ctx.closePath();
            ctx.stroke();
        }*/


        // TITLE //
        ctx.fillStyle = App.Palette[8];// WHITE
        ctx.textAlign = "left";
        ctx.fillText(this._Name.toUpperCase(), this.Margin, (-this.Size.Height * 0.5));


        // DRAW OPTIONS //
        for (var i = 0; i < this.Options.length; i++) {
            this.Options[i].Draw(ctx,units,i,this);
        }
        ctx.setTransform(1, 0, 0, 1, 0, 0);
    }


    // PANEL BLACK BG //
    panelDraw(x,y) {
        var units = this.Sketch.Unit.width;
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
        });
        psTween.start(this._LastVisualTick);
        psTween.easing( TWEEN.Easing.Quintic.InOut );
    }

    //-------------------------------------------------------------------------------------------
    //  INTERACTION
    //-------------------------------------------------------------------------------------------


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
                        this.HandleSet(i, j, xStart[j],mx, my);
                    }
                }
            }
            if (this.Options[i].Type=="parametric") {
                for (var j=0;j<this.Options[i].Handles.length;j++) {
                    if (this.Options[i].HandleRoll[j]) {
                        this.Options[i].Handles[j].Selected = true;
                        this.HandleSet(i, j, 0,mx, my);
                        this.Options[i].PlotGraph();
                        break;
                    }
                }

            }


        }
        if (this._PanelCloseRoll) {
            this.PanelScale(this,0,200);
        }
    }


    MouseUp() {
        for (var i=0;i<this.Options.length;i++) {
            this.Options[i].Selected = false;
            if (this.Options[i].Type=="ADSR" || this.Options[i].Type=="parametric") {
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
                    if (this.Options[i].Handles[j].Selected) {
                        this.HandleSet(i, j, xStart[j], mx, my);
                    }
                }
            }
            if (this.Options[i].Type=="parametric") {
                for (var j=0;j<this.Options[i].Handles.length;j++) {
                    if (this.Options[i].Handles[j].Selected) {
                        this.HandleSet(i, j, 0, mx, my);
                        this.Options[i].PlotGraph();
                    }
                }
            }
        }
    }


    RolloverCheck(mx,my) {
        for (var i=0;i<this.Options.length;i++) {
            var units = this.Sketch.Unit.width;

            if (this.Options[i].Type == "slider") {
                this._SliderRoll[i] = this.HudCheck(this.Position.x + this.Margin - (10*units),this.Position.y + this.Options[i].Position.y,this.Range + (20*units),this.Options[i].Size.Height,mx,my);
            }
            else if (this.Options[i].Type == "ADSR") {
                this.Options[i].HandleRoll[0] = this.HudCheck(this.Position.x + this.Margin + this.Options[i].Handles[0].Position.x - (10 * units), this.Position.y + this.Options[i].Position.y + (this.Options[i].Size.Height * 0.1) - (10 * units), (20 * units), (20 * units), mx, my);
                this.Options[i].HandleRoll[1] = this.HudCheck(this.Position.x + this.Margin + this.Options[i].Handles[0].Position.x + this.Options[i].Handles[1].Position.x - (10 * units), this.Position.y + this.Options[i].Position.y + (this.Options[i].Size.Height * 0.9) - this.Options[i].Handles[1].Position.y - (10 * units), (20 * units), (20 * units), mx, my);
                this.Options[i].HandleRoll[2] = this.HudCheck(this.Position.x + this.Margin + (this.Range * 0.6) + this.Options[i].Handles[2].Position.x - (10 * units), this.Position.y + this.Options[i].Position.y + (this.Options[i].Size.Height * 0.9) - (10 * units), (20 * units), (20 * units), mx, my);
            }
            else if (this.Options[i].Type == "parametric") {
                this.Options[i].HandleRoll[0] = this.HudCheck(this.Position.x + this.Margin + this.Options[i].Handles[0].Position.x - (10 * units), this.Position.y + this.Options[i].Position.y + (this.Options[i].Size.Height * 0.9) - this.Options[i].Handles[0].Position.y - (10 * units), (20 * units), (20 * units), mx, my);
                this.Options[i].HandleRoll[1] = this.HudCheck(this.Position.x + this.Margin + this.Options[i].Handles[1].Position.x - (10 * units), this.Position.y + this.Options[i].Position.y + (this.Options[i].Size.Height * 0.9) - this.Options[i].Handles[1].Position.y - (10 * units), (20 * units), (20 * units), mx, my);
                this.Options[i].HandleRoll[2] = this.HudCheck(this.Position.x + this.Margin + this.Options[i].Handles[2].Position.x - (10 * units), this.Position.y + this.Options[i].Position.y + (this.Options[i].Size.Height * 0.9) - this.Options[i].Handles[2].Position.y - (10 * units), (20 * units), (20 * units), mx, my);
                this.Options[i].HandleRoll[3] = this.HudCheck(this.Position.x + this.Margin + this.Options[i].Handles[3].Position.x - (10 * units), this.Position.y + this.Options[i].Position.y + (this.Options[i].Size.Height * 0.9) - this.Options[i].Handles[3].Position.y - (10 * units), (20 * units), (20 * units), mx, my);

            }

        }

        if (this.Scale==1) {
            this._PanelCloseRoll = this.HudCheck(this.Position.x + this.Size.Width - (30*units),this.Position.y - (this.Size.Height*0.5) - (10*units),20*units,20*units,mx,my);
        }
    }

    //-------------------------------------------------------------------------------------------
    //  MATHS
    //-------------------------------------------------------------------------------------------

    // IS CLICK WITHIN THIS BOX //
    HudCheck(x,y,w,h,mx,my) {
        return (mx>x && mx<(x+w) && my>y && my<(y+h));
    }

    // DRAGGING A HANDLE //
    HandleSet(n,h,xStart,mx,my) {
        var mPosX = mx - (this.Position.x + this.Margin + xStart);
        var mPosY = my - (this.Position.y + this.Options[n].Position.y + (this.Options[n].Size.Height*0.9));

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

        this.UpdateValue(this.Options[n].Handles[h],"XValue","XMin","XMax",this.Options[n].Handles[h].XRange,"XSetting","x",xlog);
        if (this.Options[n].Handles[h].YSetting!=="") {
            this.UpdateValue(this.Options[n].Handles[h],"YValue","YMin","YMax",this.Options[n].Handles[h].YRange,"YSetting","y",ylog);
        }
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
        this.UpdateValue(this.Options[n],"Value","Min","Max",this.Range,"Setting","x",log);
    }

    // UPDATE THE VALUE IN THE BLOCK //
    UpdateValue(object,value,min,max,thisrange,setting,axis,log) {

        // CALCULATE VALUE //
        if (log==true) {
            object[""+value] = this.logValue(0,thisrange,object[""+min],object[""+max],object.Position[""+axis]);
        } else {
            object[""+value] = this.linValue(0,thisrange,object[""+min],object[""+max],object.Position[""+axis]);
        }

        // QUANTIZE //
        if (object.Quantised) {
            object[""+value] = Math.round(object[""+value]);
            if (log==true) {
                object.Position["" + axis] = this.logPosition(0, thisrange, object["" + min], object["" + max], object["" + value]);
            } else {
                object.Position["" + axis] = this.linPosition(0, thisrange, object["" + min], object["" + max], object["" + value]);
            }
        }

        console.log("" + object[""+setting] +" | "+ object[""+value]);
        // SET VALUE IN BLOCK //
        this.SelectedBlock.SetValue(object[""+setting],object[""+value]);
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

export = ParametersPanel;