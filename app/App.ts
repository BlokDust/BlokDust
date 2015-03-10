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

    }

    public Setup(){
        // find canvas
        this._Canvas = document.getElementsByTagName("canvas")[0];
        if (!this._Canvas)
            document.body.appendChild(this._Canvas = document.createElement("canvas"));

        // resize
        window.onresize = () => {
            this.Resize();
        }

        this.OperationManager = new OperationManager();
        this.ResourceManager = new ResourceManager();
        this.CommandManager = new CommandManager(this.ResourceManager);
        //this.Fonts = new Fonts();

        this.Blocks = new DisplayObjectCollection<IBlock>();
        this.Sources = new ObservableCollection<ISource>();
        this.Effects = new ObservableCollection<IEffect>();

        this.Blocks.CollectionChanged.on(() => {
            this.Sources.Clear();

            // todo: use reflection when available
            var sources = this.Blocks.ToArray();

            var e = (<any>sources).en()
                .select(b => b.Effects).toArray();

            this.Sources.AddRange(e);


            this.Effects.Clear();

            var effects = this.Blocks.ToArray();

            e = (<any>effects).en()
                .select(b => b.Sources).toArray();

            this.Effects.AddRange(e);

            //for (var i = 0; i < this.Blocks.Count; i++) {
            //    var block = this.Blocks.GetValueAt(i);
            //
            //    // todo: use reflection when available
            //    if ((<ISource>block).Effects){
            //        this.Sources.Add((<ISource>block));
            //    }
            //}
            //
            //this.Effects.Clear();
            //
            //for (var i = 0; i < this.Blocks.Count; i++) {
            //    var block = this.Blocks.GetValueAt(i);
            //
            //    // todo: use reflection when available
            //    if (!(<ISource>block).Effects){
            //        this.Effects.Add((<IEffect>block));
            //    }
            //}
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