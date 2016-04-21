/**
 * This Javascript file is for overriding existing functions and variables in the Annotationeer
 * web application if you decide to change it with your implementation.
 *
 * This way, when new code changes are retrieved from the repository, the core files are intact and
 * your custom functionality  and settings will not be affected.
 *
 * By default, the function names that start with orig are called within the overridden functions. If
 * you have a different implementation, then comment out the lines affected and add in your code.
 */

var origDownloadAnnotations = downloadAnnotations;
downloadAnnotations = function (reload) {
   origDownloadAnnotations(reload);

}

var origSaveAnnotation = saveAnnotation;
saveAnnotation = function (annotation, text, doNotTriggerEvent) {
   origSaveAnnotation(annotation, text, doNotTriggerEvent);
}

var origDeleteAnnotation = deleteAnnotation;
deleteAnnotation = function (annotation, fromAngular, doNotTriggerEvent) {
   origDeleteAnnotation(annotation, fromAngular, doNotTriggerEvent);
}

var origSaveAllAnnotationsToServer = saveAllAnnotationsToServer;
saveAllAnnotationsToServer = function () {
   origSaveAllAnnotationsToServer();
}

if (Default.CREATE_ANNOTATION_EVENTS && Default.LISTEN_ANNOTATION_EVENTS) {
   document.addEventListener('annotation_insert', function (e) {
      console.log(e.annotation);
   });

   document.addEventListener('annotation_update', function (e) {
      console.log(e.annotation);
   });

   document.addEventListener('annotation_delete', function (e) {
      console.log(e.annotation);
   });

   document.addEventListener('annotation_comment_update', function (e) {
      console.log(e.annotation);
   });
}

