/// <reference path="../Core/DependencyObject.ts" />

module Fayde.Navigation {
    export class RouteMapping extends DependencyObject {
        static ViewProperty = DependencyProperty.Register("View", () => Uri, RouteMapping);
        static UriProperty = DependencyProperty.Register("Uri", () => Uri, RouteMapping);
        View: Uri;
        Uri: Uri;

        MapUri (uri: Uri): Route {
            var matcher = createUriMatcher(this.Uri.toString(), uri.toString());
            var result: ITokenInfo[] = matcher.Match();
            if (!result)
                return undefined;

            //construct a route object that contains the view and parameters
            if (!this.View)
                throw new InvalidOperationException("RouteMapping must have a view. (" + this.Uri.toString() + ")");
            var hashParams: { [key: string]: string } = {};
            for (var i = 0; i < result.length; i++) {
                var key: string = result[i].Identifier;
                var value: string = result[i].Value;
                hashParams[key] = value;
            }
            return new Route(this.View, hashParams, null);
        }
    }
    Fayde.CoreLibrary.add(RouteMapping);

    interface ITokenInfo {
        Identifier: string;
        Terminator: string;
        Value: string;
    }
    interface IUriMatcher {
        Match(): ITokenInfo[];
    }

    function createUriMatcher (matchTemplate: string, actual: string): IUriMatcher {
        var i = 0;
        var j = 0;

        function collectTokenInfo (): ITokenInfo {
            var tokenInfo: ITokenInfo = {
                Identifier: null,
                Terminator: null,
                Value: null
            };
            var index = matchTemplate.indexOf('}', i);
            if (index < 0)
                throw new InvalidOperationException("Invalid Uri format. '{' needs a closing '}'.");
            var len = index - i + 1; //length of '{test}' = 6
            tokenInfo.Identifier = matchTemplate.substr(i + 1, len - 2);
            if (!tokenInfo.Identifier)
                throw new InvalidOperationException("Invalid Uri format. '{}' must contain an identifier.");
            i += len; //advances i just past '}'
            tokenInfo.Terminator = (i + 1) < matchTemplate.length ? matchTemplate[i] : '\0';
            //console.log("identifier: " + tokenInfo.Identifier + ", terminator: " + tokenInfo.Terminator);
            return tokenInfo;
        }

        function findTokenValue (tokenInfo: ITokenInfo): ITokenInfo {
            if (tokenInfo.Terminator === '\0') {
                tokenInfo.Value = actual.substr(j);
                if (tokenInfo.Value)
                    j += tokenInfo.Value.length;
                return tokenInfo;
            }
            tokenInfo.Value = "";
            while (j < actual.length) {
                if (actual[j] == tokenInfo.Terminator)
                    return;
                tokenInfo.Value += actual[j];
                j++;
            }
            //console.log("value: " + tokenInfo.Value);
        }

        return {
            Match: function (): ITokenInfo[] {
                var tokens: ITokenInfo[] = [];

                if (matchTemplate.length === 0) {
                    if (actual.length === 0)
                        return tokens;
                    return null;
                }

                while (i < matchTemplate.length && j < actual.length) {
                    if (matchTemplate[i] === "{") {
                        tokens.push(findTokenValue(collectTokenInfo()));
                        continue;
                    }
                    if (matchTemplate[i] !== actual[i])
                        return null;
                    i++;
                    j++;
                }
                return tokens;
            }
        };
    }
}