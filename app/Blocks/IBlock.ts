/// <reference path="../refs" />

import Size = Fayde.Utils.Size;

interface IBlock{
    Id: number;
    Click: Fayde.RoutedEvent<Fayde.RoutedEventArgs>;
    Radius: number;
    IsPressed: boolean;
    IsSelected: boolean;
    Position: Point;
    Update(ctx: CanvasRenderingContext2D): void;
    Draw(ctx: CanvasRenderingContext2D): void;
    MouseDown(): void;
    MouseUp(): void;
    MouseMove(point: Point): void;
    HitTest(point: Point): boolean;
    DistanceFrom(point: Point): number;
}

export = IBlock;