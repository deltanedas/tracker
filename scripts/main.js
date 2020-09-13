/*
	Copyright (c) DeltaNedas 2020

	This program is free software: you can redistribute it and/or modify
	it under the terms of the GNU General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU General Public License for more details.

	You should have received a copy of the GNU General Public License
	along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

const ui = require("ui-lib/library");

var query = "Marker", tracking, entity;

const toast = (str, n) => Vars.ui.showInfoToast(str, n);

this.global.tracker = {
	/* Set what the marker is tracking.
		Unit/Position pos:
			What the marker will track, or undefined to reset it.
			For positions, use {x: x, y: y}.
			Units can be used as-is. */
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
	const player = Groups.player.find(player => {
		return Strings.stripColors(player.name.toLowerCase()).includes(name);
	});
	if (!player) {
		toast("[red]Query isn't a position or player", 5);
		return;
	}
	toast("[green]Tracking " + player.name, 3);
	track(player);
}

const parse = () => {
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

// Used for transforming positions
var trackerVec = new Vec2();
ui.addEffect((w, h) => {
	if (!tracking) return;
	const zoom = w / Core.camera.width / 4;
	const prev = Draw.scl;
	Draw.scl = zoom;

	// How far away the marker can be drawn from the player
	// Distance scales with camera zoom
	const thresh = Vars.tilesize * 5 * zoom;

	// Screen center
	const cx = w / 2, cy = h / 2;
	trackerVec.set(tracking.x, tracking.y);

	// Pos of tracker on screen
	const pos = Core.camera.project(trackerVec);

	const angle = Angles.angle(cx, cy, pos.x, pos.y);
	const dist = Mathf.dst(pos.x, pos.y, cx, cy);

	const x = cx + Angles.trnsx(angle, thresh);
	const y = cy + Angles.trnsy(angle, thresh);
	const now = Time.time();

	const rot = Math.sin(now / 20) * 360;

	// Sin-wave red to yellow for the target
	Draw.color(Color.red, Pal.stat, Math.sin(now / 10));
	Draw.alpha(0.8);

	// Draw marker around player and on the target
	Draw.rect(region, pos.x, pos.y, rot);
	if (dist > thresh) {
		// Brighter when closer
		Draw.color(Color.red, Pal.stat, thresh * 2.5 / dist);
		Draw.alpha(0.8)
		Draw.rect(region, x, y, angle - 90);
	}

	// Don't break everything
	Draw.color();
	Draw.scl = prev;
});

/* UI */

ui.addTable("top", "tracker", table => {
	table.button(Icon.zoom, Styles.clearTransi, () => {
		parse();
	});
	table.field("Tracker", input => {
		query = input;
	}).width(150);
});

Events.on(WorldLoadEvent, () => {
	// Refresh the target's Player object
	if (tracking instanceof Player) {
		Core.app.post(() => {
			tracking = Groups.player.getByID(tracking.id);
		});
	}
});

ui.onLoad(() => {
	region = Core.atlas.find("shell-back");
});
