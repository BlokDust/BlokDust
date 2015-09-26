import {BlockCreator} from './../BlockCreator';
import {DisplayObject} from '../DisplayObject';
import {IApp} from '../IApp';
import {MainScene} from './../MainScene';
import {MenuCategory} from './MenuCategory';
import {MenuItem} from './MenuItem';
import Size = minerva.Size;
import ISketchContext = Fayde.Drawing.ISketchContext;

declare var App: IApp;

export class Header extends DisplayObject {

    private _Units: number;
    public Height: number;
    private _Rows: number;
    public MenuItems: MenuCategory[] = [];
    public MenuJson;
    public ItemsPerPage: number;
    public DropDownHeight: number;
    public DropDown: number;
    private _SelectedCategory: number;
    private _MenuCols: number[];
    public Hover: number[];
    public Margin: number;
    private _LeftOver: boolean;
    private _RightOver: boolean;
    private _ShareOver: boolean;
    private _SettingsOver: boolean;
    public MenuOver: boolean;
    public Tweens: any[];

    Init(sketch: ISketchContext): void {
        super.Init(sketch);

        this._Units = 1.7;
        this.Height = 60;
        this._Rows = 1;
        this.MenuItems = [];
        this.ItemsPerPage = App.Metrics.ItemsPerPage;
        this.DropDownHeight = (App.Width / (this.ItemsPerPage + 1)) / App.Unit;
        this.DropDown = 0;
        this._SelectedCategory = 0;
        this._MenuCols = [9,5,7,4,3];
        this.Margin = 0;

        this._LeftOver = false;
        this._RightOver = false;
        this.MenuOver = false;
        this.Tweens = [];

        this.MenuJson = BlockCreator.MenuJson;

        this.Populate(this.MenuJson);

    }

    //-------------------------------------------------------------------------------------------
    //  POPULATE
    //-------------------------------------------------------------------------------------------

    Populate(json) {
        var units = App.Unit;
        var ctx = this.Ctx;
        var dataType = units*10;
        var gutter = 60;
        var menuCats = [];
        this._Rows = 1;

        if (App.Metrics.Device==="tablet") {
            gutter = 40;
        }
        if (App.Metrics.Device==="mobile") {
            this._Rows = 2;
        }


        this.ItemsPerPage = App.Metrics.ItemsPerPage;
        this.DropDownHeight = (this.Sketch.Width / (this.ItemsPerPage + 1)) / units;


        // GET NUMBER OF CATEGORIES //
        var n = json.categories.length;


        // GET MENU & CATEGORY WIDTHS //
        ctx.font = "400 " + dataType + "px Dosis";
        ctx.textAlign = "left";
        var catWidth = [];
        var menuWidth = 0;


        // total text width //
        for (var i=0; i<n; i++) {
            catWidth[i] = ctx.measureText(json.categories[i].name.toUpperCase()).width + (gutter*units);
            menuWidth += catWidth[i];
        }

        // start x for positioning //
        var catX = ((this.Sketch.Width*0.5) - (menuWidth*0.5));
        var rowOffset = ((this._Rows-1)*this.Height)*units;

        // POPULATE MENU //
        for (var i=0; i<n; i++) {
            var name = json.categories[i].name.toUpperCase();
            var point = new Point(catX + (catWidth[i]*0.5),rowOffset);
            var size = new Size(catWidth[i],16);
            menuCats[i] = new MenuCategory(point,size,name,this.DropDownHeight);
            catX += catWidth[i];

            // POPULATE CATEGORIES //
            var itemN = json.categories[i].items.length;
            menuCats[i].Pages = Math.floor((itemN-1)/this.ItemsPerPage);

            for (var j=0; j<itemN; j++) {
                var name = json.categories[i].items[j].name.toUpperCase();
                var id = json.categories[i].items[j].id;
                var description = "";
                if (json.categories[i].items[j].description) {
                    description = json.categories[i].items[j].description;
                }
                var point = new Point(0,((this.Height + (this.DropDownHeight*0.5))*units) + rowOffset);
                var size = new Size(this.DropDownHeight*units,this.DropDownHeight*units);

                menuCats[i].Items.push(new MenuItem(point,size,name,id,description, <MainScene>this.Sketch));
            }

        }
        this.MenuItems = menuCats;
        this.DelayTo(this,0,300,0,"DropDown");



    }

    //-------------------------------------------------------------------------------------------
    //  DRAW
    //-------------------------------------------------------------------------------------------


    Draw() {
        var units = App.Unit;
        var ctx = this.Ctx;
        var dataType = units*10;
        var headerType = Math.round(units*28);
        var thisHeight = Math.round(this.Height*units);
        var dropDown = Math.round(this.DropDown*units);
        var rowOffset = ((this._Rows-1)*this.Height)*units;

        // BG //
        ctx.fillStyle = App.Palette[2];// Black

        ctx.globalAlpha = 0.16;
        ctx.fillRect(0,0,this.Sketch.Width,thisHeight + (5*units) + dropDown + rowOffset); // shadow
        ctx.globalAlpha = 0.9; //0.9
        ctx.fillRect(0,0,this.Sketch.Width,thisHeight  + dropDown + rowOffset); // solid



        // TT //
        ctx.globalAlpha = 1;
        ctx.fillStyle = App.Palette[App.Color.Txt];// Grey
        ctx.font = "200 " + headerType + "px Dosis";

        if (App.Metrics.Device==="mobile") {
            ctx.textAlign = "center";
            ctx.fillText("BLOKDUST", App.Width*0.5, (thisHeight * 0.5) + (headerType * 0.38));
        } else {
            ctx.textAlign = "left";
            ctx.fillText("BLOKDUST", 20 * units, (thisHeight * 0.5) + (headerType * 0.38));
        }




        // DIVIDERS //
        ctx.strokeStyle = App.Palette[1];// Grey
        ctx.globalAlpha = 1;

        // Horizontal //
        if (dropDown>0) {
            ctx.beginPath();
            ctx.moveTo(20*units,thisHeight + rowOffset);
            ctx.lineTo(this.Sketch.Width-(20*units),thisHeight + rowOffset);
            ctx.stroke();
        }

        if (App.Metrics.Device==="mobile") {
            ctx.beginPath();
            ctx.moveTo(20*units,thisHeight);
            ctx.lineTo(this.Sketch.Width-(20*units),thisHeight);
            ctx.stroke();
        }


        // Vertical //
        var margin = this.DropDownHeight*0.5;
        ctx.beginPath();
        for (var i=0;i<this.MenuItems.length;i++) {
            var cat = this.MenuItems[i];
            var menuX = cat.Position.x;
            if (i > 0) {
                ctx.moveTo(Math.round(menuX - (cat.Size.width*0.5)), rowOffset + (thisHeight * 0.5) - (16 * units));
                ctx.lineTo(Math.round(menuX - (cat.Size.width*0.5)), rowOffset + (thisHeight * 0.5) + (16 * units));
            }
        }
        //between share & settings //
        ctx.moveTo(Math.round(this.Sketch.Width - (margin * units)), (thisHeight * 0.5) - (16 * units));
        ctx.lineTo(Math.round(this.Sketch.Width - (margin * units)), (thisHeight * 0.5) + (16 * units));
        ctx.stroke();

        // CATEGORIES //
        ctx.textAlign = "center";
        ctx.font = "400 " + dataType + "px Dosis";

        for (var i=0;i<this.MenuItems.length;i++) {
             ctx.globalAlpha = 1;
             cat = this.MenuItems[i];

            // SELECTION COLOUR //
            var col = this._MenuCols[i - (Math.floor(i/this._MenuCols.length)*(this._MenuCols.length))];
            ctx.fillStyle = App.Palette[col];

            // DRAW CAT HEADER //
            cat.Draw(ctx,units,this,rowOffset);


            // ITEMS //
            if (this.DropDown > 0 && cat.YOffset<this.DropDownHeight) {
                var itemN = cat.Items.length;
                margin = 20 + (this.Margin*0.666);
                ctx.lineWidth = 1;


                // CLIPPING RECTANGLE //

                var clipHeight = this.DropDown - cat.YOffset;
                if (clipHeight<0) {
                    clipHeight = 0;
                }

                ctx.save();
                ctx.beginPath();
                ctx.moveTo(Math.floor(margin*units),(this.Height*units) + rowOffset);
                ctx.lineTo(Math.ceil(this.Sketch.Width - (margin*units)),(this.Height*units) + rowOffset);
                ctx.lineTo(Math.ceil(this.Sketch.Width - (margin*units)),((this.Height + clipHeight)*units) + rowOffset);
                ctx.lineTo(Math.floor(margin*units),((this.Height + clipHeight)*units) + rowOffset);
                ctx.closePath();
                ctx.clip();


                // DRAW ITEMS //
                for (var j=0; j<itemN; j++) {
                    var xPos = (margin + (this.DropDownHeight*0.5) + (this.DropDownHeight*j) + cat.XOffset)*units;
                    var yPos = cat.YOffset;
                    cat.Items[j].Position.x = xPos; // TODO: shouldn't really be setting position in Draw, but worth setting up update?
                    if (xPos>0 && xPos<this.Sketch.Width) {
                        cat.Items[j].Draw(ctx,units,xPos,yPos);
                    }
                }

                // END CLIP //
                ctx.restore();

                // DRAW GHOST ITEM //
                for (var j=0; j<itemN; j++) {

                    if (cat.Items[j].MouseIsDown && cat.Items[j].InfoOffset==0) {
                        ctx.globalAlpha = 0.5;
                        (<MainScene>this.Sketch).BlockSprites.DrawSprite(cat.Items[j].MousePoint,false,cat.Items[j].Name.toLowerCase());
                    }
                }

            }
        }

        // SCROLL ARROWS //

        if (this.DropDown > 0) {
            var cat = this.MenuItems[this._SelectedCategory];
            margin = this.Margin;


            // PAGINATION //
            ctx.strokeStyle = App.Palette[1]; // White
            ctx.lineWidth = 2;

            // CLIPPING RECTANGLE //
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(0, (this.Height * units) + rowOffset);
            ctx.lineTo(this.Sketch.Width, (this.Height * units) + rowOffset);
            ctx.lineTo(this.Sketch.Width, ((this.Height + this.DropDown) * units) + rowOffset);
            ctx.lineTo(0, ((this.Height + this.DropDown) * units) + rowOffset);
            ctx.closePath();
            ctx.clip();

            ctx.strokeStyle = App.Palette[App.Color.Txt]; // White
            if (cat.CurrentPage == 0) {
                ctx.strokeStyle = App.Palette[1]; // Grey
            }

            // LEFT ARROW //
            ctx.beginPath();
            ctx.moveTo((margin * units) - (20 * units), ((this.Height + (this.DropDown * 0.5) - 20) * units) + rowOffset);
            ctx.lineTo((margin * units) - (40 * units), ((this.Height + (this.DropDown * 0.5)) * units) + rowOffset);
            ctx.lineTo((margin * units) - (20 * units), ((this.Height + (this.DropDown * 0.5) + 20) * units) + rowOffset);
            ctx.stroke();

            ctx.strokeStyle = App.Palette[App.Color.Txt]; // White
            if (cat.CurrentPage == cat.Pages) {
                ctx.strokeStyle = App.Palette[1]; // Grey
            }

            // RIGHT ARROW //
            ctx.beginPath();
            ctx.moveTo(this.Sketch.Width - (margin * units) + (20 * units), ((this.Height + (this.DropDown * 0.5) - 20) * units) + rowOffset);
            ctx.lineTo(this.Sketch.Width - (margin * units) + (40 * units), ((this.Height + (this.DropDown * 0.5)) * units) + rowOffset);
            ctx.lineTo(this.Sketch.Width - (margin * units) + (20 * units), ((this.Height + (this.DropDown * 0.5) + 20) * units) + rowOffset);
            ctx.stroke();


            ctx.restore();
        }


        // SETTINGS & SHARE HOVER //
        var btnWidth = this.Ctx.measureText("SHARE").width + (40*units);

        ctx.fillStyle = App.Palette[2];// Black
        ctx.globalAlpha = 0.9;
        if (this._ShareOver) {
            var shx = this.Sketch.Width - (margin * units) - (btnWidth*0.5);
            ctx.beginPath();
            ctx.moveTo(shx - (10*units),this.Height*units);
            ctx.lineTo(shx,(this.Height + 10)*units);
            ctx.lineTo(shx + (10*units),this.Height*units);
            ctx.closePath();
            ctx.fill();
        }
        if (this._SettingsOver) {
            var shx = this.Sketch.Width - (margin * units) + (30*units);
            ctx.beginPath();
            ctx.moveTo(shx - (10*units),this.Height*units);
            ctx.lineTo(shx,(this.Height + 10)*units);
            ctx.lineTo(shx + (10*units),this.Height*units);
            ctx.closePath();
            ctx.fill();
        }


        // SETTINGS BTN //
        ctx.globalAlpha = 1;
        margin = this.DropDownHeight*0.5;
        ctx.strokeStyle = ctx.fillStyle = App.Palette[App.Color.Txt]; // White
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.Sketch.Width - (margin * units) + (20 * units), ((this.Height*0.5) - 1) * units);
        ctx.lineTo(this.Sketch.Width - (margin * units) + (26.6 * units), ((this.Height*0.5) - 7) * units);
        ctx.lineTo(this.Sketch.Width - (margin * units) + (33.2 * units), ((this.Height*0.5) - 1) * units);
        ctx.lineTo(this.Sketch.Width - (margin * units) + (40 * units), ((this.Height*0.5) - 7) * units);

        ctx.moveTo(this.Sketch.Width - (margin * units) + (20 * units), ((this.Height*0.5) + 7) * units);
        ctx.lineTo(this.Sketch.Width - (margin * units) + (26.6 * units), ((this.Height*0.5) + 1) * units);
        ctx.lineTo(this.Sketch.Width - (margin * units) + (33.2 * units), ((this.Height*0.5) + 7) * units);
        ctx.lineTo(this.Sketch.Width - (margin * units) + (40 * units), ((this.Height*0.5) + 1) * units);



        // SHARE BTN //

        ctx.moveTo(this.Sketch.Width - (margin * units) - (btnWidth*0.5) - (5 * units), ((this.Height*0.75) - 6) * units);
        ctx.lineTo(this.Sketch.Width - (margin * units) - (btnWidth*0.5), ((this.Height*0.75) - 1) * units);
        ctx.lineTo(this.Sketch.Width - (margin * units) - (btnWidth*0.5) + (5 * units), ((this.Height*0.75) - 6) * units);

        ctx.stroke();

        ctx.textAlign = "right";
        ctx.fillText("SHARE", this.Sketch.Width - (margin * units) - (20 * units) ,((this.Height * 0.5)*units) + (dataType * 0.38));
        ctx.textAlign = "center";
    }

    IsPaginated(cat,units) {
        var itemN = cat.Items.length;
        return (itemN > this.ItemsPerPage);
    }

    //-------------------------------------------------------------------------------------------
    //  TWEEN
    //-------------------------------------------------------------------------------------------


    DelayTo(panel,destination,t,delay,v){

        var offsetTween = new TWEEN.Tween({x: panel[""+v]});
        offsetTween.to({x: destination}, t);
        offsetTween.onUpdate(function () {
            panel[""+v] = this.x;
        });
        offsetTween.easing(TWEEN.Easing.Exponential.InOut);
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


    MouseDown(point) {
        this.HitTests(point);
        var units = App.Unit;

        // SELECT CATEGORY //
        for (var i=0; i<this.MenuItems.length; i++) {
            if (this.MenuItems[i].Hover && !(this._SelectedCategory==i && this.DropDown>0)) {
                this.StopAllTweens();
                this.CloseOptions();
                var cat = this.MenuItems[i];

                //cat.CurrentPage = 0; // RESET ITEM PAGES
                //cat.XOffset = 0;
                for (var j=0; j<cat.Items.length; j++) {
                    cat.Items[j].InfoOffset = 0;
                }



                this.DelayTo(this,this.DropDownHeight,500,0,"DropDown");
                this.DelayTo(cat,1,400,0,"Selected");
                this.DelayTo(cat,0,600,250,"YOffset");
                if (this.IsPaginated(cat,units)) {
                    this.DelayTo(this,this.DropDownHeight*0.5,600,50,"Margin");
                } else {
                    this.DelayTo(this,0,600,50,"Margin");
                }
                this._SelectedCategory = i; // I'M THE SELECTED CATEGORY

                // RESET NON-SELECTED CATEGORIES //
                for (var j=0; j<this.MenuItems.length; j++) {
                    if (j!==i) {
                        var cat = this.MenuItems[j];
                        this.DelayTo(cat,0,250,0,"Selected");
                        this.DelayTo(cat,this.DropDownHeight,250,0,"YOffset");
                    }
                }
            }
        }

        // ITEMS //
        if (this.DropDown>0 && !this._LeftOver && !this._RightOver) {
            var cat = this.MenuItems[this._SelectedCategory];
            for (var i = 0; i<cat.Items.length; i++) {
                var item = cat.Items[i];

                if (item.InfoOffset==0) { // PANEL 1
                    if (item.InfoHover) {
                        this.DelayTo(item,this.DropDownHeight,350,0,"InfoOffset");

                        // RESET OTHERS INFO PANEL
                        for (var j = 0; j<cat.Items.length; j++) {
                            if (i!==j) {
                                this.DelayTo(cat.Items[j],0,350,0,"InfoOffset");
                            }
                        }
                    }
                    else if (cat.Items[i].Hover) {
                        item.MouseDown(point);
                    }
                } else { // PANEL 2
                    if (cat.Items[i].BackHover) {
                        this.DelayTo(item,0,350,0,"InfoOffset");
                    }
                }
            }
        }

        // SCROLL //
        if (this._LeftOver) {
            var cat = this.MenuItems[this._SelectedCategory];
            if (cat.CurrentPage > 0) {
                cat.CurrentPage -= 1;
                this.DelayTo(cat,-( ((this.ItemsPerPage)*cat.CurrentPage) * this.DropDownHeight),500,0,"XOffset");
            }
        }
        if (this._RightOver) {
            var cat = this.MenuItems[this._SelectedCategory];
            if (cat.CurrentPage < cat.Pages) {
                cat.CurrentPage += 1;
                this.DelayTo(cat,-( ((this.ItemsPerPage)*cat.CurrentPage) * this.DropDownHeight),500,0,"XOffset");
            }
        }

        // SHARE //
        if (this._ShareOver) {
            this.CloseOptions();
            App.MainScene.SharePanel.OpenPanel();
        }
        // SETTINGS //
        if (this._SettingsOver) {
            this.CloseOptions();
            App.MainScene.SettingsPanel.OpenPanel();
        }


        // CLOSE DROPDOWN //
        if (!this.MenuOver && (this.DropDown > 0)) {
            this.ClosePanel();
        }
    }


    ClosePanel() {
        this.StopAllTweens();
        this.DelayTo(this,0,300,0,"DropDown");
        this.DelayTo(this,0,600,50,"Margin");
        for (var i=0; i<this.MenuItems.length; i++) {
            this.DelayTo(this.MenuItems[i],0,250,0,"Selected");
            this.DelayTo(this.MenuItems[i],this.DropDownHeight,250,0,"YOffset");
        }
    }

    CloseOptions() {
        if (App.MainScene.OptionsPanel.Scale>0) {
            App.MainScene.OptionsPanel.Close();
        }
    }


    MouseMove(point) {
        this.HitTests(point);
    }

    HitTests(point) {
        var units = App.Unit;
        var grd = App.GridSize;
        var rowOffset = ((this._Rows-1)*this.Height)*units;

        // CATEGORY HIT TEST //
        for (var i=0; i<this.MenuItems.length; i++) {
            var cat = this.MenuItems[i];
            cat.Hover = this.HitRect(cat.Position.x - (cat.Size.width*0.5) + (2*units), rowOffset + (5*units), cat.Size.width - (4*units), (this.Height*units) - (10*units), point.x, point.y );

            //ITEMS HIT TEST //
            if (this._SelectedCategory==i) {
                for (var j=0; j<cat.Items.length; j++) {
                    var item = cat.Items[j];

                    item.Hover = this.HitRect(item.Position.x - (2*grd), item.Position.y - (2*grd), 4*grd, 4*grd, point.x, point.y);
                    item.InfoHover = this.HitRect(item.Position.x - (52*units), item.Position.y - (42*units), 24*units, 24*units, point.x, point.y);
                    item.BackHover = this.HitRect(item.Position.x - ((this.DropDownHeight*0.5)*units), item.Position.y - ((this.DropDownHeight*0.5)*units), this.DropDownHeight*units, this.DropDownHeight*units, point.x, point.y);
                    item.MouseMove(point, this, (this.Height + this.DropDown - 20)*units ); // could narrow to just dragged?

                }
            }

        }

        // SCROLL HIT TEST //
        this._LeftOver = this.HitRect(0, ((this.Height + 20)*units) + rowOffset, this.Margin*units, (this.DropDown - 40)*units, point.x, point.y);
        this._RightOver = this.HitRect(this.Sketch.Width - (this.Margin*units), ((this.Height + 20)*units) + rowOffset, this.Margin*units, (this.DropDown - 40)*units, point.x, point.y);

        // SHARE & SETTINGS HIT TESTS //
        this.Ctx.font = "400 " + (units*10) + "px Dosis";
        var btnWidth = this.Ctx.measureText("SHARE").width + (40*units);
        this._ShareOver = this.HitRect(this.Sketch.Width - ((this.DropDownHeight*0.5)*units) - btnWidth, 5*units, btnWidth, (this.Height*units) - (10*units), point.x, point.y);
        this._SettingsOver = this.HitRect(this.Sketch.Width - ((this.DropDownHeight*0.5)*units), 5*units, ((this.DropDownHeight*0.5)*units), (this.Height*units) - (10*units), point.x, point.y);


        // WHOLE MENU //
        this.MenuOver = (point.y < (((this.Height + this.DropDown)*units) + rowOffset));
    }

    MouseUp() {
        // ITEMS //
        var cat = this.MenuItems[this._SelectedCategory];
        for (var i = 0; i<cat.Items.length; i++) {
            cat.Items[i].MouseUp();
        }
    }
}
