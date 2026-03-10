
# Camera and Minimap Update (2026-03-01)

This note documents the post-V1 navigation updates focused on camera behavior and map orientation.

Related commits:

- `235e587` camera: clamp map panning to grid bounds
- `8bfab36` ui: add clickable minimap with camera viewport

## Camera Improvements

- Camera panning is clamped to map bounds.
- Players can no longer pan into empty space outside the world.
- Boundary behavior is covered by updated unit and behavior tests.

Why:

- Prevents disorientation during exploration.
- Makes camera controls predictable and consistent with map extents.

## Minimap Feature

- Added a minimap panel in the right-side UI.
- Minimap renders the full map in simplified terrain states:
  - passable
  - blocked
- Town locations are shown as markers.
- A viewport box shows the current camera area.
- Clicking the minimap recenters the camera to the clicked region.
- Added event wiring and tests for minimap rendering and click-to-recenter behavior.

Why:

- Improves global orientation when traversing larger maps.
- Reduces navigation friction by enabling fast camera jumps.
