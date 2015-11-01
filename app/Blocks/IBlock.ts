import {IAudioChain} from "../Core/Audio/Connections/IAudioChain";
import IDisplayObject = etch.drawing.IDisplayObject;
import ObservableCollection = etch.collections.ObservableCollection;
import {Particle} from "../Particle";
import RoutedEventArgs = etch.events.RoutedEventArgs;
import RoutedEvent = etch.events.RoutedEvent;

export interface IBlock extends IDisplayObject{
    Id: number;
    Click: RoutedEvent<RoutedEventArgs>;
    Connections: ObservableCollection<IBlock>
    Outline: Point[];
    IsPressed: boolean;
    IsSelected: boolean;
    IsChained: boolean;
    Chain: IAudioChain;
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
    UpdateConnections(chain: IAudioChain)
    DistanceFrom(point: Point): number;
    UpdateOptionsForm(): void;
    SetParam(param: string, value: number): void;
    BackwardsCompatibilityPatch(): void;
}