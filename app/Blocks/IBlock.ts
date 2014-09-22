interface IBlock{
    Id: number;
    Click: Fayde.RoutedEvent<Fayde.RoutedEventArgs>;
    Position: Point;
    Radius: number;
    IsPressed: boolean;
    IsSelected: boolean;
    Update(): void;
    Draw(ctx: CanvasRenderingContext2D): void;
    MouseDown(): void;
    MouseUp(): void;
    MouseMove(point: Point): void;
    HitTest(point: Point): boolean;
    DistanceFrom(point: Point): number;
}

export = IBlock;