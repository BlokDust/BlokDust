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
    public TxtUrl2: string;
    public TxtMid: string;
    public TxtLarge: string;
    public TxtBody: string;
    public TxtItalic: string;
    public TxtItalic2: string;
    public TxtData: string;

    public C: Point; // center screen

    constructor() {
        App.ZoomLevel = 1;
        App.DragOffset = new Point(0,0);
        App.ScaledDragOffset = new Point(0,0);
        this.C = new Point(0,0);
    }


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
        App.ScaledUnit = App.Unit * App.ZoomLevel;
        var unit = App.Unit;
        App.GridSize = gridSize * unit;
        App.ScaledGridSize = App.GridSize * App.ZoomLevel;


        // USE PIXEL RATIO FOR RETINA DISPLAYS //
        canvas.width = width * ratio;
        canvas.height = height * ratio;
        canvas.style.width = width + "px";
        canvas.style.height = height + "px";
        (<any>canvas).getContext("2d").setTransform(ratio, 0, 0, ratio, 0, 0);
        App.Width = width * ratio;
        App.Height = height * ratio;
        this.C.x = App.Width * 0.5;
        this.C.y = App.Height * 0.5;



        // SET GLOBAL TYPE STYLES //
        var headerType = Math.round(unit*28);
        var sliderType = Math.round(unit*33);
        var urlType = Math.round(unit*(24/this.PixelRatio));
        var urlType2 = Math.round(unit*24);
        var largeType = Math.round(unit*12);
        var midType = Math.round(unit*10);
        var bodyType = Math.round(unit*8);
        var italicType = Math.round(unit*7.5);
        var italicType2 = Math.round(unit*9);
        var dataType = Math.round(unit*5);

        this.TxtHeader = "200 " + headerType + "px Dosis";
        this.TxtSlider = "200 " + sliderType + "px Dosis";
        this.TxtUrl = "200 " + urlType + "px Dosis";
        this.TxtUrl2 = "200 " + urlType2 + "px Dosis";
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


    UpdateGridScale() {
        App.ScaledUnit = App.Unit * App.ZoomLevel;
        App.ScaledGridSize = App.GridSize * App.ZoomLevel;
        App.ScaledDragOffset.x = App.DragOffset.x * App.ZoomLevel;
        App.ScaledDragOffset.y = App.DragOffset.y * App.ZoomLevel;
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


    //-------------------------------------------------------------------------------------------
    //  UNIT CONVERSIONS
    //-------------------------------------------------------------------------------------------


    public CursorToGrid(point: Point): Point {
        var x = Math.round(((point.x - App.ScaledDragOffset.x) - this.C.x)/App.ScaledGridSize);
        var y = Math.round(((point.y - App.ScaledDragOffset.y) - this.C.y)/App.ScaledGridSize);
        return new Point(x,y);
    }

    public PointOnGrid(point: Point): Point {
        var x = (this.C.x + App.ScaledDragOffset.x) + (point.x * App.ScaledGridSize);
        var y = (this.C.y + App.ScaledDragOffset.y) + (point.y * App.ScaledGridSize);
        return new Point(x,y);
    }

    public UnscaledPointOnGrid(point: Point): Point {
        var x = (this.C.x + App.DragOffset.x) + (point.x * App.GridSize);
        var y = (this.C.y + App.DragOffset.y) + (point.y * App.GridSize);
        return new Point(x,y);
    }

    public FloatOnGrid(point: Point): Point {
        var x = (this.C.x + App.ScaledDragOffset.x) + (point.x * App.ZoomLevel);
        var y = (this.C.y + App.ScaledDragOffset.y) + (point.y * App.ZoomLevel);
        return new Point(x,y);
    }

    public GetRelativePoint(point: Point, offset: Point): Point {
        return new Point(point.x + offset.x, point.y + offset.y);
    }

    public ConvertGridUnitsToAbsolute(point: Point): Point {
        return new Point(App.GridSize * point.x, App.GridSize * point.y);
    }
}

export = Metrics;