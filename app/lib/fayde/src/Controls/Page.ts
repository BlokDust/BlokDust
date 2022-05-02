/// <reference path="UserControl.ts" />

module Fayde.Controls {
    export class Page extends UserControl {
        static TitleProperty = DependencyProperty.Register("Title", () => String, Page);
        Title: string;

        constructor () {
            super();
            this.DefaultStyleKey = Page;
        }

        static GetAsync (initiator: DependencyObject, url: string): nullstone.async.IAsyncRequest<Page> {
            return nullstone.async.create((resolve, reject) => {
                Markup.Resolve(url)
                    .then(xm => {
                        TimelineProfile.Parse(true, "Page");
                        var page = Markup.Load<Page>(initiator.App, xm);
                        TimelineProfile.Parse(false, "Page");
                        if (!(page instanceof Controls.Page))
                            reject("Markup must be a Page.");
                        else
                            resolve(page);
                    }, reject);
            });
        }
    }
    Fayde.CoreLibrary.add(Page);
}