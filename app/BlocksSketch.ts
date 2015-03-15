import IBlock = require("./Blocks/IBlock");
import ISource = require("./Blocks/ISource");
import IEffect = require("./Blocks/IEffect");
import AddItemToObservableCollectionOperation = require("./Core/Operations/AddItemToObservableCollectionOperation");
import RemoveItemFromObservableCollectionOperation = require("./Core/Operations/RemoveItemFromObservableCollectionOperation");
import ChangePropertyOperation = require("./Core/Operations/ChangePropertyOperation");
import IOperation = require("./Core/Operations/IOperation");
import IUndoableOperation = require("./Core/Operations/IUndoableOperation");
import Commands = require("./Commands");
import ICommandHandler = require("./Core/Commands/ICommandHandler");
import DisplayObjectCollection = require("./DisplayObjectCollection");
import Grid = require("./Grid");
import DisplayList = require("./DisplayList");
import Particle = require("./Particle");
import Oscillator = require("./PooledOscillator");
import IPooledObject = require("./Core/Resources/IPooledObject");
import PooledFactoryResource = require("./Core/Resources/PooledFactoryResource");
import ParametersPanel = require("./UI/ParametersPanel");
import Header = require("./UI/Header");
import ToolTip = require("./UI/ToolTip");
import ZoomButtons = require("./UI/ZoomButtons");
import TrashCan = require("./UI/TrashCan");
import ConnectionLines = require("./UI/ConnectionLines");
import BlockSprites = require("./Blocks/BlockSprites");
import BlockCreator = require("./BlockCreator");
import Utils = Fayde.Utils;
import Transformer = Fayde.Transformer.Transformer;
import Size = Fayde.Utils.Size;

declare var ParamTimeout: boolean; //TODO: better way than using global? Needs to stay in scope within a setTimeout though.

class BlocksSketch extends Grid {

    private _SelectedBlock: IBlock;
    private _IsPointerDown: boolean = false;
    public BlockSelected: Fayde.RoutedEvent<Fayde.RoutedEventArgs> = new Fayde.RoutedEvent<Fayde.RoutedEventArgs>();
    private _DisplayList: DisplayList;
    private _Transformer: Transformer;
    public BlockSprites: BlockSprites;
    private _ParamsPanel: ParametersPanel;
    private _Header: Header;
    private _ToolTip: ToolTip;
    private _ZoomButtons: ZoomButtons;
    private _TrashCan: TrashCan;
    private _ConnectionLines: ConnectionLines;
    private _ToolTipTimeout;
    private _LastSize: Size;
    private _PointerPoint: Point;
    public IsDraggingABlock: boolean = false;
    public BlockCreator: BlockCreator;
    public TxtHeader: string;
    public TxtSlider: string;
    public TxtMid: string;
    public TxtBody: string;
    public TxtItalic: string;
    public TxtData: string;
    public AltDown: boolean = false; // todo: shouldn't need this - use CommandsInputManager.IsKeyNameDown

    //-------------------------------------------------------------------------------------------
    //  SETUP
    //-------------------------------------------------------------------------------------------

    constructor() {
        super();
    }


    public GetId(): number {
        var count = App.Blocks.length;
        return count + 1;
    }

    get DisplayList(): DisplayList {
        return this._DisplayList;
    }

    set DisplayList(value: DisplayList) {
        this._DisplayList = value;
    }

    Setup(){
        super.Setup();

        App.PointerInputManager.MouseDown.on((s: any, e: MouseEvent) => {
            this.MouseDown(e);
        }, this);

        App.PointerInputManager.MouseUp.on((s: any, e: MouseEvent) => {
            this.MouseUp(e);
        }, this);

        App.PointerInputManager.MouseMove.on((s: any, e: MouseEvent) => {
            this.MouseMove(e);
        }, this);

        App.OperationManager.OperationComplete.on((operation: IOperation) => {
            this._Invalidate();
        }, this);

        //this.DisplayList = new DisplayList(App.Blocks);

        ParamTimeout = false; // todo: remove

        // METRICS //
        this.Metrics();
        this._PointerPoint = new Point();

        // SOUNDCLOUD //
        var id = '7258ff07f16ddd167b55b8f9b9a3ed33';

        if (typeof(SC) !== "undefined"){
            SC.initialize({
                client_id: id
            });
        }

        // TRANSFORMER //
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

        // INSTANCES //
        this.BlockSprites = new BlockSprites();
        this.BlockSprites.Init(this);

        this.BlockCreator = new BlockCreator();

        this._ParamsPanel = new ParametersPanel();
        this._ParamsPanel.Init(this);

        this._Header = new Header();
        this._Header.Init(this);

        this._ToolTip = new ToolTip();
        this._ToolTip.Init(this);

        this._ZoomButtons = new ZoomButtons();
        this._ZoomButtons.Init(this);

        this._TrashCan = new TrashCan();
        this._TrashCan.Init(this);

        this._ConnectionLines = new ConnectionLines();
        this._ConnectionLines.Init(this);

        // todo: use input manager
        document.addEventListener('keydown', (e) => {
            if (e.keyCode==18) {
                this.AltDown = true;
            }
        });

        document.addEventListener('keyup', (e) => {
            this.AltDown = false;
        });

        this._Invalidate();
    }


    //-------------------------------------------------------------------------------------------
    //  UPDATE
    //-------------------------------------------------------------------------------------------


    Update() {
        super.Update();

        // update transformer
        this._Transformer.SizeChanged(this.Size);

        // update blocks
        for (var i = 0; i < App.Blocks.length; i++) {
            var block: IBlock = App.Blocks[i];
            block.Update();
        }

        if (App.Particles.length) {
            this.UpdateParticles();
        }

        this._CheckResize();
    }

    // DIY RESIZE LISTENER //
    private _CheckResize() {
        if (this.Width!==this._LastSize.Width||this.Height!==this._LastSize.Height) {
            // Has resized, call the resize function //
            this.SketchResize();
            // Update size record //
            this.Metrics();
        }
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
            particle.ParticleCollision(this.ConvertBaseToTransformed(particle.Position), particle);
            particle.Move();
            currentParticles.push(particle);
        }

        App.Particles = currentParticles;
    }

    /*ParticleCollision(point: Point, particle: Particle) {
        for (var i = App.Blocks.length - 1; i >= 0 ; i--){
            var block: IBlock = App.Blocks[i];
            if (block.HitTest(point)){
                block.ParticleCollision(particle);
            }
        }
    }*/

    SketchResize() {
        if (this._ParamsPanel.Scale==1) {
            this._ParamsPanel.SelectedBlock.OpenParams();
            this._ParamsPanel.Populate(this._ParamsPanel.SelectedBlock.ParamJson,false);
        }
        this._Header.Populate(this._Header.MenuJson);
        this._ZoomButtons.UpdatePositions();
    }


    Metrics() {

        this.ScaleToFit = true;
        this.GridSize = 15;
        this.Divisor = 850; // 70

        var unit = this.Unit.width;
        var headerType = Math.round(unit*28);
        var sliderType = Math.round(unit*33);
        var midType = Math.round(unit*10);
        var bodyType = Math.round(unit*8);
        var italicType = Math.round(unit*7.5);
        var dataType = Math.round(unit*5);

        this.TxtHeader = "200 " + headerType + "px Dosis";
        this.TxtSlider = "200 " + sliderType + "px Dosis";
        this.TxtMid = "400 " + midType + "px Dosis";
        this.TxtBody = "200 " + bodyType + "px Dosis";
        this.TxtItalic = "300 italic " + italicType + "px Merriweather Sans";
        this.TxtData = "400 " + dataType + "px PT Sans";

        this._LastSize = new Size(this.Width,this.Height);

    }


    //-------------------------------------------------------------------------------------------
    //  DRAW
    //-------------------------------------------------------------------------------------------


    Draw(){

        // BG //
        this.Ctx.fillStyle = App.Palette[0];
        this.Ctx.fillRect(0, 0, this.Width, this.Height);

        // DEBUG GRID //
        super.Draw();

        // LINES //
        this._ConnectionLines.Draw();

        // BLOCKS //
        this.DisplayList.Draw();

        // PARTICLES //
        this.DrawParticles();

        // UI //
        this._ToolTip.Draw();
        this._ParamsPanel.Draw();
        this._ZoomButtons.Draw();
        this._TrashCan.Draw();
        this._Header.Draw();
    }


    DrawParticles() {
        for (var i = 0; i < App.Particles.length; i++) {

            // todo: pre-render these in a single canvas
            var particle = App.Particles[i];
            var pos = this.ConvertBaseToTransformed(particle.Position);
            var unit = this.ScaledUnit.width;
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

    //-------------------------------------------------------------------------------------------
    //  INTERACTION
    //-------------------------------------------------------------------------------------------

    // FIRST TOUCHES //
    MouseDown(e: MouseEvent){
        //var point = (<any>e).args.Source.MousePosition;
        var position: Point = new Point(e.clientX, e.clientY);

        this._PointerDown(position, () => {
            e.cancelBubble = true;
        });
    }

    MouseUp(e: MouseEvent){
        var position: Point = new Point(e.clientX, e.clientY);

        this._PointerUp(position, () => {
            e.cancelBubble = true;
        });
        this._CheckHover(position);
    }

    MouseMove(e: MouseEvent){
        var position: Point = new Point(e.clientX, e.clientY);
        this._PointerMove(position);
        this._CheckHover(position);
    }

    TouchDown(e: any){
        //var pos: Fayde.Input.TouchPoint = e.GetTouchPoint(null);
        var pos = e.args.Device.GetTouchPoint(null);
        var point = new Point(pos.Position.x, pos.Position.y);

        this._PointerDown(point, () => {
            e.cancelBubble = true;
        });
    }

    TouchUp(e: any){
        var pos = e.args.Device.GetTouchPoint(null);
        var point = new Point(pos.Position.x, pos.Position.y);

        this._PointerUp(point, () => {
            e.cancelBubble = true;
        });
    }

    TouchMove(e: any){
        var pos = e.args.Device.GetTouchPoint(null);
        var point = new Point(pos.Position.x, pos.Position.y);

        this._PointerMove(point);
    }


    // AGNOSTIC EVENTS //

    private _PointerDown(point: Point, handle: () => void) {
        this._IsPointerDown = true;
        this._PointerPoint = point;

        var UI: Boolean;
        var collision: Boolean;


        // UI //
        UI = this._UIInteraction(point);
        if (this._ToolTip.Open) {
            this._ToolTipClose(this._ToolTip);
        }
        this._Header.MouseDown(point);
        this._ZoomButtons.MouseDown(point);
        if (this._ParamsPanel.Scale==1) {
            this._ParamsPanel.MouseDown(point.x,point.y); // to do : unsplit point
        }


        // BLOCK CLICK //
        if (!UI) {
            collision = this._CheckCollision(point, handle);
        }

        if (collision) {
            this.IsDraggingABlock = true; // for trashcan to know
        }


        // STAGE DRAGGING //
        if (!collision && !UI){
            this._Transformer.PointerDown(point);
        }
    }

    private _PointerUp(point: Point, handle: () => void) {
        this._IsPointerDown = false;

        if (this.IsDraggingABlock) {
            var blockDelete = this._TrashCan.MouseUp();
        }



        this.IsDraggingABlock = false;
        if (!blockDelete) {
            // BLOCK //
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

            // OPEN PANEL //
            if (ParamTimeout) {
                this.SelectedBlock.OpenParams();
                if (this.SelectedBlock.ParamJson) {
                    this._ParamsPanel.SelectedBlock = this.SelectedBlock;
                    this._ParamsPanel.Populate(this.SelectedBlock.ParamJson,true);
                }
            }
        }


        // UI //
        this._Header.MouseUp();

        if (this._ParamsPanel.Scale==1) {
            this._ParamsPanel.MouseUp();
        }

        this._Transformer.PointerUp();
    }



    private _PointerMove(point: Point){

        // BLOCK //
        if (this.SelectedBlock){
            this.SelectedBlock.MouseMove(point);
            this._CheckProximity();
        }

        // UI //
        if (this._ParamsPanel.Scale==1) {
            this._ParamsPanel.MouseMove(point.x,point.y);
        }
        this._Header.MouseMove(point);
        this._ZoomButtons.MouseMove(point);
        this._TrashCan.MouseMove(point);
        this._Transformer.PointerMove(point);
    }


    // PROXIMITY CHECK //
    private _CheckProximity(){
        // loop through all Source blocks checking proximity to Effect blocks.
        // if within CatchmentArea, add Effect to Source.Effects and add Source to Effect.Sources

        for (var j = 0; j < App.Sources.length; j++) {
            var source:ISource = App.Sources[j];

            for (var i = 0; i < App.Effects.length; i++) {
                var effect:IEffect = App.Effects[i];

                // if a source is close enough to the effect, add the effect
                // to its internal list.
                var catchmentArea = this.ConvertGridUnitsToAbsolute(new Point(effect.CatchmentArea, effect.CatchmentArea));
                var distanceFromEffect = source.DistanceFrom(this.ConvertGridUnitsToAbsolute(effect.Position));

                if (distanceFromEffect <= catchmentArea.x) {
                    if (!source.Effects.Contains(effect)){

                        // Add effect to source
                        source.AddEffect(effect);

                        //Add sources to effect
                        effect.AddSource(source);
                    }
                } else {
                    // if the source already has the effect on its internal list
                    // remove it as it's now too far away.
                    if (source.Effects.Contains(effect)){

                        // Remove effect from source
                        source.RemoveEffect(effect);

                        // Remove source from effect
                        effect.RemoveSource(source);
                    }
                }
            }
        }
    }

    // COLLISION CHECK ON BLOCK //
    private _CheckCollision(point: Point, handle: () => void): Boolean {

        // LOOP BLOCKS //
        for (var i = App.Blocks.length - 1; i >= 0; i--) {
            var block:IBlock = App.Blocks[i];
            if (block.HitTest(point)) {
                handle();
                block.MouseDown();
                this.SelectedBlock = block;

                // TIMER TO CHECK BETWEEN SINGLE CLICK OR DRAG //
                ParamTimeout = true;
                setTimeout(function() {
                    ParamTimeout = false;
                },200);

                return true;
            }
        }
        // CLOSE PARAMS IF NO BLOCK CLICKED //
        this._ParamsPanel.PanelScale(this._ParamsPanel,0,200);

        return false;
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
            for (var i = App.Blocks.length - 1; i >= 0; i--) {
                var block:IBlock = App.Blocks[i];
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

    // IS ANYTHING ON THE UI LEVEL BEING CLICKED //
    private _UIInteraction(point) {

        var zoom = this._ZoomButtons;
        var header = this._Header;

        if (zoom.InRoll || zoom.OutRoll || header.MenuOver) {
            console.log("UI INTERACTION");
            return true;
        }

        if (this._ParamsPanel.Scale==1) {
            var panelCheck = this._BoxCheck(this._ParamsPanel.Position.x,this._ParamsPanel.Position.y - (this._ParamsPanel.Size.Height*0.5), this._ParamsPanel.Size.Width,this._ParamsPanel.Size.Height,point.x,point.y);
            if (panelCheck) {
                console.log("UI INTERACTION");
                return true;
            }
        }

        return false;
    }

    // todo: move this to generic util
    private _BoxCheck(x,y,w,h,mx,my) { // IS CURSOR WITHIN GIVEN BOUNDARIES
        return (mx>x && mx<(x+w) && my>y && my<(y+h));
    }


    //-------------------------------------------------------------------------------------------
    //  BLOCKS
    //-------------------------------------------------------------------------------------------


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

            this.DisplayList.ToFront(block);
        }
    }

    private _Invalidate(){
        this._ValidateBlocks();
        this._CheckProximity();
    }

    _ValidateBlocks() {
        // todo: make this a command that all blocks subscribe to?
        for (var i = 0; i < App.Sources.length; i++){
            var src: ISource = App.Sources[i];
            src.ValidateEffects();
        }

        for (var i = 0; i < App.Effects.length; i++){
            var effect: IEffect = App.Effects[i];
            effect.ValidateSources();
        }
    }

    //CreateBlockFromType<T extends IBlock>(m: {new(grid: Grid, position: Point): T; }){
    CreateBlockFromType<T extends IBlock>(t: {new(): T; }){
        var block: IBlock = new t();
        block.Position = this._PointerPoint;
        block.Init(this);
        block.Id = this.GetId();
        block.Type = t;

        // todo: should this go in command handler?
        block.Click.on((block: IBlock) => {
            this.BlockSelected.raise(block, new Fayde.RoutedEventArgs());
        }, this);

        App.CommandManager.ExecuteCommand(Commands[Commands.CREATE_BLOCK], block);

        block.MouseDown();
        this.SelectedBlock = block;
        this.IsDraggingABlock = true;
    }


    //-------------------------------------------------------------------------------------------
    //  ZOOMING
    //-------------------------------------------------------------------------------------------


    private UpdateTransform(sender: Transformer, e: Fayde.Transformer.TransformerEventArgs) : void {
        this.TransformGroup = <Fayde.Media.TransformGroup>e.Transforms;
    }

    ZoomIn() {
        this._Transformer.Zoom(1);
    }

    ZoomOut() {
        this._Transformer.Zoom(-1);
    }

    //-------------------------------------------------------------------------------------------
    //  OPERATIONS
    //-------------------------------------------------------------------------------------------


    DeleteSelectedBlock(){
        if (!this.SelectedBlock) return;
        this._ParamsPanel.PanelScale(this._ParamsPanel,0,200);
        this._SelectedBlock.Dispose();
        this.DisplayList.Remove(this._SelectedBlock);
        App.CommandManager.ExecuteCommand(Commands[Commands.DELETE_BLOCK], this.SelectedBlock);
        this.SelectedBlock = null;
    }
}

export = BlocksSketch;
