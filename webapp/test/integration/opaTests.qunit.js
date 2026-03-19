/* global QUnit */
QUnit.config.autostart = false;

sap.ui.require(["zalopez/onlyfortesting/test/integration/AllJourneys"
], function () {
	QUnit.start();
});
