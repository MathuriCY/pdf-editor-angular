# PDF Editor — Angular 18 Frontend

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server (opens http://localhost:4200 automatically)
npm start
```

The Angular dev server proxies all `/api` requests to `https://localhost:5001` (the .NET API).
Make sure the API is running before loading a document.

## VS Code

Open this folder (`pdf-editor-angular/`) directly in VS Code.
Press **F5** → select **"ng serve"** to launch with the built-in debugger.

Recommended extensions are listed in `.vscode/extensions.json` — VS Code will prompt to install them.

## Folder Structure

```
src/app/
  components/
    pdf-editor/         ← Root shell + keyboard shortcuts + header
    pdf-viewer/         ← ngx-extended-pdf-viewer wrapper + overlay layer
    field-toolbar/      ← Draggable field palette (left panel)
    field-overlay/      ← Placed field boxes (drag/resize/context-menu)
    field-properties/   ← Selected field property editor (right panel)
  services/
    pdf-api.service     ← HTTP calls to .NET backend
    pdf-field.service   ← Field CRUD + selection + copy/paste
    pdf-viewer.service  ← Zoom / page signals
    pdf-coordinate.service ← Pixel ↔ PDF pt coordinate math
    undo-redo.service   ← Snapshot-based undo/redo stack
  directives/
    draggable-field     ← Custom drag source for toolbar items
    resizable           ← Corner resize handles for placed fields
  models/               ← TypeScript interfaces & enums
```

## Keyboard Shortcuts

| Shortcut       | Action          |
|----------------|-----------------|
| Ctrl + Z       | Undo            |
| Ctrl + Y       | Redo            |
| Ctrl + C       | Copy field      |
| Ctrl + V       | Paste field     |
| Ctrl + S       | Save fields     |
| Delete         | Delete selected |

## Configuration

To change the backend URL edit `proxy.conf.json`:

```json
{ "/api": { "target": "http://localhost:5000" } }
```

## Build for Production

```bash
npm run build:prod
# Output: dist/pdf-editor-angular/
```
