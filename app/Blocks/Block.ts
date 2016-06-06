import DisplayObject = etch.drawing.DisplayObject;
import IDisplayContext = etch.drawing.IDisplayContext;
import ObservableCollection = etch.collections.ObservableCollection;
import Point = etch.primitives.Point;
import RoutedEvent = etch.events.RoutedEvent;
import RoutedEventArgs = etch.events.RoutedEventArgs;
import Size = minerva.Size;
import {AudioChain} from '../Core/Audio/Connections/AudioChain';
import {IApp} from '../IApp';
import {IAudioChain} from '../Core/Audio/Connections/IAudioChain';
import {IBlock} from './IBlock';
import {MainScene} from '../MainScene';
import {Particle} from '../Particle';

declare var App: IApp;

export class Block extends DisplayObject implements IBlock {

    public Id: number;
    public BlockName: string;
    public Type: any;
    public Click: RoutedEvent<RoutedEventArgs> = new RoutedEvent<RoutedEventArgs>();
    public Position: Point; // in grid units
    public LastPosition: Point; // in grid units
    public IsChained: boolean = false;
    public IsPressed: boolean = false;
    public IsSelected: boolean = false;
    public Connections: ObservableCollection<IBlock> = new ObservableCollection<IBlock>();
    public Chain: IAudioChain;
    public Outline: Point[] = [];
    public ZIndex;
    public OptionsForm;
    public Params: any;
    public Defaults: any;
    public Duplicable: boolean = false;
    // This is set to false at first because, when a block is created via alt-drag,
    // it's TouchDown() and MouseMove() are getting called straight away (because it's
    // behaving with a click & drag). If it's set to true then it starts an infinite
    // chain of block creation as each new block constantly creates new blocks.

    //-------------------------------------------------------------------------------------------
    //  SETUP
    //-------------------------------------------------------------------------------------------

    Init(drawTo: IDisplayContext): void {
        super.Init(drawTo);

        this.Chain = new AudioChain();

        this.Update();
    }

    PopulateParams(log?: boolean) {

        // duplicate Params //
        var paramsCopy = {};
        if (this.Params) {
            if (log) {
                console.log(this.Params);
                console.log(this.Defaults);
            }
            this.BackwardsCompatibilityPatch();
            for (var key in this.Params) {
                paramsCopy[""+key] = this.Params[""+key];
            }
        }

        // set new params //
        var params = this.Params = {};
        var defaults = this.Defaults;
        for (var key in defaults) {
            if (paramsCopy[""+key] || paramsCopy[""+key]==0) {
                params[""+key] = paramsCopy[""+key];
            } else {
                params[""+key] = defaults[""+key];
            }
        }
    }

    BackwardsCompatibilityPatch() {
        // set in sub class if needed //
    }

    //-------------------------------------------------------------------------------------------
    //  LOOPS
    //-------------------------------------------------------------------------------------------

    Update() {
    }

    Draw() {
        super.Draw();
        this.Ctx.globalAlpha = this.IsPressed && this.IsSelected ? 0.5 : 1;
    }

    // todo: use types instead of strings!
    DrawSprite(type: string, option?: any) {
        App.BlockSprites.DrawSprite((<MainScene>this.DrawTo).BlocksContainer, this.Position, true, type.toLowerCase(), option);
    }

    //-------------------------------------------------------------------------------------------
    //  INTERACTION
    //-------------------------------------------------------------------------------------------

    MouseDown() {
        this.IsPressed = true;
        this.LastPosition = this.Position.Clone();
        this.Click.raise(this, new RoutedEventArgs());
    }

    TouchDown() {
        this.IsPressed = true;
    }

    MouseUp() {
        this.IsPressed = false;
        this.Duplicable = true;
    }

    MouseMove(point: Point) {
        if (this.IsPressed){

            // ALT-DRAG COPY
            if (App.CommandsInputManager.IsKeyCodeDown(KeyCodes.KeyDown.Alt) && this.Duplicable) {
                (<MainScene>this.DrawTo).CreateBlockFromType(this.Type,this.Params); //TODO: TS5 reflection
                this.MouseUp();
            }
            // MOVE //
            else {
                this.Position = App.Metrics.CursorToGrid(point);
            }
        }
    }

    SetSearchResults(results) {
    }

    SetReversedBuffer(buffer: any) {
    }

    //-------------------------------------------------------------------------------------------
    //  COLLISIONS
    //-------------------------------------------------------------------------------------------

    HitTest(point: Point): boolean {
        this.Ctx.beginPath();
        this.DrawMoveTo(this.Outline[0].x, this.Outline[0].y);
        for (var i = 1; i < this.Outline.length; i++) {
            this.DrawLineTo(this.Outline[i].x, this.Outline[i].y);
        }
        this.Ctx.closePath();
        return this.Ctx.isPointInPath(point.x, point.y);
    }

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

    //-------------------------------------------------------------------------------------------
    //  OPTIONS PANEL
    //-------------------------------------------------------------------------------------------

    UpdateOptionsForm() {
    }

    SetParam(param: string,value: number) {
    }

    RefreshOptionsPanel(cmd?: string) {
        if (App.MainScene.OptionsPanel.Scale>0 && App.MainScene.OptionsPanel.SelectedBlock==this) {
            this.UpdateOptionsForm();
            App.MainScene.OptionsPanel.Populate(this.OptionsForm, false);
        }

        if (cmd) {
            if (cmd==="animate") {
                App.MainScene.OptionsPanel.Animating = true;
            }
        } else {
            App.MainScene.OptionsPanel.Animating = false;
        }
    }

    RefreshOption(optionNo: number) {
        if (App.MainScene.OptionsPanel.Scale>0 && App.MainScene.OptionsPanel.SelectedBlock==this) {
            this.UpdateOptionsForm();
            App.MainScene.OptionsPanel.RefreshOption(optionNo, this.OptionsForm);
        }
    }

    //-------------------------------------------------------------------------------------------
    //  CONNECTIONS
    //-------------------------------------------------------------------------------------------


    UpdateConnections(chain: IAudioChain) {
        this.Chain = chain;
    }

    DistanceFrom(point: Point): number{
        var p = App.Metrics.ConvertGridUnitsToAbsolute(this.Position);
        return Math.distanceBetween(p.x, p.y, point.x, point.y);
    }

    Refresh() {
    }

    Stop() {
    }

    //-------------------------------------------------------------------------------------------
    //  DISPOSE
    //-------------------------------------------------------------------------------------------

    Dispose() {
        super.Dispose();
    }
}
