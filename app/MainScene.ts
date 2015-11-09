import {AnimationsLayer} from './UI/AnimationsLayer';
import {BlockCreator} from './BlockCreator';
import {BlockSprites} from './Blocks/BlockSprites';
import {ChangePropertyOperation} from './Core/Operations/ChangePropertyOperation';
import {Commands} from './Commands';
import {ConnectionLines} from './UI/ConnectionLines';
import DisplayObject = etch.drawing.DisplayObject;
import {Header} from './UI/Header';
import {IApp} from './IApp';
import {IBlock} from './Blocks/IBlock';
import {ICommandHandler} from './Core/Commands/ICommandHandler';
import {IEffect} from './Blocks/IEffect';
import {IOperation} from './Core/Operations/IOperation';
import {IPooledObject} from './Core/Resources/IPooledObject';
import {ISource} from './Blocks/ISource';
import {IUndoableOperation} from './Core/Operations/IUndoableOperation';
import {LaserBeams} from './LaserBeams';
import {Laser} from './Blocks/Power/Laser';
import {MessagePanel} from './UI/MessagePanel';
import {OptionsPanel} from './UI/OptionsPanel';
import {Particle} from './Particle';
import Point = etch.primitives.Point;
import {PooledFactoryResource} from './Core/Resources/PooledFactoryResource';
import {PowerEffect} from './Blocks/Power/PowerEffect';
import {PowerSource} from './Blocks/Power/PowerSource';
import {RecorderPanel} from './UI/RecorderPanel';
import {Sampler} from './Blocks/Sources/Sampler';
import {SettingsPanel} from './UI/SettingsPanel';
import {SharePanel} from './UI/SharePanel';
import {SoundcloudPanel} from './UI/SoundcloudPanel';
import {Source} from './Blocks/Source';
import {StageDragger as MainSceneDragger} from './UI/StageDragger';
import {ToolTip} from './UI/ToolTip';
import {TrashCan} from './UI/TrashCan';
import {ZoomButtons} from './UI/ZoomButtons';
import Dimensions = Utils.Measurements.Dimensions;
import Stage = etch.drawing.Stage;

declare var App: IApp;
declare var OptionTimeout: boolean; //TODO: better way than using global? Needs to stay in scope within a setTimeout though.

export class MainScene extends Stage{

    private _SelectedBlock: IBlock;
    private _IsPointerDown: boolean = false;
    public AnimationsLayer: AnimationsLayer;
    public BlockSprites: BlockSprites;
    public OptionsPanel: OptionsPanel;
    public SharePanel: SharePanel;
    public SoundcloudPanel: SoundcloudPanel;
    public SettingsPanel: SettingsPanel;
    public MessagePanel: MessagePanel;
    private _Header: Header;
    private _ToolTip: ToolTip;
    public ZoomButtons: ZoomButtons;
    public MainSceneDragger: MainSceneDragger;
    private _TrashCan: TrashCan;
    private _ConnectionLines: ConnectionLines;
    private _RecorderPanel: RecorderPanel;
    private _LaserBeams: LaserBeams;
    private _ToolTipTimeout;
    private _PointerPoint: Point;
    private _SelectedBlockPosition: Point;
    public IsDraggingABlock: boolean = false;
    public BlockCreator: BlockCreator;
    public AltDown: boolean = false; // todo: shouldn't need this - use CommandsInputManager.IsKeyNameDown

    //-------------------------------------------------------------------------------------------
    //  SETUP
    //-------------------------------------------------------------------------------------------

    constructor() {
        super();
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

        App.PointerInputManager.TouchStart.on((s: any, e: TouchEvent) => {
            this.TouchStart(e);
        }, this);

        App.PointerInputManager.TouchEnd.on((s: any, e: TouchEvent) => {
            this.TouchEnd(e);
        }, this);

        App.PointerInputManager.TouchMove.on((s: any, e: TouchEvent) => {
            this.TouchMove(e);
        }, this);

        App.OperationManager.OperationComplete.on((operation: IOperation) => {
            this._Invalidate();
        }, this);

        // FILE DRAGGING //

        App.DragFileInputManager.Dropped.on((s: any, e: any) => {
            e.stopPropagation();
            e.preventDefault();
            const b: Sampler = this.CreateBlockFromType(Sampler);

            var files = e.dataTransfer.files; // FileList object.

            App.Audio.AudioFileManager.DecodeFileData(files, (file: any, buffer: AudioBuffer) => {
                if (buffer) {
                    //TODO: set the buffer of this newly created Sampler
                    console.log(file.name + ' dropped');
                }
            });

        }, this);

        App.DragFileInputManager.DragEnter.on((s: any, e: any) => {
            console.log('file drag entered area');
        }, this);

        App.DragFileInputManager.DragMove.on((s: any, e: any) => {
            e.stopPropagation();
            e.preventDefault();
            console.log('file drag over');
        }, this);

        App.DragFileInputManager.DragLeave.on((s: any, e: any) => {
            console.log('file left drag area');
        }, this);

        OptionTimeout = false; // todo: remove

        // METRICS //
        this._PointerPoint = new Point();
        this._SelectedBlockPosition = new Point();

        this.BlockCreator = new BlockCreator();

        // Display Objects //

        // CREATE SPLASH SCREEN //
        //this.Splash = new Splash();
        //this.Splash.Init(this);

        this.BlockSprites = new BlockSprites();
        this.DisplayList.Add(this.BlockSprites);
        this.BlockSprites.Init(this);

        this.OptionsPanel = new OptionsPanel();
        this.DisplayList.Add(this.OptionsPanel);
        this.OptionsPanel.Init(this);

        this.SharePanel = new SharePanel();
        this.DisplayList.Add(this.SharePanel);
        this.SharePanel.Init(this);

        this.SettingsPanel = new SettingsPanel();
        this.DisplayList.Add(this.SettingsPanel);
        this.SettingsPanel.Init(this);

        this.SoundcloudPanel = new SoundcloudPanel();
        this.DisplayList.Add(this.SoundcloudPanel);
        this.SoundcloudPanel.Init(this);

        this.MessagePanel = new MessagePanel();
        this.DisplayList.Add(this.MessagePanel);
        this.MessagePanel.Init(this);

        this._ToolTip = new ToolTip();
        this.DisplayList.Add(this._ToolTip);
        this._ToolTip.Init(this);

        this.ZoomButtons = new ZoomButtons();
        this.DisplayList.Add(this.ZoomButtons);
        this.ZoomButtons.Init(this);

        this.MainSceneDragger = new MainSceneDragger();
        this.DisplayList.Add(this.MainSceneDragger);
        this.MainSceneDragger.Init(this);

        this._TrashCan = new TrashCan();
        this.DisplayList.Add(this._TrashCan);
        this._TrashCan.Init(this);

        this._ConnectionLines = new ConnectionLines();
        this.DisplayList.Add(this._ConnectionLines);
        this._ConnectionLines.Init(this);

        this._RecorderPanel = new RecorderPanel();
        this.DisplayList.Add(this._RecorderPanel);
        this._RecorderPanel.Init(this);

        this._LaserBeams = new LaserBeams();
        this.DisplayList.Add(this._LaserBeams);
        this._LaserBeams.Init(this);

        this._Header = new Header();
        this.DisplayList.Add(this._Header);
        this._Header.Init(this);

        this.AnimationsLayer = new AnimationsLayer();
        this.AnimationsLayer.Init(this);

        // todo: use input manager
        document.addEventListener('keydown', (e) => {
            if (e.keyCode === 18) {
                this.AltDown = true;
            }
        });

        document.addEventListener('keyup', (e) => {
            this.AltDown = false;
        });

        this._Invalidate();
        this.Resize();
    }

    //-------------------------------------------------------------------------------------------
    //  UPDATE
    //-------------------------------------------------------------------------------------------

    Update() {

        if (this.IsPaused) return;

        super.Update();

        // update blocks
        for (var i = 0; i < App.Blocks.length; i++) {
            var block: IBlock = App.Blocks[i];
            block.Update();
        }

        if (App.Particles.length) {
            this.UpdateParticles();
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
            particle.ParticleCollision(App.Metrics.FloatOnGrid(particle.Position), particle);
            particle.Move();
            currentParticles.push(particle);
        }

        App.Particles = currentParticles;
    }

    //-------------------------------------------------------------------------------------------
    //  DRAW
    //-------------------------------------------------------------------------------------------

    Draw(): void {

        super.Draw();

        // BG //
        this.Ctx.fillStyle = App.Palette[0];
        this.Ctx.globalAlpha = 1;
        this.Ctx.fillRect(0, 0, this.Width, this.Height);

        // PARTICLES //
        this.DrawParticles();
    }

    DrawParticles() {
        for (var i = 0; i < App.Particles.length; i++) {

            // todo: use etch drawFrom to cache
            var particle = App.Particles[i];
            var pos = App.Metrics.FloatOnGrid(particle.Position);
            var unit = App.ScaledUnit;
            var sx = pos.x;
            var sy = pos.y;
            var size = particle.Size * unit;

            this.Ctx.fillStyle = App.Palette[8];
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
        var position: Point = new Point(e.clientX, e.clientY);

        this._PointerDown(position);
    }

    MouseUp(e: MouseEvent){
        var position: Point = new Point(e.clientX, e.clientY);

        this._PointerUp(position);
        this._CheckHover(position);
    }

    MouseMove(e: MouseEvent){
        var position: Point = new Point(e.clientX, e.clientY);
        this._PointerMove(position);
    }

    TouchStart(e: any){
        var touch = e.touches[0]; // e.args.Device.GetTouchPoint(null);
        var point = new Point(touch.clientX, touch.clientY);
        this._PointerDown(point);
    }

    TouchEnd(e: any){
        var touch = e.changedTouches[0]; // e.args.Device.GetTouchPoint(null);
        var point = new Point(touch.clientX, touch.clientY);

        this._PointerUp(point);
    }

    TouchMove(e: any){
        var touch = e.touches[0]; // e.args.Device.GetTouchPoint(null);
        var point = new Point(touch.clientX, touch.clientY);

        this._PointerMove(point);
    }

    // AGNOSTIC EVENTS //

    private _PointerDown(point: Point) {
        App.Metrics.ConvertToPixelRatioPoint(point);

        this._IsPointerDown = true;
        this._PointerPoint = point;

        var UI: Boolean;
        var collision: Boolean;

        var tooltip = this._ToolTip;
        var zoom = this.ZoomButtons;
        var header = this._Header;
        var soundcloud = this.SoundcloudPanel;
        var share = this.SharePanel;
        var settings = this.SettingsPanel;
        var recorder = this._RecorderPanel;
        var options = this.OptionsPanel;
        var message = this.MessagePanel;

        // UI //
        UI = this._UIInteraction(point);

        if (tooltip.Open) {
            this.ToolTipClose();
        }

        if (message.Hover) {
            message.MouseDown(point);
            return;
        }

        if (share.Open) {
            share.MouseDown(point);
            return;
        }

        if (settings.Open) {
            settings.MouseDown(point);
            return;
        }

        if (soundcloud.Open) {
            soundcloud.MouseDown(point);
            return;
        }

        if (!share.Open && !settings.Open && !soundcloud.Open) {
            header.MouseDown(point);

            if (header.MenuOver) {
                return;
            }

            zoom.MouseDown(point);
            if (zoom.InRoll || zoom.OutRoll) {
                return;
            }

            if (options.Scale==1) {
                options.MouseDown(point.x,point.y); // to do : unsplit point
                if (options.Hover) {
                    return;
                }
            }

            recorder.MouseDown(point);
            if (recorder.Hover) {
                return;
            }
        }

        // BLOCK CLICK //
        if (!UI) {
            collision = this._CheckCollision(point);
        }

        if (collision) {
            this.IsDraggingABlock = true; // for trashcan to know
            this._SelectedBlockPosition = this.SelectedBlock.Position; // memory of start position
        }

        // MainScene DRAGGING //
        if (!collision && !UI){
            this.MainSceneDragger.MouseDown(point);
        }
    }

    private _PointerUp(point: Point) {
        App.Metrics.ConvertToPixelRatioPoint(point);
        this._IsPointerDown = false;

        if (this.IsDraggingABlock) {
            var blockDelete = this._TrashCan.MouseUp();
        }

        this.IsDraggingABlock = false;

        if (!blockDelete) {
            // BLOCK //
            if (this.SelectedBlock){
                if (this.SelectedBlock.IsPressed){
                    this.SelectedBlock.MouseUp();

                    // if the block has moved, create an undoable operation.
                    if (!Point.isEqual(this.SelectedBlock.Position, this.SelectedBlock.LastPosition)){
                        App.CommandManager.ExecuteCommand(Commands.MOVE_BLOCK, this.SelectedBlock);
                    }
                }
            }

            // OPEN PANEL //
            if (OptionTimeout) {
                this.OptionsPanel.Open(this.SelectedBlock);
            }
        }

        // UI //
        if (this.SharePanel.Open) {
            this.SharePanel.MouseUp(point);
        }
         else if (this.SettingsPanel.Open) {
            this.SettingsPanel.MouseUp(point);
        } else {
            this._Header.MouseUp();

            if (this.OptionsPanel.Scale===1) {
                this.OptionsPanel.MouseUp();
            }

            this.MainSceneDragger.MouseUp();
        }
    }

    private _PointerMove(point: Point){
        App.Metrics.ConvertToPixelRatioPoint(point);
        App.Canvas.Style.cursor="default";

        this._CheckHover(point);

        // BLOCK //
        if (this.SelectedBlock){
            this.SelectedBlock.MouseMove(point);
            this._CheckProximity();
            if (this.IsDraggingABlock && (Math.round(this.SelectedBlock.Position.x)!==Math.round(this._SelectedBlockPosition.x) || Math.round(this.SelectedBlock.Position.y)!==Math.round(this._SelectedBlockPosition.y) ) ) {
                this._SelectedBlockPosition = this.SelectedBlock.Position; // new grid position
                this._ABlockHasBeenMoved(this.SelectedBlock);
                if (this.OptionsPanel.Scale==1) {
                    this.OptionsPanel.Close();
                }
            }
        }

        // UI //
        if (this.OptionsPanel.Scale==1) {
            this.OptionsPanel.MouseMove(point.x,point.y);
        }
        if (this.SharePanel.Open) {
            this.SharePanel.MouseMove(point);
        }
        if (this.SettingsPanel.Open) {
            this.SettingsPanel.MouseMove(point);
        }
        if (this.SoundcloudPanel.Open) {
            this.SoundcloudPanel.MouseMove(point);
        }
        if (this.MessagePanel.Open) {
            this.MessagePanel.MouseMove(point);
        }
        this._Header.MouseMove(point);
        this._RecorderPanel.MouseMove(point);
        this.ZoomButtons.MouseMove(point);
        this._TrashCan.MouseMove(point);
        this.MainSceneDragger.MouseMove(point);
    }

    // PROXIMITY CHECK //
    private _CheckProximity(){
        // loop through all Source blocks checking proximity to Effect blocks.
        // if within CatchmentArea, add Effect to Source.Effects and add Source to Effect.Sources

        for (var j = 0; j < App.Sources.length; j++) {
            var source: ISource = App.Sources[j];

            for (var i = 0; i < App.Effects.length; i++) {
                var effect: IEffect = App.Effects[i];

                // if a source is close enough to the effect, add the effect
                // to its internal list.
                var catchmentArea = App.Metrics.ConvertGridUnitsToAbsolute(new Point(effect.CatchmentArea, effect.CatchmentArea));
                var distanceFromEffect = source.DistanceFrom(App.Metrics.ConvertGridUnitsToAbsolute(effect.Position));

                if (distanceFromEffect <= catchmentArea.x) {
                    if (!source.Connections.Contains(effect)){

                        if (source instanceof PowerSource && effect instanceof PowerEffect || !(source instanceof PowerSource)) {
                            //Add sources to effect
                            effect.AddSource(source);

                            // Add effect to source
                            source.AddEffect(effect);

                            this._Invalidate();
                            App.Audio.ConnectionManager.Update();
                        }
                    }
                } else {
                    // if the source already has the effect on its internal list
                    // remove it as it's now too far away.
                    if (source.Connections.Contains(effect)){

                        // Remove source from effect
                        effect.RemoveSource(source);

                        // Remove effect from source
                        source.RemoveEffect(effect);

                        this._Invalidate();
                        App.Audio.ConnectionManager.Update();
                    }
                }
            }
        }
    }

    // COLLISION CHECK ON BLOCK //
    private _CheckCollision(point: Point): Boolean {
        // LOOP BLOCKS //
        for (var i = App.Blocks.length - 1; i >= 0; i--) {
            var block:IBlock = App.Blocks[i];
            if (block.HitTest(point)) {
                block.MouseDown();
                this.SelectedBlock = block;

                // TIMER TO CHECK BETWEEN SINGLE CLICK OR DRAG //
                OptionTimeout = true;
                setTimeout(function() {
                    OptionTimeout = false;
                }, 200);

                return true;
            }
        }

        // CLOSE OPTIONS IF NO BLOCK CLICKED //
        this.OptionsPanel.Close();

        return false;
    }

    // CHECK FOR HOVERING OVER BLOCK (TOOLTIP) //
    private _CheckHover(point: Point) {
        var panelCheck = false;
        var blockHover = false;
        var panel = this._ToolTip;

        // CHECK BLOCKS FOR HOVER //
        if (this.OptionsPanel.Scale === 1) {
            panelCheck = Dimensions.HitRect(this.OptionsPanel.Position.x,this.OptionsPanel.Position.y - (this.OptionsPanel.Size.height*0.5), this.OptionsPanel.Size.width,this.OptionsPanel.Size.height,point.x,point.y);
        }

        if (!panelCheck && !this._IsPointerDown) {
            for (var i = App.Blocks.length - 1; i >= 0; i--) {
                var block:IBlock = App.Blocks[i];
                if (block.HitTest(point)) {

                    // GET BLOCK NAME //
                    if (block.OptionsForm) {
                        panel.Name = block.OptionsForm.name;
                        var blockPos = App.Metrics.PointOnGrid(block.Position);
                        panel.Position.x = blockPos.x;
                        panel.Position.y = blockPos.y;
                        blockHover = true;
                    }
                    break;
                }
            }
        }

        // OPEN TOOLTIP IF NOT ALREADY OPEN //
        if (blockHover && !panel.Open && !this.OptionsPanel.Opening) {
            panel.Open = true;
            if (panel.Alpha>0) {
                panel.AlphaTo(panel, 100, 600);
            } else {
                this._ToolTipTimeout = setTimeout(function() {
                    if (panel.Alpha === 0) {
                        panel.AlphaTo(panel, 100, 600);
                    }
                },550);
            }
        }

        // CLOSE IF NO LONGER HOVERING //
        if (!blockHover && panel.Open) {
             this.ToolTipClose();
        }
    }

    public ToolTipClose() {
        var panel = this._ToolTip;
        clearTimeout(this._ToolTipTimeout);
        panel.StopTween();
        panel.AlphaTo(panel, 0, 200);
        panel.Open = false;
    }

    private _ABlockHasBeenMoved(block) {
        this._LaserBeams.UpdateAllLasers = true;
    }

    // IS ANYTHING ON THE UI LEVEL BEING CLICKED //
    private _UIInteraction(point) {

        var zoom = this.ZoomButtons;
        var header = this._Header;
        var share = this.SharePanel;
        var settings = this.SettingsPanel;
        var soundcloud = this.SoundcloudPanel;
        var recorder = this._RecorderPanel;
        var options = this.OptionsPanel;
        var message = this.MessagePanel;

        if (zoom.InRoll || zoom.OutRoll || header.MenuOver || share.Open || settings.Open || soundcloud.Open  || recorder.Hover || message.Hover || (options.Scale===1 && options.Hover)) {
            console.log("UI INTERACTION");
            return true;
        }

        return false;
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
        // todo: move this to redux store
        for (var i = 0; i < App.Sources.length; i++){
            var src: ISource = App.Sources[i];
            src.ValidateEffects();
        }

        for (var i = 0; i < App.Effects.length; i++){
            var effect: IEffect = App.Effects[i];
            effect.ValidateSources();
        }
    }

    CreateBlockFromType<T extends IBlock>(t: {new(): T; }): T {
        var block: T = new t();
        block.Id = App.GetBlockId();
        block.Position = this._PointerPoint;
        block.Init(this);
        block.Type = t;

        App.CommandManager.ExecuteCommand(Commands.CREATE_BLOCK, block);

        block.MouseDown();
        this.SelectedBlock = block;
        this.IsDraggingABlock = true;
        return block;
    }

    // GETS CALLED WHEN LOADING FROM SHARE URL //
    // todo: don't call things directly like this, use event handlers!
    CompositionLoaded() {
        // validate blocks and give us a little time to stabilise / bring in volume etc
        this._Invalidate();

        setTimeout(() => {
            this.Play();
            App.Audio.Master.volume.rampTo(App.Audio.MasterVolume,1);
        },200);

        if (!App.LoadCued) {
            //App.Splash.EndLoad();
        }
    }m

    //-------------------------------------------------------------------------------------------
    //  OPERATIONS
    //-------------------------------------------------------------------------------------------

    DeleteSelectedBlock(){
        if (!this.SelectedBlock) return;
        this.SelectedBlock.MouseUp();
        this.OptionsPanel.Close();
        App.CommandManager.ExecuteCommand(Commands.DELETE_BLOCK, this.SelectedBlock);
        this.SelectedBlock = null;
    }

    Resize() {
        this.OptionsPanel.Close();
        this.OptionsPanel.Resize();
        this._Header.Populate(this._Header.MenuJson);
        this.ZoomButtons.UpdatePositions();
        this.SharePanel.Resize();
        this.SoundcloudPanel.Resize();
        this.SettingsPanel.Populate(this.SettingsPanel.MenuJson);
    }
}
