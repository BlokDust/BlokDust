module Fayde {
    export interface IThemeManager {
        LoadAsync (themeName: string): nullstone.async.IAsyncRequest<any>;
        FindStyle(defaultStyleKey: any): Style;
    }
    class ThemeManagerImpl implements IThemeManager {
        private $$libthemerepos: LibraryThemeRepo[] = [];

        constructor () {
            Fayde.TypeManager.libResolver.libraryCreated.on(this.$$onLibraryCreated, this);
            this.$$libthemerepos.push(new LibraryThemeRepo(new Uri(Fayde.XMLNS)));
        }

        private $$onLibraryCreated (sender: any, args: nullstone.ILibraryCreatedEventArgs) {
            this.$$libthemerepos.push(new LibraryThemeRepo(args.library.uri));
        }

        LoadAsync (themeName: string): nullstone.async.IAsyncRequest<any> {
            return nullstone.async.many(this.$$libthemerepos.map(repo => repo.ChangeActive(themeName)));
        }

        FindStyle (defaultStyleKey: any): Style {
            if (!defaultStyleKey)
                return null;
            var uri = defaultStyleKey.$$uri;
            if (uri) {
                var repo = this.$$findRepo(uri);
                if (repo)
                    return repo.Active.GetImplicitStyle(defaultStyleKey);
            }
            return null;
        }

        private $$findRepo (uri: string): LibraryThemeRepo {
            for (var i = 0, repos = this.$$libthemerepos; i < repos.length; i++) {
                var repo = repos[i];
                if (repo.Uri.toString() === uri)
                    return repo;
            }

        }
    }

    class LibraryThemeRepo {
        private $$themes = {};
        private $$active: Theme;

        Uri: Uri;

        get Active (): Theme {
            return this.$$active;
        }

        constructor (uri: Uri) {
            Object.defineProperty(this, "Uri", {value: uri, writable: false});
        }

        Get (name: string): Theme {
            var theme = this.$$themes[name];
            if (!theme)
                theme = this.$$themes[name] = new Theme(name, this.Uri);
            return theme;
        }

        ChangeActive (name: string): nullstone.async.IAsyncRequest<Theme> {
            var theme = this.Get(name);
            return nullstone.async.create((resolve, reject) => {
                theme.LoadAsync()
                    .then(() => {
                        this.$$active = theme;
                        resolve(theme);
                    }, reject);
            });
        }
    }

    export var ThemeManager: IThemeManager = new ThemeManagerImpl();
}