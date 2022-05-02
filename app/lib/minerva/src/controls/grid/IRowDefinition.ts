module minerva.controls.grid {
    export interface IRowDefinition {
        Height: IGridLength;
        MaxHeight: number;
        MinHeight: number;
        ActualHeight: number;
        setActualHeight(value: number);
    }
}