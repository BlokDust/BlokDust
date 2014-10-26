/// <reference path="./refs" />

import OperationManager = require("./Core/Operations/OperationManager");
import ResourceManager = require("./Core/Resources/ResourceManager");
import CommandManager = require("./Core/Commands/CommandManager");
import AudioMixer = require("./Core/Audio/AudioMixer");
import IModifier = require("./Blocks/IModifier");
import IModifiable = require("./Blocks/IModifiable");
import IBlock = require("./Blocks/IBlock");
import DisplayObjectCollection = require("./DisplayObjectCollection");
import ObservableCollection = Fayde.Collections.ObservableCollection;
import FilteredCollection = Fayde.Collections.FilteredCollection;

class App{

    static OperationManager: OperationManager;
    static ResourceManager: ResourceManager;
    static CommandManager: CommandManager;
    static Blocks: DisplayObjectCollection<any>;
    static Modifiables: ObservableCollection<IModifiable>;
    static Modifiers: ObservableCollection<IModifier>;
    static AudioMixer: AudioMixer;

    constructor() {

    }

    static Init(){
        App.OperationManager = new OperationManager();
        App.ResourceManager = new ResourceManager();
        App.CommandManager = new CommandManager(App.ResourceManager);

        //todo: make these members of BlocksContext
        App.Blocks = new DisplayObjectCollection<IBlock>();
        App.Modifiables = new ObservableCollection<IModifiable>();
        App.Modifiers = new ObservableCollection<IModifier>();

        App.Blocks.CollectionChanged.Subscribe(() => {
            App.Modifiables.Clear();

            for (var i = 0; i < App.Blocks.Count; i++) {
                var block = App.Blocks.GetValueAt(i);

                // todo: use reflection when available
                if ((<IModifiable>block.Modifiers)){
                    App.Modifiables.Add(block);
                }
            }

            App.Modifiers.Clear();

            for (var i = 0; i < App.Blocks.Count; i++) {
                var block = App.Blocks.GetValueAt(i);

                // todo: use reflection when available
                if (!(<IModifiable>block.Modifiers)){
                    App.Modifiers.Add(block);
                }
            }
        }, this);

        App.AudioMixer = new AudioMixer();
    }
}

export = App;