/// <reference path="../refs" />

import Size = Fayde.Utils.Size;

interface IBlock{
    Id: number;
    //DrawZ: number;
    ArrayIndex: number;
    IndexZ: number;
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
    MouseUp(): void;
    MouseMove(point: Point): void;
    HitTest(point: Point): boolean;
    DistanceFrom(point: Point): number;
}

export = IBlock;