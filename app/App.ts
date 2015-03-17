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
import Source = require("./Blocks/Source");
import Effect = require("./Blocks/Effect");
import IApp = require("./IApp");
import ObservableCollection = Fayde.Collections.ObservableCollection;
import Utils = Fayde.Utils;
import SketchSession = Fayde.Drawing.SketchSession;

declare var PixelPalette;

class App implements IApp{

    private _Canvas: HTMLCanvasElement;
    private _ClockTimer: Fayde.ClockTimer = new Fayde.ClockTimer();
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
    public OscillatorsPool: PooledFactoryResource<Oscillator>;
    public Blocks: IBlock[] = [];
    public Particles: Particle[] = [];
    public Palette: string[] = [];
    public BlocksSketch: BlocksSketch;

    get Sources(): IBlock[] {
        return this.Blocks.en().where(b => b instanceof Source).toArray();
    }

    get Effects(): IBlock[] {
        return this.Blocks.en().where(b => b instanceof Effect).toArray();
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

        // SOUNDCLOUD //
        if (typeof(SC) !== "undefined"){
            SC.initialize({
                client_id: '7258ff07f16ddd167b55b8f9b9a3ed33'
            });
        }
    }

    LoadComposition() {
        var id = Utils.Url.GetQuerystringParameter('c');

        if(id) {
            this.CommandManager.ExecuteCommand(Commands[Commands.LOAD], id).then((data) => {
                // get deserialized blocks tree, then "flatten" so that all blocks are in an array
                var blocks = this.Deserialize(data);
                this.Blocks = blocks.en().traverseUnique(block => (<IEffect>block).Sources || (<ISource>block).Effects).toArray();

                this.CreateUI();
                this.RefreshBlocks();
            });
        } else {
            this.CreateUI();
            this.RefreshBlocks();
        }
    }

    CreateUI() {
        // create BlocksSketch
        this.BlocksSketch = new BlocksSketch();

        // initialise blocks (give them a ctx to draw to)
        this.Blocks.forEach((b: IBlock) => {
            b.Init(this.BlocksSketch);
        });

        // add blocks to BlocksSketch DisplayList
        var d = new DisplayObjectCollection();
        d.AddRange(this.Blocks);
        this.BlocksSketch.DisplayList = new DisplayList(d);

        // set up animation loop
        this._ClockTimer.RegisterTimer(this);

        this.Resize();
    }

    RefreshBlocks() {
        // refresh all Sources (reconnects Effects).
        this.Sources.forEach((b: ISource) => {
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