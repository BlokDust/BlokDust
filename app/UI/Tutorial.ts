import Dimensions = Utils.Measurements.Dimensions;
import DisplayObject = etch.drawing.DisplayObject;
import Size = minerva.Size;
import {IApp} from '../IApp';
import {MainScene} from './../MainScene';
//import Point = minerva.Point;
import Point = etch.primitives.Point;

import {Block} from './../Blocks/Block';
import {ToneSource} from './../Blocks/Sources/ToneSource';
import {ComputerKeyboard} from './../Blocks/Interaction/ComputerKeyboard';
import {Chopper} from './../Blocks/Effects/Post/Chopper';
import {Power} from './../Blocks/Power/Power';
import {ParticleEmitter} from './../Blocks/Power/ParticleEmitter';

declare var App: IApp;

export class Tutorial extends DisplayObject{

    public Debug: boolean = true;

    public Open: boolean;
    public SplashOpen: boolean;
    public Hover: boolean = false;
    public HotSpots: Point[];
    public CurrentScene: number;
    public TotalScenes: number;
    public IntroLines: number;
    public TaskLines: number;
    public TextWidth: number;
    private _LineHeight: number;
    private _SkipBtnWidth: number;
    private _DoneBtnWidth: number;
    public Text: any;
    public Offset: Point;
    public Offset2: Point;
    private _RollOvers: boolean[] = [];
    public WatchedBlocks: Block[] = [];
    private _AnimateCount: number;
    public AnimatePolarity: number;
    public OptionsInteract: boolean = false;

    Init(drawTo: IDisplayContext): void {
        super.Init(drawTo);
        this.Open = false;
        this.HotSpots = [];
        this.IntroLines = 0;
        this.TaskLines = 0;
        this.TextWidth = 190;
        this._LineHeight = 14;
        this.Offset = new Point(-20,0);
        this.Offset2 = new Point(-1,0);
        this._AnimateCount = 0;
        this.AnimatePolarity = 1;

        this.Text = App.L10n.UI.Tutorial;
        this.CurrentScene = 1;
        this.TotalScenes = this.Text.Scenes.length;

    }


    CheckLaunch() {
        if (this.Debug) {
            this.OpenSplash();
        } else {
            if (!App.SkipTutorial) {
                this.OpenSplash();
            }
        }
    }

    //-------------------------------------------------------------------------------------------
    //  CHECK TUTORIAL TASK COMPLETION
    //-------------------------------------------------------------------------------------------

    CheckTask() {

        if (this.Open) {
            var check = false;
            this.WatchedBlocks = [];
            var i, tone, toneConnections, controller, controllerUnplugged, effect, effectUnplugged, particle, power, powerConnections, particleConnected;

            // GET OUR TONE BLOCK //
            for (i=0; i<App.Blocks.length; i++) {
                if (App.Blocks[i] instanceof ToneSource && !tone) {
                    tone = App.Blocks[i];
                    this.WatchedBlocks[0] = tone;
                }
                if (App.Blocks[i] instanceof ComputerKeyboard && !controllerUnplugged) {
                    controllerUnplugged = App.Blocks[i];
                    this.WatchedBlocks[1] = controllerUnplugged;
                }
                if (App.Blocks[i] instanceof Chopper && !effectUnplugged) {
                    effectUnplugged = App.Blocks[i];
                    this.WatchedBlocks[4] = effectUnplugged;
                }
                if (App.Blocks[i] instanceof ParticleEmitter && !particle) {
                    particle = App.Blocks[i];
                    this.WatchedBlocks[5] = particle;
                }
                if (App.Blocks[i] instanceof Power && !power) {
                    power = App.Blocks[i];
                    this.WatchedBlocks[6] = power;
                }
            }

            // GET TONE'S RELEVANT CONNECTIONS //
            if (tone && tone.Connections.Count) {
                toneConnections = tone.Connections.ToArray();

                for (i=0; i<toneConnections.length; i++) {
                    if (toneConnections[i] instanceof ComputerKeyboard && !controller) {
                        controller = toneConnections[i];
                        this.WatchedBlocks[2] = controller;
                    }
                    if (toneConnections[i] instanceof Chopper && !effect) {
                        effect = toneConnections[i];
                        this.WatchedBlocks[3] = effect;
                    }
                }
            }

            // GET POWER'S RELEVANT CONNECTIONS //
            if (power && power.Connections.Count) {
                powerConnections = power.Connections.ToArray();

                for (i=0; i<powerConnections.length; i++) {
                    if (powerConnections[i] instanceof ParticleEmitter && !particleConnected) {
                        particleConnected = powerConnections[i];
                        this.WatchedBlocks[7] = particleConnected;
                    }
                }
            }


            switch (this.CurrentScene) {
                case 1:
                    if (tone && !App.MainScene.IsDraggingABlock) { // TONE CREATED
                        check = true;
                        App.MainScene.MainSceneDragger.Jump(tone.Position,new Point(0.5,0.5),1000);
                    }

                    break;
                case 2:
                    if (controller && !App.MainScene.IsDraggingABlock) { // KEYBOARD CONNECTED TO TONE
                        check = true;
                    }

                    break;
                case 3:
                    if (effect && !App.MainScene.IsDraggingABlock) { // CHOPPER CONNECTED TO TONE
                        check = true;
                    }

                    break;

                case 4:
                    if (this.OptionsInteract && App.MainScene.SelectedBlock==effect) { // CHOPPER OPTIONS
                        check = true;
                    }

                    break;

                case 5:
                    if (!controller && !controllerUnplugged && !App.MainScene.IsDraggingABlock) { // KEYBOARD TRASHED (this one could be more rigid)
                        check = true;
                        App.MainScene.MainSceneDragger.Jump(tone.Position,new Point(0.5,0.35),1000);
                    }

                    break;
                case 6:
                    if (particle && !App.MainScene.IsDraggingABlock) { // PARTICLE EMITTER CREATED
                        check = true;
                    }

                    break;
                case 7:
                    if (particleConnected && !App.MainScene.IsDraggingABlock) { // PARTICLE CONNECTED
                        check = true;
                    }

                    break;

                default:
                    break;

            }

            if (check) {
                this.NextScene();
            }
        }
    }


    //-------------------------------------------------------------------------------------------
    //  UPDATE
    //-------------------------------------------------------------------------------------------


    Update() {
        if (this.Open) {
            this.UpdateHotspots();
        }
        if (this.SplashOpen) {
            //this.AnimateButton();
        }
    }

    //-------------------------------------------------------------------------------------------
    //  DRAW
    //-------------------------------------------------------------------------------------------


    Draw() {
        var ctx = this.Ctx;
        var units = App.Unit;
        var midType = App.Metrics.TxtMid;
        var italicType = App.Metrics.TxtItalic3;
        var headerType = App.Metrics.TxtHeader;
        var x = App.Width - (this.Offset.x*units);
        var y = (App.Height *0.5) + (this.Offset.y*units) - (20*units);
        var lineHeight = this._LineHeight*units;
        var introOffset = (this.IntroLines+2) * lineHeight;
        var taskOffset = (this.TaskLines) * lineHeight;
        var splashOffset = App.Width * this.Offset2.x;

        ctx.globalAlpha = 1;
        ctx.textAlign = "center";
        App.FillColor(ctx,App.Palette[App.ThemeManager.Txt]);




        // SPLASH //

        if (this.Offset2.x > -1) { // draw if on screen

            var mes = this.Text.Splash1.Message;
            var yes = this.Text.Splash1.Y.toUpperCase();
            var no = this.Text.Splash1.N.toUpperCase();
            if (App.Blocks.length) {
                mes = this.Text.Splash2.Message;
                yes = this.Text.Splash2.Y.toUpperCase();
                no = this.Text.Splash2.N.toUpperCase();


                // BG //
                App.FillColor(ctx,App.Palette[2]);
                ctx.globalAlpha = 0.16;
                ctx.fillRect((App.Width*0.5) + splashOffset - (140*units), (App.Height*0.5) - (55*units), (280*units),(140*units));
                ctx.globalAlpha = 0.9;
                ctx.fillRect((App.Width*0.5) + splashOffset - (140*units), (App.Height*0.5) - (60*units), (280*units),(140*units));

                ctx.globalAlpha = 1;
                App.FillColor(ctx,App.Palette[App.ThemeManager.Txt]);
            }

            ctx.font = headerType;
            ctx.fillText(mes, (App.Width*0.5) + splashOffset, (App.Height*0.5) - (10*units));

            var padding = 60*units;
            var iconY = (App.Height*0.5) + (20*units);

            ctx.font = midType;
            ctx.fillText(yes, (App.Width*0.5) - padding + splashOffset, iconY + (30*units));
            ctx.fillText(no, (App.Width*0.5) + padding + splashOffset, iconY + (30*units));

            var ym = 1;
            var nm = 1;

            if (this._RollOvers[0]) {
                ym = 1.2;
            }
            if (this._RollOvers[1]) {
                nm = 1.2;
            }

            App.StrokeColor(ctx,App.Palette[App.ThemeManager.Txt]);
            ctx.lineWidth = 2;

            /*// TICK //
             ctx.beginPath();
             ctx.moveTo((App.Width*0.5) - padding + splashOffset - ((12*ym)*units), iconY);
             ctx.lineTo((App.Width*0.5) - padding + splashOffset - ((4*ym)*units), iconY + ((8*ym)*units));
             ctx.lineTo((App.Width*0.5) - padding + splashOffset + ((12*ym)*units), iconY - ((8*ym)*units));


             // CROSS //
             ctx.moveTo((App.Width*0.5) + padding + splashOffset - ((8*nm)*units), iconY - ((8*nm)*units));
             ctx.lineTo((App.Width*0.5) + padding + splashOffset + ((8*nm)*units), iconY + ((8*nm)*units));
             ctx.moveTo((App.Width*0.5) + padding + splashOffset + ((8*nm)*units), iconY - ((8*nm)*units));
             ctx.lineTo((App.Width*0.5) + padding + splashOffset - ((8*nm)*units), iconY + ((8*nm)*units));
             ctx.stroke();*/

            // TOUR //
            ctx.beginPath();

            // SINGLE //
            /*ctx.moveTo((App.Width*0.5) - padding + splashOffset - ((16*ym)*units), iconY);
            ctx.lineTo((App.Width*0.5) - padding + splashOffset - ((14*ym)*units), iconY + (((2*ym)*units)*this.AnimatePolarity));

            ctx.moveTo((App.Width*0.5) - padding + splashOffset - ((12*ym)*units), iconY + (((4*ym)*units)*this.AnimatePolarity));
            ctx.lineTo((App.Width*0.5) - padding + splashOffset - ((8*ym)*units), iconY + (((8*ym)*units)*this.AnimatePolarity));
            ctx.lineTo((App.Width*0.5) - padding + splashOffset + ((8*ym)*units), iconY - (((8*ym)*units)*this.AnimatePolarity));
            ctx.lineTo((App.Width*0.5) - padding + splashOffset + ((12*ym)*units), iconY - (((4*ym)*units)*this.AnimatePolarity));

            ctx.moveTo((App.Width*0.5) - padding + splashOffset + ((14*ym)*units), iconY - (((2*ym)*units)*this.AnimatePolarity));
            ctx.lineTo((App.Width*0.5) - padding + splashOffset + ((16*ym)*units), iconY);*/


            // DOUBLE //
            ctx.moveTo((App.Width*0.5) - padding + splashOffset - ((16*ym)*units), iconY + (((4*ym)*units)*this.AnimatePolarity));
            ctx.lineTo((App.Width*0.5) - padding + splashOffset - ((14*ym)*units), iconY + (((6*ym)*units)*this.AnimatePolarity));

            ctx.moveTo((App.Width*0.5) - padding + splashOffset - ((12*ym)*units), iconY + (((8*ym)*units)*this.AnimatePolarity));
            ctx.lineTo((App.Width*0.5) - padding + splashOffset - ((8*ym)*units), iconY + (((12*ym)*units)*this.AnimatePolarity));
            ctx.lineTo((App.Width*0.5) - padding + splashOffset + ((8*ym)*units), iconY - (((4*ym)*units)*this.AnimatePolarity));
            ctx.lineTo((App.Width*0.5) - padding + splashOffset + ((12*ym)*units), iconY);

            /*ctx.moveTo((App.Width*0.5) - padding + splashOffset + ((14*ym)*units), iconY + (((2*ym)*units)*this.AnimatePolarity));
            ctx.lineTo((App.Width*0.5) - padding + splashOffset + ((16*ym)*units), iconY + (((4*ym)*units)*this.AnimatePolarity));


            ctx.moveTo((App.Width*0.5) - padding + splashOffset - ((16*ym)*units), iconY - (((4*ym)*units)*this.AnimatePolarity));
            ctx.lineTo((App.Width*0.5) - padding + splashOffset - ((14*ym)*units), iconY - (((2*ym)*units)*this.AnimatePolarity));*/

            ctx.moveTo((App.Width*0.5) - padding + splashOffset - ((12*ym)*units), iconY);
            ctx.lineTo((App.Width*0.5) - padding + splashOffset - ((8*ym)*units), iconY + (((4*ym)*units)*this.AnimatePolarity));
            ctx.lineTo((App.Width*0.5) - padding + splashOffset + ((8*ym)*units), iconY - (((12*ym)*units)*this.AnimatePolarity));
            ctx.lineTo((App.Width*0.5) - padding + splashOffset + ((12*ym)*units), iconY - (((8*ym)*units)*this.AnimatePolarity));

            ctx.moveTo((App.Width*0.5) - padding + splashOffset + ((14*ym)*units), iconY - (((6*ym)*units)*this.AnimatePolarity));
            ctx.lineTo((App.Width*0.5) - padding + splashOffset + ((16*ym)*units), iconY - (((4*ym)*units)*this.AnimatePolarity));


            // MOUNTAIN //
            /*ctx.moveTo((App.Width*0.5) - padding + splashOffset - ((16*ym)*units), iconY);
            ctx.lineTo((App.Width*0.5) - padding + splashOffset - ((8*ym)*units), iconY - (((8*ym)*units)*this.AnimatePolarity));
            ctx.lineTo((App.Width*0.5) - padding + splashOffset - ((4*ym)*units), iconY - (((4*ym)*units)*this.AnimatePolarity));

            ctx.moveTo((App.Width*0.5) - padding + splashOffset - ((20*ym)*units), iconY + (((4*ym)*units)*this.AnimatePolarity));
            ctx.lineTo((App.Width*0.5) - padding + splashOffset - ((12*ym)*units), iconY + (((4*ym)*units)*this.AnimatePolarity));

            ctx.moveTo((App.Width*0.5) - padding + splashOffset - ((16*ym)*units), iconY + (((8*ym)*units)*this.AnimatePolarity));
            ctx.lineTo((App.Width*0.5) - padding + splashOffset + ((8*ym)*units), iconY + (((8*ym)*units)*this.AnimatePolarity));

            ctx.moveTo((App.Width*0.5) - padding + splashOffset - ((8*ym)*units), iconY + (((4*ym)*units)*this.AnimatePolarity));
            ctx.lineTo((App.Width*0.5) - padding + splashOffset + ((8*ym)*units), iconY - (((12*ym)*units)*this.AnimatePolarity));
            ctx.lineTo((App.Width*0.5) - padding + splashOffset + ((20*ym)*units), iconY);
*/



            // SKIP //
            ctx.moveTo((App.Width*0.5) + padding + splashOffset - ((8*nm)*units), iconY - ((8*nm)*units));
            ctx.lineTo((App.Width*0.5) + padding + splashOffset, iconY);
            ctx.lineTo((App.Width*0.5) + padding + splashOffset - ((8*nm)*units), iconY + ((8*nm)*units));

            ctx.moveTo((App.Width*0.5) + padding + splashOffset, iconY - ((8*nm)*units));
            ctx.lineTo((App.Width*0.5) + padding + splashOffset + ((8*nm)*units), iconY);
            ctx.lineTo((App.Width*0.5) + padding + splashOffset, iconY + ((8*nm)*units));
            ctx.stroke();


            App.StrokeColor(ctx,App.Palette[1]);
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo((App.Width*0.5) + splashOffset, (App.Height*0.5) + (5*units));
            ctx.lineTo((App.Width*0.5) + splashOffset, (App.Height*0.5) + (55*units));
            ctx.stroke();

        }







        // SIDEBAR //

        if (this.Offset.x > -20) { //draw if on screen

            // TASK NUMBER //
            ctx.textAlign = "left";
            ctx.font = headerType;
            var numberText = "0"+this.CurrentScene+"/0"+(this.TotalScenes);
            var numberWidth = ctx.measureText(numberText).width;
            ctx.fillText(numberText, x, y - (20*units));


            // UNDERLINE //
            App.StrokeColor(ctx,App.Palette[App.ThemeManager.Txt]);
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + (this.TextWidth*units), y);
            ctx.stroke();


            // CLOSE //
            /*ctx.beginPath();
             ctx.moveTo(App.Width - (20*units), y - (20*units));
             ctx.lineTo(App.Width - (35*units), y - (35*units));
             ctx.moveTo(App.Width - (35*units), y - (20*units));
             ctx.lineTo(App.Width - (20*units), y - (35*units));
             ctx.stroke();*/






            // SMALL SKIP BUTTON //
            var btnY = 50*units;
            ctx.font = midType;
            var btnTxt = "";

            var roll = 0;
            if (this._RollOvers[2]) {
                roll = units;
            }

            if (this.CurrentScene < this.TotalScenes) {
                btnTxt = this.Text.SkipButton.toUpperCase();
                ctx.fillText(btnTxt, x + (10*units), y + btnY + (14*units) + introOffset + taskOffset);


                ctx.beginPath();
                ctx.moveTo(x - roll, y + btnY + introOffset + taskOffset - roll);
                ctx.lineTo(x + (20*units) + this._SkipBtnWidth + roll, y + btnY + introOffset + taskOffset - roll);
                ctx.lineTo(x + (20*units) + this._SkipBtnWidth + roll, y + btnY + (20*units) + introOffset + taskOffset + roll);
                ctx.lineTo(x - roll, y + btnY + (20*units) + introOffset + taskOffset + roll);
                ctx.closePath();
                ctx.stroke();


            } else {
                taskOffset = (this.TaskLines-2) * lineHeight;
                btnTxt = this.Text.DoneButton.toUpperCase();
                ctx.fillText(btnTxt, x + (10*units), y + btnY + (14*units) + introOffset + taskOffset);


                ctx.beginPath();
                ctx.moveTo(x - roll, y + btnY + introOffset + taskOffset - roll);
                ctx.lineTo(x + (20*units) + this._DoneBtnWidth + roll, y + btnY + introOffset + taskOffset - roll);
                ctx.lineTo(x + (20*units) + this._DoneBtnWidth + roll, y + btnY + (20*units) + introOffset + taskOffset + roll);
                ctx.lineTo(x - roll, y + btnY + (20*units) + introOffset + taskOffset + roll);
                ctx.closePath();
                ctx.stroke();

                // TOUR COMPLETE //
                //ctx.fillText(this.Text.TourComplete, x + numberWidth + (10*units), y - (20*units));
                // TICK //
                var yx = x + numberWidth + (20*units);
                var yy = y - (28*units);
                ctx.beginPath();
                ctx.moveTo(yx - (12*units), yy);
                ctx.lineTo(yx - (4*units), yy + (8*units));
                ctx.lineTo(yx + (12*units), yy - (8*units));
                ctx.stroke();
            }






            // COPY //
            ctx.font = italicType;
            var string = this.Text.Scenes[this.CurrentScene-1].Intro;
            this.WordWrap(ctx,string, x, y + (25*units),lineHeight,this.TextWidth*units);
            var string = this.Text.Scenes[this.CurrentScene-1].Task;
            if (string!=="") {
                this.WordWrap(ctx,string, x, y + (25*units) + introOffset,lineHeight,this.TextWidth*units);


                // TASK DOT //
                var dx = x - (10*units);
                var dy = y + (22*units) + introOffset;
                ctx.beginPath();
                ctx.moveTo(dx, dy - (2*units));
                ctx.lineTo(dx + (2*units), dy);
                ctx.lineTo(dx, dy + (2*units));
                ctx.lineTo(dx - (2*units), dy);
                ctx.closePath();
                ctx.fill();

                var size = 5;
                ctx.beginPath();
                ctx.moveTo(dx, dy - (size*units));
                ctx.lineTo(dx + (size*units), dy);
                ctx.lineTo(dx, dy + (size*units));
                ctx.lineTo(dx - (size*units), dy);
                ctx.closePath();
                ctx.stroke();

            }
        }
    }

    AnimateButton() {
        this._AnimateCount += 1;
        if (this._AnimateCount>60) {
            this.DelayTo(this,-this.AnimatePolarity,0.3,0,"AnimatePolarity");
            this._AnimateCount = 0;
        }
    }


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
                if (idx==1) {
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
        if  (idx > 0) {
            context.fillText( words.join(' '), x, y + (lineHeight*currentLine) );
        }
    }

    LineCount( context , text, fitWidth) {
        fitWidth = fitWidth || 0;

        if (fitWidth <= 0) {
            return 1;
        }
        var words = text.split(' ');
        var currentLine = 0;
        var idx = 1;
        while (words.length > 0 && idx <= words.length) {
            var str = words.slice(0,idx).join(' ');
            var w = context.measureText(str).width;
            if ( w > fitWidth ) {
                if (idx==1) {
                    idx=2;
                }
                currentLine++;
                words = words.splice(idx-1);
                idx = 1;
            }
            else
            {idx++;}
        }
        return currentLine;
    }

    NumberWithCommas(x) {
        return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
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
    }


    //-------------------------------------------------------------------------------------------
    //  INTERACTION
    //-------------------------------------------------------------------------------------------

    OpenSplash() {
        this.SplashOpen = true;
        this.DelayTo(this.Offset2,0,1,0,"x");
        if (App.Stage) {
            if (App.MainScene.Header.DropDown) {
                App.MainScene.Header.ClosePanel();
            }
        }
        if (this.Open) {
            this.ClosePanel();
        }
    }

    CloseSplash() {
        this.SplashOpen = false;
        this.DelayTo(this.Offset2,-1,0.6,0,"x");
    }

    OpenPanel() {
        if (App.Blocks.length) {
            App.Stage.MainScene.ResetScene();
        }
        App.MainScene.ZoomButtons.ZoomReset(false);
        this.OptionsInteract = false;
        this.CurrentScene = 1;
        this.Open = true;
        this.CountIntroLines();
        this.DelayTo(this.Offset,this.TextWidth + 20,1,0,"x");
    }

    ClosePanel() {
        this.Open = false;
        App.MainScene.TutorialHotspots.Points = [];
        this.WatchedBlocks = [];
        this.DelayTo(this.Offset,-20,0.5,0,"x");
    }

    NextScene() {
        var t = 0.4;
        this.DelayTo(this.Offset,-20,t,0,"x");
        var that = this;
        setTimeout(function(){
            that.CurrentScene += 1;
            that.CountIntroLines();
            that.DelayTo(that.Offset,that.TextWidth + 20,t,0,"x");
        },(t*1000));
    }

    Skip() {
        App.SkipTutorial = true;
    }

    UpdateHotspots() {
        var ctx = this.Ctx;
        var units = App.Unit;
        var header = App.MainScene.Header;
        var menuH = (header.Height * header.Rows)*units;
        var itemWidth = App.Width / (header.ItemsPerPage+1);
        var hotspots = [];
        var itemX;

        switch (this.CurrentScene) {
            case 1: // CREATE TONE
                if (!this.WatchedBlocks[0]) {
                    if (header.DropDown && header.MenuItems[0].Selected) {
                        if (header.MenuItems[0].CurrentPage===0) {
                            itemX = this.GutterCheck(0,itemWidth,header.MenuItems[0],units);
                            hotspots.push(new Point(itemX,menuH + (header.DropDown*units)));
                        }
                    } else {
                        hotspots.push(new Point(header.MenuItems[0].Position.x,menuH));
                    }
                }
                break;

            case 2: // CREATE KEYBOARD
                if (!this.WatchedBlocks[1]) {
                    if (header.DropDown && header.MenuItems[3].Selected) {
                        if (header.MenuItems[3].CurrentPage === 0) {
                            itemX = this.GutterCheck(0,itemWidth,header.MenuItems[3],units);
                            hotspots.push(new Point(itemX, menuH + (header.DropDown * units)));
                        }
                    } else {
                        hotspots.push(new Point(header.MenuItems[3].Position.x, menuH));
                    }
                }
                break;

            case 3: // CREATE CHOPPER
                if (!this.WatchedBlocks[4]) {
                    if (header.DropDown && header.MenuItems[1].Selected) {
                        if (header.MenuItems[1].CurrentPage === 0) {
                            itemX = this.GutterCheck(3,itemWidth,header.MenuItems[1],units);
                            hotspots.push(new Point(itemX, menuH + (header.DropDown * units)));
                        }
                    } else {
                        hotspots.push(new Point(header.MenuItems[1].Position.x, menuH));
                    }
                }
                break;

            case 4: // CHOPPER OPTIONS
                if (this.WatchedBlocks[3]) {
                    if (!App.MainScene.IsDraggingABlock) {
                        var blockPos = new Point(this.WatchedBlocks[3].Position.x,this.WatchedBlocks[3].Position.y + 2);
                        blockPos = App.Metrics.PointOnGrid(blockPos);
                        hotspots.push(new Point(blockPos.x, blockPos.y + (6*units)));
                    }
                }
                break;

            case 5: // TRASH KEYBOARD
                if (this.WatchedBlocks[1]) {
                    if (!App.MainScene.IsDraggingABlock) {
                        var blockPos = new Point(this.WatchedBlocks[1].Position.x,this.WatchedBlocks[1].Position.y + 2);
                        blockPos = App.Metrics.PointOnGrid(blockPos);
                        hotspots.push(new Point(blockPos.x, blockPos.y + (6*units)));
                    }
                    hotspots.push(new Point(App.Width - (46*units),App.Height - (30*units)));
                }
                break;

            case 6: // CREATE PARTICLE EMITTER
                if (!this.WatchedBlocks[5]) {
                    if (header.DropDown && header.MenuItems[2].Selected) {
                        if (header.MenuItems[2].CurrentPage === 0) {
                            itemX = this.GutterCheck(0,itemWidth,header.MenuItems[2],units);
                            hotspots.push(new Point(itemX, menuH + (header.DropDown * units)));
                        }
                    } else {
                        hotspots.push(new Point(header.MenuItems[2].Position.x, menuH));
                    }


                }
                if (!this.WatchedBlocks[5] || App.MainScene.IsDraggingABlock) {
                    var blockPos = new Point(this.WatchedBlocks[0].Position.x,this.WatchedBlocks[0].Position.y + 12);
                    blockPos = App.Metrics.PointOnGrid(blockPos);
                    hotspots.push(new Point(blockPos.x, blockPos.y));
                }
                break;

            case 7: // CREATE POWER
                if (!this.WatchedBlocks[6]) {
                    if (header.DropDown && header.MenuItems[2].Selected) {
                        if (header.MenuItems[2].CurrentPage === 0) {
                            itemX = this.GutterCheck(1,itemWidth,header.MenuItems[2],units);
                            hotspots.push(new Point(itemX, menuH + (header.DropDown * units)));
                        }
                    } else {
                        hotspots.push(new Point(header.MenuItems[2].Position.x, menuH));
                    }
                }
                break;

            default:
                break;
        }

        App.MainScene.TutorialHotspots.Points = hotspots;
    }

    GutterCheck(n,w,cat,units) {
        if (cat.Pages===0) {
            return ((w * (n+0.5)) + (20*units));
        } else {
            return (w * (n+1));
        }
    }


    SplashMouseDown(point) {
        this.HitTests(point);

        if (this.SplashOpen) {
            if (this._RollOvers[0]) { // TOUR //
                this.OpenPanel();
            }
            if (this._RollOvers[1]) {
                this.Skip();
            }
            this.CloseSplash();
        }
    }

    MouseDown(point) {
        this.HitTests(point);

        if (this._RollOvers[2]) { // SKIP 2 //
            this.ClosePanel();
            this.Skip();
        }
    }

    MouseUp(point) {
    }

    MouseMove(point) {
        this.HitTests(point);
    }

    HitTests(point) {
        var ctx = this.Ctx;
        var units = App.Unit;
        var x = App.Width - (this.Offset.x*units);
        var y = (App.Height *0.5) + (this.Offset.y*units) - (20*units);
        var btnY = 50*units;
        var lineHeight = this._LineHeight*units;
        var introOffset = (this.IntroLines+2) * lineHeight;
        var taskOffset = (this.TaskLines) * lineHeight;
        var padding = 60*units;
        var iconY = (App.Height*0.5) + (20*units);

        this._RollOvers[0] = Dimensions.HitRect((App.Width*0.5) - (padding*2), iconY - (20*units),(padding*2),60*units, point.x, point.y); // tour
        this._RollOvers[1] = Dimensions.HitRect((App.Width*0.5), iconY - (20*units),(padding*2),60*units, point.x, point.y); // skip

        if (this.CurrentScene < this.TotalScenes) {
            this._RollOvers[2] = Dimensions.HitRect(x - (10*units), y + btnY + introOffset + taskOffset - (10*units),(40*units) + this._SkipBtnWidth,40*units, point.x, point.y); // skip
        } else {
            taskOffset = (this.TaskLines-2) * lineHeight;
            this._RollOvers[2] = Dimensions.HitRect(x - (10*units), y + btnY + introOffset + taskOffset - (10*units),(40*units) + this._DoneBtnWidth,40*units, point.x, point.y); // done

        }

        this.Hover = false;
        if (this.Open && this._RollOvers[2]) {
            this.Hover = true;
        }
        if (this.SplashOpen && (this._RollOvers[0] || this._RollOvers[1])) {
            this.Hover = true;
        }
    }

    //-------------------------------------------------------------------------------------------
    //  RESIZE
    //-------------------------------------------------------------------------------------------

    Resize() {
        if (this.Text) {
            if (this.Open) {
                this.CountIntroLines();
            }
        }
    }

    CountIntroLines() {
        var units = App.Unit;

        this.Ctx.font = App.Metrics.TxtMid;
        this._SkipBtnWidth = this.Ctx.measureText(this.Text.SkipButton.toUpperCase()).width;
        this._DoneBtnWidth = this.Ctx.measureText(this.Text.DoneButton.toUpperCase()).width;

        var scene = this.Text.Scenes[this.CurrentScene-1];
        this.Ctx.font = App.Metrics.TxtItalic3;
        this.IntroLines = this.LineCount(this.Ctx,scene.Intro,this.TextWidth*units);
        this.TaskLines = this.LineCount(this.Ctx,scene.Task,this.TextWidth*units);
    }
}
