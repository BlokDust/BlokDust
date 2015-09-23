import Audio = require("./Core/Audio/Audio");
import CommandManager = require("./Core/Commands/CommandManager");
import CommandsInputManager = require("./Core/Inputs/CommandsInputManager");
import IBlock = require("./Blocks/IBlock");
import IDisplayObject = require("./IDisplayObject");
import IEffect = require("./Blocks/ISource");
import InputManager = require("./Core/Inputs/InputManager");
import ISource = require("./Blocks/ISource");
import KeyboardInput = require("./Core/Inputs/KeyboardInputManager");
import MainScene = require("./MainScene");
import OperationManager = require("./Core/Operations/OperationManager");
import Particle = require("./Particle"); // todo: should be IParticle
import PointerInputManager = require("./Core/Inputs/PointerInputManager");
import PooledFactoryResource = require("./Core/Resources/PooledFactoryResource");
import ResourceManager = require("./Core/Resources/ResourceManager");
import Serializer = require("./Serializer");
import ISketchContext = Fayde.Drawing.ISketchContext;

interface IApp extends ISketchContext {
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
    MainScene: MainScene;
}

export = IApp;