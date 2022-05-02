# Pipeline

## Tapin Order

* applyRounding
* validateFinalRect
* validateVisibility
* checkNeedArrange
* ensureMeasured (*)
* invalidateFuture
* calcStretched
* prepareOverride
* doOverride
    * Assign `arrangedSize` based on compilation of child `arrangedSize`.
* completeOverride
* calcFlip
* calcVisualOffset
* buildLayoutClip
* buildLayoutXform
* buildRenderSize


# Legacy

## _DoArrangeWithError

* Set `last` to `LayoutSlot`
* If no visual parent, set `last` to `viewport`
    * If layout container
        * If top level and attached, set `viewport` to `PreviousConstraint` fall back to surface size
    * Else set `viewport` to `ActualSize`
    * Move `viewport` by `Canvas.Left` and `Canvas.Top`
* If `last`, [#_Arrange]
* Else `InvalidateArrange` on visual parent

## _Arrange

* If `UseLayoutRounding`, round `finalRect`
* Sanity checks
    * Validate `finalRect` is not negative/NaN/infinite
    * If `Collapsed`, set `LayoutSlot` to `finalRect`, skip out
    * If does not have dirty arrange and `LayoutSlot` equals `null` or `finalRect`: skip out
* Prepare
    * If `IsContainer` and no `PreviousConstraint`: set `PreviousConstraint` to [#_Measure] with size from `finalRect`
    * Clear LayoutClip
* Invalidate
    * `UpdateTransform`
    * `UpdateProjection`
    * `UpdateBounds`
* Framework Coercion
    * Shrink `finalRect` by `Margin` as `childRect`
    * Coerce size from `childRect` to `stretched`
    * Coerce size from blank size to `framework`
    * If stretched horizontally/vertically set `framework` to max of `framework`/`stretched`
    * Set `offer` to max of `HiddenDesire` and `framework`
    * Set `LayoutSlot` to `finalRect`
* [#ArrangeOverride] -> `response`
* Post Arrange Coercion
    * If stretched horizontally/vertically, set `response` to max of `framework`/`response`
    * Set `LayoutXform` to translate(`childRect` top-left)
    * If flip horizontal (`FlowDirection`), flip `LayoutXform` based on `offer` `Width`
* Clear dirty flags
* Set `VisualOffset` to `childRect` top-left
* Copy `RenderSize` (old) to `oldSize`
* If `UseLayoutRounding`, round `response`
* Set `RenderSize` to `response`
* Set `constrainedResponse` to min of `response` and coerced `response`
* If no visual parent or visual parent is `Canvas` and not `IsLayoutContainer`: clear `RenderSize`, skip out
* If not top level, adjust `VisualOffset` based on `childRect`, `constrainedResponse`, `HorizontalAlignment`, and `VerticalAlignment`
* If `UseLayoutRounding`, round `VisualOffset`
* Build `LayoutXform` based on `VisualOffset` and `flipHoriz`
* Build `LayoutClip`
    * Set `layoutClip` to `childRect`
    * Set `layoutClip` top-left to min of `childRect` top-left and `visualOffset` top-left (x,y can't be negative)
    * If `UseLayoutRounding`, round `layoutClip`
    * Set `frect` to coerced size infinity,infinity with 0,0 top-left
    * Set `LayoutClip` to intersection of `layoutClip` and `frect`
* If `oldSize` not equal to `response` and no `LastRenderSize`, set `LastRenderSize` to `oldSize` and propagate `DirtySizeHint`

## ArrangeOverride

* Control-specific layout
* Falls into children [#_Arrange]