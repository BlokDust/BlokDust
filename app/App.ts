/// <reference path="./refs" />

import OperationManager = require("./Core/Operations/OperationManager");
import ResourceManager = require("./Core/Resources/ResourceManager");
import CommandManager = require("./Core/Commands/CommandManager");
import IModifier = require("./Blocks/IModifier");
import IModifiable = require("./Blocks/IModifiable");
import ObservableCollection = Fayde.Collections.ObservableCollection;

class App{

    static OperationManager: OperationManager;
    static ResourceManager: ResourceManager;
    static CommandManager: CommandManager;
    static Modifiables: ObservableCollection<IModifiable>;
    static Modifiers: ObservableCollection<IModifier>;

    constructor() {

    }

    static Init(){
        App.OperationManager = new OperationManager();
        App.ResourceManager = new ResourceManager();
        App.CommandManager = new CommandManager(App.ResourceManager);
        App.Modifiables = new ObservableCollection<IModifiable>();
        App.Modifiers = new ObservableCollection<IModifier>();
    }
}

export = App;