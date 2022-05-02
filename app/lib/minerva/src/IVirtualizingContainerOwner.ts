module minerva {
    export interface IVirtualizingContainerOwner {
        itemCount: number;
        createGenerator(index: number, count: number): IVirtualizingGenerator;
        remove(index: number, count: number);
    }
}