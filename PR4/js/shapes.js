class Shape {
    constructor(canvasId, params) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        this.params = params;
        this.color = `hsl(${Math.random() * 360}, 70%, 50%)`;
        
        this.ctx.lineWidth = 4;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        this.init();
        this.draw();
        this.attachEvents();
        
        this.animate();
    }

    init() {}
    draw() {}
    onClick() {}
    
    animate() {
        requestAnimationFrame(() => this.animate());
    }

    attachEvents() {
        this.canvas.addEventListener('click', () => {
            this.onClick();
        });
    }
    
    clear() {
        this.ctx.clearRect(0, 0, this.width, this.height);
    }
    
    lerp(start, end, amt) {
        return (1 - amt) * start + amt * end;
    }
}

class CircleShape extends Shape {
    init() {
        this.x = 175; 
        this.y = 150;
        this.radius = Math.max(20, this.params[2] * 2); 
        this.targetColor = this.color;
    }

    onClick() {
        this.targetColor = `hsl(${Math.random() * 360}, 70%, 50%)`;
    }
    
    animate() {
        const time = Date.now() * 0.002;
        const pulse = Math.sin(time) * 2;
        this.draw(pulse);
        requestAnimationFrame(() => this.animate());
    }

    draw(pulse = 0) {
        this.clear();
        this.ctx.fillStyle = this.targetColor;
        this.ctx.strokeStyle = '#333';
        
        this.ctx.beginPath();
        this.ctx.arc(this.x, this.y, this.radius + pulse, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();
    }
}

class SquareShape extends Shape {
    init() {
        this.baseSize = 200; 
        this.x = (this.width - this.baseSize) / 2;
        this.y = (this.height - this.baseSize) / 2;
        
        this.currentProgress = 0; 
        this.targetProgress = 0;
        this.isBuilding = true;
        this.clickLocked = false;
    }

    onClick() {
        if (this.clickLocked) return;

        if (this.isBuilding) {
            this.targetProgress += 1;
            if (this.targetProgress >= 4) {
                this.isBuilding = false;
            }
        } else {
            this.targetProgress -= 1;
            if (this.targetProgress <= 0) {
                this.isBuilding = true;
            }
        }
        this.clickLocked = true;
    }
    
    animate() {
        const speed = 0.1;
        let needsDraw = false;
        
        if (Math.abs(this.currentProgress - this.targetProgress) > 0.001) {
            this.currentProgress = this.lerp(this.currentProgress, this.targetProgress, speed);
            needsDraw = true;
        } else {
            this.currentProgress = this.targetProgress;
            if (this.clickLocked) {
                this.clickLocked = false;
                needsDraw = true;
            }
        }
        
        if (needsDraw) {
            this.draw();
        }
        
        requestAnimationFrame(() => this.animate());
    }

    draw() {
        this.clear();
        this.ctx.strokeStyle = this.color;
        
        const { x, y } = this;
        const size = this.baseSize;

        const p1 = { x: x, y: y };
        const p2 = { x: x + size, y: y };
        const p3 = { x: x + size, y: y + size };
        const p4 = { x: x, y: y + size };
        const points = [p1, p2, p3, p4, p1];

        for (let i = 0; i < 4; i++) {
            let progress = 0;
            
            if (this.currentProgress >= i + 1) {
                progress = 1;
            } else if (this.currentProgress > i) {
                progress = this.currentProgress - i;
            } else {
                progress = 0;
            }

            if (progress > 0) {
                this.ctx.beginPath();
                this.ctx.moveTo(points[i].x, points[i].y);
                this.ctx.lineTo(
                    this.lerp(points[i].x, points[i+1].x, progress),
                    this.lerp(points[i].y, points[i+1].y, progress)
                );
                this.ctx.stroke();
            }
        }
        
        const completedSides = Math.floor(this.currentProgress);
        this.ctx.fillStyle = '#333';
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'center';
        const statusText = `${completedSides} из 4 сторон`;
        this.ctx.fillText(statusText, this.width/2, this.height - 20);
    }
}

class EllipseShape extends Shape {
    init() {
        this.x = 175;
        this.y = 150;
        this.radiusX = 80;
        this.radiusY = 50;
        this.targetColor = this.color;
    }

    onClick() {
        this.targetColor = `hsl(${Math.random() * 360}, 70%, 50%)`;
    }
    
    animate() {
        this.draw();
        requestAnimationFrame(() => this.animate());
    }

    draw() {
        this.clear();
        this.ctx.fillStyle = this.targetColor;
        this.ctx.strokeStyle = '#333';

        this.ctx.beginPath();
        this.ctx.ellipse(this.x, this.y, this.radiusX, this.radiusY, 0, 0, 2 * Math.PI);
        this.ctx.fill();
        this.ctx.stroke();
    }
}

class BezierShape extends Shape {
    init() {
        this.start = { x: 50, y: 150 };
        this.end = { x: 300, y: 150 };
        
        this.offset = 150; 
        this.currentOffset = this.offset;
        this.targetOffset = this.offset;
        
        this.isAnimating = true;
    }

    onClick() {
        this.targetOffset = -this.targetOffset;
        this.color = `hsl(${Math.random() * 360}, 70%, 50%)`;
    }
    
    animate() {
        const speed = 0.05;
        if (Math.abs(this.currentOffset - this.targetOffset) > 0.1) {
            this.currentOffset = this.lerp(this.currentOffset, this.targetOffset, speed);
            this.draw();
        }
        requestAnimationFrame(() => this.animate());
    }

    draw() {
        this.clear();
        this.ctx.strokeStyle = this.color;
        this.ctx.lineWidth = 4;

        const centerY = (this.start.y + this.end.y) / 2;
        const cp1 = { x: 125, y: centerY - this.currentOffset };
        const cp2 = { x: 225, y: centerY - this.currentOffset };

        this.ctx.beginPath();
        this.ctx.moveTo(this.start.x, this.start.y);
        this.ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, this.end.x, this.end.y);
        this.ctx.stroke();

        this.ctx.setLineDash([5, 5]);
        this.ctx.lineWidth = 1;
        this.ctx.strokeStyle = '#ccc';
        
        this.ctx.beginPath();
        this.ctx.moveTo(this.start.x, this.start.y);
        this.ctx.lineTo(cp1.x, cp1.y);
        this.ctx.lineTo(cp2.x, cp2.y);
        this.ctx.lineTo(this.end.x, this.end.y);
        this.ctx.stroke();
        
        this.ctx.setLineDash([]);
    }
}