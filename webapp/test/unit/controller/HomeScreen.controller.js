/*global QUnit*/

sap.ui.define([
	"gvtracker/controller/HomeScreen.controller"
], function (Controller) {
	"use strict";

	QUnit.module("HomeScreen Controller");

	QUnit.test("I should test the HomeScreen controller", function (assert) {
		var oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});
