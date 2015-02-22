
interface ICommandHandler {
    Execute(parameters?: any): void;
}

export = ICommandHandler;