/// <reference path="../Core/DependencyObject.ts" />

module Fayde.Navigation {
    export class UriMapping extends DependencyObject {
        static MappedUriProperty = DependencyProperty.Register("MappedUri", () => Uri, UriMapping);
        static UriProperty = DependencyProperty.Register("Uri", () => Uri, UriMapping);
        MappedUri: Uri;
        Uri: Uri;

        MapUri(uri: Uri): Uri {
            var matcher = createUriMatcher(this.Uri.toString(), this.MappedUri.toString(), uri.toString());
            var result = matcher.Match();
            if (!result)
                return undefined;
            return new Uri(result);
        }
    }
    Fayde.CoreLibrary.add(UriMapping);

    interface ITokenInfo {
        Identifier: string;
        Terminator: string;
        Value: string;
    }
    interface IUriMatcher {
        Match(): string;
    }
    function createUriMatcher(matchTemplate: string, outputTemplate: string, actual: string): IUriMatcher {
        var i = 0;
        var j = 0;

        function collectTokenInfo(): ITokenInfo {
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
            return tokenInfo;
        }
        function findTokenValue(tokenInfo: ITokenInfo): ITokenInfo {
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
        }
        function buildMappedUri(tokens: ITokenInfo[]): string {
            var cur = outputTemplate;
            var len = tokens.length;
            var token: ITokenInfo;
            for (var a = 0; a < len; a++) {
                token = tokens[a];
                cur = cur.replace("{" + token.Identifier + "}", token.Value);
            }
            return cur;
        }

        return {
            Match: function (): string {
                var tokens: ITokenInfo[] = [];
                if (matchTemplate.length === 0) {
                    if (actual.length === 0)
                        return buildMappedUri(tokens);
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
                return buildMappedUri(tokens);
            }
        };
    }
}