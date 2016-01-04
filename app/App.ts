/// <reference path="./lib/exjs/dist/ex.d.ts"/>
import Canvas = etch.drawing.Canvas;
import DisplayObject = etch.drawing.DisplayObject;
import DisplayObjectCollection = etch.drawing.DisplayObjectCollection;
import IDisplayObject = etch.drawing.IDisplayObject;
import Point = minerva.Point;
import {AnimationsLayer} from "./UI/AnimationsLayer";
import {Audio} from './Core/Audio/Audio';
import {BlockSprites} from "./Blocks/BlockSprites";
import {CommandHandlerFactory} from './Core/Resources/CommandHandlerFactory';
import {CommandManager} from './Core/Commands/CommandManager';
import {CommandsInputManager} from './Core/Inputs/CommandsInputManager';
import {Commands} from './Commands';
import {CompositionLoadedEventArgs} from "./CompositionLoadedEventArgs";
import {CreateBlockCommandHandler} from './CommandHandlers/CreateBlockCommandHandler';
import {DeleteBlockCommandHandler} from './CommandHandlers/DeleteBlockCommandHandler';
import {DragFileInputManager} from './Core/Inputs/DragFileInputManager';
import {Effect} from './Blocks/Effect';
import {FocusManagerEventArgs} from './Core/Inputs/FocusManagerEventArgs';
import {FocusManager} from './Core/Inputs/FocusManager';
import {GA} from './GA';
import {IApp} from './IApp';
import {IBlock} from './Blocks/IBlock';
import {IConfig} from './IConfig';
import {IEffect} from './Blocks/IEffect';
import {IncrementNumberCommandHandler} from './CommandHandlers/IncrementNumberCommandHandler';
import {InputManager} from './Core/Inputs/InputManager';
import {IPowerEffect} from './Blocks/Power/IPowerEffect';
import {IPowerSource} from "./Blocks/Power/IPowerSource";
import {ISource} from './Blocks/ISource';
import {LoadCommandHandler} from './CommandHandlers/LoadCommandHandler';
import {MainScene} from './MainScene';
import {Metrics} from './AppMetrics';
import {MoveBlockCommandHandler} from './CommandHandlers/MoveBlockCommandHandler';
import {OperationManager} from './Core/Operations/OperationManager';
import {Particle} from './Particle';
import {PianoKeyboardManager} from "./Core/Inputs/PianoKeyboardManager";
import {PointerInputManager} from './Core/Inputs/PointerInputManager';
import {PooledFactoryResource} from './Core/Resources/PooledFactoryResource';
import {PowerEffect} from './Blocks/Power/PowerEffect';
import {PowerSource} from './Blocks/Power/PowerSource';
import {RedoCommandHandler} from './CommandHandlers/RedoCommandHandler';
import {ResourceManager} from './Core/Resources/ResourceManager';
import {SaveAsCommandHandler} from './CommandHandlers/SaveAsCommandHandler';
import {SaveCommandHandler} from './CommandHandlers/SaveCommandHandler';
import {SaveFile} from './SaveFile';
import {Serializer} from './Serializer';
import {Source} from './Blocks/Source';
import {Stage} from "./Stage";
import {ThemeChangeEventArgs} from "./UI/ThemeChangeEventArgs";
import {ThemeManager} from './UI/ThemeManager';
import {TypingManager} from './Core/Inputs/TypingManager';
import {UndoCommandHandler} from './CommandHandlers/UndoCommandHandler';

export default class App implements IApp{

    CompositionLoaded = new nullstone.Event<CompositionLoadedEventArgs>();
    private _FontsLoaded: number;
    private _SaveFile: SaveFile;
    private _SessionId: string;
    public Audio: Audio = new Audio();
    public Blocks: IBlock[] = [];
    public BlockSprites: BlockSprites;
    public Canvas: Canvas;
    public CommandManager: CommandManager;
    public CommandsInputManager: CommandsInputManager;
    public CompositionId: string;
    public CompositionName: string;
    public Config: IConfig;
    public DragFileInputManager: DragFileInputManager;
    public DragOffset: Point = new Point(0, 0);
    public FocusManager: FocusManager;
    public GridSize: number;
    public Height: number;
    public InputManager: InputManager;
    public IsLoadedFromSave: boolean = false;
    public LoadCued: boolean;
    public Metrics: Metrics;
    public OperationManager: OperationManager;
    public Palette: string[] = [];
    public Particles: Particle[] = [];
    public ParticlesPool: PooledFactoryResource<Particle>;
    public PianoKeyboardManager: PianoKeyboardManager;
    public PointerInputManager: PointerInputManager;
    public ResourceManager: ResourceManager;
    public ScaledDragOffset: Point;
    public ScaledGridSize: number;
    public ScaledUnit: number;
    public Scene: number;
    public Stage: Stage;
    public SubCanvas: HTMLCanvasElement[];
    public ThemeManager: ThemeManager;
    public TypingManager: TypingManager;
    public Unit: number;
    public Width: number;
    public ZoomLevel: number;

    get AnimationsLayer(): AnimationsLayer{
        return this.MainScene.AnimationsLayer;
    }

    get MainScene(): MainScene {
        return this.Stage.MainScene;
    }

    get Sources(): ISource[] {
        return <ISource[]>this.Blocks.en().where(b => b instanceof Source).toArray();
    }

    get Effects(): IEffect[] {
        return <IEffect[]>this.Blocks.en().where(b => b instanceof Effect).toArray();
    }

    get PowerEffects(): IPowerEffect[] {
        return <IPowerEffect[]>this.Blocks.en().where(b => b instanceof PowerEffect).toArray();
    }

    get PowerSources(): IPowerSource[] {
        return <IPowerSource[]>this.Blocks.en().where(b => b instanceof PowerSource).toArray();
    }

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

    get SessionId(): string {
        if (this._SessionId) return this._SessionId;
        var sessionId: Utils.StorageItem = Utils.Storage.get(this.CompositionId, Utils.StorageType.local);
        if (sessionId) return sessionId.value;
    }

    set SessionId(value: string) {
        this._SessionId = value;
        // expires in 10 years.
        Utils.Storage.set(this.CompositionId, this._SessionId, 315360000, Utils.StorageType.local);
    }

    constructor(config: string) {
        this.Config = <IConfig>JSON.parse(config);
    }

    public Setup(){

        this.Canvas = new Canvas();

        this.Scene = 0;

        // METRICS //
        this.Metrics = new Metrics();

        this.BlockSprites = new BlockSprites();

        this.SubCanvas = [];
        this.CreateSubCanvas(0); // optionsPanel

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

        // INITIALISE AUDIO //
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
        this.PianoKeyboardManager = new PianoKeyboardManager();
        this.CommandsInputManager = new CommandsInputManager(this.CommandManager);
        this.PointerInputManager = new PointerInputManager();
        this.FocusManager = new FocusManager();
        this.FocusManager.FocusChanged.on((s: any, e: FocusManagerEventArgs) => {
            if (!e.HasFocus){
                this.CommandsInputManager.ClearKeysDown();
            }
        }, this);

        // POOLED OBJECTS //
        this.ParticlesPool = new PooledFactoryResource<Particle>(10, 100, Particle.prototype);

        // INITIALISE SOUNDCLOUD //
        // todo: create server-side session
        if (typeof(SC) !== "undefined"){
            SC.initialize({
                client_id: this.Config.SoundCloudClientId
            });
        }

        // INITIALISE THEME //
        this.ThemeManager = new ThemeManager();
        this.ThemeManager.ThemeChanged.on((s: any, e: ThemeChangeEventArgs) => {
            this.Palette = e.Palette;
            this.LoadReady();
        }, this);

        this.ThemeManager.LoadTheme(0, true);
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
        if (this._FontsLoaded === 3 && this.ThemeManager.Loaded) {
            this.LoadComposition();
            //this.Scene = 1;
            //this.Splash.StartTween();
        }
    }

    // IF LOADING A SHARE URL, GET THE DATA //
    LoadComposition() {
        this.CompositionId = Utils.Urls.GetQuerystringParameter('c');
        this.CompositionName = Utils.Urls.GetQuerystringParameter('t');
        if(this.CompositionId) {
            this.CommandManager.ExecuteCommand(Commands.LOAD, this.CompositionId).then((data) => {
                this.Populate(data);
            }).catch((error: string) => {
                // fail silently
                this.CompositionId = null;
                //this.Splash.LoadOffset = 1;
                console.error(error);
            });
        } else {
            //this.Splash.LoadOffset = 1; // TODO should delete Splash once definitely done with it
        }
        this.CreateStage();
    }

    // CREATE Stage & BEGIN DRAWING/ANIMATING //
    CreateStage() {

        this.Stage = new Stage();
        this.Stage.Init(this.Canvas);
        this.Stage.Drawn.on((s: any, time: number) => {
            window.TWEEN.update(time);
        }, this);

        this.Resize();
    }

    // IF LOADING FROM SHARE URL, SET UP ALL BLOCKS //
    Populate(data) {
        this.IsLoadedFromSave = true;
        console.log(`Loaded "${this.CompositionName}"`);

        // get deserialized blocks tree, then "flatten" so that all blocks are in an array
        this.Deserialize(data);

        // set initial zoom level/position
        if (this._SaveFile.ColorThemeNo) {
            this.ThemeManager.LoadTheme(this._SaveFile.ColorThemeNo, false);
        }

        this.ZoomLevel = this._SaveFile.ZoomLevel;

        // bring down volume and validate blocks //
        this.Audio.Master.volume.value = -100;

        // Connect the effects chain
        this.Audio.ConnectionManager.Update();

        //if (this.Scene < 2) {
        //    this.LoadCued = true;
        //} else {
            this.CompositionLoaded.raise(this, new CompositionLoadedEventArgs(this._SaveFile));
        //}
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
        this.Stage.Resize();
    }
}