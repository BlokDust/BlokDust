/// <reference path="./lib/exjs/dist/ex.d.ts"/>
import {AnimationsLayer} from './UI/AnimationsLayer';
import {Audio} from './Core/Audio/Audio';
import {Canvas} from './Core/Drawing/Canvas';
import {ClockTimer} from './Core/Engine/ClockTimer';
import {ColorThemes} from './UI/ColorThemes';
import {CommandHandlerFactory} from './Core/Resources/CommandHandlerFactory';
import {CommandManager} from './Core/Commands/CommandManager';
import {CommandsInputManager} from './Core/Inputs/CommandsInputManager';
import {Commands} from './Commands';
import {Config} from './Config';
import {CreateBlockCommandHandler} from './CommandHandlers/CreateBlockCommandHandler';
import {DeleteBlockCommandHandler} from './CommandHandlers/DeleteBlockCommandHandler';
import {DisplayList} from './Core/Drawing/DisplayList';
import {DisplayObject} from './Core/Drawing/DisplayObject';
import {DisplayObjectCollection} from './Core/Drawing/DisplayObjectCollection';
import {DragFileInputManager} from './Core/Inputs/DragFileInputManager';
import {Effect} from './Blocks/Effect';
import {FocusManagerEventArgs} from './Core/Inputs/FocusManagerEventArgs';
import {FocusManager} from './Core/Inputs/FocusManager';
import {GA} from './GA';
import {Grid} from './Grid';
import {IApp} from './IApp';
import {IBlock} from './Blocks/IBlock';
import {IDisplayObject} from './Core/Drawing/IDisplayObject';
import {IEffect} from './Blocks/IEffect';
import {IncrementNumberCommandHandler} from './CommandHandlers/IncrementNumberCommandHandler';
import {InputManager} from './Core/Inputs/InputManager';
import {IPowerEffect} from './Blocks/Power/IPowerEffect';
import {ISource} from './Blocks/ISource';
import {KeyboardInputManager as KeyboardInput} from './Core/Inputs/KeyboardInputManager';
import {LoadCommandHandler} from './CommandHandlers/LoadCommandHandler';
import {MainScene} from './MainScene';
import {Metrics} from './AppMetrics';
import {MoveBlockCommandHandler} from './CommandHandlers/MoveBlockCommandHandler';
import {OperationManager} from './Core/Operations/OperationManager';
import {Particle} from './Particle';
import {PointerInputManager} from './Core/Inputs/PointerInputManager';
import {PooledFactoryResource} from './Core/Resources/PooledFactoryResource';
import {PowerEffect} from './Blocks/Power/PowerEffect';
import {RedoCommandHandler} from './CommandHandlers/RedoCommandHandler';
import {ResourceManager} from './Core/Resources/ResourceManager';
import {SaveAsCommandHandler} from './CommandHandlers/SaveAsCommandHandler';
import {SaveCommandHandler} from './CommandHandlers/SaveCommandHandler';
import {SaveFile} from './SaveFile';
import {Serializer} from './Serializer';
import {Source} from './Blocks/Source';
import {Splash} from './Splash';
import {TypingManager} from './Core/Inputs/TypingManager';
import {UndoCommandHandler} from './CommandHandlers/UndoCommandHandler';
import Point = minerva.Point;

export default class App implements IApp{

    private _ClockTimer: ClockTimer = new ClockTimer();
    private _FontsLoaded: number;
    private _SaveFile: SaveFile;
    private _SessionId: string;
    public AnimationsLayer: AnimationsLayer;
    public Audio: Audio = new Audio();
    public Blocks: IBlock[] = [];
    public Canvas: Canvas;
    public Color: ColorThemes;
    public CommandManager: CommandManager;
    public CommandsInputManager: CommandsInputManager;
    public CompositionId: string;
    public CompositionName: string;
    public Config: Config;
    public DragFileInputManager: DragFileInputManager;
    public DragOffset: Point;
    public FocusManager: FocusManager;
    public GridSize: number;
    public Height: number;
    public InputManager: InputManager;
    public IsLoadedFromSave: boolean = false;
    public KeyboardInput: KeyboardInput;
    public LoadCued: boolean;
    public MainScene: MainScene;
    public Metrics: Metrics;
    public OperationManager: OperationManager;
    public Palette: string[] = [];
    public Particles: Particle[] = [];
    public ParticlesPool: PooledFactoryResource<Particle>;
    public PointerInputManager: PointerInputManager;
    public ResourceManager: ResourceManager;
    public ScaledDragOffset: Point;
    public ScaledGridSize: number;
    public ScaledUnit: number;
    public Scene: number;
    public Splash: Splash;
    public SubCanvas: HTMLCanvasElement[];
    public TypingManager: TypingManager;
    public Unit: number;
    public Width: number;
    public ZoomLevel: number;

    // todo: move to BlockStore
    get Sources(): ISource[] {
        return <ISource[]>this.Blocks.en().where(b => b instanceof Source).toArray();
    }

    // todo: move to BlockStore
    get Effects(): IEffect[] {
        return <IEffect[]>this.Blocks.en().where(b => b instanceof Effect).toArray();
    }

    get PowerEffects(): IPowerEffect[] {
        return <IPowerEffect[]>this.Blocks.en().where(b => b instanceof PowerEffect).toArray();
    }

    get SessionId(): string {
        return this._SessionId || localStorage.getItem(this.CompositionId);
    }

    set SessionId(value: string) {
        this._SessionId = value;
        localStorage.setItem(this.CompositionId, this._SessionId);
    }

    // todo: move to BlockStore
    public GetBlockId(): number {
        // loop through blocks to get max id
        var max = 0;

        for (var i = 0; i < this.Blocks.length; i++){
            var b = this.Blocks[i];
            if (b.Id > max){
                max = b.Id;
            }
        }

        return max + 1;
    }

    constructor(config: string) {
        this.Config = <Config>JSON.parse(config);
    }

    public Setup(){

        this.Canvas = new Canvas();
        this.Scene = 0;

        this.SubCanvas = [];
        this.CreateSubCanvas(0); // optionsPanel

        // METRICS //
        this.Metrics = new Metrics();
        window.onresize = () => {
            this.Resize();
        };

        // LOAD FONTS AND SETUP CALLBACK //
        this.LoadCued = false;
        this._FontsLoaded = 0;

        WebFont.load({
            custom: { families: ['Merriweather Sans:i3','Dosis:n2,n4']},
            fontactive: (font, fvd) => { this.FontsLoaded(font, fvd) },
            timeout: 3000 // 3 seconds
        });

        setTimeout(() => {
            this.FontsNotLoaded();
        }, 3020);

        // CREATE OPERATIONS MANAGERS //
        this.OperationManager = new OperationManager();
        this.OperationManager.MaxOperations = this.Config.MaxOperations;
        this.ResourceManager = new ResourceManager();
        this.CommandManager = new CommandManager(this.ResourceManager);

        // initialise core audio
        this.Audio.Init();

        // REGISTER COMMAND HANDLERS //
        this.ResourceManager.AddResource(new CommandHandlerFactory(Commands.CREATE_BLOCK, CreateBlockCommandHandler.prototype));
        this.ResourceManager.AddResource(new CommandHandlerFactory(Commands.DELETE_BLOCK, DeleteBlockCommandHandler.prototype));
        this.ResourceManager.AddResource(new CommandHandlerFactory(Commands.MOVE_BLOCK, MoveBlockCommandHandler.prototype));
        this.ResourceManager.AddResource(new CommandHandlerFactory(Commands.SAVE, SaveCommandHandler.prototype));
        this.ResourceManager.AddResource(new CommandHandlerFactory(Commands.SAVEAS, SaveAsCommandHandler.prototype));
        this.ResourceManager.AddResource(new CommandHandlerFactory(Commands.LOAD, LoadCommandHandler.prototype));
        this.ResourceManager.AddResource(new CommandHandlerFactory(Commands.UNDO, UndoCommandHandler.prototype));
        this.ResourceManager.AddResource(new CommandHandlerFactory(Commands.REDO, RedoCommandHandler.prototype));

        // CREATE INPUT MANAGERS //
        this.TypingManager = new TypingManager();
        this.DragFileInputManager = new DragFileInputManager();
        this.KeyboardInput = new KeyboardInput();
        this.CommandsInputManager = new CommandsInputManager(this.CommandManager);
        this.PointerInputManager = new PointerInputManager();
        this.FocusManager = new FocusManager();
        this.FocusManager.FocusChanged.on((s: any, e: FocusManagerEventArgs) => {
            if (!e.HasFocus){
                this.CommandsInputManager.ClearKeysDown();
            }
        }, this);

        this.ParticlesPool = new PooledFactoryResource<Particle>(10, 100, Particle.prototype);

        // LOAD PALETTE //
        this.Color = new ColorThemes;
        this.Color.Init(this.Canvas);
        this.Color.LoadTheme(0, true);

        // SOUNDCLOUD INIT //
        // todo: create server-side session
        if (typeof(SC) !== "undefined"){
            SC.initialize({
                client_id: this.Config.SoundCloudClientId
            });
        }

        // CREATE SPLASH SCREEN //
        this.Splash = new Splash();
        this.Splash.Init(this.Canvas);

        this.AnimationsLayer = new AnimationsLayer();
        this.AnimationsLayer.Init(this.Canvas);
    }

    // FONT LOAD CALLBACK //
    FontsLoaded(font, fvd) {
        this._FontsLoaded += 1;
        // All fonts are present - load scene
        if (this._FontsLoaded === 3) {
            this.LoadReady();
        }
    }

    // FONT FAILURE TIMEOUT //
    FontsNotLoaded() {
        if (this._FontsLoaded !== 3) {
            console.log("FONTS ARE MISSING");
            // proceed anyway for now
            this.LoadReady();
        }
    }

    // PROCEED WHEN ALL SOCKETS LOADED //
    LoadReady(): void {
        if (this._FontsLoaded === 3 && this.Color.Loaded) {
            this.LoadComposition();
            this.Scene = 1;
            this.Splash.StartTween();
        }
    }

    // IF LOADING A SHARE URL, GET THE DATA //
    LoadComposition() {
        this.CompositionId = Utils.Urls.GetQuerystringParameter('c');
        this.CompositionName = Utils.Urls.GetQuerystringParameter('t');
        if(this.CompositionId) {
            this.CommandManager.ExecuteCommand(Commands.LOAD, this.CompositionId).then((data) => {
                this.PopulateSketch(data);
            }).catch((error: string) => {
                // fail silently
                this.CompositionId = null;
                this.Splash.LoadOffset = 1;
                console.error(error);
            });
        } else {
            this.Splash.LoadOffset = 1; // TODO should delete Splash once definitely done with it
        }
        this.CreateMainScene();
    }

    // CREATE MainScene & BEGIN DRAWING/ANIMATING //
    CreateMainScene() {
        // create MainScene
        this.MainScene = new MainScene();
        this.MainScene.Init(this.Canvas);

        this.Blocks = [];
        this.AddBlocksToMainScene();

        // set up animation loop
        this._ClockTimer.RegisterTimer(this);

        this.Resize();
    }

    AddBlocksToMainScene(): void {
        var d = new DisplayObjectCollection();
        d.AddRange(this.Blocks);
        var blocks = new DisplayObject();
        blocks.DisplayList = new DisplayList(d);
        this.MainScene.DisplayList.Insert(0, blocks);
    }

    // IF LOADING FROM SHARE URL, SET UP ALL BLOCKS //
    PopulateSketch(data) {
        // get deserialized blocks tree, then "flatten" so that all blocks are in an array
        this.Deserialize(data);

        // set initial zoom level/position
        if (this._SaveFile.ColorThemeNo) {
            this.Color.LoadTheme(this._SaveFile.ColorThemeNo, false);
        }

        this.ZoomLevel = this._SaveFile.ZoomLevel;
        this.DragOffset = new Point(this._SaveFile.DragOffset.x, this._SaveFile.DragOffset.y);

        if (this.MainScene.MainSceneDragger) {
            this.MainScene.MainSceneDragger.Destination = new Point(this._SaveFile.DragOffset.x, this._SaveFile.DragOffset.y);
        }

        this.MainScene.ZoomButtons.UpdateSlot(this.ZoomLevel);
        this.Metrics.UpdateGridScale();

        this.IsLoadedFromSave = true;
        console.log(`Loaded "${this.CompositionName}"`);

        // initialise blocks (give them a ctx to draw to)
        this.Blocks.forEach((b: IBlock) => {
            b.Init(this.MainScene);
        });

        this.AddBlocksToMainScene();

        // bring down volume and validate blocks //
        this.Audio.Master.volume.value = -100;

        // Connect the effects chain
        this.Audio.ConnectionManager.Update();

        if (this.Scene < 2) {
            this.LoadCued = true;
        } else {
            this.MainScene.CompositionLoaded();
        }
    }

    OnTicked (lastTime: number, nowTime: number) {

        if (this.Scene === 1){
            //this.MainScene.IsVisible = false;
            //this.Splash.Play();
        }

        if (this.Scene === 2) {
            //this.Splash.Pause();
            //this.Splash.IsVisible = false;
            //this.MainScene.Play();
        }
    }

    Serialize(): string {
        return Serializer.Serialize();
    }

    Deserialize(json: string): any {
        this._SaveFile = Serializer.Deserialize(json);
        this.Blocks = this._SaveFile.Composition.en().traverseUnique(block => (<IBlock>block).Connections).toArray();
        this.Blocks.sort((a: IBlock, b: IBlock) => {
            return a.ZIndex - b.ZIndex;
        });
    }

    Message(message?: string, options?: any) {
        if (this.MainScene) {
            this.MainScene.MessagePanel.NewMessage(message, options);
        }
    }

    CreateSubCanvas(i) {
        this.SubCanvas[i] = document.createElement("canvas");
        document.body.appendChild(this.SubCanvas[i]);
    }

    TrackEvent(category: string, action: string, label: string, value?: number): void{
        if (isNaN(value)){
            window.trackEvent(category, action, label);
        } else {
            window.trackEvent(category, action, label, value);
        }
    }

    /**
     * @param {number} slot - 1-5 (5 slots per scope)
     * @param {string} name - the name for the custom variable
     * @param {number} value - the value of the custom variable
     * @param {string} scope - visitor, session, page
     */
    TrackVariable(slot: number, name: string, value: string, scope: GA.Scope): void{
        window.trackVariable(slot, name, value, scope);
    }

    Resize(): void {
        this.Metrics.Metrics();
        if (this.MainScene.OptionsPanel) {
            this.MainScene.SketchResize();
        }
    }
}