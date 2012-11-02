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
        if (this.preview) {
            this.previewValid = true;
        }
        var previewSize = this.calculatePreview(this.player.options.tag.preview.width, this.player.options.tag.preview.height);
        if (previewSize) {
            this.previewWidth = previewSize[0];
            this.previewHeight = previewSize[1];
        }

        this.player.one("controlsvisible", this.proxy(this.update));
        this.on("mousedown", this.onMouseDown);
        this.on("mouseover", this.onMouseOver);
        this.on("mouseout", this.onMouseOut);
    },

    onMouseDown: function(event){
        this.player.currentTime(this.time);

        if (this.draggable) {

            this.player.tagMoving = this;

            event.preventDefault();
            _V_.blockTextSelection();

            _V_.on(document, "mousemove", _V_.proxy(this, this.onMouseMove));
            _V_.on(document, "mouseup", _V_.proxy(this, this.onMouseUp));

        //this.onMouseMove(event);
        } else {
            event.stopPropagation();
        }
    },

    onMouseUp: function(event) {
        this.player.tagMoving = false;

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
        var newTime = this.calculateDistance(event) * this.player.duration();

        var bufferedTime = this.player.buffered().end(0);
        if (bufferedTime < newTime) {
            newTime = bufferedTime;
        }

        this.time = newTime;

        this.updateTag();
    },

    onMouseOver: function(event){
        if (!this.player.tagMoving) {
            var tooltip = this.el.firstChild;
            tooltip.style.visibility = 'visible';
        }
    },

    onMouseOut: function(event){
        var tooltip = this.el.firstChild;
        tooltip.style.visibility = 'hidden';
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
        this.updateTag();

        if (this.draggable) {
            this.player.currentTime(this.time);
            this.updatePreview();
        }

        this.player.triggerEvent(new _V_.Event('tagchange', {
            tag: this
        }));
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

    capture: function() {
        var tooltip = this.el.firstChild;

        var preview = this.player.capture([this.previewWidth, this.previewHeight]);

        this.preview = preview;
        this.previewValid = true;
        tooltip.firstChild.src = preview;

        this.triggerEvent(new _V_.Event('previewloaded', {}));
    },

    updatePreview: function() {
        this.previewValid = false;
        //        if (this.player.currentTime() == this.time) {
        //            this.capture();
        //        } else {
        this.player.on("seeked", this.proxy(function() {
                
            //if (this.player.currentTime() == this.time) {
            if (5 > Math.abs(this.player.currentTime() - this.time)) {
                this.capture();
                this.player.off(arguments.callee);
            }
        }));
    //        }
    },
    
    calculatePreview: function(previewWidth, previewHeight){
        var newWidth, newHeight;

        var videoWidth = this.player.options.width;
        var videoHeight = this.player.options.height;

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
    }
});

_V_.html5.prototype.extend({
    capture: function(size) {
        var video = this.el;

        var width = size[0], height = size[1];

        var canvas = document.createElement('canvas');
        canvas.width  = width;
        canvas.height = height;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, width, height);

        var preview = canvas.toDataURL('image/jpeg');

        return preview;
    }
});

_V_.flash.prototype.extend({
    capture: function(size) {
        var preview = 'data:image/jpeg;base64,' + this.el.vjs_capture();
        return preview;
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
                return _V_.tags[tagId] = this.controlBar.progressControl.seekBar.addComponent(
                    new _V_.Tag(this, options)
                    );
            }
        } else {
            throw new Error("Tag ID is required.");
        }
    },

    editTag: function(tagId, time) {
        if (_V_.tags[tagId]) {
            _V_.tags[tagId].time = time;
            _V_.tags[tagId].update();
        } else {
            throw new Error("Tag ID not found.");
        }
    },

    removeTag: function(tagId) {
        if (_V_.tags[tagId]) {
            this.controlBar.progressControl.seekBar.removeComponent(_V_.tags[tagId]);
            delete _V_.tags[tagId];
        } else {
            throw new Error("Tag ID not found.");
        }
    },

    capture: function(size) {
        return this.techCallGet('capture', size);
    },

    // Pass values to the playback tech
    techCallGet: function(method, arg){
        // If it's not ready yet, call method when it is
        if (!this.tech.isReady) {
            this.tech.ready(function(){
                return this[method](arg);
            });
        // Otherwise call method now
        } else {
            try {
                return this.tech[method](arg);
            } catch(e) {
                _V_.log(e);
            }
        }
        return;
    }
});

_V_.TaggableSeekBar = _V_.SeekBar.extend({
    init: function(player, options) {
        this._super(player, options);

    //this.player.on("controlsvisible", this.proxy(this.updateTags));
    /*
        this.player.on("tagchange", this.proxy(function(e){
            this.player.tagMoving = e.tag;
            this.updateTags(e.tag.time);
            this.player.tagMoving = false;
        }));
        */
    },

    onMouseDown: function(event){
        event.preventDefault();
        _V_.blockTextSelection();

        _V_.on(document, "mousemove", _V_.proxy(this, this.onMouseMove));
        _V_.on(document, "mouseup", _V_.proxy(this, this.onMouseUp));

        if (!this.player.tagMoving) {
            this.onMouseMove(event);
        }
    }
/*
    update: function() {
        this._super();

        if (this.player.tagMoving) {
            this.player.tagMoving.el.style.left = this.handle.el.style.left;
        }
    }
*/
});

_V_.options.tag = {};
_V_.options.tag.preview = {
    'width' : 200,
    'height' : 150
};

VideoJS.tags = {};