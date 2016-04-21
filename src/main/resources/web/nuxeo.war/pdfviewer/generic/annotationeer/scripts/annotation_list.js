(function() {
    var app = angular.module('annotationList', []);

    app.controller('AnnotationListController', function($scope, $window) {
        $scope.annotations = $window.annotations;

        $scope.getImage = function(annotationType) {
            switch (annotationType) {
                case Annotation.TYPE_ARROW:
                    return 'arrow.svg';
                case Annotation.TYPE_AUDIO:
                    return 'audio.svg';
                case Annotation.TYPE_BOX:
                    return 'box.svg';
                case Annotation.TYPE_CIRCLE_FILL:
                    return 'circle_fill.svg';
                case Annotation.TYPE_CIRCLE_STROKE:
                    return 'circle_stroke.svg';
                case Annotation.TYPE_STICKY_NOTE:
                    return 'comment.svg';
                case Annotation.TYPE_DRAWING:
                    return 'pencil.svg';
                case Annotation.TYPE_HIGHLIGHT:
                    return 'highlight.svg';
                case Annotation.TYPE_MEASUREMENT_DISTANCE:
                    return 'measurement_distance.svg';
                case Annotation.TYPE_MEASUREMENT_AREA:
                    return 'measurement_area.svg';
                case Annotation.TYPE_STAMP:
                    return 'stamp.svg';
                case Annotation.TYPE_TEXT:
                    return 'text.svg';
                case Annotation.TYPE_TEXT_HIGHLIGHT:
                    return 'text_select.svg';
                case Annotation.TYPE_TEXT_STRIKE_THROUGH:
                    return 'text_strike_through.svg';
                case Annotation.TYPE_TEXT_UNDERLINE:
                    return 'text_underline.svg';
            }
        }

        $scope.getMeasurementAreaAnnotationTypeId = function() {
            return Annotation.TYPE_MEASUREMENT_AREA;
        }

        $scope.edit = function(annotation) {
            $window.editAnnotation(annotation, 'edit');
        }

        $scope.reply = function(annotation) {
            $window.editAnnotation(annotation, 'reply');
        }

        $scope.delete = function(annotation) {
            $window.deleteAnnotation(annotation, true);

            if (Default.SAVE_ALL_ANNOTATIONS_ONE_TIME)
                for (var i in $scope.annotations) {
                    if ($scope.annotations[i].id == annotation.id) {
                        $scope.annotations[i].modified = 'delete';
                        break;
                    }
                }
        }

        $scope.click = function(e, annotation) {
            $window.addSelectedAnnotation(annotation, true);
            $window.scrollToAnnotationInCanvas(annotation);
        }

    });

    /**
     * We set the form as another module/Angular application because placing the 2 divs (popup, annotation list)
     * in index.html inside 1 div that will house the ng-app label, the popup window will not show. We use a
     * 3rd part library to make this work. ng-app will only accept 1 module unless you bootstrap it manually.
     */

    var form = angular.module('annotationForm', []);

    form.controller('AnnotationFormController', function($document, $http, $scope, $timeout, $window) {
        $scope.annotation;
        $scope.key;
        $scope.currentUsername = $window.username;
        $scope.formComment = { comment : ''};

        $document.on('opened', '.remodal', function(e) {
            if ($(e.currentTarget).attr('id') != 'popupContainer')
                return;

            $('#popupContainer').removeClass('hidden');
            $('#comment').focus();
        });

        $document.on('closed', '.remodal', function(e) {
            if ($(e.currentTarget).attr('id') != 'popupContainer')
                return;

            if ($scope.key == 'reply')
                $scope.closePopup();

            $scope.formComment = { comment : ''};
        });

        $scope.setAnnotation = function(annotation, key) {
            $scope.annotation = annotation;
            $scope.key = key;

            if (key == 'reply') {
                var comment = new Comment();
                comment.annotationId = annotation.id;
                comment.parentId = $scope.annotation.comments[0].id;
                $scope.annotation.comments.push(comment);
                $scope.formComment.comment = comment.comment;
            }
            else {
                $scope.annotation.comments[0].annotationId = annotation.id;
                $scope.formComment.comment = $scope.annotation.comments[0].comment;
            }

            $timeout(function() {
                $('#popupContainer').remodal().open();
            });
        }

        $scope.saveComment = function() {
            if ($scope.formComment.comment == '') {
                $timeout(function() {
                    alert('Please enter something');
                    $('#comment').focus();
                });
                return;
            }

            var comment;
            if ($scope.key == 'reply') {
                comment = $scope.annotation.comments[$scope.annotation.comments.length - 1];
                comment.parentId = $scope.annotation.comments[0].id;
            }
            else {
                comment = $scope.annotation.comments[0];
            }

            comment.comment = $scope.formComment.comment;

            if (Default.SAVE_ALL_ANNOTATIONS_ONE_TIME) {
                if (comment.id == 0)
                    comment.id = -$scope.annotation.comments.length - 1;

                if ($scope.key == 'edit')
                    comment.modified = 'update';

                if ($scope.annotation.modified == '') {
                    $scope.annotation.oldModified = 'update';
                }

                $window.updateAnnotationComment($scope.annotation);
                $('#popupContainer').remodal().close();
            }
            else {
                $http({
                    url: restUrl + annotationSaveUrl + '/' + $scope.annotation.id + '/' + $window.commentSaveUrl,
                    method: 'post',
                    data: JSON.stringify(comment)
                }).then(function successCallback(response) {
                    comment = response;
                    $scope.annotation.oldModified = response.oldModified ? response.oldModified : '';
                    $window.updateAnnotationComment($scope.annotation);
                    $('#popupContainer').remodal().close();
                }, function errorCallback(error) {
                    alert('Error saving comment: ' + error.statusText);
                });
            }
        }

        $scope.closePopup = function() {
            if (!$scope.annotation || !$scope.annotation.comments || $scope.annotation.comments.length == 1)
                return;

            if ($scope.key == 'reply' && $scope.formComment.comment == '')
                $scope.annotation.comments.splice($scope.annotation.comments.length - 1, 1);
        }

        $scope.getMeasurementAreaAnnotationTypeId = function() {
            return Annotation.TYPE_MEASUREMENT_AREA;
        }

    });

    var player = angular.module('playerForm', []);

    player.controller('PlayerFormController', function($document, $http, $scope, $timeout, $window) {

        $scope.annotation;

        $document.on('opened', '.remodal', function(e) {
            if ($(e.currentTarget).attr('id') != 'playerContainer')
                return;

            if ($scope.annotation.audio) {
                $('#audioPlayer')[0].src = URL.createObjectURL($scope.annotation.audio);
                $('#audioPlayer')[0].play();
            }
            else if ($scope.annotation.audioAvailable) {
                $http({
                    method: 'GET',
                    url: restUrl + 'audio/' + $scope.annotation.id,
                    responseType: 'arraybuffer'
                }).then(function successCallback(response) {
                    var source = new Blob([response.data], {type: 'audio/mp3'});
                    $scope.annotation.audio = source;

                    $('#audioPlayer')[0].src = URL.createObjectURL(source);
                    $('#audioPlayer')[0].play();

                    $window.disablePlayerUI(false);
                    $window.disableRecordUI(true);
                }, function errorCallback(response) {
                    $('#playerContainer .status').html('Status: Error getting audio.');
                    $window.disablePlayerUI(true);
                    $window.disableRecordUI(true);
                });
            }
            else {
                $('#playerContainer .status').html('Status: Recording ...');
                $window.record();
            }
        });

        $document.on('closed', '.remodal', function(e) {
            if ($(e.currentTarget).attr('id') != 'playerContainer')
                return;

            updateAnnotationListAfterSave($scope.annotation);
        });

        $scope.showPlayer = function(annotation) {
            if (Default.ANNOTATIONS_AUDIO && !annotation.audio) {
                $window.initAudioPlayer();

                if (!$window.isInitialized)
                    return;
            }

            $('#playerContainer .status').html('Status:');

            $window.disablePlayerUI(!annotation.audio || !annotation.audioAvailable);
            $window.disableRecordUI(annotation.audio || annotation.audioAvailable);

            $('#playerContainer').removeClass('hidden');
            $('#playerContainer').remodal().open();
            $('#playerContainer').addClass('player-background');

            $scope.annotation = annotation;
        }

    });

    var properties = angular.module('propertiesForm', []);

    properties.controller('PropertiesFormController', function($document, $scope, $timeout, $window) {

        $scope.annotation;
        $scope.property = {};
        $scope.measurementTypes = [
            { id: MeasurementType.INCHES, name: 'Inches' },
            { id: MeasurementType.CENTIMETERS, name: 'Centimeters' },
            { id: MeasurementType.MILLIMETERS, name: 'Millimeters' },
        ];

        $document.on('opened', '.remodal', function(e) {
            if ($(e.currentTarget).attr('id') != 'propertiesContainer')
                return;

            $('#propertiesContainer').removeClass('hidden');

            $('#backgroundPaletteProperty').on('input', function() {
                var me = $(this);
                $timeout(function() {
                    $scope.annotation.backgroundColor = me.val();
                    $scope.setModifiedToUpdate();
                    refreshAnnotationInPage($scope.annotation);
                });
            });

            $('#colorPaletteProperty').on('input', function() {
                var me = $(this);
                $timeout(function() {
                    $scope.annotation.color = me.val();
                    $scope.setModifiedToUpdate();
                    refreshAnnotationInPage($scope.annotation);
                });
            });

        });

        var refreshAnnotationInPage = function(annotation) {
            if (annotation.modified == '')
                annotation.modified = 'update';

            $('#pageContainer' + (annotation.pageIndex + 1) + ' .canvasWrapper').children('div').each(function() {
                $(this).remove();
            });

            loadAnnotations(annotation.pageIndex, true, true);
            var page = pages[canvasIdName + (annotation.pageIndex + 1)];
            page.invalidate();
        }

        var getMeasurementType = function(id) {
            for (var mt in $scope.measurementTypes) {
                if ($scope.measurementTypes[mt].id == id)
                    return $scope.measurementTypes[mt];
            }
            return null;
        }

        $document.on('closed', '.remodal', function(e) {
            if ($(e.currentTarget).attr('id') != 'propertiesContainer')
                return;

            $('#colorPaletteProperty').off('input');
            $('#backgroundPaletteProperty').off('input');

            if (!supportsHTML5ColorInput()) {
                $('#backgroundPaletteProperty').minicolors('destroy');
                $('#colorPaletteProperty').minicolors('destroy');
            }
        });

        $scope.measurementTypeChanged = function() {
            if ($scope.annotation.measurementType != $scope.annotation.measurementTypeChosen.id) {
                $scope.annotation.measurementType = $scope.annotation.measurementTypeChosen.id;

                var page = pages[canvasIdName + ($scope.annotation.pageIndex + 1)];
                page.invalidate();

                $scope.setModifiedToUpdate();
            }
        }

        $scope.showPropertiesWindow = function(annotation) {
            $scope.annotation = annotation;
            $scope.annotation.measurementTypeChosen = getMeasurementType($scope.annotation.measurementType);

            $timeout(function() {
                // Configure Annotation.TYPE_TEXT properties
                if ($scope.annotation.annotationType == Annotation.TYPE_TEXT) {
                    $scope.property.fontSizeMin = Default.ANNOTATION_TYPE_TEXT_FONT_SIZE_RANGE_MIN;
                    $scope.property.fontSizeMax = Default.ANNOTATION_TYPE_TEXT_FONT_SIZE_RANGE_MAX;
                    $scope.property.fontSize = $scope.annotation.fontSize;
                    $scope.property.text = $scope.annotation.text;
                }

                $('#propertiesContainer').remodal().open();
                $('#propertiesContainer').addClass('properties-background');

                $('#backgroundPaletteProperty').val($scope.annotation.backgroundColor);
                $('#colorPaletteProperty').val($scope.annotation.color);

                if (!supportsHTML5ColorInput()) {
                    $('#backgroundPaletteProperty').minicolors();
                    $('#colorPaletteProperty').minicolors();
                }
            });
        }

        $scope.showBackgroundColorPicker = function() {
            $('#backgroundPaletteProperty').focus();
            $('#backgroundPaletteProperty').click();
        }

        $scope.showForegroundColorPicker = function() {
            $('#colorPaletteProperty').focus();
            $('#colorPaletteProperty').click();
        }

        // http://stackoverflow.com/questions/11873570/angularjs-for-loop-with-numbers-ranges
        $scope.range = function(min, max, step) {
            step = step || 1;
            var input = [];
            for (var i = min; i <= max; i += step) {
                input.push(i);
            }
            return input;
        }

        $scope.getTypeTextAnnotationTypeId = function() {
            return Annotation.TYPE_TEXT;
        }

        $scope.getTypeTextCharLimit = function() {
            return Default.ANNOTATION_TYPE_TEXT_CHAR_LIMIT;
        }

        $scope.updateFontSize = function() {
            $timeout(function() {
                $scope.annotation.fontSize = $scope.property.fontSize;
                $scope.annotation.hasDimension = false;
                refreshAnnotationInPage($scope.annotation);
            });
        }

        $scope.updateText = function() {
            if ($scope.property.text.length == 0)
                return;

            $timeout(function() {
                $scope.annotation.text = $scope.property.text;
                $scope.annotation.hasDimension = false;
                $scope.setModifiedToUpdate();
                refreshAnnotationInPage($scope.annotation);
            });
        }

        $scope.setModifiedToUpdate = function() {
            $scope.annotation.modified = 'update';

            if (Default.CREATE_ANNOTATION_EVENTS)
                $window.createAnnotationEvent($scope.annotation);
        }

    });

})();