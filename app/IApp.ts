import IBlock = require("./Blocks/IBlock");
import ISource = require("./Blocks/ISource");
import IEffect = require("./Blocks/ISource");
import OperationManager = require("./Core/Operations/OperationManager");
import ResourceManager = require("./Core/Resources/ResourceManager");
import CommandManager = require("./Core/Commands/CommandManager");
import AudioMixer = require("./Core/Audio/AudioMixer");
import InputManager = require("./Core/Inputs/InputManager");
import KeyboardInput = require("./Core/Inputs/KeyboardInputManager");
import CommandsInputManager = require("./Core/Inputs/CommandsInputManager");
import PointerInputManager = require("./Core/Inputs/PointerInputManager");
import Oscillator = require("./PooledOscillator");
import PooledFactoryResource = require("./Core/Resources/PooledFactoryResource");
import Serializer = require("./Serializer");
import Particle = require("./Particle"); // todo: should be IParticle
import BlocksSketch = require("./BlocksSketch");

interface IApp {
    OperationManager: OperationManager;
    ResourceManager: ResourceManager;
    CommandManager: CommandManager;
    CompositionId: string;
    AudioMixer: AudioMixer;
    InputManager: InputManager;
    KeyboardInput: KeyboardInput;
    CommandsInputManager: CommandsInputManager;
    PointerInputManager: PointerInputManager;
    ParticlesPool: PooledFactoryResource<Particle>;
    OscillatorsPool: PooledFactoryResource<Oscillator>;
    Particles: Particle[];
    Palette: string[];
    Blocks: IBlock[];
    Sources: IBlock[];
    Effects: IBlock[];
    BlocksSketch: BlocksSketch;

    Setup(): void;
}

export = IApp;