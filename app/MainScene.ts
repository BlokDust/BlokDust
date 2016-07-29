import Dimensions = Utils.Measurements.Dimensions;
import DisplayObject = etch.drawing.DisplayObject;
import IEventArgs = nullstone.IEventArgs;
import Point = etch.primitives.Point;
import Stage = etch.drawing.Stage;
import {AnimationsLayer} from './UI/AnimationsLayer';
import {CreateNew} from './UI/CreateNew';
import {Commands} from './Commands';
import {CompositionLoadedEventArgs} from './CompositionLoadedEventArgs';
import {ConnectionLines} from './UI/ConnectionLines';
import {Header} from './UI/Header';
import {IApp} from './IApp';
import {IBlock} from './Blocks/IBlock';
import {IEffect} from './Blocks/IEffect';
import {IOperation} from './Core/Operations/IOperation';
import {ISource} from './Blocks/ISource';
import {LaserBeams} from './LaserBeams';
import {MessagePanel} from './UI/MessagePanel';
import {OptionsPanel} from './UI/OptionsPanel';
import {ParticleLayer} from './ParticleLayer';
import {PowerEffect} from './Blocks/Power/PowerEffect';
import {PowerSource} from './Blocks/Power/PowerSource';
import {RecorderPanel} from './UI/RecorderPanel';
import {SettingsPanel} from './UI/SettingsPanel';
import {SharePanel} from './UI/SharePanel';
import {SoundcloudPanel} from './UI/SoundcloudPanel';
import {StageDragger as MainSceneDragger} from './UI/StageDragger';
import {ToolTip} from './UI/ToolTip';
import {TrashCan} from './UI/TrashCan';
import {Tutorial} from './UI/Tutorial';
import {TutorialHotspots} from './UI/TutorialHotspots';
import {ZoomButtons} from './UI/ZoomButtons';

declare var App: IApp;
declare var OptionTimeout: boolean; //TODO: better way than using global? Needs to stay in scope within a setTimeout though.

export class MainScene extends DisplayObject{

    public Header: Header;
    private _IsPointerDown: boolean = false;
    private _PointerPoint: Point;
    private _RecorderPanel: RecorderPanel;
    private _SelectedBlock: IBlock;
    private _SelectedBlockPosition: Point;
    private _ToolTip: ToolTip;
    private _ToolTipTimeout;
    private _TrashCan: TrashCan;
    public AnimationsLayer: AnimationsLayer;
    public BlocksContainer: DisplayObject;
    public ConnectionLines: ConnectionLines;
    public CreateNew: CreateNew;
    public IsDraggingABlock: boolean = false;
    public LaserBeams: LaserBeams;
    public MainSceneDragger: MainSceneDragger;
    public MessagePanel: MessagePanel;
    public OptionsPanel: OptionsPanel;
    public Particles: ParticleLayer;
    public SettingsPanel: SettingsPanel;
    public SharePanel: SharePanel;
    public SoundcloudPanel: SoundcloudPanel;
    public Tutorial: Tutorial;
    public TutorialHotspots: TutorialHotspots;
    public ZoomButtons: ZoomButtons;

    //-------------------------------------------------------------------------------------------
    //  SETUP
    //-------------------------------------------------------------------------------------------

    constructor() {
        super();
    }

    setup(){

        super.setup();

        App.PointerInputManager.MouseDown.on((s: any, e: MouseEvent) => {
            this.MouseDown(e);
        }, this);

        App.PointerInputManager.MouseUp.on((s: any, e: MouseEvent) => {
            this.MouseUp(e);
        }, this);

        App.PointerInputManager.MouseMove.on((s: any, e: MouseEvent) => {
            this.MouseMove(e);
        }, this);

        App.PointerInputManager.MouseWheel.on((s: any, e: MouseWheelEvent) => {
            this.MouseWheel(e);
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

        // COMPOSITION LOADED //

        App.CompositionLoaded.on((s: any, e: CompositionLoadedEventArgs) => {
            this.CompositionLoaded(e);
        }, this);

        // FILE DRAGGING //

        //App.DragFileInputManager.Dropped.on((s: any, e: any) => {
        //    e.stopPropagation();
        //    e.preventDefault();
        //    const b: Sampler = this.CreateBlockFromType(Sampler);
        //
        //    var files = e.dataTransfer.files; // FileList object.
        //
        //    App.Audio.AudioFileManager.DecodeFileData(files, (file: any, buffer: AudioBuffer) => {
        //        if (buffer) {
        //            //TODO: set the buffer of this newly created Sampler
        //            console.log(file.name + ' dropped');
        //        }
        //    });
        //
        //}, this);
        //
        //App.DragFileInputManager.DragEnter.on((s: any, e: any) => {
        //    console.log('file drag entered area');
        //}, this);
        //
        //App.DragFileInputManager.DragMove.on((s: any, e: any) => {
        //    e.stopPropagation();
        //    e.preventDefault();
        //    console.log('file drag over');
        //}, this);
        //
        //App.DragFileInputManager.DragLeave.on((s: any, e: any) => {
        //    console.log('file left drag area');
        //}, this);

        OptionTimeout = false; // todo: remove

        // METRICS //
        this._PointerPoint = new Point();
        this._SelectedBlockPosition = new Point();

        // Display Objects //

        this.ConnectionLines = new ConnectionLines();
        this.displayList.add(this.ConnectionLines);
        this.ConnectionLines.init(this);

        this.BlocksContainer = new DisplayObject();
        this.displayList.add(this.BlocksContainer);
        this.BlocksContainer.init(this);

        this.LaserBeams = new LaserBeams();
        this.displayList.add(this.LaserBeams);
        this.LaserBeams.init(this);

        this.Particles = new ParticleLayer();
        this.displayList.add(this.Particles);
        this.Particles.init(this);

        this._ToolTip = new ToolTip();
        this.displayList.add(this._ToolTip);
        this._ToolTip.init(this);

        this.AnimationsLayer = new AnimationsLayer();
        this.displayList.add(this.AnimationsLayer);
        this.AnimationsLayer.init(this);

        this._RecorderPanel = new RecorderPanel();
        this.displayList.add(this._RecorderPanel);
        this._RecorderPanel.init(this);

        this.ZoomButtons = new ZoomButtons();
        this.displayList.add(this.ZoomButtons);
        this.ZoomButtons.init(this);

        this.MainSceneDragger = new MainSceneDragger();
        this.displayList.add(this.MainSceneDragger);
        this.MainSceneDragger.init(this);

        this._TrashCan = new TrashCan();
        this.displayList.add(this._TrashCan);
        this._TrashCan.init(this);

        this.Tutorial = new Tutorial();
        this.displayList.add(this.Tutorial);
        this.Tutorial.init(this);

        this.OptionsPanel = new OptionsPanel();
        this.displayList.add(this.OptionsPanel);
        this.OptionsPanel.init(this);

        this.Header = new Header();
        this.displayList.add(this.Header);
        this.Header.init(this);

        this.CreateNew = new CreateNew();
        this.displayList.add(this.CreateNew);
        this.CreateNew.init(this);

        this.TutorialHotspots = new TutorialHotspots();
        this.displayList.add(this.TutorialHotspots);
        this.TutorialHotspots.init(this);

        this.SharePanel = new SharePanel();
        this.displayList.add(this.SharePanel);
        this.SharePanel.init(this);

        this.SettingsPanel = new SettingsPanel();
        this.displayList.add(this.SettingsPanel);
        this.SettingsPanel.init(this);

        this.SoundcloudPanel = new SoundcloudPanel();
        this.displayList.add(this.SoundcloudPanel);
        this.SoundcloudPanel.init(this);

        this.MessagePanel = new MessagePanel();
        this.displayList.add(this.MessagePanel);
        this.MessagePanel.init(this);

        this._Invalidate();

        //console.log(App.Stage);

        if(!App.CompositionId) {
            this.Tutorial.CheckLaunch();
        }
    }

    //-------------------------------------------------------------------------------------------
    //  UPDATE
    //-------------------------------------------------------------------------------------------

    update() {
        if (this.isPaused) return;
        super.update();
    }

    //-------------------------------------------------------------------------------------------
    //  DRAW
    //-------------------------------------------------------------------------------------------

    draw(): void {
        super.draw();

        // BG //
        App.FillColor(this.ctx,App.Palette[0]);
        this.ctx.globalAlpha = 1;
        this.ctx.fillRect(0, 0, this.width, this.height);
    }


    //-------------------------------------------------------------------------------------------
    //  INTERACTION
    //-------------------------------------------------------------------------------------------


    // FIRST TOUCHES //
    MouseDown(e: MouseEvent): void {
        var position: Point = new Point(e.clientX, e.clientY);
        this._PointerDown(position);
    }

    MouseUp(e: MouseEvent): void {
        var position: Point = new Point(e.clientX, e.clientY);
        this._PointerUp(position);
        this._CheckHover(position);
    }

    MouseMove(e: MouseEvent): void {
        var position: Point = new Point(e.clientX, e.clientY);
        this._PointerMove(position);
    }

    MouseWheel(e: MouseWheelEvent): void {
        this._MouseWheel(e);
    }

    TouchStart(e: any){
        var touch = e.touches[0]; // e.args.Device.GetTouchPoint(null);
        var point = new Point(touch.clientX, touch.clientY);
        this._PointerDown(point);
    }

    TouchEnd(e: any){
        var touch = e.changedTouches[0]; // e.args.Device.GetTouchPoint(null);
        var point = new Point(touch.clientX, touch.clientY);
        this._PointerUp(point,true);
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
        var UIInteraction: Boolean;
        var collision: Boolean;

        var tooltip = this._ToolTip;
        var zoom = this.ZoomButtons;
        var header = this.Header;
        var soundcloud = this.SoundcloudPanel;
        var share = this.SharePanel;
        var settings = this.SettingsPanel;
        var recorder = this._RecorderPanel;
        var options = this.OptionsPanel;
        var message = this.MessagePanel;
        var create = this.CreateNew;
        var tutorial = this.Tutorial;

        // UI //
        //UIInteraction = this._UIInteraction();

        if (tooltip.Open) {
            this.ToolTipClose();
        }

        if (message.Open && message.Hover) {
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


            if (tutorial.SplashOpen) {
                tutorial.SplashMouseDown(point);
                if (tutorial.Hover) {
                    return;
                }
            }

            create.MouseDown(point);
            if (create.Hover) {
                return;
            }

            header.MouseDown(point);
            if (header.MenuOver) {
                return;
            }

            zoom.MouseDown(point);
            if (zoom.InRoll || zoom.OutRoll) {
                return;
            }

            if (options.Scale === 1) {
                options.MouseDown(point.x,point.y); // to do : unsplit point
                if (options.Hover) {
                    return;
                }
            }

            if (tutorial.Open) {
                tutorial.MouseDown(point);
                if (tutorial.Hover) {
                    return;
                }
            }

            recorder.MouseDown(point);
            if (recorder.Hover) {
                return;
            }
        }

        // BLOCK CLICK //
        //if (!UIInteraction) {
            collision = this._CheckCollision(point);
        //}

        if (collision) {
            this.IsDraggingABlock = true; // for trashcan to know
            this._SelectedBlockPosition = this.SelectedBlock.Position; // memory of start position
        }

        // MainScene DRAGGING //
        if (!collision){
        //if (!collision && !UIInteraction){
            this.MainSceneDragger.MouseDown(point);
        }

        //this.ConnectionLines.UpdateList();
    }

    private _PointerUp(point: Point, isTouch?: boolean) {
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
            this.SharePanel.MouseUp(point,isTouch);
        }
         else if (this.SettingsPanel.Open) {
            this.SettingsPanel.MouseUp(point);
        } else {
            this.Header.MouseUp();

            if (this.OptionsPanel.Scale === 1) {
                this.OptionsPanel.MouseUp();
            }

            this.MainSceneDragger.MouseUp();
        }
        //this.ConnectionLines.UpdateList();
    }

    private _PointerMove(point: Point){
        App.Metrics.ConvertToPixelRatioPoint(point);
        App.Canvas.style.cursor = "default";

        this._CheckHover(point);

        // BLOCK //
        if (this.SelectedBlock){
            this.SelectedBlock.MouseMove(point);
            this._CheckProximity();
            if (this.IsDraggingABlock && (Math.round(this.SelectedBlock.Position.x) !== Math.round(this._SelectedBlockPosition.x) || Math.round(this.SelectedBlock.Position.y) !== Math.round(this._SelectedBlockPosition.y) ) ) {
                this._SelectedBlockPosition = this.SelectedBlock.Position; // new grid position
                this._ABlockHasBeenMoved();
                if (this.OptionsPanel.Scale === 1) {
                    this.OptionsPanel.Close();
                }
            }
        }

        // UI //
        if (this.OptionsPanel.Scale === 1) {
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
        this.Header.MouseMove(point);
        this._RecorderPanel.MouseMove(point);
        this.CreateNew.MouseMove(point);
        if (this.Tutorial.Open || this.Tutorial.SplashOpen) {
            this.Tutorial.MouseMove(point);
        }
        this.ZoomButtons.MouseMove(point);
        this._TrashCan.MouseMove(point);
        this.MainSceneDragger.MouseMove(point);
    }

    private _MouseWheel(e: MouseWheelEvent): void {
        this.ZoomButtons.MouseWheel(e);
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
                            App.Audio.ConnectionManager.update();
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
                        App.Audio.ConnectionManager.update();
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
                }, App.Config.SingleClickTime);

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
            panelCheck = Dimensions.hitRect(this.OptionsPanel.Position.x,this.OptionsPanel.Position.y - (this.OptionsPanel.Size.height*0.5), this.OptionsPanel.Size.width,this.OptionsPanel.Size.height,point.x,point.y);
        }

        if (!panelCheck && !this._IsPointerDown) {
            for (var i = App.Blocks.length - 1; i >= 0; i--) {
                var block:IBlock = App.Blocks[i];
                if (block.HitTest(point)) {

                    // GET BLOCK NAME //
                    //if (block.OptionsForm) {
                        panel.Name = block.BlockName;
                        var blockPos = App.Metrics.PointOnGrid(block.Position);
                        panel.Position.x = blockPos.x;
                        panel.Position.y = blockPos.y;
                        blockHover = true;
                    //}
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

    private _ABlockHasBeenMoved() {
        this.LaserBeams.UpdateAllLasers = true;
        this.ConnectionLines.UpdateList();
    }

    // IS ANYTHING ON THE UI LEVEL BEING CLICKED //
    private _UIInteraction() {

        var zoom = this.ZoomButtons;
        var header = this.Header;
        var share = this.SharePanel;
        var settings = this.SettingsPanel;
        var soundcloud = this.SoundcloudPanel;
        var recorder = this._RecorderPanel;
        var options = this.OptionsPanel;
        var message = this.MessagePanel;
        var create = this.CreateNew;
        var tutorial = this.Tutorial;

        if (zoom.InRoll || zoom.OutRoll || header.MenuOver || share.Open || settings.Open || soundcloud.Open  || recorder.Hover || (message.Open && message.Hover) || create.Hover || ((tutorial.Open || tutorial.SplashOpen) && tutorial.Hover) || (options.Scale===1 && options.Hover)) {
            console.log(zoom.InRoll);
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
        }

        else {
            if (this._SelectedBlock){
                this._SelectedBlock.IsSelected = false;
            }

            
            if (block) {
                block.IsSelected = true;
                this._SelectedBlock = block;
                this.BlockToFront(block);
            }
        }
    }

    BlockToFront(block: IBlock){
        this.BlocksContainer.displayList.toFront(block);
    }

    private _Invalidate(){
        this._ValidateBlocks();
        this._CheckProximity();
        this.CreateNew.CheckState();
        this.Tutorial.CheckTask();
    }

    _ValidateBlocks() {

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
        block.Position = App.Metrics.CursorToGrid(this._PointerPoint);
        if (params) block.Params = this.DuplicateParams(params);

        //TODO:
        //if (block instanceof Recorder) {
        //    (<any>block).Duplicate((<any>block).BufferSource.buffer);
        //}

        block.init(this);
        block.Type = t;

        App.CommandManager.ExecuteCommand(Commands.CREATE_BLOCK, block);

        block.MouseDown();
        this.SelectedBlock = block;
        this.BlockToFront(block);
        this.IsDraggingABlock = true;
        return block;
    }

    // GETS CALLED WHEN LOADING FROM SHARE URL //
    CompositionLoaded(e: CompositionLoadedEventArgs): void {

        // add blocks to display list
        this.BlocksContainer.displayList.addRange(App.Blocks);

        // initialise blocks (give them a ctx to draw to)
        for (var i = 0; i < this.BlocksContainer.displayList.Count; i++){
            var block: IBlock = <IBlock>this.BlocksContainer.displayList.GetValueAt(i);
            block.init(this);
        }

        if (this.MainSceneDragger) {
            this.MainSceneDragger.Destination = new Point(e.SaveFile.DragOffset.x, e.SaveFile.DragOffset.y);
        }

        this.ZoomButtons.UpdateSlot(e.SaveFile.ZoomLevel);
        this.SharePanel.Reset();

        App.Metrics.UpdateGridScale();

        // validate blocks and give us a little time to stabilise / bring in volume etc
        this._Invalidate();

        // Fade In Audio //
        setTimeout(() => {
            this.play();
            this.ConnectionLines.UpdateList();
            // App.Audio.Master.volume.linearRampToValue(App.Audio.MasterVolume,5); //This breaks audio volume slider
        }, 2400);

        //TODO: THIS IS SHIT - For some reason fading in the volume using the above method breaks the volume slider
        // Come back to this once useful functions have been abstracted from Tone into a simplified version
        var volume = -30
        var volumeFade = setInterval(() => {
            if (volume < App.Audio.MasterVolume) {
                App.Audio.Master.volume.value = volume;
                volume += 2;
            } else {
                clearInterval(volumeFade);
            }
        }, 70)
     }

    //-------------------------------------------------------------------------------------------
    //  OPERATIONS
    //-------------------------------------------------------------------------------------------

    DeleteSelectedBlock(){
        if (!this.SelectedBlock) return;
        if (this.SelectedBlock.IsPressed) {
            this.SelectedBlock.MouseUp();
        }
        this.OptionsPanel.Close();
        App.CommandManager.ExecuteCommand(Commands.DELETE_BLOCK, this.SelectedBlock);
        //this.DeleteBlock(this.SelectedBlock);
        this.SelectedBlock = null;

        // Update drawing of connection lines //
        setTimeout(() => {
            this.ConnectionLines.UpdateList();
        }, 1);
    }


    DeleteBlock(block) {
        this.BlocksContainer.displayList.Remove(block);
        App.Blocks.remove(block);
        //this.SelectedBlock.Stop(); //LP commented this out because if you have a keyboard and a source connected and call reset you get errors
        block.Dispose();
        block = null;
    }

    DeleteAllBlocks() {
        var blockList = [];
        for (var i=0; i<App.Blocks.length; i++) {
            blockList.push(App.Blocks[i]);
        }
        for (i=0; i<blockList.length; i++) {
            this.DeleteBlock(blockList[i]);
        }
    }

    // CLEAR SCENE OF ALL BLOCKS, RESET SESSION //
    ResetScene() {

        if (this.Tutorial.Open) {
            this.Tutorial.ClosePanel();
        }

        // delete all blocks //
        this.DeleteAllBlocks();
        this.Tutorial.WatchedBlocks = [];
        this.ConnectionLines.UpdateList();
        this.SelectedBlock = null;

        // reset zoom & drag //
        App.DragOffset.x = 0;
        App.DragOffset.y = 0;
        this.ZoomButtons.CurrentSlot = 2;
        this.MainSceneDragger.Destination = new Point(App.DragOffset.x,App.DragOffset.y);
        App.ZoomLevel = 1;
        App.Particles = [];
        App.Metrics.UpdateGridScale();
        this.OptionsPanel.Close();

        // reset session //
        App.AddressBarManager.StripURL();
        App.CompositionId = null;
        App.SessionId = null;
        this.SharePanel.Reset();

        // invalidate //
        this._Invalidate();
    }

    resize(): void {
        this.OptionsPanel.Close();
        this.Header.Populate(this.Header.MenuJson);
        this.SettingsPanel.Populate(this.SettingsPanel.MenuJson);
    }
}
