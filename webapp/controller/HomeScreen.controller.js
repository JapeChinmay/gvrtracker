sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast"
], function (Controller, Fragment, Filter, FilterOperator, MessageToast) {
    "use strict";

    return Controller.extend("gvtracker.controller.HomeScreen", {

        /* ============================================================ */
        /*  LIFECYCLE                                                     */
        /* ============================================================ */

        onInit: function () {
            // GVR input disabled by default (CREATE mode selected)
            this.byId("GVRInput").setEnabled(false);
        },

        /* ============================================================ */
        /*  MODE RADIO BUTTON                                            */
        /* ============================================================ */

        onModeSelect: function (oEvent) {
            var iIndex    = oEvent.getSource().getSelectedIndex();
            var oGVRInput = this.byId("GVRInput");

            if (iIndex === 0) {
                // CREATE — GVR not needed
                oGVRInput.setEnabled(false);
                oGVRInput.setValue("");
                oGVRInput.setPlaceholder("Not required for CREATE");
            } else if (iIndex === 1) {
                // RETURN — GVR not needed (customer selected on screen)
                oGVRInput.setEnabled(false);
                oGVRInput.setValue("");
                oGVRInput.setPlaceholder("Not required for RETURN");
            } else if (iIndex === 2) {
                // REPLACEMENT — GVR not needed
                oGVRInput.setEnabled(false);
                oGVRInput.setValue("");
                oGVRInput.setPlaceholder("Not required for REPLACEMENT");
            } else if (iIndex === 3) {
                // DISPLAY — GVR required
                oGVRInput.setEnabled(true);
                oGVRInput.setValue("");
                oGVRInput.setPlaceholder("Enter GVR Number");
            }
        },

        /* ============================================================ */
        /*  EXECUTE BUTTON                                               */
        /* ============================================================ */

        OnExecute: function () {
            var iMode = this.byId("modeSelect").getSelectedIndex();
            var sGVR  = this.byId("GVRInput").getValue().trim();
            var oRouter = this.getOwnerComponent().getRouter();

            if (iMode === 0) {
                // CREATE
                oRouter.navTo("RouteCreateScreen");

            } else if (iMode === 1) {
                // RETURN
                oRouter.navTo("RouteReturnScreen");

            } else if (iMode === 2) {
                // REPLACEMENT
                oRouter.navTo("RouteReplacementScreen");

            } else if (iMode === 3) {
                // DISPLAY — GVR number required
                if (!sGVR) {
                    MessageToast.show("Please enter a GVR Number for Display.");
                    return;
                }
                oRouter.navTo("RouteDisplayScreen", { gvr: sGVR });
            }
        },

        /* ============================================================ */
        /*  GVR VALUE HELP                                               */
        /* ============================================================ */

        onGVRValueHelp: function () {
            var oView = this.getView();

            if (!this._gvrValueHelpDialog) {
                Fragment.load({
                    id:         oView.getId(),
                    name:       "gvtracker.fragments.GVRNumber",
                    controller: this
                }).then(function (oDialog) {
                    this._gvrValueHelpDialog = oDialog;
                    oView.addDependent(oDialog);
                    this._loadGVRData();
                    oDialog.open();
                }.bind(this));
            } else {
                this._loadGVRData();
                this._gvrValueHelpDialog.open();
            }
        },

        _loadGVRData: function () {
            var oModel = this.getView().getModel();
            var sViewId = this.getView().getId();

            oModel.read("/GVHeaderSet", {
                urlParameters: { "$expand": "customer" },
                success: function (oData) {
                    console.log("GVHeaderSet loaded:", oData.results.length);
                    // Update title in fragment with count
                    var oTitle = Fragment.byId(sViewId, "gvrTableTitle");
                    if (oTitle) {
                        oTitle.setText("Items (" + oData.results.length + ")");
                    }
                }.bind(this),
                error: function (oErr) {
                    console.error("GVHeaderSet read error:", oErr);
                }
            });
        },

        /* ============================================================ */
        /*  GVR FRAGMENT SEARCH                                          */
        /* ============================================================ */

        onGVRSearch: function () {
            var sViewId  = this.getView().getId();
            // BUG FIX: field is "gv_no" not "gvr_no"
            var sGVRNo   = Fragment.byId(sViewId, "filterGVRNo").getValue();
            var sPhone   = Fragment.byId(sViewId, "filterPhone").getValue();
            var sGVRType = Fragment.byId(sViewId, "filterGVRType").getValue();
            var sSearch  = Fragment.byId(sViewId, "gvrSearchField").getValue();

            var aFilters = [];

            if (sGVRNo) {
                aFilters.push(new Filter("gv_no", FilterOperator.Contains, sGVRNo));
            }
            if (sPhone) {
                aFilters.push(new Filter("customer/phone", FilterOperator.Contains, sPhone));
            }
            if (sGVRType) {
                aFilters.push(new Filter("gvr_type_code", FilterOperator.Contains, sGVRType));
            }
            if (sSearch) {
                aFilters.push(new Filter({
                    filters: [
                        new Filter("gv_no",          FilterOperator.Contains, sSearch),
                        new Filter("gvr_type_code",  FilterOperator.Contains, sSearch)
                    ],
                    and: false
                }));
            }

            var oTable   = Fragment.byId(sViewId, "gvrResultTable");
            var oBinding = oTable.getBinding("items");
            oBinding.filter(aFilters);
        },

        /* ============================================================ */
        /*  GVR FRAGMENT TOGGLE FILTERS                                  */
        /* ============================================================ */

        onToggleFilters: function () {
            var sViewId    = this.getView().getId();
            var oFilterBox = Fragment.byId(sViewId, "filterBox");
            var oBtn       = Fragment.byId(sViewId, "toggleFilterBtn");
            var bVisible   = oFilterBox.getVisible();

            oFilterBox.setVisible(!bVisible);
            oBtn.setText(bVisible ? "Show Filters" : "Hide Filters");
        },

        /* ============================================================ */
        /*  GVR FRAGMENT ITEM SELECT                                     */
        /* ============================================================ */

        onGVRSelect: function (oEvent) {
            var oItem    = oEvent.getParameter("listItem");
            var oContext = oItem.getBindingContext();
            var sGVRNo   = oContext.getProperty("gv_no");

            console.log("GVR Selected:", sGVRNo, "| Type:", oContext.getProperty("gvr_type_code"));

            this.byId("GVRInput").setValue(sGVRNo);
            this._gvrValueHelpDialog.close();
        },

        onGVRCancel: function () {
            if (this._gvrValueHelpDialog) {
                this._gvrValueHelpDialog.close();
            }
        }

    });
});