module minerva {
    export enum DirtyFlags {
        Transform = 1 << 0,
        LocalTransform = 1 << 1,
        Clip = 1 << 3,
        LocalClip = 1 << 4,
        LayoutClip = 1 << 5,
        RenderVisibility = 1 << 6,
        HitTestVisibility = 1 << 7,
        ImageMetrics = 1 << 8,
        Measure = 1 << 9,
        Arrange = 1 << 10,
        Bounds = 1 << 20,
        NewBounds = 1 << 21,
        Invalidate = 1 << 22,
        InUpDirtyList = 1 << 30,
        InDownDirtyList = 1 << 31,

        DownDirtyState = Transform | LocalTransform
            | Clip | LocalClip | LayoutClip | RenderVisibility
            | HitTestVisibility | ImageMetrics,
        UpDirtyState = Bounds | NewBounds | Invalidate,

        PropagateDown = RenderVisibility | HitTestVisibility | Transform | LayoutClip
    }
    export enum UIFlags {
        None = 0,

        RenderVisible = 0x02,
        HitTestVisible = 0x04,
        TotalRenderVisible = 0x08,
        TotalHitTestVisible = 0x10,

        MeasureHint = 0x800,
        ArrangeHint = 0x1000,
        SizeHint = 0x2000,
        Hints = MeasureHint | ArrangeHint | SizeHint
    }
    export enum ShapeFlags {
        None = 0,
        Empty = 1,
        Normal = 2,
        Degenerate = 4,
        Radii = 8,
    }
}