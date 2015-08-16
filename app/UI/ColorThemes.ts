/**
 * Created by luketwyman on 09/08/2015.
 */

import ColorTheme = require("./ColorTheme");

class ColorThemes {

    public Themes: ColorTheme[];
    public Loaded: boolean;
    public CurrentTheme: number;
    private _Defaults: any;
    private _Value: any;

    // set color references
    // drawing might use: ctx.fillStyle = App.Palette[App.Color.Txt];
    public Txt: number;

    constructor() {

        this.Loaded = false;

        this.Themes = [
            new ColorTheme(
                "DARK CREAM",
                App.Config.PixelPaletteImagePath[0]
            )

            ,new ColorTheme(
                "FJORD",
                App.Config.PixelPaletteImagePath[1]
            )

            ,new ColorTheme(
                "PENCIL CONTROL",
                App.Config.PixelPaletteImagePath[2]
            )

            ,new ColorTheme(
                "HOYA",
                App.Config.PixelPaletteImagePath[6],
                { txt: 11 }
            )

            ,new ColorTheme(
                "FRIENDS",
                App.Config.PixelPaletteImagePath[3]
            )

            /*,new ColorTheme(
                "KORAL",
                App.Config.PixelPaletteImagePath[4]
            )

            ,new ColorTheme(
                "SEA CUCUMBER",
                App.Config.PixelPaletteImagePath[9]
            )*/

            /*,new ColorTheme(
                "VINE BLUSH",
                App.Config.PixelPaletteImagePath[5]
            )*/

            ,new ColorTheme(
                "RIKI",
                App.Config.PixelPaletteImagePath[7]
            )

            ,new ColorTheme(
                "ARROW MOUNTAIN",
                App.Config.PixelPaletteImagePath[8]
            )




        ];



        this._Defaults = {
            txt: 8
        };

        this._Value = {
            txt: this._Defaults.txt
        };

    }

    LoadTheme(theme,firstLoad) {

        this.CurrentTheme = theme;
        var selectedtheme = this.Themes[theme];
        this._Value.txt = selectedtheme.Options.txt || this._Defaults.txt;


        this.Loaded = false;
        var pixelPalette = new PixelPalette(selectedtheme.PaletteURL);
        pixelPalette.Load((palette: string[]) => {

            App.Palette = palette;
            this.Txt = this._Value.txt;



            this.Loaded = true;
            if (firstLoad) {
                App.LoadReady();
            } else {
                App.Message(selectedtheme.Name);
            }
        });
    }

}

export = ColorThemes;