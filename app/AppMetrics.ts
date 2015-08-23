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
    public OptionsX: number; // x position of options panel
    public OptionsPoint: Point;
    public ItemsPerPage: number; // blocks per page in category display
    public Device: string;
    private _DeviceZoom: number;
    private _ScreenDivision: number;

    constructor() {
        App.ZoomLevel = 1;
        App.DragOffset = new Point(0,0);
        App.ScaledDragOffset = new Point(0,0);
        this.C = new Point(0,0);
        this.OptionsX = 0.3;
        this.OptionsPoint = new Point(0.3,0.6); //screen percentage
        this.ItemsPerPage = 6;
        this.Device = "desktop";
        this._DeviceZoom = 1;
    }


    Metrics() {

        this._ScreenDivision = 850; // divisions of the screen width to make unit
        var gridSize = 15;  // unit width of a grid cell

        // GET DISPLAY SIZE //
        const canvas = App.Canvas;
        const width = window.innerWidth;
        const height = window.innerHeight;
        const ratio = this.PixelRatio;


        //DEVICE BREAKPOINTS //
        this.DeviceCheck();


        // DEFINE UNIT & GRID SIZE //
        App.Unit = (width/this._ScreenDivision)*ratio;
        App.ScaledUnit = (App.Unit * App.ZoomLevel) * this._DeviceZoom;
        var unit = App.Unit;
        App.GridSize = gridSize * unit;
        App.ScaledGridSize = (App.GridSize * App.ZoomLevel) * this._DeviceZoom;


        // USE PIXEL RATIO FOR RETINA DISPLAYS //
        canvas.width = width * ratio;
        canvas.height = height * ratio;
        canvas.style.width = width + "px";
        canvas.style.height = height + "px";
        App.Ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        App.Width = width * ratio;
        App.Height = height * ratio;
        App.MainScene.Width = App.Width;
        App.MainScene.Height = App.Height;
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
        App.ScaledUnit = (App.Unit * App.ZoomLevel) * this._DeviceZoom;
        App.ScaledGridSize = (App.GridSize * App.ZoomLevel) * this._DeviceZoom;
        App.ScaledDragOffset.x = (App.DragOffset.x * App.ZoomLevel);
        App.ScaledDragOffset.y = (App.DragOffset.y * App.ZoomLevel);
    }


    get PixelRatio(): number {
        const ctx = App.Ctx;
        const dpr = window.devicePixelRatio || 1;
        const bsr = ctx.webkitBackingStorePixelRatio ||
            ctx.mozBackingStorePixelRatio ||
            ctx.msBackingStorePixelRatio ||
            ctx.oBackingStorePixelRatio ||
            ctx.backingStorePixelRatio || 1;

        return dpr / bsr;
    }

    //-------------------------------------------------------------------------------------------
    //  DEVICE RESPONSE
    //-------------------------------------------------------------------------------------------


    public DeviceCheck() {
        // DEVICE BREAKPOINTS //
        const width = window.innerWidth;
        const height = window.innerHeight;

        // MOBILE PORTRAIT //
        if (height > (width*1.3)) {
            this._ScreenDivision = 475;
            this.OptionsPoint = new Point(0.5,0.4);
            this.ItemsPerPage = 3;
            this._DeviceZoom = 1.5;
            this.Device = "mobile";
            console.log("MOBILE");
        }

        // TABLET PORTRAIT //
        else if (height > (width*1.1)) {
            this._ScreenDivision = 600;
            this.OptionsPoint = new Point(0.2,0.5);
            this.ItemsPerPage = 4;
            this._DeviceZoom = 1.2;
            this.Device = "tablet";
            console.log("TABLET");
        }

        /*// MOBILE LANDSCAPE //
        else if (width<800) {
            this._ScreenDivision = 600;
            this.OptionsPoint = new Point(0.2,0.5);
            this.ItemsPerPage = 4;
            this.Device = "mobileLandscape";
            console.log("MOBILE LANDSCAPE");
        }*/

        /*// TABLET LANDSCAPE //
        else if (width<1000) {
            this._ScreenDivision = 675;
            this.OptionsPoint = new Point(0.2,0.5);
            this.ItemsPerPage = 5;
            this.Device = "tabletLandscape";
            console.log("TABLET LANDSCAPE");
        }*/

        // DESKTOP //
        else {
            this.OptionsPoint = new Point(0.3,0.6);
            this.ItemsPerPage = 6;
            this._DeviceZoom = 1;
            this.Device = "desktop";
            console.log("DESKTOP");
        }
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
        var x = ((this.C.x + App.ScaledDragOffset.x) + (point.x * App.ScaledGridSize));
        var y = ((this.C.y + App.ScaledDragOffset.y) + (point.y * App.ScaledGridSize));
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