# Visual Editor - Bookmarklet Version

## Installation

1. Copy the code below
2. Create a new bookmark in your browser
3. Name it "Visual Editor"
4. Paste the code as the URL
5. Click the bookmark while on any page to activate the editor

## Bookmarklet Code

```javascript
javascript:(function(){if(document.getElementById('ve-styles')){document.getElementById('ve-styles').remove();document.getElementById('ve-script').remove();document.getElementById('ve-container').remove();return}fetch('/visual-editor.html').then(r=>r.text()).then(h=>{const sm=h.match(/<style>([\s\S]*?)<\/style>/);if(sm){const s=document.createElement('style');s.id='ve-styles';s.textContent=sm[1];document.head.appendChild(s)}const pm=h.match(/<script>([\s\S]*?)<\/script>/);if(pm){const p=document.createElement('script');p.id='ve-script';p.textContent=pm[1];document.body.appendChild(p)}const bm=h.match(/<body>([\s\S]*?)<\/body>/);if(bm){const c=document.createElement('div');c.id='ve-container';c.innerHTML=bm[1];document.body.appendChild(c)}})});
```

## Usage

1. Click the "Visual Editor" bookmark on any page (e.g., http://localhost:3000)
2. A floating button will appear (bottom right)
3. Click it to open the editor panel
4. Click any element on the page to select it
5. Edit properties in the panel
6. Copy HTML/CSS/JSON of any element
7. Press Escape or click the X to close

## Features

- **Inspect Tab**: Position, size, display properties
- **Style Tab**: Spacing, colors, typography, flexbox, effects
- **Tree Tab**: DOM structure viewer
- **History Tab**: Undo/redo, save presets

## Keyboard Shortcuts

- `Escape`: Toggle editor
- `Ctrl+Z`: Undo
- `Ctrl+Shift+Z`: Redo
- `Delete`: Delete selected element
