var pages = [];

// Holds annotations of all PDF pages
var annotations = [];

// This indicates the user is going to create an annotation e.g. highlight/box
var startCreatingAnnotation = false;

// Indicator to start drawing
var startDraw = false;

// Indicator to start creating text
var startCreatingText = false;

var isResizeDrag = false;
// Will save the # of the selection handle if the mouse is over one.
var expectResize = -1;

// This identifies what kind of action will happen after selecting text.
// e.g. highlight, underline, strike-through
var selectionTextType;

// Represents the currently selected annotation
var selectedAnnotations = [];

// Variable for highlight/box creation guide
var boxAnnotationGuide = {};

// Variable for drawing creation guide
var drawingGuide = [];

var rotateAngle = 0;

// Cursor cross hair pixel size
var curAnnotationXY = 12;

// Tracker because mouseMove(e) which returns 1 even if no button is pressed (firefox)
var leftButtonMouseClicked;

/**
 * Tracker to detect which annotation was mouse left clicked. Important to enable moving and resizing
 * because this feature is only available if there is 1 selected annotation.
 */
var leftButtonMouseClickedAnnotation;

var watermarkText = [];

/**
 * Radius of click around the first point to close the draw. Do not change.
 * For use by Annotation.TYPE_MEASUREMENT_AREA.
 */
var END_CLICK_RADIUS = 15;

function createCircleFill() {
    createAnnotation(Annotation.TYPE_CIRCLE_FILL);
}

function createCircleStroke() {
    createAnnotation(Annotation.TYPE_CIRCLE_STROKE);
}

function createHighlight() {
    createAnnotation(Annotation.TYPE_HIGHLIGHT);
}

function createBox() {
    createAnnotation(Annotation.TYPE_BOX);
}

function createAudio() {
    if (Default.SAVE_ALL_ANNOTATIONS_ONE_TIME) {
        alert('Default.SAVE_ALL_ANNOTATIONS_ONE_TIME must be set to false!');
        return;
    }

    // If audio is not supported
    if (!hasGetUserMedia()) {
        alert('No web audio support in this browser!');
        return;
    }

    createAnnotation(Annotation.TYPE_AUDIO, 'images/audio.svg');
}

function createStickyNote() {
    createAnnotation(Annotation.TYPE_STICKY_NOTE, 'images/comment.svg');
}

function createStamp(src) {
    console.log('createStamp');
    createAnnotation(Annotation.TYPE_STAMP, src);
}

function createArrow() {
    createAnnotation(Annotation.TYPE_ARROW);
}

function createAnnotation(type, icon) {
    resetVar();
    boxAnnotationGuide = new Annotation();
    boxAnnotationGuide.dummy = true;
    boxAnnotationGuide.annotationType = type;
    startCreatingAnnotation = true;

    if (icon) {
        boxAnnotationGuide.setIconSource(icon);

        if (boxAnnotationGuide.annotationType == Annotation.TYPE_STAMP) {
            // Compute width based on preferred height
            //getImageWidthFromHeight(boxAnnotationGuide.icon, Default.ANNOTATION_STAMP_HEIGHT)
            boxAnnotationGuide.icon.width = Default.ANNOTATION_STAMP_WIDTH;
            boxAnnotationGuide.icon.height = Default.ANNOTATION_STAMP_HEIGHT;
        }
        else {
            boxAnnotationGuide.icon.width = Default.ANNOTATION_ICON_SIDE;
            boxAnnotationGuide.icon.height = Default.ANNOTATION_ICON_SIDE;
        }
    }

    if (hasTouch())
        $('#cancelAnnotation').removeClass('hidden');
}

function createText() {
    resetVar();
    startCreatingText = true;

    if (hasTouch())
        $('#cancelAnnotation').removeClass('hidden');
}

function createMeasurementDistance() {
    createAnnotation(Annotation.TYPE_MEASUREMENT_DISTANCE);
}

function createMeasurementArea() {
    createAnnotation(Annotation.TYPE_MEASUREMENT_AREA);
}

function showStampChooser() {
    if ($('#stampList').hasClass('show')) {
        resetAllToggles();
        $('#stampList').removeClass('show');
    }
    else {
        resetVar();
        $('#stampList').addClass('show');
        $("#stampList").scrollTop(0);
    }
}

function isFunction(x) {
    return Object.prototype.toString.call(x) == '[object Function]';
}

function rotateRight() {
    clearAnnotationeerDOMElements();
    rotateAngle = Math.abs(PDFViewerApplication.pdfViewer.pagesRotation + 90);
    if (Math.abs(rotateAngle) == 360) rotateAngle = 0;
    PDFViewerApplication.rotatePages(90);
}

function rotateLeft() {
    clearAnnotationeerDOMElements();
    rotateAngle = PDFViewerApplication.pdfViewer.pagesRotation - 90;
    if (rotateAngle == -90) rotateAngle = 270;
    else if (rotateAngle == -270) rotateAngle = 90;
    else if (Math.abs(rotateAngle) == 360) rotateAngle = 0;
    else rotateAngle = Math.abs(rotateAngle);
    PDFViewerApplication.rotatePages(-90);
}

/**
 * Resets all UI configuration settings.
 * @param enableHandTool There are cases when hand tool should be enabled when other settings are reset.
 * e.g. runAfterPageRendered() will reset settings but if handTool mode is enabled, it should persist.
 * @param preserveSelection Preserve selected annotation in case settings need to be reset but selections
 * should persist.
 * e.g. If user clicks on sidebar annotation list and views another page that has not yet been rendered.
 */
function resetVar(enableHandToolOrScreenShot, preserveSelection) {
    isResizeDrag = false;
    expectResize = -1;

    if (!preserveSelection) {
        startCreatingAnnotation = false;
        startCreatingText = false;
        startDraw = false;
        selectionTextType = 0;

        for (var p in pages) {
            pages[p].canvas.style.cursor = 'default';
            pages[p].canvas.style.pointerEvents = 'auto';
            pages[p].isDrawing = false;
            pages[p].isCreatingAnnotation = false;
            $('#pageContainer' + pages[p].pageIndex).addClass('selectTextDisabled');

            hideAnnotationContextMenu(pages[p].pageIndex);

            if (!enableHandToolOrScreenShot)
                pages[p].screenshotAnnotation = null;
        }
    }

    resetAllToggles(enableHandToolOrScreenShot, preserveSelection);
    closeAllDropDown();
    clearSelectedText();
}

function resetSelectedAnnotation(preserveSelection) {
    if (preserveSelection)
        return;

    clearSelectedAnnotationArray();

    if (pages)
        for (var p in pages) {
            for (var i=0; i<pages[p].canvasAnnotations.length; i++) {
                pages[p].canvasAnnotations[i].clicked = false;
                pages[p].canvasAnnotations[i].moving = false;
                pages[p].canvasAnnotations[i].selected = false;

                if (pages[p].canvasAnnotations[i].annotationType != Annotation.TYPE_TEXT)
                    pages[p].canvasAnnotations[i].draw(pages[p].ctx, rotateAngle, PDFViewerApplication.pdfViewer.currentScale);
            }

            pages[p].invalidate(pages[p]);
        }
}

function resetHandToolMode() {
    hideContextMenu();
    $('#aHandTool').removeClass('toggled').attr('title', 'Enable hand tool');
    HandTool.enterPresentationMode();
}

function resetSelectTextMode(preserveSelection) {
    if (preserveSelection)
        return;

    hideContextMenu();
    clearSelectedText();
    $('#textHighlight').removeClass('toggled').attr('title', 'Enable text highlight');
    $('#textUnderline').removeClass('toggled').attr('title', 'Enable text underline');
    $('#textStrikeThrough').removeClass('toggled').attr('title', 'Enable text strike-through');
    if (pages) {
        for (var p in pages) {
            pages[p].canvas.style.pointerEvents = 'auto'
        }
    }
}

function resetScreenShot() {
    hideContextMenu();
    $('#toggleScreenshot').removeClass('toggled').attr('title', 'Enable screen shot');
}

function resetDrawMode(preserveSelection) {
    if (preserveSelection)
        return;

    hideContextMenu();
    $('#toggleDraw').removeClass('toggled').attr('title', 'Draw');
}

function drawMode() {
    if ($('#toggleDraw').hasClass('toggled')) {
        resetAllToggles();
    }
    else {
        resetVar();
        $('#toggleDraw').addClass('toggled').attr('title', 'Stop draw');
        startDraw = true;

        if (hasTouch())
            $('#cancelAnnotation').removeClass('hidden');
    }
}

function selectText(type) {
    if (($('#textHighlight').hasClass('toggled') && type == Annotation.TYPE_TEXT_HIGHLIGHT) ||
        ($('#textUnderline').hasClass('toggled') && type == Annotation.TYPE_TEXT_UNDERLINE)  ||
        ($('#textStrikeThrough').hasClass('toggled') && type == Annotation.TYPE_TEXT_STRIKE_THROUGH))
    {
        resetAllToggles();
    }
    else {
        resetVar();
        selectionTextType = type;

        // This will only apply for mobile devices
        if (hasTouch()) {
            $('#markText').removeClass('hidden');
            $('#cancelAnnotation').removeClass('hidden');
        }

        switch (type) {
            case Annotation.TYPE_TEXT_HIGHLIGHT:
                $('#textHighlight').addClass('toggled').attr('title', 'Disable text highlight');
                break;
            case Annotation.TYPE_TEXT_UNDERLINE:
                $('#textUnderline').addClass('toggled').attr('title', 'Disable text underline');
                break;
            case Annotation.TYPE_TEXT_STRIKE_THROUGH:
                $('#textStrikeThrough').addClass('toggled').attr('title', 'Disable text strike-through');
                break;
        }

        if (pages) {
            for (var p in pages) {
                pages[p].canvas.style.pointerEvents = 'none'
                $('#pageContainer' + pages[p].pageIndex).removeClass('selectTextDisabled');
            }
        }
    }
}

function handToolMode() {
    if ($('#aHandTool').hasClass('toggled')) {
        resetVar();
    }
    else {
        resetVar();
        HandTool.toggle();
        $('#aHandTool').addClass('toggled').attr('title', 'Disable hand tool');
    }
}

function getSelectedText() {
    if (window.getSelection) {
        return window.getSelection().toString();
    }
    else if (document.selection) {
        return document.selection.createRange().text;
    }
    return '';
}

function clearSelectedText() {
    if (window.getSelection) {
        if (window.getSelection().empty) {  // Chrome
            window.getSelection().empty();
        }
        else if (window.getSelection().removeAllRanges) {  // Firefox
            window.getSelection().removeAllRanges();
        }
    }
    else if (document.selection) {  // IE?
        document.selection.empty();
    }
}

// http://stackoverflow.com/questions/12603397/calculate-width-height-of-the-selected-text-javascript
function isWithinSelectionBound(mouseX, mouseY) {
    var sel = document.selection, range;
    var x = 0, y = 0, width = 0, height = 0;
    if (sel) {
        if (sel.type != "Control") {
            range = sel.createRange();
            x = range.boundingLeft;
            y = range.boundingTop;
            width = range.boundingWidth;
            height = range.boundingHeight;
        }
    } else if (window.getSelection) {
        sel = window.getSelection();
        if (sel.rangeCount) {
            range = sel.getRangeAt(0).cloneRange();
            if (range.getBoundingClientRect) {
                var rect = range.getBoundingClientRect();
                x = rect.left;
                y = rect.top;
                width = rect.right - rect.left;
                height = rect.bottom - rect.top;
            }
        }
    }
    return (mouseX >= x && mouseX <= x + width && mouseY >= y && mouseY <= y + height);
}

/**
 * In particular a Chrome bug which results in selections spanning multiple nodes
 * returning rectangles for all the parents of the endContainer. Use range_fix.js
 */
function getSelectedTextClientRects() {
    if (window.getSelection)
        return RangeFix.getClientRects(window.getSelection().getRangeAt(0));
    else if (document.selection)
        return document.selection.createRange().getClientRects();

    return null;
}

/**
 * Because getSelectedTextClientRects() does not work in IE when selection is
 * multi-line, we use this method instead as it is more accurate.
 */
function getSelectedTextClientRectsAsNodes() {
    if (window.getSelection)
        return window.getSelection().getRangeAt(0).cloneContents().querySelectorAll('*');
    else if (document.selection)
        return document.getSelection().getRangeAt(0).cloneContents().querySelectorAll('*');

    return null;
}

/**
 * Pretty useful to calculate width of text for elements without any width specified.
 * This is usually if the font is monospace. measureText() is new in HTML5.
 * http://stackoverflow.com/questions/118241/calculate-text-width-with-javascript
 * @param text
 * @param font
 * @returns {Number}
 */
function getTextWidth(text, font) {
    // Re-use canvas object for better performance
    var canvas = getTextWidth.canvas || (getTextWidth.canvas = document.createElement('canvas'));
    var context = canvas.getContext('2d');
    context.font = font;
    var metrics = context.measureText(text);
    return metrics.width;
}

/**
 * Detects if browser is HTML5 ready, else this GetUserMedia() is not available.
 * @returns {boolean}
 */
function hasGetUserMedia() {
    return !!(navigator.getUserMedia || navigator.webkitGetUserMedia ||
    navigator.mozGetUserMedia || navigator.msGetUserMedia);
}

function screenShotMode() {
    if ($('#toggleScreenshot').hasClass('toggled')) {
        resetAllToggles();
        HandTool.exitPresentationMode();
    }
    else {
        resetVar();
        $('#toggleScreenshot').addClass('toggled').attr('title', 'Disable screen shot');

        boxAnnotationGuide = new Annotation();
        boxAnnotationGuide.annotationType = Annotation.TYPE_SCREENSHOT;
        startCreatingAnnotation = true;

        for (var p in pages) {
            pages[p].invalidate(pages[p]);
        }

        if (hasTouch())
            $('#cancelAnnotation').removeClass('hidden');
    }
}

function resetAllToggles(enableHandToolOrScreenShot, preserveSelection) {
    resetSelectTextMode(preserveSelection);
    resetSelectedAnnotation(preserveSelection);
    resetDrawMode(preserveSelection);

    // This will only apply for mobile devices
    if (!preserveSelection) {
        $('#markText').addClass('hidden');
        $('#cancelAnnotation').addClass('hidden');
    }

    if (!enableHandToolOrScreenShot) {
        resetHandToolMode();
        resetScreenShot();
    }
}

function screenShot(annotation) {
    PDFViewerApplication.pdfDocument.getPage(annotation.pageIndex + 1).then(function(page) {
        // change true|false if scale is more than threshold, always set to threshold limit
        var retainAspectRatioRegardlessOfScale = true;
        var threshold = 1;
        var thresholdScaleValue = 1;

        var scale = PDFViewerApplication.pdfViewer.currentScale;
        var rotate = PDFViewerApplication.pdfViewer.pagesRotation;

        if (!retainAspectRatioRegardlessOfScale) {
            scale = scale <= threshold ? scale : thresholdScaleValue;
        }

        // re-adjust scale to make it look the same when displayed in pdf.js
        scale += (scale * 0.3);

        var viewport = page.getViewport(scale, rotate);
        var canvas = document.createElement('canvas');
        var ctx = canvas.getContext('2d');
        var renderContext = {
            canvasContext: ctx,
            viewport: viewport
        };

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        var canvasAnnotation = $('#pageAnnotation' + (annotation.pageIndex + 1));
        var diffBetViewportAndCanvasAnnotation = viewport.width / canvasAnnotation.width();

        if (!retainAspectRatioRegardlessOfScale && PDFViewerApplication.pdfViewer.currentScale > 1) {
            diffBetViewportAndCanvasAnnotation = viewport.width / (canvasAnnotation.width() / PDFViewerApplication.pdfViewer.currentScale);
        }

        page.render(renderContext).then(function() {
            var crop_canvas = document.createElement('canvas');
            var left, top, width, height;

            if (retainAspectRatioRegardlessOfScale) {
                crop_canvas.width = annotation.w;
                crop_canvas.height = annotation.h;

                left = annotation.x;
                top = annotation.y;
                width = annotation.w;
                height = annotation.h;
            }
            else {
                crop_canvas.width = scale <= thresholdScaleValue ? annotation.w : annotation.origW;
                crop_canvas.height = scale <= thresholdScaleValue ? annotation.h : annotation.origH;

                left = scale <= thresholdScaleValue ? annotation.x : annotation.origX;
                top = scale <= thresholdScaleValue ? annotation.y : annotation.origY;
                width = scale <= thresholdScaleValue ? annotation.w : annotation.origW;
                height = scale <= thresholdScaleValue ? annotation.h : annotation.origH;
            }

            if (width < 0) {
                left = left + width;
                width = Math.abs(width);
                crop_canvas.width = width;
            }

            if (height < 0) {
                top = top + height;
                height = Math.abs(height);
                crop_canvas.height = height;
            }

            crop_canvas.getContext('2d').drawImage(canvas,
                left * diffBetViewportAndCanvasAnnotation,
                top * diffBetViewportAndCanvasAnnotation,
                width * diffBetViewportAndCanvasAnnotation,
                height * diffBetViewportAndCanvasAnnotation,
                0, 0,
                width * diffBetViewportAndCanvasAnnotation,
                height * diffBetViewportAndCanvasAnnotation
            );

            resetVar();
            window.open(crop_canvas.toDataURL('image/png'));
        });
    });
}

/**
 * Measures text by creating a DIV in the document and adding the relevant text to it.
 * Then checking the .offsetWidth and .offsetHeight. Because adding elements to the DOM is not particularly
 * efficient in animations (particularly) it caches the measured text width/height.
 * http://www.rgraph.net/blog/2013/january/measuring-text-height-with-html5-canvas.html
 *
 * @param  string text   The text to measure
 * @param  bool   bold   Whether the text is bold or not
 * @param  string font   The font to use
 * @param  size   number The size of the text (in pts)
 * @return array         A two element array of the width and height of the text
 */
function measureText(text, bold, font, size) {
    // This global variable is used to cache repeated calls with the same arguments
    var str = text + ':' + bold + ':' + font + ':' + size;
    if (typeof(__measuretext_cache__) == 'object' && __measuretext_cache__[str]) {
        return __measuretext_cache__[str];
    }

    var div = document.createElement('DIV');
    div.innerHTML = text;
    div.style.position = 'absolute';
    div.style.top = '-100px';
    div.style.left = '-100px';
    div.style.fontFamily = font;
    div.style.fontWeight = bold ? 'bold' : 'normal';
    div.style.fontSize = size + 'pt';
    div.style.margin = 0;
    div.style.padding = 0;
    document.body.appendChild(div);

    var size = [div.offsetWidth, div.offsetHeight];

    document.body.removeChild(div);

    // Add the sizes to the cache as adding DOM elements is costly and can cause slow downs
    if (typeof(__measuretext_cache__) != 'object') {
        __measuretext_cache__ = [];
    }
    __measuretext_cache__[str] = size;

    return size;
}

/**
 * This is an optimization function which resets a page's state that it has not yet been viewed if
 * it is not visible on the screen.
 *
 * This is to minimize lagging when there are so many annotations for every page and if the scale
 * value is big.
 */
function resetPagesIfOffScreen() {
    if (!pages)
        return;

    for (var p in pages) {
        if (!$('#pageContainer' + (pages[p].pageIndex + 1)).isOnScreen())
            PDFViewerApplication.pdfViewer.getPageView(pages[p].pageIndex).reset();
    }
}

function initWebAppPreferences() {
    // Bootstrap annotation list and popup form
    angular.element(document).ready(function() {
        angular.bootstrap(document.getElementById('sidebarContainerRight'), ['annotationList']);
        angular.bootstrap(document.getElementById('popupContainer'), ['annotationForm']);
    });

    if (Default.SIDEBAR_ENABLED) {
        if (Default.ANNOTATION_LIST_SIDEBAR_RIGHT) {
            onloadCSS(loadCSS('jquery.sidr.dark.min.css'), function () {
                loadScript('jquery.sidr.min.js', function () {
                    setTimeout(function () {
                        $('#sidebarContainerRight').detach().appendTo($('#sidr'));
                        $('#sidebarContainerRight').removeClass('hidden');
                    }, 0);

                    $('#viewAnnotations').remove();
                    $('#sidebarToggleRight').removeClass('hidden');
                    showSidebarRight();
                });
            });
        }
        else {
            setTimeout(function () {
                $('#sidebarToggleRight').remove();
                $('#sidebarContainerRight').detach().appendTo($('#sidebarContent'));
            }, 100);
        }
    }
    else {
        $('#sidebarToggleRight').remove();
        $('#sidebarContainerRight').remove();
        $('button#viewAnnotations').remove();
    }

    if (Default.SAVE_ALL_ANNOTATIONS_ONE_TIME) {
        $('#save').removeClass('hidden');
    }
    else {
        // Since by default save button is hidden, hide the separator before it
        $('#save').prev().addClass('hidden');
    }

    if (hasTouch()) {
        /**
         * Remove measurement area annotation button because the creation process involves clicking
         * on several points in order to create a closed polygon. Whilst clicking the first few points,
         * mobile devices will not be able to show the unclosed path since there is no mouse over.
         *
         * But user can resize existing measurement area annotation.
         */
        $('#measureArea').remove();

        /**
         * This library is used as the alternate solution for right click showing context menu in
         * mobile devices.
         */
        loadScript('jquery.mobile.touch.min.js', function() {
            // Loaded JQuery library for tap hold touch event.
        });
    }
    else {
        if (Default.ANNOTATIONS_TOOLTIP)
            onloadCSS(loadCSS('opentip.css'), function () {
                loadScript('opentip-jquery-excanvas.min.js', function () {
                    // Loaded Javascript library for tooltips.
                });
            });
    }

    if (!Default.ANNOTATIONS_AUDIO)
        $('#audio').remove();
    else
        loadScript('record_mp3/recordmp3.js', function() {
            // Loaded Javascript library and CSS stylesheet for audio.
        });

    if (!Default.TOOLBAR_ANNOTATION_ENABLED) {
        var toolbar = $('#toolbarAnnotations');
        $('.toolbar').css('height', $('.toolbar').height() - toolbar.height());
        $('#toolbarContainer').style('height', ($('#toolbarContainer').height() - toolbar.height()) + 'px', 'important');
        $('#viewerContainer').style('top', (parseInt($('#viewerContainer').css('top')) - toolbar.height()) + 'px', 'important');
        toolbar.remove();
    }

    if (!supportsHTML5ColorInput())
        onloadCSS(loadCSS('jquery.minicolors.css'), function() {
            loadScript('jquery.minicolors.js', function () {
                $('#backgroundPalette').minicolors();
                $('#colorPalette').minicolors();
            });
        });

    /**
     * This library will listen to the toolbar annotation height change. This is because if the width gets smaller,
     * the annotation toolbar will spread it out into 2 rows so the positioning of other elements affected will mess
     * up the positioning of annotations when displayed.
     */
    var toolbarAnnotations = $('#toolbarAnnotations');
    new ResizeSensor(toolbarAnnotations, function() {
        $('#toolbarContainer').css('cssText', 'height: ' + (toolbarAnnotations[0].clientHeight + 32) + 'px !important;');
        $('#viewerContainer').css('cssText', 'top: ' + (toolbarAnnotations[0].clientHeight + 32) + 'px !important;');
        $('#sidebarContainer').css('cssText', 'top: ' +
            ($('#outerContainer')[0].clientWidth <= 770 ? $('#toolbarContainer')[0].clientHeight : 0)
            + 'px !important;');
    });
}

/**
 * Sidr works by copying the contents of the source element id. Since we use Angular JS here, there will be 2 copies of
 * the content. Solution is to move the element content to the Sidr Div element. The name attribute of sidr is its
 * destination. However, if no name is specified in the property, the default is sidr.
 */
function showSidebarRight() {
    $('#sidebarToggleRight').sidr({
        side: 'right',
        renaming: false
    });
}

/**
 * This will open the annotations list in the left sidebar if option
 * Default.ANNOTATION_LIST_SIDEBAR_RIGHT is false.
 */
function showAnnotationsInLeftSidebar(show) {
    if (!show) {
        $('#sidebarContainerRight').addClass('hidden');
        $('#viewAnnotations').removeClass('toggled');
    }
    else {
        $('#thumbnailView').addClass('hidden');
        $('#viewThumbnail').removeClass('toggled');

        $('#outlineView').addClass('hidden');
        $('#viewOutline').removeClass('toggled');

        $('#attachmentsView').addClass('hidden');
        $('#viewAttachments').removeClass('toggled');

        $('#sidebarContainerRight').removeClass('hidden');
        $('#viewAnnotations').addClass('toggled');
    }
}

/**
 * Convenience method to add annotations to selectedAnnotations[] array variable so we can add other code that needs to
 * be executed here.
 * @param annotation
 * @param fromAngular If event is triggered from the sidebar annotation list
 */
function addSelectedAnnotation(annotation, fromAngular) {
    if (fromAngular) {
        for (var i=0; i<annotations.length; i++) {
            annotations[i].selected = false;
        }

        // In case user selected annotations from different pages, re-draw all pages to make them displayed as not
        // selected
        resetVar();
    }

    annotation.selected = true;
    for (var i=0; i<annotations.length;i++){
        if (annotation.id == annotations[i].id) {
            annotations[i].selected = annotation.selected;
            break;
        }
    }

    selectedAnnotations.push(annotation);

    if (fromAngular) {
        for (var p in pages) {
            if (pages[p].pageIndex == annotation.pageIndex) {
                for (var i=0; i<pages[p].canvasAnnotations.length; i++) {
                    if (pages[p].canvasAnnotations[i].id == annotation.id) {
                        pages[p].canvasAnnotations[i].selected = annotation.selected;
                        break;
                    }
                }
                pages[p].invalidate();
                break;
            }
        }
    }
    else {
        refreshAnnotationList();
        scrollToAnnotationInList(annotation);
    }
}

/**
 * This function is used to update the annotation from the Angular JS environment.
 * @param annotation
 */
function updateAnnotationComment(annotation) {
    console.log('updateAnnotationComment()');

    root:
    for (var p in pages) {
        if (pages[p].pageIndex == annotation.pageIndex) {
            for (var i=0; i<pages[p].canvasAnnotations.length; i++) {
                if (pages[p].canvasAnnotations[i].id == annotation.id) {
                    pages[p].canvasAnnotations[i].comments = annotation.comments;
                    break root;
                }
            }
        }
    }

    for (var a in annotations) {
        if (annotations[a].id == annotation.id) {
            annotations[a].comments = annotation.comments;
            annotations[a].modified = annotation.modified;
            break;
        }
    }

    if (Default.CREATE_ANNOTATION_EVENTS)
        createAnnotationEvent(annotation, 'comment_update');
}

function removeSelectedAnnotation(annotation) {
    annotation.selected = false;
    for (var i=0; i<annotations.length;i++){
        if (annotation.id == annotations[i].id) {
            annotations[i].selected = false;
            break;
        }
    }

    refreshAnnotationList();
}

function closeAllDropDown() {
    $('#stampList').removeClass('show');
}

function refreshAnnotationList() {
    angular.element($('#annotationList')).scope().$digest();
}

function clearSelectedAnnotationArray() {
    selectedAnnotations = [];

    $('div[id^="highlight"]').each(function() {
        $(this).css('border', '');
        $(this).css('border-top-color', '');
        $(this).css('border-bottom-color', '');
        $(this).css('border-left-color', '');
        $(this).css('border-right-color', '');
    });

    $('div[id^="texts"]').each(function() {
        $(this).css('border', '');
    });

    for (var a in annotations) {
        annotations[a].selected = false;
    }
}

function createSelectText(page) {
    try {
        var selectionNodes = getNodesBetween($(getSelectionBoundaryElement(true)), $(getSelectionBoundaryElement()), true);

        if (getAngleCountOfSelectedNodes(selectionNodes) > 1) {
            clearSelectedText();

            setTimeout(function () {
                alert('Please select text in 1 direction only.');
            });
            return;
        }

        var pageIndexToCheck = page ? (page - 1) : PDFViewerApplication.pdfViewer.currentPageNumber - 1;
        for (var p in pages) {
            if (pages[p].pageIndex == pageIndexToCheck) {
                var annotation = pages[p].highlightText(selectionTextType, pageIndexToCheck,
                    rotateAngle, PDFViewerApplication.pdfViewer.currentScale, null, null, null, selectionNodes[0]);

                if (!annotation)
                    continue;

                if (isFunction(saveAnnotation))
                    saveAnnotation(annotation);
                else
                    alert('function saveAnnotation() not present!');

                break;
            }
        }

        // Since the first time this is used, the selection seems to get stuck in the DIV element, add
        // CSS class selectTextDisabled, clear the selected text, then remove.
        $('#pageContainer' + page + ' div.textLayer').addClass('selectTextDisabled');
        // do not transfer clearSelectedText() at the top or else the
        // selected text will not be highlighted
        clearSelectedText();
        $('#pageContainer' + page + ' div.textLayer').removeClass('selectTextDisabled');
    } catch (e) { }
}

/**
 * This function is used only if SAVE_ALL_ANNOTATIONS_ONE_TIME is false
 * @param annotation Annotation itself
 * @param newlyCreated Indicates if this annotation is newly created.
 * @param doNotTriggerEvent If true, trigger annotation event. Default.CREATE_ANNOTATION_EVENT will still override this.
 */
function updateAnnotationListAfterSave(annotation, newlyCreated, doNotTriggerEvent) {
    console.log('updateAnnotationListAfterSave()');

    /**
     * This section of code is used to replace the existing annotation object when user edits an annotation like
     * moving its located, resizing it, or editing comments associated to this annotation.
     *
     * This can be placed inside the success block of the ajax call to save annotation to server if
     * Default.SAVE_ALL_ANNOTATIONS_ONE_TIME is false.
     */
    var replaced = false;
    for (var i=0; i<annotations.length; i++) {
        if (annotations[i].id == annotation.id) {
            annotations.splice(i, 1, annotation);
            replaced = true;
            break;
        }
    }

    if ((annotation.id <= 0 || (annotation.id > 0 && (!annotation.audio && !annotation.audioAvailable))) &&
        annotation.annotationType == Annotation.TYPE_AUDIO)
    {
        showPlayer(annotation);
    }

    if (!replaced) annotations.push(annotation);

    if (annotation.annotationType == Annotation.TYPE_TEXT)
        $('#texts').attr('id', 'texts' + annotation.id);
    else if (annotation.isSelectableTextType()) {
        // Save to server and get returned id and assign id to all div elements where id=highlight
        $('#pageContainer' + (annotation.pageIndex + 1) + ' .canvasWrapper').children('div[id="highlight"]').each(function() {
            $(this).attr('id', 'highlight' + annotation.id);
        });
    }
    /**
     * Reset the last tracked positions once saved so that these will be assigned values
     * when they will be used again.
     */
    else if (annotation.annotationType == Annotation.TYPE_ARROW || annotation.annotationType == Annotation.TYPE_MEASUREMENT_DISTANCE) {
        for (var i=0; i<annotation.drawingPositions.length; i++) {
            annotation.drawingPositions[i].lastX = -1;
            annotation.drawingPositions[i].lastY = -1;
        }
    }

    // Update the reference to annotations in Angular JS
    refreshAnnotationList();

    // If annotation is TYPE_STICKY_NOTE, show popu comment form if default option is true.
    if (newlyCreated && Default.ANNOTATION_STICKY_NOTE_POPUP_ON_CREATE &&
        annotation.annotationType == Annotation.TYPE_STICKY_NOTE)
    {
        $.contextMenu('destroy',  '#' + canvasIdName + (annotation.pageIndex + 1));
        editAnnotation(annotation, 'edit');
    }

    if (Default.CREATE_ANNOTATION_EVENTS && !doNotTriggerEvent)
        createAnnotationEvent(annotation);
}

/**
 * When annotation is selected, the page is scrolled but sometimes the annotation
 * is not visible. We move the scroll bar position adding the y value based on the
 * annotation position.
 */
function scrollToAnnotationInCanvas(annotation) {
    console.log('scrollToAnnotationInCanvas() annotation: ' + annotation);
    if (!annotation)
        return;

    PDFViewerApplication.pdfViewer.scrollPageIntoView(annotation.pageIndex + 1);

    var y = annotation.y;
    // If annotation has highlightTextRects, get the smallest Y coordinate value
    if (annotation.highlightTextRects.length > 0)
        y = annotation.highlightTextRects.reduce(function(prev, curr) {
            return prev.Cost < curr.Cost ? prev : curr;
        }).top;

    $('#viewerContainer').scrollTop(($('#viewerContainer').scrollTop() + y) - $('#toolbarContainer').height());
}

/**
 * A convenience function to return the element of the annotation in the annotation list depending on
 * the Default.ANNOTATION_LIST_SIDEBAR_RIGHT setting
 * @returns {*|jQuery|HTMLElement}
 */
function getAnnotationListRowElement(annotation) {
    if (Default.ANNOTATION_LIST_SIDEBAR_RIGHT)
        return $('#sidr #' + annotation.id);
    else
        return $('#annotationList #' + annotation.id);
}

function getSidebarContainerElement() {
    if (Default.ANNOTATION_LIST_SIDEBAR_RIGHT)
        return $('#sidr');
    else
        return $('#sidebarContent');
}

/**
 * Helper function to programmatically remove DOM elements created by Annotationeer to help
 * in optimization when viewer is either scaled or rotated.
 */
function clearAnnotationeerDOMElements() {
    console.log('clearAnnotationeerDOMElements()');

    for (var i=0; i<aTotalPages; i++) {
        $('#pageContainer' + (i + 1) + ' .canvasWrapper').find('div[id^="highlight"]').each(function() {
            $(this).remove();
        });

        $('#pageAnnotation' + (i + 1)).remove();
    }
}

// http://stackoverflow.com/questions/19999388/check-if-user-is-using-ie-with-jquery
function isIE() {
    var rv = -1;
    if (navigator.appName == 'Microsoft Internet Explorer') {
        var ua = navigator.userAgent;
        var re  = new RegExp("MSIE ([0-9]{1,}[\.0-9]{0,})");
        if (re.exec(ua) != null)
            rv = parseFloat( RegExp.$1 );
    }
    else if (navigator.appName == 'Netscape') {
        var ua = navigator.userAgent;
        var re  = new RegExp("Trident/.*rv:([0-9]{1,}[\.0-9]{0,})");
        if (re.exec(ua) != null)
            rv = parseFloat( RegExp.$1 );
    }
    return rv == -1 ? false: true;
}

/**
 * This function will set a cursor using an image and will handle cross browser issues.
 * @param canvas
 * @param image
 * @param x
 * @param y
 * @param defaultCursor
 */
function setCursor(canvas, image, defaultCursor) {
    canvas.style.cursor = (isIE() ? 'url(images/' + image + '.cur)' :
        'url(images/' + image + '.svg) ' + + ' ' + curAnnotationXY + ' ' + curAnnotationXY) +
        ', ' + defaultCursor;
}

/**
 * Call this function if you want to unload all annotations from the web application. If you wish to
 * retrieve them again, call downloadAnnotations(). The annotation list will also be cleared when this
 * function is called.
 */
function unloadAnnotations() {
    console.log('unloadAnnotations()');
    annotations = [];
    for (var p in pages) {
        $('#pageContainer' + (pages[p].pageIndex + 1) + ' .canvasWrapper div').each(function () {
            $(this).remove();
        });

        pages[p].canvasAnnotations = [];
        pages[p].invalidate();
    }

    // Also unload the list from the Angular JS environment, by re-bootstrapping it. Quickest way.
    angular.bootstrap(document.getElementById('sidebarContainerRight'), ['annotationList']);
}

/**
 * Do not call this function directly if you want to reload annotations to the PDF. Call downloadAnnotations()
 * and set the parameter to true.
 */
function reloadAnnotations() {
    for (var p in pages) {
        loadAnnotations(pages[p].pageIndex);
    }

    if ($('#sidebarContainerRight').length > 0) {
        angular.element($('#sidebarContainerRight')).scope().annotations = annotations;
        angular.bootstrap(document.getElementById('sidebarContainerRight'), ['annotationList']);
    }
}

/**
 * This function is only used when the web application is viewed in a mobile device because higlighting
 * text after text selection is not possible in a mobile browser.
 */
function markText() {
    console.log('markText()');
    createSelectText();
}

/**
 * This function is only used when the web application is viewed in a mobile device because there is no way to
 * press the escape key so this button will act as a workaround.
 */
function cancelCreateAnnotation() {
    resetVar();
    $('#cancelAnnotation').addClass('hidden');
}

/**
 * These functions are called when creating annotation related events like add, delete, update.
 */
function createAnnotationEvent(annotation, what) {
    var event = document.createEvent('CustomEvent');
    event.initCustomEvent('annotation_' + (what ? what : (annotation.oldModified ? annotation.oldModified :
        annotation.modified)), true, true,
    {
        annotation: annotation
    });
    event.annotation = annotation;
    var page = pages[canvasIdName + (annotation.pageIndex + 1)];
    page.canvas.dispatchEvent(event);
}

/**
 * Override function so that the browser's context menu will not be  shown in the canvas annotation layer
 */
function hideContextMenu() {
    for (var p in pages) {
        /**
         * Do not use parameter 'hide' as this will result in TypeError exception. It seems
         * that calling contextMenu() will hide it if there is already a visible one.
         */
        $('#' + canvasIdName + (pages[p].pageIndex + 1)).contextMenu();
    }
}

/**
 * This hides the context menu shown when user right clicks on an annotation to show its options.
 * @param pageIndex
 */
function hideAnnotationContextMenu(pageIndex) {
    $.contextMenu('destroy',  '#' + canvasIdName + (pageIndex + 1));
}

/**
 * Helper function to return an annotation in the global annotations array based on id.
 * @param annotation
 * @returns index of the array
 */
function getAnnotationById(annotation) {
    for (var a=0; a<annotations.length; a++) {
        if (annotations[a].id == annotation.id)
            return a;
    }
    return -1;
}

/**
 * Helper function to add annotation to canvas. This can be useful if you wish to get a reference to
 * an annotation object and pass it to some other Annotationeer instance in another iFrame.
 * @param annotation
 */
function updateAnnotationToCanvas(annotation) {
    if (!annotation)
        return;

    if (typeof annotation === 'string')
        annotation = Annotation.createFromJSON(annotation);

    if (annotation.modified == 'update') {
        for (var a in annotations) {
            var updateCanvasAnnotations = false;
            /**
             * For the first condition, if annotation.oldId property != 0, then it means the annotation was saved to
             * the server and an id was returned. So update this annotation's id.
             *
             * The second condition means annotation already has a database generated id, so just updated its
             * properties.
             */
            if (annotations[a].id == annotation.oldId || annotations[a].id == annotation.id)
                updateCanvasAnnotations = true;

            if (updateCanvasAnnotations) {
                annotations[a] = annotation;
                var page = pages[canvasIdName + (annotation.pageIndex + 1)];
                for (var c in page.canvasAnnotations) {
                    if (page.canvasAnnotations[c].id == annotation.id) {
                        page.canvasAnnotations[c] = annotation;

                        if (annotation.isSelectableTextType()) {
                            if (annotation.oldId <= 0) {
                                $('#pageContainer' + (annotation.pageIndex + 1) + ' .canvasWrapper').
                                    children('div[id="highlight' + annotation.oldId + '"]').
                                    each(function()
                                    {
                                        $(this).attr('id', 'highlight' + annotation.id);
                                    });
                            }
                        }
                        else
                            page.invalidate();

                        break;
                    }
                }
                break;
            }
        }
    }
    else if (annotation.modified == 'delete') {
        deleteAnnotation(annotation, false, true);
    }
    else if (annotation.modified == 'insert') {
        var page = pages[canvasIdName + (annotation.pageIndex + 1)];
        var index = getAnnotationById(annotation);

        var page = pages[canvasIdName + (annotation.pageIndex + 1)];

        switch (annotation.annotationType) {
            case Annotation.TYPE_TEXT_HIGHLIGHT:
            case Annotation.TYPE_TEXT_UNDERLINE:
            case Annotation.TYPE_TEXT_STRIKE_THROUGH:
                var pageView = PDFViewerApplication.pdfViewer.getPageView(annotation.pageIndex);
                page.highlightText(annotation.annotationType, annotation.pageIndex, rotateAngle,
                    PDFViewerApplication.pdfViewer.currentScale, pageView, annotation,
                    annotation.getHighlightTextColor());

                $('#pageContainer' + (annotation.pageIndex + 1) + ' .canvasWrapper').children('div[id="highlight"]').each(function() {
                    $(this).attr('id', 'highlight' + annotation.id);
                });

                annotations.push(annotation);
                updateAnnotationListAfterSave(annotation, false, true);
                break;
            case Annotation.TYPE_TEXT:
                page.addText(rotateAngle, annotation, true, true, true);
                break;
            default:
                page.addAnnotation(annotation, rotateAngle, PDFViewerApplication.pdfViewer.currentScale, false, true, true);
                page.invalidate();
                break;
        }
    }
}