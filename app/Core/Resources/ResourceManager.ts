import {IResource} from './IResource';
import {ObservableCollection} from '../Collections/ObservableCollection';
import {RoutedEvent} from '../Events/RoutedEvent';
import {RoutedEventArgs} from '../Events/RoutedEventArgs';

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