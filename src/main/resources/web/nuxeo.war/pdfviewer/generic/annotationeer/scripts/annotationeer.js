// This variable will be assigned when the user is logged in to the system


var canvasIdName = 'pageAnnotation';
var zIndex = 1000;

var pdfDocuments = [];

var pdfDocumentInfo = new PDFDocument;

// This is a sample code for displaying a lone PDF file
pdfDocumentInfo.documentId = '1000';
pdfDocumentInfo.totalPages = 14;
pdfDocuments.push(pdfDocumentInfo);

// This is a sample code for displaying a group of PDF files as one.
//pdfDocumentInfo = new PDFDocument;
//pdfDocumentInfo.documentId = '3281120';
//pdfDocumentInfo.totalPages = 6;
//pdfDocumentInfo.isFirst = true;
//pdfDocuments.push(pdfDocumentInfo);
//
//pdfDocumentInfo = new PDFDocument;
//pdfDocumentInfo.documentId = '3281120';
//pdfDocumentInfo.totalPages = 6;
//pdfDocuments.push(pdfDocumentInfo);
//
//pdfDocumentInfo = new PDFDocument;
//pdfDocumentInfo.documentId = '3281120';
//pdfDocumentInfo.totalPages = 6;
//pdfDocumentInfo.isLast = true;
//pdfDocuments.push(pdfDocumentInfo);

/**
 * This variable is used to indicate the total number of pages for a single PDF file or group of PDF files.
 */
var aTotalPages = 0;

for (var i = 0; i < pdfDocuments.length; i++) {
   aTotalPages += pdfDocuments[i].totalPages;
}

/**
 * This variable is reference to the 1st PDF file of a group or a single PDF file.
 */
var currentDocument = pdfDocuments[0];

/**
 * This variable can be left as is. We had a project where the same PDF file is viewed and annotated in a
 * Java applet and the positioning is different in the Web version so this divisor will adjust positions to
 * ensure that both Web and Java applet versions will display correct positioning of the annotations.
 *
 * The Java library used is QOPPA.
 */
var canvasSizeDivisor = 3;

/**
 * This is a global variable of PDF.JS. Override this value for your own to load the PDF file.
 * @type {string}
 */
DEFAULT_URL = docUrl + pdfDocuments[0].documentId + '.pdf';

$(document).ready(function () {
   $('#aPageNumber')
           .keypress(function () {
              if (event.which == 13) {
                 event.preventDefault();
                 var page = parseInt($('#aPageNumber').val());

                 if (isNaN(page))
                    return;

                 var totalPagesCtr = 0;
                 for (var d = 0; d < pdfDocuments.length; d++) {
                    if (totalPagesCtr + pdfDocuments[d].totalPages >= page) {
                       if (currentDocument == pdfDocuments[d])
                          PDFViewerApplication.pdfViewer.currentPageNumber = page;
                       else
                          reloadPDF(pdfDocuments[d], page - totalPagesCtr);
                       break;
                    }
                    totalPagesCtr += pdfDocuments[d].totalPages;
                 }
              }
           })
           .focusout(function () {
              pageChanged(PDFViewerApplication.pdfViewer.currentPageNumber);
           });

   if (pdfDocuments && pdfDocuments.length > 1) {
      var wheelEvent = isEventSupported('mousewheel') ? 'mousewheel' : 'wheel';
      $('#viewerContainer').on(wheelEvent, function (e) {
         if ($('body').hasClass('loadingInProgress') || !$('div.progress').hasClass('indeterminate'))
            return;

         var oEvent = e.originalEvent;
         var delta = oEvent.deltaY || oEvent.wheelDelta;
         var elem = $(e.currentTarget);

         if (delta > 0 && elem[0].scrollHeight - elem.scrollTop() == elem.outerHeight()) {
            nextDocument();
         } else if (delta < 0 && elem.scrollTop() == 0) {
            previousDocument();
         }
      });
   }

   // selected text listener
   var viewContainerMouseDown = false;
   var viewContainerMouseMove = false;
   $('#viewerContainer').mousedown(function (e) {
      viewContainerMouseDown = true;
   });

   $('#viewerContainer').mousemove(function (e) {
      if (viewContainerMouseDown)
         viewContainerMouseMove = true;
   });

   $('#viewerContainer').mouseup(function (e) {
      if (viewContainerMouseMove && getSelectedText() != '') {
         e.preventDefault();
         displaySelectedTextMenu(e);
      }

      viewContainerMouseDown = false;
      viewContainerMouseMove = false;
   });

   // if user clicks anywhere within selected text area, then right clicks again
   $('#viewerContainer').on('contextmenu', function (e) {
      if (getSelectedText() != '' && isWithinSelectionBound(e.clientX, e.clientY)) {
         displaySelectedTextMenu(e);
      }
      e.preventDefault();
   });

   // this checks if text selection mode is enabled, ensures when user scrolls that
   // all text layers can be text selectable
   $('#viewerContainer').scroll(function (e) {
      if ($('#textSelection').hasClass('toggled') ||
              $('#textHighlight').hasClass('toggled') ||
              $('#textUnderline').hasClass('toggled') ||
              $('#textStrikeThrough').hasClass('toggled'))
      {
         if (pages) {
            for (var p in pages) {
               pages[p].canvas.style.pointerEvents = 'none';
            }
         }
      }
   });

   $(document).keydown(function (e) {
      // backspace == 27
      if (e.keyCode == 27) {
         if (boxAnnotationGuide && boxAnnotationGuide.dummy) {
            var page = pages[canvasIdName + (boxAnnotationGuide.pageIndex + 1)];
            if (page)
               try {
                  var annotation = pages[p].canvasAnnotations[pages[p].canvasAnnotations.length - 1];
                  if (annotation && annotation.dummy) {
                     pages[p].canvasAnnotations.splice(pages[p].canvasAnnotations.length - 1, 1);
                  }
               } catch (e) {
               }
         }

         closeAllDropDown();
         resetVar();
      }
      // delete == 46
      else if (e.keyCode == 46) {
         if (selectedAnnotations.length == 1) {
            deleteAnnotation(selectedAnnotations[0]);
         }
      }
   });

   $('#colorPalette').on('input', function () {
      Default.DRAW_COLOR_FOREGROUND = $(this).val();
      $('#color_fg').css('background', $(this).val());
      console.log('Changed foreground color: ' + Default.DRAW_COLOR_FOREGROUND);
   });

   $('#backgroundPalette').on('input', function () {
      Default.DRAW_COLOR_BACKGROUND = $(this).val();
      $('#color_bg').css('background', $(this).val());
      console.log('Changed background color: ' + Default.DRAW_COLOR_BACKGROUND);
   });
});

/**
 * This is triggered when the PDF file is loaded. This is where you call downloadAnnotations() to download all
 * annotations from the server and add them to the PDF pages.
 */
if (Default.LISTEN_DOM_CONTENT_LOADED)
   document.addEventListener('DOMContentLoaded', function (e) {
      console.log('DOMContentLoaded');
      setInitialPageBookmark(1);
      init();
   }, true);

/**
 * This event listener is needed because if user creates a drawing and the mouseUp ends up outside the canvas, then
 * the canvas' mouseUp event needs to be called in order to finish drawing.
 */
document.addEventListener('mouseup', function (e) {
   if (pages)
      for (var p in pages) {
         if (!(e.srcElement instanceof HTMLCanvasElement)) {
            if (pages[p].isCreatingAnnotation || pages[p].isDrawing || isResizeDrag)
               pages[p].canvas.onmouseup(e);

            for (var i = 0; i < pages[p].canvasAnnotations.length; i++) {
               if (pages[p].canvasAnnotations[i].moving) {
                  pages[p].canvas.onmouseup(e);
                  pages[p].invalidate();
               }
            }
         }
      }
}, true);

/**
 * Ensure that all selected text type e.g. highlight, underline, strike-through are
 * deselected by removing border CSS attribute. Code below will add border if the
 * annotation is selected.
 */
for (var i = 0; i < annotations.length; i++) {
   var divSet = $('div[id=highlight' + annotations[i].id + ']');
   if (divSet)
      divSet.each(function () {
         $(this).css('border', '');
      });
}

document.addEventListener('pagechange', function (e) {
   pageChanged(e.pageNumber);
}, true);

/**
 * This is the event triggered by PDF.JS whenever a page is rendered which happens when it is visible in the browser.
 */
document.addEventListener('pagerendered', function (e) {
   var pageIndex = e.detail.pageNumber - 1;
   runAfterPageRendered(pageIndex);
}, true);

function isEventSupported(eventName) {
   var el = document.createElement('div');
   eventName = 'on' + eventName;
   var isSupported = (eventName in el);
   if (!isSupported) {
      el.setAttribute(eventName, 'return;');
      isSupported = typeof el[eventName] == 'function';
   }
   el = null;
   return isSupported;
}

function init() {

   //initURLS();

   $('#aPageNumber').val('');
   $('#colorPalette').val(Default.DRAW_COLOR_FOREGROUND);
   $('#backgroundPalette').val(Default.DRAW_COLOR_BACKGROUND);
   $('#color_fg').css('background-color', Default.DRAW_COLOR_FOREGROUND);
   $('#color_bg').css('background-color', Default.DRAW_COLOR_BACKGROUND);

   updateNavPageButtonState();

   if (Default.SAVE_ALL_ANNOTATIONS_ONE_TIME) {
      window.onbeforeunload = function () {
         if (getModifiedAnnotations().length > 0)
            return 'There are unsaved annotations. If you leave, they will be discarded.'
      }
   }

   // Disable screen shot feature if not IE because of its strict CORS
   // security, it will not allow canvas.toDataURL().
   if (isIE()) {
      $('#toggleScreenShot').remove();
   }

   // Remove console.warn messages from PDF.JS
   console.warn = function () {
   }

   downloadAnnotations();

   initWebAppPreferences();

   for (var i = 0; i < pdfDocuments.length; i++) {
      aTotalPages = pdfDocuments[0].totalPages / 2;
   }

   $('#aNumPages').html('of ' + aTotalPages);
}

/**
 * This is where you place code to download annotations from the server and place them in arrays annotations and
 * highlightTexts. Once populated, loop through these 2 array objects and add them to the PDF pages.
 */
function downloadAnnotations(reload) {
   annotations = [];
   var annotationURL = restUrl + annotationSaveUrl;//restUrl + 'annotations/' + currentDocument.documentId;
   $.ajax({
      dataType: 'json',
      url: annotationURL,
      async: false,
      success: function (response, status, xhr) {

         if (!response) {
            return;
         }

         var annotationsServer = response.annotations;

         if (response.settings) {
            for (var i = 0; i < response.settings.length; i++) {
               if (response.settings[i].key == 'ANNOTATIONS_READ_ONLY') {
                  Default.ANNOTATIONS_READ_ONLY = response.settings[i].value == 'true';
               }
            }
         } else {
            annotationsServer = response;//Workaround without Read only options
         }

         if (!annotationsServer) {
            return;
         }

         for (var i = 0; i < annotationsServer.length; i++) {
            var annotation = new Annotation();
            annotation.id = annotationsServer[i].id;
            annotation.annotationType = parseInt(annotationsServer[i].annotationType);
            annotation.pageIndex = parseInt(annotationsServer[i].pageIndex);
            annotation.pageWidth = parseInt(annotationsServer[i].pageWidth);
            annotation.pageHeight = parseInt(annotationsServer[i].pageHeight);
            annotation.docId = parseInt(annotationsServer[i].docId);
            annotation.modified = '';
            annotation.readOnly = parseInt(annotationsServer[i].readOnly);
            annotation.measurementType = parseInt(annotationsServer[i].measuremenType);

            // Use global setting value if no value is set in the database
            if (annotation.measurementType == 0)
               annotation.measurementType = Default.ANNOTATION_MEASUREMENT_TYPE_DEFAULT;

            annotation.origX = annotationsServer[i].origX;
            annotation.origY = annotationsServer[i].origY;
            annotation.origW = annotationsServer[i].origW;
            annotation.origH = annotationsServer[i].origH;

            annotation.text = annotationsServer[i].text;
            annotation.fontSize = annotationsServer[i].fontSize;
            annotation.font = annotationsServer[i].font;

            if (annotation.annotationType == Annotation.TYPE_AUDIO)
               annotation.audioAvailable = true;

            //Resolve Icon
            if (!annotationsServer[i].iconSrc && annotationsServer[i].icon) {//annotationsServer[i].icon != '' && 
               annotation.setIconSource('images/' + annotationsServer[i].icon);
            } else if (annotationsServer[i].iconSrc) {
               annotation.setIconSource(annotationsServer[i].iconSrc);

               annotation.icon = new Image();
               // This may be a url. If so, get the image file name.
               annotation.icon.src = annotationsServer[i].iconSrc;


            }


            // We do if condition here so default values would not be overwritten
            if (annotationsServer[i].color)
               annotation.color = annotationsServer[i].color;
            if (annotationsServer[i].backgroundColor)
               annotation.backgroundColor = annotationsServer[i].backgroundColor;

            // Drawing Positions
            for (var d = 0; d < annotationsServer[i].drawingPositions.length; d++) {
               var dp = new DrawingPosition();
               dp.id = parseInt(annotationsServer[i].drawingPositions[d].id);
               dp.annotationId = parseInt(annotationsServer[i].drawingPositions[d].annotationId);

//               var dc_ = annotationsServer[i].drawingPositions[d].coordinate.split(',');
               dp.x = annotationsServer[i].drawingPositions[d].x;//parseFloat(dc_[0]);
               dp.y = annotationsServer[i].drawingPositions[d].y;//parseFloat(dc_[1]);
               dp.origX = dp.x;
               dp.origY = dp.y;

               annotation.drawingPositions.push(dp);
            }

            // Highlight Text Rect
            for (var d = 0; d < annotationsServer[i].highlightTextRects.length; d++) {
               var htr = new HighlightTextRect();
               htr.id = parseInt(annotationsServer[i].highlightTextRects[d].id);
               htr.annotationId = parseInt(annotationsServer[i].highlightTextRects[d].id);
               var highlightText = annotationsServer[i].highlightTextRects[d];
               //var dc_ = annotationsServer[i].highlightTextRects[d].coordinate.split(',');
               htr.left = highlightText.origLeft;//parseFloat(dc_[0]);
               htr.top = highlightText.origTop;//parseFloat(dc_[1]);
               htr.width = highlightText.origWidth;//parseFloat(dc_[2]);
               htr.height = highlightText.origHeight;//parseFloat(dc_[3]);
               htr.right = htr.left + htr.width;
               htr.bottom = htr.top + htr.height;
               htr.origLeft = htr.left;
               htr.origTop = htr.top;
               htr.origWidth = htr.width;
               htr.origHeight = htr.height;
               htr.origRight = htr.right;
               htr.origBottom = htr.bottom;
               htr.setDomRotateAngle(annotationsServer[i].highlightTextRects[d].domRotateAngle, rotateAngle);

               annotation.highlightTextRects.push(htr);
            }

            // Comments
            for (var c = 0; c < annotationsServer[i].comments.length; c++) {
               if (c == 0)
                  annotation.comments = [];

               var comment = new Comment();
               comment.id = parseInt(annotationsServer[i].comments[c].id);
               comment.annotationId = parseInt(annotationsServer[i].comments[c].annotationId);
               comment.username = annotationsServer[i].comments[c].username;
               comment.comment = annotationsServer[i].comments[c].comment;
               comment.dateCreated = new Date(annotationsServer[i].comments[c].dateCreated);
               comment.parentId = parseInt(annotationsServer[i].comments[c].parentId);
               comment.modified = '';

               annotation.comments.push(comment);
            }

            annotations.push(annotation);

            if (reload)
               reloadAnnotations();
         }

      }
   });

//   updateTotalPages();
}

function reloadPDF(pdfDocument, page) {
   console.log('reloadPDF(): ' + page);
   /**
    * Progress bar not shown when reloaded
    * issue still open - Progress bar display when changing PDFs #3090
    * https://github.com/mozilla/pdf.js/issues/3090
    */
   $('div.progress').removeClass('indeterminate');
   currentDocument = pdfDocument;
   PDFViewerApplication.open(docURL + currentDocument.documentId);
   init();
   setInitialPageBookmark(page);
}

function runAfterPageRendered(pageIndex) {
   console.log('runAfterPageRendered() page: ' + (pageIndex + 1));

   new Promise(function (resolve, reject) {
      // Hide context menu if any
      $.contextMenu('destroy', '#' + canvasIdName + pageIndex);

      /**
       * Add position: relative to pageContainer# > canvasWrapper element so that any text annotation that will
       * go beyond the parent's boundary will be displayed as cut off.
       */
      $('#pageContainer' + (pageIndex + 1) + ' .canvasWrapper').css('position', 'relative');

      var page = pageIndex + 1;
      var canvasOfPdfPage = $('#page' + page);

      var clone = $('<canvas></canvas>');
      clone.attr('id', canvasIdName + page);
      clone.css('z-index', '' + zIndex);
      clone.attr('width', canvasOfPdfPage.css('width'));
      clone.attr('height', canvasOfPdfPage.css('height'));
      $('#pageContainer' + page + ' .canvasWrapper').append(clone);

      var anPage = new Page();
      anPage.pageIndex = pageIndex;
      anPage.init(canvasIdName + page);
      pages[canvasIdName + page] = anPage;

      if ($('#textSelection').hasClass('toggled') ||
              $('#textHighlight').hasClass('toggled') ||
              $('#textUnderline').hasClass('toggled') ||
              $('#textStrikeThrough').hasClass('toggled'))
      {
         anPage.canvas.style.pointerEvents = 'none';
      }

      loadAnnotations(pageIndex, true);

      resetVar(false, true);
   });


}

function updateTotalPages() {
   //TODO
   return true;
}

function pageChanged(page) {
   console.log('pageChanged() page: ' + page);

   var page = 0;
   for (var i = 0; i < pdfDocuments.length; i++) {
      if (pdfDocuments[i] == currentDocument) {
         page += PDFViewerApplication.pdfViewer.currentPageNumber;
         $('#aPageNumber').val(page);
         updateNavPageButtonState();
         break;
      } else
         page += pdfDocuments[i].totalPages;
   }

   /**
    * Temporarily disable for now. Problem with pageAnnotation# div layer does not get recreated
    */
   //resetPagesIfOffScreen();

   //updateTotalPages();
}

function openAnnotationForm(annotation, key) {
   console.log('openAnnotationForm()');
   angular.element($('#popupContainer')).scope().setAnnotation(annotation, key);
}

/**
 * Saves an annotation.
 * @param annotation
 * @param text If annotation highlight/box falls within an area that has text in it, include text in case you want to
 * also save what text is beneath the annotation area.
 * @param doNotTriggerEvent If true, trigger annotation event. Default.CREATE_ANNOTATION_EVENT will still override this.
 */
function saveAnnotation(annotation, text, doNotTriggerEvent) {
   console.log('saveAnnotation(): processing annotation: ' + annotation.id + (text ? ', with text: ' + text : ''));

   var showCommentForm = annotation.id == 0;
   /**
    * If SAVE_ALL_ANNOTATIONS_ONE_TIME is true, then just update annotations in code and setting temporary
    * id to make each annotation as unique. When saved to server, it will check for the modified variable
    * and see if the value is changed. If changed, then treat it as id == 0 to insert data.
    */
   // Change code here to save to web server
   if (Default.SAVE_ALL_ANNOTATIONS_ONE_TIME) {
      /**
       * If this is a new annotation, then id will be negative so that it will not
       * conflict with id that are in the early + value like those < 10.
       */
      if (annotation.id == 0) {
         annotation.id = -annotations.length - 1;
      } else if (annotation.modified == '') {
         annotation.modified = 'update';
      }

      updateAnnotationListAfterSave(annotation, showCommentForm, doNotTriggerEvent);
   } else {
      $.ajax({
         url: restUrl + annotationSaveUrl,
         type: 'post',
         data: JSON.stringify(annotation),
         contentType: 'application/json',
         dataType: 'json',
         cache: false,
         success: function (response, status, xhr) {
            annotation.id = response.id;
            annotation.modified = response.modified;
            annotation.oldModified = response.oldModified ? response.oldModified : '';

            updateAnnotationListAfterSave(annotation, showCommentForm, false);
            console.log('Save successful. Id: ' + annotation.id);
         },
         error: function (xhr, status, error) {
            console.log('Error saving annotation: ' + error);
         }
      });
   }
}

/**
 * Scroll to the annotation and select it in the annotation list side bar.
 * @param annotation
 */
function scrollToAnnotationInList(annotation) {
   if (annotation.selected)
      if ($('#annotationList').is(':visible')) {
         getSidebarContainerElement().scrollTo(getAnnotationListRowElement(annotation));
      }
}

/**
 * Delete annotation from annotations array and the page's canvas.
 * @param annotation Annotation object
 * @param fromAngular Indicates if this action came from the sidebar list.
 * @param doNotTriggerEvent If true, trigger annotation event. Default.CREATE_ANNOTATION_EVENT will still override this.
 */
function deleteAnnotation(annotation, fromAngular, doNotTriggerEvent) {
   console.log('deleteAnnotation(): id: ' + annotation.id);

   if (Default.ANNOTATIONS_TOOLTIP && annotation.tooltip) {
      if (typeof annotation.tooltip.hide == 'function')
         annotation.tooltip.hide();

      annotation.tooltip = undefined;
   }

   /**
    * If doNotTriggerEvent is true, then this means that the delete annotation event was triggered
    * after the call to the server, hence there should be no request to the server for this.
    */
   if (!Default.SAVE_ALL_ANNOTATIONS_ONE_TIME && !doNotTriggerEvent) {
      $.ajax({
         url: restUrl + annotationDeleteUrl + '/' + annotation.id,
         type: 'delete',
         data: JSON.stringify(annotation),
         contentType: 'application/json',
         dataType: 'json',
         cache: false,
         success: function (response, status, xhr) {
            console.log('Save successful');
         },
         error: function (xhr, status, error) {
            console.log('Error saving annotation: ' + error);
         }
      });
   }

   start:
           for (var p in pages) {
      if (pages[p].canvasAnnotations) {
         for (var j = 0; j < pages[p].canvasAnnotations.length; j++) {
            if (pages[p].canvasAnnotations[j].id == annotation.id) {
               pages[p].canvasAnnotations.splice(j, 1);
               pages[p].invalidate(pages[p]);
               break start;
            }
         }
      }
   }

   for (var i in annotations) {
      if (annotations[i].id == annotation.id) {
         if (Default.SAVE_ALL_ANNOTATIONS_ONE_TIME) {
            if (annotations[i].id <= 0)
//                    annotations.splice(i, 1);
               annotations[i].modified = 'delete';
            else
               annotations[i].modified = 'delete';
         } else
            annotations.splice(i, 1);

         break;
      }
   }

   if (annotation.annotationType == Annotation.TYPE_TEXT) {
      $('#texts' + annotation.id).remove();
   } else if (annotation.isSelectableTextType()) {
      $('#pageContainer' + (annotation.pageIndex + 1) + ' .canvasWrapper').children('div[id="highlight' + annotation.id + '"]').each(function () {
         $(this).remove();
      });
   }

   if (!fromAngular)
      angular.element($('#sidebarContainerRight')).scope().$digest();

   if (Default.CREATE_ANNOTATION_EVENTS && !doNotTriggerEvent) {
      annotation.modified = 'delete';
      createAnnotationEvent(annotation);
   }
}

/**
 * @param annotation
 * @param key Indicates if this is edit or reply which will affect the UI of the annotation popup window
 */
function editAnnotation(annotation, key) {
   console.log('editAnnotation(): id: ' + annotation.id + ', key: ' + key);
   openAnnotationForm(annotation, key);
}

/**
 * Loads annotations that belong to a specific page.
 * @param pageIndex
 * @param preserveSelection
 * @param resizeTypeTextDimension This parameter only applies to Annotation.TYPE_TEXT since you can now resize the
 * font size and text so its area should be recalculated.
 */
function loadAnnotations(pageIndex, preserveSelection, resizeTypeTextDimension) {
   var page = pages[canvasIdName + (pageIndex + 1)];
   page.canvasAnnotations = [];

   if (!preserveSelection)
      clearSelectedAnnotationArray();

   var canvasRect = {
      width: $(page.canvas).height(),
      height: $(page.canvas).width()
   };

   for (var i = 0; i < annotations.length; i++) {
      var annotation = annotations[i];

      /**
       * This applies if option is Default.SAVE_ALL_ANNOTATIONS_ONE_TIME is true
       * so annotations will only be remove permanently once the user manually
       * saves the annotations.
       *
       * If they are not yet saved and page is re-rendered due to page orientation
       * or scale, do not add annotations to the page.
       */
      if (annotation.pageIndex != pageIndex || annotation.modified == 'delete')
         continue;

      if (annotation.annotationType == Annotation.TYPE_TEXT) {
         page.addText(rotateAngle, annotation, resizeTypeTextDimension, true, true);
      } else if (annotation.annotationType == Annotation.TYPE_TEXT_HIGHLIGHT ||
              annotation.annotationType == Annotation.TYPE_TEXT_UNDERLINE ||
              annotation.annotationType == Annotation.TYPE_TEXT_STRIKE_THROUGH)
      {
         var pageView = PDFViewerApplication.pdfViewer.getPageView(pageIndex);
         page.highlightText(annotation.annotationType, pageIndex, rotateAngle, PDFViewerApplication.pdfViewer.currentScale,
                 pageView, annotation, annotation.getHighlightTextColor());

         $('#pageContainer' + (annotation.pageIndex + 1) + ' .canvasWrapper').children('div[id="highlight"]').each(function () {
            $(this).attr('id', 'highlight' + annotation.id);
         });
      } else {
         page.addAnnotation(annotation, rotateAngle, PDFViewerApplication.pdfViewer.currentScale, true, false, true);
      }
   }

   for (var i = 0; i < page.canvasAnnotations.length; i++) {
      if (page.canvasAnnotations[i].annotationType == Annotation.TYPE_TEXT)
         page.canvasAnnotations[i].rotateText(canvasRect, rotateAngle, PDFViewerApplication.pdfViewer.currentScale, $('#texts' + page.canvasAnnotations[i].id));
      else
         page.canvasAnnotations[i].rotate(canvasRect, rotateAngle, PDFViewerApplication.pdfViewer.currentScale);

      if (!page.canvasAnnotations[i].drawingPositions)
         continue;

      for (var p = 0; p < page.canvasAnnotations[i].drawingPositions.length; p++) {
         page.canvasAnnotations[i].drawingPositions[p].rotate(canvasRect, rotateAngle, PDFViewerApplication.pdfViewer.currentScale);
      }
   }

   page.invalidate();

//   
}

function displayAnnotationMenu(annotationsSelected, px, py) {
   console.log('displayAnnotationMenu()');

   var annotation = annotationsSelected.length > 0 ? annotationsSelected[0] : annotationsSelected;

   var items = {
      'screen_shot': {name: 'ScreenShot'},
      'sep': '---------',
      'play': {name: 'Play'},
      'sep_audio': '---------',
      'view': {name: 'View'},
      'edit': {name: 'Edit'},
      'reply': {name: 'Reply'},
      'delete': {name: 'Delete'},
      'sep_prop': '---------',
      'properties': {name: 'Properties'}
   };

   if (annotationsSelected.length > 1) {
      delete items.screen_shot;
      delete items.sep;
      delete items.view;
      delete items.edit;
      delete items.reply;
      delete items.sep_prop;
      delete items.properties;
   }

   if ((annotation.annotationType != Annotation.TYPE_HIGHLIGHT &&
           annotation.annotationType != Annotation.TYPE_BOX) || isIE())
   {
      delete items.screen_shot;
      delete items.sep;
   }

   if (annotation.annotationType != Annotation.TYPE_AUDIO) {
      delete items.play;
      delete items.sep_audio;
   }

   /**
    * By default, measurement area annotation should have its root comment disabled since it is
    * not editable, mimicking Adobe Acrobat's behavior. Only replies are allowed for this type of
    * annotation.
    */
   if (annotation.annotationType == Annotation.TYPE_MEASUREMENT_AREA) {
      delete items.edit;
   }

   if (annotation.isReadOnly()) {
      delete items.edit;
      delete items.reply;
      delete items.delete;
   } else {
      delete items.view;
   }

   if (!annotation.hasEditableProperties()) {
      delete items.sep_prop;
      delete items.properties;
   }

   if (jQuery.isEmptyObject(items))
      return;

   $.contextMenu({
      selector: '#' + canvasIdName + (annotation.pageIndex + 1),
      trigger: 'none',
      callback: function (key, options) {
         switch (key) {
            case 'play':
               showPlayer(annotation);
               break;
            case 'edit':
            case 'reply':
            case 'view':
               // We destroy the context menu for this menu item because if annotation type is TYPE_TEXT,
               // the alert() will overlap the context menu. This is a hack.
               $.contextMenu('destroy', '#' + canvasIdName + (annotation.pageIndex + 1));
               editAnnotation(annotation, key);
               break;
            case 'delete':
               if (annotationsSelected.length) {
                  var i = annotationsSelected.length;
                  while (i--) {
                     deleteAnnotation(annotationsSelected[i]);
                     annotationsSelected.splice(i, 1);
                  }
               } else
                  deleteAnnotation(annotation);

               break;
            case 'screen_shot':
               screenShot(annotation);
               break;
            case 'properties':
               openAnnotationPropertiesForm(annotation);
               break;
         }
      },
      items: items,
      events: {
         hide: function (opt) {
            $.contextMenu('destroy', '#' + canvasIdName + (annotation.pageIndex + 1));
         }
      }
   });

   /**
    * There is an issue with the x position if the sidr annotation list layer is shown because the canvas x
    * position will not be visible on the screen. If the sidr layer is visible, then we manually add the width
    * to the x position passed to the parameter.
    */
   var x = px;
   if ($('#annotationList').is(':visible'))
      x = px + $('#sidr').width();

   $('#' + canvasIdName + (annotation.pageIndex + 1)).contextMenu({x: x, y: py});
}

function displaySelectedTextMenu(e) {
   var id = $(e.target).closest('.textLayer').parent().attr('id');
   if (!id)
      return;

   // Replace all leading non-digits with nothing
   var page = id.replace(/^\D+/g, '');
   var px = e.pageX, py = e.pageY;

   try {
      parseInt(page);
   } catch (ex) {
      return;
   }

   if (!Default.TEXT_TYPE_POPUP_BEFORE_CREATE) {
      createSelectText(page);
      return;
   }

   var anPage = pages[canvasIdName + page];
   anPage.getMouse(e, anPage);

   $.contextMenu({
      selector: '#' + canvasIdName + page,
      trigger: 'none',
      callback: function (key, options) {
         switch (key) {
            case 'save':
               console.log('Save selected');
               createSelectText(page);
               break;
            case 'action_1':
               console.log('Action 1 selected');
               clearSelectedText();
               break;
            case 'action_2':
               console.log('Action 2 selected');
               clearSelectedText();
               break;
         }
      },
      items: {
         'save': {name: 'Save'},
         'sep': '---------',
         'action_1': {name: 'Action 1'},
         'action_2': {name: 'Action 2'}
      },
      events: {
         hide: function (opt) {
            $.contextMenu('destroy', '#' + canvasIdName + page);
         }
      }
   });

   var x = px;
   if ($('#annotationList').is(':visible'))
      x = px + $('#sidr').width();

   $('#' + canvasIdName + page).contextMenu({x: x, y: py});
}

function goToPage(page) {
   console.log('goToPage() page: ' + page);
   if (aTotalPages >= page && page > 0) {
      PDFViewerApplication.pdfViewer.currentPageNumber = page;
   }
}

function nextPage() {
   console.log('nextPage()');
   var page = PDFViewerApplication.pdfViewer.currentPageNumber;

   if (page >= PDFViewerApplication.pdfViewer.pagesCount && pdfDocuments.length == 0)
      return;

   if (page < PDFViewerApplication.pdfViewer.pagesCount) {
      page++;
   } else if (page + 1 > PDFViewerApplication.pdfViewer.pagesCount) {
      nextDocument();
      return;
   }

   goToPage(page);
}

function previousPage() {
   console.log('previousPage()');
   var page = PDFViewerApplication.pdfViewer.currentPageNumber;

   if (page <= 0) {
      return;
   }

   if ((page - 1) >= 1) {
      page--;
   } else if (page - 1 == 0) {
      previousDocument();
      return;
   }

   goToPage(page);
}

function nextDocument() {
   console.log('nextDocument()');
   for (var d = 0; d < pdfDocuments.length; d++) {
      if (pdfDocuments[d] == currentDocument) {
         if (d + 1 <= pdfDocuments.length - 1) {
            reloadPDF(pdfDocuments[d + 1], 1);
         }
         return;
      }
   }
}

function previousDocument() {
   console.log('previousDocument()');
   for (var d = 0; d < pdfDocuments.length; d++) {
      if (pdfDocuments[d] == currentDocument) {
         if (d > 0) {
            reloadPDF(pdfDocuments[d - 1], pdfDocuments[d - 1].totalPages);
         }
         return
      }
   }
}

function updateNavPageButtonState() {
   if (PDFViewerApplication.loading) {
      $('#aNextPage').prop('disabled', true);
      $('#aPreviousPage').prop('disabled', true);
      return;
   }

   var currentPage = PDFViewerApplication.pdfViewer.currentPageNumber;
   var pages = PDFViewerApplication.pdfViewer.pagesCount;

   $('#aNextPage').prop('disabled', false);
   $('#aPreviousPage').prop('disabled', false);

   if (pages <= 1) {
      $('#aNextPage').prop('disabled', true);
      $('#aPreviousPage').prop('disabled', true);
   } else if (currentPage >= pages) {
      $('#aNextPage').prop('disabled', true);
   } else if (currentPage <= 1) {
      $('#aPreviousPage').prop('disabled', true);
   }

   if (currentDocument) {
      if (currentPage == 1)
         $('#aPreviousPage').prop('disabled', currentDocument.isFirst ? true : false);
      else if (currentPage == pages)
         $('#aNextPage').prop('disabled', currentDocument.isLast ? true : false);
   }

}

/**
 * This function will select an annotation after a PDF is loaded.
 */
function selectAnAnnotationOnLoad(annotationId, pageIndex) {
   $('#aPageNumber').val(pageIndex + 1);
   var e = jQuery.Event('keypress');
   e.which = 13;
   e.keyCode = 13;
   $("#theInputToTest").trigger(e);

   for (var i = 0; i < annotations.length; i++) {
      if (annotations[i].id == annotationId) {
         annotations[i].selected = true;
         break;
      }
   }

   start:
           for (var p in pages) {
      if (pages[p].pageIndex != pageIndex)
         continue;

      if (pages[p].canvasAnnotations) {
         for (var j = 0; j < pages[p].canvasAnnotations.length; j++) {
            if (pages[p].canvasAnnotations[j].id == annotationId) {
               pages[p].invalidate(pages[p]);
               break start;
            }
         }
      }
   }
}

function showPlayer(annotation) {
   console.log('showPlayer()');
   angular.element($('#playerContainer')).scope().showPlayer(annotation);
}

/**
 * Since PDFViewerApplication.initialBookmark does not work, we override the query string value of
 * window.history.location.target.hash
 * @param page
 */
function setInitialPageBookmark(page) {
   console.log('setInitialPageBookmark(): ' + page);
   try {
      var hash = window.history.state.target.hash;
      hash = hash && !hash.startsWith('?') ? '?' : '';
      // Remove ? after updating query string parameter with new value
      window.history.state.target.hash = updateQueryStringParameter(hash, 'page', page).substring(1);
      console.log('hash: ' + window.history.state.target.hash);
   } catch (e) {
   }
}

function showTextInput(page, mouseX, mouseY, existingAnnotation) {
   var textInput = null;

   if (!existingAnnotation)
      textInput = prompt('Enter text (Limit: ' + Default.ANNOTATION_TYPE_TEXT_CHAR_LIMIT + ' characters)');

   if (textInput || existingAnnotation) {
      var annotation = existingAnnotation ? existingAnnotation : new Annotation();
      if (!existingAnnotation) {
         annotation.pageIndex = page.pageIndex;
         annotation.x = existingAnnotation ? existingAnnotation.x : mouseX;
         annotation.y = existingAnnotation ? existingAnnotation.y : mouseY;
         annotation.text = textInput;
         annotation.color = existingAnnotation ? existingAnnotation.color : Default.DRAW_COLOR_FOREGROUND;
         annotation.annotationType = Annotation.TYPE_TEXT;
      }

      annotation.hasDimension = false;

      if (existingAnnotation) {
         // remove annotation from page, then re-add
         for (var i = 0; i < page.canvasAnnotations.length; i++) {
            if (page.canvasAnnotations[i].id == existingAnnotation.id) {
               page.canvasAnnotations.splice(i, 1);
               $('#texts' + existingAnnotation.id).remove();
               break;
            }
         }
      }

      page.addText(rotateAngle, annotation, true, false);
   }

   resetVar();
}

function getModifiedAnnotations() {
   console.log('getModifiedAnnotations()');
   var changedAnnotations = [];
   var changed = false;

   for (var a in annotations) {
      changed = false;

      if (annotations[a].modified != '') {
         changed = true;
      }

      if (!changed)
         for (var c in annotations[a].comments) {
            if (annotations[a].comments[c].modified != '') {
               changed = true;
               break;
            }
         }

      if (changed)
         changedAnnotations.push(annotations[a]);
   }
   return changedAnnotations;
}

function saveAllAnnotationsToServer() {
   console.log('saveAllAnnotationsToServer(): annotations size: ' + (annotations ? annotations.length : 0));
   if (!annotations || annotations.length == 0)
      return;

   // Variable changedAnnotations will always return an array
   var changedAnnotations = getModifiedAnnotations();
   console.log('changedAnnotations size: ' + changedAnnotations.length);

   if (changedAnnotations.length == 0) {
      alert('No changes to save.');
      return;
   }

   $.ajax({
      url: restUrl + annotationSaveUrl,
      type: 'post',
      data: JSON.stringify(changedAnnotations),
      contentType: 'application/json',
      dataType: 'json',
      cache: false,
      success: function (response, status, xhr) {

         for (var r = 0; r < response.length; r++) {

            var json = JSON.stringify(changedAnnotations);

            try {
               json = JSON.parse(response[r]);
            } catch (ex) {
//               alert("Resposta inválida do servidor: " + ex);
               console.error(ex);
            }

            for (var a in annotations) {
               // Can be updated or inserted value
               if (json.oldId && json.modified == '' && json.oldId == annotations[a].id) {
                  annotations[a].id = json.id;
                  annotations[a].comments = json.comments;
                  annotations[a].oldId = json.oldId;

                  /**
                   * The oldModified property of the annotation object is set to update if
                   * Default.CREATE_ANNOTATION_EVENTS is true. This is because when an annotation
                   * is first added to the canvas, its action is insert. However, when the save button
                   * is clicked, the annotation already exists in the canvas, hence its oldModified property
                   * value is now update because we only need to update the newly generated id.
                   */
                  if (Default.CREATE_ANNOTATION_EVENTS) {
                     annotations[a].oldModified = 'update';
                     createAnnotationEvent(annotations[a]);
                  }

                  annotations[a].modified = json.modified;

                  if (json.drawingPositions.length > 0) {
                     for (var dp in json.drawingPositions) {
                        annotations[a].drawingPositions[dp].id = json.drawingPositions[dp].id;
                     }
                  }

                  if (json.highlightTextRects.length > 0) {
                     for (var htr in json.highlightTextRects) {
                        /**
                         * If old id is 0, then the id is newly generated, hence we also rename the id
                         * in the Div element.
                         */
                        if (annotations[a].oldId <= 0) {
                           $('#pageContainer' + (annotations[a].pageIndex + 1) + ' .canvasWrapper').
                                   children('div[id="highlight' + annotations[a].oldId + '"]').
                                   each(function ()
                                   {
                                      $(this).attr('id', 'highlight' + annotations[a].id);
                                   });
                        }
                        annotations[a].highlightTextRects[htr].id = json.highlightTextRects[htr].id;
                     }
                  }

                  if (json.comments.length > 0) {
                     for (var c in json.comments) {
                        annotations[a].comments[c].id = json.comments[c].id;
                     }
                  }

                  break;
               } else if (json && json.oldModified == 'delete' && json.id == annotations[a].id) {
                  annotations.splice(a, 1);
                  break;
               }
            }
         }
         resetAllAnnotationsChangedProperty(true);
         alert('All annotations were saved with success!');

      },
      error: function (xhr, status, error) {
         alert('Error to save annotations: ' + error);
      }
   });
}

/**
 * For DEMO purposes in case there is no web service to communicate to we have to simulate
 * the annotations are saved correctly.
 */
function resetAllAnnotationsChangedProperty(success) {
   if (!success)
      return;

   for (var a in annotations) {
      annotations[a].modified = '';
      for (var c in annotations[a].comments) {
         annotations[a].comments[c].modified = '';
      }

      annotations.splice(a, 1, annotations[a]);
   }
}

function openAnnotationPropertiesForm(annotation) {
   angular.element($('#propertiesContainer')).scope().showPropertiesWindow(annotation);
}

