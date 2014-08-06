window.initScripts = (window.initScripts||{});
initScripts['party-page'] = function(element) {

	var object = {
		type: "party-page",
		element: element,
		slug: $(element).attr('data-slug'),
		destroy: destroy,
		isDj: false,
		pollTimeout: null,
		playingTrack: null,
		startPlayback: startPlayback,
		players: null,
		playbackContext: null,
		visualiserInterval: null,
		upperColour: '',
		lowerColour: '',
		onLowerColour: true
	};

	// Connect to the party.
	var req = getRequestObject();
	req.partySlug = object.slug
	socket.emit(EVENT_JOIN_PARTY, req);

	// Listen for events.
	socket.on(EVENT_DJ_ASSIGN, function(){
		console.log('Assigned as DJ', req);
		setDj();
    });

	socket.on(EVENT_LISTENER_SYNC, function(req){
		if (!isValidTrack(req.track)){
			return;
		}

		if (isListenerOfParty(req.partySlug)){
			console.log('Listener sync', req);

			// If no track is playing, start it playing.
			if (object.playingTrack == null){
				object.playingTrack = req.track;

				var players = getPlayers();
				for (var i = 0; i < players.length; i++) {
					players[i].play(object.playingTrack);
				}
			}
		}
    });

	socket.on(EVENT_LISTENER_SWITCH, function(req){
		console.log('Listener switch', req);
		if (!isValidTrack(req.track)){
			return;
		}

		if (isListenerOfParty(req.partySlug)){
			console.log('Listener switch', req);

			object.playingTrack = req.track;

			if (object.playingTrack != null){
				// Get the player and start playback!
				var players = getPlayers();
				for (var i = 0; i < players.length; i++) {
					players[i].play(object.playingTrack);
				}

				initVisualiser();
			}
		}
    });

	function setDj(){
		object.isDj = true;
		object.pollInterval = setInterval(pollServer, POLL_INTERVAL);
		$(object.element).addClass('is-dj');
	}

	function pollServer(){
		var req = getRequestObject();
		req.track = object.playingTrack;
		
		if (object.playbackContext) {
			req.playbackPosition = object.playbackContext.currentTime;
		}

		console.log('Poll Server', req);

		socket.emit(EVENT_DJ_POLL, req);
	}

	function startPlayback(playbackContext, track){
		// Send the track URL to the server.
		var req = getRequestObject();
		req.track = track;
		object.playbackContext = playbackContext;
		object.playingTrack = track;
		socket.emit(EVENT_DJ_SWITCH, req);

		initVisualiser();
	}

	function isListenerOfParty(partySlug){
		return partySlug == object.slug && !object.isDj;
	}

	function getPlayers(){
		if (object.players == null){
			object.players = objectManager.getObjectsOfType('player');
		}
		return object.players;
	}

	function initVisualiser(){
		// Set up the visualiser.
		clearInterval(object.visualiserInterval);

		var track = object.playingTrack;

		// Colour fluctuation based on energy
		var adjustment = COLOUR_FLUCTUATION;
		if (track.energy > 0){
			adjustment = track.energy * 0.2;
		}

		object.upperColour = colourLuminance(object.playingTrack.colour, adjustment);
		object.lowerColour = colourLuminance(object.playingTrack.colour, (adjustment * -1));

		// The timer is based on bpm.
		var timer = VISUALISER_INTERVAL;
		var timer2 = '500ms';
		if (track.tempo > 0){
			timer = convertBpmMs(track.tempo);
			timer2 = convertBpmMs(track.temp, 1.333333333333333333333);
		}

		visualiser();
		$(object.element).css('transition-duration', timer2 + 'ms');
		// $(object.element).css({
		// 	WebkitTransitionDuration : timer + 'ms',
		// 	MozTransitionDuration    : timer + 'ms',
		// 	MsTransitionDuration     : timer + 'ms',
		// 	OTransitionDuration      : timer + 'ms',
		// 	transitionDuration       : timer + 'ms'
		// })
		object.visualiserInterval = setInterval(visualiser, timer);
	}

	function visualiser(){
		if (object.onLowerColour){
			$(object.element).css('background-color', object.upperColour);
		}
		else{
			$(object.element).css('background-color', object.lowerColour);
		}
		object.onLowerColour = !object.onLowerColour;
	}

	function convertBpmMs(bpm, subdivision) {
		if (typeof subdivision == 'undefined'){
			subdivision = 0.25;
		}
		return Math.round(1/(bpm/60*subdivision*0.001));
	}

	function destroy(){
	}

	return object;

}
