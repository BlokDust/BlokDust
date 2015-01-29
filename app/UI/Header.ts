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
    private _MenuTween;
    public DropDownHeight: number;
    public DropDown: number;
    private _SelectedCategory: number;
    private _MenuCols: number[];
    public Hover: number[];
    public Margin: number;

    private _Timer: Fayde.ClockTimer;
    private _LastVisualTick: number = new Date(0).getTime();

    constructor(ctx: CanvasRenderingContext2D,sketch: BlocksSketch) {
        this._Ctx = ctx;
        this._Sketch = sketch;
        this._Units = 1.7;
        this.Height = 60;
        this.MenuItems = [];
        this.DropDownHeight = 121;
        this.DropDown = 0;
        this._SelectedCategory = 0;
        this._MenuCols = [9,5,7,4,3];
        this.Margin = 20;

        this._Timer = new Fayde.ClockTimer();
        this._Timer.RegisterTimer(this);

        this.MenuJson =
        {
          "categories": [

              {
                  "name": "Source",
                  "items": [
                      {
                          "name": "Tone"
                      },
                      {
                          "name": "Noise"
                      },
                      {
                          "name": "Mic"
                      },
                      {
                          "name": "SoundCloud"
                      }
                  ]
              },

              {
                  "name": "Effects",
                  "items": [
                      {
                          "name": "Autowah"
                      },
                      {
                          "name": "Bit Crusher"
                      },
                      {
                          "name": "Chomp"
                      },
                      {
                          "name": "Chopper"
                      },
                      {
                          "name": "Chorus"
                      },
                      {
                          "name": "Convolution"
                      },
                      {
                          "name": "Delay"
                      },
                      {
                          "name": "Distortion"
                      },
                      {
                          "name": "Envelope"
                      },
                      {
                          "name": "EQ"
                      },
                      {
                          "name": "Filter"
                      },
                      {
                          "name": "Gain"
                      },
                      {
                          "name": "LFO"
                      },
                      {
                          "name": "Phaser"
                      },
                      {
                          "name": "Pitch"
                      },
                      {
                          "name": "Reverb"
                      },
                      {
                          "name": "Scuzz"
                      }
                  ]
              },

              {
                  "name": "Power",
                  "items": [
                      {
                          "name": "Particle Emitter"
                      }
                  ]
              },

              {
                  "name": "Interaction",
                  "items": [
                      {
                          "name": "Keyboard"
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
                var point = new Point(0,(this.Height + (this.DropDownHeight*0.5))*units);
                var size = new Size(this.DropDownHeight*units,this.DropDownHeight*units);

                menuCats[i].Items.push(new MenuItem(point,size,name));

            }

        }
        this.MenuItems = menuCats;
        this.MenuTo(this,0,300);



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


        // MENU //


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

            // DRAW //
            cat.Draw(ctx,units,this);


            // ITEMS //
            if (this.DropDown > 0) {

                // CLIP RECTANGLE //

                ctx.save();
                ctx.beginPath();
                ctx.moveTo(0,this.Height*units);
                ctx.lineTo(this._Sketch.Width,this.Height*units);
                ctx.lineTo(this._Sketch.Width,(this.Height + this.DropDown)*units);
                ctx.lineTo(0,(this.Height + this.DropDown)*units);
                ctx.closePath();
                ctx.clip();


                // PAGINATION //
                var itemN = cat.Items.length;
                var margin = this.Margin;

                ctx.strokeStyle = "#393d43"; // White
                ctx.lineWidth = 2;

                // LEFT ARROW //
                ctx.beginPath();
                ctx.moveTo((margin*units) - (20*units),(this.Height + (this.DropDown*0.5) - 20)*units);
                ctx.lineTo((margin*units) - (40*units),(this.Height + (this.DropDown*0.5))*units);
                ctx.lineTo((margin*units) - (20*units),(this.Height + (this.DropDown*0.5) + 20)*units);
                ctx.stroke();

                ctx.strokeStyle = App.Palette[8]; // White

                // RIGHT ARROW //
                ctx.beginPath();
                ctx.moveTo(this._Sketch.Width - (margin*units) + (20*units),(this.Height + (this.DropDown*0.5) - 20)*units);
                ctx.lineTo(this._Sketch.Width - (margin*units) + (40*units),(this.Height + (this.DropDown*0.5))*units);
                ctx.lineTo(this._Sketch.Width - (margin*units) + (20*units),(this.Height + (this.DropDown*0.5) + 20)*units);
                ctx.stroke();


                ctx.lineWidth = 1;


                // DRAW ITEMS //
                for (var j=0; j<itemN; j++) {
                    var xPos = (margin + (this.DropDownHeight*0.5) + (this.DropDownHeight*j))*units;
                    var yPos = cat.ItemOffset;
                    // If in viewable/clickable area //
                    if (xPos < (this._Sketch.Width - (this.DropDownHeight*0.5))) {
                        cat.Items[j].Draw(ctx,units,xPos,yPos);
                    }

                }
                
                // END CLIP //
                ctx.restore();
            }
        }
    }

    IsPaginated(cat,units) {
        var itemN = cat.Items.length;
        return ((itemN * (this.DropDownHeight*units)) > this._Sketch.Width);
    }

    //-------------------------------------------------------------------------------------------
    //  TWEEN
    //-------------------------------------------------------------------------------------------


    MenuTo(panel,destination,t) {

        if (this._MenuTween) {
            this._MenuTween.stop();
        }
        this._MenuTween = new TWEEN.Tween({x: this.DropDown});
        this._MenuTween.to({x: destination}, t);
        this._MenuTween.onUpdate(function () {
            panel.DropDown = this.x;
        });
        this._MenuTween.easing(TWEEN.Easing.Exponential.InOut);
        this._MenuTween.start(this._LastVisualTick);
    }

    HoverTo(panel,destination,t) {

        var hoverTween = new TWEEN.Tween({x: panel.Selected});
        hoverTween.to({x: destination}, t);
        hoverTween.onUpdate(function () {
            panel.Selected = this.x;
        });
        hoverTween.easing(TWEEN.Easing.Exponential.InOut);
        hoverTween.start(this._LastVisualTick);
    }

    OffsetTo(panel,destination,t,delay) {

        var offsetTween = new TWEEN.Tween({x: panel.ItemOffset});
        offsetTween.to({x: destination}, t);
        offsetTween.onUpdate(function () {
            panel.ItemOffset = this.x;
        });
        offsetTween.easing(TWEEN.Easing.Exponential.InOut);
        offsetTween.delay(delay);
        offsetTween.start(this._LastVisualTick);
    }

    MarginTo(panel,destination,t,delay) {

        var marginTween = new TWEEN.Tween({x: panel.Margin});
        marginTween.to({x: destination}, t);
        marginTween.onUpdate(function () {
            panel.Margin = this.x;
        });
        marginTween.easing(TWEEN.Easing.Exponential.InOut);
        marginTween.delay(delay);
        marginTween.start(this._LastVisualTick);
    }


    //-------------------------------------------------------------------------------------------
    //  INTERACTION
    //-------------------------------------------------------------------------------------------


    MouseDown(point) {

        // SELECT CATEGORY //
        for (var i=0; i<this.MenuItems.length; i++) {
            if (this.MenuItems[i].Hover) {
                TWEEN.removeAll();
                this.MenuTo(this,this.DropDownHeight,500);
                this.HoverTo(this.MenuItems[i],1,400);
                this.OffsetTo(this.MenuItems[i],0,600,250);
                if (this.IsPaginated(this.MenuItems[i],this._Sketch.Unit.width)) {
                    this.MarginTo(this,60,600,50);
                } else {
                    this.MarginTo(this,0,600,50);
                }

                this._SelectedCategory = i;

                for (var j=0; j<this.MenuItems.length; j++) {
                    if (j!==i) {
                        this.HoverTo(this.MenuItems[j],0,250);
                        this.OffsetTo(this.MenuItems[j],this.DropDownHeight,250,0);
                    }
                }
            }
        }

        // CLOSE DROPDOWN //
        if (point.y > ((this.Height + this.DropDown)*this._Sketch.Unit.width) && this.DropDown > 0) {
            TWEEN.removeAll();
            this.MenuTo(this,0,300);
            this.MarginTo(this,0,600,50);
            for (var i=0; i<this.MenuItems.length; i++) {
                this.HoverTo(this.MenuItems[i],0,250);
                this.OffsetTo(this.MenuItems[i],this.DropDownHeight,250,0);
            }
        }
    }


    MouseMove(point) {

        var units = this._Sketch.Unit.width;
        for (var i=0; i<this.MenuItems.length; i++) {
            var cat = this.MenuItems[i];
            cat.Hover = this.HudCheck(cat.Position.x - (cat.Size.Width*0.5) + (2*units), (5*units), cat.Size.Width - (4*units), (this.Height*units) - (10*units), point.x, point.y );
        }
    }

    // IS CLICK WITHIN THIS BOX //
    HudCheck(x,y,w,h,mx,my) {
        return (mx>x && mx<(x+w) && my>y && my<(y+h));
    }


}

export = Header;