import IResource = require("./IResource");
import ObservableCollection = Fayde.Collections.ObservableCollection;

class ResourceManager {

    private _Resources: ObservableCollection<IResource<any>> = new ObservableCollection<IResource<any>>();

    ResourceAdded: Fayde.RoutedEvent<Fayde.RoutedEventArgs> = new Fayde.RoutedEvent<Fayde.RoutedEventArgs>();

    constructor() {

    }

    public AddResource(resource: IResource<any>): void{
        this._Resources.Add(resource);

        this.ResourceAdded.Raise(resource, new Fayde.RoutedEventArgs());
    }
}

export = ResourceManager;