/// <reference path="./lib/exjs/dist/ex.d.ts"/>
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
import SaveCommandHandler = require("./CommandHandlers/SaveCommandHandler");
import LoadCommandHandler = require("./CommandHandlers/LoadCommandHandler");
import UndoCommandHandler = require("./CommandHandlers/UndoCommandHandler");
import RedoCommandHandler = require("./CommandHandlers/RedoCommandHandler");
import DisplayList = require("./DisplayList");
import ObservableCollection = Fayde.Collections.ObservableCollection;
import Utils = Fayde.Utils;
import SketchSession = Fayde.Drawing.SketchSession;

declare var PixelPalette;

class App{

    private _Canvas: HTMLCanvasElement;
    private _ClockTimer: Fayde.ClockTimer = new Fayde.ClockTimer();
    public Blocks: IBlock[] = [];
    public OperationManager: OperationManager;
    public ResourceManager: ResourceManager;
    public CommandManager: CommandManager;
    public CompositionId: string;
    public AudioMixer: AudioMixer = new AudioMixer();
    public InputManager: InputManager;
    public KeyboardInput: KeyboardInput;
    public CommandsInputManager: CommandsInputManager;
    public PointerInputManager: PointerInputManager;
    public ParticlesPool: PooledFactoryResource<Particle>;
    public Particles: Particle[] = [];
    public Palette: string[] = [];
    public OscillatorsPool: PooledFactoryResource<Oscillator>;
    public BlocksSketch: BlocksSketch;

    // get blocks as a flat list (instead of nested)
    // todo: is there a way to cache this as it's a fairly expensive operation
    private GetBlocksAsList(): IBlock[] {
        return this.Blocks.en().traverseUnique(block => (<IEffect>block).Sources || (<ISource>block).Effects).toArray();
    }

    get Sources(): IBlock[] {
        return this.GetBlocksAsList().en().where(b => (<ISource>b).Effects !== undefined).toArray();
    }

    get Effects(): IBlock[] {
        return this.GetBlocksAsList().en().where(b => (<IEffect>b).Sources !== undefined).toArray();
    }

    constructor() {

    }

    public Setup(){
        // find canvas
        this._Canvas = document.getElementsByTagName("canvas")[0];

        if (!this._Canvas) {
            document.body.appendChild(this._Canvas = document.createElement("canvas"));
        }

        // resize
        window.onresize = () => {
            this.Resize();
        }

        this.OperationManager = new OperationManager();
        this.ResourceManager = new ResourceManager();
        this.CommandManager = new CommandManager(this.ResourceManager);
        //this.Fonts = new Fonts();

        // register command handlers
        this.ResourceManager.AddResource(new CommandHandlerFactory(Commands[Commands.CREATE_BLOCK], CreateBlockCommandHandler.prototype));
        this.ResourceManager.AddResource(new CommandHandlerFactory(Commands[Commands.DELETE_BLOCK], DeleteBlockCommandHandler.prototype));
        this.ResourceManager.AddResource(new CommandHandlerFactory(Commands[Commands.SAVE], SaveCommandHandler.prototype));
        this.ResourceManager.AddResource(new CommandHandlerFactory(Commands[Commands.LOAD], LoadCommandHandler.prototype));
        this.ResourceManager.AddResource(new CommandHandlerFactory(Commands[Commands.UNDO], UndoCommandHandler.prototype));
        this.ResourceManager.AddResource(new CommandHandlerFactory(Commands[Commands.REDO], RedoCommandHandler.prototype));

        // create input managers
        this.InputManager = new InputManager();
        this.KeyboardInput = new KeyboardInput();
        this.CommandsInputManager = new CommandsInputManager(this.CommandManager);
        this.PointerInputManager = new PointerInputManager();

        this.ParticlesPool = new PooledFactoryResource<Particle>(10, 100, Particle.prototype);
        this.OscillatorsPool = new PooledFactoryResource<Oscillator>(10, 100, Oscillator.prototype);

        var pixelPalette = new PixelPalette("img/palette6.gif"); // todo: move to config.json

        pixelPalette.Load((palette: string[]) => {
            this.Palette = palette;

            this.LoadComposition();
        });
    }

    LoadComposition() {
        var id = Utils.Url.GetQuerystringParameter('c');

        if(id) {
            this.CommandManager.ExecuteCommand(Commands[Commands.LOAD], id).then((data) => {
                this.Blocks = this.Deserialize(data);
                this.CreateUI();
            });
        } else {
            this.CreateUI();
        }
    }

    CreateUI() {
        // create BlocksSketch
        this.BlocksSketch = new BlocksSketch();

        var b = this.GetBlocksAsList();

        b.forEach((b: IBlock) => {
            b.Init(this.BlocksSketch);
        });

        var d = new DisplayObjectCollection();
        d.AddRange(b);
        this.BlocksSketch.DisplayList = new DisplayList(d);

        // set up animation loop
        this._ClockTimer.RegisterTimer(this);

        this.Resize();
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
        return Serializer.Serialize(this.Blocks);
    }

    Deserialize(json: string): IBlock[] {
        return Serializer.Deserialize(json);
    }

    Resize(): void {
        var $win = $(window);
        $(this._Canvas).prop("width", $win.width());
        $(this._Canvas).prop("height", $win.height());
    }
}

export = App;