export interface IOperation {
    Do(): Promise<any>;
    Dispose(): void;
}