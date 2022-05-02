## ProcessDown
    * Render Visibility
        * Update Bounds
        * Update Bounds (visual parent)
        * Update total opacity from `opacity` and visual parent `opacity`
        * Update total visibility from `visibility` and visual parent `visibility`
        * Add dirty element NewBounds
        * Propagate down `RenderVisibility`
    * Hit Test Visibility
        * Update total is hit test visible from `isHitTestVisible` and visual parent `isHitTestVisible`
        * Propagate down `HitTestVisibility`
    * Local Transform
        * Calculate absolute transform origin from actual size and `renderTransformOrigin`.
        * Compute `localXform` from `renderTransform` and transform origin
    * Local Projection
        * Compute distance from xy plane from `projection` based on actual size
        * Set Panel.Z based on distance from xy plane
    * Transform
        * Combine all transforms and projections to output matrices
            * render = local * layout * carrier
            * localP = render(toP) * carrierP
            * abs = vpAbs * render
            * absP = vpAbsP * localP
        * Update Bounds (visual parent)
        * Propagate down `Transform`
    * Layout Clip
        * Compute composite layout clip from intersection of layout clip and visual parent composite
        * Propagate down `LayoutClip`
    * Clip (no longer used)
    * Children Z Indices
        * Resort children