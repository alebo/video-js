_V_.Tag = _V_.Component.extend({
    createElement: function() {
        var className;

        if (this.options.draggable) {
            className = "vjs-seek-handle2 draggable";
        } else {
            className = "vjs-seek-handle2 undraggable";
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

        this.player.one("controlsvisible", this.proxy(function() {
            this.player.triggerEvent(new _V_.Event('tagchange', {
                tag: this
            }));
        }));

        if (this.draggable) {
            this.on("mousedown", function (event) {
                this.player.tagMoving = this;
                //event.stopPropagation();
                //return false;
            });
        } else {
            this.on("mousedown", function (event) {
                event.stopPropagation();
            });
            this.on("mouseup", function (event) {
                event.stopPropagation();
            });
        }
	
        this.on("click", function (event) {
           this.player.currentTime(this.time);
        });

        this.on("mouseover", function (event) {
            this.capture();
        });

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

            var t = video.currentTime;
            video.currentTime = this.time;
            ctx.drawImage(video, 0, 0, w, h);
            video.currentTime = t;

            tooltip.innerHTML = '';
            tooltip.appendChild(canvas);
        }
    }
});

_V_.TaggableSeekBar = _V_.SeekBar.extend({
    init: function(player, options) {
        this._super(player, options);

        //this.player.on("controlsvisible", this.proxy(this.updateTags));
        this.player.on("tagchange", this.proxy(function(e){
            this.player.tagMoving = e.tag;
            this.updateTags(e.tag.time);
            this.player.tagMoving = false;
        }));
    },

    onMouseMove: function(event){
        var h = this.handle;

        this.handle = false;
        var newTime = this.calculateDistance(event) * this.player.duration();
        var bufferedTime = this.player.buffered().end(0);
        if (bufferedTime < newTime) {
            newTime = bufferedTime;
        }
        this.handle = h;

        if (this.player.tagMoving) {
            this.updateTags(newTime);
            this.player.tagMoving.time = newTime;
        } else {
            this._super(event);
        }
    },

    onMouseUp: function(event){
        this.player.tagMoving = false;
        this._super(event);
    },

    updateTags: function(time) {
        var handle = this.player.tagMoving;

        time = time || 0;
        progress = time / this.player.duration();

        console.log('pr:' + progress);

        if (handle) {
            var box = this.el,
            boxWidth = box.offsetWidth,
            handleWidth = handle.el.offsetWidth,

            // The width of the handle in percent of the containing box
            // In IE, widths may not be ready yet causing NaN
            handlePercent = (handleWidth) ? handleWidth / boxWidth : 0,

            // Get the adjusted size of the box, considering that the handle's center never touches the left or right side.
            // There is a margin of half the handle's width on both sides.
            boxAdjustedPercent = 1;// + handlePercent / 2;
            //console.log('hp:' + handlePercent);
            // Adjust the progress that we'll use to set widths to the new adjusted box width
            adjustedProgress = progress * boxAdjustedPercent,

            // The bar does reach the left side, so we need to account for this in the bar's width
            barProgress = adjustedProgress + (handlePercent / 2);

            handle.el.style.left = ((progress - handlePercent / 2)  * 100)  + "%";
            console.log(((progress - handlePercent / 2)  * 100)  + "%");
        }
    // Move the handle from the left based on the adjected progress
    //handle.el.style.left = (_V_.round((adjustedProgress - 0 / 2) * 100, 2))  + "%";
    //handle.el.style.left = _V_.round(adjustedProgress * 100, 2) + '%';
    //handle.el.style.left = _V_.round(barProgress * 100, 2) + "%";
    }
});


_V_.Player.prototype.extend({
    addTag: function(tagId, time, draggable) {
        _V_.log('add tag:'+tagId+', time:'+time);

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
        _V_.log('remove tag:'+tagId);

        if (_V_.tags[tagId]) {
            this.controlBar.progressControl.seekBar.removeComponent(_V_.tags[tagId]);
            delete _V_.tags[tagId];
        } else {
            throw new Error("Tag ID not found.");
        }
    }
});

VideoJS.tags = {};