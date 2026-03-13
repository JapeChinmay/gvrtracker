/* global QUnit */
QUnit.config.autostart = false;

sap.ui.require(["gvtracker/test/integration/AllJourneys"
], function () {
	QUnit.start();
});
