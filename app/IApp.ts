import {Audio} from './Core/Audio/Audio';
import {CommandsInputManager} from './Core/Inputs/CommandsInputManager';
import {CommandManager} from './Core/Commands/CommandManager';
import {IBlock} from './Blocks/IBlock';
import {IEffect} from './Blocks/IEffect';
import {InputManager} from './Core/Inputs/InputManager';
import {ISource} from './Blocks/ISource';
import {KeyboardInputManager as KeyboardInput} from './Core/Inputs/KeyboardInputManager';
import {MainScene} from './MainScene';
import {OperationManager} from './Core/Operations/OperationManager';
import {Particle} from './Particle'; // todo: should be IParticle
import {PointerInputManager} from './Core/Inputs/PointerInputManager';
import {PooledFactoryResource} from './Core/Resources/PooledFactoryResource';
import {ResourceManager} from './Core/Resources/ResourceManager';
import {Serializer} from './Serializer';

export interface IApp {
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

    Setup(): void;
}