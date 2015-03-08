//import OperationManager = require("../Core/Operations/OperationManager");
//import ResourceManager = require("../Core/Resources/ResourceManager");
//import CommandManager = require("../Core/Commands/CommandManager");
//import AudioMixer = require("../Core/Audio/AudioMixer");
//import InputManager = require("../Core/Inputs/InputManager");
//import KeyboardInput = require("../Core/Inputs/KeyboardInputManager");
//import CommandsInputManager = require("../Core/Inputs/CommandsInputManager");
//import PointerInputManager = require("../Core/Inputs/PointerInputManager");
//import IEffect = require("../Blocks/IEffect");
//import ISource = require("../Blocks/ISource");
//import IBlock = require("../Blocks/IBlock");
//import DisplayObjectCollection = require("../DisplayObjectCollection");
//import Particle = require("../Particle");
//import Fonts = require("../UI/Fonts");
//import Oscillator = require("../PooledOscillator");
//import PooledFactoryResource = require("../Core/Resources/PooledFactoryResource");
//import Serializer = require("../Serializer");
//import Grid = require("../Grid");
//import BlocksSketch = require("../BlocksSketch");

//declare var App;

import App = require("../App");

//declare class App{
//    GetInstance: () => App;
//    OperationManager: OperationManager;
//    ResourceManager: ResourceManager;
//    CommandManager: CommandManager;
//    CompositionId: string;
//    Fonts: Fonts;
//    Blocks: DisplayObjectCollection<IBlock>;
//    Sources: Fayde.Collections.ObservableCollection<ISource>;
//    Effects: Fayde.Collections.ObservableCollection<IEffect>;
//    AudioMixer: AudioMixer;
//    InputManager: InputManager;
//    KeyboardInput: KeyboardInput;
//    CommandsInputManager: CommandsInputManager;
//    PointerInputManager: PointerInputManager;
//    ParticlesPool: PooledFactoryResource<Particle>;
//    Particles: Particle[];
//    Palette: string[];
//    OscillatorsPool: PooledFactoryResource<Oscillator>;
//    AudioSettings: ToneSettings;
//    BlocksSketch: BlocksSketch;
//}

interface Window{
    //App: App;
    debug: boolean;
}

interface CanvasRenderingContext2D {
    divisor: number;
}