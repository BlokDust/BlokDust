module minerva {
    export interface IProjection {
        setObjectSize (objectWidth: number, objectHeight: number);
        getDistanceFromXYPlane(): number;
        getTransform(): number[];
    }
}