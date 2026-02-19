document.addEventListener('DOMContentLoaded', () => {
    const shapeRegistry = {
        'circle': { class: CircleShape, canvasId: 'canvas-circle' },
        'square': { class: SquareShape, canvasId: 'canvas-square' },
        'ellipse': { class: EllipseShape, canvasId: 'canvas-ellipse' },
        'bezier': { class: BezierShape, canvasId: 'canvas-bezier' }
    };

    shapesData.forEach(data => {
        const type = data[0];
        const params = data.slice(1);
        
        const config = shapeRegistry[type];
        
        if (config) {
            new config.class(config.canvasId, params);
        } else {
            console.warn(`Неизвестный тип фигуры: ${type}`);
        }
    });
});