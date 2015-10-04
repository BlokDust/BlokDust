import {IDisplayContext} from './IDisplayContext';
import {ITimerListener} from './../Engine/ITimerListener';
import Point = minerva.Point;

export interface IDisplayObject extends IDisplayContext, ITimerListener{
    Ctx: CanvasRenderingContext2D;
    Draw(): void;
    Height: number;
    Hide(): void;
    Init(sketch?: IDisplayContext): void;
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
