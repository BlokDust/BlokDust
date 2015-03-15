import Size = Fayde.Utils.Size;
import IDisplayObject = require("../IDisplayObject");
import Particle = require("../Particle");
import Grid = require("../Grid");

interface IBlock extends IDisplayObject{
    Id: number;
    Type: any; // todo: use TS 1.5 reflection
    Click: Fayde.RoutedEvent<Fayde.RoutedEventArgs>;
    Outline: Point[];
    IsPressed: boolean;
    IsSelected: boolean;
    Position: Point;
    LastPosition: Point;
    ParamJson: any;
    Update(): void;
    Draw(): void;
    MouseDown(): void;
    ParticleCollision(particle: Particle): void;
    MouseUp(): void;
    MouseMove(point: Point): void;
    Dispose(): void;
    HitTest(point: Point): boolean;
    DistanceFrom(point: Point): number;
    OpenParams(): void;
    SetValue(param: string,value: number): void;
    GetValue(param: string): void;
}

export = IBlock;