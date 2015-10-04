import Size = minerva.Size;
import {CommandManager} from '../Core/Commands/CommandManager';
import {Commands} from './../Commands';
import {DisplayObject} from '../Core/Drawing/DisplayObject';
import {IApp} from '../IApp';
import {IDisplayContext} from '../Core/Drawing/IDisplayContext';
import {MainScene} from './../MainScene';

declare var App: IApp;

export class SharePanel extends DisplayObject {

    public Open: boolean;
    public OffsetX: number;
    public OffsetY: number;
    private _FirstSession: boolean;
    private _CopyJson;
    public SessionTitle: string;
    public SessionURL: string;
    private _NameUrl: string;
    private _UrlSelecting: boolean;
    private _RollOvers: boolean[];
    private _CommandManager;
    private _Blink:number = 0;
    private _SessionId: string;
    private _Saving: boolean;

    Init(sketch: IDisplayContext): void {
        super.Init(sketch);

        this.Open = false;
        this._FirstSession = true;
        this._Saving = false;
        this._NameUrl = "";
        this.SessionURL = "";
        this._SessionId = "";

        this.OffsetX = 0;
        this.OffsetY = -this.Sketch.Height;

        this._UrlSelecting = false;
        this._RollOvers = [];

        this._CommandManager = App.CommandManager;


        this._CopyJson = {
            genUrl: "Generate share link",
            shareLine: "Made something cool? Generate your own unique link to share it with the world (We'd love to see):",
            copyLine: "Share your creation with this unique URL:",
            titleLine: "Title",
            generateLine: "Randomise Title",
            domain: this.GetUrl() + "?c=",
            facebook: "post to facebook",
            twitter: "post to twitter",
            google: "post to google +",
            bookmark: "bookmark creation",
            save: "overwrite",
            saveAs: "create new",
            saving: "saving...",
            tweetText: "I made this @blokdust creation: "
        };

        if (App.SessionId!==null) {
            this._FirstSession = false;
        }

        this.GetTitleFromUrl();
        this.Resize();
    }

    GetUrl() {
        return [location.protocol, '//', location.host, location.pathname].join('');
    }

    GetTitleFromUrl() {
        var decoded = decodeURI(window.location.href);
        var getName = decoded.split("&t=");
        if (getName.length>1) {
            this.SessionTitle = getName[1].toUpperCase();
            this._NameUrl = "&t=" + encodeURI(getName[1]);
            this.UpdateUrlText();
        } else {
            this.SessionTitle = this.GenerateLabel();
        }
    }

    GetString() {
        return this.SessionTitle;
    }

    UpdateString(string) {
        this.SessionTitle = string;
        this._NameUrl = "&t=" + encodeURI(string.toLowerCase());
        this.UpdateUrlText();
    }

    StringReturn() {

    }

    //-------------------------------------------------------------------------------------------
    //  DRAW
    //-------------------------------------------------------------------------------------------


    Draw() {

        var ctx = this.Ctx;
        var midType = App.Metrics.TxtMid;
        var headType = App.Metrics.TxtHeader;
        var urlType = App.Metrics.TxtUrl2;
        var italicType = App.Metrics.TxtItalic2;
        var units = App.Unit;
        var centerY = this.OffsetY + (App.Height * 0.5);
        var shareX = this.OffsetX + App.Width;
        var buttonY = centerY + (35*units);
        var appWidth = App.Width;
        var appHeight = App.Height;

        if (this.Open) {


            // BG //
            ctx.fillStyle = App.Palette[2];// Black
            ctx.globalAlpha = 0.95;
            ctx.fillRect(0,this.OffsetY,appWidth,appHeight);


            // URL BOX //
            ctx.globalAlpha = 1;
            ctx.fillStyle = App.Palette[1];// Black
            ctx.fillRect(shareX + (appWidth*0.5) - (210*units),centerY - (20*units),420*units,40*units); // solid

            if (this._FirstSession) {

                // GENERATE URL //

                if (this._Saving) {
                    ctx.fillStyle = App.Palette[1];
                } else {
                    ctx.fillStyle = App.Palette[4];
                }
                ctx.fillRect(this.OffsetX + (appWidth * 0.5) - (210 * units), centerY - (20 * units), 420 * units, 40 * units);
                if (this._RollOvers[3] && !this._Saving) {
                    ctx.beginPath();
                    ctx.moveTo(this.OffsetX + (appWidth*0.5), centerY + (29*units));
                    ctx.lineTo(this.OffsetX + (appWidth*0.5) - (10*units), centerY + (19*units));
                    ctx.lineTo(this.OffsetX + (appWidth*0.5) + (10*units), centerY + (19*units));
                    ctx.closePath();
                    ctx.fill();
                }
                ctx.font = urlType;
                ctx.textAlign = "center";
                ctx.strokeStyle = ctx.fillStyle = App.Palette[App.Color.Txt]; // White
                ctx.fillText(this._CopyJson.genUrl.toUpperCase(), this.OffsetX + (appWidth * 0.5), centerY + (9 * units));
                ctx.font = italicType;
                ctx.textAlign = "left";
                this.WordWrap(ctx, this._CopyJson.shareLine, this.OffsetX + (appWidth * 0.5) - (210 * units), centerY - (59 * units), 14 * units, 210 * units);
            } else {

                // SAVE & SAVE AS //
                if (this._Saving) {
                    ctx.fillStyle = App.Palette[1];
                } else {
                    ctx.fillStyle = App.Palette[4];
                }
                ctx.fillRect(this.OffsetX + (appWidth * 0.5) - (210 * units), centerY - (20 * units), 202.5 * units, 40 * units);
                if (this._RollOvers[4] && !this._Saving) {
                    ctx.beginPath();
                    ctx.moveTo(this.OffsetX + (appWidth*0.5) - (108.75*units), centerY + (29*units));
                    ctx.lineTo(this.OffsetX + (appWidth*0.5) - (118.75*units), centerY + (19*units));
                    ctx.lineTo(this.OffsetX + (appWidth*0.5) - (98.75*units), centerY + (19*units));
                    ctx.closePath();
                    ctx.fill();
                }
                if (this._Saving) {
                    ctx.fillStyle = App.Palette[1];
                } else {
                    ctx.fillStyle = App.Palette[5];
                }
                ctx.fillRect(this.OffsetX + (appWidth * 0.5) + (7.5 * units), centerY - (20 * units), 202.5 * units, 40 * units);
                if (this._RollOvers[5] && !this._Saving) {
                    ctx.beginPath();
                    ctx.moveTo(this.OffsetX + (appWidth*0.5) + (108.75*units), centerY + (29*units));
                    ctx.lineTo(this.OffsetX + (appWidth*0.5) + (118.75*units), centerY + (19*units));
                    ctx.lineTo(this.OffsetX + (appWidth*0.5) + (98.75*units), centerY + (19*units));
                    ctx.closePath();
                    ctx.fill();
                }
                ctx.font = urlType;
                ctx.textAlign = "center";
                ctx.strokeStyle = ctx.fillStyle = App.Palette[App.Color.Txt]; // White
                ctx.fillText(this._CopyJson.save.toUpperCase(), this.OffsetX + (appWidth * 0.5) - (108.75 * units), centerY + (9 * units));
                ctx.fillText(this._CopyJson.saveAs.toUpperCase(), this.OffsetX + (appWidth * 0.5) + (108.75 * units), centerY + (9 * units));
                ctx.font = italicType;
                ctx.textAlign = "left";
                this.WordWrap(ctx, this._CopyJson.shareLine, this.OffsetX + (appWidth * 0.5) - (210 * units), centerY - (59 * units), 14 * units, 210 * units);

                // SKIP //
                ctx.lineWidth = 2;
                ctx.strokeStyle = App.Palette[App.Color.Txt]; // White
                ctx.beginPath();
                ctx.moveTo( this.OffsetX + (appWidth*0.5) + (275 * units), centerY - (20*units));
                ctx.lineTo( this.OffsetX + (appWidth*0.5) + (295 * units), centerY);
                ctx.lineTo( this.OffsetX + (appWidth*0.5) + (275 * units), centerY + (20*units));
                ctx.stroke();
                ctx.font = midType;
                ctx.fillText("SKIP", this.OffsetX + (appWidth * 0.5) + (275 * units), centerY + (35 * units));
            }

            // SAVE MESSAGE //
            if (this._Saving) {
                ctx.font = midType;
                ctx.textAlign = "center";
                ctx.fillText(this._CopyJson.saving.toUpperCase(), this.OffsetX + (appWidth * 0.5), centerY + (75 * units));
                App.AnimationsLayer.Spin();
                App.AnimationsLayer.DrawSprite('loading',appWidth*0.5, centerY + (50 * units),16,true);
            }

            // BACK ARROW //
            ctx.lineWidth = 2;
            ctx.strokeStyle = App.Palette[App.Color.Txt]; // White
            ctx.beginPath();
            ctx.moveTo(shareX + (appWidth*0.5) - (275 * units), centerY - (20*units));
            ctx.lineTo(shareX + (appWidth*0.5) - (295 * units), centerY);
            ctx.lineTo(shareX + (appWidth*0.5) - (275 * units), centerY + (20*units));
            ctx.stroke();


            // SHARE BUTTONS //
            ctx.fillStyle = "#fc4742";// gp
            ctx.fillRect(shareX + (appWidth*0.5) + (80*units),buttonY,130*units,30*units);
            if (this._RollOvers[8]) {
                ctx.beginPath();
                ctx.moveTo(shareX + (appWidth*0.5) + (145*units), buttonY + (39*units));
                ctx.lineTo(shareX + (appWidth*0.5) + (135*units), buttonY + (29*units));
                ctx.lineTo(shareX + (appWidth*0.5) + (155*units), buttonY + (29*units));
                ctx.closePath();
                ctx.fill();
            }
            ctx.fillStyle = "#2db0e7"; // tw
            ctx.fillRect(shareX + (appWidth*0.5) - (65*units),buttonY,130*units,30*units);
            if (this._RollOvers[7]) {
                ctx.beginPath();
                ctx.moveTo(shareX + (appWidth*0.5), buttonY + (39*units));
                ctx.lineTo(shareX + (appWidth*0.5) - (10*units), buttonY + (29*units));
                ctx.lineTo(shareX + (appWidth*0.5) + (10*units), buttonY + (29*units));
                ctx.closePath();
                ctx.fill();
            }
            ctx.fillStyle = "#2152ad"; // fb
            ctx.fillRect(shareX + (appWidth*0.5) - (210*units),buttonY,130*units,30*units);
            if (this._RollOvers[6]) {
                ctx.beginPath();
                ctx.moveTo(shareX + (appWidth*0.5) - (145*units), buttonY + (39*units));
                ctx.lineTo(shareX + (appWidth*0.5) - (135*units), buttonY + (29*units));
                ctx.lineTo(shareX + (appWidth*0.5) - (155*units), buttonY + (29*units));
                ctx.closePath();
                ctx.fill();
            }

            // SHARE COPY //
            ctx.strokeStyle = ctx.fillStyle = App.Palette[App.Color.Txt]; // White
            ctx.textAlign = "left";
            ctx.font = midType;
            ctx.font = italicType;
            ctx.fillText(this._CopyJson.copyLine, shareX + (appWidth*0.5) - (210*units), centerY - (33*units) );
            ctx.textAlign = "center";
            ctx.font = midType;
            ctx.fillText(this._CopyJson.facebook.toUpperCase(), shareX + (appWidth*0.5) - (145*units), buttonY + (18.5*units) );
            ctx.fillText(this._CopyJson.twitter.toUpperCase(), shareX + (appWidth*0.5), buttonY + (18.5*units) );
            ctx.fillText(this._CopyJson.google.toUpperCase(), shareX + (appWidth*0.5)  + (145*units), buttonY + (18.5*units) );


            // TITLE //
            ctx.textAlign = "right";
            ctx.fillText(this._CopyJson.titleLine.toUpperCase(), (appWidth*0.5) - (225*units), centerY - (106*units) );
            ctx.beginPath();
            ctx.moveTo((appWidth*0.5) - (210*units), centerY - (90*units));
            ctx.lineTo((appWidth*0.5) + (210*units), centerY - (90*units));
            ctx.stroke();
            ctx.textAlign = "left";
            ctx.font = headType;
            ctx.fillText(this.SessionTitle, (appWidth*0.5) - (210*units), centerY - (100*units) );
            var titleW = ctx.measureText(this.SessionTitle).width;


            // TYPE BAR //
            if (this._Blink > 50) {
                ctx.fillRect((appWidth*0.5) - (210*units) + titleW + (5*units),centerY - (123*units),2*units,26*units);
            }
            this._Blink += 1;
            if (this._Blink == 100) {
                this._Blink = 0;
            }



            ctx.font = headType;
            ctx.fillText("SHARE",20*units,this.OffsetY + (30*units) + (11*units));


            // GEN TITLE //
            ctx.font = midType;
            var genW = ctx.measureText(this._CopyJson.generateLine.toUpperCase()).width;
            ctx.fillText(this._CopyJson.generateLine.toUpperCase(), (appWidth*0.5) + (205*units) - genW, centerY - (106*units) );


            ctx.beginPath();
            ctx.moveTo((appWidth*0.5) + (210*units), centerY - (120*units));
            ctx.lineTo((appWidth*0.5) + (200*units) - genW, centerY - (120*units));
            ctx.lineTo((appWidth*0.5) + (200*units) - genW, centerY - (100*units));
            ctx.lineTo((appWidth*0.5) + (210*units), centerY - (100*units));
            ctx.closePath();
            ctx.stroke();


            // CLOSE BUTTON //
            ctx.beginPath();
            ctx.moveTo((appWidth*0.5) + (222.5*units), centerY - (122.5*units));
            ctx.lineTo((appWidth*0.5) + (237.5*units), centerY - (137.5*units));
            ctx.moveTo((appWidth*0.5) + (237.5*units), centerY - (122.5*units));
            ctx.lineTo((appWidth*0.5) + (222.5*units), centerY - (137.5*units));
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

        var offsetTween = new TWEEN.Tween({x: panel[""+v]});
        offsetTween.to({x: destination}, t);
        offsetTween.onUpdate(function () {
            panel[""+v] = this.x;

            var units = App.Unit;
            var shareUrl = document.getElementById("shareUrl");
            var pr = App.Metrics.PixelRatio;

            if (v=="OffsetX") {
                shareUrl.style.left = "" + ((this.x + (App.Width*1.5) - (units*200))/pr) + "px";
            }
            if (v=="OffsetY") {
                shareUrl.style.top = "" + ((this.x + (App.Height*0.5) - (units*20))/pr) + "px";
            }
        });

        offsetTween.onComplete(function() {
            if (v=="OffsetY") {
                if (destination!==0) {
                    panel.Open = false;
                    var shareUrl = document.getElementById("shareUrl");
                    shareUrl.style.display = "none";
                    shareUrl.style.visibility = "false";
                }
                panel.OffsetX = 0;
                var shareUrl = document.getElementById("shareUrl");
                shareUrl.style.left = "1000%";
            }
            if (v=="OffsetX" && panel._FirstSession) {
                panel._FirstSession = false;
            }
        });
        offsetTween.easing(TWEEN.Easing.Exponential.InOut);
        offsetTween.delay(delay);
        offsetTween.start(this.LastVisualTick);
    }


    //-------------------------------------------------------------------------------------------
    //  TITLE GENERATOR
    //-------------------------------------------------------------------------------------------



    GenerateLabel() {

        var label = "";
        var diceRoll;

        // DIALECT 1 (Norwegian alphabet)
        var prefixA = ["al","aal","blok","bjør","brø","drø","du","ef","en","jen","ja","lek","lu","mal","svi","svar","sku","spru","kø","kin","kvi","kna","kvar","hof","tje","fja","ub","rø","vø","vol","va","ey","ly","sky","ske","skø","sji","yø","ø"];
        var syllableA = ["jen","ke","kil","kol","kof","nø","ken","ren","re","rol","sen","se","sa","then","tol","te","ty","ple","pa","ka","y"];
        var suffixA = ["berg","holm","sorg","fla","trad","stad","mark","dt","de","s","kla","ken","kjen","gen","gan","likt","tra","tet","tal","man","la","tt","bb","na","k","ka","bø","dø","gø","jø","kø","lø","mø","nø","pø","sø","slø","tø","vø","lok","vik","slik","dust"];
        var joinerA = ["berg","sorg","fla","lag","tra","tet","tal","du","na","bø","dø","gø","jø","kø","lø","mø","nø","pø","sø","slø","tø","vø","lok","vik","dust","dok","blok"];

        // DIALECT 2 (Swedish alphabet)
        var prefixB = ["al","aal","blok","björ","brö","drö","du","ef","en","jen","jä","lek","lü","mal","svi","svar","sku","spru","ko","kin","kvi","kna","kvär","höf","tje","fjä","ub","ro","vo","vol","vä","ey","ly","sky","ske","sko","sji","yö","ö"];
        var syllableB = ["jen","ke","kil","kol","kof","nö","ken","ren","re","rol","sen","se","sa","then","tol","te","ty","ple","pa","ka","y"];
        var suffixB = ["berg","holm","sorg","fla","träd","städ","mark","dt","de","s","kla","ken","kjen","gen","gan","likt","tra","tet","tal","man","la","tt","bb","na","k","ka","bö","dö","gö","jö","kö","lö","mö","nö","pö","sö","slö","tö","vö","lok","vik","slik","dust"];
        var joinerB = ["berg","sorg","fla","lag","tra","tet","tal","dü","na","bö","dö","gö","jö","kö","lö","mö","nö","pö","sö","slö","tö","vö","lok","vik","dust","dok","blok"];

        var prefixes = [prefixA,prefixB];
        var syllables = [syllableA,syllableB];
        var suffixes = [suffixA,suffixB];
        var joiners = [joinerA,joinerB];

        // randomly select dialect
        var dialect = Math.round(Math.random());
        var prefix = prefixes[dialect];
        var syllable = syllables[dialect];
        var suffix = suffixes[dialect];
        var joiner = joiners[dialect];

        // ALGORITHM //

        // FIRST WORD //
        label = "" + label + prefix[Math.floor(Math.random()*prefix.length)];
        diceRoll = Math.floor(Math.random()*8);
        if (diceRoll==0) { label = "" + label + syllable[Math.floor(Math.random()*syllable.length)]; }
        label = "" + label + suffix[Math.floor(Math.random()*suffix.length)];

        // JOINER //
        diceRoll = Math.floor(Math.random()*10);
        if (diceRoll==0) { label = "" + label + " " + joiner[Math.floor(Math.random()*joiner.length)]; }

        // SECOND WORD //
        diceRoll = Math.floor(Math.random()*2);
        if (diceRoll!==0) {
            label = "" + label + " " + prefix[Math.floor(Math.random()*prefix.length)];
            diceRoll = Math.floor(Math.random()*5);
            if (diceRoll==0) { label = "" + label + syllable[Math.floor(Math.random()*syllable.length)]; }
            label = "" + label + suffix[Math.floor(Math.random()*suffix.length)];
        }

        // DONE //
        this._NameUrl = "&t=" + encodeURI(label);
        this.UpdateUrlText();
        return label.toUpperCase();
    }


    //-------------------------------------------------------------------------------------------
    //  INTERACTION
    //-------------------------------------------------------------------------------------------


    OpenPanel() {
        this.Open = true;
        this.OffsetY = -App.Height;
        var shareUrl = document.getElementById("shareUrl");
        shareUrl.style.display = "block";
        shareUrl.style.visibility = "true";
        this.DelayTo(this,0,500,0,"OffsetY");
        App.TypingManager.Enable(this);
    }

    ClosePanel() {
        this.DelayTo(this,-App.Height,500,0,"OffsetY");
        App.TypingManager.Disable();
    }

    GenerateLink() {
        this._Saving = true;
        this._CommandManager.ExecuteCommand(Commands.SAVEAS);

    }

    UpdateLink() {
        this._Saving = true;
        this._CommandManager.ExecuteCommand(Commands.SAVE);
    }

    ReturnLink(id) {
        this._Saving = false;
        console.log(id);
        this._SessionId = id;
        this.UpdateUrlText();
        this.DelayTo(this,-App.Width,500,0,"OffsetX");
    }

    UpdateUrlText() {
        this.SessionURL = "" + this._CopyJson.domain + this._SessionId + this._NameUrl;
        var shareUrl = document.getElementById("shareUrl");
        shareUrl.innerHTML = "" + this.SessionURL;
    }



    ShareFacebook(url) {
        FB.ui({
            method: "share",
            href: url,
            title: this.SessionTitle,
            description: "Interactive music.",
            image: "http://localhost:8000/image.jpg"
        }, function(response){});
    }

    ShareTwitter() {
        var href = "https://twitter.com/intent/tweet?text=";
        href = "" + href + encodeURIComponent(this._CopyJson.tweetText);
        href = "" + href + "&url=" + encodeURIComponent(this.SessionURL);
        window.open(href,'', 'menubar=no,toolbar=no,resizable=yes,scrollbars=yes,height=600,width=600');
    }

    ShareGoogle() {
        var href = "https://plus.google.com/share?url=";
        href = "" + href + encodeURIComponent(this.SessionURL);
        window.open(href,'', 'menubar=no,toolbar=no,resizable=yes,scrollbars=yes,height=600,width=600');
    }


    MouseDown(point) {
        this.HitTests(point);
        //var units = (<MainScene>this.Sketch).Unit.width;

        if (!this._RollOvers[0]) { // url

            if (this._RollOvers[1]) { // close
                this.ClosePanel();
                return;
            }
            if (this._RollOvers[2]) { // gen title
                this.SessionTitle = this.GenerateLabel();
                App.TypingManager.Enable(this);
                return;
            }
            if (this._RollOvers[3]) { // gen URL
                this.GenerateLink();
                return;
            }
            if (this._RollOvers[4]) { // save
                this.UpdateLink();
                return;
            }
            if (this._RollOvers[5]) { // save as
                this.GenerateLink();
                return;
            }
            if (this._RollOvers[6]) { // fb
                var url = "" + this.SessionURL;
                //url = "http://blokdust.com/";
                this.ShareFacebook(url);
                return;
            }
            if (this._RollOvers[7]) { // tw
                this.ShareTwitter();
                return;
            }
            if (this._RollOvers[8]) { // google
                //this.AddBookmark(this.SessionURL);
                this.ShareGoogle();
                return;
            }
            if (this._RollOvers[9]) { // back arrow
                this.DelayTo(this,0,500,0,"OffsetX");
                return;
            }
            if (this._RollOvers[10]) { // skip
                this.DelayTo(this,-App.Width,500,0,"OffsetX");
                return;
            }

            this._UrlSelecting = false;
        } else {
            this._UrlSelecting = true;
        }

    }

    MouseUp(point) {
        if (this._UrlSelecting) {
            //this.DeselectText();
            this.SelectText("shareUrl");
        } else {
            this.DeselectText();
        }
    }

    MouseMove(point) {
        this.HitTests(point);
    }

    HitTests(point) {
        var units = App.Unit;
        var shareX = this.OffsetX + App.Width;
        var centerY = this.OffsetY + (App.Height * 0.5);
        var buttonY = centerY + (35*units);
        var ctx = this.Ctx;
        var midType = App.Metrics.TxtMid;
        var appWidth = App.Width;


        ctx.font = midType;
        var genW = ctx.measureText(this._CopyJson.generateLine.toUpperCase()).width;

        this._RollOvers[0] = this.HitRect(shareX + (appWidth*0.5) - (210*units), centerY - (20*units),420*units,40*units, point.x, point.y); // url
        this._RollOvers[1] = this.HitRect((appWidth*0.5) + (210*units), centerY - (150*units),40*units,40*units, point.x, point.y); // close
        this._RollOvers[2] = this.HitRect((appWidth*0.5) + (200*units) - genW, centerY - (130*units),genW + (10*units),40*units, point.x, point.y); // gen title
        if (this._FirstSession) {
            this._RollOvers[3] = this.HitRect(this.OffsetX + (appWidth*0.5) - (210*units), centerY - (20*units),420*units,40*units, point.x, point.y); // gen URL
            this._RollOvers[4] = false;
            this._RollOvers[5] = false;
            this._RollOvers[10] = false;
        } else {
            this._RollOvers[3] = false;
            this._RollOvers[4] = this.HitRect(this.OffsetX + (appWidth*0.5) - (210*units), centerY - (20*units),202.5*units,40*units, point.x, point.y); // save
            this._RollOvers[5] = this.HitRect(this.OffsetX + (appWidth*0.5) + (7.5*units), centerY - (20*units),202.5*units,40*units, point.x, point.y); // save as
            this._RollOvers[10] = this.HitRect(this.OffsetX + (appWidth*0.5) + (270*units),centerY - (units*20),30*units,40*units, point.x, point.y); // skip
        }
        this._RollOvers[6] = this.HitRect(shareX + (appWidth*0.5) - (210*units),buttonY,130*units,30*units, point.x, point.y); // fb
        this._RollOvers[7] = this.HitRect(shareX + (appWidth*0.5) - (65*units),buttonY,130*units,30*units, point.x, point.y); // tw
        this._RollOvers[8] = this.HitRect(shareX + (appWidth*0.5) + (80*units),buttonY,130*units,30*units, point.x, point.y); // gp

        this._RollOvers[9] = this.HitRect(shareX + (appWidth*0.5) - (300*units),centerY - (units*20),30*units,40*units, point.x, point.y); // back
    }



    SelectText(element) {
        var doc = document
            , text = doc.getElementById(element)
            , range, selection;
        if (window.getSelection) {
            selection = window.getSelection();

            // if not already selected //
            if (selection.toString()!==this.SessionURL) {
                range = document.createRange();
                range.selectNodeContents(text);
                selection.removeAllRanges();
                selection.addRange(range);
            }
        }
    }

    DeselectText() {
        if (window.getSelection)
            window.getSelection().removeAllRanges();
        else if (document.selection)
            document.selection.empty();
    }

    Resize() {
        var units = (App.Unit);

        //TODO: Move to AppMetrics
        var pr = App.Metrics.PixelRatio;
        var shareUrl = document.getElementById("shareUrl");
        shareUrl.style.font = App.Metrics.TxtUrl;
        shareUrl.style.width = "" + (units*(400/pr)) + "px";
        shareUrl.style.height = "" + (units*(40/pr)) + "px";
        shareUrl.style.lineHeight = "" + (units*(40/pr)) + "px";
        shareUrl.style.color = App.Palette[App.Color.Txt];
        shareUrl.style.display = "block";

        if (!this.Open) {
            this.OffsetY = -App.Height;
            shareUrl.style.display = "none";
            shareUrl.style.visibility = "false";
        }
        if (this.OffsetX!==0) {
            this.OffsetX = -App.Width;
        }

        var offsetX = this.OffsetX/pr;
        var offsetY = this.OffsetY/pr;
        var width = App.Width/pr;
        var height = App.Height/pr;

        shareUrl.style.left = "" + (offsetX + (width*1.5) - (units*(200/pr))) + "px";
        shareUrl.style.top = "" + (offsetY + (height*0.5) - (units*(20/pr))) + "px";

    }
}
