/// <reference path="./lib/exjs/dist/ex.d.ts"/>
import Config = require("./Config");
import Metrics = require("./AppMetrics");
import OperationManager = require("./Core/Operations/OperationManager");
import ResourceManager = require("./Core/Resources/ResourceManager");
import CommandManager = require("./Core/Commands/CommandManager");
import AudioMixer = require("./Core/Audio/AudioMixer");
import InputManager = require("./Core/Inputs/InputManager");
import KeyboardInput = require("./Core/Inputs/KeyboardInputManager");
import CommandsInputManager = require("./Core/Inputs/CommandsInputManager");
import PointerInputManager = require("./Core/Inputs/PointerInputManager");
import IEffect = require("./Blocks/IEffect");
import ISource = require("./Blocks/ISource");
import IBlock = require("./Blocks/IBlock");
import DisplayObjectCollection = require("./DisplayObjectCollection");
import Particle = require("./Particle");
import Fonts = require("./UI/Fonts");
import Oscillator = require("./PooledOscillator");
import PooledFactoryResource = require("./Core/Resources/PooledFactoryResource");
import Serializer = require("./Serializer");
import Grid = require("./Grid");
import BlocksSketch = require("./BlocksSketch");
import Commands = require("./Commands");
import CommandHandlerFactory = require("./Core/Resources/CommandHandlerFactory");
import CreateBlockCommandHandler = require("./CommandHandlers/CreateBlockCommandHandler");
import DeleteBlockCommandHandler = require("./CommandHandlers/DeleteBlockCommandHandler");
import MoveBlockCommandHandler = require("./CommandHandlers/MoveBlockCommandHandler");
import IncrementNumberCommandHandler = require("./CommandHandlers/IncrementNumberCommandHandler");
import SaveCommandHandler = require("./CommandHandlers/SaveCommandHandler");
import SaveAsCommandHandler = require("./CommandHandlers/SaveAsCommandHandler");
import LoadCommandHandler = require("./CommandHandlers/LoadCommandHandler");
import UndoCommandHandler = require("./CommandHandlers/UndoCommandHandler");
import RedoCommandHandler = require("./CommandHandlers/RedoCommandHandler");
import DisplayList = require("./DisplayList");
import Source = require("./Blocks/Source");
import Effect = require("./Blocks/Effect");
import IApp = require("./IApp");
import SaveFile = require("./SaveFile");
import ObservableCollection = Fayde.Collections.ObservableCollection;
import SketchSession = Fayde.Drawing.SketchSession;

declare var PixelPalette;

class App implements IApp{

    private _Canvas: HTMLCanvasElement;
    private _ClockTimer: Fayde.ClockTimer = new Fayde.ClockTimer();
    private _SaveFile: SaveFile;
    public Unit: number;
    public GridSize: number;
    public Width: number;
    public Height: number;
    public Metrics: Metrics;
    public AudioMixer: AudioMixer = new AudioMixer();
    public Blocks: IBlock[] = [];
    public BlocksSketch: BlocksSketch;
    public CommandManager: CommandManager;
    public CommandsInputManager: CommandsInputManager;
    public CompositionId: string;
    public Config: Config;
    public InputManager: InputManager;
    public KeyboardInput: KeyboardInput;
    public OperationManager: OperationManager;
    public OscillatorsPool: PooledFactoryResource<Oscillator>;
    public Palette: string[] = [];
    public Particles: Particle[] = [];
    public ParticlesPool: PooledFactoryResource<Particle>;
    public PointerInputManager: PointerInputManager;
    public ResourceManager: ResourceManager;
    private _SessionId: string;
    private _FontsLoaded: string[];

    // todo: move to BlockStore
    get Sources(): IBlock[] {
        return this.Blocks.en().where(b => b instanceof Source).toArray();
    }

    // todo: move to BlockStore
    get Effects(): IBlock[] {
        return this.Blocks.en().where(b => b instanceof Effect).toArray();
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

        this.CreateCanvas();

        // METRICS //
        this.Metrics = new Metrics();
        window.onresize = () => {
            this.Resize();
        }


        // LOAD FONTS AND SETUP CALLBACK //
        this._FontsLoaded = [];
        var me = this;
        console.log("FONTS LOADING...");
        WebFont.load({
            custom: { families: ['Merriweather Sans:i3','Dosis:n2,n4']},
            fontactive: function (font,fvd) { me.FontsLoaded(font,fvd); },
            timeout: 3000 // 3 seconds
        });
        setTimeout(function () {
            me.FontsNotLoaded();
        },3020);


        // CREATE OPERATIONS MANAGERS //
        this.OperationManager = new OperationManager();
        this.OperationManager.MaxOperations = this.Config.MaxOperations;
        this.ResourceManager = new ResourceManager();
        this.CommandManager = new CommandManager(this.ResourceManager);


        // REGISTER COMMAND HANDLERS //
        this.ResourceManager.AddResource(new CommandHandlerFactory(Commands[Commands.CREATE_BLOCK], CreateBlockCommandHandler.prototype));
        this.ResourceManager.AddResource(new CommandHandlerFactory(Commands[Commands.DELETE_BLOCK], DeleteBlockCommandHandler.prototype));
        this.ResourceManager.AddResource(new CommandHandlerFactory(Commands[Commands.MOVE_BLOCK], MoveBlockCommandHandler.prototype));
        this.ResourceManager.AddResource(new CommandHandlerFactory(Commands[Commands.SAVE], SaveCommandHandler.prototype));
        this.ResourceManager.AddResource(new CommandHandlerFactory(Commands[Commands.SAVEAS], SaveAsCommandHandler.prototype));
        this.ResourceManager.AddResource(new CommandHandlerFactory(Commands[Commands.LOAD], LoadCommandHandler.prototype));
        this.ResourceManager.AddResource(new CommandHandlerFactory(Commands[Commands.UNDO], UndoCommandHandler.prototype));
        this.ResourceManager.AddResource(new CommandHandlerFactory(Commands[Commands.REDO], RedoCommandHandler.prototype));


        // CREATE INPUT MANAGERS //
        this.InputManager = new InputManager();
        this.KeyboardInput = new KeyboardInput();
        this.CommandsInputManager = new CommandsInputManager(this.CommandManager);
        this.PointerInputManager = new PointerInputManager();

        this.ParticlesPool = new PooledFactoryResource<Particle>(10, 100, Particle.prototype);
        this.OscillatorsPool = new PooledFactoryResource<Oscillator>(10, 100, Oscillator.prototype);


        // LOAD PALETTE //
        var pixelPalette = new PixelPalette(this.Config.PixelPaletteImagePath);
        pixelPalette.Load((palette: string[]) => {
            this.Palette = palette;
            //this.LoadComposition();
        });

        // SOUNDCLOUD INIT //
        // todo: create server-side session
        if (typeof(SC) !== "undefined"){
            SC.initialize({
                client_id: this.Config.SoundCloudClientId
            });
        }
    }

    // FONT LOAD CALLBACK //
    FontsLoaded(font,fvd) {
        console.log("FONT LOADED: "+font+" "+fvd);
        this._FontsLoaded.push(""+font+" "+fvd);
        // All fonts are present - load scene
        if (this._FontsLoaded.length==3) {
            this.LoadComposition();
        }
    }

    // FONT FAILURE TIMEOUT //
    FontsNotLoaded() {
        if (this._FontsLoaded.length!==3) {
            console.log("FONTS ARE MISSING");
            // proceed anyway for now
            this.LoadComposition();
        }
    }

    // IF LOADING A SHARE URL, GET THE DATA //
    LoadComposition() {
        this.CompositionId = Utils.Urls.GetQuerystringParameter('c');
        if(this.CompositionId) {
            this.CommandManager.ExecuteCommand(Commands[Commands.LOAD], this.CompositionId).then((data) => {
                this.PopulateSketch(data);
            }).catch((error: string) => {
                // fail silently
            });
        }
        this.CreateBlockSketch();
    }


    // CREATE BLOCKSSKETCH & BEGIN DRAWING/ANIMATING //
    CreateBlockSketch() {
        // create BlocksSketch
        this.BlocksSketch = new BlocksSketch();
        this.Blocks = [];

        // add blocks to BlocksSketch DisplayList
        var d = new DisplayObjectCollection();
        d.AddRange(this.Blocks);
        this.BlocksSketch.DisplayList = new DisplayList(d);

        // set up animation loop
        this._ClockTimer.RegisterTimer(this);

        this.Resize();
    }

    // IF LOADING FROM SHARE URL, SET UP ALL BLOCKS //
    PopulateSketch(data) {
        // get deserialized blocks tree, then "flatten" so that all blocks are in an array
        this.Deserialize(data);

        // set initial zoom level/position
        this.BlocksSketch.ZoomLevel = this._SaveFile.ZoomLevel;
        this.BlocksSketch.ZoomPosition = new Point(this._SaveFile.ZoomPosition.x, this._SaveFile.ZoomPosition.y);


        // initialise blocks (give them a ctx to draw to)
        this.Blocks.forEach((b: IBlock) => {
            b.Init(this.BlocksSketch);
        });


        // add blocks to BlocksSketch DisplayList
        var d = new DisplayObjectCollection();
        d.AddRange(this.Blocks);
        this.BlocksSketch.DisplayList = new DisplayList(d);

        // bring down volume and validate blocks //
        this.AudioMixer.Master.volume.value = -100;
        this.RefreshBlocks();
        this.BlocksSketch.CompositionLoaded();
    }

    // todo: move to BlockStore
    RefreshBlocks() {
        // refresh all Sources (reconnects Effects).
        this.Blocks.forEach((b: ISource) => {
            b.Refresh();
        });
    }

    OnTicked (lastTime: number, nowTime: number) {
        this.BlocksSketch.SketchSession = new SketchSession(this._Canvas, this._Canvas.width, this._Canvas.height, nowTime);
        this.Update();
        this.Draw();
    }

    Update() : void {
        this.BlocksSketch.Update();
    }

    Draw(): void {
        this.BlocksSketch.Draw();
    }

    Serialize(): string {
        return Serializer.Serialize();
    }

    Deserialize(json: string): any {
        this._SaveFile = Serializer.Deserialize(json);
        this.Blocks = this._SaveFile.Composition.en().traverseUnique(block => (<IEffect>block).Sources || (<ISource>block).Effects).toArray();
    }

    //Message(string?: string, seconds?: number, confirmation?: boolean, buttonText?: string, buttonEvent?: any) {
    //    this.BlocksSketch.MessagePanel.NewMessage(string,seconds,confirmation,buttonText,buttonEvent);
    //}

    Message(string?: string, options?: any) {
        this.BlocksSketch.MessagePanel.NewMessage(string, options);
    }

    CreateCanvas() {
        this._Canvas = document.createElement("canvas");
        document.body.appendChild(this._Canvas);
    }

    get Canvas() {
        return this._Canvas;
    }

    Resize(): void {

        this.Metrics.Metrics();
        if (this.BlocksSketch.OptionsPanel) {
            this.BlocksSketch.SketchResize();
        }

    }

    TranslateMousePointToPixelRatioPoint(point: Point){
        point.x *= this.Metrics.PixelRatio;
        point.y *= this.Metrics.PixelRatio;
    }

}

export = App;
