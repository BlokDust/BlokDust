import App = require("./App");
import IBlock = require("./Blocks/IBlock");
import IModifiable = require("./Blocks/IModifiable");
import IModifier = require("./Blocks/IModifier");
import AddItemToObservableCollectionOperation = require("./Core/Operations/AddItemToObservableCollectionOperation");
import RemoveItemFromObservableCollectionOperation = require("./Core/Operations/RemoveItemFromObservableCollectionOperation");
import ChangePropertyOperation = require("./Core/Operations/ChangePropertyOperation");
import IOperation = require("./Core/Operations/IOperation");
import IUndoableOperation = require("./Core/Operations/IUndoableOperation");
import Commands = require("./Commands");
import CommandHandlerFactory = require("./Core/Resources/CommandHandlerFactory");
import CreateBlockCommandHandler = require("./CommandHandlers/CreateBlockCommandHandler");
import DeleteBlockCommandHandler = require("./CommandHandlers/DeleteBlockCommandHandler");
import ICommandHandler = require("./Core/Commands/ICommandHandler");
import DisplayObjectCollection = require("./DisplayObjectCollection");
import Grid = require("./Grid");
import DisplayList = require("./DisplayList");
import ObservableCollection = Fayde.Collections.ObservableCollection;
import Particle = require("./Particle");
import Oscillator = require("./PooledOscillator");
import IPooledObject = require("./Core/Resources/IPooledObject");
import PooledFactoryResource = require("./Core/Resources/PooledFactoryResource");
import ParametersPanel = require("./ParametersPanel");

declare var PixelPalette;
declare var ParamTimeout: boolean; //TODO: better way than using global? Needs to stay in scope within a setTimeout though.

class BlocksSketch extends Grid {

    public _Unit: number;
    private _SelectedBlock: IBlock;
    private _Id: number = 0;
    private _IsMouseDown: boolean = false;
    private _IsTouchDown: boolean = false;
    public BlockSelected: Fayde.RoutedEvent<Fayde.RoutedEventArgs> = new Fayde.RoutedEvent<Fayde.RoutedEventArgs>();
    private _DisplayList: DisplayList;
    private _ParamsPanel: ParametersPanel;

    get SelectedBlock(): IBlock {
        return this._SelectedBlock;
    }


    set SelectedBlock(block: IBlock) {
        // if setting the selected block to null (or false)
        // if there's already a selected block, set its
        // IsSelected to false.
        if (!block && this._SelectedBlock){
            this._SelectedBlock.IsSelected = false;
            this._SelectedBlock = null;
        } else {
            if (this._SelectedBlock){
                this._SelectedBlock.IsSelected = false;
            }
            block.IsSelected = true;
            this._SelectedBlock = block;

            this._DisplayList.ToFront(block);
        }
    }

    constructor() {
        super();

        this._DisplayList = new DisplayList(App.Blocks);

        // register command handlers
        App.ResourceManager.AddResource(new CommandHandlerFactory(Commands.CREATE_BLOCK, CreateBlockCommandHandler.prototype));
        App.ResourceManager.AddResource(new CommandHandlerFactory(Commands.DELETE_BLOCK, DeleteBlockCommandHandler.prototype));

        App.OperationManager.OperationAdded.on((operation: IOperation) => {
            this._Invalidate();
        }, this);

        App.OperationManager.OperationComplete.on((operation: IOperation) => {
            this._Invalidate();
        }, this);

        App.ParticlesPool = new PooledFactoryResource<Particle>(10, 100, Particle.prototype);
        App.OscillatorsPool = new PooledFactoryResource<Oscillator>(10, 100, Oscillator.prototype);

        var pixelPalette = new PixelPalette("img/palette.gif");

        pixelPalette.Load((palette: string[]) => {
            console.log(palette);
            App.Palette = palette;
        });

        ParamTimeout = false;

        this._Invalidate();
    }

    private _Invalidate(){

        this._ValidateBlocks();

        this._CheckProximity();
    }

    _ValidateBlocks() {
        // for each Modifiable, if the Modifiable contains a Modifier that no longer
        // exists, remove it.

        // todo: make this a command that all blocks subscribe to?
        for (var i = 0; i < App.Modifiables.Count; i++){
            var modifiable: IModifiable = App.Modifiables.GetValueAt(i);

            modifiable.ValidateModifiers();
        }
    }

    CreateBlock<T extends IBlock>(m: {new(grid: Grid, position: Point): T; }){

        var block: IBlock = new m(this, this._GetRandomPosition());
        block.Id = this._GetId();

        // todo: should this go in command handler?
        block.Click.on((block: IBlock) => {
            this.BlockSelected.raise(block, new Fayde.RoutedEventArgs());
        }, this);

        App.CommandManager.ExecuteCommand(Commands.CREATE_BLOCK, block);
    }

    private _GetId(): number {
        return this._Id++;
    }

    private _GetRandomPosition(): Point{
        return new Point(Math.random(), Math.random());
    }

    Setup(){
        super.Setup();

        this._ParamsPanel = new ParametersPanel(this.Ctx);

    }



    Update() {
        super.Update();

        this._Unit = this.Ctx.canvas.width / 1000;
        this.Divisor = this._Unit * 50;

        // update blocks
        for (var i = 0; i < App.Blocks.Count; i++) {
            var block: IBlock = App.Blocks.GetValueAt(i);
            block.Update();
        }

        if (App.Particles.length) {
            this.UpdateParticles();
        }
    }

    Draw(){
        // clear
        this.Ctx.fillStyle = App.Palette[0];// BG
        this.Ctx.fillRect(0, 0, this.Width, this.Height);

        super.Draw();

        // draw blocks
        this._DisplayList.Draw();

        this.DrawParticles();

        this._ParamsPanel.Draw();


    }

    // PARTICLES //

    UpdateParticles() {

        var currentParticles = [];

        for (var i = 0; i < App.Particles.length; i++) {
            var particle: Particle = App.Particles[i];
            particle.Life -= 1;

            if (particle.Life < 1) {
                particle.Reset();
                particle.ReturnToPool();
                continue;
            }

            //this.ParticleCollision(particle.Position, particle);
            particle.Move();
            currentParticles.push(particle);
        }

        App.Particles = currentParticles;
    }

    ParticleCollision(point: Point, particle: Particle) {
        for (var i = App.Blocks.Count - 1; i >= 0 ; i--){
            var block: IBlock = App.Blocks.GetValueAt(i);
            if (block.HitTest(point)){
                block.ParticleCollision(particle);
            }
        }
    }

    DrawParticles() {
        for (var i = 0; i < App.Particles.length; i++) {

            // todo: pre-render these in a single canvas
            var sx = App.Particles[i].Position.x;
            var sy = App.Particles[i].Position.y;
            var size = App.Particles[i].Size;

            this.Ctx.fillStyle = "#ff90a7";
            this.Ctx.globalAlpha = 1;
            this.Ctx.beginPath();
            this.Ctx.moveTo(sx-(size),sy); //l
            this.Ctx.lineTo(sx,sy-(size)); //t
            this.Ctx.lineTo(sx+(size),sy); //r
            this.Ctx.lineTo(sx,sy+(size)); //b
            this.Ctx.closePath();
            this.Ctx.fill();
        }

    }



    // PROXIMITY CHECK //

    private _CheckProximity(){
        // loop through all Modifiable blocks checking proximity to Modifier blocks.
        // if within CatchmentArea, add Modifier to Modifiable.Modifiers.

        for (var j = 0; j < App.Modifiables.Count; j++) {
            var modifiable:IModifiable = App.Modifiables.GetValueAt(j);

            for (var i = 0; i < App.Modifiers.Count; i++) {
                var modifier:IModifier = App.Modifiers.GetValueAt(i);

                // if a modifiable is close enough to the modifier, add the modifier
                // to its internal list.
                var catchmentArea = this.Ctx.canvas.width * modifier.CatchmentArea;
                var distanceFromModifier = modifiable.DistanceFrom(modifier.Position);

                if (distanceFromModifier <= catchmentArea) {
                    if (!modifiable.Modifiers.Contains(modifier)){
                        modifiable.AddModifier(modifier);
                    }
                } else {
                    // if the modifiable already has the modifier on its internal list
                    // remove it as it's now too far away.
                    if (modifiable.Modifiers.Contains(modifier)){
                        modifiable.RemoveModifier(modifier);
                    }
                }
            }
        }
    }

    private _NormalisePoint(point: Point): Point {
        return new Point(Math.normalise(point.x, 0, this.Ctx.canvas.width), Math.normalise(point.y, 0, this.Ctx.canvas.height));
    }

    MouseDown(e: Fayde.Input.MouseEventArgs){
        this._IsMouseDown = true;
        this._CheckCollision(e);
        this._CheckParamsInteract(e);
    }

    TouchDown(e: Fayde.Input.TouchEventArgs){
        this._IsTouchDown = true;
        this._CheckCollision(e);
        this._CheckParamsInteract(e);
    }

    private _CheckCollision(e) {
        var point = (<any>e).args.Source.MousePosition;
        //TODO: Doesn't detect touch. Will there be a (<any>e).args.Source.TouchPosition?

        // cancel if interacting with panel
        var panelCheck = this._BoxCheck(this._ParamsPanel.Position.x,this._ParamsPanel.Position.y - (this._ParamsPanel.Size.Height*0.5), this._ParamsPanel.Size.Width,this._ParamsPanel.Size.Height,point.x,point.y);
        var blockClick = false;
        if (!panelCheck || this._ParamsPanel.Scale!==1) {
            for (var i = App.Blocks.Count - 1; i >= 0 ; i--){
                var block: IBlock = App.Blocks.GetValueAt(i);
                if (block.HitTest(point)){
                    (<any>e).args.Handled = true;

                    block.MouseDown();
                    blockClick = true;
                    this.SelectedBlock = block;
                    ParamTimeout = true;
                    setTimeout(function() {
                        ParamTimeout = false;
                    },400);

                    return;
                }
            }
            if (blockClick==false) {
                this._ParamsPanel.PanelScale(this._ParamsPanel,0,200);
            }
        }

    }

    private _BoxCheck(x,y,w,h,mx,my) { // IS CURSOR WITHIN GIVEN BOUNDARIES

        return (mx>x && mx<(x+w) && my>y && my<(y+h));

    }

    private _CheckParamsInteract(e) {
        var point = (<any>e).args.Source.MousePosition;
        if (this._ParamsPanel.Scale==1) {
            this._ParamsPanel.MouseDown(point.x,point.y);
        }
    }

    MouseUp(e: Fayde.Input.MouseEventArgs){
        this._IsMouseDown = false;

        var point = (<any>e).args.Source.MousePosition;

        if (this.SelectedBlock){

            if (this.SelectedBlock.HitTest(point)){
                (<any>e).args.Handled = true;
                this.SelectedBlock.MouseUp();

                // if the block has moved, create an undoable operation.
                if (!Point.isEqual(this.SelectedBlock.Position, this.SelectedBlock.LastGridPosition)){
                    var op:IUndoableOperation = new ChangePropertyOperation<IBlock>(this.SelectedBlock, "GridPosition", this.SelectedBlock.LastGridPosition.Clone(), this.SelectedBlock.GridPosition.Clone());
                    App.OperationManager.Do(op);
                }
            }
        }

        if (this._ParamsPanel.Scale==1) {
            this._ParamsPanel.MouseUp();
        }
        // OPEN PANEL //
        if (ParamTimeout) {
            this.SelectedBlock.OpenParams();
            if (this.SelectedBlock.ParamJson) {
                this._ParamsPanel.SelectedBlock = this.SelectedBlock;
                this._ParamsPanel.Populate(this.SelectedBlock.ParamJson,true);
            }
        }

    }

    MouseMove(e: Fayde.Input.MouseEventArgs){
        var point = (<any>e).args.Source.MousePosition;

        if (this.SelectedBlock){
            this.SelectedBlock.MouseMove(this._NormalisePoint(point));
            this._CheckProximity();
        }
        if (this._ParamsPanel.Scale==1) {
            this._ParamsPanel.MouseMove(point.x,point.y);
        }
    }

    DeleteSelectedBlock(){
        if (!this.SelectedBlock) return;
        this._ParamsPanel.PanelScale(this._ParamsPanel,0,200);
        this._SelectedBlock.Delete();
        App.CommandManager.ExecuteCommand(Commands.DELETE_BLOCK, this.SelectedBlock);
        this.SelectedBlock = null;
    }

    Undo(){
        App.OperationManager.Undo();
    }

    Redo(){
        App.OperationManager.Redo();
    }
}

export = BlocksSketch;
