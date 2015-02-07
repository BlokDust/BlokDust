/**
 * Created by luketwyman on 25/01/2015.
 */
import App = require("./../App");
import Size = Fayde.Utils.Size;
import Grid = require("./../Grid");
import BlocksSketch = require("./../BlocksSketch");
import MenuCategory = require("./MenuCategory");
import MenuItem = require("./MenuItem");

var MAX_FPS: number = 100;
var MAX_MSPF: number = 1000 / MAX_FPS;

class Header {

    private _Ctx: CanvasRenderingContext2D;
    private _Units: number;
    private _Sketch: BlocksSketch;
    public Height: number;
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
    public MenuOver: boolean;

    private _Timer: Fayde.ClockTimer;
    private _LastVisualTick: number = new Date(0).getTime();

    constructor(ctx: CanvasRenderingContext2D,sketch: BlocksSketch) {
        this._Ctx = ctx;
        this._Sketch = sketch;
        this._Units = 1.7;
        this.Height = 60;
        this.MenuItems = [];
        this.ItemsPerPage = 6;
        this.DropDownHeight = (sketch.Width / (this.ItemsPerPage + 1)) / sketch.Unit.width;
        this.DropDown = 0;
        this._SelectedCategory = 0;
        this._MenuCols = [9,5,7,4,3];
        this.Margin = 0;

        this._LeftOver = false;
        this._RightOver = false;
        this.MenuOver = false;

        this._Timer = new Fayde.ClockTimer();
        this._Timer.RegisterTimer(this);

        this.MenuJson =
        {
          "categories": [

              {
                  "name": "Source",
                  "items": [
                      {
                          "name": "Tone",
                          "id": "ToneSource"
                      },
                      {
                          "name": "Noise",
                          "id": "Noise"
                      },
                      {
                          "name": "Microphone",
                          "id": "Microphone"
                      },
                      {
                          "name": "SoundCloud",
                          "id": "Soundcloud"
                      },
                      {
                          "name": "Recorder",
                          "id": "Recorder"
                      }
                  ]
              },

              {
                  "name": "Effects",
                  "items": [
                      {
                          "name": "Autowah",
                          "id": "AutoWah",
                          "description": "Creates a filter sweep in response to the volume of audio input when connected to any source block."
                      },
                      {
                          "name": "Bit Crusher",
                          "id": "BitCrusher",
                          "description": "Creates distortion by reducing the audio resolution when connected to any source block."
                      },
                      {
                          "name": "Chomp",
                          "id": "Chomp",
                          "description": "A randomised filter with adjustable rate & width. Can connect to any source block."
                      },
                      {
                          "name": "Chopper",
                          "id": "Chopper",
                          "description": "Volume modulation with adjustable rate & depth. Can connect to any source block."
                      },
                      {
                          "name": "Chorus",
                          "id": "Chorus",
                          "description": "Stereo chorus/flange. Creates a delayed & modulated copy of the audio. Can connect to any source block."
                      },
                      {
                          "name": "Convolution",
                          "id": "ConvolutionReverb",
                          "description": "A reverb which simulates a physical space by using a recorded sample. Can connect to any source block."
                      },
                      {
                          "name": "Delay",
                          "id": "Delay",
                          "description": "A 'ping-pong' delay with adjustable time & feedback. Can connect to any source block."
                      },
                      {
                          "name": "Distortion",
                          "id": "Distortion",
                          "description": "A digital clipping distortion. Can connect to any source block."
                      },
                      {
                          "name": "Envelope",
                          "id": "Envelope",
                          "description": "An ADSR envelope. Alters the volume of sound over time. Can connect to Tone and Noise source blocks."
                      },
                      {
                          "name": "EQ",
                          "id": "EQ"
                      },
                      {
                          "name": "Filter",
                          "id": "Filter"
                      },
                      {
                          "name": "Gain",
                          "id": "Gain"
                      },
                      {
                          "name": "LFO",
                          "id": "LFO"
                      },
                      {
                          "name": "Phaser",
                          "id": "Phaser"
                      },
                      {
                          "name": "Pitch",
                          "id": "PitchIncrease"
                      },
                      {
                          "name": "Reverb",
                          "id": "Reverb"
                      },
                      {
                          "name": "Scuzz",
                          "id": "Scuzz"
                      }
                  ]
              },

              {
                  "name": "Power",
                  "items": [
                      {
                          "name": "Particle Emitter",
                          "id": "ParticleEmitter"
                      }
                  ]
              },

              {
                  "name": "Interaction",
                  "items": [
                      {
                          "name": "Keyboard",
                          "id": "Keyboard"
                      }
                  ]
              }

          ]
        };


        this.Populate(this.MenuJson);


        //TODO: this is compensating for font loading, look into font loading
        var header = this;
        setTimeout(function() {
            header.Populate(header.MenuJson);
        },2000);
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


    Populate(json) {

        var units = this._Sketch.Unit.width;
        var ctx = this._Ctx;
        var dataType = units*10;
        var gutter = 60;
        var menuCats = [];

        this.DropDownHeight = (this._Sketch.Width / (this.ItemsPerPage + 1)) / units;


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
        var catX = ((this._Sketch.Width*0.5) - (menuWidth*0.5));


        // POPULATE MENU //
        for (var i=0; i<n; i++) {
            var name = json.categories[i].name.toUpperCase();
            var point = new Point(catX + (catWidth[i]*0.5),0);
            var size = new Size(catWidth[i],16);
            menuCats[i] = new MenuCategory(point,size,name,this.DropDownHeight);
            catX += catWidth[i];

            // POPULATE CATEGORIES //
            var itemN = json.categories[i].items.length;

            for (var j=0; j<itemN; j++) {
                var name = json.categories[i].items[j].name.toUpperCase();
                var id = json.categories[i].items[j].id;
                var description = "";
                if (json.categories[i].items[j].description) {
                    description = json.categories[i].items[j].description;
                }
                var point = new Point(0,(this.Height + (this.DropDownHeight*0.5))*units);
                var size = new Size(this.DropDownHeight*units,this.DropDownHeight*units);

                menuCats[i].Items.push(new MenuItem(point,size,name,id,description,this._Sketch));
                menuCats[i].Pages = Math.floor(itemN/this.ItemsPerPage);
            }

        }
        this.MenuItems = menuCats;
        this.DelayTo(this,0,300,0,"DropDown");



    }

    //-------------------------------------------------------------------------------------------
    //  DRAW
    //-------------------------------------------------------------------------------------------


    Draw() {
        var units = this._Sketch.Unit.width;
        var ctx = this._Ctx;
        var dataType = units*10;
        var headerType = Math.round(units*28);
        var thisHeight = Math.round(this.Height*units);
        var dropDown = Math.round(this.DropDown*units);


        // BG //
        ctx.fillStyle = "#000";
        ctx.globalAlpha = 0.16;
        ctx.fillRect(0,0,this._Sketch.Width,thisHeight + (5*units) + dropDown); // shadow
        ctx.globalAlpha = 0.9;
        ctx.fillRect(0,0,this._Sketch.Width,thisHeight  + dropDown); // solid


        // TT //
        ctx.globalAlpha = 1;
        ctx.fillStyle = App.Palette[8];// Grey
        ctx.textAlign = "left";
        ctx.font = "200 " + headerType + "px Dosis";
        ctx.fillText("BLOKDUST",20*units,(thisHeight * 0.5) + (headerType * 0.38));


        // DIVIDERS //
        ctx.strokeStyle = "#393d43";// Grey
        ctx.globalAlpha = 1;

        // Horizontal //
        if (dropDown>0) {
            ctx.beginPath();
            ctx.moveTo(20*units,thisHeight);
            ctx.lineTo(this._Sketch.Width-(20*units),thisHeight);
            ctx.stroke();
        }

        // Vertical //
        for (var i=0;i<this.MenuItems.length;i++) {
            var cat = this.MenuItems[i];
            var menuX = cat.Position.x;
            if (i > 0) {
                ctx.beginPath();
                ctx.moveTo(Math.round(menuX - (cat.Size.Width*0.5)), (thisHeight * 0.5) - (16 * units));
                ctx.lineTo(Math.round(menuX - (cat.Size.Width*0.5)), (thisHeight * 0.5) + (16 * units));
                ctx.stroke();
            }
        }

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
            cat.Draw(ctx,units,this);


            // ITEMS //
            if (this.DropDown > 0 && cat.YOffset<this.DropDownHeight) {
                var itemN = cat.Items.length;
                var margin = 20 + (this.Margin*0.666);
                ctx.lineWidth = 1;


                // CLIPPING RECTANGLE //

                var clipHeight = this.DropDown - cat.YOffset;
                if (clipHeight<0) {
                    clipHeight = 0;
                }

                ctx.save();
                ctx.beginPath();
                ctx.moveTo(Math.floor(margin*units),(this.Height)*units);
                ctx.lineTo(Math.ceil(this._Sketch.Width - (margin*units)),(this.Height)*units);
                ctx.lineTo(Math.ceil(this._Sketch.Width - (margin*units)),(this.Height + clipHeight)*units);
                ctx.lineTo(Math.floor(margin*units),(this.Height + clipHeight)*units);
                ctx.closePath();
                ctx.clip();


                // DRAW ITEMS //
                for (var j=0; j<itemN; j++) {
                    var xPos = (margin + (this.DropDownHeight*0.5) + (this.DropDownHeight*j) + cat.XOffset)*units;
                    var yPos = cat.YOffset;
                    cat.Items[j].Position.x = xPos; // TODO: shouldn't really be setting position in Draw, but worth setting up update?
                    if (xPos>0 && xPos<this._Sketch.Width) {
                        cat.Items[j].Draw(ctx,units,xPos,yPos);
                    }
                }

                // END CLIP //
                ctx.restore();

                // DRAW GHOST ITEM //
                for (var j=0; j<itemN; j++) {

                    if (cat.Items[j].MouseIsDown && cat.Items[j].InfoOffset==0) {
                        ctx.globalAlpha = 0.5;
                        this._Sketch.BlockSprites.Draw(cat.Items[j].MousePoint,false,cat.Items[j].Name.toLowerCase());
                    }
                }

            }
        }

        // SCROLL ARROWS //

        if (this.DropDown > 0) {
            var cat = this.MenuItems[this._SelectedCategory];
            var margin = this.Margin;


            // PAGINATION //
            ctx.strokeStyle = "#393d43"; // White
            ctx.lineWidth = 2;

            // CLIPPING RECTANGLE //
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(0, this.Height * units);
            ctx.lineTo(this._Sketch.Width, this.Height * units);
            ctx.lineTo(this._Sketch.Width, (this.Height + this.DropDown) * units);
            ctx.lineTo(0, (this.Height + this.DropDown) * units);
            ctx.closePath();
            ctx.clip();

            ctx.strokeStyle = App.Palette[8]; // White
            if (cat.CurrentPage == 0) {
                ctx.strokeStyle = "#393d43"; // Grey
            }

            // LEFT ARROW //
            ctx.beginPath();
            ctx.moveTo((margin * units) - (20 * units), (this.Height + (this.DropDown * 0.5) - 20) * units);
            ctx.lineTo((margin * units) - (40 * units), (this.Height + (this.DropDown * 0.5)) * units);
            ctx.lineTo((margin * units) - (20 * units), (this.Height + (this.DropDown * 0.5) + 20) * units);
            ctx.stroke();

            ctx.strokeStyle = App.Palette[8]; // White
            if (cat.CurrentPage == cat.Pages) {
                ctx.strokeStyle = "#393d43"; // Grey
            }

            // RIGHT ARROW //
            ctx.beginPath();
            ctx.moveTo(this._Sketch.Width - (margin * units) + (20 * units), (this.Height + (this.DropDown * 0.5) - 20) * units);
            ctx.lineTo(this._Sketch.Width - (margin * units) + (40 * units), (this.Height + (this.DropDown * 0.5)) * units);
            ctx.lineTo(this._Sketch.Width - (margin * units) + (20 * units), (this.Height + (this.DropDown * 0.5) + 20) * units);
            ctx.stroke();


            ctx.restore();
        }


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
        offsetTween.start(this._LastVisualTick);
    }


    //-------------------------------------------------------------------------------------------
    //  INTERACTION
    //-------------------------------------------------------------------------------------------


    MouseDown(point) {
        //this.HitTests(point);
        var units = this._Sketch.Unit.width;

        // SELECT CATEGORY //
        for (var i=0; i<this.MenuItems.length; i++) {
            if (this.MenuItems[i].Hover && !(this._SelectedCategory==i && this.DropDown>0)) {
                TWEEN.removeAll();
                var cat = this.MenuItems[i];

                cat.CurrentPage = 0; // RESET ITEM PAGES
                cat.XOffset = 0;
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


        // CLOSE DROPDOWN //
        if (point.y > ((this.Height + this.DropDown)*units) && this.DropDown > 0) {
            this.ClosePanel();
        }
    }

    ClosePanel() {
        TWEEN.removeAll();
        this.DelayTo(this,0,300,0,"DropDown");
        this.DelayTo(this,0,600,50,"Margin");
        for (var i=0; i<this.MenuItems.length; i++) {
            this.DelayTo(this.MenuItems[i],0,250,0,"Selected");
            this.DelayTo(this.MenuItems[i],this.DropDownHeight,250,0,"YOffset");
        }
    }


    MouseMove(point) {
        this.HitTests(point);
    }

    HitTests(point) {
        var units = this._Sketch.Unit.width;
        var grd = this._Sketch.CellWidth.width;

        // CATEGORY HIT TEST //
        for (var i=0; i<this.MenuItems.length; i++) {
            var cat = this.MenuItems[i];
            cat.Hover = this.HudCheck(cat.Position.x - (cat.Size.Width*0.5) + (2*units), (5*units), cat.Size.Width - (4*units), (this.Height*units) - (10*units), point.x, point.y );

            //ITEMS HIT TEST //
            if (this._SelectedCategory==i) {
                for (var j=0; j<cat.Items.length; j++) {
                    var item = cat.Items[j];

                    item.Hover = this.HudCheck(item.Position.x - (2*grd), item.Position.y - (2*grd), 4*grd, 4*grd, point.x, point.y);
                    item.InfoHover = this.HudCheck(item.Position.x - (52*units), item.Position.y - (42*units), 24*units, 24*units, point.x, point.y);
                    item.BackHover = this.HudCheck(item.Position.x - ((this.DropDownHeight*0.5)*units), item.Position.y - ((this.DropDownHeight*0.5)*units), this.DropDownHeight*units, this.DropDownHeight*units, point.x, point.y);
                    item.MouseMove(point, this, (this.Height + this.DropDown - 20)*units ); // could narrow to just dragged?

                }
            }

        }

        // SCROLL HIT TEST //
        this._LeftOver = this.HudCheck(0, (this.Height + 20)*units, this.Margin*units, (this.DropDown - 40)*units, point.x, point.y);
        this._RightOver = this.HudCheck(this._Sketch.Width - (this.Margin*units), (this.Height + 20)*units, this.Margin*units, (this.DropDown - 40)*units, point.x, point.y);

        // WHOLE MENU //
        this.MenuOver = (point.y < ((this.Height + this.DropDown)*units));
    }

    MouseUp() {
        // ITEMS //
        var cat = this.MenuItems[this._SelectedCategory];
        for (var i = 0; i<cat.Items.length; i++) {
            cat.Items[i].MouseUp();
        }
    }




    // IS CLICK WITHIN THIS BOX //
    HudCheck(x,y,w,h,mx,my) {
        return (mx>x && mx<(x+w) && my>y && my<(y+h));
    }


}

export = Header;