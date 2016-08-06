import DisplayObject = etch.drawing.DisplayObject;
import IDisplayContext = etch.drawing.IDisplayContext;
import {ColorTheme} from './ColorTheme';
import {IApp} from '../../IApp';
import {ThemeChangeEventArgs} from './ThemeChangeEventArgs';

declare var App: IApp;

export class ThemeManager  {

    public Themes: ColorTheme[];
    public Loaded: boolean;
    public CurrentTheme: ColorTheme;
    public CurrentThemeNo: number;
    private _Defaults: any;
    private _Value: any;
    public NewPalette: any[];

    // set color references
    // drawing might use: ctx.fillStyle = App.Palette[App.ThemeManager.Txt];
    public Txt: number;
    public MenuOrder: number[];
    public OptionsOrder: number[];
    public Power: number;

    ThemeChanged = new nullstone.Event<ThemeChangeEventArgs>();

    //-------------------------------------------------------------------------------------------
    //  SETUP
    //-------------------------------------------------------------------------------------------

    constructor() {

        this.Loaded = false;

        this.Themes = [
            new ColorTheme(
                "MODE STEREO",
                App.Config.PixelPaletteImagePath[0],
                {
                    options: [3,4,7,5,9]
                }
            )

            ,new ColorTheme(
                "PENCIL CONTROL",
                App.Config.PixelPaletteImagePath[2]
            )

            ,new ColorTheme(
                "FJORD",
                App.Config.PixelPaletteImagePath[1]
            )

            /*,new ColorTheme(
                "HOYA",
                App.Config.PixelPaletteImagePath[6],
                { txt: 11 }
            )*/
            ,new ColorTheme(
                "CONSOLE",
                App.Config.PixelPaletteImagePath[10],
                {
                    menu: [3,5,7,4,6],
                    options: [3,4,5,7,6]
                }

            )

            ,new ColorTheme(
                "FRIENDS",
                App.Config.PixelPaletteImagePath[3],
                {
                    menu: [3,5,7,4,6]
                }
            )

            ,new ColorTheme(
                "KORAL",
                App.Config.PixelPaletteImagePath[4],
                {
                    options: [7,6,9,4,3]
                }
            )

            ,new ColorTheme(
                "SEA CUCUMBER",
                App.Config.PixelPaletteImagePath[9],
                {
                    menu: [3,9,10,4,6],
                    options: [3,4,9,10,6]
                }
            )

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
                App.Config.PixelPaletteImagePath[8],
                {
                    menu: [6,5,7,4,3]
                }
            )

            /*,new ColorTheme(
             "CRYSTAL SWEETS",
             App.Config.PixelPaletteImagePath[11]
             )*/

            ,new ColorTheme(
                "ASH PEAK",
                App.Config.PixelPaletteImagePath[12],
                {
                    menu: [6,5,8,4,3],
                    options: [3,4,5,6,7],
                    txt: 11
                }
            )

            ,new ColorTheme(
                "VOLCANOLOGIST",
                App.Config.PixelPaletteImagePath[13],
                {
                    menu: [3,8,7,4,10],
                    txt: 11
                }
            )

            ,new ColorTheme(
                "IKKO",
                App.Config.PixelPaletteImagePath[14],
                {
                    //menu: [3,8,7,4,10],
                    txt: 11
                }
            )

            /*,new ColorTheme(
                "IKKO2",
                App.Config.PixelPaletteImagePath[15],
                {
                    //menu: [3,8,7,4,10],
                    txt: 11
                }
            )*/

            ,new ColorTheme(
                "LUCKY SIGN",
                App.Config.PixelPaletteImagePath[16],
                {
                    menu: [9,5,7,8,3],
                    txt: 11,
                    power: 4
                }
            )

            /*,new ColorTheme(
                "ERIC",
                App.Config.PixelPaletteImagePath[17],
                {
                    menu: [9,6,7,4,3],
                    txt: 11,
                    power: 5
                }
            )*/
        ];


        this._Defaults = {
            txt: 8,
            menu: [9,5,7,4,3],
            options: [3,4,9,7,5],
            power: 8
        };

        this._Value = {
            txt: this._Defaults.txt,
            menu: this._Defaults.menu,
            options: this._Defaults.options,
            power: this._Defaults.power
        };

        this.Txt = 16;
        this.MenuOrder = [17,18,19,20,21];
        this.OptionsOrder = [22,23,24,25,26];
        this.Power = 27;

    }

    //-------------------------------------------------------------------------------------------
    //  LOAD
    //-------------------------------------------------------------------------------------------


    LoadTheme(theme,firstLoad,disableThemeStorage?) {

        if (!this.Themes[theme]) { // theme no longer exists safety
            theme = 0;
        }
        if (!disableThemeStorage) {
            App.ThemeNo = theme;
        }
        
        
        this.CurrentThemeNo = theme;
        this.CurrentTheme = this.Themes[theme];
        var selectedtheme = this.Themes[theme];
        this._Value.txt = selectedtheme.Options.txt || this._Defaults.txt;
        this._Value.menu = selectedtheme.Options.menu || this._Defaults.menu;
        this._Value.options = selectedtheme.Options.options || this._Defaults.options;
        this._Value.power = selectedtheme.Options.power || this._Defaults.power;

        this.Loaded = false;
        var pixelPalette = new PixelPalette(selectedtheme.PaletteURL);
        pixelPalette.Load((palette: any[]) => {

            var i,l;

            // TEXT COL //
            this.Txt = palette.length;
            palette.push(palette[this._Value.txt].clone());
            this.NewPalette = palette;
            // MENU COLS //
            l = palette.length;
            this.MenuOrder = [l,l+1,l+2,l+3,l+4];
            for (i=0; i<this._Value.menu.length; i++) {
                palette.push(palette[this._Value.menu[i]].clone());
            }
            // MENU COLS //
            l = palette.length;
            this.OptionsOrder = [l,l+1,l+2,l+3,l+4];
            for (i=0; i<this._Value.options.length; i++) {
                palette.push(palette[this._Value.options[i]].clone());
            }
            // POWER COL //
            this.Power = palette.length;
            palette.push(palette[this._Value.power].clone());


            // CSS SHARE TEXT COL //
            var shareUrl = document.getElementById("shareUrl");
            shareUrl.style.color = App.ColorManager.ColorString(this.NewPalette[this.Txt]);
            var shareTitle = document.getElementById("shareTitle");
            shareTitle.style.color = App.ColorManager.ColorString(this.NewPalette[this.Txt]);
            var scSearch = document.getElementById("soundCloudSearch");
            scSearch.style.color = App.ColorManager.ColorString(this.NewPalette[this.Txt]);

            // CSS SELECTED TEXT HIGHLIGHT COLOUR //
            var bgLuminosity = App.ColorManager.GetLuminosity(this.NewPalette[1]);
            var highlightCol;
            if (bgLuminosity>127) {
                // BRIGHT BG //
                highlightCol = App.ColorManager.DarkerColor(this.NewPalette[1],40);
            } else {
                // DARK BG //
                highlightCol = App.ColorManager.LighterColor(this.NewPalette[1],95);
            }
            var col = App.ColorManager.ColorString(highlightCol);
            var styleElem = document.getElementById("selectStyle");
            styleElem.innerHTML='::selection{ background-color: ' + col + '; background-blend-mode: normal; mix-blend-mode: normal;}';


            this.Loaded = true;
            if (firstLoad) {
                this.ThemeChanged.raise(this, new ThemeChangeEventArgs(theme, palette));
            } else {
                for (i=0; i<palette.length; i++) {
                    this.ColorTo(App.Palette[i], this.NewPalette[i], 800);
                }
            }


            /*this.ThemeChanged.raise(this, new ThemeChangeEventArgs(theme, palette));

            if (App.Stage){
                for (i = 0; i < palette.length; i++) {
                    this.ColorTo(App.Palette[i], this.NewPalette[i], 800);
                }
            }*/
        });
    }

    //-------------------------------------------------------------------------------------------
    //  TWEEN
    //-------------------------------------------------------------------------------------------

    ColorTo(color, destination, t){

        var offsetTween = new window.TWEEN.Tween({r: color.R, g: color.G, b: color.B, a: color.A});
        offsetTween.to({r: destination.R, g: destination.G, b: destination.B, a: destination.A}, t);
        offsetTween.onUpdate(function () {
            color.R = Math.round(this.r);
            color.G = Math.round(this.g);
            color.B = Math.round(this.b);
            color.A = Math.round(this.a);
            color.toString = () => {
                return 'rgba(' + color.R + ',' + color.G + ',' + color.B + ',' + color.A + ')';
            }
        });
        offsetTween.easing(window.TWEEN.Easing.Exponential.InOut);
        offsetTween.start(App.Stage.lastVisualTick);
    }
}
