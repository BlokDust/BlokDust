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
    Draw(): void;
    HitTest(point: Point): boolean;
    Id: number;
    BlockName: string;
    Click: Fayde.RoutedEvent<Fayde.RoutedEventArgs>;
    Connections: Fayde.Collections.ObservableCollection<IBlock>
    Outline: Point[];
    IsPressed: boolean;
    IsSelected: boolean;
    LastPosition: Point;
    MouseDown(): void;
    MouseMove(point: Point): void;
    MouseUp(): void;
    OptionsForm: any;
    Outline: Point[];
    Params: any;
    ParticleCollision(particle: Particle): void;
    Position: Point;
    Refresh(): void;
    SetParam(param: string, value: number): void;
    Stop(): void;
    Type: any;
    Update(): void;
    UpdateConnections(chain: IAudioChain)
    UpdateOptionsForm(): void;
}