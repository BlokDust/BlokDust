import {ICommandHandler} from '../Commands/ICommandHandler';
import {CommandHandlerFactory} from '../Resources/CommandHandlerFactory';
import {IFactoryResource} from '../Resources/IFactoryResource';
import {IResource} from '../Resources/IResource';
import {ResourceManager} from '../Resources/ResourceManager';

// https://github.com/CadetEditor/CoreEditor-as/blob/master/coreAppEx/src/core/appEx/managers/CommandManager.as
export class CommandManager {

    private _ResourceManager: ResourceManager;
    private _CommandHandlerFactories: CommandHandlerFactory<ICommandHandler>[] = [];

    constructor(resourceManager: ResourceManager) {
        this._ResourceManager = resourceManager;
        this._ResourceManager.ResourceAdded.on((resource: IResource<any>) => {
            this._OnResourceAdded(resource);
        }, this);
    }

    private _OnResourceAdded(resource: IResource<any>){
        if (CommandHandlerFactory.prototype.isPrototypeOf(resource)){
            this._CommandHandlerFactories.push(<CommandHandlerFactory<ICommandHandler>>resource);
        }
    }

    public ExecuteCommand(command: string, parameters?: any): Promise<any> {
        // todo: use metric to determine best CommandHandlerFactory to use.
        var commandHandlerFactories: CommandHandlerFactory<ICommandHandler>[] = this._GetCommandHandlerFactories(command);

        if (!commandHandlerFactories.length) return;

        var commandHandler: ICommandHandler = commandHandlerFactories[0].GetInstance();

        return commandHandler.Execute(parameters);
    }

    private _GetCommandHandlerFactories(command: string): CommandHandlerFactory<ICommandHandler>[]{
        return this._CommandHandlerFactories.filter((item:CommandHandlerFactory<ICommandHandler>) => {
            return item.Command == command;
        }, this);
    }
}