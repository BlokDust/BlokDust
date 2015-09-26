import {IResource} from './IResource';
import ObservableCollection = Fayde.Collections.ObservableCollection; //TODO: es6 modules

export class ResourceManager {

    private _Resources: ObservableCollection<IResource<any>> = new ObservableCollection<IResource<any>>();

    ResourceAdded: Fayde.RoutedEvent<Fayde.RoutedEventArgs> = new Fayde.RoutedEvent<Fayde.RoutedEventArgs>();

    constructor() {

    }

    public AddResource(resource: IResource<any>): void{
        this._Resources.Add(resource);

        this.ResourceAdded.raise(resource, new Fayde.RoutedEventArgs());
    }
}