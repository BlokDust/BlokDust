import OperationManager = require("./Core/Operations/OperationManager");
import ResourceManager = require("./Core/Resources/ResourceManager");
import CommandManager = require("./Core/Commands/CommandManager");
import AudioMixer = require("./Core/Audio/AudioMixer");
import InputManager = require("./Core/Inputs/InputManager");
import KeyboardInput = require("./Core/Inputs/KeyboardInputManager");
import IEffect = require("./Blocks/IEffect");
import IModifiable = require("./Blocks/ISource");
import IBlock = require("./Blocks/IBlock");
import DisplayObjectCollection = require("./DisplayObjectCollection");
import Particle = require("./Particle");
import Fonts = require("./UI/Fonts");
import Oscillator = require("./PooledOscillator");
import PooledFactoryResource = require("./Core/Resources/PooledFactoryResource");
import ObservableCollection = Fayde.Collections.ObservableCollection;


class App{

    static OperationManager: OperationManager;
    static ResourceManager: ResourceManager;
    static CommandManager: CommandManager;
    static Fonts: Fonts;
    static Blocks: DisplayObjectCollection<any>;
    static Modifiables: ObservableCollection<IModifiable>;
    static Effects: ObservableCollection<IEffect>;
    static AudioMixer: AudioMixer;
    static InputManager: InputManager;
    static KeyboardInput: KeyboardInput;
    static ParticlesPool: PooledFactoryResource<Particle>;
    static Particles: Particle[];
    static Palette: string[];
    static OscillatorsPool: PooledFactoryResource<Oscillator>;
    static AudioSettings: ToneSettings;


    constructor() {

    }

    static Init(){
        App.OperationManager = new OperationManager();
        App.ResourceManager = new ResourceManager();
        App.CommandManager = new CommandManager(App.ResourceManager);
        //App.Fonts = new Fonts();

        //todo: make these members of BlocksContext
        App.Blocks = new DisplayObjectCollection<IBlock>();
        App.Modifiables = new ObservableCollection<IModifiable>();
        App.Effects = new ObservableCollection<IEffect>();

        App.Blocks.CollectionChanged.on(() => {
            App.Modifiables.Clear();

            for (var i = 0; i < App.Blocks.Count; i++) {
                var block = App.Blocks.GetValueAt(i);

                // todo: use reflection when available
                if ((<IModifiable>block.Effects)){
                    App.Modifiables.Add(block);
                }
            }

            App.Effects.Clear();

            for (var i = 0; i < App.Blocks.Count; i++) {
                var block = App.Blocks.GetValueAt(i);

                // todo: use reflection when available
                if (!(<IModifiable>block.Effects)){
                    App.Effects.Add(block);
                }
            }
        }, this);

        App.AudioMixer = new AudioMixer();

        App.InputManager = new InputManager();
        App.KeyboardInput = new KeyboardInput();

        App.Particles = [];
        App.Palette = [];

    }
}

export = App;