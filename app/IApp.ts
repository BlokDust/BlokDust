import IBlock = require("./Blocks/IBlock");
import ISource = require("./Blocks/ISource");
import IEffect = require("./Blocks/ISource");
import OperationManager = require("./Core/Operations/OperationManager");
import ResourceManager = require("./Core/Resources/ResourceManager");
import CommandManager = require("./Core/Commands/CommandManager");
import Audio = require("./Core/Audio/Audio");
import InputManager = require("./Core/Inputs/InputManager");
import KeyboardInput = require("./Core/Inputs/KeyboardInputManager");
import CommandsInputManager = require("./Core/Inputs/CommandsInputManager");
import PointerInputManager = require("./Core/Inputs/PointerInputManager");
import PooledFactoryResource = require("./Core/Resources/PooledFactoryResource");
import Serializer = require("./Serializer");
import Particle = require("./Particle"); // todo: should be IParticle
import Stage = require("./Stage");

interface IApp {
    OperationManager: OperationManager;
    ResourceManager: ResourceManager;
    CommandManager: CommandManager;
    CompositionId: string;
    Audio: Audio;
    InputManager: InputManager;
    KeyboardInput: KeyboardInput;
    CommandsInputManager: CommandsInputManager;
    PointerInputManager: PointerInputManager;
    ParticlesPool: PooledFactoryResource<Particle>;
    Particles: Particle[];
    Palette: string[];
    Blocks: IBlock[];
    Sources: IBlock[];
    Effects: IBlock[];
    Stage: Stage;

    Setup(): void;
}

export = IApp;