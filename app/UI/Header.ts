/**
 * Created by luketwyman on 25/01/2015.
 */
import App = require("./../App");
import Size = Fayde.Utils.Size;
import Grid = require("./../Grid");
import BlocksSketch = require("./../BlocksSketch");
import MenuCategory = require("./MenuCategory");

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
    private _DropDownHeight: number;
    private _SelectedCategory: number;
    private _MenuCols: number[];
    public Hover: number[];

    private _Timer: Fayde.ClockTimer;
    private _LastVisualTick: number = new Date(0).getTime();

    constructor(ctx: CanvasRenderingContext2D,sketch: BlocksSketch) {
        this._Ctx = ctx;
        this._Sketch = sketch;
        this._Units = 1.7;
        this.Height = 60;
        this.MenuItems = [];
        this._DropDownHeight = 0;
        this._SelectedCategory = 0;
        this._MenuCols = [9,5,7,4,3];

        this._Timer = new Fayde.ClockTimer();
        this._Timer.RegisterTimer(this);

        this.MenuJson =
        {
          "categories": [

              {
                  "name": "Power",
                  "items": [
                      {
                          "name": "Particle Emitter"
                      }
                  ]
              },

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


        // POPULATE CATEGORIES //
        for (var i=0; i<n; i++) {
            var name = json.categories[i].name.toUpperCase();
            var point = new Point(catX + (catWidth[i]*0.5),0);
            var size = new Size(catWidth[i],16);
            menuCats[i] = new MenuCategory(point,size,name);
            catX += catWidth[i];
        }
        this.MenuItems = menuCats;
    }

    //-------------------------------------------------------------------------------------------
    //  DRAW
    //-------------------------------------------------------------------------------------------


    Draw() {
        var units = this._Sketch.Unit.width;
        var ctx = this._Ctx;
        var dataType = units*10;
        var headerType = Math.round(units*28);
        var gutter = 60;
        var thisHeight = Math.round(this.Height*units);
        var dropDown = Math.round(this._DropDownHeight*units);


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
        ctx.textAlign = "center";
        ctx.strokeStyle = "#393d43";// Grey
        ctx.font = "400 " + dataType + "px Dosis";

        // DIVIDERS //
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

        for (var i=0;i<this.MenuItems.length;i++) {
            var cat = this.MenuItems[i];
            var x = cat.Position.x;
            var width = (cat.Size.Width*0.5);

            // SELECTION COLOUR //
            var col = this._MenuCols[i - (Math.floor(i/this._MenuCols.length)*(this._MenuCols.length))];
            ctx.fillStyle = App.Palette[col];


            ctx.beginPath();
            ctx.moveTo(x - width,0);
            ctx.lineTo(x + width ,0);
            ctx.lineTo(x + width,thisHeight*cat.Selected);
            ctx.lineTo(x + (10*units),thisHeight*cat.Selected);
            ctx.lineTo(x,(thisHeight + (10*units))*cat.Selected);
            ctx.lineTo(x - (10*units),thisHeight*cat.Selected);
            ctx.lineTo(x - width,thisHeight*cat.Selected);
            ctx.closePath();
            ctx.fill();


            // TEXT //
            ctx.fillStyle = App.Palette[8];// White
            ctx.fillText(cat.Name, x ,(thisHeight * 0.5) + (dataType * 0.38));

            // HOVER //
            if (cat.Hover && dropDown<1) {
                ctx.fillStyle = "#000";
                ctx.globalAlpha = 0.9;

                ctx.beginPath();
                ctx.moveTo(x - (10*units),thisHeight);
                ctx.lineTo(x,thisHeight + (10*units));
                ctx.lineTo(x + (10*units),thisHeight);
                ctx.closePath();
                ctx.fill();

            }
        }


    }

    //-------------------------------------------------------------------------------------------
    //  TWEEN
    //-------------------------------------------------------------------------------------------


    MenuTo(panel,destination,t) {

        if (this._MenuTween) {
            this._MenuTween.stop();
        }
        this._MenuTween = new TWEEN.Tween({x: this._DropDownHeight});
        this._MenuTween.to({x: destination}, t);
        this._MenuTween.onUpdate(function () {
            panel._DropDownHeight = this.x;
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

    //-------------------------------------------------------------------------------------------
    //  INTERACTION
    //-------------------------------------------------------------------------------------------


    MouseDown(point) {

        // SELECT CATEGORY //
        for (var i=0; i<this.MenuItems.length; i++) {
            if (this.MenuItems[i].Hover) {
                this.MenuTo(this,120,500);
                this.HoverTo(this.MenuItems[i],1,500);
                this._SelectedCategory = i;

                for (var j=0; j<this.MenuItems.length; j++) {
                    if (j!==i) {
                        this.HoverTo(this.MenuItems[j],0,300);
                    }
                }
            }
        }

        // CLOSE DROPDOWN //
        if (point.y > ((this.Height + this._DropDownHeight)*this._Sketch.Unit.width)) {
            this.MenuTo(this,0,300);
            for (var i=0; i<this.MenuItems.length; i++) {
                this.HoverTo(this.MenuItems[i],0,300);
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