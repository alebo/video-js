_V_.Tag = _V_.Component.extend({
    createElement: function() {
        var className, innerHTML;

        if (this.options.draggable) {
            className = "vjs-tag-handle draggable";
        } else {
            className = "vjs-tag-handle undraggable";
        }

        var preview = (this.options.preview) ? this.options.preview : '';
        var previewWidthOpt = this.player.options.tag.preview.width;
        var previewHeightOpt = this.player.options.tag.preview.height;
        var previewSize = this.calculatePreview(previewWidthOpt, previewHeightOpt);
        var previewTop = previewSize[1] + 5;
        var previewLeft = previewSize[0] / 2 - 12;

        innerHTML = "<span class='tooltip' style='top:-" + previewTop + "px; left:-" + previewLeft + "px;'>" +
        "<img src='" + preview + "' style='max-width:" + previewSize[0] + "px; max-height=" + previewSize[1] + "px;' />" +
        "</span>";

        return this._super("div", {
            className: className,
            innerHTML: innerHTML
        });
    },

    init: function(player, options) {
        this._super(player, options);

        this.tagId = (options.tagId) ? options.tagId : 1;
        this.time = (options.time) ? options.time : 0;
        this.draggable = (options.draggable) ? options.draggable : false;
        this.preview = (options.preview) ? options.preview : false;

        var previewSize = this.calculatePreview(this.player.options.tag.preview.width, this.player.options.tag.preview.height);
        if (previewSize) {
            this.previewWidth = previewSize[0];
            this.previewHeight = previewSize[1];
        }

        this.player.on("controlsvisible", this.proxy(this.updateTag)); //fullscreen position bug

        this.on("mousedown", this.onMouseDown);
        this.on("mouseover", this.onMouseOver);
        this.on("mouseout", this.onMouseOut);
        this.on("dblclick", this.onDblClick);
    },

    remove: function(){
        this.player.off("controlsvisible", this.proxy(this.updateTag, this.id));
    },

    onMouseDown: function(event){
        this.player.currentTime(this.time);

        if (this.draggable) {
            //this.player.tagMoving = this;
            this.player.mouseDownX = event.clientX;
            this.player.mouseDownY = event.clientY;

            event.preventDefault();
            _V_.blockTextSelection();

            _V_.on(document, "mousemove", _V_.proxy(this, this.onMouseMove));
            _V_.on(document, "mouseup", _V_.proxy(this, this.onMouseUp));

        } else {
            event.stopPropagation();
        }
    },

    onMouseUp: function(event) {
        //this.player.tagMoving = false;
        this.player.mouseDownX = 0;
        this.player.mouseDownY = 0;

        if (this.draggable) {
            _V_.unblockTextSelection();
            _V_.off(document, "mousemove", this.onMouseMove, false);
            _V_.off(document, "mouseup", this.onMouseUp, false);

            this.update();
        } else {
            event.stopPropagation();
        }
    },

    onMouseMove: function(event){
        if (Math.abs(event.clientX - this.player.mouseDownX) > 3 || Math.abs(event.clientY - this.player.mouseDownY) > 3) {

            var newTime = this.calculateDistance(event) * this.player.duration();

            var bufferedTime = this.player.buffered().end(0);
            if (bufferedTime < newTime) {
                newTime = bufferedTime;
            }

            this.time = newTime;

            this.updateTag();
        }
    },

    onMouseOver: function(event){
        if (!this.player.mouseDownX && !this.player.mouseDownY) {
            var tooltip = this.el.firstChild;
            tooltip.style.visibility = 'visible';
        }
    },

    onMouseOut: function(event){
        var tooltip = this.el.firstChild;
        tooltip.style.visibility = 'hidden';
    },

    onDblClick: function(event){
        if (this.draggable) {
            this.player.triggerEvent(new _V_.Event('tagdblclick', {
                tag: this
            }));
        } else {
            event.stopPropagation();
        }
    },

    calculateDistance: function(event){
        var box = this.el.parentNode,
        boxX = _V_.findPosX(box),
        boxW = box.offsetWidth,
        handle = this.player.controlBar.progressControl.seekBar.handle;

        if (handle) {
            var handleW = handle.el.offsetWidth;

            // Adjusted X and Width, so handle doesn't go outside the bar
            boxX = boxX + (handleW / 2);
            boxW = boxW - handleW;
        }

        // Percent that the click is through the adjusted area
        return Math.max(0, Math.min(1, (event.pageX - boxX) / boxW));
    },

    update: function() {
        this.player.triggerEvent(new _V_.Event('tagchanging', {
            tag: this
        }));

        this.updateTag();

        if (this.draggable) {
            this.player.currentTime(this.time);
            this.player.pause();
            this.updatePreview(
                this.proxy(function(preview) {
                    var tooltip = this.el.firstChild;
                    this.preview = preview;
                    tooltip.firstChild.src = preview;

                    this.player.triggerEvent(new _V_.Event('tagchanged', {
                        tag: this
                    }));
                })
            );
        } else {
            this.player.triggerEvent(new _V_.Event('tagchanged', {
                tag: this
            }));
        }
    },

    updateTag: function() {
        var handle = this;

        if (this.time > this.player.duration()) {
            this.time = this.player.duration();
        }

        var progress = this.time / this.player.duration();

        // Protect against no duration and other division issues
        if (isNaN(progress)) {
            progress = 0;
        }

        var box = this.el.parentNode,
        boxWidth = box.offsetWidth,
        handleWidth = this.player.controlBar.progressControl.seekBar.handle.el.offsetWidth,

        // The width of the handle in percent of the containing box
        // In IE, widths may not be ready yet causing NaN
        handlePercent = (handleWidth) ? handleWidth / boxWidth : 0,

        tagHandleDiffPercent = (handle.el.offsetWidth - handleWidth) / boxWidth,

        // Get the adjusted size of the box, considering that the handle's center never touches the left or right side.
        // There is a margin of half the handle's width on both sides.
        //boxAdjustedPercent = 1;
        boxAdjustedPercent = 1 - (handlePercent);

        // Adjust the progress that we'll use to set widths to the new adjusted box width
        adjustedProgress = progress * boxAdjustedPercent,

        // Move the handle from the left based on the adjected progress
        //handle.el.style.left = ((progress - handlePercent / 2)  * 100)  + "%";
        handle.el.style.left = _V_.round((adjustedProgress - tagHandleDiffPercent / 2) * 100, 2) + "%";

    //console.log(((progress - handlePercent / 2)  * 100)  + "%");
    },

    updatePreview: function(callback) {
        var seekedCallback = this.proxy(function() {
            if (this.isTimeFound()) {
                this.player.capture([this.previewWidth, this.previewHeight], callback);
                //this.player.off("seeked", arguments.callee);
                clearInterval(this.recheckTimeout);
                this.player.trigger("timeupdate");
            }
        });

        //this.player.on("seeked", seekedCallback);
        this.recheckTimeout = setInterval(seekedCallback, 250)

        if (!this.player.techGet('seeking') && this.isTimeFound()) {
            this.player.capture([this.previewWidth, this.previewHeight], callback);
            //this.player.off("seeked", seekedCallback);
            clearInterval(this.recheckTimeout);
        }
    },

    calculatePreview: function(previewWidth, previewHeight){
        var newWidth, newHeight;

        var videoWidth = this.player.getVideoWidth();
        var videoHeight = this.player.getVideoHeight();

        if (videoWidth <= previewWidth && videoHeight <= previewHeight) {
            newWidth = videoWidth;
            newHeight = videoHeight;
        } else if (videoWidth / previewWidth > videoHeight / previewHeight) {
            newWidth = previewWidth;
            newHeight = Math.round(videoHeight * previewWidth / videoWidth);
        } else {
            newWidth = Math.round(videoWidth * previewHeight / videoHeight);
            newHeight = previewHeight;
        }

        return [newWidth, newHeight];
    },

    isTimeFound: function(){
        return (0.01 > Math.abs(this.player.currentTime() - this.time));
    }
});

_V_.html5.prototype.extend({
    capture: function(arguments) {
        var size = arguments[0];
        var callback = arguments[1];

        var video = this.el;

        var width = size[0], height = size[1];

        var canvas = document.createElement('canvas');
        canvas.width  = width;
        canvas.height = height;
        var ctx = canvas.getContext('2d');
        /*
        ctx.drawImage(video, 0, 0, width, height);

        var preview = canvas.toDataURL('image/jpeg');

        callback.call(this, preview);
        */
        setTimeout(
            this.proxy(function() {
                ctx.drawImage(video, 0, 0, width, height);
                var preview = canvas.toDataURL('image/jpeg');
                callback.call(this, preview);
            }),
            500
        );
    },

    getVideoWidth: function() {
        return this.el.videoWidth;
    },

    getVideoHeight: function() {
        return this.el.videoHeight;
    }
});

_V_.flash.prototype.extend({
    capture: function(arguments) {
        var size = arguments[0];
        var callback = arguments[1];

        setTimeout(
            this.proxy(function() {
                var preview = 'data:image/jpeg;base64,' + this.el.vjs_capture(size[0], size[1]);
                callback.call(this, preview);
            }),
            1000
        );

    },

    getVideoWidth: function() {
        return this.el.vjs_getProperty('videoWidth');
    },

    getVideoHeight: function() {
        return this.el.vjs_getProperty('videoHeight');
    }
});

_V_.Player.prototype.extend({
    addTag: function(tagId, time, draggable, preview) {
        var options = {};
        options.tagId = tagId;
        options.time = time;
        options.draggable = draggable;
        options.preview = preview;

        if (tagId) {
            if(_V_.tags[tagId]) {
                return _V_.tags[tagId];
            } else {
                _V_.tags[tagId] = this.controlBar.progressControl.seekBar.addComponent(
                    new _V_.Tag(this, options)
                    );
                _V_.tags[tagId].update();
                if (_V_.tags[tagId].draggable) this.controlBar.fadeIn();
                return _V_.tags[tagId];
            }
        } else {
            throw new Error("Tag ID is required.");
        }
    },

    editTag: function(tagId, time) {
        if (_V_.tags[tagId]) {
            _V_.tags[tagId].time = time;
            _V_.tags[tagId].update();
            if (_V_.tags[tagId].draggable) this.controlBar.fadeIn();
        } else {
            throw new Error("Tag ID not found.");
        }
    },

    removeTag: function(tagId) {
        if (_V_.tags[tagId]) {
            _V_.tags[tagId].remove();
            this.controlBar.progressControl.seekBar.removeComponent(_V_.tags[tagId]);
            delete _V_.tags[tagId];
        } else {
            throw new Error("Tag ID not found.");
        }
    },

    capture: function(size, callback) {
        this.techCall('capture', [size, callback]);
    },

    getVideoWidth: function() {
        var techWidth = this.techGet('getVideoWidth');
        if (techWidth) {
            this.setVideoWidth(techWidth);
            return techWidth;
        } else {
            return this.videoWidth;
        }
    },

    getVideoHeight: function() {
        var techHeight = this.techGet('getVideoHeight');
        if (techHeight) {
            this.setVideoHeight(techHeight);
            return techHeight;
        } else {
            return this.videoHeight;
        }
    },

    setVideoWidth: function(width) {
        this.videoWidth = width;
    },

    setVideoHeight: function(height) {
        this.videoHeight = height;
    },

    // When fullscreen isn't supported we can stretch the video container to as wide as the browser will let us.
    enterFullWindow: function(){
        this.isFullWindow = true;

        // Storing original doc overflow value to return to when fullscreen is off
        this.docOrigOverflow = document.documentElement.style.overflow;

        // Add listener for esc key to exit fullscreen
        _V_.on(document, "keydown", _V_.proxy(this, this.fullWindowOnEscKey));

        // Hide any scroll bars
        document.documentElement.style.overflow = 'hidden';

        // Apply fullscreen styles
        _V_.addClass(document.body, "vjs-full-window");
        _V_.addClass(this.el, "vjs-fullscreen");

        this.origVideoParent = this.el.parentNode;
        document.body.appendChild(this.el);

        this.trigger("enterFullWindow");
    },

    exitFullWindow: function(){
        this.isFullWindow = false;
        _V_.removeEvent(document, "keydown", this.fullWindowOnEscKey);

        // Unhide scroll bars.
        document.documentElement.style.overflow = this.docOrigOverflow;

        // Remove fullscreen styles
        _V_.removeClass(document.body, "vjs-full-window");
        _V_.removeClass(this.el, "vjs-fullscreen");

        this.origVideoParent.appendChild(this.el);
        // Resize the box, controller, and poster to original sizes
        // this.positionAll();
        this.trigger("exitFullWindow");
    }
});

_V_.TaggableSeekBar = _V_.SeekBar.extend({
    init: function(player, options) {
        this._super(player, options);

        this.player.mouseDownX = 0;
        this.player.mouseDownY = 0;
    },

    /*onMouseDown: function(event){
        event.preventDefault();
        _V_.blockTextSelection();

        _V_.on(document, "mousemove", _V_.proxy(this, this.onMouseMove));
        _V_.on(document, "mouseup", _V_.proxy(this, this.onMouseUp));

        if (!this.player.tagMoving) {
            this.onMouseMove(event);
        }
    },*/

    onMouseMove: function(event){
        if (Math.abs(event.clientX - this.player.mouseDownX) > 3 || Math.abs(event.clientY - this.player.mouseDownY) > 3) {

            var newTime = this.calculateDistance(event) * this.player.duration();

            // Don't let video end while scrubbing.
            if (newTime == this.player.duration()) { newTime = newTime - 0.1; }

            // Set new time (tell player to seek to new time)
            this.player.currentTime(newTime);
        }
    }
});

_V_.PosterImageExt = _V_.PosterImage.extend({
  createElement: function(){
    var image = _V_.createElement("img", {
      className: "vjs-poster-ext",
      /*src: this.player.options.poster,*/

      // Don't want poster to be tabbable.
      tabIndex: -1
    });

    var playerWidth = this.player.el.width;
    var playerHeight = this.player.el.height;

    //image.style.display = "none";
    image.onload = function(){
        if (playerWidth <= this.width && playerHeight <= this.height) {
            this.className = this.className + " maxheight-maxwidth";
        } else if (playerWidth / this.width > playerHeight / this.height) {
            this.className = this.className + " maxwidth-height";
        } else {
            this.className = this.className + " maxheight-width";
        }
        //this.style.display = "block";
    };

    image.src = this.player.options.poster; //You need to assign onload before setting the source
    return image;
  }
});

_V_.PlusButton = _V_.Button.extend({

  buttonText: "Add",

  init: function(player, options){
    this._super(player, options);
  },

  buildCSSClass: function(){
    return "vjs-plus-button-control " + this._super();
  },

  onClick: function(){
    this.player.trigger("plusbuttonclick");
  }
});

_V_.options.tag = {};
_V_.options.tag.preview = {
    'width' : 200,
    'height' : 150
};

VideoJS.tags = {};
