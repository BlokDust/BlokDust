/**
 * Created by luketwyman on 25/01/2015.
 */
import App = require("./../App");
import Size = Fayde.Utils.Size;
import Grid = require("./../Grid");
import BlocksSketch = require("./../BlocksSketch");
import MenuCategory = require("./MenuCategory");

class Header {

    private _Ctx: CanvasRenderingContext2D;
    private _Units: number;
    private _Sketch: BlocksSketch;
    public Height: number;
    public MenuItems: MenuCategory[] = [];
    private _MenuWidths: number[];
    public MenuJson;

    constructor(ctx: CanvasRenderingContext2D,sketch: BlocksSketch) {
        this._Ctx = ctx;
        this._Sketch = sketch;
        this._Units = 1.7;
        this.Height = 60;
        this.MenuItems = [];
        this._MenuWidths = [];

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
        var catWidth = [0];
        var menuWidth = 0;


        // total text width //
        for (var i=0; i<n; i++) {
            catWidth[i] = ctx.measureText(json.categories[i].name.toUpperCase()).width;
            menuWidth += catWidth[i];
        }


        // total gutter width //
        menuWidth += ((n-1)*(gutter*units));
        var catX = ((this._Sketch.Width*0.5) - (menuWidth*0.5));


        // POPULATE CATEGORIES //
        for (var i=0; i<n; i++) {
            if (i>0) {
                catX += catWidth[i-1] + (gutter*units);
            }
            var name = json.categories[i].name.toUpperCase();
            var point = new Point(catX,0);
            var size = new Size(catWidth[i],16);
            menuCats[i] = new MenuCategory(point,size,name);
        }
        this.MenuItems = menuCats;
    }



    Draw() {
        var units = this._Sketch.Unit.width;
        var ctx = this._Ctx;
        var dataType = units*10;
        var headerType = Math.round(units*28);
        var gutter = 60;
        var thisHeight = Math.round(this.Height*units);


        // BG //
        ctx.fillStyle = "#000";
        ctx.globalAlpha = 0.16;
        ctx.fillRect(0,0,this._Sketch.Width,thisHeight + (5*units)); // shadow
        ctx.globalAlpha = 0.9;
        ctx.fillRect(0,0,this._Sketch.Width,thisHeight); // solid


        // TT //
        ctx.globalAlpha = 1;
        ctx.fillStyle = App.Palette[8];// Grey
        ctx.textAlign = "left";
        ctx.font = "200 " + headerType + "px Dosis";
        ctx.fillText("BLOKDUST",20*units,(thisHeight * 0.5) + (headerType * 0.38));


        // MENU //
        ctx.textAlign = "left";
        ctx.strokeStyle = "#393d43";// Grey
        ctx.font = "400 " + dataType + "px Dosis";

        // DIVIDERS //
        for (var i=0;i<this.MenuItems.length;i++) {
            ctx.globalAlpha = 1;
            var menuX = this.MenuItems[i].Position.x;
            if (i>0) {
                ctx.beginPath();
                ctx.moveTo(menuX-((gutter*0.5)*units),(thisHeight*0.5)-(16*units));
                ctx.lineTo(menuX-((gutter*0.5)*units),(thisHeight*0.5)+(16*units));
                ctx.stroke();
            }

            // TEXT //
            ctx.fillStyle = App.Palette[8];// White
            ctx.fillText(this.MenuItems[i].Name, menuX ,(thisHeight * 0.5) + (dataType * 0.38));

            // HOVER //
            if (this.MenuItems[i].Selected) {
                ctx.fillStyle = "#000";
                ctx.globalAlpha = 0.9;
                var cat = this.MenuItems[i];
                var x = cat.Position.x + (cat.Size.Width * 0.5);

                ctx.beginPath();
                ctx.moveTo(x - (10*units),thisHeight);
                ctx.lineTo(x,thisHeight + (10*units));
                ctx.lineTo(x + (10*units),thisHeight);
                ctx.closePath();
                ctx.fill();

            }
        }


    }

    MouseMove(point) {

        var units = this._Sketch.Unit.width;

        for (var i=0; i<this.MenuItems.length; i++) {
            var cat = this.MenuItems[i];
            cat.Selected = this.HudCheck(cat.Position.x - (20*units), (5*units), cat.Size.Width + (40*units), (this.Height*units) - (10*units), point.x, point.y );
        }

    }

    // IS CLICK WITHIN THIS BOX //
    HudCheck(x,y,w,h,mx,my) {
        return (mx>x && mx<(x+w) && my>y && my<(y+h));
    }


}

export = Header;