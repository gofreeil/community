// Svelte action: enables drag-and-drop of image files onto any element (usually
// the upload <label>). On drop it filters to image files and calls onFiles(files).
// While dragging over the element it toggles a global `.drag-over` class so the
// element highlights (see the `.drag-over` rule in app.css).
//
// Usage:
//   <label use:imageDrop={handleFiles}> ... <input type="file" ... /> </label>
// where `handleFiles` is `(files: File[]) => void | Promise<void>`.

export function imageDrop(node: HTMLElement, onFiles: (files: File[]) => void) {
    let handler = onFiles;

    function over(e: DragEvent) {
        if (!e.dataTransfer) return;
        e.preventDefault();
        node.classList.add('drag-over');
    }
    function leave(e: DragEvent) {
        // Keep the highlight while dragging over inner children
        if (e.relatedTarget instanceof Node && node.contains(e.relatedTarget)) return;
        node.classList.remove('drag-over');
    }
    function drop(e: DragEvent) {
        e.preventDefault();
        node.classList.remove('drag-over');
        const files = Array.from(e.dataTransfer?.files ?? []).filter((f) =>
            f.type.startsWith('image/')
        );
        if (files.length) handler(files);
    }

    node.addEventListener('dragover', over);
    node.addEventListener('dragleave', leave);
    node.addEventListener('drop', drop);

    return {
        update(next: (files: File[]) => void) {
            handler = next;
        },
        destroy() {
            node.removeEventListener('dragover', over);
            node.removeEventListener('dragleave', leave);
            node.removeEventListener('drop', drop);
        }
    };
}
