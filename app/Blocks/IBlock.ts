import Size = Fayde.Utils.Size;
import IDisplayObject = require("../IDisplayObject");
import Particle = require("../Particle");
import Grid = require("../Grid");

interface IBlock extends IDisplayObject{
    Id: number;
    Click: Fayde.RoutedEvent<Fayde.RoutedEventArgs>;
    Outline: Point[];
    IsPressed: boolean;
    IsSelected: boolean;
    Position: Point;
    LastPosition: Point;
    OptionsForm: any;
    Params: any;
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
    DistanceFrom(point: Point): number;
    UpdateOptionsForm(): void;
    SetParam(param: string, value: number): void;
    GetParam(param: string): void;
    UpdateParams(params: any): void;
}

export = IBlock;