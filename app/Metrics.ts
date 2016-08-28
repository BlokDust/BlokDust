///<amd-dependency path="etch"/>.
declare var App: IApp;
import Point = etch.primitives.Point;
import {IApp} from './IApp';
import {Device} from './Device';

export class Metrics {

    // APP WIDE MEASURING AND CONVERSION //
    /*
    App.Unit is the scaled unit used for all drawing and positioning.
    It's calculated by taking the screen width and dividing it by screenDivision
    */

    public TxtHeader: string;
    public TxtHeaderPR: string;
    public TxtSlider: string;
    public TxtUrl: string;
    public TxtUrl2: string;
    public TxtMid: string;
    public TxtLarge: string;
    public TxtBody: string;
    public TxtItalic: string;
    public TxtItalic2: string;
    public TxtItalic3: string;
    public TxtData: string;

    public C: Point; // center screen
    public OptionsX: number; // x position of options panel
    public OptionsPoint: Point;
    public ItemsPerPage: number; // blocks per page in category display
    public Device: Device;
    public HeaderHeight: number;
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
        this.Device = Device.desktop;
        this._DeviceZoom = 1;
        this.HeaderHeight = 60;
    }

    Compute() {

        this._ScreenDivision = 850; // divisions of the screen width to make unit
        var gridSize = 15;  // unit width of a grid cell

        // GET DISPLAY SIZE //
        const canvas = App.Canvas;
        var width = window.innerWidth;
        var height = window.innerHeight;

        //DEVICE BREAKPOINTS //
        this.DeviceCheck();

        // DEFINE UNIT & GRID SIZE //
        App.Unit = (width/this._ScreenDivision) * this.PixelRatio;
        //App.ScaledUnit = (App.Unit * App.ZoomLevel) * this._DeviceZoom;
        App.GridSize = gridSize * App.Unit;
        //App.ScaledGridSize = (App.GridSize * App.ZoomLevel) * this._DeviceZoom;

        this.UpdateGridScale();

        // USE PIXEL RATIO FOR RETINA DISPLAYS //
        canvas.width = width * this.PixelRatio;
        canvas.height = height * this.PixelRatio;
        canvas.style.width = width + "px";
        canvas.style.height = height + "px";

        for (var i=0; i<App.SubCanvas.length; i++) {
            var c = App.SubCanvas[i];
            c.width = (width+1.5) * this.PixelRatio;
            c.height = (height) * this.PixelRatio;
            c.style.width = (width*1.5) + "px";
            c.style.height = (height) + "px";
        }

        App.Width = width * this.PixelRatio;
        App.Height = height * this.PixelRatio;
        App.MainScene.width = App.Width;
        App.MainScene.height = App.Height;

        this.C.x = App.Width * 0.5;
        this.C.y = App.Height * 0.5;

        // SET GLOBAL TYPE STYLES //
        var headerType = Math.round(App.Unit * 28);
        var headerTypePR = Math.round(App.Unit * (28/this.PixelRatio));
        var sliderType = Math.round(App.Unit * 33);
        var urlType = Math.round(App.Unit * (24/this.PixelRatio));
        var urlType2 = Math.round(App.Unit * 24);
        var largeType = Math.round(App.Unit * 11);
        var midType = Math.round(App.Unit * 10);
        var bodyType = Math.round(App.Unit * 8);
        var italicType = Math.round(App.Unit * 7.5);
        var italicType2 = Math.round(App.Unit * 8);
        var italicType3 = Math.round(App.Unit * 9);
        var dataType = Math.round(App.Unit * 5);

        this.TxtHeader = "200 " + headerType + "px Dosis";
        this.TxtHeaderPR = "200 " + headerTypePR + "px Dosis";
        this.TxtSlider = "200 " + sliderType + "px Dosis";
        this.TxtUrl = "200 " + urlType + "px Dosis";
        this.TxtUrl2 = "200 " + urlType2 + "px Dosis";
        this.TxtMid = "400 " + midType + "px Dosis";
        this.TxtLarge = "400 " + largeType + "px Dosis";
        this.TxtBody = "200 " + bodyType + "px Dosis";
        this.TxtItalic = "300 italic " + italicType + "px Merriweather Sans";
        this.TxtItalic2 = "300 italic " + italicType2 + "px Merriweather Sans";
        this.TxtItalic3 = "300 italic " + italicType3 + "px Merriweather Sans";
        this.TxtData = "400 " + dataType + "px PT Sans";

        /*// STYLE DOM SELECTED TEXT HIGHLIGHT COLOUR //
        var styleElem = document.getElementById("selectStyle");
        var col = App.ColorManager.ColorString(App.Palette[1]);
        styleElem.innerHTML='::selection{ background-color: ' + col + '; background-blend-mode: normal; mix-blend-mode: normal;}';*/
    }

    UpdateGridScale() {
        App.ScaledUnit = (App.Unit * App.ZoomLevel) * this._DeviceZoom;
        App.ScaledGridSize = (App.GridSize * App.ZoomLevel) * this._DeviceZoom;
        App.ScaledDragOffset.x = (App.DragOffset.x * App.ZoomLevel);
        App.ScaledDragOffset.y = (App.DragOffset.y * App.ZoomLevel);
    }

    get PixelRatio(): number {
        return Utils.Device.getPixelRatio(App.Canvas.ctx)
    }

    //-------------------------------------------------------------------------------------------
    //  DEVICE RESPONSE
    //-------------------------------------------------------------------------------------------

    public DeviceCheck() {
        // DEVICE BREAKPOINTS //
        var width = window.innerWidth;
        var height = window.innerHeight;

        // MOBILE PORTRAIT //
        if (height > (width*1.3)) {
            this._ScreenDivision = 475;
            this.OptionsPoint = new Point(0.5,0.4);
            this.ItemsPerPage = 3;
            this._DeviceZoom = 1;
            this.Device = Device.mobile;
        }

        // TABLET PORTRAIT //
        else if (height > (width*1.1)) {
            this._ScreenDivision = 600;
            this.OptionsPoint = new Point(0.2,0.5);
            this.ItemsPerPage = 4;
            this._DeviceZoom = 1;
            this.Device = Device.tablet;
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
            this.Device = Device.desktop;
        }
    }

    //-------------------------------------------------------------------------------------------
    //  UNIT CONVERSIONS
    //-------------------------------------------------------------------------------------------

    public CursorToGrid(point: Point): Point {
        var x = Math.round(((point.x - (App.ScaledDragOffset.x*App.Unit)) - this.C.x)/App.ScaledGridSize);
        var y = Math.round(((point.y - (App.ScaledDragOffset.y*App.Unit)) - this.C.y)/App.ScaledGridSize);
        return new Point(x,y);
    }

    public PointOnGrid(point: Point): Point {
        var x = ((this.C.x + (App.ScaledDragOffset.x*App.Unit)) + (point.x * App.ScaledGridSize));
        var y = ((this.C.y + (App.ScaledDragOffset.y*App.Unit)) + (point.y * App.ScaledGridSize));
        return new Point(x,y);
    }

    public UnscaledPointOnGrid(point: Point): Point {
        var x = (this.C.x + (App.DragOffset.x*App.Unit)) + (point.x * App.GridSize);
        var y = (this.C.y + (App.DragOffset.y*App.Unit)) + (point.y * App.GridSize);
        return new Point(x,y);
    }

    public UndraggedPointOnGrid(point: Point): Point {
        var x = this.C.x + (point.x * App.ScaledGridSize);
        var y = this.C.y + (point.y * App.ScaledGridSize);
        return new Point(x,y);
    }

    public FloatOnGrid(point: Point): Point {
        var x = (this.C.x + (App.ScaledDragOffset.x*App.Unit)) + (point.x * App.ZoomLevel);
        var y = (this.C.y + (App.ScaledDragOffset.y*App.Unit)) + (point.y * App.ZoomLevel);
        return new Point(x,y);
    }

    public GetRelativePoint(point: Point, offset: Point): Point {
        return new Point(point.x + offset.x, point.y + offset.y);
    }

    public ConvertGridUnitsToAbsolute(point: Point): Point {
        return new Point(App.GridSize * point.x, App.GridSize * point.y);
    }

    public ConvertToPixelRatioPoint(point: Point){
        point.x *= this.PixelRatio;
        point.y *= this.PixelRatio;
    }

    public VectorFromAngle(angle) {
        // point temp replaces vector
        return new Point(Math.cos(angle),Math.sin(angle));
    }
}
