_V_.Tag = _V_.Component.extend({
	createElement: function() {
		return this._super("div", {
			className: "vjs-seek-handle2",
			innerHTML: '<span class="vjs-control-text">00:00</span>'
		});
	},
	init: function(player, options) {
		this._super(player, options);

		this.on("mousedown", function (event) {
			this.player.tagMoving = this;
			//event.stopPropagation();
			//return false;
		});

		this.on("click", function (event) {
			//console.log(this.time);


			 var video = this.player.tech.el;
			 var canvas = document.getElementById("myCanvas");
			 var ctx = canvas.getContext("2d");
			 var t = video.currentTime;
			 video.currentTime = this.time;
			 ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
			 //video.currentTime = t;

		});
	},
});

_V_.TaggableSeekBar = _V_.SeekBar.extend({
	init: function(player, options) {
		this._super(player, options);

		this.player.on("controlsvisible", this.proxy(this.updateTags));
	},

  onMouseMove: function(event){

	var h = this.handle;
	this.handle = false;

	var newTime = this.calculateDistance(event) * this.player.duration();

	this.handle = h;

	if (this.player.tagMoving) {
		this.updateTags(newTime / this.player.duration());
		this.player.tagMoving.time = newTime;
	} else {
		this._super(event);
	}
  },

  onMouseUp: function(event){
	this._super(event);
	this.player.tagMoving = false;
  },

	updateTags: function(progress) {
		var handle = this.tag;

		progress = progress || 0;

	  //progress = 0.33;

	  console.log('pr:' + progress);



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
	  // Move the handle from the left based on the adjected progress
	  //handle.el.style.left = (_V_.round((adjustedProgress - 0 / 2) * 100, 2))  + "%";
	  //handle.el.style.left = _V_.round(adjustedProgress * 100, 2) + '%';
	  console.log(((progress - handlePercent / 2)  * 100)  + "%");
	  //handle.el.style.left = _V_.round(barProgress * 100, 2) + "%";
	}
});