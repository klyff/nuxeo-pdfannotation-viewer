Default.prototype = { };
function Default() { }

// Global variable of PDF.JS. Uncomment to save memory consumption by caching only # of pages.
//DEFAULT_CACHE_SIZE = 1;

// Global variable of PDF.JS. Uncomment to override zoom in scale value. 4 is equal to 400%
//MAX_SCALE = 4;

/**
 * By default, its value is based on computation is 4096 width X 4096 height. If the canvas size
 * is more than that, the renderings can be blurry and its mouse position will be out of place.
 * To disable this, set value at -1 but the performance will be noticeable as there will be a lag.
 *
 * Usually, the good optimal max zoom value at 2.5 or 250%. Any zoom value more than that and you
 * will notice some blurriness that would indicate that mouse positions will get out of place because
 * the value of width * height of the canvas is more than the default (4096x4096) of PDF.JS.
 */
//PDFJS.maxCanvasPixels = -1;

// Listen to DOMContentLoaded event
Default.LISTEN_DOM_CONTENT_LOADED = true;
// Create listeners for annotation events
Default.LISTEN_ANNOTATION_EVENTS = false;
// Create annotation events
Default.CREATE_ANNOTATION_EVENTS = false;

Default.FONT_SIZE_TYPE = 'pt';
Default.FONT_SIZE = '12';
Default.FONT_TYPE = 'sans-serif';
Default.WATERMARK_FONT_SIZE = 90;
Default.WATERMARK_FONT_TYPE = 'tahoma';
// Set to true if you wish to have watermark shown in every page of the PDF.
Default.WATERMARK_SHOW = true;

Default.SCREENSHOT_BORDER_COLOR = 'red';

Default.FILL_OPACITY = 0.3;

// Default screen shot background color. Change to your preference
var hexScreenShotColor = '#d4bdc8';
var rgbScreenShot = hexToRgb(hexScreenShotColor);
Default.SCREENSHOT_FILL_COLOR = 'rgba(' + rgbScreenShot.r + ', ' + rgbScreenShot.g + ', ' + rgbScreenShot.b + ', ' + Default.FILL_OPACITY + ')';

// This creates a dimmed effect for the whole page
Default.SCREENSHOT_DIM_COLOR = 'rgba(0, 0, 0, ' + Default.FILL_OPACITY + ')';

Default.DRAW_COLOR_FOREGROUND = '#ff0000';
Default.DRAW_COLOR_BACKGROUND = '#ffff00';
Default.DRAW_WIDTH = 3;
Default.DRAW_LINECAP = 'round';

// A drawing annotation should have at least 10 points. This way, it is visible.
Default.DRAW_POINT_MINIMUM = 10;

// Choose either mp3 or ogg format
Default.AUDIO_TYPE = 'mp3';

// Used by screenShot setting
Default.ANNOTATION_BOX_LINEWIDTH = 1;
Default.ANNOTATION_BOX_COLOR = 'red';

Default.ANNOTATION_SELECTED_LINEWIDTH = 2;
Default.ANNOTATION_SELECTED_COLOR = '#cc0000';
Default.ANNOTATION_SELECTION_BOX_COLOR = 'darkred';
Default.ANNOTATION_SELECTION_BOX_SIZE = 8;
Default.ANNOTATION_SELECTION_BOX_COLOR_TYPE_TEXT = '1px solid red';

/**
 * By default, the draw annotation button in the toolbar is toggled by default until
 * the user presses the ESCAPE key.
 * @type {boolean}
 */
Default.ANNOTATION_DRAW_TOGGLED = false;

/**
 * If true, the measurement area will have a minimum length in order for the annotation to be created.
 * @type {boolean}
 */
Default.ANNOTATION_MEASUREMENT_DISTANCE_MINIMUM_LENGTH = false;
/**
 * This is a fixed setting for the font size label on the measurement distance annotation.
 * @type {number}
 */
Default.ANNOTATION_MEASUREMENT_DISTANCE_LABEL_FONT_SIZE = 14;

/**
 * Look up the values in the measurement_types table in the database for your preferred default value.
 * 1 is inches / 2 CENTIMETERS.
 * @type {number}
 */
Default.ANNOTATION_MEASUREMENT_TYPE_DEFAULT = 2;

/**
 * Maximum number of points for shape. If area measurement annotation reaches number
 * of max points without closing the polygon, it will close it.
 *
 * This should not be changed as this is also the value used by annotations that square
 * shaped and its max selection handles is 8.
 * @type {number}
 */
Default.ANNOTATION_SELECTION_MAX_POINTS = 8;

// Since IE is an idiot for not being able to identify an image's width/height when
// source is set, we manually set preferred width and height.
Default.ANNOTATION_STAMP_WIDTH = 188;
Default.ANNOTATION_STAMP_HEIGHT = 100;
Default.ANNOTATION_ICON_SIDE = 22;

/**
 * Settings for font size of annotation type TYPE_TEXT including
 * range for modifying font size.
 * @type {number}
 */
Default.ANNOTATION_TYPE_TEXT_FONT_SIZE_RANGE_MIN = 6;
Default.ANNOTATION_TYPE_TEXT_FONT_SIZE_RANGE_MAX = 24;
Default.ANNOTATION_TYPE_TEXT_CHAR_LIMIT = 20;

// Used by arrow
Default.ARROW_SIZE = 20;

/**
 * If true, show popup where the save popup menu item will create the text type.
 * If false, create right away without showing popup.
 */
Default.TEXT_TYPE_POPUP_BEFORE_CREATE = false;

/**
 * If false, the annotation list will be displayed in the left sidebar that also shows the document,
 * outline and attachments included in the PDF.
 *
 * If true, it will load Sidr related Javascript files in order to load it in the right sidebar.
 */
Default.ANNOTATION_LIST_SIDEBAR_RIGHT = false;

/**
 * If true, all stick note annotations will show a popup after creation. If false, no popup will show
 * unless the user selects edit or reply from the right click popup menu.
 * @type {boolean}
 */
Default.ANNOTATION_STICKY_NOTE_POPUP_ON_CREATE = true;

/**
 * If true, all annotations will be saved when user clicks the save button. If user leaves the page,
 * the onBeforeUnload event will check if there are annotations that need saving. If yes, it will
 * prompt the user that there are annotations that need saving, or else the changes will be discarded.
 */
Default.SAVE_ALL_ANNOTATIONS_ONE_TIME = true;

/**
 * This is a universal setting to set all annotations to read-only. If an annotation's property is
 * not read-only and this setting is, the universal setting will be followed.
 */
Default.ANNOTATIONS_READ_ONLY = false;

/**
 * If false, tooltips will not be shown.
 */
Default.ANNOTATIONS_TOOLTIP = true;

/**
 * Sets the maximum number of characters to be displayed in the tooltip.
 * @type {number}
 */
Default.ANNOTATIONS_TOOLTIP_MAX_CHARS = 20;

/**
 * If false, cannot create audio annotations.
 */
Default.ANNOTATIONS_AUDIO = false;

/**
 * If false, toolbar annotation will be hidden.
 * @type {boolean}
 */
Default.TOOLBAR_ANNOTATION_ENABLED = true;

/**
 * If false, regardless if Default.ANNOTATION_LIST_SIDEBAR_RIGHT is true or false,
 * there will be no sidebar for annotations. The developer must be responsible not
 * to call downloadAnnotations().
 * @type {boolean}
 */
Default.SIDEBAR_ENABLED = true;