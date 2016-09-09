import Dimensions = Utils.Measurements.Dimensions;
import DisplayObject = etch.drawing.DisplayObject;
import {Device} from '../Device';
import IDisplayContext = etch.drawing.IDisplayContext;
import Size = etch.primitives.Size;
import {IApp} from '../IApp';

declare var App: IApp;

export class SoundcloudPanel extends DisplayObject{

    public Open: boolean;
    public OffsetX: number;
    public OffsetY: number;
    private _CopyJson;
    public SearchString: string;
    private _RollOvers: boolean[];
    private _Page:number = 1;
    private _ItemNo:number = 5;
    private _Blink:number = 0;
    private _SelectedBlock: any;
    private _RandomWords: string[];
    public SearchInputContainer: HTMLElement;
    public SearchInput: HTMLInputElement;

    init(drawTo: IDisplayContext): void {
        super.init(drawTo);

        this.Open = false;
        this.OffsetX = 0;
        this.OffsetY = -this.drawTo.height;

        this._RollOvers = [];
        this.SearchString = "Hello";

        // DOM ELEMENTS //
        this.SearchInputContainer = <HTMLElement>document.getElementById("soundCloudSearch");
        this.SearchInput = <HTMLInputElement>document.getElementById("soundCloudSearchInput");

        this.SearchInput.addEventListener(
            'input',
            (event):void => {
                this.TestString(this.SearchInput);
                this.UpdateString(this.SearchInput);
            }
        );

        this.SearchInput.addEventListener(
            'keydown',
            (event):void => {
                this.EnterCheck(event);
            }
        );

        this._CopyJson = {
            titleLine: "Title",
            searchLine: "Search SoundCloud",
            randomLine: "Randomise",
            saving: "saving...",
            noResults: "No results found"
        };

        var colors = ['black','grey','white','red','yellow','pink','green','orange','purple','blue','cream'];
        var animals = ['cat','dog','horse','rat','deer','snake','bat','mouse','wolf','hound','fox','bird'];
        var places = ['home','house','work','country','county','land','mountain','lake','sea','valley','desert','plains','ocean','space','sky','temple','church','shrine'];
        var objects = ['train','car','plane','jet','rocket','satellite','hand','head','back','eyes','legs','mouth','paper','crystal','skull','bones','flag','dust','rock','metal','plant','flower','sun','moon','day','night','gun','blood','gang','sample','drum','clap','echo','sound','song'];
        var descriptions = ['wet','dry','hot','cold','good','bad','evil','soft','hard','light','dark','heavy','clean','dirty','short','long','royal','magic','holy'];
        this._RandomWords = colors.concat(animals,places,objects,descriptions);
    }


    //-------------------------------------------------------------------------------------------
    //  INPUT
    //-------------------------------------------------------------------------------------------



    // DOES INPUT STRING NEED CHARS REMOVED //
    TestString(element: HTMLInputElement) {

        var caretPos = element.selectionStart;
        if (caretPos > 0) {
            caretPos -= 1;
        }
        // [^A-Za-z0-9_] alpha-numeric
        // 	[][!"#$%&'()*+,./:;<=>?@\^_`{|}~-] punctuation
        // [.,\/#!$%\^&\*;:{}=\-_`~()] punctuation 2
        if (/[.,\/#\?\"\'$£%\^&\*;:{|}<=>\\@\`\+~()]/.test(element.value)) {
            element.value = element.value.replace(/[.,\/#\?\"\'$£%\^&\*;:{|}<=>\\@\`\+~()]/g, '');
            element.selectionStart = caretPos;
            element.selectionEnd = caretPos;
        }
    }

    // TITLE INPUT HAS CHANGED, USE UPDATED INPUT VALUE //
    UpdateString(element: HTMLInputElement) {
        var string: string = element.value;
        this.SearchString = string;
    }


    // SET A PROVIDED DOM ELEMENT'S STRING //
    UpdateFormText(element: HTMLInputElement, str: string) {
        element.value = str;
    }

    // ENTER PRESSED ON INPUT //
    EnterCheck(e: any) {
        var key = e.which || e.keyCode;
        if (key === 13) {
            this.Submit();
        }
    }

    Submit() {
        this.SearchInput.blur();
        this._SelectedBlock.SearchString = this.SearchString;
        this._SelectedBlock.Search(this.SearchString);
        this._Page = 1;
        this.OffsetX = 0;

        this.ClearScroll();
    }

    /*GetString() {
        return this.SearchString;
    }

    UpdateString(string) {
        this.SearchString = string;
    }

    StringReturn() {
        this._SelectedBlock.SearchString = this.SearchString;
        this._SelectedBlock.Search(this.SearchString);
        this._Page = 1;
        this.OffsetX = 0;
    }*/

    //-------------------------------------------------------------------------------------------
    //  DRAW
    //-------------------------------------------------------------------------------------------


    draw() {
        var ctx = this.ctx;
        var midType = App.Metrics.TxtMid;
        var headType = App.Metrics.TxtHeader;
        var units = App.Unit;
        var centerY = this.OffsetY + (App.Height * 0.5);
        var appWidth = App.Width;
        var appHeight = App.Height;
        var margin = (appWidth*0.5) - (210*units);
        var pageW = (420*units);

        if (this.Open) {


            // BG //
            App.FillColor(ctx,App.Palette[2]);
            ctx.globalAlpha = 0.95;
            ctx.fillRect(0,this.OffsetY,appWidth,appHeight);
            ctx.globalAlpha = 1;


            // RESULTS //
            App.FillColor(ctx,App.Palette[App.ThemeManager.Txt]);
            App.StrokeColor(ctx,App.Palette[1]);
            ctx.lineWidth = 2;
            var block = this._SelectedBlock;
            var results = block.SearchResults.length;
            var itemNo = this._ItemNo;
            var pageNo = this._Page;
            ctx.font = App.Metrics.TxtItalic;
            ctx.textAlign = "left";


            // TRACKS //
            //clipping path //
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(margin - (5*units), centerY - (100*units));
            ctx.lineTo(margin - (5*units), centerY + (130*units));
            ctx.lineTo(margin + pageW + (10*units), centerY + (130*units));
            ctx.lineTo(margin + pageW + (10*units), centerY - (100*units));
            ctx.closePath();
            ctx.clip();

            // track loop //
            for (var i=0; i<results; i++) {
                var p = Math.floor(i/itemNo);
                var n = i - (p * itemNo);
                var x = this.OffsetX + ((pageW + (10*units)) * p);
                var y = centerY - (70*units) + ((n*40)*units);

                // TODO - try and reduce this some more (if not tweening, just p==(this._Page-1) )
                if (p>(this._Page-3) && p<(this._Page+1)) { // range to draw

                    // divider //
                    if (n<4 && i<(results-1)) {
                        ctx.beginPath();
                        ctx.moveTo(x + margin, y + (12*units));
                        ctx.lineTo(x + margin + pageW, y + (12*units));
                        ctx.stroke();
                    }

                    // rollover //
                    if (p==(this._Page-1)) {
                        if (this._RollOvers[5+n]) {
                            var sy = centerY - (98*units) + ((40*n)*units);
                            App.FillColor(ctx,App.Palette[App.ThemeManager.MenuOrder[3]]);
                            ctx.fillRect(margin - (5*units),sy,pageW + (10*units),40*units);
                            ctx.beginPath();
                            ctx.moveTo((appWidth*0.5), sy + (45*units));
                            ctx.lineTo((appWidth*0.5) - (10*units), sy + (35*units));
                            ctx.lineTo((appWidth*0.5) + (10*units), sy + (35*units));
                            ctx.closePath();
                            ctx.fill();
                        }
                    }

                    // text //
                    App.FillColor(ctx,App.Palette[App.ThemeManager.Txt]);
                    var track = block.SearchResults[i];
                    var title = track.Title;
                    var user = track.User;
                    ctx.fillText(title, x + margin + units, y - (10*units));
                    ctx.fillText("By "+user, x + margin + units, y);


                    // arrow //
                    App.StrokeColor(ctx,App.Palette[App.ThemeManager.Txt]);
                    ctx.beginPath();
                    ctx.moveTo(x + margin + pageW - (25 * units), y - (10.5*units));
                    ctx.lineTo(x + margin + pageW - (20 * units), y - (5.5*units));
                    ctx.lineTo(x + margin + pageW - (15 * units), y - (10.5*units));
                    ctx.stroke();
                    App.StrokeColor(ctx,App.Palette[1]);
                }
            }
            ctx.restore();


            ctx.font = App.Metrics.TxtMid;
            var maxNo = itemNo*pageNo;
            if (maxNo > results) {
                maxNo = results;
            }


            // ITEM NUMBERS //
            if (results > 0) {
                ctx.fillText("" + (1 + (itemNo * (pageNo - 1))) + " - " + maxNo + " of " + results, margin, centerY + (160 * units));
            } else {

                //SEARCHING //
                if (block.Searching) {
                    //App.AnimationsLayer.Spin();
                    App.AnimationsLayer.DrawSprite(ctx,'loading',appWidth*0.5, centerY,16,true);
                }
                // NO RESULTS //
                else {
                    ctx.font = App.Metrics.TxtHeader;
                    ctx.textAlign = "center";
                    ctx.fillText(this._CopyJson.noResults.toLocaleUpperCase(), appWidth*0.5, centerY + (10*units));

                }

            }

            var pageX = margin - (75*units);
            var pageY = -68;
            var arrowX = 275;
            var arrowY = 0;
            if (App.Metrics.Device === Device.tablet) {
                pageX = margin - (45*units);
                arrowX = 245;
            }
            if (App.Metrics.Device === Device.mobile) {
                pageX = appWidth*0.5;
                pageY = 170;
                arrowX = 60;
                arrowY = 160;
            }

            // PAGE NO //
            if (results > itemNo) {
                ctx.font = App.Metrics.TxtHeader;
                var pNo = ""+this._Page;
                var pTotal = ""+Math.ceil(results/itemNo);
                ctx.textAlign = "center";
                ctx.fillText(pNo + "/" + pTotal, pageX, centerY + (pageY*units));
            }



            // BACK ARROW //
            App.StrokeColor(ctx,App.Palette[1]);
            if (this._Page>1) {
                App.StrokeColor(ctx,App.Palette[App.ThemeManager.Txt]);
            }
            ctx.beginPath();
            ctx.moveTo((appWidth*0.5) - (arrowX * units), centerY + ((arrowY-20)*units));
            ctx.lineTo((appWidth*0.5) - ((arrowX+20) * units), centerY + ((arrowY)*units));
            ctx.lineTo((appWidth*0.5) - (arrowX * units), centerY + ((arrowY+20)*units));
            ctx.stroke();


            // FORWARD ARROW //
            App.StrokeColor(ctx,App.Palette[1]);
            if (this._Page < Math.ceil(results/itemNo)) {
                App.StrokeColor(ctx,App.Palette[App.ThemeManager.Txt]);
            }
            ctx.beginPath();
            ctx.moveTo((appWidth*0.5) + (arrowX * units), centerY + ((arrowY-20)*units));
            ctx.lineTo((appWidth*0.5) + ((arrowX+20) * units), centerY + ((arrowY)*units));
            ctx.lineTo((appWidth*0.5) + (arrowX * units), centerY + ((arrowY+20)*units));
            ctx.stroke();


            // TITLE //
            App.StrokeColor(ctx,App.Palette[App.ThemeManager.Txt]);
            ctx.beginPath();
            ctx.moveTo(margin, centerY - (110*units));
            ctx.lineTo(margin + pageW, centerY - (110*units));
            ctx.stroke();
            ctx.textAlign = "left";
            /*ctx.font = headType;
            ctx.fillText(this.SearchString.toUpperCase(), margin, centerY - (120*units) );
            var titleW = ctx.measureText(this.SearchString.toUpperCase()).width;


            // TYPE BAR //
            if (this._Blink > 50) {
                ctx.fillRect(margin + titleW + (5*units),centerY - (143*units),2*units,26*units);
            }
            this._Blink += 1;
            if (this._Blink == 100) {
                this._Blink = 0;
            }*/


            // SEARCH BUTTON //
            ctx.font = midType;
            var searchW = ctx.measureText(this._CopyJson.searchLine.toUpperCase()).width;
            ctx.fillText(this._CopyJson.searchLine.toUpperCase(), (appWidth*0.5) + (205*units) - searchW, centerY - (126*units) );

            ctx.beginPath();
            ctx.moveTo((appWidth*0.5) + (210*units), centerY - (140*units));
            ctx.lineTo((appWidth*0.5) + (200*units) - searchW, centerY - (140*units));
            ctx.lineTo((appWidth*0.5) + (200*units) - searchW, centerY - (120*units));
            ctx.lineTo((appWidth*0.5) + (210*units), centerY - (120*units));
            ctx.closePath();
            ctx.stroke();


            // RANDOM BUTTON //
            searchW = ctx.measureText(this._CopyJson.randomLine.toUpperCase()).width;
            ctx.fillText(this._CopyJson.randomLine.toUpperCase(), (appWidth*0.5) + (210*units) - searchW, centerY + (160*units) );

            var rx = (appWidth*0.5) + (210*units) - (searchW*0.5);
            ctx.beginPath();
            ctx.moveTo(rx - (7.5*units), centerY + (165*units));
            ctx.lineTo(rx - (2.5*units), centerY + (170*units));
            ctx.lineTo(rx + (2.5*units), centerY + (165*units));
            ctx.lineTo(rx + (7.5*units), centerY + (170*units));
            ctx.stroke();

            var clx = 230;
            var cly = 150;
            if (App.Metrics.Device === Device.mobile) {
                clx = 202.5;
                cly = 170;
            }

            // CLOSE BUTTON //
            ctx.beginPath();
            ctx.moveTo((appWidth*0.5) + ((clx-7.5)*units), centerY - ((cly-7.5)*units));
            ctx.lineTo((appWidth*0.5) + ((clx+7.5)*units), centerY - ((cly+7.5)*units));
            ctx.moveTo((appWidth*0.5) + ((clx+7.5)*units), centerY - ((cly-7.5)*units));
            ctx.lineTo((appWidth*0.5) + ((clx-7.5)*units), centerY - ((cly+7.5)*units));
            ctx.stroke();
        }
    }

    WordWrap( context , text, x, y, lineHeight, fitWidth) {
        fitWidth = fitWidth || 0;

        if (fitWidth <= 0)
        {
            context.fillText( text, x, y );
            return;
        }
        var words = text.split(' ');
        var currentLine = 0;
        var idx = 1;
        while (words.length > 0 && idx <= words.length)
        {
            var str = words.slice(0,idx).join(' ');
            var w = context.measureText(str).width;
            if ( w > fitWidth )
            {
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



    //-------------------------------------------------------------------------------------------
    //  TWEEN
    //-------------------------------------------------------------------------------------------


    DelayTo(panel,destination,t,delay,v){

        var offsetTween = new window.TWEEN.Tween({x: panel[""+v]});
        offsetTween.to({x: destination}, t);
        offsetTween.onUpdate(function () {
            panel[""+v] = this.x;

            if (v=="OffsetY") {
                panel.TweenDom(panel.SearchInputContainer, this.x, "y", 152, 0);
            }
        });

        offsetTween.onComplete(function() {
            if (v=="OffsetY") {
                if (destination!==0) {
                    panel.Open = false;
                    panel.HideDom();
                }
            }
        });
        offsetTween.easing(window.TWEEN.Easing.Exponential.InOut);
        offsetTween.delay(delay);
        offsetTween.start(this.lastVisualTick);
    }

    //-------------------------------------------------------------------------------------------
    //  INTERACTION
    //-------------------------------------------------------------------------------------------


    OpenPanel() {
        this._SelectedBlock = App.MainScene.OptionsPanel.SelectedBlock;
        if (!this._SelectedBlock.SearchString) {
            this._SelectedBlock.Search(this.RandomSearch(this._SelectedBlock));
        }

        this._Page = this._SelectedBlock.ResultsPage;
        this.SearchString = this._SelectedBlock.SearchString;
        this.UpdateFormText(this.SearchInput, this.SearchString);
        this.Open = true;
        this.OffsetY = -App.Height;
        this.OffsetX = - ((this._Page-1) * (430*App.Unit));
        this.DelayTo(this,0,500,0,"OffsetY");
        this.ShowDom();
        //App.TypingManager.Enable(this);
    }

    ClosePanel() {
        this._SelectedBlock.ResultsPage = this._Page;
        this.DelayTo(this,-App.Height,500,0,"OffsetY");
        //App.TypingManager.Disable();
    }


    MouseDown(point) {
        this.HitTests(point);

        var block = this._SelectedBlock;

        if (this._RollOvers[1]) { // close
            this.ClosePanel();
            return;
        }
        if (this._RollOvers[2]) { // search
            this.Submit();
            return;
        }
        if (this._RollOvers[10]) { // random
            block.Search(this.RandomSearch(this._SelectedBlock));
            //App.TypingManager.Enable(this);
            this._Page = 1;
            this.OffsetX = 0;
            return;
        }
        if (this._RollOvers[3]) { // back arrow
            if (this._Page > 1) {
                this._Page -= 1;
                this.DelayTo(this,- ((this._Page-1) * (430*App.Unit)),350,0,"OffsetX");
            }
            return;
        }
        if (this._RollOvers[4]) { // next arrow
            if (this._Page < Math.ceil(block.SearchResults.length/this._ItemNo)) {
                this._Page += 1;
                this.DelayTo(this,- ((this._Page-1) * (430*App.Unit)),350,0,"OffsetX");
            }
            return;
        }

        // LOAD SAMPLE //
        for (var i=5; i<10; i++) {
            if (this._RollOvers[i]) {
                var n = ((this._Page-2)*this._ItemNo)+i;
                var track = block.SearchResults[n];
                if (track) {
                    block.LoadTrack(track);
                    this.ClosePanel();
                }
                return;
            }
        }
    }

    MouseUp(point) {
    }

    MouseMove(point) {
        this.HitTests(point);
    }

    HitTests(point) {
        var units = App.Unit;
        var shareX = this.OffsetX + App.Width;
        var centerY = this.OffsetY + (App.Height * 0.5);
        var ctx = this.ctx;
        var midType = App.Metrics.TxtMid;
        var appWidth = App.Width;

        ctx.font = midType;
        var searchW = ctx.measureText(this._CopyJson.searchLine.toUpperCase()).width;
        var randomW = ctx.measureText(this._CopyJson.randomLine.toUpperCase()).width;

        var clx = 230;
        var cly = 150;
        var arrowX = 285;
        var arrowY = 0;
        if (App.Metrics.Device === Device.tablet) {
            arrowX = 255;
        }
        if (App.Metrics.Device === Device.mobile) {
            clx = 202.5;
            cly = 170;
            arrowX = 70;
            arrowY = 160;
        }

        this._RollOvers[0] = Dimensions.hitRect(shareX + (appWidth*0.5) - (210*units), centerY - (20*units),420*units,40*units, point.x, point.y); // url
        this._RollOvers[1] = Dimensions.hitRect((appWidth*0.5) + ((clx-20)*units), centerY - ((cly+20)*units),40*units,40*units, point.x, point.y); // close
        this._RollOvers[2] = Dimensions.hitRect((appWidth*0.5) + (200*units) - searchW, centerY - (150*units),searchW + (10*units),40*units, point.x, point.y); // search
        this._RollOvers[3] = Dimensions.hitRect((appWidth*0.5) - ((arrowX+15)*units),centerY + (units*(arrowY-20)),30*units,40*units, point.x, point.y); // back
        this._RollOvers[4] = Dimensions.hitRect((appWidth*0.5) + ((arrowX-15)*units),centerY + (units*(arrowY-20)),30*units,40*units, point.x, point.y); // next

        this._RollOvers[5] = Dimensions.hitRect((appWidth*0.5) - (210*units),centerY - (units*98),420*units,40*units, point.x, point.y); // 1
        this._RollOvers[6] = Dimensions.hitRect((appWidth*0.5) - (210*units),centerY - (units*58),420*units,40*units, point.x, point.y); // 2
        this._RollOvers[7] = Dimensions.hitRect((appWidth*0.5) - (210*units),centerY - (units*18),420*units,40*units, point.x, point.y); // 3
        this._RollOvers[8] = Dimensions.hitRect((appWidth*0.5) - (210*units),centerY + (units*22),420*units,40*units, point.x, point.y); // 4
        this._RollOvers[9] = Dimensions.hitRect((appWidth*0.5) - (210*units),centerY + (units*62),420*units,40*units, point.x, point.y); // 5

        this._RollOvers[10] = Dimensions.hitRect((appWidth*0.5) + (205*units) - randomW, centerY + (136*units),randomW + (10*units),40*units, point.x, point.y); // random
    }

    resize() {
        this.OffsetX = - ((this._Page-1) * (430*App.Unit));

        this.ClearScroll();
        if (this.SearchInput) {
            this.StyleDom(this.SearchInputContainer, 300, 42, 210, 152, 0, App.Metrics.TxtHeaderPR);
        }
    }

    RandomSearch(block) {
        var words = this._RandomWords;
        var q = ""+ words[Math.floor(Math.random()*words.length)] + " " + words[Math.floor(Math.random()*words.length)];

        this.SearchString = q;
        block.SearchString = q;
        this.UpdateFormText(this.SearchInput, q);
        return q;
    }


    //-------------------------------------------------------------------------------------------
    //  CSS / DOM
    //-------------------------------------------------------------------------------------------


    TweenDom(element: HTMLElement, value: number, mode: string, position: number, offset: number) {
        var units = (App.Unit);
        var pr = App.Metrics.PixelRatio;
        switch (mode) {
            case "x":
                element.style.left = "" + ((value + (App.Width*(0.5 + offset)) - (units*position))/pr) + "px";
                break;
            case "y":
                element.style.top = "" + ((value + (App.Height*0.5) - (units*position))/pr) + "px";
                break;
        }
    }

    StyleDom(element: HTMLElement, width: number, height: number, x: number, y: number, xOffset: number, font: string) {
        var units = (App.Unit);
        var pr = App.Metrics.PixelRatio;

        element.style.font = font;
        element.style.width = "" + (units*(width/pr)) + "px";
        element.style.height = "" + (units*(height/pr)) + "px";
        element.style.lineHeight = "" + (units*(height/pr)) + "px";
        element.style.display = "block";

        if (!this.Open) {
            this.OffsetY = -App.Height;
            element.style.display = "none";
            element.style.visibility = "false";
        }

        var offsetX = xOffset/pr;
        var offsetY = this.OffsetY/pr;
        var width = App.Width/pr;
        var height = App.Height/pr;

        element.style.left = "" + (offsetX + (width*0.5) - (units*(x/pr))) + "px";
        element.style.top = "" + (offsetY + (height*0.5) - (units*(y/pr))) + "px";
    }

    ShowDom() {
        var search = this.SearchInputContainer;
        search.style.display = "block";
        search.style.visibility = "true";
    }

    HideDom() {
        var search = this.SearchInputContainer;
        search.style.display = "none";
        search.style.visibility = "false";
    }

    ClearScroll() {
        window.scrollTo(0,0);
    }
}
