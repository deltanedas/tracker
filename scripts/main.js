var ui = require("ui-lib/library");

var query = "Marker", tracking, marker;

const toast = (str, n) => Vars.ui.showInfoToast(str, n);

this.global.tracker = {
	/* Set what the marker is tracking.
		Unit/Position pos:
			What the marker will track, or undefined to reset it.
			For positions, use {x: x, y: y}.
			Units (Players too) can be used as-is. */
	setMarker(pos) {
		// TODO: stop using buggy effects
		tracking = undefined;
		Core.app.post(run(() => {
			tracking = pos;
			Effects.effect(marker, Vars.player.x, Vars.player.y);
		}));
	},
	getMarker: () => tracking
}

/* Parsing the query */

const track = this.global.tracker.setMarker;

function parsePos(x, y) {
	x = Mathf.clamp(parseInt(x), 0, Vars.world.width());
	y = Mathf.clamp(parseInt(y), 0, Vars.world.height());
	toast("[green]Tracking " + x + ", " + y, 3);
	track({x: x * Vars.tilesize, y: y * Vars.tilesize});
}

function parsePlayer() {
	const name = query.toLowerCase();
	const player = Vars.playerGroup.find(boolf(
		player => Strings.stripColors(player.name.toLowerCase()).includes(name)));
	if (!player) {
		toast("[red]Query isn't a position or player", 5);
		return;
	}
	toast("[green]Tracking " + player.name, 3);
	track(player);
}

function parse() {
	if (query == "") {
		tracking = undefined;
		toast("Removed tracker", 4);
		return;
	}

	// 'x, y' and 'x y' are valid but not 'x'
	const matched = query.match(/(\d+)[, ]\s*(\d+)/)
	if (matched) {
		parsePos(matched[1], matched[2]);
	} else {
		parsePlayer();
	}
}

/* Drawing */

var region;
// How far away the marker can be drawn from the player
const thresh = Vars.tilesize * 5;

marker = newEffect(60 * 15, e => {
	// Don't die unless tracker is disabled
	if (!tracking) {
		e.time = 0;
		return;
	}
	e.time = 60 * 15;

	const angle = Angles.angle(Vars.player.x, Vars.player.y, tracking.x, tracking.y);
	const dist = Math.min(thresh, Mathf.dst(tracking.x, tracking.y, Vars.player.x, Vars.player.y));

	e.x = Vars.player.x + Angles.trnsx(angle, dist);
	e.y = Vars.player.y + Angles.trnsy(angle, dist);
	const now = Time.time();

	// Used when target is near the player
	const rot = Math.sin(now / 20) * 360;

	// Sin-wave red to yellow
	Draw.color(Color.red, Pal.stat, Math.sin(now / 10));
	Draw.alpha(0.8);
	Draw.rect(region, e.x, e.y, dist < thresh ? rot : angle - 90);
	// Don't break everything
	Draw.color();
});

/* UI */

ui.addTable("top", "tracker", table => {
	table.addImageButton(Icon.zoom, Styles.clearTransi, run(() => {
		parse();
	}));
	table.addField("Tracker", cons(input => {
		query = input;
	})).width(150);
});

/* Sprite */
ui.onLoad(() => {
	region = Core.atlas.find("shell-back");
});
