var ui = require("ui-lib/library");

var query = "Marker", tracking;

const toast = (str, n) => Vars.ui.showInfoToast(str, n);

this.global.tracker = {
	/* Set what the marker is tracking.
		Unit/Position pos:
			What the marker will track, or undefined to reset it.
			For positions, use {x: x, y: y}.
			Units (Players too) can be used as-is. */
	setMarker(pos) {
		tracking = pos;
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

// Bullets are an awful hack but it'll do until 6.0 comes around
const marker = new JavaAdapter(BulletType, {
	update(b) {
		b.time(0);
		// Trick renderer into always drawing it
		b.x = Vars.player.x;
		b.y = Vars.player.y;
	},
	draw(b) {
		if (!tracking) {
			return;
		}

		const angle = Angles.angle(Vars.player.x, Vars.player.y, tracking.x, tracking.y);
		const dist = Math.min(thresh, Mathf.dst(tracking.x, tracking.y, Vars.player.x, Vars.player.y));

		const x = Vars.player.x + Angles.trnsx(angle, dist);
		const y = Vars.player.y + Angles.trnsy(angle, dist);
		const now = Time.time();

		// Used when target is near the player
		const rot = Math.sin(now / 20) * 360;

		// Sin-wave red to yellow
		Draw.color(Color.red, Pal.stat, Math.sin(now / 10));
		Draw.alpha(0.8);
		Draw.rect(region, x, y, dist < thresh ? rot : angle - 90);
		// Don't break everything
		Draw.color();
	},

	init(b) {},
	collides: (b, t) => false,
	hit(b, x, y) {
		Log.error("Marker hit something, should never ever happen.");
	},
	despawned() {}
}, 1, 0);
marker.lifetime = 600;
marker.hitTiles = false;
marker.collides = false;
marker.keepVelocity = false;

/* UI */

ui.addTable("top", "tracker", table => {
	table.addImageButton(Icon.zoom, Styles.clearTransi, run(() => {
		parse();
	}));
	table.addField("Tracker", cons(input => {
		query = input;
	})).width(150);
});

// Only hook world load event and load sprite once
ui.once(() => {
	Events.on(EventType.WorldLoadEvent, run(() => {
		Bullet.create(marker, Vars.player, 0, 0, 0);
	}));
	region = Core.atlas.find("shell-back");
});
