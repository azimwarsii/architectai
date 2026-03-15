# TODO

## Canvas Edge Management

**Status**: Implemented

### Completed Features

#### 1. UI for Creating Edges
- [x] Connection handles on left and right sides of each node
- [x] Drag from handle to another node to create edge
- [x] Visual preview line while dragging
- [x] Drop target highlight on potential target nodes

#### 2. UI for Editing/Deleting Edges
- [x] Click on edge to select it (highlighted in purple)
- [x] Delete key or Backspace to delete selected edge
- [x] "Edge selected" indicator in top bar with Delete button
- [x] Escape key to deselect

#### 3. API Routes
- [x] `POST /api/edges` - Create new edge (with duplicate prevention)
- [x] `DELETE /api/edges?id=<id>` - Delete edge by ID

#### 4. Realtime Subscription
- [x] Subscribe to `canvas_edges` INSERT and DELETE events
- [x] Edge changes from collaborators update the UI in realtime

---

## Node Management

**Status**: Implemented

### Completed Features

#### 1. Delete Nodes
- [x] Delete button appears on selected node (trash icon)
- [x] Delete key or Backspace deletes selected node
- [x] Automatically removes connected edges when node is deleted

#### 2. Inline Edit for Node Title/Body
- [x] Double-click on title to enter edit mode
- [x] Double-click on body to enter edit mode (shows placeholder if empty)
- [x] Enter key saves title, Escape cancels
- [x] Ctrl/Cmd+Enter saves body, Escape cancels
- [x] Click outside (blur) also saves changes
- [x] Changes persist to database immediately

---

### Files Modified
- `src/app/api/edges/route.ts` - Edge API route
- `src/components/canvas/SpecNode.tsx` - Connection handles, inline editing, delete button
- `src/components/canvas/CanvasBoard.tsx` - Edge/node creation, selection, deletion, realtime

### Usage
1. **Create edge**: Drag from a node's side handle to another node
2. **Select edge**: Click on an edge line (turns purple)
3. **Delete edge**: Press Delete/Backspace or click "Delete" in top bar
4. **Edit node title**: Double-click the title text
5. **Edit node body**: Double-click the body text (or "Add description...")
6. **Delete node**: Select node, then press Delete/Backspace or click trash icon
