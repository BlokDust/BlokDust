import Dimensions = Utils.Measurements.Dimensions;
import DisplayObject = etch.drawing.DisplayObject;
import Size = minerva.Size;
import {IApp} from '../IApp';
import {MainScene} from './../MainScene';

declare var App: IApp;

export class Tutorial extends DisplayObject{

    public Open: boolean;
    public HotSpots: Point[];
    public Scenes: any[];
    public CurrentScene: number;
    public TotalScenes: number;
    public TextLines: number;
    public TextWidth: number;


    Init(drawTo: IDisplayContext): void {
        super.Init(drawTo);
        this.Open = false;
        this.HotSpots = [];
        this.TextLines = 0;

        this.Scenes = [
            {
                paragraphs: [
                    "BlokDust is a collaboration between Luke Twyman, Luke Phillips and Edward Silverton. Developed in Brighton UK and released in 2016, BlokDust uses the Web Audio API and makes use of Tone.js as an audio framework."
                ],
                event: function(){}
            }
        ];

        this.CurrentScene = 0;
        this.TotalScenes = this.Scenes.length;

    }


    //-------------------------------------------------------------------------------------------
    //  DRAW
    //-------------------------------------------------------------------------------------------


    Draw() {
        var ctx = this.Ctx;
        var units = App.Unit;
        var midType = App.Metrics.TxtMid;
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
        offsetTween.to({x: destination}, t);
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


    OpenPanel() {
    }

    ClosePanel() {
    }

    NextScene() {
        this.CurrentScene += 1;
        this.CountSceneLines();
    }

    MouseDown(point) {
        this.HitTests(point);
    }

    MouseUp(point) {
    }

    MouseMove(point) {
        this.HitTests(point);
    }

    HitTests(point) {
        var ctx = this.Ctx;
        var units = App.Unit;

        //this._RollOvers[0] = Dimensions.HitRect(shareX + (appWidth*0.5) - (210*units), centerY - (20*units),420*units,40*units, point.x, point.y); // url
    }

    //-------------------------------------------------------------------------------------------
    //  RESIZE
    //-------------------------------------------------------------------------------------------

    Resize() {
        var units = App.Unit;
        this.TextWidth = 300*units;
        if (this.Scenes) { //TODO: remove condition if Resize() no longer get's called before Init()
            this.CountSceneLines();
        }
        console.log(this.TextLines);
    }

    CountSceneLines() {
        var scene = this.Scenes[this.CurrentScene];
        var lines = 0;

        for (var i=0; i<scene.paragraphs.length; i++) { // for each paragraph in current scene
            lines += this.LineCount(this.Ctx,scene.paragraphs[i],this.TextWidth);
        }
        this.TextLines = lines;
    }
}
