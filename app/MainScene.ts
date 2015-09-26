import {AnimationsLayer} from './UI/AnimationsLayer';
import {BlockSprites} from './Blocks/BlockSprites';
import {BlockCreator} from './BlockCreator';
import {ChangePropertyOperation} from './Core/Operations/ChangePropertyOperation';
import {Commands} from './Commands';
import {ConnectionLines} from './UI/ConnectionLines';
import {DisplayList} from './DisplayList';
import {DisplayObjectCollection} from './DisplayObjectCollection';
import {Grid} from './Grid';
import {Header} from './UI/Header';
import {IApp} from './IApp';
import {IBlock} from './Blocks/IBlock';
import {ICommandHandler} from './Core/Commands/ICommandHandler';
import {IEffect} from './Blocks/IEffect';
import {IOperation} from './Core/Operations/IOperation';
import {IPooledObject} from './Core/Resources/IPooledObject';
import {ISource} from './Blocks/ISource';
import {IUndoableOperation} from './Core/Operations/IUndoableOperation';
import {Laser} from './Blocks/Power/Laser';
import {LaserBeams} from './LaserBeams';
import {StageDragger as MainSceneDragger} from './UI/StageDragger';
import {MessagePanel} from './UI/MessagePanel';
import {OptionsPanel} from './UI/OptionsPanel';
import {Particle} from './Particle';
import {PooledFactoryResource} from './Core/Resources/PooledFactoryResource';
import {PowerEffect} from './Blocks/Power/PowerEffect';
import {PowerSource} from './Blocks/Power/PowerSource';
import {Recorder} from './Blocks/Sources/Recorder';
import {RecorderPanel} from './UI/RecorderPanel';
import {Source} from './Blocks/Source';
import {Sampler} from './Blocks/Sources/Sampler';
import {SharePanel} from './UI/SharePanel';
import SketchSession = Fayde.Drawing.SketchSession; //TODO: es6 module
import {SoundcloudPanel} from './UI/SoundcloudPanel';
import {SettingsPanel} from './UI/SettingsPanel';
import {ToolTip} from './UI/ToolTip';
import {TrashCan} from './UI/TrashCan';
import {ZoomButtons} from './UI/ZoomButtons';

declare var App: IApp;

declare var OptionTimeout: boolean; //TODO: better way than using global? Needs to stay in scope within a setTimeout though.

export class MainScene extends Fayde.Drawing.SketchContext{

    private _SelectedBlock: IBlock;
    private _IsPointerDown: boolean = false;
    private _DisplayList: DisplayList;
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

        // INSTANCES //
        this.BlockSprites = new BlockSprites();
        this.BlockSprites.Init(this);

        this.BlockCreator = new BlockCreator();

        this.OptionsPanel = new OptionsPanel();
        this.OptionsPanel.Init(this);

        this.SharePanel = new SharePanel();
        this.SharePanel.Init(this);

        this.SettingsPanel = new SettingsPanel();
        this.SettingsPanel.Init(this);

        this.SoundcloudPanel = new SoundcloudPanel();
        this.SoundcloudPanel.Init(this);

        this.MessagePanel = new MessagePanel();
        this.MessagePanel.Init(this);

        this._Header = new Header();
        this._Header.Init(this);

        this._ToolTip = new ToolTip();
        this._ToolTip.Init(this);

        this.ZoomButtons = new ZoomButtons();
        this.ZoomButtons.Init(this);

        this.MainSceneDragger = new MainSceneDragger();
        this.MainSceneDragger.Init(this);

        this._TrashCan = new TrashCan();
        this._TrashCan.Init(this);

        this._ConnectionLines = new ConnectionLines();
        this._ConnectionLines.Init(this);

        this._RecorderPanel = new RecorderPanel();
        this._RecorderPanel.Init(this);

        this._LaserBeams = new LaserBeams();
        this._LaserBeams.Init(this);

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
        this.SketchResize();
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

        this._LaserBeams.Update();
        this._RecorderPanel.Update();
        this.MainSceneDragger.Update();
        this.OptionsPanel.Update();
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

    SketchResize() {
        this.OptionsPanel.Close();
        this.OptionsPanel.Resize();
        this._Header.Populate(this._Header.MenuJson);
        this.ZoomButtons.UpdatePositions();
        this.SharePanel.Resize();
        this.SoundcloudPanel.Resize();
        this.SettingsPanel.Populate(this.SettingsPanel.MenuJson);
    }

    //-------------------------------------------------------------------------------------------
    //  DRAW
    //-------------------------------------------------------------------------------------------

    Draw(){

        if (this.IsPaused) return;

        super.Draw();

        // BG //
        this.Ctx.fillStyle = App.Palette[0];
        this.Ctx.fillRect(0, 0, this.Width, this.Height);


        // LINES //
        this._ConnectionLines.Draw();

        // BLOCKS //
        this.DisplayList.Draw();

        // PARTICLES //
        this.DrawParticles();

        // LASER BEAMS //
        this._LaserBeams.Draw();

        // BLOCK ANIMATIONS //
        App.AnimationsLayer.Draw();

        // UI //
        this._ToolTip.Draw();
        this._RecorderPanel.Draw();
        this.OptionsPanel.Draw();
        this.ZoomButtons.Draw();
        this.MainSceneDragger.Draw();
        this._TrashCan.Draw();
        this._Header.Draw();
        this.SoundcloudPanel.Draw();
        this.SharePanel.Draw();
        this.SettingsPanel.Draw();
        this.MessagePanel.Draw();
    }


    DrawParticles() {
        for (var i = 0; i < App.Particles.length; i++) {

            // todo: pre-render these in a single canvas
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
        //var pos: Fayde.Input.TouchPoint = e.GetTouchPoint(null);
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
        App.Canvas.style.cursor="default";

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
            var source:ISource = App.Sources[j];

            for (var i = 0; i < App.Effects.length; i++) {
                var effect:IEffect = App.Effects[i];

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
                },200);

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
        if (this.OptionsPanel.Scale==1) {
            panelCheck = this._BoxCheck(this.OptionsPanel.Position.x,this.OptionsPanel.Position.y - (this.OptionsPanel.Size.height*0.5), this.OptionsPanel.Size.width,this.OptionsPanel.Size.height,point.x,point.y);
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
                panel.AlphaTo(panel,100,600);
            } else {
                this._ToolTipTimeout = setTimeout(function() {
                    if (panel.Alpha==0) {
                        panel.AlphaTo(panel,100,600);
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
        panel.AlphaTo(panel,0,200);
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

        if (zoom.InRoll || zoom.OutRoll || header.MenuOver || share.Open || settings.Open || soundcloud.Open  || recorder.Hover || message.Hover || (options.Scale==1 && options.Hover)) {
            console.log("UI INTERACTION");
            return true;
        }

        return false;
    }

    // todo: move this to generic util
    private _BoxCheck(x, y, w, h, mx, my) { // IS CURSOR WITHIN GIVEN BOUNDARIES
        return (mx > x && mx < (x + w) && my > y && my < (y + h));
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

    DuplicateParams(params: any): any {
        var paramsCopy = {};
        for (var key in params) {
            paramsCopy[""+key] = params[""+key];
        }
        return paramsCopy;
    }

    CreateBlockFromType<T extends IBlock>(t: {new(): T; }, params?: any): T {
        var block: T = new t();
        block.Id = App.GetBlockId();
        block.Position = this._PointerPoint;
        if (params) block.Params = this.DuplicateParams(params);


        //TODO:
        //if (block instanceof Recorder) {
        //    (<any>block).Duplicate((<any>block).BufferSource.buffer);
        //}

        block.Init(this);
        block.Type = t;


        App.CommandManager.ExecuteCommand(Commands.CREATE_BLOCK, block);

        block.MouseDown();
        this.SelectedBlock = block;
        this.IsDraggingABlock = true;
        return block;
    }

    // GETS CALLED WHEN LOADING FROM SHARE URL //
    CompositionLoaded() {
        // validate blocks and give us a little time to stabilise / bring in volume etc
        this._Invalidate();

        setTimeout(() => {
            this.Play();
            App.Audio.Master.volume.rampTo(App.Audio.MasterVolume,1);
        },200);

        if (!App.LoadCued) {
            App.Splash.EndLoad();
        }
    }

    //-------------------------------------------------------------------------------------------
    //  OPERATIONS
    //-------------------------------------------------------------------------------------------

    DeleteSelectedBlock(){
        if (!this.SelectedBlock) return;
        this.SelectedBlock.MouseUp();
        this.OptionsPanel.Close();
        App.CommandManager.ExecuteCommand(Commands.DELETE_BLOCK, this.SelectedBlock);
        this.SelectedBlock = null;

        //App.CommandManager.ExecuteCommand(Commands[Commands.INCREMENT_NUMBER], 1);
    }
}
