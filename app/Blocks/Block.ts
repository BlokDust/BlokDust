import IBlock = require("./IBlock");
import Grid = require("../Grid");
import Particle = require("../Particle");
import DisplayObject = require("../DisplayObject");
import BlocksSketch = require("../BlocksSketch");
import ParametersPanel = require("../UI/OptionsPanel");
import Size = minerva.Size;

class Block extends DisplayObject implements IBlock {

    public Id: number;
    public Type: any;
    public Click: Fayde.RoutedEvent<Fayde.RoutedEventArgs> = new Fayde.RoutedEvent<Fayde.RoutedEventArgs>();
    public Position: Point; // in grid units
    public LastPosition: Point; // in grid units
    public IsPressed: boolean = false;
    public IsSelected: boolean = false;
    public Outline: Point[] = [];
    public ZIndex;
    public OptionsForm;
    public Params: any;
    private _Duplicable: boolean = false;

    Init(sketch?: Fayde.Drawing.SketchContext): void {
        super.Init(sketch);

        this.Update();
    }

    Update() {

    }

    Draw() {
        super.Draw();

        //if (this.IsRenderCached) return;

        this.Ctx.globalAlpha = this.IsPressed && this.IsSelected ? 0.5 : 1;

        /*if (window.debug){
            this.Ctx.fillStyle = "#fff";
            var pos = this.Grid.GetAbsPosition(this._GetRelGridPosition(new Point(-2, -2)));
            this.Ctx.fillText("" + this.ZIndex, pos.x, pos.y);
        }*/
    }

    // x and y are grid units. grid units are the divisor of the blocks view (1/50)
    // so if x = -1, that's (width/50)*-1
    DrawMoveTo(x, y) {
        var p = App.Metrics.GetRelativePoint(this.Position, new Point(x, y));
        p = App.Metrics.PointOnGrid(p);
        this.Ctx.moveTo(p.x, p.y);
    }

    DrawLineTo(x, y) {
        var p = App.Metrics.GetRelativePoint(this.Position, new Point(x, y));
        p = App.Metrics.PointOnGrid(p);
        this.Ctx.lineTo(p.x, p.y);
    }



    ParticleCollision(particle: Particle) {

    }

    MouseDown() {
        this.IsPressed = true;
        this.LastPosition = this.Position.Clone();
        this.Click.raise(this, new Fayde.RoutedEventArgs());
    }

    TouchDown() {
        this.IsPressed = true;
    }

    MouseUp() {
        this.IsPressed = false;
        this._Duplicable = true;
    }

    MouseMove(point: Point) {
        if (this.IsPressed){

            // ALT-DRAG COPY
            if ((<BlocksSketch>this.Sketch).AltDown && this._Duplicable) {
                (<BlocksSketch>this.Sketch).CreateBlockFromType(this.Type); //TODO: TS5 reflection
                this.MouseUp();
            }
            // MOVE //
            else {
                /*point = (<Grid>this.Sketch).ConvertTransformedToBase(point);
                point = (<Grid>this.Sketch).SnapToGrid(point);
                point = (<Grid>this.Sketch).ConvertAbsoluteToGridUnits(point);*/
                this.Position = App.Metrics.CursorToGrid(point);

                //this.Position = point;
            }

        }
    }

    Dispose() {
        super.Dispose();

    }

    // absolute point
    HitTest(point: Point): boolean {

        this.Ctx.beginPath();
        this.DrawMoveTo(this.Outline[0].x, this.Outline[0].y);

        for (var i = 1; i < this.Outline.length; i++) {
            this.DrawLineTo(this.Outline[i].x, this.Outline[i].y);
        }

        this.Ctx.closePath();

        return this.Ctx.isPointInPath(point.x, point.y);
    }

    // absolute point
    DistanceFrom(point: Point): number{
        var p = App.Metrics.ConvertGridUnitsToAbsolute(this.Position);
        return Math.distanceBetween(p.x, p.y, point.x, point.y);
    }

    UpdateOptionsForm() {

    }

    SetParam(param: string,value: number) {
        // implemented in sub class
    }

    GetParam(param: string) {
        // implemented in sub class
    }

    UpdateParams(params: any) {
        console.log("refreshing");

        for (var key in params) {
            if (params.hasOwnProperty(key)) {
                console.log(key + " -> " + params[key]);
                this.SetParam(key, params[key]);
            }
        }
        /*params.forEach((param: any) => {
            this.SetParam(param.setting, param.props);
        });*/
    }

    RefreshOptionsPanel() {
        if (App.BlocksSketch.OptionsPanel.Scale>0 && App.BlocksSketch.OptionsPanel.SelectedBlock==this) {
            this.UpdateOptionsForm();
            App.BlocksSketch.OptionsPanel.Populate(this.OptionsForm, false);
        }
    }

    Refresh() {

    }

    Stop() {

    }
}

export = Block;