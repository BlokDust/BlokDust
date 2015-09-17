export interface IPooledObject {
    Reset: () => boolean;
    Dispose: () => void;
    Disposed: boolean;
    ReturnToPool: () => void;
}