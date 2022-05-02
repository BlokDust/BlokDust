/// <reference path="TextElement.ts"/>

module Fayde.Documents {
    export class Section extends TextElement {
        CreateNode (): TextElementNode {
            return new TextElementNode(this, "Blocks");
        }

        static BlocksProperty = DependencyProperty.RegisterImmutable<BlockCollection>("Blocks", () => BlockCollection, Section);
        Blocks: BlockCollection;

        constructor () {
            super();
            var coll = Section.BlocksProperty.Initialize(this);
            coll.AttachTo(this);
            ReactTo(coll, this, (obj?) => this.BlocksChanged(obj.item, obj.add));
        }

        BlocksChanged (block: Block, isAdd: boolean) {
            if (isAdd)
                Providers.InheritedStore.PropagateInheritedOnAdd(this, block.XamlNode);

            if (isAdd)
                ReactTo(block, this, (obj?) => Incite(this, obj));
            else
                UnreactTo(block, this);

            Incite(this, {
                type: 'text',
                full: true
            });
        }
    }
    Fayde.CoreLibrary.add(Section);
    Markup.Content(Section, Section.BlocksProperty);
}