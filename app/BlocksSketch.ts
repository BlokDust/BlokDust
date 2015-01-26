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
import Particle = require("./Particle");
import Oscillator = require("./PooledOscillator");
import IPooledObject = require("./Core/Resources/IPooledObject");
import PooledFactoryResource = require("./Core/Resources/PooledFactoryResource");
import Transformer = Fayde.Transformer.Transformer;
import ParametersPanel = require("./UI/ParametersPanel");
import Header = require("./UI/Header");
import ToolTip = require("./UI/ToolTip");

declare var PixelPalette;
declare var ParamTimeout: boolean; //TODO: better way than using global? Needs to stay in scope within a setTimeout though.

class BlocksSketch extends Grid {

    private _SelectedBlock: IBlock;
    private _Id: number = 0;
    private _IsPointerDown: boolean = false;
    public BlockSelected: Fayde.RoutedEvent<Fayde.RoutedEventArgs> = new Fayde.RoutedEvent<Fayde.RoutedEventArgs>();
    private _DisplayList: DisplayList;
    private _Transformer: Transformer;
    private _ParamsPanel: ParametersPanel;
    private _Header: Header;
    private _ToolTip: ToolTip;
    private _ToolTipTimeout;


    get SelectedBlock(): IBlock {
        return this._SelectedBlock;
    }

    set SelectedBlock(block: IBlock) {
        // if setting the selected block to null (or falsey)
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
            //console.log(palette);
            App.Palette = palette;
        });

        ParamTimeout = false;

        this._Invalidate();
    }

    private UpdateTransform(sender: Transformer, e: Fayde.Transformer.TransformerEventArgs) : void {
        this.TransformGroup = <Fayde.Media.TransformGroup>e.Transforms;
    }

    ZoomIn() {
        this._Transformer.Zoom(1);
    }

    ZoomOut() {
        this._Transformer.Zoom(-1);
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

        var block: IBlock = new m(this, this.GetRandomGridPosition());
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

    Setup(){
        super.Setup();

        this._ParamsPanel = new ParametersPanel(this.Ctx,this);
        this._Header = new Header(this.Ctx,this);
        this._ToolTip = new ToolTip(this.Ctx,this);

        this.ScaleToFit = true;
        this.Divisor = 850; // 70

        // todo: make these default values
        this._Transformer = new Transformer();
        this._Transformer.ZoomLevel = 0;
        this._Transformer.ZoomLevels = 5;
        this._Transformer.ZoomFactor = 2;
        this._Transformer.DragAccelerationEnabled = true;
        this._Transformer.ConstrainToViewport = false;
        this._Transformer.AnimationSpeed = 250;
        this._Transformer.UpdateTransform.on(this.UpdateTransform, this);
        this._Transformer.SizeChanged(this.Size);
    }

    Update() {
        super.Update();

        // update transformer
        this._Transformer.SizeChanged(this.Size);

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

        this._ToolTip.Draw();
        this._ParamsPanel.Draw();
        this._Header.Draw();
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
            var particle = App.Particles[i];
            var pos = this.ConvertBaseToTransformed(particle.Position);
            var unit = this.ScaledUnit.width;
            //console.log(unit);
            var sx = pos.x;
            var sy = pos.y;
            var size = particle.Size * unit;

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
                var catchmentArea = this.ConvertGridUnitsToAbsolute(new Point(modifier.CatchmentArea, modifier.CatchmentArea));
                var distanceFromModifier = modifiable.DistanceFrom(this.ConvertGridUnitsToAbsolute(modifier.Position));

                if (distanceFromModifier <= catchmentArea.x) {
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

    MouseDown(e: Fayde.Input.MouseEventArgs){
        var point = (<any>e).args.Source.MousePosition;

        this._PointerDown(point, () => {
            (<any>e).args.Handled = true;
        });
    }

    MouseUp(e: Fayde.Input.MouseEventArgs){
        var point = (<any>e).args.Source.MousePosition;

        this._PointerUp(point, () => {
            (<any>e).args.Handled = true;
        });
        this._CheckHover(point);
    }

    MouseMove(e: Fayde.Input.MouseEventArgs){
        var point = (<any>e).args.Source.MousePosition;
        this._PointerMove(point);
        this._CheckHover(point);
    }

    TouchDown(e: any){
        //var pos: Fayde.Input.TouchPoint = e.GetTouchPoint(null);
        var pos = e.args.Device.GetTouchPoint(null);
        var point = new Point(pos.Position.x, pos.Position.y);

        this._PointerDown(point, () => {
            (<any>e).args.Handled = true;
        });
    }

    TouchUp(e: any){
        var pos = e.args.Device.GetTouchPoint(null);
        var point = new Point(pos.Position.x, pos.Position.y);

        this._PointerUp(point, () => {
            (<any>e).args.Handled = true;
        });
    }

    TouchMove(e: any){
        var pos = e.args.Device.GetTouchPoint(null);
        var point = new Point(pos.Position.x, pos.Position.y);

        this._PointerMove(point);
    }

    private _PointerDown(point: Point, handle: () => void) {
        this._IsPointerDown = true;

        var collision: Boolean = this._CheckCollision(point, handle);

        // CLOSE TOOLTIP //
        if (this._ToolTip.Open) {
            this._ToolTipClose(this._ToolTip);
        }

        // PARAMS HIT TEST //
        var panelCheck = false;
        if (this._ParamsPanel.Scale==1) {
            panelCheck = this._BoxCheck(this._ParamsPanel.Position.x,this._ParamsPanel.Position.y - (this._ParamsPanel.Size.Height*0.5), this._ParamsPanel.Size.Width,this._ParamsPanel.Size.Height,point.x,point.y);
        }

        this._CheckParamsInteract(point);
        if (!collision && !panelCheck){
            this._Transformer.PointerDown(point);
        }
    }

    private _PointerUp(point: Point, handle: () => void) {
        this._IsPointerDown = false;

        if (this.SelectedBlock){

            if (this.SelectedBlock.HitTest(point)){
                handle();
                this.SelectedBlock.MouseUp();

                // if the block has moved, create an undoable operation.
                if (!Point.isEqual(this.SelectedBlock.Position, this.SelectedBlock.LastPosition)){
                    var op:IUndoableOperation = new ChangePropertyOperation<IBlock>(this.SelectedBlock, "Position", this.SelectedBlock.LastPosition.Clone(), this.SelectedBlock.Position.Clone());
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

        this._Transformer.PointerUp();
    }

    private _PointerMove(point: Point){
        if (this.SelectedBlock){
            this.SelectedBlock.MouseMove(point);
            this._CheckProximity();
        }

        if (this._ParamsPanel.Scale==1) {
            this._ParamsPanel.MouseMove(point.x,point.y);
        }

        this._Transformer.PointerMove(point);
    }


    // CHECK FOR HOVERING OVER BLOCK (TOOLTIP) //
    private _CheckHover(point: Point) {
        var panelCheck = false;
        var blockHover = false;
        var panel = this._ToolTip;

        // CHECK BLOCKS FOR HOVER //
        if (this._ParamsPanel.Scale==1) {
            panelCheck = this._BoxCheck(this._ParamsPanel.Position.x,this._ParamsPanel.Position.y - (this._ParamsPanel.Size.Height*0.5), this._ParamsPanel.Size.Width,this._ParamsPanel.Size.Height,point.x,point.y);
        }
        if (!panelCheck && !this._IsPointerDown) {
            for (var i = App.Blocks.Count - 1; i >= 0; i--) {
                var block:IBlock = App.Blocks.GetValueAt(i);
                if (block.HitTest(point)) {

                    // GET BLOCK NAME //
                    if (block.ParamJson) {
                        panel.Name = block.ParamJson.name;
                        var blockPos = this.ConvertScaledGridUnitsToAbsolute(block.Position);
                        panel.Position.x = blockPos.x;
                        panel.Position.y = blockPos.y;
                        blockHover = true;
                    }
                    break;
                }
            }
        }

        // OPEN TOOLTIP IF NOT ALREADY OPEN //
        if (blockHover && !panel.Open) {
            panel.Open = true;
            this._ToolTipTimeout = setTimeout(function() {
                if (panel.Alpha==0) {
                    panel.AlphaTo(panel,100,800);
                }
            },800);
        }
        // CLOSE IF NO LONGER HOVERING //
        if (!blockHover && panel.Open) {
            this._ToolTipClose(panel);
        }

    }

    private _ToolTipClose(panel) {
        if (this._ToolTipTimeout) {
            clearTimeout(this._ToolTipTimeout);
        }
        panel.AlphaTo(panel,0,100);
        panel.Open = false;

    }


    private _CheckCollision(point: Point, handle: () => void): Boolean {
        //TODO: Doesn't detect touch. Will there be a (<any>e).args.Source.TouchPosition?

        // cancel if interacting with panel
        var panelCheck = this._BoxCheck(this._ParamsPanel.Position.x,this._ParamsPanel.Position.y - (this._ParamsPanel.Size.Height*0.5), this._ParamsPanel.Size.Width,this._ParamsPanel.Size.Height,point.x,point.y);
        var blockClick = false;
        if (!panelCheck || this._ParamsPanel.Scale!==1) {
            for (var i = App.Blocks.Count - 1; i >= 0; i--) {
                var block:IBlock = App.Blocks.GetValueAt(i);
                if (block.HitTest(point)) {
                    handle();
                    block.MouseDown();
                    blockClick = false;
                    this.SelectedBlock = block;
                    ParamTimeout = true;
                    setTimeout(function() {
                        ParamTimeout = false;
                    },200);

                    return true;
                }
            }
            if (blockClick==false) {
                this._ParamsPanel.PanelScale(this._ParamsPanel,0,200);
            }
        }

        return false;
    }

    private _BoxCheck(x,y,w,h,mx,my) { // IS CURSOR WITHIN GIVEN BOUNDARIES
        return (mx>x && mx<(x+w) && my>y && my<(y+h));
    }

    private _CheckParamsInteract(point) {
        //var point = (<any>e).args.Source.MousePosition;
        if (this._ParamsPanel.Scale==1) {
            this._ParamsPanel.MouseDown(point.x,point.y);
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
