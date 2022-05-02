module minerva.controls.grid {
    export class Segment {
        desired: number = 0.0;
        offered: number = 0.0;
        original: number = 0.0;
        min: number = 0.0;
        max: number = Number.POSITIVE_INFINITY;
        stars: number = 0;
        type =  GridUnitType.Pixel;

        clamp (value: number): number {
            if (value < this.min)
                return this.min;
            if (value > this.max)
                return this.max;
            return value;
        }

        static init (segment: Segment, offered?: number, min?: number, max?: number, unitType?: GridUnitType): Segment {
            segment.desired = 0.0;
            segment.stars = 0;
            segment.offered = offered || 0.0;
            segment.min = min || 0.0;
            segment.max = max != null ? max : Number.POSITIVE_INFINITY;
            segment.type = unitType != null ? unitType : GridUnitType.Pixel;

            if (segment.offered < min)
                segment.offered = min;
            else if (segment.offered > max)
                segment.offered = max;

            return segment;
        }
    }
}