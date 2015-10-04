import {ISketchContext} from './ISketchContext';
import {ITimerListener} from './ITimerListener';
import Point = minerva.Point;

export interface IDisplayObject extends ISketchContext, ITimerListener{
    Ctx: CanvasRenderingContext2D;
    Draw(): void;
    Height: number;
    Hide(): void;
    Init(sketch?: ISketchContext): void;
    Initialised: boolean;
    IsPaused: boolean;
    IsVisible: boolean;
    Pause(): void;
    Play(): void;
    Position: Point;
    Setup(): void;
    Show(): void;
    Update(): void;
    Width: number;
    ZIndex: number;
}
