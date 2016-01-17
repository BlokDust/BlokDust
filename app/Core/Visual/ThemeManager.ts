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

    ThemeChanged = new nullstone.Event<ThemeChangeEventArgs>();

    //-------------------------------------------------------------------------------------------
    //  SETUP
    //-------------------------------------------------------------------------------------------

    constructor() {

        this.Loaded = false;

        this.Themes = [
            new ColorTheme(
                "MODE STEREO",
                App.Config.PixelPaletteImagePath[0]
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
                App.Config.PixelPaletteImagePath[10]

            )

            ,new ColorTheme(
                "FRIENDS",
                App.Config.PixelPaletteImagePath[3]
            )

            ,new ColorTheme(
                "KORAL",
                App.Config.PixelPaletteImagePath[4]
            )

            ,new ColorTheme(
                "SEA CUCUMBER",
                App.Config.PixelPaletteImagePath[9]
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
                App.Config.PixelPaletteImagePath[8]
            )
        ];


        this._Defaults = {
            txt: 8,
            menu: [9,5,7,4,3],
            options: [3,4,9,7,5]
        };

        this._Value = {
            txt: this._Defaults.txt,
            menu: this._Defaults.menu,
            options: this._Defaults.options
        };

        this.Txt = 16;
        this.MenuOrder = [9,5,7,4,3];
        this.OptionsOrder = [3,4,9,7,5];

    }

    //-------------------------------------------------------------------------------------------
    //  LOAD
    //-------------------------------------------------------------------------------------------


    LoadTheme(theme,firstLoad) {

        this.CurrentThemeNo = theme;
        this.CurrentTheme = this.Themes[theme];
        var selectedtheme = this.Themes[theme];
        this._Value.txt = selectedtheme.Options.txt || this._Defaults.txt;


        this.Loaded = false;
        var pixelPalette = new PixelPalette(selectedtheme.PaletteURL);
        pixelPalette.Load((palette: any[]) => {

            this.Txt = palette.length;
            palette.push(palette[this._Value.txt].clone());
            this.NewPalette = palette;

            var shareUrl = document.getElementById("shareUrl");
            shareUrl.style.color = this.NewPalette[this.Txt];

            this.Loaded = true;
            if (firstLoad) {
                this.ThemeChanged.raise(this, new ThemeChangeEventArgs(palette));
            } else {
                for (var i=0; i<palette.length; i++) {
                    this.ColorTo(App.Palette[i], this.NewPalette[i], 800);
                }
            }
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
        offsetTween.start(App.Stage.LastVisualTick);
    }
}
