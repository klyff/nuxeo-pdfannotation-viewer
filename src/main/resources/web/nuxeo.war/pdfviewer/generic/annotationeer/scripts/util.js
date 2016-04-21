/**
 * This function enables you to load a CSS file programmatically.
 */
https://github.com/filamentgroup/loadCSS/blob/master/loadCSS.js
(function(w){
    "use strict";
    /* exported loadCSS */
    var loadCSS = function( href, before, media ){
        // Arguments explained:
        // `href` [REQUIRED] is the URL for your CSS file.
        // `before` [OPTIONAL] is the element the script should use as a reference for injecting our stylesheet <link> before
        // By default, loadCSS attempts to inject the link after the last stylesheet or script in the DOM. However, you might desire a more specific location in your document.
        // `media` [OPTIONAL] is the media type or query of the stylesheet. By default it will be 'all'
        var doc = w.document;
        var ss = doc.createElement( "link" );
        var ref;
        if( before ){
            ref = before;
        }
        else {
            var refs = ( doc.body || doc.getElementsByTagName( "head" )[ 0 ] ).childNodes;
            ref = refs[ refs.length - 1];
        }

        var sheets = doc.styleSheets;
        ss.rel = "stylesheet";
        ss.href = href;
        // temporarily set media to something inapplicable to ensure it'll fetch without blocking render
        ss.media = "only x";

        // Inject link
        // Note: the ternary preserves the existing behavior of "before" argument, but we could choose to change the argument to "after" in a later release and standardize on ref.nextSibling for all refs
        // Note: `insertBefore` is used instead of `appendChild`, for safety re: http://www.paulirish.com/2011/surefire-dom-element-insertion/
        ref.parentNode.insertBefore( ss, ( before ? ref : ref.nextSibling ) );
        // A method (exposed on return object for external use) that mimics onload by polling until document.styleSheets until it includes the new sheet.
        var onloadcssdefined = function( cb ){
            var resolvedHref = ss.href;
            var i = sheets.length;
            while( i-- ){
                if( sheets[ i ].href === resolvedHref ){
                    return cb();
                }
            }
            setTimeout(function() {
                onloadcssdefined( cb );
            });
        };

        // once loaded, set link's media back to `all` so that the stylesheet applies once it loads
        ss.onloadcssdefined = onloadcssdefined;
        onloadcssdefined(function() {
            ss.media = media || "all";
        });
        return ss;
    };
    // commonjs
    if( typeof module !== "undefined" ){
        module.exports = loadCSS;
    }
    else {
        w.loadCSS = loadCSS;
    }
}( typeof global !== "undefined" ? global : this ));

function onloadCSS(ss, callback) {
    ss.onload = function() {
        ss.onload = null;
        if( callback ) {
            callback.call( ss );
        }
    };

    // This code is for browsers that don’t support onload, any browser that
    // supports onload should use that instead.
    // No support for onload:
    //	* Android 4.3 (Samsung Galaxy S4, Browserstack)
    //	* Android 4.2 Browser (Samsung Galaxy SIII Mini GT-I8200L)
    //	* Android 2.3 (Pantech Burst P9070)

    // Weak inference targets Android < 4.4
    if( "isApplicationInstalled" in navigator && "onloadcssdefined" in ss ) {
        ss.onloadcssdefined( callback );
    }
}

/**
 * This function enables you to load a Javascript file programmatically.
 * https://www.nczonline.net/blog/2009/07/28/the-best-way-to-load-external-javascript/
 */
function loadScript(url, callback){
    var script = document.createElement("script")
    script.type = "text/javascript";

    if (script.readyState){  //IE
        script.onreadystatechange = function(){
            if (script.readyState == "loaded" ||
                script.readyState == "complete"){
                script.onreadystatechange = null;
                callback();
            }
        };
    } else {  //Others
        script.onload = function(){
            callback();
        };
    }

    script.src = url;
    document.getElementsByTagName("head")[0].appendChild(script);
}

// http://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
function componentToHex(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}

function rgbToHex(r, g, b) {
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

// http://stackoverflow.com/questions/5999118/add-or-update-query-string-parameter
function updateQueryStringParameter(uri, key, value) {
    var re = new RegExp("([?&])" + key + "=.*?(&|$)", "i");
    var separator = uri.indexOf('?') !== -1 ? "&" : "?";
    if (uri.match(re)) {
        return uri.replace(re, '$1' + key + "=" + value + '$2');
    }
    else {
        return uri + separator + key + "=" + value;
    }
}

// http://upshots.org/javascript/jquery-test-if-element-is-in-viewport-visible-on-screen
$.fn.isOnScreen = function() {
    var viewport = {};
    viewport.top = $(window).scrollTop();
    viewport.bottom = viewport.top + $(window).height();
    var bounds = {};
    bounds.top = this.offset().top;
    bounds.bottom = bounds.top + this.outerHeight();
    return ((bounds.top <= viewport.bottom) && (bounds.bottom >= viewport.top));
};

// http://stackoverflow.com/questions/32290952/convert-6-digit-color-code-to-3-digits
function hexToRgb(hex) {
    // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
    var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, function(m, r, g, b) {
        return r + r + g + g + b + b;
    });

    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function rgbToShortHex(rgb){
    var hexR = Math.round(rgb.r / 17).toString(16);
    var hexG = Math.round(rgb.g / 17).toString(16);
    var hexB = Math.round(rgb.b / 17).toString(16);
    return '#' + hexR + '' + hexG + '' + hexB;
}

function getShortHexColorCode(code){
    var rgb = hexToRgb(code);
    return rgbToShortHex(rgb);
}

function getImageWidthFromHeight(img, height) {
    return height * (img.naturalWidth / img.naturalHeight);
}

// http://jsfiddle.net/m1erickson/Sg7EZ/
function drawWithArrowheads(ctx, x1, y1, x2, y2, scale, both, color) {
    ctx.fillStyle = color;

    if (both) {
        var startRadians = Math.atan((y2 - y1) / (x2 - x1));
        startRadians += ((x2 >= x1) ? -90 : 90) * Math.PI / 180;
        drawArrowhead(ctx, x1, y1, startRadians, scale);
    }

    var endRadians = Math.atan((y2 - y1) / (x2 - x1));
    endRadians += ((x2 >= x1) ? 90 : -90) * Math.PI / 180;
    drawArrowhead(ctx, x2, y2, endRadians, scale);
}

function drawArrowhead(ctx, x, y, radians, scale) {
    ctx.save();
    ctx.beginPath();
    ctx.translate(x, y);
    ctx.rotate(radians);
    ctx.moveTo(0, 0);
    ctx.lineTo(5 * scale, Default.ARROW_SIZE * scale);
    ctx.lineTo(-5 * scale, Default.ARROW_SIZE * scale);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

/**
 * Pythagoras theorem - get distance between 2 points
 * http://stackoverflow.com/questions/20916953/get-distance-between-two-points-in-canvas
 */
function getDistance(x1, y1, x2, y2) {
    var a = x1 - x2
    var b = y1 - y2
    return Math.sqrt(a * a + b * b);
}

// http://forums.codeguru.com/showthread.php?106593-Calculating-a-point-from-a-point-angle-and-distance
function getPointFromDistance(x1, y1, angle, distance) {
    var x = x1 + (Math.cos(angle) * distance);
    var y = y1 + (Math.sin(angle) * distance);
    return { x: x, y: y };
}

// https://gist.github.com/conorbuck/2606166
function getAngle(x1, y1, x2, y2, degrees) {
    if (degrees)
        return Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
    else
        // in radians
        return Math.atan2(y2 - y1, x2 - x1);
}

$.fn.scrollTo = function( target, options, callback ){
    if(typeof options == 'function' && arguments.length == 2){ callback = options; options = target; }
    var settings = $.extend({
        scrollTarget  : target,
        offsetTop     : 50,
        duration      : 500,
        easing        : 'swing'
    }, options);
    return this.each(function(){
        var scrollPane = $(this);
        var scrollTarget = (typeof settings.scrollTarget == "number") ? settings.scrollTarget : $(settings.scrollTarget);
        var scrollY = (typeof scrollTarget == "number") ? scrollTarget : scrollTarget.offset().top + scrollPane.scrollTop() - parseInt(settings.offsetTop);
        scrollPane.animate({scrollTop : scrollY }, parseInt(settings.duration), settings.easing, function(){
            if (typeof callback == 'function') { callback.call(this); }
        });
    });
}

/**
 * drawLabelOnTopOfLine() - http://stackoverflow.com/questions/5068216/placing-text-label-along-a-line-on-a-canvas
 * @param ctx Canvas context
 * @param text Text to draw
 * @param p1 point 1
 * @param p2 point 2
 * @param gap Gap space between the line and text
 * @param font Font value for use in Canvas setting
 * @param alignment Text alignment: center, left, right
 * @param padding Left and right padding space if alignment is left or right
 */
function drawLabelOnTopOfLine(ctx, text, p1, p2, gap, font, color, alignment, padding) {
    if (!alignment) alignment = 'center';
    if (!padding) padding = 0;

    var dx = p2.x - p1.x;
    var dy = p2.y - p1.y;
    var len = Math.sqrt(dx * dx + dy * dy);
    var avail = len - 2 * padding;

    var textToDraw = text;
    if (Default.ANNOTATION_MEASUREMENT_DISTANCE_MINIMUM_LENGTH && ctx.measureText && ctx.measureText(textToDraw).width > avail) {
        while (textToDraw && ctx.measureText(textToDraw + '...').width > avail) textToDraw = textToDraw.slice(0, -1);
        textToDraw += '...';
    }

    // Keep text upright
    var angle = Math.atan2(dy, dx);
    if (angle < -Math.PI/2 || angle > Math.PI / 2) {
        var p = p1;
        p1 = p2;
        p2 = p;
        dx *= -1;
        dy *= -1;
        angle -= Math.PI;
    }

    var p, pad;
    if (alignment == 'center') {
        p = p1;
        pad = 1 / 2;
    }
    else {
        var left = alignment == 'left';
        p = left ? p1 : p2;
        pad = padding / len * (left ? 1 : -1);
    }

    if (font)
        ctx.font = font;

    ctx.save();
    ctx.textAlign = alignment;
    ctx.translate(p.x + dx * pad, (p.y + dy * pad) - gap);
    ctx.rotate(angle);
    ctx.fillStyle = color;
    ctx.fillText(textToDraw, 0, 0);
    ctx.restore();
}

function getMeasurementFromPixels(measurementType, pixels) {
    var mm = pixels * 0.264583;
    switch (measurementType) {
        case MeasurementType.CENTIMETERS:
            return Math.abs((mm * 0.1).toFixed(1)) + ' cm';
        case MeasurementType.MILLIMETERS :
            return Math.abs((mm).toFixed(1)) + ' mm';
        case MeasurementType.INCHES:
            return Math.abs((mm * 0.0393701).toFixed(1)) + ' in';
    }
    return '';
}

function isImage(i) {
    return i instanceof HTMLImageElement;
}

// http://stackoverflow.com/questions/16228048/replace-a-specific-color-by-another-in-an-image-sprite-in-a-html5-canvas
function changeColorOfDrawnImage(context, image, color, x, y, w, h, rotate) {
    // Change icon to black
    context.save();
    context.translate(x, y);

    if (rotate)
        context.rotate(rotate);

    context.drawImage(image, 0, 0, w, h);
    context.fillStyle = color;
    context.globalCompositeOperation = "source-atop";
    context.fillRect(0, 0, w, h);
    context.restore();
}

/**
 * This returns a numerical value corresponding to the rotation applied to any HTML element.
 * @param obj Must be a JQuery element
 * @returns {number}
 * http://stackoverflow.com/questions/8270612/get-element-moz-transformRotate-value-in-jquery
 */
function getRotationDegrees(obj) {
    var matrix = obj.css("-webkit-transform") ||
        obj.css("-moz-transform") ||
        obj.css("-ms-transform") ||
        obj.css("-o-transform") ||
        obj.css("transform");

    if (!matrix) {
        var angle = 0;
    }
    else if (matrix !== 'none') {
        var values = matrix.split('(')[1].split(')')[0].split(',');
        var a = values[0];
        var b = values[1];
        var angle = Math.round(Math.atan2(b, a) * (180/Math.PI));
    }
    else {
        var angle = 0;
    }

    return (angle < 0) ? angle + 360 : angle;
}

/**
 * Gets the selection DOM element that the selected text belongs to. While this function can be changed to accommodate
 * returning a list of all DOM elements that fall within the selection, this function will do. The first element returned
 * can be used to identify what angle rotation the DOM element has, if any.
 * @param isStart returns the first DOM element if there are many DOM elements in the selection. False will return the
 * last element.
 * http://stackoverflow.com/questions/1335252/how-can-i-get-the-dom-element-which-contains-the-current-selection
 */
function getSelectionBoundaryElement(isStart) {
    var range, sel, container;
    if (document.selection) {
        range = document.selection.createRange();
        range.collapse(isStart);
        return range.parentElement();
    }
    else {
        sel = window.getSelection();
        if (sel.getRangeAt) {
            if (sel.rangeCount > 0) {
                range = sel.getRangeAt(0);
            }
        }
        else {
            // Old WebKit
            range = document.createRange();
            range.setStart(sel.anchorNode, sel.anchorOffset);
            range.setEnd(sel.focusNode, sel.focusOffset);

            // Handle the case when the selection was selected backwards (from the end to the start in the document)
            if (range.collapsed !== sel.isCollapsed) {
                range.setStart(sel.focusNode, sel.focusOffset);
                range.setEnd(sel.anchorNode, sel.anchorOffset);
            }
        }

        if (range) {
            container = range[isStart ? "startContainer" : "endContainer"];

            // Check if the container is a text node and return its parent if so
            return container.nodeType === 3 ? container.parentNode : container;
        }
    }
}

// http://stackoverflow.com/questions/667951/how-to-get-nodes-lying-inside-a-range-with-javascript
var getNodesBetween = function(startNode, endNode, includeStartAndEnd, filter) {
    if (startNode == endNode && startNode.childNodes.length === 0) {
        return [startNode];
    };

    var getNextNode = function(node, finalNode, skipChildren) {
        //if there are child nodes and we didn't come from a child node
        if (finalNode == node) {
            return null;
        }

        if (node.firstChild && !skipChildren) {
            return node.firstChild;
        }

        if (!node.parentNode){
            return null;
        }
        return node.nextSibling || getNextNode(node.parentNode, endNode, true);
    };

    var nodes = [];

    if (includeStartAndEnd) {
        nodes.push(startNode);
    }

    while ((startNode = getNextNode(startNode, endNode)) && (startNode != endNode)) {
        if (filter) {
            if (filter(startNode)) {
                nodes.push(startNode);
            }
        }
        else {
            nodes.push(startNode);
        }
    }

    if(includeStartAndEnd){
        nodes.push(endNode);
    }

    return nodes;
}

/**
 * Lists the different angles of the selectedNodes.
 * @param nodes
 * @returns {Number}
 */
function getAngleCountOfSelectedNodes(nodes) {
    var angles = [];

    for (var n in nodes) {
        var angle = getRotationDegrees(nodes[n]);
        if ($.inArray(angle, angles) == -1) {
            angles.push(angle);
        }
    }

    return angles.length;
}

// http://aramk.com/blog/2012/01/17/adding-css-rules-with-important-using-jquery/
// Set !important to CSS in JQuery
jQuery.fn.style = function(styleName, value, priority) {
    // DOM node
    var node = this.get(0);
    // Ensure we have a DOM node
    if (typeof node == 'undefined') {
        return;
    }
    // CSSStyleDeclaration
    var style = this.get(0).style;
    // Getter/Setter
    if (typeof styleName != 'undefined') {
        if (typeof value != 'undefined') {
            // Set style property
            var priority = typeof priority != 'undefined' ? priority : '';
            style.setProperty(styleName, value, priority);
        } else {
            // Get style property
            return style.getPropertyValue(styleName);
        }
    } else {
        // Get CSSStyleDeclaration
        return style;
    }
}

// http://stackoverflow.com/questions/18798568/get-max-and-min-of-object-values-from-javascript-array
function getBoundingBoxOfPolygon(coordinates) {
    var minX = getMinField(coordinates, 'x');
    var minY = getMinField(coordinates, 'y');
    var maxX = getMaxField(coordinates, 'x');
    var maxY = getMaxField(coordinates, 'y');
    return { x: minX, y: minY, w: (maxX - minX), h: (maxY - minY) };
}

function getMaxField(array, field) {
    return array.reduce(function (previousValue, currentValue) {
        return Math.max(currentValue[field], previousValue);
    }, -Infinity);
}

function getMinField(array, field) {
    return array.reduce(function (previousValue, currentValue) {
        return Math.min(currentValue[field], previousValue);
    }, Infinity);
}

// http://stackoverflow.com/questions/7787552/check-with-javascript-for-html5-type-color-support
function supportsHTML5ColorInput() {
    var inputElem = document.createElement('input'), bool, docElement = document.documentElement, smile = ':)';

    inputElem.setAttribute('type', 'color');
    bool = inputElem.type !== 'text';

    // We first check to see if the type we give it sticks..
    // If the type does, we feed it a textual value, which shouldn't be valid.
    // If the value doesn't stick, we know there's input sanitization which infers a custom UI
    if (bool) {

        inputElem.value         = smile;
        inputElem.style.cssText = 'position:absolute;visibility:hidden;';

        // chuck into DOM and force reflow for Opera bug in 11.00
        // github.com/Modernizr/Modernizr/issues#issue/159
        docElement.appendChild(inputElem);
        docElement.offsetWidth;
        bool = inputElem.value != smile;
        docElement.removeChild(inputElem);
    }

    return bool;
}

// http://gis.stackexchange.com/questions/139033/check-if-a-point-cordinate-is-between-linestring-cordinates
function isOnLine(coordinates, px, py) {
    var deltaX = coordinates[1].x - coordinates[0].x;
    var liesInXDir = false;

    if (deltaX == 0)
        liesInXDir = (px == coordinates[0].x);
    else {
        var t = (px - coordinates[0].x) / deltaX;
        liesInXDir = (t >= 0 && t <= 1);

        if (liesInXDir) {
            deltaY = coordinates[1].y - coordinates[0].y;

            if (deltaY == 0)
                return (py == coordinates[0].y);
            else {
                t = (py - coordinates[0].y) / deltaY;
                return (t >= 0 && t <= 1);
            }
        }
        else
            return false;
    }
}

function hasTouch() {
    return 'ontouchstart' in window;
}


// http://stackoverflow.com/questions/20885297/collision-detection-in-html5-canvas
function isRectCircleColliding(circle, rect){
    var distX = Math.abs(circle.x - rect.x - rect.w / 2);
    var distY = Math.abs(circle.y - rect.y - rect.h / 2);

    if (distX > (rect.w / 2 + circle.r)) { return false; }
    if (distY > (rect.h / 2 + circle.r)) { return false; }

    if (distX <= (rect.w / 2)) { return true; }
    if (distY <= (rect.h / 2)) { return true; }

    var dx = distX - rect.w / 2;
    var dy = distY - rect.h / 2;
    return (dx * dx + dy * dy <= (circle.r * circle.r));
}

// http://stackoverflow.com/questions/16792841/detect-if-user-clicks-inside-a-circle
function isPointInCircle(x, y, cx, cy, radius) {
    var distanceSquared = (x - cx) * (x - cx) + (y - cy) * (y - cy);
    return distanceSquared <= radius * radius;
}