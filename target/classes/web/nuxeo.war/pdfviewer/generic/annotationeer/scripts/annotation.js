MeasurementType.prototype = {

}

function MeasurementType() {
    this.id = 0;
    this.name = '';
}

function Comment() {
    this.id = 0;
    this.username = username;
    this.dateCreated = new Date();
    this.comment = '';
    this.parentId = 0;
    this.annotationId = 0;
    this.modified = Default.SAVE_ALL_ANNOTATIONS_ONE_TIME ? 'insert' : '';
}

DrawingPosition.prototype = {

    rotate: function(canvas, angle, scale) {
        var bx = this.origX * scale;
        var by = this.origY * scale;

        if (angle == 90) {
            this.x = canvas.height - by;
            this.y = bx;
        }
        else if (angle == 270) {
            this.x = by;
            this.y = canvas.width - bx;
        }
        else if (angle == 180) {
            this.x = canvas.height - bx;
            this.y = canvas.width - by;
        }
        else {
            this.x = bx;
            this.y = by;
        }
    },

    calculateOrigPosition: function(canvas, angle, scale, useDisplayCoordinate) {
        console.log('DrawingPosition.calculateOrigPosition()');
        var x = useDisplayCoordinate ? this.x : this.origX;
        var y = useDisplayCoordinate ? this.y : this.origY;

        if (x < 0) {
            this.x = x = 1;
        }
        else if (x >= canvas.width) {
            this.x = x = canvas.width - 1;
        }

        if (y < 0) {
            this.y = y = 1;
        }
        else if (y >= canvas.height) {
            this.y = y = canvas.height - 1;
        }

        if (angle == 90) {
            this.origX = y / scale;
            this.origY = Math.ceil((canvas.width - x) / scale);
        }
        else if (angle == 180) {
            this.origX = Math.ceil((canvas.width - x) / scale);
            this.origY = Math.ceil((canvas.height - y) / scale);
        }
        else if (angle == 270) {
            this.origX = Math.ceil((canvas.height - y) / scale);
            this.origY = x / scale;
        }
        else {
            this.origX = x / scale;
            this.origY = y / scale;
        }

        this.lastX = 0;
        this.lastY = 0;
    }

};

DrawingPosition.createFromJSON = function(json){
    if (typeof json === 'string')
        json = JSON.parse(json);

    var obj = new DrawingPosition();

    for (var key in json) {
        obj[key] = json[key];
    }
    return obj;
};

function DrawingPosition() {
    this.id = 0;

    this.x = 0;
    this.y = 0;
    this.origX = 0;
    this.origY = 0;

    /**
     * Used to store values if point is moved
     * @type {number}
     */
    this.lastX = 0;
    this.lastY = 0;
}

function HighlightTextRect() {
    this.id = 0;

    this.origLeft;
    this.origTop;
    this.origRight;
    this.origBottom;
    this.origWidth;
    this.origHeight;

    this.left;
    this.top;
    this.right;
    this.bottom;
    this.width;
    this.height;

    // This indicates the angle of the text in the PDF when
    // in portrait mode.
    this.domRotateAngle = 0;
}

HighlightTextRect.prototype = {

    rotate: function(canvas, angle, scale) {
        var bLeft = parseFloat(this.origLeft) * scale;
        var bTop = parseFloat(this.origTop) * scale;
        var bRight = parseFloat(this.origRight) * scale;
        var bBottom = parseFloat(this.origBottom) * scale;
        var bWidth = parseFloat(this.origWidth) * scale;
        var bHeight = parseFloat(this.origHeight) * scale;

        if (angle == 90) {
            this.left = canvas.width - bTop - bHeight;
            this.top = bLeft;
            this.height = bWidth;
            this.width = bHeight;
            this.right = this.left + this.width;
            this.bottom = this.top + this.height;
        }
        else if (angle == 270) {
            this.left = bTop;
            this.top = canvas.height - bLeft - bWidth;
            this.height = bWidth;
            this.width = bHeight;
            this.right = this.left + this.width;
            this.bottom = this.top + this.height;
        }
        else if (angle == 180) {
            this.left = canvas.width - bLeft - bWidth;
            this.top = canvas.height - bTop - bHeight;
            this.width = bWidth;
            this.height = bHeight;
            this.right = this.left + this.width;
            this.bottom = this.top + this.height;
        }
        else {
            this.left = bLeft;
            this.top = bTop;
            this.right = bRight;
            this.bottom = bBottom;
            this.width = bWidth;
            this.height = bHeight;
        }
    },

    calculateOrigBound: function(canvas, angle, scale) {
        console.log('HighlightTextRect.calculateOrigBound()');
        var x = this.left;
        var y = this.top;
        var w = this.width;
        var h = this.height;

        if (angle == 90) {
            this.origLeft = y / scale;
            this.origTop = Math.ceil((canvas.width - (x + w)) / scale);
            this.origWidth = h / scale;
            this.origHeight = w / scale;
        }
        else if (angle == 180) {
            this.origLeft = Math.ceil((canvas.width - (x + w)) / scale);
            this.origTop = Math.ceil((canvas.height - (y + h)) / scale);
            this.origWidth = w / scale;
            this.origHeight = h / scale;
        }
        else if (angle == 270) {
            this.origLeft = Math.ceil((canvas.height - (y + h)) / scale);
            this.origTop = x / scale;
            this.origWidth = h / scale;
            this.origHeight = w / scale;
        }
        else {
            this.origLeft = x / scale;
            this.origTop = y / scale;
            this.origWidth = w / scale;
            this.origHeight = h / scale;
        }

        this.origRight = this.origLeft + this.origWidth;
        this.origBottom = this.origTop + this.origHeight;
    },

    setDomRotateAngle: function(elementAngle, pdfViewerAngle) {
        this.domRotateAngle = elementAngle - pdfViewerAngle;
    },

    getAngleBasedOnDomRotateAngle: function(angle) {
        var angle = this.domRotateAngle + angle;
        angle = angle % 360;
        if (angle < 0) {
            angle += 360;
        }

        return  angle;
    },

    toString: function() {
        return '{ left: ' + this.origLeft + ', top: ' + this.origTop + ', width: ' + this.origWidth + ', ' + ', height: ' + this.origHeight + '}';
    }

};

HighlightTextRect.createFromJSON = function(json){
    if (typeof json === 'string')
        json = JSON.parse(json);

    var obj = new HighlightTextRect();

    for (var key in json) {
        obj[key] = json[key];
    }
    return obj;
};

function AnnotationSelectionHandle() {
    this.x = 0;
    this.y = 0;
}

AnnotationSelectionHandle.prototype = {

};

function Annotation() {
    console.log('Annotation()');
    this.id = 0;

    // this is used for display purposes in the canvas
    this.x = 0;
    this.y = 0;
    this.w = 1;
    this.h = 1;

    // this will be used to store original annotations for easy scaling
    this.origX = 0;
    this.origY = 0;
    this.origW = 1;
    this.origH = 1;

    this.pageIndex = -1;
    // These are needed to calculate exact position when exported to PDF using iText
    this.pageWidth = 0;
    this.pageHeight = 0;

    this.annotationType = -1;

    this.clicked = false;
    this.moving = false;
    this.selected = false;
    // This property will depend on the value retrieved from the database.
    this.readOnly = false;
    /**
     * This is used if Default.SAVE_ALL_ANNOTATIONS_ONE_TIME is true. Values
     * can be modified or deleted for update and deletion as well as insert
     * for new entry.
     *
     * Values are either insert, update, delete. If insert, set id to 0 so
     * the server will treat it as a new entry.
     */
    this.modified = Default.SAVE_ALL_ANNOTATIONS_ONE_TIME ? 'insert' : '';

    /**
     * This is used to identify that this kind of annotation is not the final one being saved. This
     * should indicate that the annotation is still in creation stage while this variable is true.
     * @type {boolean}
     */
    this.dummy = false;
    this.tooltip;

    /**
     * Circle type annotation will have its own x, y coordinate stored
     * because the x, y, w, h will still be used when annotation is
     * moved or resize.
     */
    // Used as starting point when creating circle
    this.circleStartX = 0;
    this.circleStartY = 0;
    // Track latest x, y coordinate
    this.circleLastX = 0;
    this.circleLastY = 0;

    /**
     * Holds the 8 tiny boxes that will be our selection handles
     * the selection handles will be in this order:
     * 0  1  2
     * 3     4
     * 5  6  7
     */
    this.selectionHandles = [];
    for (var i=0; i<Default.ANNOTATION_SELECTION_MAX_POINTS; i++) {
        var rect = new AnnotationSelectionHandle;
        this.selectionHandles.push(rect);
    }


    // used if annotation type is TYPE_TEXT
    this.text = '';
    this.fontSize = Default.FONT_SIZE;
    this.font = Default.FONT_TYPE;

    // Used if annotation type is Annotation.MEASUREMENT_DISTANCE
    this.measurementType = Default.ANNOTATION_MEASUREMENT_TYPE_DEFAULT;

    /**
     * If false, then calculate width and height. Used by Annotation.TYPE_TEXT.
     * @type {boolean}
     */
    this.hasDimension = false;

    // used if annotation type is TYPE_TEXT_HIGHLIGHT
    this.highlightTextRects = [];

    // used if annotation type is TYPE_DRAWING
    this.drawingPositions = [];

    this.color = Default.DRAW_COLOR_FOREGROUND;
    this.backgroundColor = Default.DRAW_COLOR_BACKGROUND;

    // used to assign stamp image or custom icon
    this.icon = new Image();
    // Used to hold the image path and file to be assigned to Image variable
    this.iconSrc = '';

    // Used to hold recorded audio data for playing
    this.audio;
    /**
     * Used to indicate that this annotation has an audio associated with it but not
     * downloaded yet due to it being an existing annotation from the server so if the
     * user decides to listen on the audio, it will check if this is true then will
     * download the audio from the server before assigning it to the audio property.
     */
    this.audioAvailable;

    this.docId = currentDocument.documentId;
    // Comments by users for this annotation
    this.comments = [];
    this.comments.push(new Comment());
}

Annotation.prototype = {

    draw: function(context, angle, scale) {
        if (this.drawingPositions.length == 0 && (this.x + this.w < 0 || this.y + this.h < 0))
            return;

        /**
         * We do the background fill for Annotation.TYPE_TEXT because we can set opacity here while doing it
         * in CSS with just the hex value of the color is not possible.
         */
        if (this.annotationType == Annotation.TYPE_HIGHLIGHT) {
            var rgbColor = hexToRgb(this.backgroundColor);
            context.fillStyle = 'rgba(' + rgbColor.r + ', ' + rgbColor.g + ', ' + rgbColor.b + ', ' + Default.FILL_OPACITY + ')';
            context.fillRect(this.x, this.y, this.w, this.h);
        }
        else if (this.annotationType == Annotation.TYPE_BOX || this.annotationType == Annotation.TYPE_SCREENSHOT) {
            if (this.annotationType == Annotation.TYPE_SCREENSHOT) {
                context.fillStyle = Default.SCREENSHOT_FILL_COLOR;
                context.fillRect(this.x, this.y, this.w, this.h);
            }

            context.lineWidth = Default.ANNOTATION_BOX_LINEWIDTH;
            context.strokeStyle = this.annotationType == Annotation.TYPE_SCREENSHOT ? Default.SCREENSHOT_BORDER_COLOR : this.color;
            context.strokeRect(this.x, this.y, this.w, this.h);
        }
        else if (this.annotationType == Annotation.TYPE_CIRCLE_FILL || this.annotationType == Annotation.TYPE_CIRCLE_STROKE) {
            /**
             * http://jsfiddle.net/AbdiasSoftware/37vge/
             * If circleStartX and other circle variables have values, that means user is creating or resizing it.
             * If no value is assigned, use the x, y, w, h values to calculate the values of the circle variables.
             */
            var radiusX = (this.circleLastX > 0 ? this.circleLastX - this.circleStartX : (this.x + this.w) - this.x) * 0.5,
                radiusY = (this.circleLastY > 0 ? this.circleLastY - this.circleStartY : (this.y + this.h) - this.y) * 0.5,
                centerX = (this.circleStartX > 0 ? this.circleStartX : this.x) + radiusX,
                centerY = (this.circleStartY > 0 ? this.circleStartY : this.y) + radiusY,
                step = 0.01,
                pi2 = Math.PI * 2 - step;

            context.beginPath();
            context.moveTo(centerX + radiusX * Math.cos(0), centerY + radiusY * Math.sin(0));

            for(var a=step; a<pi2; a+=step) {
                context.lineTo(centerX + radiusX * Math.cos(a), centerY + radiusY * Math.sin(a));
            }

            context.closePath();

            if (this.annotationType == Annotation.TYPE_CIRCLE_FILL) {
                var rgbColor = hexToRgb(this.backgroundColor);
                context.fillStyle = 'rgba(' + rgbColor.r + ', ' + rgbColor.g + ', ' + rgbColor.b + ', ' + Default.FILL_OPACITY + ')';
                context.fill();
            }
            else {
                // Use 3 digit hex color code because small ellipse curve is not smooth if 6 digit is used. No idea why.
                context.lineWidth = Default.ANNOTATION_BOX_LINEWIDTH;
                context.strokeStyle = getShortHexColorCode(this.color);
                context.stroke();
            }
        }
        else if (this.annotationType == Annotation.TYPE_STICKY_NOTE ||
            this.annotationType == Annotation.TYPE_AUDIO ||
            this.annotationType == Annotation.TYPE_STAMP)
        {
            var x, y;
            var w = this.w;
            var h = this.h;

            switch (angle) {
                case 90:
                    x = this.x + this.w;
                    y = this.y;
                    w = this.h;
                    h = this.w;
                    break;
                case 180:
                    x = this.x + this.w;
                    y = this.y + this.h;
                    break;
                case 270:
                    x = this.x;
                    y = this.y + this.h;
                    w = this.h;
                    h = this.w;
                    break;
            }

            if (angle != 0) {
                if (this.annotationType == Annotation.TYPE_STAMP) {
                    context.save();
                    context.translate(x, y);
                    context.rotate(angle * Math.PI / 180);
                    context.drawImage(this.icon, 0, 0, w, h);
                    context.restore();
                }
                else {
                    changeColorOfDrawnImage(context, this.icon, '#000000', x, y, w, h, angle * Math.PI / 180);
                }
            }
            else {
                if (this.icon != null && this.annotationType == Annotation.TYPE_STAMP) {
                    context.drawImage(this.icon, this.x, this.y, this.w, this.h);
                }
                else {
                    changeColorOfDrawnImage(context, this.icon, '#000000', this.x, this.y, this.w, this.h);
                }
            }
        }

        /**
         * Always call beginPath() first, then closePath() after or else other shapes that needs only to be filled
         * will have stroke values included. These calls will restrict the styling to this shape only.
         */
        else if (this.annotationType == Annotation.TYPE_ARROW || this.annotationType == Annotation.TYPE_MEASUREMENT_DISTANCE) {
            if (this.drawingPositions.length == 0)
                return;

            var distance = getDistance(this.drawingPositions[0].x, this.drawingPositions[0].y,
                this.drawingPositions[1].x, this.drawingPositions[1].y);
            var angle = getAngle(this.drawingPositions[0].x, this.drawingPositions[0].y,
                this.drawingPositions[1].x, this.drawingPositions[1].y, false);

            context.beginPath();
            context.moveTo(this.drawingPositions[0].x, this.drawingPositions[0].y);

            var point1 = null;
            var point2 = null;
            // Adjust line so that its end point will not be visible protruding with the arrowhead
            if (distance > (Default.ARROW_SIZE * scale) * 2 * (this.annotationType == Annotation.TYPE_MEASUREMENT_DISTANCE ? 2 : 1)) {
                // Adjust first point if type is MEASUREMENT to give way to arrow head
                if (this.annotationType == Annotation.TYPE_MEASUREMENT_DISTANCE) {
                    point1 = getPointFromDistance(this.drawingPositions[0].x, this.drawingPositions[0].y, angle, Default.ARROW_SIZE * scale);
                    context.moveTo(point1.x, point1.y);
                }

                point2 = getPointFromDistance(this.drawingPositions[0].x, this.drawingPositions[0].y, angle, distance - (Default.ARROW_SIZE * scale));
                context.lineTo(point2.x, point2.y);
            }
            else
                context.lineTo(this.drawingPositions[1].x, this.drawingPositions[1].y);

            context.lineWidth = Default.DRAW_WIDTH * scale;
            context.strokeStyle = this.color;
            context.stroke();

            if (!Default.ANNOTATION_MEASUREMENT_DISTANCE_MINIMUM_LENGTH ||
                distance > (Default.ARROW_SIZE * scale) * 2 * (this.annotationType == Annotation.TYPE_MEASUREMENT_DISTANCE ? 2 : 1))
                drawWithArrowheads(context, this.drawingPositions[0].x, this.drawingPositions[0].y,
                    this.drawingPositions[1].x, this.drawingPositions[1].y, scale,
                    this.annotationType == Annotation.TYPE_MEASUREMENT_DISTANCE, this.color);

            // Draw measurement label
            if (this.annotationType == Annotation.TYPE_MEASUREMENT_DISTANCE &&
                (!Default.ANNOTATION_MEASUREMENT_DISTANCE_MINIMUM_LENGTH || !this.isArrowNotLongEnough(scale)))
            {
                var font = (Default.ANNOTATION_MEASUREMENT_DISTANCE_LABEL_FONT_SIZE * scale) + Default.FONT_SIZE_TYPE + ' ' + this.font;
                var padding = 10 * scale;
                var gap = 10 * scale;
                var origDistance = getDistance(this.drawingPositions[0].origX, this.drawingPositions[0].origY,
                    this.drawingPositions[1].origX, this.drawingPositions[1].origY);
                if (!point1) point1 = this.drawingPositions[0];
                if (!point2) point2 = this.drawingPositions[1];
                drawLabelOnTopOfLine(context, getMeasurementFromPixels(this.measurementType, origDistance),
                    point1, point2, gap, font, this.color, 'center', padding);
            }
        }
        else if (this.annotationType == Annotation.TYPE_MEASUREMENT_AREA) {
            // http://stackoverflow.com/questions/34853113/drawing-multiple-polygons-in-js

            context.strokeStyle = this.color;
            context.lineWidth = Default.DRAW_WIDTH * scale;
            context.beginPath();

            for (var i=0; i<this.drawingPositions.length; i++) {
                if (i == 0)
                    context.moveTo(this.drawingPositions[i].x, this.drawingPositions[i].y);
                else
                    context.lineTo(this.drawingPositions[i].x, this.drawingPositions[i].y);
            }

            if (!this.dummy)
                context.closePath();

            context.stroke();
        }
        else if (this.annotationType == Annotation.TYPE_DRAWING) {
            // We place selected code here because we fill a wider drawing to represent the selection color
            if (this.selected) {
                for (var p=0; p<this.drawingPositions.length; p++) {
                    if (p == 0) {
                        context.moveTo(this.drawingPositions[p].x, this.drawingPositions[p].y);
                        context.beginPath();
                    }

                    context.lineWidth = (Default.DRAW_WIDTH + 1) * scale
                    context.lineTo(this.drawingPositions[p].x, this.drawingPositions[p].y);
                    context.strokeStyle = p % 2 == 0 ? this.color : 'black';
                    context.stroke();
                }
            }

            Page.prototype.initializeDrawingConfig(context, this);
            for (var p=0; p<this.drawingPositions.length; p++) {
                if (p == 0) {
                    context.moveTo(this.drawingPositions[p].x, this.drawingPositions[p].y);
                    context.beginPath();
                }

                context.lineTo(this.drawingPositions[p].x, this.drawingPositions[p].y);
                context.stroke();
            }
        }

        // Draw selection
        // This is a stroke along the box and also 8 new selection handles
        if (this.selected) {
            if (this.isSelectableTextType()) {
                $('div[id=highlight' + this.id + ']').each(function() {
                    $(this).css('border', Default.ANNOTATION_SELECTION_BOX_COLOR_TYPE_TEXT);
                });
            }
            else if (this.drawingPositions.length > 0 && this.annotationType != Annotation.TYPE_DRAWING) {
                var half = (Default.ANNOTATION_SELECTION_BOX_SIZE / 2) * scale;

                for (var d=0; d<this.drawingPositions.length; d++) {
                    this.selectionHandles[d].x = this.drawingPositions[d].x - half;
                    this.selectionHandles[d].y = this.drawingPositions[d].y - half;
                    this.selectionHandles[d].x = this.drawingPositions[d].x - half;
                    this.selectionHandles[d].y = this.drawingPositions[d].y - half;
                }

                context.fillStyle = Default.ANNOTATION_SELECTION_BOX_COLOR;
                var length = this.annotationType == Annotation.TYPE_MEASUREMENT_AREA ? this.drawingPositions.length :
                    this.selectionHandles.length;
                for (var i=0; i<length; i++) {
                    if (this.annotationType != Annotation.TYPE_MEASUREMENT_AREA && i > 1)
                        continue;

                    var cur = this.selectionHandles[i];
                    context.fillRect(cur.x, cur.y, Default.ANNOTATION_SELECTION_BOX_SIZE * scale, Default.ANNOTATION_SELECTION_BOX_SIZE * scale);
                }
            }
            else {
                context.strokeStyle = Default.ANNOTATION_SELECTED_COLOR;
                context.lineWidth = Default.ANNOTATION_SELECTED_LINEWIDTH;
                context.strokeRect(this.x, this.y, this.w, this.h);

                if (!this.isResizable())
                    return;

                // Draw the boxes
                var half = (Default.ANNOTATION_SELECTION_BOX_SIZE / 2) * scale;

                // 0  1  2
                // 3     4
                // 5  6  7

                // Top left, middle, right
                this.selectionHandles[0].x = this.x - half;
                this.selectionHandles[0].y = this.y - half;

                this.selectionHandles[1].x = this.x + this.w / 2 - half;
                this.selectionHandles[1].y = this.y - half;

                this.selectionHandles[2].x = this.x + this.w - half;
                this.selectionHandles[2].y = this.y - half;

                // Middle left
                this.selectionHandles[3].x = this.x - half;
                this.selectionHandles[3].y = this.y + this.h / 2 - half;

                // Middle right
                this.selectionHandles[4].x = this.x + this.w - half;
                this.selectionHandles[4].y = this.y + this.h / 2 - half;

                // Bottom left, middle, right
                this.selectionHandles[6].x = this.x + this.w / 2 - half;
                this.selectionHandles[6].y = this.y + this.h - half;

                this.selectionHandles[5].x = this.x - half;
                this.selectionHandles[5].y = this.y + this.h - half;

                this.selectionHandles[7].x = this.x + this.w - half;
                this.selectionHandles[7].y = this.y + this.h - half;

                context.fillStyle = Default.ANNOTATION_SELECTION_BOX_COLOR;
                for (var i=0; i<this.selectionHandles.length; i++) {
                    var cur = this.selectionHandles[i];
                    context.fillRect(cur.x, cur.y, Default.ANNOTATION_SELECTION_BOX_SIZE * scale, Default.ANNOTATION_SELECTION_BOX_SIZE * scale);
                }
            }
        }
        else {
            if (this.annotationType == Annotation.TYPE_TEXT_HIGHLIGHT ||
                this.annotationType == Annotation.TYPE_TEXT_UNDERLINE ||
                this.annotationType == Annotation.TYPE_TEXT_STRIKE_THROUGH)
            {
                $('div[id=highlight' + this.id + ']').each(function() {
                    $(this).css('border', '');
                });
            }
        }

    },

    // Custom function to simulate Java's Rect.contains() method, also checks if rectangle was created in reverse (bottom-top)
    contains: function(mouseX, mouseY, e) {
        // If radius is not null, this means this is a tap touch event using finger or stylus
        if (e && e.changedTouches) {
            var circle = {
                x: mouseX,
                y: mouseY,
                r: e.changedTouches[0].radiusX
            };

            var rect = {
                x: this.x,
                y: this.y,
                w: this.w,
                h: this.h
            };

            return isRectCircleColliding(circle, rect);
        }
        else
            return (
               ((mouseX >= this.x && mouseX <= this.x + this.w) || (mouseX <= this.x && mouseX >= this.x + this.w)) &&
               ((mouseY >= this.y && mouseY <= this.y + this.h) || (mouseY <= this.y && mouseY >= this.y + this.h))
            );
    },

    /**
     * When this gets called, the canvas width/height does not reflect the new value(). used by rotateRight()
     * and rotateLeft(). in setScale(), the canvas size reflects its new value. The 3rd parameter
     * is made available in case the canvas size reflects the latest size so the 3rd parameter will be used.
     */
    rotate: function(canvas, angle, scale) {
        var bx = this.origX * scale;
        var by = this.origY * scale;
        var bw = this.origW * scale;
        var bh = this.origH * scale;

        if (angle == 90) {
            this.x = canvas.height - by - bh;
            this.y = bx;
            this.h = bw;
            this.w = bh;
        }
        else if (angle == 270) {
            this.x = by;
            this.y = canvas.width - bx - bw;
            this.h = bw;
            this.w = bh;
        }
        else if (angle == 180) {
            this.x = canvas.height - bx - bw;
            this.y = canvas.width - by - bh;
            this.w = bw;
            this.h = bh;
        }
        else {
            this.x = bx;
            this.y = by;
            this.w = bw;
            this.h = bh;
        }
    },

    /**
     * Works differently from rotate(). We create a temporary DIV with coordinates based on the annotation's properties.
     * However, once this function is called, x,y coordinates will have to be re-adjusted and DIV styles re-assigned for
     * correct positioning and angle rotation.
     * @param angle
     * @param scale
     * @param canvas
     * @param div
     */
    rotateText: function(canvas, angle, scale, div) {
        console.log('Annotation.rotateText()');
        var x = this.origX * scale;
        var y = this.origY * scale;
        var w = this.origW * scale;
        var h = this.origH * scale;

        if (angle == 90) {
            this.x = canvas.height - y - h;
            this.y = x;
            this.h = w;
            this.w = h;
            div.css('left', (this.x + this.w) + 'px');
            div.css('top', this.y + 'px');
            div.css('transform-origin', '0 0');
            div.css('transform', 'rotate(90deg)');
        }
        else if (angle == 270) {
            this.x = y;
            this.y = canvas.width - x - w;
            this.h = w;
            this.w = h;
            div.css('left', this.x + 'px');
            div.css('top', (this.y + this.h) + 'px');
            div.css('transform-origin', '0 0');
            div.css('transform', 'rotate(-90deg)');
        }
        else if (angle == 180) {
            this.x = canvas.height - x - w;
            this.y = canvas.width - y - h;
            this.w = w;
            this.h = h;
            div.css('left', this.x +'px');
            div.css('top', this.y + 'px');
            div.css('transform', 'rotate(180deg)');
        }
        else {
            this.x = x;
            this.y = y;
            this.w = w;
            this.h = h;
        }
    },

    /**
     * This has the same implementation as the rotate() functi0ons of DrawingPosition and HighlightTextRect class.
     * @param angle
     * @param scale
     * @param canvas
     */
    rotatePoint: function(canvas, angle, scale) {
        var bx = this.origX * scale;
        var by = this.origY * scale;

        if (angle == 90) {
            this.x = canvas.height - by;
            this.y = bx;
        }
        else if (angle == 270) {
            this.x = by;
            this.y = canvas.width - bx;
        }
        else if (angle == 180) {
            this.x = canvas.height - bx;
            this.y = canvas.width - by;
        }
        else {
            this.x = bx;
            this.y = by;
        }
    },

    toString: function() {
        return 'id: ' + this.id + ', rect[' + this.x + ', ' + this.y + ', ' + this.w + ', '+ this.h + '] orig:[' + this.origX + ', ' + this.origY + ', ' + this.origW + ', ' + this.origH + ']';
    },

    /**
     * If highlight or box, get the text that is within the bounds
     */
    getTextBelowIt: function(annotation) {
        var div = $('#pageContainer' + (this.pageIndex + 1) + ' > .textLayer');
        var divs = $(div).children();
        var buffer = '';

        divs.each(function(index) {
            var x = parseFloat($(this).css('left'));
            var y = parseFloat($(this).css('top'));
            var w = parseFloat($(this).attr('data-canvas-width'));
            var h = parseFloat($(this).height());

            if (Annotation.prototype.intersects(x, y, w, h)) {
                var divSpan = $(this);
                var origHtml = divSpan.html();

                divSpan.html(function (i, html) {
                    var chars = $.trim(html).split("");
                    return '<span ccinfo="true">' + chars.join('</span><span ccinfo="true">') + '</span>';
                });

                var letterBuffer = '';

                $(divSpan).find('span[ccinfo="true"]').each(function() {
                    if (annotation.intersects($(this).offset().left - div.offset().left, $(this).offset().top - div.offset().top, $(this).width(), $(this).height()))
                    {
                        letterBuffer += $(this).text();
                    }
                });

                divSpan.html(origHtml);

                if (letterBuffer.length > 0) {
                    buffer += letterBuffer;

                    if (index + 1 <= divs.length - 1 && parseFloat(divs.eq(index).css('top')) != parseFloat(divs.eq(index + 1).css('top'))) {
                        buffer += '\\n';
                    }
                }
            }
        });

        return buffer;
    },

    intersects: function(x2, y2, w2, h2) {
       return !(this.x > x2 + w2 || this.x + this.w < x2 || this.y > y2 + h2 || this.y + this.h < y2);
    },

    /**
     * For use if annotation has bounds.
     * @param angle
     * @param canvas
     * @param useDisplayCoordinate
     */
    calculateOrigBound: function(canvas, angle, scale, useDisplayCoordinate) {
        var x = useDisplayCoordinate ? this.x : this.origX;
        var y = useDisplayCoordinate ? this.y : this.origY;
        var w = useDisplayCoordinate ? this.w : this.origW;
        var h = useDisplayCoordinate ? this.h : this.origH;

        /**
         * Set the page dimension details so that this can be adjusted when the annotation
         * will be exported to PDF using iText.
         */
        this.pageWidth = parseInt(canvas.width / scale);
        this.pageHeight = parseInt(canvas.height / scale);

        /**
         * For annotations that have images in them, switch the width and height if angle is 90 or 270 degrees
         */
        if (this.icon.src && !useDisplayCoordinate && (angle == 90 || angle == 270)) {
            var temp = w;
            w = h;
            h = temp;
        }

        // Location of annotation must be within the canvas area
        if (x < 0) {
            this.x = x = 1;
        }
        else if (x + w >= canvas.width) {
            this.x = x = canvas.width - w - 1;
        }

        if (y < 0) {
            this.y = y = 1;
        }
        else if (y + h >= canvas.height) {
            this.y = y = canvas.height - h - 1;
        }

        if (angle == 90) {
            this.origX = y / scale;
            this.origY = Math.ceil((canvas.width - (x + w)) / scale);
            this.origW = h / scale;
            this.origH = w / scale;
        }
        else if (angle == 180) {
            this.origX = Math.ceil((canvas.width - (x + w)) / scale);
            this.origY = Math.ceil((canvas.height - (y + h)) / scale);
            this.origW = w / scale;
            this.origH = h / scale;
        }
        else if (angle == 270) {
            this.origX = Math.ceil((canvas.height - (y + h)) / scale);
            this.origY = x / scale;
            this.origW = h / scale;
            this.origH = w / scale;
        }
        else {
            this.origX = x / scale;
            this.origY = y / scale;
            this.origW = w / scale;
            this.origH = h / scale;
        }

        if (this.isResizable()) {
            // Annotation width and height should be minimum 5 pixel / scale
            var MIN_SIDE = 10;
            this.origW = Math.abs(this.origW) < MIN_SIDE ? MIN_SIDE : this.origW;
            this.origH = Math.abs(this.origH) < MIN_SIDE ? MIN_SIDE : this.origH;
            this.w = Math.abs(w) < MIN_SIDE * scale ? MIN_SIDE * scale : w;
            this.h = Math.abs(h) < MIN_SIDE * scale ? MIN_SIDE * scale : h;
        }
        else if (this.annotationType == Annotation.TYPE_TEXT) {
            $('#texts' + (this.id ? this.id : '')).css('left', (this.x + (angle == 90 ? this.w : 0)));
            $('#texts' + (this.id ? this.id : '')).css('top', (this.y + (angle == 270 ? this.h : 0)));
        }

        // Placed this back on because if circle is out of place on right side, its placement is incorrect
        if (this.annotationType == Annotation.TYPE_CIRCLE_FILL || this.annotationType == Annotation.TYPE_CIRCLE_STROKE) {
            this.circleStartX = this.x;
            this.circleStartY = this.y;
            this.circleLastX = this.x + this.w;
            this.circleLastY = this.y + this.h;
        }
    },

    containsHighlightText: function(mouseX, mouseY, e) {
        if (this.highlightTextRects) {
            for (var i=0; i<this.highlightTextRects.length; i++) {
                if (e && e.changedTouches) {
                    var circle = {
                        x: mouseX,
                        y: mouseY,
                        r: e.changedTouches[0].radiusX
                    };

                    var rect = {
                        x: this.highlightTextRects[i].left,
                        y: this.highlightTextRects[i].top,
                        w: this.highlightTextRects[i].width,
                        h: this.highlightTextRects[i].height
                    };

                    return isRectCircleColliding(circle, rect);
                }
                else
                    if (((mouseX >= this.highlightTextRects[i].left && mouseX <= this.highlightTextRects[i].left + this.highlightTextRects[i].width) ||
                        (mouseX <= this.highlightTextRects[i].left && mouseX >= this.highlightTextRects[i].left + this.highlightTextRects[i].width)) &&
                        ((mouseY >= this.highlightTextRects[i].top && mouseY <= this.highlightTextRects[i].top + this.highlightTextRects[i].height) ||
                        (mouseY <= this.highlightTextRects[i].top && mouseY >= this.highlightTextRects[i].top + this.highlightTextRects[i].height)))
                        return true;
            }
        }

        return false;
    },

    getHighlightTextColor: function() {
        return this.backgroundColor;
    },

    toStringHighlightTextCoordinates: function() {
        if (!this.highlightTextRects)
            return null;

        var str = '';
        for (var i=0; i<this.highlightTextRects.length; i++) {
            str += this.highlightTextRects[i].origLeft + ',' + this.highlightTextRects[i].origTop + ',' +
                this.highlightTextRects[i].origWidth + ',' + this.highlightTextRects[i].origHeight + ',';
        }

        return str.length > 0 ? str.substring(0, str.length - 1) : str;
    },

    /**
     * To make it easier to detect if a mouse pointer is within the path of the drawing, we use HTML5 Canvas
     * isPointInStroke(). Doing it manually is hard since a drawing will also take into account its thickness
     * and I have no idea how the inner workings of Canvas.
     * @param ctx Canvas context
     * @param page Page Canvas of PDF
     * @param mouseX Mouse X coordinate
     * @param mouseY Mouse Y coordinate
     * @param closePoints If true, the first and last points will be connected
     * @returns {boolean}
     */
    containsDrawing: function(page, mouseX, mouseY, e) {
        if (!this.drawingPositions || this.drawingPositions.length == 0) {
            return false;
        }

        if (e && e.changedTouches) {
            for (var p=0; p<this.drawingPositions.length; p++) {
                if (isPointInCircle(this.drawingPositions[p].x, this.drawingPositions[p].y,
                    mouseX, mouseY, e.changedTouches[0].radiusX)) {
                    return true;
                }
            }
            return false;
        }

        var cache = document.createElement('canvas');
        cache.height = page.ctx.canvas.height;
        cache.width = page.ctx.canvas.width;

        var cache_ctx = cache.getContext('2d');
        page.initializeDrawingConfig(cache_ctx);

        cache_ctx.beginPath();

        for (var p=0; p<this.drawingPositions.length; p++) {
            if (p == 0)
                cache_ctx.moveTo(this.drawingPositions[p].x, this.drawingPositions[p].y);
            else
                cache_ctx.lineTo(this.drawingPositions[p].x, this.drawingPositions[p].y);

            cache_ctx.stroke();
        }

        try {
            if (this.annotationType == Annotation.TYPE_MEASUREMENT_AREA)
                return cache_ctx.isPointInPath(mouseX, mouseY) || cache_ctx.isPointInStroke(mouseX, mouseY);
            else
                return cache_ctx.isPointInStroke(mouseX, mouseY);
        } catch (e) {
            /**
             * Browser is IE since it does not support isPointInStroke(). Also using
             * isPointInPath() will not work with lines because it needs a shape and
             * a line is just a part of a shape.
             */
            return cache_ctx.isPointInPath(mouseX, mouseY);
        }
    },

    isResizable: function() {
        if (this.isReadOnly())
            return false;

        switch (this.annotationType) {
            case Annotation.TYPE_HIGHLIGHT:
                return true;
            case Annotation.TYPE_BOX:
                return true;
            case Annotation.TYPE_CIRCLE_FILL:
                return true;
            case Annotation.TYPE_CIRCLE_STROKE:
                return true;
            case Annotation.TYPE_STAMP:
                return true;
            case Annotation.TYPE_AUDIO:
                return false;
            case Annotation.TYPE_STICKY_NOTE:
                return false;
            case Annotation.TYPE_DRAWING:
                return false;
            case Annotation.TYPE_TEXT:
                return false;
            case Annotation.TYPE_TEXT_HIGHLIGHT:
                return false;
            case Annotation.TYPE_TEXT_STRIKE_THROUGH:
                return false;
            case Annotation.TYPE_TEXT_UNDERLINE:
                return false;
            case Annotation.TYPE_ARROW:
                return true;
            case Annotation.TYPE_MEASUREMENT_DISTANCE:
                return true;
            case Annotation.TYPE_MEASUREMENT_AREA:
                return true;
        }
    },

    isMovable: function() {
        if (this.isReadOnly())
            return false;

        if (this.annotationType == Annotation.TYPE_DRAWING ||
            this.annotationType == Annotation.TYPE_TEXT_HIGHLIGHT ||
            this.annotationType == Annotation.TYPE_TEXT_STRIKE_THROUGH ||
            this.annotationType == Annotation.TYPE_TEXT_UNDERLINE)
            return false;

        return true;
    },

    isReadOnly: function() {
        return Default.ANNOTATIONS_READ_ONLY || this.readOnly;
    },

    /**
     * A helper function to set the icon source filename when an image or a url with image
     * is assigned. The iconSrc variable will be used in server side to save the filename.
     * @param src
     */
    setIconSource: function(src) {
        if (isImage(src)) {
            this.icon = src;
            this.iconSrc = this.icon.src;
        }
        else {
            this.icon.src = src;
            this.iconSrc = src;
        }
    },

    /**
     * The arrow must have a minimum length.
     * @returns {boolean}
     */
    isArrowNotLongEnough: function(scale) {
        if (!this.drawingPositions || this.drawingPositions.length != 2)
            return false;

        var distance = getDistance(this.drawingPositions[0].x, this.drawingPositions[0].y,
            this.drawingPositions[1].x, this.drawingPositions[1].y);
        return (distance < (Default.ARROW_SIZE * scale) * 2 * (this.annotationType == Annotation.TYPE_MEASUREMENT_DISTANCE ? 2 : 1));
    },

    isSelectableTextType: function() {
        return this.annotationType == Annotation.TYPE_TEXT_HIGHLIGHT ||
            this.annotationType == Annotation.TYPE_TEXT_UNDERLINE ||
            this.annotationType == Annotation.TYPE_TEXT_STRIKE_THROUGH;
    },

    /**
     * Not sure if this will work with self intersecting polygons
     * http://www.techbluff.com/javascript/function-to-calculate-polygon-area/
     */
    getArea: function() {
        if (this.drawingPositions.length == 0)
            return 0;

        // Accumulates area in the loop
        var area = 0;
        // The last vertex is the 'previous' one to the first
        var j = this.drawingPositions.length - 1;

        for (var i=0; i<this.drawingPositions.length; i++) {
            area = area + (this.drawingPositions[j].origX + this.drawingPositions[i].origX) *
                (this.drawingPositions[j].origY - this.drawingPositions[i].origY);
            // j is previous vertex to i
            j = i;
        }
        return getMeasurementFromPixels(this.measurementType, area / 2);
    },

    /**
     * Indicate if annotation has editable properties like background color, foreground color, etc.
     */
    hasEditableProperties: function() {
        return !(this.annotationType == Annotation.TYPE_STAMP ||
            this.annotationType == Annotation.TYPE_STICKY_NOTE ||
            this.annotationType == Annotation.TYPE_AUDIO)
    },

    hasBackgroundColorProperty: function() {
        return this.annotationType == Annotation.TYPE_HIGHLIGHT ||
            this.annotationType == Annotation.TYPE_CIRCLE_FILL ||
            this.annotationType == Annotation.TYPE_TEXT ||
            this.annotationType == Annotation.TYPE_TEXT_HIGHLIGHT;
    },

    hasForegroundColorProperty: function() {
        return this.annotationType == Annotation.TYPE_TEXT ||
            !this.hasBackgroundColorProperty();
    },

    usesMeasurementType: function() {
        return this.annotationType == Annotation.TYPE_MEASUREMENT_AREA ||
            this.annotationType == Annotation.TYPE_MEASUREMENT_DISTANCE;
    },

    /**
     * This function is used to indicate if the mouse cursor is within any of the
     * selection handles' area which also takes into account its radius area where
     * its size can indicate a finger or stylus. Used for touch detection on resize.
     * @param mouseX
     * @param mouseY
     * @returns {boolean}
     */
    getSelectionHandleIndex: function(mouseX, mouseY, radius) {
        var circle = {
            x: mouseX,
            y: mouseY,
            r: radius
        };

        for (var i=0; i<this.selectionHandles.length; i++) {
            var rect = {
                x: this.selectionHandles[i].x,
                y: this.selectionHandles[i].y,
                w: Default.ANNOTATION_SELECTION_BOX_SIZE,
                h: Default.ANNOTATION_SELECTION_BOX_SIZE
            };

            if (isRectCircleColliding(circle, rect))
                return i;

        }
        return -1;
    },

    getTooltip: function() {
        if (this.annotationType == Annotation.TYPE_MEASUREMENT_AREA)
            return this.getArea();
        else {
            var comment = this.comments[0];
            return (comment.comment != '' ? (comment.comment.length > Default.ANNOTATIONS_TOOLTIP_MAX_CHARS ?
            comment.comment.substring(0, Default.ANNOTATIONS_TOOLTIP_MAX_CHARS) + '...' : comment.comment) :
            'No Comment');
        }
    }

};

// http://stackoverflow.com/questions/8111446/turning-json-strings-into-objects-with-methods
Annotation.createFromJSON = function(json){
    if (typeof json === 'string')
        json = JSON.parse(json);

    var obj = new Annotation();

    for (var key in json) {
        if (key == 'drawingPositions') {
            var array = json[key];
            for (var a in array) {
                array[a] = DrawingPosition.createFromJSON(array[a]);
            }
            obj[key] = array;
        }
        else if (key == 'highlightTextRects') {
            var array = json[key];
            for (var a in array) {
                array[a] = HighlightTextRect.createFromJSON(array[a]);
            }
            obj[key] = array;
        }
        else if (key == 'iconSrc') {
            if (json[key] != '') {
                obj.icon = new Image();
                // This may be a url. If so, get the image file name.
                obj.setIconSource('images/' + json[key].split('/').pop());
            }
        }
        else
            obj[key] = json[key];
    }
    return obj;
};

/**
 * 1 : Audio
 * 2 : Highlight
 * 3 : Box
 * 4 : Drawing
 * 5 : Highlighted Text
 * 6 : Text
 * 9 : Sticky Note
 */

Annotation.TYPE_AUDIO = 1;
Annotation.TYPE_HIGHLIGHT = 2;
Annotation.TYPE_BOX = 3;
Annotation.TYPE_DRAWING = 4;
Annotation.TYPE_TEXT_HIGHLIGHT = 5;
Annotation.TYPE_TEXT = 6;
Annotation.TYPE_TEXT_UNDERLINE = 7;
Annotation.TYPE_TEXT_STRIKE_THROUGH = 8;
Annotation.TYPE_STICKY_NOTE = 9;
Annotation.TYPE_CIRCLE_FILL = 10;
Annotation.TYPE_CIRCLE_STROKE = 11;
Annotation.TYPE_STAMP = 12;
Annotation.TYPE_ARROW = 13;
Annotation.TYPE_MEASUREMENT_DISTANCE = 14;
Annotation.TYPE_MEASUREMENT_AREA = 15;
Annotation.TYPE_SCREENSHOT = -9999;
Annotation.TYPE_TEXT_SELECT = 20;

MeasurementType.INCHES = 1;
MeasurementType.CENTIMETERS = 2;
MeasurementType.MILLIMETERS = 3;