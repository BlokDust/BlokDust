module minerva {
    export interface IWalker<T> {
        current: T;
        step(): boolean;
    }

    export interface IDeepWalker<T> {
        current: T;
        step(): boolean;
        skipBranch();
    }

    export enum WalkDirection {
        Forward = 0,
        Reverse = 1,
        ZForward = 2,
        ZReverse = 3
    }
}