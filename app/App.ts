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
import ObservableCollection = Fayde.Collections.ObservableCollection;

declare var PixelPalette;

class App{

    _Canvas: HTMLCanvasElement;
    _ClockTimer: Fayde.ClockTimer = new Fayde.ClockTimer();
    OperationManager: OperationManager;
    ResourceManager: ResourceManager;
    CommandManager: CommandManager;
    CompositionId: string;
    //Fonts: Fonts;
    Blocks: DisplayObjectCollection<IBlock>;
    AudioMixer: AudioMixer = new AudioMixer();
    InputManager: InputManager;
    KeyboardInput: KeyboardInput;
    CommandsInputManager: CommandsInputManager;
    PointerInputManager: PointerInputManager;
    ParticlesPool: PooledFactoryResource<Particle>;
    Particles: Particle[] = [];
    Palette: string[] = [];
    OscillatorsPool: PooledFactoryResource<Oscillator>;
    //AudioSettings: ToneSettings;
    BlocksSketch: BlocksSketch;

    get Sources(): ObservableCollection<IBlock> {
        var sources = this.Blocks.ToArray().en().traverseUnique(block => (<IEffect>block).Sources || (<ISource>block).Effects)
                                .where(b => (<ISource>b).Effects !== undefined);

        var c = new ObservableCollection<IBlock>();
        c.AddRange(sources.toArray());
        return c;
    }

    get Effects(): ObservableCollection<IBlock> {
        var effects = this.Blocks.ToArray().en().traverseUnique(block => (<IEffect>block).Sources || (<ISource>block).Effects)
            .where(b => (<IEffect>b).Sources !== undefined);

        var c = new ObservableCollection<IBlock>();
        c.AddRange(effects.toArray());
        return c;
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
        });

        this.Blocks = new DisplayObjectCollection<IBlock>();
        //this.Sources = new ObservableCollection<ISource>();
        //this.Effects = new ObservableCollection<IEffect>();

        //this.Blocks.CollectionChanged.on(() => {
        //    this.SortBlocks();
        //}, this);

        //window.debug = true;

        // create BlocksSketch
        this.BlocksSketch = new BlocksSketch();

        // set up animation loop
        this._ClockTimer.RegisterTimer(this);

        this.Resize();
    }

    OnTicked (lastTime: number, nowTime: number) {
        this.BlocksSketch.SketchSession = new Fayde.Drawing.SketchSession(this._Canvas, this._Canvas.width, this._Canvas.height, nowTime);
        this.Update();
        this.Draw();
    }

    Update() : void {
        this.BlocksSketch.Update();
    }

    Draw(): void {
        this.BlocksSketch.Draw();
    }

    // sorts Blocks array into Sources and Effects arrays.
    //SortBlocks(): void {
    //    if (!this.Blocks.Count) return;
    //
    //    this.Sources.Clear();
    //
    //    // todo: use reflection when available
    //
    //    // get all blocks by traversing tree, then sort by type.
    //
    //
    //
    //    this.Effects.AddRange(effects));
    //
    //    this.Sources.AddRange(sources.toArray());
    //
    //
    //
    //}

    Serialize(): string {
        return Serializer.Serialize(this.Blocks.ToArray());
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