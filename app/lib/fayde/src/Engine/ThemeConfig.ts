module Fayde {
    export module ThemeConfig {
        var configs = {};

        var DEFAULT_TEMPLATE_URI = "lib/<libname>/themes/<themename>.Theme.xml";

        export function GetRequestUri (uri: Uri, name: string): string {
            if (Uri.isNullOrEmpty(uri))
                return null;
            var config = configs[uri.toString()];
            if (config && config.none)
                return null;
            var templateUri = ((config) ? config.requestTemplateUri : null) || DEFAULT_TEMPLATE_URI;
            return processTemplate(uri, name, templateUri);
        }

        export function OverrideRequestUri (uri: Uri, templateUri: string) {
            configs[uri.toString()] = {
                requestTemplateUri: templateUri
            };
        }

        export function Set (libName: string, path: string) {
            //NOTE:
            //  path === undefined  --> use default
            //  path === null       --> don't load theme
            //  other               --> use path as template
            if (!libName) {
                console.warn("Could not configure theme. No library specified.");
                return;
            }
            var uri = new Uri(libName);
            if (uri.scheme !== "http")
                uri = new Uri("lib://" + libName);

            if (path === undefined)
                configs[uri.toString()] = null;
            else if (path === null)
                configs[uri.toString()] = {
                    none: true
                };
            else
                configs[uri.toString()] = {
                    requestTemplateUri: path
                };
        }

        function processTemplate (uri: Uri, name: string, template: string): string {
            var libName = uri.host;
            var rv = template;
            rv = rv.replace("<libname>", libName);
            rv = rv.replace("<themename>", name);
            return rv;
        }

        OverrideRequestUri(new Uri(Fayde.XMLNS), "lib/fayde/themes/<themename>.theme.xml");
    }
}