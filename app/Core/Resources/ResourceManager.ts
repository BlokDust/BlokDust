///<amd-dependency path="etch"/>.
import {IResource} from './IResource';
import ObservableCollection = etch.collections.ObservableCollection;
import RoutedEvent = etch.events.RoutedEvent;
import RoutedEventArgs = etch.events.RoutedEventArgs;

export class ResourceManager {

    private _Resources: ObservableCollection<IResource<any>> = new ObservableCollection<IResource<any>>();

    ResourceAdded: RoutedEvent<RoutedEventArgs> = new RoutedEvent<RoutedEventArgs>();

    constructor() {

    }

    public AddResource(resource: IResource<any>): void{
        this._Resources.Add(resource);

        this.ResourceAdded.raise(resource, new RoutedEventArgs());
    }
}