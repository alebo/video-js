_V_.Tag = _V_.Component.extend({
    createElement: function() {
        var className;

        if (this.options.draggable) {
            className = "vjs-tag-handle draggable";
        } else {
            className = "vjs-tag-handle undraggable";
        }
        return this._super("div", {
            className: className,
            innerHTML: "<span class='tooltip'></span>"
        });
    },

    init: function(player, options) {
        this._super(player, options);

        this.tagId = (options.tagId) ? options.tagId : 1;
        this.time = (options.time) ? options.time : 0;
        this.draggable = (options.draggable) ? options.draggable : false;

        this.player.one("controlsvisible", this.proxy(this.updateTags));
        this.on("mousedown", this.onMouseDown);
        this.on("click", this.onClick);
        this.on("mouseover", this.onMouseOver);
    },

    onMouseDown: function(event){
        if (this.draggable) {
            event.preventDefault();
            _V_.blockTextSelection();

            _V_.on(document, "mousemove", _V_.proxy(this, this.onMouseMove));
            _V_.on(document, "mouseup", _V_.proxy(this, this.onMouseUp));

            this.onMouseMove(event);
        } else {
            event.stopPropagation();
        }
    },

    onMouseUp: function(event) {
        if (this.draggable) {
            _V_.unblockTextSelection();
            _V_.off(document, "mousemove", this.onMouseMove, false);
            _V_.off(document, "mouseup", this.onMouseUp, false);

            this.updateTags();
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
        this.updateTags();
    },

    onClick: function(event){
    //this.player.currentTime(this.time);
    },

    onMouseOver: function(event){
        this.capture();
    },

    calculateDistance: function(event){
        var box = this.el.parentNode,
        boxX = _V_.findPosX(box),
        boxW = box.offsetWidth,
        handle = this.handle;

        if (handle) {
            var handleW = handle.el.offsetWidth;

            // Adjusted X and Width, so handle doesn't go outside the bar
            boxX = boxX + (handleW / 2);
            boxW = boxW - handleW;
        }

        // Percent that the click is through the adjusted area
        return Math.max(0, Math.min(1, (event.pageX - boxX) / boxW));
    },

    updateTags: function() {
        var handle = this;
        var progress = this.time / this.player.duration();

        // Protect against no duration and other division issues
        if (isNaN(progress)) {
            progress = 0;
        }

        var box = this.el.parentNode,
        boxWidth = box.offsetWidth,
        handleWidth = handle.el.offsetWidth,

        // The width of the handle in percent of the containing box
        // In IE, widths may not be ready yet causing NaN
        handlePercent = (handleWidth) ? handleWidth / boxWidth : 0,

        // Get the adjusted size of the box, considering that the handle's center never touches the left or right side.
        // There is a margin of half the handle's width on both sides.
        boxAdjustedPercent = 1;//1 - handlePercent;

        // Adjust the progress that we'll use to set widths to the new adjusted box width
        adjustedProgress = progress * boxAdjustedPercent,

        // Move the handle from the left based on the adjected progress
        handle.el.style.left = ((progress - handlePercent / 2)  * 100)  + "%";//_V_.round(adjustedProgress * 100, 2) + "%";
        console.log(((progress - handlePercent / 2)  * 100)  + "%");

    //            this.player.triggerEvent(new _V_.Event('tagchange', {
    //                tag: this
    //            }));
        
    },

    capture: function() {
        var tooltip = this.el.firstChild;
        var video = this.player.tech.el;
        var scaleFactor = 0.3;

        if (!tooltip.innerHTML) {
            var w = video.videoWidth * scaleFactor;
            var h = video.videoHeight * scaleFactor;
            var canvas = document.createElement('canvas');
            canvas.width  = w;
            canvas.height = h;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, w, h);

            tooltip.innerHTML = '';
            tooltip.appendChild(canvas);
        }
    }
});

_V_.Player.prototype.extend({
    addTag: function(tagId, time, draggable) {
        var options = {};
        options.tagId = tagId;
        options.time = time;
        options.draggable = draggable;

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

    removeTag: function(tagId) {
        if (_V_.tags[tagId]) {
            this.controlBar.progressControl.seekBar.removeComponent(_V_.tags[tagId]);
            delete _V_.tags[tagId];
        } else {
            throw new Error("Tag ID not found.");
        }
    }
});

VideoJS.tags = {};