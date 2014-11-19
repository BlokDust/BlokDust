import Size = Fayde.Utils.Size;
import IDisplayObject = require("../IDisplayObject");
import Particle = require("../Particle");

interface IBlock extends IDisplayObject{
    Id: number;
    Click: Fayde.RoutedEvent<Fayde.RoutedEventArgs>;
    Outline: Point[];
    IsPressed: boolean;
    IsSelected: boolean;
    Position: Point;
    LastPosition: Point;
    AbsPosition: Point;
    Update(ctx: CanvasRenderingContext2D): void;
    Draw(ctx: CanvasRenderingContext2D): void;
    MouseDown(): void;
    ParticleCollision(particle: Particle): void;
    MouseUp(): void;
    MouseMove(point: Point): void;
    HitTest(point: Point): boolean;
    DistanceFrom(point: Point): number;
}

export = IBlock;