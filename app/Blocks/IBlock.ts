import IDisplayObject = require("../IDisplayObject");
import Particle = require("../Particle");
import Grid = require("../Grid");
import AudioChain = require("../Core/Audio/ConnectionMethods/AudioChain");

interface IBlock extends IDisplayObject{
    Id: number;
    Click: Fayde.RoutedEvent<Fayde.RoutedEventArgs>;
    Connections: Fayde.Collections.ObservableCollection<IBlock>
    Outline: Point[];
    IsPressed: boolean;
    IsSelected: boolean;
    IsChained: boolean;
    Chain: AudioChain;
    Position: Point;
    LastPosition: Point;
    OptionsForm: any;
    Params: any;
    Type: any;
    Update(): void;
    Draw(): void;
    Refresh(): void;
    MouseDown(): void;
    ParticleCollision(particle: Particle): void;
    MouseUp(): void;
    MouseMove(point: Point): void;
    Dispose(): void;
    Stop(): void;
    HitTest(point: Point): boolean;
    UpdateConnections(chain: AudioChain)
    DistanceFrom(point: Point): number;
    UpdateOptionsForm(): void;
    SetParam(param: string, value: number): void;
    BackwardsCompatibilityPatch(): void;
}

export = IBlock;