// based on http://simonsarris.com/blog/225-canvas-selecting-resizing-shape

function Page() {
    // holds all annotations per canvas
    this.canvasAnnotations = [];
    // page index number
    this.pageIndex = -1;

    // mouse coordinates
    this.mx;
    this.my;

    // Canvas
    this.canvas;
    // Canvas graphics context
    this.ctx;

    // We use a fake canvas to draw individual shapes for selection testing
    this.ghostcanvas;
    // Fake canvas context
    this.gctx;

    /**
     * Since we can drag from anywhere in a node instead of just its x/y corner, we need to save
     * the offset of the mouse when we start dragging.
     */
    this.offsetX;
    this.offsetY;

    // Padding and border style widths for mouse offsets
    this.stylePaddingLeft;
    this.stylePaddingTop;
    this.styleBorderLeft;
    this.styleBorderTop;

    // annotation object to represent screen shot dimensions
    this.screenshotAnnotation;

    // Drawing should only be limited within the page's canvas
    this.isDrawing = false;

    // Creating annotation should be limited within the page's canvas
    this.isCreatingAnnotation = false;
};

/**
 * Initialize our canvas, add a ghost canvas, set draw loop
 * then add everything we want to initially exist on the canvas
 */
Page.prototype.init = function(canvasIdName) {
    this.canvas = document.getElementById(canvasIdName);

    this.ctx = this.canvas.getContext('2d');
    this.ghostcanvas = document.createElement('canvas');
    this.ghostcanvas.height = this.canvas.height;
    this.ghostcanvas.width = this.canvas.width;

    this.gctx = this.ghostcanvas.getContext('2d');

    // Fixes a problem where double clicking causes text to get selected on the canvas
    this.canvas.onselectstart = function() { return false; }

    // Fixes mouse co-ordinate problems when there's a border or padding
    // See getMouse for more details
    if (document.defaultView && document.defaultView.getComputedStyle) {
        this.stylePaddingLeft = parseInt(document.defaultView.getComputedStyle(this.canvas, null)['paddingLeft'], 10)     || 0;
        this.stylePaddingTop  = parseInt(document.defaultView.getComputedStyle(this.canvas, null)['paddingTop'], 10)      || 0;
        this.styleBorderLeft  = parseInt(document.defaultView.getComputedStyle(this.canvas, null)['borderLeftWidth'], 10) || 0;
        this.styleBorderTop   = parseInt(document.defaultView.getComputedStyle(this.canvas, null)['borderTopWidth'], 10)  || 0;
    }

    // set our events. Up and down are for dragging,
    // double click is for making new boxes
    var self = this;

    if (hasTouch()) {
        this.canvas.addEventListener('touchstart', function(e) {
            self.mouseDown(e, self, true);
        });

        this.canvas.addEventListener('touchmove', function(e) {
            self.mouseMove(e, self, true);
        });

        this.canvas.addEventListener('touchend', function(e) {
            self.mouseUp(e, self);
            e.preventDefault();
        });

        var self = this;
        $(this.canvas).on('taphold', function(e) {
            if (startDraw || startCreatingAnnotation)
                return;

            if (selectedAnnotations && selectedAnnotations.length == 1) {
                displayAnnotationMenu(selectedAnnotations[0], self.mx, self.my);
            }

            e.preventDefault();
        });
    }

    this.canvas.onmousedown = function(e) {
        self.mouseDown(e, self);
    }

    this.canvas.onmousemove = function(e) {
        self.mouseMove(e, self);
    };

    this.canvas.onmouseup = function(e) {
        self.mouseUp(e, self);
    };

    // disable browser context menus in canvas, so only annotation popup menu will appear
    this.canvas.oncontextmenu = function(e) {
        e.preventDefault();
        return false;
    }
}

// Wipes the canvas context
Page.prototype.clear = function(c) {
    c.clearRect(0, 0, $(this.canvas).width(), $(this.canvas).height());
}

Page.prototype.mainDraw = function() {

    this.clear(this.ctx);

    if (Default.WATERMARK_SHOW)
       this.showWatermark(false);
       //this.showWatermark(true);

    if ((startCreatingAnnotation && boxAnnotationGuide && boxAnnotationGuide.annotationType == Annotation.TYPE_SCREENSHOT) ||
        this.screenshotAnnotation)
    {
        // dim background
        this.ctx.fillStyle = Default.SCREENSHOT_DIM_COLOR;
        this.ctx.fillRect(this.canvas.offsetLeft, this.canvas.offsetTop, this.canvas.width, this.canvas.height);

        if (this.screenshotAnnotation)
            this.ctx.clearRect(this.screenshotAnnotation.x, this.screenshotAnnotation.y, this.screenshotAnnotation.w, this.screenshotAnnotation.h);
    }

    // Display annotations
    if (this.canvasAnnotations)
        for (var i=0; i<this.canvasAnnotations.length; i++) {
            this.canvasAnnotations[i].draw(this.ctx, rotateAngle, PDFViewerApplication.pdfViewer.currentScale);
        }

    if (this.screenshotAnnotation) {
        this.screenshotAnnotation.draw(this.ctx, rotateAngle, PDFViewerApplication.pdfViewer.currentScale);
    }
};

Page.prototype.invalidate = function() {
    this.mainDraw();
};

/**
 * Sets mx,my to the mouse position relative to the canvas. Unfortunately this can be tricky,
 * we have to worry about padding and borders
 */
Page.prototype.getMouse = function(e, self) {
    var tempX = 0;
    var tempY = 0;

    //var evt = window.event || e;
    var evt = hasTouch() && e.changedTouches ? e.changedTouches[0] : e;
    if (evt.pageX || evt.pageY) {
        tempX = evt.pageX;
        tempY = evt.pageY;
    }
    else {
        tempX = evt.clientX +
        (document.documentElement.scrollLeft ||
        document.body.scrollLeft) -
        document.documentElement.clientLeft;
        tempY = evt.clientY +
        (document.documentElement.scrollTop ||
        document.body.scrollTop) -
        document.documentElement.clientTop;
    }

    if (tempX < 0) { tempX = 0; }
    if (tempY < 0) { tempY = 0; }

    var offset = $(self.canvas).offset();

    self.mx = tempX - offset.left;
    self.my = tempY - offset.top;
};

Page.prototype.addAnnotation = function(tempAnnotation, angle, scale, useOrigDimension, isAddedAfterLoad, doNotTriggerEvent) {
    var annotation = new Annotation();

    annotation.x = useOrigDimension ? tempAnnotation.origX : tempAnnotation.x;
    annotation.y = useOrigDimension ? tempAnnotation.origY : tempAnnotation.y;
    annotation.w = useOrigDimension ? tempAnnotation.origW : tempAnnotation.w;
    annotation.h = useOrigDimension ? tempAnnotation.origH : tempAnnotation.h;

    annotation.origX = annotation.x;
    annotation.origY = annotation.y;
    annotation.origW = annotation.w;
    annotation.origH = annotation.h;

    annotation.id = tempAnnotation.id;

    annotation.pageIndex = tempAnnotation.pageIndex;
    annotation.pageWidth = tempAnnotation.pageWidth;
    annotation.pageHeight = tempAnnotation.pageHeight;

    annotation.annotationType = tempAnnotation.annotationType;
    annotation.measurementType = tempAnnotation.measurementType;

    annotation.color = tempAnnotation.color ? tempAnnotation.color : Default.DRAW_COLOR_FOREGROUND;
    annotation.backgroundColor = tempAnnotation.backgroundColor ? tempAnnotation.backgroundColor : Default.DRAW_COLOR_BACKGROUND;

    annotation.setIconSource(tempAnnotation.icon);
    annotation.drawingPositions = tempAnnotation.drawingPositions;
    annotation.comments = tempAnnotation.comments;
    annotation.modified = doNotTriggerEvent ? '' : tempAnnotation.modified;
    annotation.selected = tempAnnotation.selected;

    annotation.audio = tempAnnotation.audio;
    annotation.audioAvailable = tempAnnotation.audioAvailable;

    if (!useOrigDimension)
        if (annotation.annotationType == Annotation.TYPE_DRAWING) {
            if (annotation.drawingPositions.length < Default.DRAW_POINT_MINIMUM) {
                this.invalidate();
                return;
            }
        }
        else if (annotation.annotationType == Annotation.TYPE_ARROW || annotation.annotationType == Annotation.TYPE_MEASUREMENT_DISTANCE) {
            if (annotation.drawingPositions.length == 1) {
                alert('Please create an arrow by dragging from one point to the other.');
                return;
            }
            else if (annotation.isArrowNotLongEnough(scale)) {
                if (annotation.annotationType == Annotation.TYPE_ARROW ||
                    (annotation.annotationType == Annotation.TYPE_MEASUREMENT_DISTANCE &&
                    Default.ANNOTATION_MEASUREMENT_DISTANCE_MINIMUM_LENGTH)) {
                    alert('Please create a longer arrow.');
                    return;
                }
            }
        }

    this.canvasAnnotations.push(annotation);

    if (isAddedAfterLoad) {
        if (annotation.drawingPositions.length > 0) {
            for (var i=0; i<annotation.drawingPositions.length; i++) {
                var drawingPosition = annotation.drawingPositions[i];
                drawingPosition.origX = drawingPosition.x;
                drawingPosition.origY = drawingPosition.y;
                drawingPosition.calculateOrigPosition(this.canvas, angle, scale, true);
            }
        }

        annotation.calculateOrigBound(this.canvas, angle, scale);

        if (isFunction(saveAnnotation))
            saveAnnotation(annotation,
                annotation.annotationType == Annotation.TYPE_HIGHLIGHT ||
                annotation.annotationType == Annotation.TYPE_BOX ? annotation.getTextBelowIt(annotation) : '',
                doNotTriggerEvent);
        else
            alert('function saveAnnotation() not present!');
    }
    else {
        updateAnnotationListAfterSave(annotation, false, doNotTriggerEvent);
    }
};

/**
 * @param selectionNodeBasis This element will be the basis to determine what angle it is currently positioned.
 * https://gist.github.com/yurydelendik/f2b846dae7cb29c86d23
 */
Page.prototype.highlightText = function(type, pageIndex, angle, scale, pageView, annotation, color, selectionNodeBasis) {
    console.log('Page.highlightText()');
    var page = window.PDFViewerApplication.pdfViewer._pages[pageIndex];
    if (!page) page = pageView;

    var pageElement = page.canvas.parentElement;
    var pageRect = page.canvas.getClientRects()[0];
    var selectionRectangles = annotation ? annotation.highlightTextRects: getSelectedTextClientRects();
    var viewport = page.viewport;

    var newAnnotation;

    if (!annotation) {
        newAnnotation = new Annotation();
        newAnnotation.pageIndex = pageIndex;
        newAnnotation.annotationType = type;
    }

    for (var i=0; i<selectionRectangles.length; i++) {
        var r = selectionRectangles[i];

        if (annotation) {
            r.rotate(page.canvas, angle, scale);
        }

        // This is commented out because we are not using getSelectedTextClientRects() anymore as it does not
        // work in IE.
        var rect = viewport.convertToPdfPoint
        (
            (annotation ? ($(pageElement).offset().left + r.left) : r.left) - pageRect.left,
            (annotation ? ($(pageElement).offset().top + r.top) : r.top) - pageRect.top
        ).concat
        (
            viewport.convertToPdfPoint(
                (annotation ? ($(pageElement).offset().left + r.right) : r.right) - pageRect.left,
                (annotation ? ($(pageElement).offset().top + r.bottom) : r.bottom) - pageRect.top
            )
        );

        var bounds = viewport.convertToViewportRectangle(rect);
        var left = Math.min(bounds[0], bounds[2]);
        var top = Math.min(bounds[1], bounds[3]);
        var width = Math.max(Math.abs(bounds[0] - bounds[2]), 1);
        var height = Math.max(Math.abs(bounds[1] - bounds[3]), 1);

        /**
         * As of 1.3, PDF.JS changed their text layer CSS attributes that messed up this code. I won't
         * adapt the workaround as future versions may break this one. We will have to depend on
         * window.getSelection().getRangeAt(0).getClientRects() even if it does not work in IE until
         * PDF.JS resolves how it positions its text layer elements.
         */
        //var selectionRectLeft = annotation ? r.left : parseFloat(r.style.left);
        //var selectionRectTop = annotation ? r.top : parseFloat(r.style.top);
        //var selectionRectWidth = annotation ? r.width : r.getAttribute('data-canvas-width');
        //var selectionRectHeight = annotation ? r.height : parseFloat(r.style.fontSize);
        //
        //if (!selectionRectWidth)
        //    selectionRectWidth = getTextWidth(r.innerHTML, r.style.fontFamily);
        //
        //var left = selectionRectLeft;
        //var top = selectionRectTop;
        //var width = selectionRectWidth;
        //var height = selectionRectHeight;

        /**
         * Loop through all added highlight div layer because the selected client rectangles have bounds with slight
         * differences. So the best option to check is whether the bounds' values are either equal or have a difference
         * of at least 5 or less with regards to their x,y annotations.
         */
        var add = true;
        $(pageElement).children('div[id^="highlight"]').each(function() {
            if (((Math.abs(Math.round(parseFloat($(this).css('left')), 5) - Math.round(left, 5)) <= 5 &&
                Math.abs(Math.round(parseFloat($(this).css('top')), 5) - Math.round(top, 5)) <= 5))
                ||
                (Math.round(parseFloat($(this).css('left')), 5) ==  Math.round(left, 5) &&
                Math.round(parseFloat($(this).css('top')), 5) ==  Math.round(top, 5))
            )
            {
                add = false;
                return;
            }
        });

        if (add) {
            var whatStyle = '';
            var whatColor = '';
            var whichSide = '';
            var domRotateAngle = selectionNodeBasis ?
                getRotationDegrees(selectionNodeBasis ? selectionNodeBasis : $('#highlights' + annotation.id)) :
                selectionRectangles[i].getAngleBasedOnDomRotateAngle(rotateAngle);
            
            if (type == Annotation.TYPE_TEXT_HIGHLIGHT) {
                var rgbColor = hexToRgb(annotation ? annotation.backgroundColor : newAnnotation.backgroundColor);
                whatColor = 'rgba(' + rgbColor.r + ', ' + rgbColor.g + ', ' + rgbColor.b + ', ' + Default.FILL_OPACITY + ')';
                whatStyle = 'background-color: ' + whatColor + ';';
            }
            else if (type == Annotation.TYPE_TEXT_UNDERLINE) {
                whatColor = (annotation ? annotation.color : newAnnotation.color);

                switch (domRotateAngle) {
                    case 0:
                        whichSide = '0 2px';
                        break;
                    case 90:
                        whichSide = '-2px 0';
                        break;
                    case 180:
                        whichSide = '0 -2px';
                        break;
                    case 270:
                        whichSide = '2px 0';
                        break;
                }

                whatStyle = 'box-shadow: ' + whichSide + ' ' + whatColor + ';';
            }
            // z-index property needs to be present in order for the strike-through to be visible
            else if (type == Annotation.TYPE_TEXT_STRIKE_THROUGH)
                whatStyle = 'z-index: 0;';

            var el = document.createElement('div');
            el.setAttribute('style', 'position: absolute; ' + whatStyle +
            'left:' + left + 'px; top:' + top + 'px;' +
            'width:' + width + 'px; height:' + height + 'px;');
            el.setAttribute('id', 'highlight');

            pageElement.appendChild(el);

            if (type == Annotation.TYPE_TEXT_STRIKE_THROUGH) {
                whatColor = (annotation ? annotation.color : newAnnotation.color);
                var div = $('<div/>');
                div.addClass('strikeThrough');
                // Bit-wise operator (# & 1) == odd
                //div.addClass('strikeThrough' + (!((angle / 90) & 1) ? 'Horizontal' : 'Vertical'));
                div.addClass('strikeThrough' + (domRotateAngle == 0 || domRotateAngle == 180 ? 'Horizontal' : 'Vertical'));

                /**
                 * Once PDF.JS has fixed the DIV layout height issue, remove the DIV CSS top and left values
                 * to re-adjust the strike-through line.
                 */
                switch (domRotateAngle) {
                    case 0:
                        div.css('border-top-color', whatColor);
                        div.css('top', '40%');
                        break;
                    case 90:
                        div.css('border-left-color', whatColor);
                        div.css('left', '55%');
                        break;
                    case 180:
                        div.css('border-top-color', whatColor);
                        div.css('top', '60%');
                        break;
                    case 270:
                        div.css('border-left-color', whatColor);
                        div.css('left', '45%');
                        break;
                }

                div.appendTo(el);
            }

            if (!annotation) {
                var rectBound = new HighlightTextRect();
                rectBound.left = left;
                rectBound.top = top;
                rectBound.width = Math.max(width, 1);
                rectBound.height = Math.max(height, 1);
                rectBound.right = left + width;
                rectBound.bottom = top + height;
                rectBound.setDomRotateAngle(domRotateAngle, rotateAngle);
                rectBound.calculateOrigBound($(pageElement).find('#page' + (pageIndex + 1))[0], angle, PDFViewerApplication.pdfViewer.currentScale);

                newAnnotation.highlightTextRects.push(rectBound);

                newAnnotation.pageWidth = parseInt(page.canvas.width / scale);
                newAnnotation.pageHeight = parseInt(page.canvas.height / scale);

                if (Default.SAVE_ALL_ANNOTATIONS_ONE_TIME)
                    newAnnotation.modified = 'insert';
            }

            this.canvasAnnotations.push(annotation ? annotation : newAnnotation);
        }
    };

    return annotation ? annotation : newAnnotation;
};

Page.prototype.showWatermark = function(show) {
    if (!show)
        return false;

    if (watermarkText.length == 0) {
        watermarkText.push('Annotationeer');
        watermarkText.push('Company Name');
        watermarkText.push('Copyright 2015');

    }

	if (watermarkText.length > 3) {
		watermarkText.splice(3);
		return;
	}

    var scale = PDFViewerApplication.pdfViewer.currentScale;
    var angle = rotateAngle ? rotateAngle : 0;

    var context = this.canvas.getContext('2d');
    context.save();

    context.rotate((90 + angle) * Math.PI / 180);

    var fontSize = Default.WATERMARK_FONT_SIZE * scale;
    context.font = fontSize + 'pt ' + Default.WATERMARK_FONT_TYPE;
    context.fillStyle = 'rgba(0, 0, 0, 0.15)';
    context.textBaseline = 'alphabetic';

    var textHeight = fontSize;
    var extraSpaceOfFont;
    var lineSpacing = fontSize;
    var totalLineHeight = 0;

    for (var i=watermarkText.length-1; i>=0; i--) {
        extraSpaceOfFont = Page.prototype.getTextHeight(context.font, watermarkText[i]);
		totalLineHeight += textHeight + extraSpaceOfFont.height;

		if (i != watermarkText.length - 1)
			totalLineHeight += lineSpacing;
    }

    // This is the original code block for displaying multi line text horizontally without translate() and rotate()
    //var y = ((canvas.height - totalLineHeight) / 2) + (textHeight / 2);
	var gap = textHeight / 2;

    if (angle == 0) {        
        for (var i=watermarkText.length-1; i>=0; i--) {
            //context.fillText(watermarkText[i], (canvas.width - context.measureText(watermarkText[i]).width) / 2, y);
            // add textHeight / 2 because the starting point seems to be at the center y of the text height
            //y += textHeight + lineSpacing + (textHeight / 2);
            context.fillText(watermarkText[i], (this.canvas.height - context.measureText(watermarkText[i]).width) / 2, -((this.canvas.width - totalLineHeight) / 2) - gap);
            extraSpaceOfFont = Page.prototype.getTextHeight(context.font, watermarkText[i]);
            gap += textHeight + lineSpacing + extraSpaceOfFont.height;
        }
    }
    else if (angle == 90) {
        for (var i=watermarkText.length-1; i>=0; i--) {
            context.fillText(watermarkText[i], -(this.canvas.width + context.measureText(watermarkText[i]).width) / 2, -((this.canvas.height - totalLineHeight) / 2) - gap);
            extraSpaceOfFont = Page.prototype.getTextHeight(context.font, watermarkText[i]);
            gap += textHeight + lineSpacing + extraSpaceOfFont.height;
        }
    }
    else if (angle == 180) {
        for (var i=0; i<watermarkText.length; i++) {
            context.fillText(watermarkText[i], -(this.canvas.height + context.measureText(watermarkText[i]).width) / 2, ((this.canvas.width + totalLineHeight) / 2) - gap);
            extraSpaceOfFont = Page.prototype.getTextHeight(context.font, watermarkText[i]);
            gap += textHeight + lineSpacing + extraSpaceOfFont.height;
        }
    }
    else if (angle == 270) {
        for (var i=watermarkText.length-1; i>=0; i--) {
            context.fillText(watermarkText[i], (this.canvas.width - context.measureText(watermarkText[i]).width) / 2, ((this.canvas.height + totalLineHeight) / 2) - gap);
            extraSpaceOfFont = Page.prototype.getTextHeight(context.font, watermarkText[i]);
            gap += textHeight + lineSpacing + extraSpaceOfFont.height;
        }
    }

    context.restore();
};

// http://stackoverflow.com/questions/1134586/how-can-you-find-the-height-of-text-on-an-html-canvas
// needed because the ascent and baselint descent is not included when getting height of text based on canvas font
Page.prototype.getTextHeight = function(font, text) {

    var text = $('<span>' + text + '</span>').css({ fontFamily: font });
    var block = $('<div style="display: inline-block; width: 1px; height: 0px;"></div>');

    var div = $('<div></div>');
    div.append(text, block);

    var body = $('body');
    body.append(div);

    try {
        var result = {};

        block.css({ verticalAlign: 'baseline' });
        result.ascent = block.offset().top - text.offset().top;

        block.css({ verticalAlign: 'bottom' });
        result.height = block.offset().top - text.offset().top;

        result.descent = result.height - result.ascent;

    } catch(e) {
        // do nothing
    } finally {
        if (div)
            div.remove();
    }

    return result;
};

/**
 * Initialize drawing settings like how thick the stroke is, fill color, brush shape, etc.
 * @param ctx
 */
Page.prototype.initializeDrawingConfig = function(ctx, annotation) {
    ctx.strokeStyle = annotation ? annotation.color : Default.DRAW_COLOR_FOREGROUND;
    ctx.lineWidth = Default.DRAW_WIDTH * PDFViewerApplication.pdfViewer.currentScale;
    ctx.lineJoin = ctx.lineCap = Default.DRAW_LINECAP;
};

/**
 * While the addAnnotation and addText works in the same way, the assigning of coordinate and dimension values
 * are different because text annotation do not have a width and height until after they are inserted inside a
 * DIV element.
 * @param annotation
 * @param isAddedAfterLoad
 * @param self
 * @param useOrig
 * @param doNotTriggerEvent
 */
Page.prototype.addText = function(angle, annotation, isAddedAfterLoad, useOrig, doNotTriggerEvent) {
    console.log('Page.addText()');
    var scale = PDFViewerApplication.pdfViewer.currentScale;

    if (!isAddedAfterLoad || (useOrig && annotation.hasDimension)) {
        annotation.x = annotation.origX * scale;
        annotation.y = annotation.origY * scale;
        annotation.w = annotation.origW * scale;
        annotation.h = annotation.origH * scale;
    }

    var idToUse = annotation.id != 0 ? annotation.id : '';
    var el = document.createElement('div');

    var rgbColor = hexToRgb(annotation.backgroundColor);
    var background = 'rgba(' + rgbColor.r + ', ' + rgbColor.g + ', ' + rgbColor.b + ', ' + Default.FILL_OPACITY + ')';

    el.setAttribute('style', 'white-space: nowrap; position: absolute; color: ' + annotation.color + '; ' +
        'background:' + background + '; ' + 'left:' + annotation.x + 'px; top:' + annotation.y + 'px; ' +
        'font:' + (annotation.fontSize * scale) + Default.FONT_SIZE_TYPE + ' ' + Default.FONT_TYPE);
    el.setAttribute('id', 'texts' + idToUse);
    el.innerHTML = annotation.text;
    $('#pageContainer' + (annotation.pageIndex + 1) + ' .canvasWrapper').append(el);

    $('#texts' + idToUse).css('width', $(el).width() + 'px');
    $('#texts' + idToUse).css('height', $(el).height() + 'px');

    if (angle > 0 && !annotation.hasDimension) {
        switch (angle) {
            case 90:
                $('#texts' + idToUse).css('transform-origin', '0 0');
                $('#texts' + idToUse).css('transform', 'rotate(90deg)');
                break;
            case 270:
                $('#texts' + idToUse).css('transform-origin', '0 0');
                $('#texts' + idToUse).css('transform', 'rotate(-90deg)');
                break;
            case 180:
                $('#texts' + idToUse).css('transform', 'rotate(180deg)');
                break;
        }
    }

    if (!annotation.hasDimension) {
        annotation.hasDimension = true;

        /**
         * Check if angle is 90 or 270 degrees, then re-adjust coordinates to always position
         * as portrait mode
         */
        var x = annotation.x;
        var y = annotation.y;

        switch (angle) {
            case 90:
                annotation.w = $(el).height();
                annotation.h = $(el).width();
                annotation.x = x - (idToUse == '' ? annotation.w : 0);
                annotation.y = y;
                break;
            case 270:
                if (idToUse != '') {
                    $('#texts' + idToUse).css('top', (annotation.y + annotation.h) + 'px');
                    // Re-position y coordinate using previous text's detail
                    annotation.y = y + annotation.h;
                    // Set height of new text
                    annotation.h = $(el).width();
                    // Re-adjust y coordinate using new text's detail
                    annotation.y = annotation.y - annotation.h;
                }
                else {
                    annotation.w = $(el).height();
                    annotation.h = $(el).width();
                    annotation.x = x;
                    annotation.y = y - annotation.h;
                }
                break;
            default:
                annotation.w = $(el).width();
                annotation.h = $(el).height();
                break;
        }
    }

    if (!useOrig) {
        annotation.origX = annotation.x;
        annotation.origY = annotation.y;
        annotation.origW = annotation.w;
        annotation.origH = annotation.h;
    }

    this.canvasAnnotations.push(annotation);

    if (isAddedAfterLoad) {
        annotation.calculateOrigBound(this.canvas, rotateAngle, PDFViewerApplication.pdfViewer.currentScale, true);

        if (isFunction(saveAnnotation))
            saveAnnotation(annotation);
        else
            alert('function saveAnnotation() not present!');
    }
};

Page.prototype.mouseDown = function(e, self, touch) {
    closeAllDropDown();

    if (touch || e.which == 1)
        leftButtonMouseClicked = true;
    else if (e.which == 3)
        return;

    Page.prototype.getMouse(e, self);

    if (touch && (startCreatingText || startDraw || startCreatingAnnotation)) {
        e.preventDefault();
    }

    if (startCreatingText)
        return;

    if (startDraw) {
        if (leftButtonMouseClicked) {
            self.isDrawing = true;
            drawingGuide = [];
            Page.prototype.initializeDrawingConfig(self.ctx);
            self.ctx.moveTo(self.mx, self.my);
            self.ctx.beginPath();
        }
        return;
    }

    if (startCreatingAnnotation && leftButtonMouseClicked) {
        if (startCreatingAnnotation) {
            self.isCreatingAnnotation = true;
        }

        boxAnnotationGuide.x = self.mx;
        boxAnnotationGuide.y = self.my;
        boxAnnotationGuide.pageIndex = self.pageIndex;

        if (boxAnnotationGuide.annotationType == Annotation.TYPE_SCREENSHOT) {
            self.screenshotAnnotation = boxAnnotationGuide;
            self.screenshotAnnotation.pageIndex = self.pageIndex;
        }
        else  {
            if (boxAnnotationGuide.annotationType == Annotation.TYPE_CIRCLE_FILL ||
                boxAnnotationGuide.annotationType == Annotation.TYPE_CIRCLE_STROKE) {
                boxAnnotationGuide.circleStartX = self.mx;
                boxAnnotationGuide.circleStartY = self.my;
            }
            else if (boxAnnotationGuide.annotationType == Annotation.TYPE_ARROW ||
                boxAnnotationGuide.annotationType == Annotation.TYPE_MEASUREMENT_DISTANCE)
            {
                var drawingPosition = new DrawingPosition();
                drawingPosition.x = self.mx;
                drawingPosition.y = self.my;
                boxAnnotationGuide.drawingPositions.push(drawingPosition);
            }

            if (boxAnnotationGuide.annotationType == Annotation.TYPE_MEASUREMENT_AREA) {
                if (self.canvasAnnotations.length == 0 || !self.canvasAnnotations[self.canvasAnnotations.length - 1].dummy)
                    self.canvasAnnotations.push(boxAnnotationGuide);
            }
            else
                self.canvasAnnotations.push(boxAnnotationGuide);
        }

        return;
    }

    // We are over a selection box
    if (expectResize !== -1) {
        isResizeDrag = true;
        return;
    }

    if (!self.canvasAnnotations)
        return;

    //self.clear(self.gctx);
    for (var i=self.canvasAnnotations.length-1; i>= 0; i--) {
        /**
         * Removed this since IE is an idiot for not allowing getImageData() and toDataURL()
         * of Canvas be used because of CORS issue. We use the annotation's contains() function
         * instead.
         */
        // draw shape onto ghost context
        //self.canvasAnnotations[i].draw(self.gctx, rotateAngle, PDFViewerApplication.pdfViewer.currentScale);
        // Get image data at the mouse x,y pixel
        //var imageData = self.gctx.getImageData(self.mx, self.my, 1, 1);

        // if the mouse pixel exists, select and break
        if (
            // This condition is different for these types of annotations because their coordinates
            // are based on a DIV element's position, not canvas
            (self.canvasAnnotations[i].isSelectableTextType() &&
            self.canvasAnnotations[i].containsHighlightText(self.mx, self.my, e)) ||
            // Annotations with 2 points e.g. line
            (isIE() && self.canvasAnnotations[i].drawingPositions.length == 2 &&
            isOnLine(self.canvasAnnotations[i].drawingPositions, self.mx, self.my)) ||
            // Annotations that are based on points
            (self.canvasAnnotations[i].drawingPositions.length > 0 &&
            self.canvasAnnotations[i].containsDrawing(self, self.mx, self.my, e)) ||
            (self.canvasAnnotations[i].drawingPositions.length == 0 &&
            self.canvasAnnotations[i].contains(self.mx, self.my, e))
            )
        // && imageData.data[3] > 0))
        {
            /**
             * If mouse selection did not include a CTRL key event, clear the array
             * to select only one.
             */
            if (e.ctrlKey) {
                if (self.canvasAnnotations[i].selected) {
                    self.canvasAnnotations[i].clicked = false;
                    removeSelectedAnnotation(self.canvasAnnotations[i]);

                    for (var a=0; a<selectedAnnotations.length; a++) {
                        if (selectedAnnotations[a].id == self.canvasAnnotations[i].id) {
                            selectedAnnotations.splice(a, 1);
                            break;
                        }
                    }
                }
                else {
                    addSelectedAnnotation(self.canvasAnnotations[i]);
                }
            }
            else {
                if (selectedAnnotations.length > 0) {
                    for (var s=0; s<selectedAnnotations.length; s++) {
                        removeSelectedAnnotation(selectedAnnotations[s]);
                    }

                    clearSelectedAnnotationArray();
                    resetSelectedAnnotation();
                }

                self.canvasAnnotations[i].clicked = true;
                addSelectedAnnotation(self.canvasAnnotations[i]);
            }

            leftButtonMouseClickedAnnotation = self.canvasAnnotations[i];

            console.log('Total selected annotations: ' + selectedAnnotations.length);

            // do not set offsetX and offsetY as var because its range of availability will not expand
            // through other mouse events like mouseMove and mouseDown
            offsetX = self.mx - self.canvasAnnotations[i].x;
            offsetY = self.my - self.canvasAnnotations[i].y;
            self.canvasAnnotations[i].x = self.mx - offsetX;
            self.canvasAnnotations[i].y = self.my - offsetY;

            self.invalidate();

            if (touch && e.changedTouches && selectedAnnotations.length == 1) {
                expectResize = self.canvasAnnotations[i].getSelectionHandleIndex(self.mx, self.my,
                    e.changedTouches[0].radiusX);

                if (expectResize !== -1)
                    isResizeDrag = true;
            }

            return;
        }
    }

    // If no annotations selected, reset selected attribute and re-draw canvas
    clearSelectedAnnotationArray();
    for (var p in pages) {
        for (var i=0; i<pages[p].canvasAnnotations.length; i++) {
            pages[p].canvasAnnotations[i].selected = false;
            removeSelectedAnnotation(pages[p].canvasAnnotations[i]);
        }
        pages[p].invalidate();
    }
};

Page.prototype.mouseMove = function(e, self, touch) {
    if (!touch) {
        if (startCreatingAnnotation || self.isCreatingAnnotation) {
            if (boxAnnotationGuide.annotationType == Annotation.TYPE_STICKY_NOTE)
                setCursor(self.canvas, 'comment', 'crosshair');
            else if (boxAnnotationGuide.annotationType == Annotation.TYPE_STAMP)
                setCursor(self.canvas, 'stamp', 'crosshair');
            else if (boxAnnotationGuide.annotationType == Annotation.TYPE_AUDIO)
                setCursor(self.canvas, 'audio', 'crosshair');
            else
                self.canvas.style.cursor = 'crosshair';
        }
        else if (startDraw || self.isDrawing) {
            self.canvas.style.cursor = 'default';
        }
        else if (startCreatingText) {
            self.canvas.style.cursor = 'text';
        }
    }

    Page.prototype.getMouse(e, self);

    if (self.isDrawing) {
        var drawingPosition = new DrawingPosition();
        drawingPosition.x = self.mx;
        drawingPosition.y = self.my;
        drawingGuide.push(drawingPosition);

        self.ctx.lineTo(self.mx, self.my);
        self.ctx.stroke();

        return;
    }
    else if (self.isCreatingAnnotation) {
        if (boxAnnotationGuide.annotationType == Annotation.TYPE_STICKY_NOTE ||
            boxAnnotationGuide.annotationType == Annotation.TYPE_STAMP ||
            boxAnnotationGuide.annotationType == Annotation.TYPE_AUDIO)
            return;

        boxAnnotationGuide.w = self.mx - boxAnnotationGuide.x;
        boxAnnotationGuide.h = self.my - boxAnnotationGuide.y;

        if (boxAnnotationGuide.annotationType == Annotation.TYPE_CIRCLE_FILL ||
            boxAnnotationGuide.annotationType == Annotation.TYPE_CIRCLE_STROKE) {
            boxAnnotationGuide.circleLastX = self.mx;
            boxAnnotationGuide.circleLastY = self.my;
        }
        /**
         * While the arrow annotation will not have any use for the x, y, w, h dimension,
         * we will just leave the code for assigning values to them as is.
         */
        else if (self.pageIndex == boxAnnotationGuide.pageIndex && boxAnnotationGuide.drawingPositions.length > 0) {
            var drawingPosition = new DrawingPosition();
            drawingPosition.x = self.mx;
            drawingPosition.y = self.my;

            if (boxAnnotationGuide.drawingPositions.length > 1)
                boxAnnotationGuide.drawingPositions.splice(boxAnnotationGuide.drawingPositions.length - 1, 1);

            boxAnnotationGuide.drawingPositions.push(drawingPosition);

            /**
             * If measurement annotation, update original coordinates at 100% so that
             * the label value for the measurement will be correct and fixed.
             */
            if (boxAnnotationGuide.annotationType == Annotation.TYPE_MEASUREMENT_DISTANCE)
                for (var i in boxAnnotationGuide.drawingPositions) {
                    boxAnnotationGuide.drawingPositions[i].calculateOrigPosition(self.canvas, rotateAngle,
                        PDFViewerApplication.pdfViewer.currentScale, true);
                }
        }

        self.invalidate();
        return;
    }

    // Allow only left mouse click to drag and only 1 selected annotation can be resize and/or moved.
    if (selectedAnnotations.length == 1 && selectedAnnotations[0].pageIndex == self.pageIndex)
    {
        if (selectedAnnotations[0].isMovable() && selectedAnnotations[0].selected &&
            (selectedAnnotations[0].clicked || selectedAnnotations[0].moving) &&
            leftButtonMouseClicked && !isResizeDrag)
        {
            if (touch)
                e.preventDefault();

            if (selectedAnnotations[0].clicked) {
                selectedAnnotations[0].clicked = false;
                selectedAnnotations[0].moving = true;
            }

            selectedAnnotations[0].x = self.mx - offsetX;
            selectedAnnotations[0].y = self.my - offsetY;

            hideAnnotationContextMenu(self.pageIndex);

            if (selectedAnnotations[0].annotationType == Annotation.TYPE_TEXT) {
                $('#texts' + selectedAnnotations[0].id).css('left', selectedAnnotations[0].x + 'px');
                $('#texts' + selectedAnnotations[0].id).css('top', selectedAnnotations[0].y + 'px');

                if (rotateAngle == 90)
                    $('#texts' + selectedAnnotations[0].id)
                        .css('left', (selectedAnnotations[0].x + selectedAnnotations[0].w) + 'px');
                else if (rotateAngle == 270)
                    $('#texts' + selectedAnnotations[0].id)
                        .css('top', (selectedAnnotations[0].y + selectedAnnotations[0].h) + 'px');
            }
            /**
             * If annotation type is circle, set the circleLastX and circleLastY as the moving coordinates
             * because the x and y variables serve as the starting point how the circle was created.
             */
            else if (selectedAnnotations[0].annotationType == Annotation.TYPE_CIRCLE_FILL ||
                selectedAnnotations[0].annotationType == Annotation.TYPE_CIRCLE_STROKE)
            {
                selectedAnnotations[0].circleStartX = selectedAnnotations[0].x;
                selectedAnnotations[0].circleStartY = selectedAnnotations[0].y;
                selectedAnnotations[0].circleLastX = selectedAnnotations[0].x + selectedAnnotations[0].w;
                selectedAnnotations[0].circleLastY = selectedAnnotations[0].y + selectedAnnotations[0].h;
            }
            else if (selectedAnnotations[0].drawingPositions.length > 0) {
                // Formula taken from
                // http://stackoverflow.com/questions/32450669/how-to-drag-connected-lines-using-html5-canvas
                for (var d in selectedAnnotations[0].drawingPositions) {
                    if (selectedAnnotations[0].drawingPositions[d].lastX <= 0)
                        selectedAnnotations[0].drawingPositions[d].lastX = self.mx;
                    if (selectedAnnotations[0].drawingPositions[d].lastY <= 0)
                        selectedAnnotations[0].drawingPositions[d].lastY = self.my;

                    selectedAnnotations[0].drawingPositions[d].x += self.mx - selectedAnnotations[0].drawingPositions[d].lastX;
                    selectedAnnotations[0].drawingPositions[d].y += self.my - selectedAnnotations[0].drawingPositions[d].lastY;

                    selectedAnnotations[0].drawingPositions[d].lastX = self.mx;
                    selectedAnnotations[0].drawingPositions[d].lastY = self.my;
                }
            }
        }
        else if (isResizeDrag) {
            if (touch)
                e.preventDefault();

            if (!selectedAnnotations[0].isResizable())
                return;

            hideAnnotationContextMenu(self.pageIndex);

            if (selectedAnnotations[0].drawingPositions.length > 0) {
                selectedAnnotations[0].drawingPositions[expectResize].x = self.mx;
                selectedAnnotations[0].drawingPositions[expectResize].y = self.my;

                if (selectedAnnotations[0].annotationType == Annotation.TYPE_MEASUREMENT_DISTANCE)
                    selectedAnnotations[0].drawingPositions[expectResize].calculateOrigPosition(self.canvas,
                        rotateAngle, PDFViewerApplication.pdfViewer.currentScale, true);
            }
            else {
                // Time To resize!
                var oldX = selectedAnnotations[0].x;
                var oldY = selectedAnnotations[0].y;
                // 0  1  2
                // 3     4
                // 5  6  7
                switch (expectResize) {
                    case 0:
                        selectedAnnotations[0].x = self.mx;
                        selectedAnnotations[0].y = self.my;
                        selectedAnnotations[0].w += oldX - self.mx;
                        selectedAnnotations[0].h += oldY - self.my;
                        break;
                    case 1:
                        selectedAnnotations[0].y = self.my;
                        selectedAnnotations[0].h += oldY - self.my;
                        break;
                    case 2:
                        selectedAnnotations[0].y = self.my;
                        selectedAnnotations[0].w = self.mx - oldX;
                        selectedAnnotations[0].h += oldY - self.my;
                        break;
                    case 3:
                        selectedAnnotations[0].x = self.mx;
                        selectedAnnotations[0].w += oldX - self.mx;
                        break;
                    case 4:
                        selectedAnnotations[0].w = self.mx - oldX;
                        break;
                    case 5:
                        selectedAnnotations[0].x = self.mx;
                        selectedAnnotations[0].w += oldX - self.mx;
                        selectedAnnotations[0].h = self.my - oldY;
                        break;
                    case 6:
                        selectedAnnotations[0].h = self.my - oldY;
                        break;
                    case 7:
                        selectedAnnotations[0].w = self.mx - oldX;
                        selectedAnnotations[0].h = self.my - oldY;
                        break;
                }

                if (selectedAnnotations[0].annotationType == Annotation.TYPE_CIRCLE_FILL ||
                    selectedAnnotations[0].annotationType == Annotation.TYPE_CIRCLE_STROKE) {
                    selectedAnnotations[0].circleStartX = selectedAnnotations[0].x;
                    selectedAnnotations[0].circleStartY = selectedAnnotations[0].y;
                    selectedAnnotations[0].circleLastX = selectedAnnotations[0].x + selectedAnnotations[0].w;
                    selectedAnnotations[0].circleLastY = selectedAnnotations[0].y + selectedAnnotations[0].h;
                }
            }
        }

        self.invalidate();
    }

    // hover tooltip if on top of annotation shape
    if (!hasTouch() && Default.ANNOTATIONS_TOOLTIP)
        for (var i=self.canvasAnnotations.length-1; i>= 0; i--) {
            if (self.canvasAnnotations[i].tooltip && typeof self.canvasAnnotations[i].tooltip.hide == 'function') {
                self.canvasAnnotations[i].tooltip.hide();
                self.canvasAnnotations[i].tooltip = undefined
            }

            if (isResizeDrag)
                continue;

            if (self.canvasAnnotations[i].contains(self.mx, self.my) ||
                (self.canvasAnnotations[i].drawingPositions.length > 0 &&
                self.canvasAnnotations[i].containsDrawing(self, self.mx, self.my)))
            {
                if (!self.canvasAnnotations[i].tooltip) {
                    self.canvasAnnotations[i].tooltip = new Opentip(self.canvas, {
                        showOn: null,
                        tipJoint: 'bottom right',
                        delay: 0.5,
                        group: 'annotations'
                    });
                }
                else {
                    break;
                }

                // Value may change based on tipJoin
                if ($('#annotationList').is(':visible')) {
                    self.canvasAnnotations[i].tooltip.options.offset = [$('#sidr').width(), 0];
                }

                var comment = self.canvasAnnotations[i].comments[0];
                var date = comment.dateCreated;

                if (!isFunction(date.getMonth))
                    date = new Date(date);

                self.canvasAnnotations[i].tooltip.content = '<strong>' + comment.username + '</strong>' +
                    ' - <small>' + (date.getMonth() + 1) + '/' + date.getDate() + '/' + date.getFullYear() +
                    ' - ' + (self.canvasAnnotations[i].comments.length - 1) + ' replies</small><br/><pre>' + self.canvasAnnotations[i].getTooltip() + '</pre>';
                self.canvasAnnotations[i].tooltip.prepareToShow();
                Opentip.lastZIndex = zIndex + 1;
                break;
            }
        }

    // if there's a selection see if we grabbed one of the selection handles
    if (!hasTouch() && selectedAnnotations.length == 1 && selectedAnnotations[0] !== null && !isResizeDrag) {
        for (var i=0; i<selectedAnnotations[0].selectionHandles.length; i++) {
            // 0  1  2
            // 3     4
            // 5  6  7
            var cur = selectedAnnotations[0].selectionHandles[i];

            // We do not need to use the ghost context because selection handles will always be rectangles
            if (self.mx >= cur.x && self.mx <= cur.x + (Default.ANNOTATION_SELECTION_BOX_SIZE * PDFViewerApplication.pdfViewer.currentScale) &&
                self.my >= cur.y && self.my <= cur.y + (Default.ANNOTATION_SELECTION_BOX_SIZE * PDFViewerApplication.pdfViewer.currentScale)) {
                // We found one!
                expectResize = i;
                self.invalidate();

                if (selectedAnnotations[0].drawingPositions.length > 0) {
                    self.canvas.style.cursor = 'alias';
                }
                else {
                    switch (i) {
                        case 0:
                            self.canvas.style.cursor = selectedAnnotations[0].w < 0 && selectedAnnotations[0].h < 0 ? 'se-resize' : selectedAnnotations[0].w < 0 || selectedAnnotations[0].h < 0 ? 'sw-resize' : 'nw-resize';
                            break;
                        case 1:
                            self.canvas.style.cursor = selectedAnnotations[0].w < 0 || selectedAnnotations[0].h < 0 ? 's-resize' : 'n-resize';
                            break;
                        case 2:
                            self.canvas.style.cursor = selectedAnnotations[0].w < 0 && selectedAnnotations[0].h < 0 ? 'sw-resize' : selectedAnnotations[0].w < 0 || selectedAnnotations[0].h < 0 ? 'se-resize' : 'ne-resize';
                            break;
                        case 3:
                            self.canvas.style.cursor = selectedAnnotations[0].w < 0 || selectedAnnotations[0].h < 0 ? 'e-resize' : 'w-resize';
                            break;
                        case 4:
                            self.canvas.style.cursor = selectedAnnotations[0].w < 0 || selectedAnnotations[0].h < 0 ? 'w-resize' : 'e-resize';
                            break;
                        case 5:
                            self.canvas.style.cursor = selectedAnnotations[0].w < 0 && selectedAnnotations[0].h < 0 ? 'ne-resize' : selectedAnnotations[0].w < 0 || selectedAnnotations[0].h < 0 ? 'nw-resize' : 'sw-resize';
                            break;
                        case 6:
                            self.canvas.style.cursor = selectedAnnotations[0].w < 0 || selectedAnnotations[0].h < 0 ? 'n-resize' : 's-resize';
                            break;
                        case 7:
                            self.canvas.style.cursor = selectedAnnotations[0].w < 0 && selectedAnnotations[0].h < 0 ? 'nw-resize' : selectedAnnotations[0].w < 0 || selectedAnnotations[0].h < 0 ? 'ne-resize' : 'se-resize';
                            break;
                    }
                }
                return;
            }

        }
        // not over a selection box, return to normal
        isResizeDrag = false;
        expectResize = -1;
        self.canvas.style.cursor = 'default';
    }
};

Page.prototype.mouseUp = function(e, self) {
    leftButtonMouseClicked = false;
    leftButtonMouseClickedAnnotation = null;

    // right mouse click, if mouse coordinate falls within annotation bounds, show context menu
    for (var i=0; i<selectedAnnotations.length; i++) {
        if (selectedAnnotations[i].tooltip && typeof selectedAnnotations[i].tooltip.hide == 'function')
            selectedAnnotations[i].tooltip.hide();
    }

    if (e.which == 3) {
        if (startDraw || startCreatingAnnotation || startCreatingText)
            return;

        Page.prototype.getMouse(e, self);

        /**
         * The logic here is that if a user selects an annotation, selectedAnnotations variable will have entries.
         * However, if user right clicks on an annotation right away, selectedAnnotations is empty, hence we pass
         * the self.canvasAnnotations and loop through each annotation if the mouse cursor falls under an
         * annotation's bound area.
         */
        var annotations = selectedAnnotations.length > 0 ? selectedAnnotations : self.canvasAnnotations;
        for (var i=annotations.length-1; i>= 0; i--) {
            var process = false;
            if (annotations[i].isSelectableTextType() && annotations[i].containsHighlightText(self.mx, self.my)) {
                process = true;
            }
            else if (annotations[i].drawingPositions.length > 0 &&
                annotations[i].containsDrawing(self, self.mx, self.my))
            {
                process = true;
            }
            else if (annotations[i].contains(self.mx, self.my)) {
                process = true;
            }

            if (process) {
                if (selectedAnnotations.length > 0) {
                    annotations[i].moving = false;
                }
                else {
                    addSelectedAnnotation(annotations[i]);
                    self.invalidate();
                }

                if (selectedAnnotations.length > 0) {
                    if (isFunction(displayAnnotationMenu)) {
                        e.stopPropagation();
                        displayAnnotationMenu(selectedAnnotations, e.clientX, e.clientY);
                    }
                    else
                        alert('function displayAnnotationMenu(x, y, annotation) not present!');
                }

                break;
            }
        }

        return;
    }

    if (startCreatingText) {
        showTextInput(self, self.mx, self.my);
        return;
    }

    /**
     * Loop through all pages because user's mouseUp event may end up on the next or previous page. If this
     * happens, consider the drawing as finished.
     */
    for (var p in pages) {
        if (pages[p].isDrawing) {
            pages[p].isDrawing = false;

            // We at least set a minimum of 10 points to allow an annotation to be called a drawing
            if (drawingGuide.length < Default.DRAW_POINT_MINIMUM) {
                drawingGuide = [];
                pages[p].invalidate();
                alert('Please draw something');
                return;
            }

            var annotation = new Annotation();
            annotation.annotationType = Annotation.TYPE_DRAWING;
            annotation.color = Default.DRAW_COLOR_FOREGROUND;
            annotation.pageIndex = pages[p].pageIndex;
            annotation.pageWidth = parseInt(pages[p].canvas.width / PDFViewerApplication.pdfViewer.currentScale);
            annotation.pageHeight = parseInt(pages[p].canvas.height / PDFViewerApplication.pdfViewer.currentScale);

            for (var i=0; i<drawingGuide.length; i++) {
                var drawingPosition = drawingGuide[i];
                annotation.drawingPositions.push(drawingPosition);
            }

            var boundingBox = getBoundingBoxOfPolygon(annotation.drawingPositions);
            annotation.x = boundingBox.x;
            annotation.y = boundingBox.y;
            annotation.w = boundingBox.w;
            annotation.h = boundingBox.h;

            pages[p].addAnnotation(annotation, rotateAngle, PDFViewerApplication.pdfViewer.currentScale, false, true);
            pages[p].invalidate();

            drawingGuide = [];

            if (!Default.ANNOTATION_DRAW_TOGGLED)
                resetVar();
            else
                return;
        }
        else if (pages[p].isCreatingAnnotation) {
            if (boxAnnotationGuide.annotationType == Annotation.TYPE_SCREENSHOT) {
                screenShot(pages[p].screenshotAnnotation);
                pages[p].screenshotAnnotation = null;
            }
            else {
                if (boxAnnotationGuide.annotationType == Annotation.TYPE_MEASUREMENT_AREA) {
                    if (boxAnnotationGuide.drawingPositions.length > 2 &&
                        Math.abs(self.mx - boxAnnotationGuide.drawingPositions[0].x)
                        < END_CLICK_RADIUS && Math.abs(self.my -
                            boxAnnotationGuide.drawingPositions[0].y) < END_CLICK_RADIUS) {
                        // Polygon is now closed
                        pages[p].isCreatingAnnotation = false;
                        boxAnnotationGuide.drawingPositions.splice(boxAnnotationGuide.drawingPositions.length - 1, 1);

                        var boundingBox = getBoundingBoxOfPolygon(boxAnnotationGuide.drawingPositions);
                        boxAnnotationGuide.x = boundingBox.x;
                        boxAnnotationGuide.y = boundingBox.y;
                        boxAnnotationGuide.w = boundingBox.w;
                        boxAnnotationGuide.h = boundingBox.h;
                    }
                    else {
                        var drawingPosition = new DrawingPosition();
                        drawingPosition.x = self.mx;
                        drawingPosition.y = self.my;

                        if (boxAnnotationGuide.drawingPositions.length == 0)
                            boxAnnotationGuide.drawingPositions.push(drawingPosition);
                        else
                            boxAnnotationGuide.drawingPositions[boxAnnotationGuide.drawingPositions.length - 1] = drawingPosition;
                    }

                    if (pages[p].pageIndex == boxAnnotationGuide.pageIndex) {
                        if (pages[p].isCreatingAnnotation &&
                            boxAnnotationGuide.drawingPositions.length < Default.ANNOTATION_SELECTION_MAX_POINTS) {
                            boxAnnotationGuide.drawingPositions.push(new DrawingPosition());
                            return;
                        }
                    }
                    else {
                        boxAnnotationGuide.drawingPositions = [];
                        self.invalidate();
                        alert('Measurement area should be created within the page where the first click happened.');
                        return;
                    }
                }
                else if (boxAnnotationGuide.drawingPositions.length > 0) {
                    boxAnnotationGuide.color = Default.DRAW_COLOR_FOREGROUND;
                    boxAnnotationGuide.pageWidth = parseInt(pages[p].canvas.width / PDFViewerApplication.pdfViewer.currentScale);
                    boxAnnotationGuide.pageHeight = parseInt(pages[p].canvas.height / PDFViewerApplication.pdfViewer.currentScale);

                    var boundingBox = getBoundingBoxOfPolygon(boxAnnotationGuide.drawingPositions);
                    boxAnnotationGuide.x = boundingBox.x;
                    boxAnnotationGuide.y = boundingBox.y;
                    boxAnnotationGuide.w = boundingBox.w;
                    boxAnnotationGuide.h = boundingBox.h;
                }
                else if (boxAnnotationGuide.annotationType != Annotation.TYPE_HIGHLIGHT &&
                    boxAnnotationGuide.annotationType != Annotation.TYPE_BOX &&
                    boxAnnotationGuide.annotationType != Annotation.TYPE_CIRCLE_FILL &&
                    boxAnnotationGuide.annotationType != Annotation.TYPE_CIRCLE_STROKE) {
                    boxAnnotationGuide.x = pages[p].mx - curAnnotationXY;
                    boxAnnotationGuide.y = pages[p].my - curAnnotationXY;

                    if (boxAnnotationGuide.annotationType == Annotation.TYPE_STICKY_NOTE ||
                        boxAnnotationGuide.annotationType == Annotation.TYPE_AUDIO ||
                        boxAnnotationGuide.annotationType == Annotation.TYPE_STAMP) {
                        boxAnnotationGuide.w = boxAnnotationGuide.icon.width;
                        boxAnnotationGuide.h = boxAnnotationGuide.icon.height;
                    }

                    boxAnnotationGuide.w = boxAnnotationGuide.w * PDFViewerApplication.pdfViewer.currentScale;
                    boxAnnotationGuide.h = boxAnnotationGuide.h * PDFViewerApplication.pdfViewer.currentScale;
                }

                for (var i = 0; i < pages[p].canvasAnnotations.length; i++) {
                    if (pages[p].canvasAnnotations[i].id == 0) {
                        pages[p].canvasAnnotations.splice(i, 1);
                        break;
                    }
                }

                pages[p].addAnnotation(boxAnnotationGuide, rotateAngle, PDFViewerApplication.pdfViewer.currentScale, false, true);
            }

            resetVar();
            return;
        }

        if (selectedAnnotations.length == 1 && selectedAnnotations[0].pageIndex == pages[p].pageIndex &&
            (selectedAnnotations[0].moving || isResizeDrag))
        {
            if (selectedAnnotations[0].drawingPositions.length > 0) {
                // Check first if length is beyond minimum, else set minimum length, for arrow and distance measurement.
                if (selectedAnnotations[0].drawingPositions.length == 2 &&
                    ((selectedAnnotations[0].annotationType == Annotation.TYPE_MEASUREMENT_DISTANCE && Default.ANNOTATION_MEASUREMENT_DISTANCE_MINIMUM_LENGTH) ||
                    selectedAnnotations[0].annotationType == Annotation.TYPE_ARROW))
                {
                    var distance = getDistance(selectedAnnotations[0].drawingPositions[0].x, selectedAnnotations[0].drawingPositions[0].y,
                        selectedAnnotations[0].drawingPositions[1].x, selectedAnnotations[0].drawingPositions[1].y);
                    var scale = PDFViewerApplication.pdfViewer.currentScale;
                    if (distance < (Default.ARROW_SIZE * scale) * 2 * (selectedAnnotations[0].annotationType == Annotation.TYPE_MEASUREMENT_DISTANCE ? 2 : 1)) {
                        var angle = getAngle(selectedAnnotations[0].drawingPositions[0].x, selectedAnnotations[0].drawingPositions[0].y,
                            selectedAnnotations[0].drawingPositions[1].x, selectedAnnotations[0].drawingPositions[1].y, false);
                        var point = getPointFromDistance(selectedAnnotations[0].drawingPositions[0].x, selectedAnnotations[0].drawingPositions[0].y,
                            angle, (Default.ARROW_SIZE * scale) * 2 * (selectedAnnotations[0].annotationType == Annotation.TYPE_MEASUREMENT_DISTANCE ? 2 : 1) + (1 * scale));

                        selectedAnnotations[0].drawingPositions[1].x = point.x;
                        selectedAnnotations[0].drawingPositions[1].y = point.y;
                    }
                }

                for (var i=0; i<selectedAnnotations[0].drawingPositions.length; i++) {
                    var drawingPosition = selectedAnnotations[0].drawingPositions[i];
                    drawingPosition.origX = drawingPosition.x;
                    drawingPosition.origY = drawingPosition.y;
                    drawingPosition.calculateOrigPosition(pages[p].canvas, rotateAngle, PDFViewerApplication.pdfViewer.currentScale, true);
                }

                var boundingBox = getBoundingBoxOfPolygon(selectedAnnotations[0].drawingPositions);
                selectedAnnotations[0].x = boundingBox.x;
                selectedAnnotations[0].y = boundingBox.y;
                selectedAnnotations[0].w = boundingBox.w;
                selectedAnnotations[0].h = boundingBox.h;
            }
            else
                selectedAnnotations[0].calculateOrigBound(pages[p].canvas, rotateAngle, PDFViewerApplication.pdfViewer.currentScale, true);

            if (selectedAnnotations[0].moving || isResizeDrag) {
                selectedAnnotations[0].moving = false;
                selectedAnnotations[0].modified = 'update';

                // We call invalidate because if the user moves the annotation and the mouseUp ends up on the next or
                // previous page, the annotation's position must be refreshed with the newly adjusted position
                pages[p].invalidate();

                if (isFunction(saveAnnotation))
                    saveAnnotation(selectedAnnotations[0]);
                else
                    alert('function saveAnnotation() not present!');
            }
        }
    }

    isResizeDrag = false;
    expectResize = -1;
};