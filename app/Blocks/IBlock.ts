import Size = Fayde.Utils.Size;
import IDisplayObject = require("../IDisplayObject");
import Particle = require("../Particle");

interface IBlock extends IDisplayObject{
    Id: number;
    Reference;
    Click: Fayde.RoutedEvent<Fayde.RoutedEventArgs>;
    Outline: Point[];
    IsPressed: boolean;
    IsSelected: boolean;
    Position: Point;
    LastPosition: Point;
    ParamJson;
    Update(): void;
    Draw(): void;
    MouseDown(): void;
    ParticleCollision(particle: Particle): void;
    MouseUp(): void;
    MouseMove(point: Point): void;
    Delete(): void;
    HitTest(point: Point): boolean;
    DistanceFrom(point: Point): number;
    OpenParams(): void;
    SetValue(param: string,value: number): void;
    GetValue(param: string): void;
}

export = IBlock;