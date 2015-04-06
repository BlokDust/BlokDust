
interface IOperation
{
    Do(): Promise<any>;
    Dispose(): void;
}

export = IOperation;