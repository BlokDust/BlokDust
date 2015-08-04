/**
 * Created by luketwyman on 21/07/2015.
 */

class Metrics {



    // APP WIDE MEASURING AND CONVERSION //
    /*
    App.Unit is the scaled unit used for all drawing and positioning.
    It's calculated by taking the screen width and dividing it by screenDivision
    */


    public TxtHeader: string;
    public TxtSlider: string;
    public TxtUrl: string;
    public TxtMid: string;
    public TxtLarge: string;
    public TxtBody: string;
    public TxtItalic: string;
    public TxtItalic2: string;
    public TxtData: string;


    Metrics() {

        var screenDivision = 850; // divisions of the screen width to make unit
        var gridSize = 15;  // unit width of a grid cell

        // GET DISPLAY SIZE //
        const canvas = App.Canvas;
        const width = window.innerWidth;
        const height = window.innerHeight;
        const ratio = this.PixelRatio;


        // DEFINE UNIT & GRID SIZE //
        App.Unit = (width/screenDivision)*ratio;
        var unit = App.Unit;
        App.GridSize = gridSize * unit;


        // USE PIXEL RATIO FOR RETINA DISPLAYS //
        canvas.width = width * ratio;
        canvas.height = height * ratio;
        canvas.style.width = width + "px";
        canvas.style.height = height + "px";
        (<any>canvas).getContext("2d").setTransform(ratio, 0, 0, ratio, 0, 0);
        App.Width = width * ratio;
        App.Height = height * ratio;



        // SET GLOBAL TYPE STYLES //
        var headerType = Math.round(unit*28);
        var sliderType = Math.round(unit*33);
        var urlType = Math.round(unit*(24/this.PixelRatio));
        var largeType = Math.round(unit*12);
        var midType = Math.round(unit*10);
        var bodyType = Math.round(unit*8);
        var italicType = Math.round(unit*7.5);
        var italicType2 = Math.round(unit*9);
        var dataType = Math.round(unit*5);

        this.TxtHeader = "200 " + headerType + "px Dosis";
        this.TxtSlider = "200 " + sliderType + "px Dosis";
        this.TxtUrl = "200 " + urlType + "px Dosis";
        this.TxtMid = "400 " + midType + "px Dosis";
        this.TxtLarge = "400 " + largeType + "px Dosis";
        this.TxtBody = "200 " + bodyType + "px Dosis";
        this.TxtItalic = "300 italic " + italicType + "px Merriweather Sans";
        this.TxtItalic2 = "300 italic " + italicType2 + "px Merriweather Sans";
        this.TxtData = "400 " + dataType + "px PT Sans";


        // STYLE DOM SELECTED TEXT HIGHLIGHT COLOUR //
        var styleElem = document.getElementById("selectStyle");
        styleElem.innerHTML='::selection{ background-color: ' + App.Palette[1] + '; background-blend-mode: normal; mix-blend-mode: normal;}';
    }

    get PixelRatio(): number {
        const ctx:any = document.createElement("canvas").getContext("2d");
        const dpr = window.devicePixelRatio || 1;
        const bsr = ctx.webkitBackingStorePixelRatio ||
            ctx.mozBackingStorePixelRatio ||
            ctx.msBackingStorePixelRatio ||
            ctx.oBackingStorePixelRatio ||
            ctx.backingStorePixelRatio || 1;

        return dpr / bsr;
    }

    //public ConvertScaledGridUnitsToAbsolute(point: Point): Point {
    //    return new Point((this.ScaledCellWidth.width * point.x) + this.TranslateTransform.X, (this.ScaledCellWidth.width * point.y) + this.TranslateTransform.Y);
    //}
}

export = Metrics;