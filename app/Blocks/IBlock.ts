import Size = Fayde.Utils.Size;
import IDisplayObject = require("../IDisplayObject");
import Particle = require("../Particle");

interface IBlock extends IDisplayObject{
    Id: number;
    Click: Fayde.RoutedEvent<Fayde.RoutedEventArgs>;
    Outline: Point[];
    IsPressed: boolean;
    IsSelected: boolean;
    GridPosition: Point;
    LastGridPosition: Point;
    Position: Point;
    Update(): void;
    Draw(): void;
    MouseDown(): void;
    ParticleCollision(particle: Particle): void;
    MouseUp(): void;
    MouseMove(point: Point): void;
    Delete(): void;
    HitTest(point: Point): boolean;
    DistanceFrom(point: Point): number;
}

export = IBlock;