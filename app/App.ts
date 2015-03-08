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
import ObservableCollection = Fayde.Collections.ObservableCollection;

class App{

    private static _instance: App = null;

    _Canvas: HTMLCanvasElement;
    _ClockTimer: Fayde.ClockTimer = new Fayde.ClockTimer();
    OperationManager: OperationManager;
    ResourceManager: ResourceManager;
    CommandManager: CommandManager;
    CompositionId: string;
    Fonts: Fonts;
    Blocks: DisplayObjectCollection<IBlock>;
    Sources: ObservableCollection<ISource>;
    Effects: ObservableCollection<IEffect>;
    AudioMixer: AudioMixer;
    InputManager: InputManager;
    KeyboardInput: KeyboardInput;
    CommandsInputManager: CommandsInputManager;
    PointerInputManager: PointerInputManager;
    ParticlesPool: PooledFactoryResource<Particle>;
    Particles: Particle[];
    Palette: string[];
    OscillatorsPool: PooledFactoryResource<Oscillator>;
    AudioSettings: ToneSettings;
    BlocksSketch: BlocksSketch;

    constructor() {
        //if(App._instance){
        //    throw new Error("Error: Instantiation failed: Use getInstance() instead of new.");
        //}
        //App._instance = this;
    }

    //public static GetInstance(): App
    //{
    //    if(App._instance === null) {
    //        App._instance = new App();
    //    }
    //    return App._instance;
    //}

    Setup(){
        // find canvas
        this._Canvas = document.getElementsByTagName("canvas")[0];
        if (!this._Canvas)
            document.body.appendChild(this._Canvas = document.createElement("canvas"));

        this.OperationManager = new OperationManager();
        this.ResourceManager = new ResourceManager();
        this.CommandManager = new CommandManager(this.ResourceManager);
        //this.Fonts = new Fonts();

        this.Blocks = new DisplayObjectCollection<IBlock>();
        this.Sources = new ObservableCollection<ISource>();
        this.Effects = new ObservableCollection<IEffect>();

        this.Blocks.CollectionChanged.on(() => {
            this.Sources.Clear();

            for (var i = 0; i < this.Blocks.Count; i++) {
                var block = this.Blocks.GetValueAt(i);

                // todo: use reflection when available
                if ((<ISource>block).Effects){
                    this.Sources.Add((<ISource>block));
                }
            }

            this.Effects.Clear();

            for (var i = 0; i < this.Blocks.Count; i++) {
                var block = this.Blocks.GetValueAt(i);

                // todo: use reflection when available
                if (!(<ISource>block).Effects){
                    this.Effects.Add((<IEffect>block));
                }
            }
        }, this);

        this.AudioMixer = new AudioMixer();

        this.InputManager = new InputManager();
        this.KeyboardInput = new KeyboardInput();
        this.CommandsInputManager = new CommandsInputManager(this.CommandManager);
        this.PointerInputManager = new PointerInputManager();

        this.Particles = [];
        this.Palette = [];

        //window.debug = true;

        // create BlocksSketch
        this.BlocksSketch = new BlocksSketch(App.GetInstance());

        // set up animation loop
        this._ClockTimer.RegisterTimer(this);
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

    Serialize(): string {
        return Serializer.Serialize(this.Blocks.ToArray());
    }

    Deserialize(json: string): IBlock[] {
        return Serializer.Deserialize(json);
    }
}

export = App;