module Fayde {
    var jsonFile = 'fayde.json';

    declare var require;

    export function LoadConfigJson (onComplete: (config: any, err?: any) => void) {
        require(['text!' + jsonFile],
            (jsontext) => configure(jsontext, onComplete),
            (err) => onComplete(err));
    }

    function configure (jsontext: string, onComplete: (config: any, err?: any) => void) {
        var json: any;
        try {
            json = JSON.parse(jsontext);
        } catch (err) {
            return onComplete(null, err);
        }
        if (json) {
            libs.configure(json.libs || {});
            themes.configure(json.themes || {});
            debug.configure(json.debug || {});
        }
        onComplete(json);
    }

    module libs {
        interface ILibraryConfig {
            name: string;
            path: string;
            base: string;
            deps: string[];
            exports: string
            useMin: boolean;
        }

        export function configure (json) {
            var libs = [];
            for (var libName in json) {
                libs.push(getLibConfig(libName, json[libName]));
            }

            for (var i = 0; i < libs.length; i++) {
                setupLibraryConfig(libs[i]);
            }
        }

        function getLibConfig (libName: string, libJson: any): ILibraryConfig {
            return {
                name: libName,
                path: libJson.path,
                base: libJson.base,
                deps: libJson.deps,
                exports: libJson.exports,
                useMin: libJson.useMin
            };
        }

        function setupLibraryConfig (lib: ILibraryConfig) {
            var uri = new Uri(lib.name);
            if (uri.scheme !== "http")
                uri = new Uri("lib://" + lib.name);
            var library = Fayde.TypeManager.resolveLibrary(uri.toString());
            if (!!lib.path)
                library.sourcePath = lib.path;
            if (!!lib.base)
                library.basePath = lib.base;
            if (!!lib.exports)
                library.exports = lib.exports;
            if (!!lib.deps)
                library.deps = lib.deps;
            library.useMin = (lib.useMin === true);
            (<any>library).$configModule();
        }
    }

    module themes {
        export function configure (json) {
            for (var libName in json) {
                var co = json[libName];
                var path = co === "none" ? null : (co.path ? co.path : undefined);
                ThemeConfig.Set(libName, path);
            }
        }
    }

    module debug {
        export function configure (json) {
            if (toBoolean(json.warnMissingThemes))
                Theme.WarnMissing = true;
            if (toBoolean(json.warnBrokenPath))
                Data.WarnBrokenPath = true;
        }

        function toBoolean (val: any): boolean {
            return val === "true"
                || val === true;
        }
    }
}