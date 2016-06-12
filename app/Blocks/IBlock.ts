import {IAudioChain} from "../Core/Audio/Connections/IAudioChain";
import IDisplayObject = etch.drawing.IDisplayObject;
import ObservableCollection = etch.collections.ObservableCollection;
import {Particle} from "../Particle";
import RoutedEventArgs = etch.events.RoutedEventArgs;
import RoutedEvent = etch.events.RoutedEvent;

export interface IBlock extends IDisplayObject {
    BackwardsCompatibilityPatch(): void;
    Chain: IAudioChain;
    Click: RoutedEvent<RoutedEventArgs>;
    Connections: ObservableCollection<IBlock>
    Dispose(): void;
    DistanceFrom(point: Point): number;
    draw(): void;
    Duplicable: boolean;
    HitTest(point: Point): boolean;
    Id: number;
    BlockName: string;
    IsChained: boolean;
    IsPressed: boolean;
    IsSelected: boolean;
    LastPosition: Point;
    MouseDown(): void;
    MouseMove(point: Point): void;
    MouseUp(): void;
    OptionsForm: any;
    Outline: Point[];
    Params: any;
    Defaults: any;
    ParticleCollision(particle: Particle): void;
    Position: Point;
    Refresh(): void;
    SetParam(param: string, value: number): void;
    Stop(): void;
    Type: any;
    update(): void;
    UpdateConnections(chain: IAudioChain)
    UpdateOptionsForm(): void;
    SetSearchResults(results): any;
    SetReversedBuffer(buffer: any): void;
}